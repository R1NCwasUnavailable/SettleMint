import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Sparkles, Check, X, ShieldAlert, ChevronRight } from 'lucide-react-native';
import { MemberProfile } from '../types/ledger';
import { calculateItemizedSplits, getEligibleMembersForItem } from '../lib/cashflow';
import { CATEGORY_COLORS, COLORS, MONO_FONT, getAvatarColor, shared } from '../theme';
import type { DraftExpense } from './CommandBar';

interface DraftInspectorProps {
  draft: DraftExpense;
  members: MemberProfile[];
  onUpdateDraft: (draft: DraftExpense) => void;
  onCommit: () => void;
  onDiscard: () => void;
}

export default function DraftInspector({
  draft,
  members,
  onUpdateDraft,
  onCommit,
  onDiscard,
}: DraftInspectorProps) {
  const { memberSplits, grandTotal } = calculateItemizedSplits(
    members,
    draft.items,
    draft.taxAndTip
  );

  function toggleMemberExclusion(itemId: string, memberId: string) {
    onUpdateDraft({
      ...draft,
      items: draft.items.map((item) => {
        if (item.id !== itemId) return item;
        const exists = item.excludedMemberIds.includes(memberId);
        return {
          ...item,
          excludedMemberIds: exists
            ? item.excludedMemberIds.filter((id) => id !== memberId)
            : [...item.excludedMemberIds, memberId],
        };
      }),
    });
  }

  function setPayer(memberId: string) {
    onUpdateDraft({
      ...draft,
      paidById: memberId,
    });
  }

  const payer = members.find((m) => m.id === draft.paidById) || members[0];

  return (
    <View style={styles.confirmCard}>
      {/* Header Badge */}
      <View style={styles.confirmHeader}>
        <View style={shared.rowCenter}>
          <View style={styles.badgePulse}>
            <Sparkles size={13} color={COLORS.primary} />
          </View>
          <Text style={styles.confirmBadge}>AI DRAFT SPLIT • REVIEW BEFORE COMMITTING</Text>
        </View>
        <TouchableOpacity style={styles.discardBtn} onPress={onDiscard}>
          <X size={14} color={COLORS.textMuted} />
          <Text style={styles.discardText}>Discard</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.draftTitle}>{draft.title}</Text>
      {draft.note ? <Text style={styles.draftNote}>{draft.note}</Text> : null}

      {/* Payer Selection */}
      <View style={styles.payerSection}>
        <Text style={styles.microLabel}>PAID BY</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.payerScroll}>
          <View style={styles.payerRow}>
            {members.map((m, idx) => {
              const isPayer = m.id === draft.paidById;
              const avatar = getAvatarColor(idx);
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.payerPill, isPayer && styles.payerPillActive]}
                  onPress={() => setPayer(m.id)}
                >
                  <View
                    style={[
                      styles.avatarMini,
                      { backgroundColor: avatar.bg, borderColor: avatar.border },
                    ]}
                  >
                    <Text style={[styles.avatarMiniText, { color: avatar.text }]}>
                      {m.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.payerName, isPayer && styles.payerNameActive]}>
                    {m.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Itemized Line Items */}
      <View style={styles.itemsSection}>
        <Text style={styles.microLabel}>ITEMIZED POOLS (TAP TO TOGGLE PARTICIPATION)</Text>
        {draft.items.map((item) => {
          const catConfig = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.common;
          const eligible = getEligibleMembersForItem(members, item);

          return (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemTop}>
                <View style={styles.itemTitleRow}>
                  <View
                    style={[
                      styles.catBadge,
                      { backgroundColor: catConfig.bg, borderColor: catConfig.border },
                    ]}
                  >
                    <Text style={[styles.catText, { color: catConfig.text }]}>
                      {catConfig.label.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.itemName}>{item.name}</Text>
                </View>
                <Text style={styles.itemAmount}>
                  ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
              </View>

              {/* Members participating in this pool */}
              <View style={styles.chipsRow}>
                {members.map((m) => {
                  const isParticipating = !item.excludedMemberIds.includes(m.id);
                  const isEligibleByRule = eligible.some((e) => e.id === m.id);

                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[
                        styles.partChip,
                        isParticipating ? styles.partChipOn : styles.partChipOff,
                        !isEligibleByRule && isParticipating && styles.partChipRuleOverride,
                      ]}
                      onPress={() => toggleMemberExclusion(item.id, m.id)}
                    >
                      <Text
                        style={[
                          styles.partChipText,
                          isParticipating ? styles.partChipTextOn : styles.partChipTextOff,
                        ]}
                      >
                        {isParticipating ? '✓ ' : '✕ '}
                        {m.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })}

        {/* Proportional Tax & Tip */}
        {draft.taxAndTip > 0 && (
          <View style={styles.taxRow}>
            <View>
              <Text style={styles.taxTitle}>GST, VAT & Service Charges</Text>
              <Text style={styles.taxSub}>Allocated proportionally across subtotal shares</Text>
            </View>
            <Text style={styles.taxAmount}>₹{draft.taxAndTip.toFixed(2)}</Text>
          </View>
        )}
      </View>

      {/* Live Per-Person Allocation */}
      <View style={styles.allocationSection}>
        <Text style={styles.microLabel}>LIVE ALLOCATION BREAKDOWN</Text>
        <View style={styles.splitGrid}>
          {members.map((m, idx) => {
            const avatar = getAvatarColor(idx);
            const share = memberSplits[m.id] || 0;
            return (
              <View key={m.id} style={styles.splitCell}>
                <View style={styles.splitCellHeader}>
                  <View
                    style={[
                      styles.avatarMini,
                      { backgroundColor: avatar.bg, borderColor: avatar.border },
                    ]}
                  >
                    <Text style={[styles.avatarMiniText, { color: avatar.text }]}>
                      {m.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.splitCellName} numberOfLines={1}>{m.name}</Text>
                </View>
                <Text style={styles.splitCellVal}>₹{share.toFixed(2)}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Commit Button */}
      <TouchableOpacity style={styles.commitBtn} onPress={onCommit}>
        <Check size={18} color={COLORS.bg} strokeWidth={2.5} />
        <Text style={styles.commitBtnText}>
          Mint Split to Ledger • ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  confirmCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 14,
    padding: 18,
    marginBottom: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  confirmHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgePulse: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBadge: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    fontFamily: MONO_FONT,
  },
  discardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#18181C',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  discardText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  draftTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
  },
  draftNote: {
    color: COLORS.textDim,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  payerSection: {
    marginTop: 14,
  },
  microLabel: {
    color: COLORS.textDim,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: MONO_FONT,
    marginBottom: 8,
  },
  payerScroll: {
    marginHorizontal: -2,
  },
  payerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  payerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#09090B',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  payerPillActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  payerName: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  payerNameActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  avatarMini: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarMiniText: {
    fontSize: 9,
    fontWeight: '700',
  },
  itemsSection: {
    marginTop: 18,
    gap: 10,
  },
  itemCard: {
    backgroundColor: '#09090B',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 10,
    padding: 12,
  },
  itemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 10,
  },
  catBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  catText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontFamily: MONO_FONT,
  },
  itemName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  itemAmount: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: MONO_FONT,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 4,
  },
  partChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  partChipOn: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: '#10B981',
  },
  partChipOff: {
    backgroundColor: '#141416',
    borderColor: '#222226',
    opacity: 0.5,
  },
  partChipRuleOverride: {
    borderColor: COLORS.warning,
  },
  partChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  partChipTextOn: {
    color: COLORS.primary,
  },
  partChipTextOff: {
    color: COLORS.textDim,
  },
  taxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#09090B',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 8,
    marginTop: 4,
  },
  taxTitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  taxSub: {
    color: COLORS.textDim,
    fontSize: 10,
    marginTop: 2,
  },
  taxAmount: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: MONO_FONT,
  },
  allocationSection: {
    marginTop: 18,
  },
  splitGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  splitCell: {
    flex: 1,
    minWidth: 100,
    backgroundColor: '#09090B',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 8,
    padding: 10,
  },
  splitCellHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  splitCellName: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  splitCellVal: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: MONO_FONT,
  },
  commitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    height: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  commitBtnText: {
    color: COLORS.bg,
    fontSize: 14,
    fontWeight: '700',
  },
});
