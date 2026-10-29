import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {
  X,
  Plus,
  Receipt,
  Sparkles,
  Camera,
  Mic,
  Check,
  Edit2,
  Sliders,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { ExpenseRecord, MemberProfile } from '../types/ledger';
import { parseMultimodalExpense } from '../lib/gemini';
import { COLORS, MONO_FONT, getAvatarColor } from '../theme';
import type { DraftExpense } from './CommandBar';

interface AddExpenseModalProps {
  visible: boolean;
  onClose: () => void;
  members: MemberProfile[];
  initialExpense?: ExpenseRecord | null;
  onAddManualExpense: (expense: {
    title: string;
    paid_by_member_id: string;
    total_amount: number;
    tax_and_tip: number;
    splits: Record<string, number>;
  }) => Promise<void>;
  onUpdateExpense?: (
    id: string,
    expense: {
      title: string;
      paid_by_member_id: string;
      total_amount: number;
      tax_and_tip: number;
      splits: Record<string, number>;
    }
  ) => Promise<void>;
  onDraftCreated: (draft: DraftExpense) => void;
  onError: (msg: string) => void;
}

export default function AddExpenseModal({
  visible,
  onClose,
  members,
  initialExpense,
  onAddManualExpense,
  onUpdateExpense,
  onDraftCreated,
  onError,
}: AddExpenseModalProps) {
  const [activeTab, setActiveTab] = useState<'manual' | 'ai'>('manual');
  const [splitMode, setSplitMode] = useState<'equal' | 'custom'>('equal');

  // Manual Form State
  const [title, setTitle] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [paidById, setPaidById] = useState<string>(members[0]?.id || '');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(
    members.map((m) => m.id)
  );
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});

  // AI Form State
  const [promptText, setPromptText] = useState('');
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  // Sync state on open or when initialExpense changes (for editing)
  useEffect(() => {
    if (visible) {
      if (initialExpense) {
        setTitle(initialExpense.title);
        setAmountStr(initialExpense.total_amount.toString());
        setPaidById(initialExpense.paid_by_member_id);
        const splitMemberIds = Object.keys(initialExpense.splits);
        setSelectedMemberIds(splitMemberIds);

        // Check if splits were equal or custom
        const total = initialExpense.total_amount;
        const expectedEqual = Number((total / (splitMemberIds.length || 1)).toFixed(2));
        const isCustom = Object.values(initialExpense.splits).some(
          (val) => Math.abs(val - expectedEqual) > 0.05
        );

        if (isCustom) {
          setSplitMode('custom');
          const customMap: Record<string, string> = {};
          Object.entries(initialExpense.splits).forEach(([mId, val]) => {
            customMap[mId] = val.toString();
          });
          setCustomSplits(customMap);
        } else {
          setSplitMode('equal');
        }
      } else {
        // Reset form for new expense
        setTitle('');
        setAmountStr('');
        setPaidById(members[0]?.id || '');
        setSelectedMemberIds(members.map((m) => m.id));
        setSplitMode('equal');
        setCustomSplits({});
      }
    }
  }, [visible, initialExpense, members]);

  function toggleMemberSelection(memberId: string) {
    if (selectedMemberIds.includes(memberId)) {
      if (selectedMemberIds.length > 1) {
        setSelectedMemberIds(selectedMemberIds.filter((id) => id !== memberId));
      }
    } else {
      setSelectedMemberIds([...selectedMemberIds, memberId]);
    }
  }

  function handleSelectAll() {
    if (selectedMemberIds.length === members.length) {
      setSelectedMemberIds([paidById]);
    } else {
      setSelectedMemberIds(members.map((m) => m.id));
    }
  }

  // Calculate live allocated total for custom mode
  const customSum = Object.entries(customSplits).reduce((sum, [mId, str]) => {
    return selectedMemberIds.includes(mId) ? sum + (parseFloat(str) || 0) : sum;
  }, 0);
  const totalAmountNum = parseFloat(amountStr) || 0;
  const remainingToAllocate = Number((totalAmountNum - customSum).toFixed(2));

  async function handleManualSubmit() {
    if (!title.trim()) {
      onError('Please enter an expense description.');
      return;
    }
    if (isNaN(totalAmountNum) || totalAmountNum <= 0) {
      onError('Please enter a valid expense amount.');
      return;
    }
    if (!paidById) {
      onError('Please select who paid for this expense.');
      return;
    }
    if (selectedMemberIds.length === 0) {
      onError('Please select at least one member to split with.');
      return;
    }

    const splits: Record<string, number> = {};

    if (splitMode === 'equal') {
      const perPerson = Number((totalAmountNum / selectedMemberIds.length).toFixed(2));
      let allocated = 0;
      selectedMemberIds.forEach((mId, idx) => {
        if (idx === selectedMemberIds.length - 1) {
          splits[mId] = Number((totalAmountNum - allocated).toFixed(2));
        } else {
          splits[mId] = perPerson;
          allocated += perPerson;
        }
      });
    } else {
      // Custom exact splits validation
      if (Math.abs(remainingToAllocate) > 0.5) {
        onError(`Allocated sum (₹${customSum.toFixed(2)}) must match total (₹${totalAmountNum.toFixed(2)}). Difference: ₹${remainingToAllocate.toFixed(2)}`);
        return;
      }
      selectedMemberIds.forEach((mId) => {
        splits[mId] = parseFloat(customSplits[mId] || '0') || 0;
      });
    }

    if (initialExpense && onUpdateExpense) {
      await onUpdateExpense(initialExpense.id, {
        title: title.trim(),
        paid_by_member_id: paidById,
        total_amount: totalAmountNum,
        tax_and_tip: 0,
        splits,
      });
    } else {
      await onAddManualExpense({
        title: title.trim(),
        paid_by_member_id: paidById,
        total_amount: totalAmountNum,
        tax_and_tip: 0,
        splits,
      });
    }

    onClose();
  }

  async function runAIPipeline(payload: {
    textPrompt?: string;
    base64Media?: string;
    mimeType?: 'image/jpeg' | 'image/png' | 'audio/m4a' | 'audio/webm';
  }) {
    if (members.length === 0) {
      onError('Please add group members in the Members tab before scanning bills.');
      return;
    }

    try {
      setIsProcessingAI(true);
      const extracted = await parseMultimodalExpense({
        members,
        ...payload,
      });

      const matchedPayer =
        members.find(
          (m) =>
            extracted.paidByMemberName &&
            m.name.toLowerCase() === extracted.paidByMemberName.toLowerCase()
        ) || members[0];

      const mappedItems = extracted.items.map((item, idx) => {
        const excludedIds = members
          .filter((m) =>
            item.excludedMemberNames.some(
              (ex) => ex.toLowerCase() === m.name.toLowerCase()
            )
          )
          .map((m) => m.id);

        return {
          id: `item-${idx}-${Date.now()}`,
          name: item.name,
          amount: item.amount,
          category: item.category,
          excludedMemberIds: excludedIds,
        };
      });

      onDraftCreated({
        title: extracted.merchantOrTitle || 'Group Expense',
        paidById: matchedPayer?.id || members[0]?.id || '',
        items: mappedItems,
        taxAndTip: extracted.taxAndServiceCharge || 0,
        note: extracted.confidenceNote,
      });

      onClose();
    } catch (err: any) {
      onError(err?.message || 'Failed to parse expense.');
    } finally {
      setIsProcessingAI(false);
    }
  }

  async function handlePickReceipt() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0].base64) {
      await runAIPipeline({
        base64Media: result.assets[0].base64,
        mimeType: 'image/jpeg',
        textPrompt: promptText || 'Parse this bill into itemized categories and totals.',
      });
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>
                {initialExpense ? 'Edit Expense' : 'Add Expense'}
              </Text>
              <Text style={styles.subtitle}>
                {initialExpense ? 'Update amount or split participants' : 'Log a spend to the group ledger'}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Mode Switcher (only show AI when adding new) */}
          {!initialExpense && (
            <View style={styles.segmentedControl}>
              <TouchableOpacity
                style={[styles.segmentBtn, activeTab === 'manual' && styles.segmentBtnActive]}
                onPress={() => setActiveTab('manual')}
              >
                <Receipt size={14} color={activeTab === 'manual' ? COLORS.bg : COLORS.textMuted} />
                <Text style={[styles.segmentText, activeTab === 'manual' && styles.segmentTextActive]}>
                  Manual Entry
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.segmentBtn, activeTab === 'ai' && styles.segmentBtnActive]}
                onPress={() => setActiveTab('ai')}
              >
                <Sparkles size={14} color={activeTab === 'ai' ? COLORS.bg : COLORS.primary} />
                <Text style={[styles.segmentText, activeTab === 'ai' && styles.segmentTextActive]}>
                  AI Assistant
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {activeTab === 'manual' ? (
              <View style={styles.form}>
                {/* Title */}
                <View style={styles.field}>
                  <Text style={styles.label}>EXPENSE DESCRIPTION</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Fisherman's Wharf Dinner, Uber, Groceries"
                    placeholderTextColor={COLORS.textDim}
                    value={title}
                    onChangeText={setTitle}
                  />
                </View>

                {/* Amount */}
                <View style={styles.field}>
                  <Text style={styles.label}>AMOUNT (₹ INR)</Text>
                  <View style={styles.amountInputWrap}>
                    <Text style={styles.currencyPrefix}>₹</Text>
                    <TextInput
                      style={styles.amountInput}
                      placeholder="0.00"
                      placeholderTextColor={COLORS.textDim}
                      keyboardType="numeric"
                      value={amountStr}
                      onChangeText={setAmountStr}
                    />
                  </View>
                </View>

                {/* Paid By */}
                <View style={styles.field}>
                  <Text style={styles.label}>PAID BY</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                    <View style={styles.chipRow}>
                      {members.map((m, idx) => {
                        const isSelected = paidById === m.id;
                        const avatar = getAvatarColor(idx);
                        return (
                          <TouchableOpacity
                            key={m.id}
                            style={[
                              styles.payerChip,
                              isSelected && styles.payerChipActive,
                            ]}
                            onPress={() => setPaidById(m.id)}
                          >
                            <View
                              style={[
                                styles.avatarSmall,
                                { backgroundColor: avatar.bg, borderColor: avatar.border },
                              ]}
                            >
                              <Text style={[styles.avatarText, { color: avatar.text }]}>
                                {m.name.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                            <Text
                              style={[
                                styles.chipText,
                                isSelected && styles.chipTextActive,
                              ]}
                            >
                              {m.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>

                {/* Split Mode Selector (Equal vs Custom) */}
                <View style={styles.splitModeRow}>
                  <Text style={styles.label}>SPLIT METHOD</Text>
                  <View style={styles.splitToggleWrap}>
                    <TouchableOpacity
                      style={[styles.splitToggleBtn, splitMode === 'equal' && styles.splitToggleBtnActive]}
                      onPress={() => setSplitMode('equal')}
                    >
                      <Text style={[styles.splitToggleText, splitMode === 'equal' && styles.splitToggleTextActive]}>
                        Equally
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.splitToggleBtn, splitMode === 'custom' && styles.splitToggleBtnActive]}
                      onPress={() => setSplitMode('custom')}
                    >
                      <Text style={[styles.splitToggleText, splitMode === 'custom' && styles.splitToggleTextActive]}>
                        Exact Shares
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Split Among Members */}
                <View style={styles.field}>
                  <View style={styles.splitHeaderRow}>
                    <Text style={styles.label}>PARTICIPATING MEMBERS ({selectedMemberIds.length}/{members.length})</Text>
                    <TouchableOpacity onPress={handleSelectAll}>
                      <Text style={styles.selectAllText}>
                        {selectedMemberIds.length === members.length ? 'Clear Others' : 'Select All'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.membersGrid}>
                    {members.map((m, idx) => {
                      const isIncluded = selectedMemberIds.includes(m.id);
                      const avatar = getAvatarColor(idx);
                      const equalShare =
                        selectedMemberIds.length > 0 && totalAmountNum > 0
                          ? (totalAmountNum / selectedMemberIds.length).toFixed(0)
                          : '0';

                      return (
                        <View
                          key={m.id}
                          style={[
                            styles.memberSplitCard,
                            isIncluded && styles.memberSplitCardActive,
                          ]}
                        >
                          <TouchableOpacity
                            style={styles.memberSplitLeft}
                            onPress={() => toggleMemberSelection(m.id)}
                          >
                            <View
                              style={[
                                styles.checkbox,
                                isIncluded && styles.checkboxActive,
                              ]}
                            >
                              {isIncluded && <Check size={12} color={COLORS.bg} strokeWidth={3} />}
                            </View>
                            <View
                              style={[
                                styles.avatarSmall,
                                { backgroundColor: avatar.bg, borderColor: avatar.border },
                              ]}
                            >
                              <Text style={[styles.avatarText, { color: avatar.text }]}>
                                {m.name.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                            <Text style={styles.splitMemberName}>{m.name}</Text>
                          </TouchableOpacity>

                          {isIncluded && (
                            splitMode === 'equal' ? (
                              <Text style={styles.splitMemberShare}>₹{equalShare}</Text>
                            ) : (
                              <View style={styles.customAmountWrap}>
                                <Text style={styles.customCurrencyPrefix}>₹</Text>
                                <TextInput
                                  style={styles.customAmountInput}
                                  placeholder="0"
                                  placeholderTextColor={COLORS.textDim}
                                  keyboardType="numeric"
                                  value={customSplits[m.id] || ''}
                                  onChangeText={(txt) =>
                                    setCustomSplits({ ...customSplits, [m.id]: txt })
                                  }
                                />
                              </View>
                            )
                          )}
                        </View>
                      );
                    })}
                  </View>

                  {/* Custom mode remaining balance indicator */}
                  {splitMode === 'custom' && totalAmountNum > 0 && (
                    <View style={styles.customRemainingRow}>
                      <Text style={styles.customRemainingLabel}>Remaining to allocate:</Text>
                      <Text
                        style={[
                          styles.customRemainingVal,
                          Math.abs(remainingToAllocate) > 0.05 && { color: COLORS.warning },
                        ]}
                      >
                        ₹{remainingToAllocate.toFixed(2)}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Submit Action */}
                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    (!title.trim() || !amountStr || members.length === 0) && styles.primaryBtnDisabled,
                  ]}
                  onPress={handleManualSubmit}
                  disabled={!title.trim() || !amountStr || members.length === 0}
                >
                  <Check size={16} color={COLORS.bg} strokeWidth={2.5} />
                  <Text style={styles.primaryBtnText}>
                    {initialExpense ? 'Update Expense' : `Save Expense • ₹${parseFloat(amountStr || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.aiForm}>
                <View style={styles.aiHero}>
                  <View style={styles.aiIconBadge}>
                    <Sparkles size={20} color={COLORS.primary} />
                  </View>
                  <Text style={styles.aiHeroTitle}>AI Bill Splitter</Text>
                  <Text style={styles.aiHeroSub}>
                    Describe the bill in natural text or upload a receipt photo. SettleMint categorizes items into Veg, Non-Veg, and Alcohol according to your group's rules.
                  </Text>
                </View>

                {/* Prompt Text Input */}
                <View style={styles.field}>
                  <Text style={styles.label}>DESCRIBE EXPENSE</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    multiline
                    numberOfLines={3}
                    placeholder='e.g. "Rahul paid 3400 for dinner: 1400 beer, 1100 prawns, 900 veg paneer"'
                    placeholderTextColor={COLORS.textDim}
                    value={promptText}
                    onChangeText={setPromptText}
                  />
                </View>

                {/* Media Actions */}
                <View style={styles.mediaActionsRow}>
                  <TouchableOpacity
                    style={styles.mediaBtn}
                    onPress={handlePickReceipt}
                    disabled={isProcessingAI}
                  >
                    <Camera size={18} color={COLORS.text} />
                    <Text style={styles.mediaBtnText}>Upload Receipt Photo</Text>
                  </TouchableOpacity>
                </View>

                {/* Submit AI Prompt */}
                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    (!promptText.trim() || isProcessingAI) && styles.primaryBtnDisabled,
                  ]}
                  onPress={() => runAIPipeline({ textPrompt: promptText })}
                  disabled={!promptText.trim() || isProcessingAI}
                >
                  {isProcessingAI ? (
                    <ActivityIndicator size="small" color={COLORS.bg} />
                  ) : (
                    <>
                      <Sparkles size={16} color={COLORS.bg} strokeWidth={2.5} />
                      <Text style={styles.primaryBtnText}>Analyze & Generate Draft Split</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 540,
    maxHeight: '90%',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  title: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    color: COLORS.textDim,
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceHover,
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentedControl: {
    flexDirection: 'row',
    padding: 4,
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: '#0D0D10',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 7,
  },
  segmentBtnActive: {
    backgroundColor: COLORS.text,
  },
  segmentText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: COLORS.bg,
    fontWeight: '700',
  },
  body: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  form: {
    gap: 16,
    paddingBottom: 12,
  },
  field: {
    gap: 6,
  },
  label: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    fontFamily: MONO_FONT,
  },
  input: {
    height: 44,
    backgroundColor: '#09090B',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    color: COLORS.text,
    fontSize: 14,
  },
  textArea: {
    height: 80,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  amountInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: '#09090B',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 14,
  },
  currencyPrefix: {
    color: COLORS.primary,
    fontSize: 20,
    fontWeight: '700',
    fontFamily: MONO_FONT,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    fontFamily: MONO_FONT,
  },
  chipsScroll: {
    marginTop: 2,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  payerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#09090B',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  payerChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  chipText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  chipTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  avatarSmall: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 10,
    fontWeight: '700',
  },
  splitModeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  splitToggleWrap: {
    flexDirection: 'row',
    backgroundColor: '#09090B',
    borderRadius: 6,
    padding: 2,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  splitToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  splitToggleBtnActive: {
    backgroundColor: COLORS.surfaceHover,
  },
  splitToggleText: {
    color: COLORS.textDim,
    fontSize: 11,
    fontWeight: '600',
  },
  splitToggleTextActive: {
    color: COLORS.text,
    fontWeight: '700',
  },
  splitHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectAllText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '600',
  },
  membersGrid: {
    gap: 8,
    marginTop: 4,
  },
  memberSplitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#09090B',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  memberSplitCardActive: {
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceHover,
  },
  memberSplitLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.borderActive,
    backgroundColor: '#09090B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  splitMemberName: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  splitMemberShare: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: MONO_FONT,
  },
  customAmountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#09090B',
    borderWidth: 1,
    borderColor: COLORS.borderActive,
    borderRadius: 6,
    paddingHorizontal: 8,
    height: 32,
    width: 100,
  },
  customCurrencyPrefix: {
    color: COLORS.textDim,
    fontSize: 12,
    fontFamily: MONO_FONT,
    marginRight: 4,
  },
  customAmountInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: MONO_FONT,
    padding: 0,
  },
  customRemainingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
  },
  customRemainingLabel: {
    color: COLORS.textDim,
    fontSize: 11,
  },
  customRemainingVal: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: MONO_FONT,
  },
  primaryBtn: {
    height: 46,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  primaryBtnDisabled: {
    opacity: 0.4,
  },
  primaryBtnText: {
    color: COLORS.bg,
    fontSize: 14,
    fontWeight: '700',
  },
  aiForm: {
    gap: 16,
    paddingBottom: 12,
  },
  aiHero: {
    alignItems: 'center',
    backgroundColor: '#09090B',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 12,
    padding: 18,
    textAlign: 'center',
  },
  aiIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  aiHeroTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  aiHeroSub: {
    color: COLORS.textDim,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  mediaActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  mediaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    backgroundColor: '#09090B',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  mediaBtnText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
  },
});
