import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  useWindowDimensions,
  KeyboardAvoidingView,
  TextInput,
  Modal,
} from 'react-native';
import {
  Receipt,
  Users,
  Wallet,
  Plus,
  RotateCcw,
  Sparkles,
  Edit3,
  Check,
  X,
  AlertCircle,
  Home,
} from 'lucide-react-native';
import { ExpenseRecord } from '../src/types/ledger';
import { useTripStore } from '../src/store/useTripStore';
import { computeMinimumCashFlow, calculateItemizedSplits } from '../src/lib/cashflow';
import {
  buildTripSummaryMessage,
  shareToWhatsApp,
  copySummaryToClipboard,
} from '../src/lib/exportSummary';
import { COLORS, MONO_FONT, shared } from '../src/theme';

import CommandBar, { DraftExpense } from '../src/components/CommandBar';
import DraftInspector from '../src/components/DraftInspector';
import LedgerFeed from '../src/components/LedgerFeed';
import RosterMatrix from '../src/components/RosterMatrix';
import CashFlowPanel from '../src/components/CashFlowPanel';
import AddExpenseModal from '../src/components/AddExpenseModal';
import FreshLandingScreen from '../src/components/FreshLandingScreen';

export default function SettleMintScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 960;

  const {
    tripName,
    members,
    expenses,
    syncStatus,
    pendingSyncIds,
    hasStartedTrip,
    startNewTrip,
    setTripName,
    initializeRealtimeSync,
    addExpense,
    updateExpense,
    deleteExpense,
    recordPayment,
    updateMemberRule,
    addMember,
    deleteMember,
    flushOfflineQueue,
    clearAllData,
    loadSampleTrip,
  } = useTripStore();

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    initializeRealtimeSync().then((unsub) => {
      cleanup = unsub;
    });
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  const [activeTab, setActiveTab] = useState<'ledger' | 'settle' | 'roster'>('ledger');
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [copiedBanner, setCopiedBanner] = useState(false);
  
  // Clean initial draft
  const [draftExpense, setDraftExpense] = useState<DraftExpense | null>(null);
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [tempTripName, setTempTripName] = useState(tripName);

  const { netBalances, transfers } = computeMinimumCashFlow(members, expenses);
  const totalTripSpend = expenses.reduce((acc, e) => acc + e.total_amount, 0);

  // If no trip has been started and there's no data, show Fresh Landing Experience!
  if (!hasStartedTrip && members.length === 0 && expenses.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <FreshLandingScreen
          onStartTrip={startNewTrip}
          onLoadDemo={loadSampleTrip}
        />
      </SafeAreaView>
    );
  }

  async function handleCommitDraft() {
    if (!draftExpense) return;
    const { memberSplits, grandTotal } = calculateItemizedSplits(
      members,
      draftExpense.items,
      draftExpense.taxAndTip
    );

    await addExpense({
      title: draftExpense.title,
      paid_by_member_id: draftExpense.paidById,
      total_amount: grandTotal,
      tax_and_tip: draftExpense.taxAndTip,
      splits: memberSplits,
    });
    setDraftExpense(null);
  }

  function handleTriggerDemo() {
    setErrorBanner(null);
    loadSampleTrip();
  }

  function handleResetToLanding() {
    if (Platform.OS === 'web') {
      if (window.confirm('Start a new trip? This will clear current trip data and return to the home screen.')) {
        clearAllData();
        setDraftExpense(null);
      }
    } else {
      clearAllData();
      setDraftExpense(null);
    }
  }

  async function handleExportWhatsApp() {
    const msg = buildTripSummaryMessage({ tripName, members, expenses, netBalances, transfers });
    await shareToWhatsApp(msg);
  }

  async function handleCopyDigest() {
    const msg = buildTripSummaryMessage({ tripName, members, expenses, netBalances, transfers });
    const ok = await copySummaryToClipboard(msg);
    if (ok) {
      setCopiedBanner(true);
      setTimeout(() => setCopiedBanner(false), 2200);
    }
  }

  function handleSaveTripName() {
    if (tempTripName.trim()) {
      setTripName(tempTripName.trim());
    }
    setIsRenameModalOpen(false);
  }

  function handleOpenAddExpense() {
    setEditingExpense(null);
    setIsAddModalOpen(true);
  }

  function handleOpenEditExpense(exp: ExpenseRecord) {
    setEditingExpense(exp);
    setIsAddModalOpen(true);
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ── Top App Bar ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={shared.rowCenter}>
              <View
                style={[
                  shared.emeraldDot,
                  syncStatus === 'offline-queued' && shared.amberDot,
                  syncStatus === 'syncing' && { backgroundColor: COLORS.info },
                ]}
              />
              <Text style={styles.brandSub}>
                SETTLEMINT // {syncStatus.toUpperCase()}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.tripTitleRow}
              onPress={() => {
                setTempTripName(tripName);
                setIsRenameModalOpen(true);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.brandTitle}>{tripName || 'Untitled Group Trip'}</Text>
              <Edit3 size={14} color={COLORS.textDim} style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>

          {/* Quick Header Actions */}
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.headerActionBtn}
              onPress={handleResetToLanding}
            >
              <Home size={13} color={COLORS.textDim} />
              <Text style={styles.headerActionText}>New Trip</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryActionBtn}
              onPress={handleOpenAddExpense}
            >
              <Plus size={15} color={COLORS.bg} strokeWidth={2.5} />
              <Text style={styles.primaryActionText}>Add Expense</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Metric Highlights Bar ── */}
        <View style={styles.metricsBar}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>TOTAL TRIP SPEND</Text>
            <Text style={styles.metricValue}>
              ₹{totalTripSpend.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>EXPENSES</Text>
            <Text style={styles.metricValueSub}>{expenses.length}</Text>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>MEMBERS</Text>
            <Text style={styles.metricValueSub}>{members.length}</Text>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>OUTSTANDING TRANSFERS</Text>
            <Text
              style={[
                styles.metricValueSub,
                transfers.length > 0 && { color: COLORS.warning },
              ]}
            >
              {transfers.length}
            </Text>
          </View>
        </View>

        {/* ── Navigation Tabs ── */}
        <View style={styles.navBar}>
          {([
            { key: 'ledger', label: 'Expenses Ledger', count: expenses.length, icon: Receipt },
            { key: 'settle', label: 'Balances & Settle', count: transfers.length, icon: Wallet },
            { key: 'roster', label: 'Members & Rules', count: members.length, icon: Users },
          ] as const).map((tab) => {
            const IconComponent = tab.icon;
            const active = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[styles.navTab, active && styles.navTabActive]}
              >
                <IconComponent size={14} color={active ? COLORS.bg : COLORS.textMuted} />
                <Text style={[styles.navText, active && styles.navTextActive]}>
                  {tab.label}
                </Text>
                {tab.count > 0 && (
                  <View
                    style={[
                      styles.tabCountBadge,
                      active && styles.tabCountBadgeActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabCountText,
                        active && styles.tabCountTextActive,
                      ]}
                    >
                      {tab.count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Main Scroll Body ── */}
        <ScrollView
          style={styles.body}
          contentContainerStyle={{ paddingBottom: 130 }}
          showsVerticalScrollIndicator={false}
        >
          {errorBanner && (
            <View style={styles.errorBox}>
              <AlertCircle size={15} color={COLORS.danger} />
              <Text style={styles.errorText}>{errorBanner}</Text>
              <TouchableOpacity onPress={() => setErrorBanner(null)}>
                <X size={14} color={COLORS.danger} />
              </TouchableOpacity>
            </View>
          )}

          {/* AI Draft Inspector (Reveals when an active draft exists) */}
          {draftExpense && (
            <DraftInspector
              draft={draftExpense}
              members={members}
              onUpdateDraft={setDraftExpense}
              onCommit={handleCommitDraft}
              onDiscard={() => setDraftExpense(null)}
            />
          )}

          {/* Desktop Dual-Column or Mobile Single-Tab */}
          {isDesktop ? (
            <View style={styles.desktopColumns}>
              {/* Left Column: Ledger / Add */}
              <View style={styles.leftCol}>
                <LedgerFeed
                  expenses={expenses}
                  members={members}
                  pendingSyncIds={pendingSyncIds}
                  onAddExpensePress={handleOpenAddExpense}
                  onEditExpense={handleOpenEditExpense}
                  onDeleteExpense={deleteExpense}
                  onLoadSample={handleTriggerDemo}
                  onFlushQueue={flushOfflineQueue}
                />
              </View>

              {/* Right Column: Settle + Roster */}
              <View style={styles.rightCol}>
                <CashFlowPanel
                  members={members}
                  expenses={expenses}
                  netBalances={netBalances}
                  transfers={transfers}
                  onCopyDigest={handleCopyDigest}
                  onShareWhatsApp={handleExportWhatsApp}
                  onRecordPayment={recordPayment}
                  copiedBanner={copiedBanner}
                />
                <RosterMatrix
                  members={members}
                  onUpdateRule={updateMemberRule}
                  onAddMember={addMember}
                  onDeleteMember={deleteMember}
                  onLoadSample={handleTriggerDemo}
                />
              </View>
            </View>
          ) : (
            <View>
              {activeTab === 'ledger' && (
                <LedgerFeed
                  expenses={expenses}
                  members={members}
                  pendingSyncIds={pendingSyncIds}
                  onAddExpensePress={handleOpenAddExpense}
                  onEditExpense={handleOpenEditExpense}
                  onDeleteExpense={deleteExpense}
                  onLoadSample={handleTriggerDemo}
                  onFlushQueue={flushOfflineQueue}
                />
              )}
              {activeTab === 'settle' && (
                <CashFlowPanel
                  members={members}
                  expenses={expenses}
                  netBalances={netBalances}
                  transfers={transfers}
                  onCopyDigest={handleCopyDigest}
                  onShareWhatsApp={handleExportWhatsApp}
                  onRecordPayment={recordPayment}
                  copiedBanner={copiedBanner}
                />
              )}
              {activeTab === 'roster' && (
                <RosterMatrix
                  members={members}
                  onUpdateRule={updateMemberRule}
                  onAddMember={addMember}
                  onDeleteMember={deleteMember}
                  onLoadSample={handleTriggerDemo}
                />
              )}
            </View>
          )}
        </ScrollView>

        {/* ── Bottom Command Bar ── */}
        <CommandBar
          members={members}
          onDraftCreated={(draft) => {
            setErrorBanner(null);
            setDraftExpense(draft);
          }}
          onError={setErrorBanner}
        />

        {/* ── Add / Edit Expense Modal (Manual & AI) ── */}
        <AddExpenseModal
          visible={isAddModalOpen}
          initialExpense={editingExpense}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingExpense(null);
          }}
          members={members}
          onAddManualExpense={addExpense}
          onUpdateExpense={updateExpense}
          onDraftCreated={(draft) => {
            setErrorBanner(null);
            setDraftExpense(draft);
          }}
          onError={setErrorBanner}
        />

        {/* ── Rename Trip Modal ── */}
        <Modal
          visible={isRenameModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsRenameModalOpen(false)}
        >
          <View style={styles.renameBackdrop}>
            <View style={styles.renameModal}>
              <Text style={styles.renameTitle}>Rename Trip</Text>
              <TextInput
                style={styles.renameInput}
                value={tempTripName}
                onChangeText={setTempTripName}
                placeholder="Trip Name (e.g. Goa & Gokarna ’26)"
                placeholderTextColor={COLORS.textDim}
                autoFocus
              />
              <View style={styles.renameButtonsRow}>
                <TouchableOpacity
                  style={styles.renameCancelBtn}
                  onPress={() => setIsRenameModalOpen(false)}
                >
                  <Text style={styles.renameCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.renameSaveBtn}
                  onPress={handleSaveTripName}
                >
                  <Text style={styles.renameSaveText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
    backgroundColor: COLORS.bg,
  },
  headerLeft: {
    flex: 1,
  },
  brandSub: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    fontFamily: MONO_FONT,
  },
  tripTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  brandTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  headerActionText: {
    color: COLORS.textDim,
    fontSize: 12,
    fontWeight: '600',
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  primaryActionText: {
    color: COLORS.bg,
    fontSize: 13,
    fontWeight: '700',
  },
  metricsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
    paddingHorizontal: 22,
    paddingVertical: 10,
    flexWrap: 'wrap',
    gap: 12,
  },
  metricItem: {
    justifyContent: 'center',
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.border,
  },
  metricLabel: {
    color: COLORS.textDim,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    fontFamily: MONO_FONT,
    marginBottom: 2,
  },
  metricValue: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: MONO_FONT,
  },
  metricValueSub: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    fontFamily: MONO_FONT,
  },
  navBar: {
    flexDirection: 'row',
    marginHorizontal: 22,
    marginTop: 14,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  navTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 7,
  },
  navTabActive: {
    backgroundColor: COLORS.text,
  },
  navText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  navTextActive: {
    color: COLORS.bg,
    fontWeight: '700',
  },
  tabCountBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    backgroundColor: '#27272A',
  },
  tabCountBadgeActive: {
    backgroundColor: '#E4E4E7',
  },
  tabCountText: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '700',
    fontFamily: MONO_FONT,
  },
  tabCountTextActive: {
    color: COLORS.bg,
  },
  body: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 16,
  },
  desktopColumns: {
    flexDirection: 'row',
    gap: 24,
    alignItems: 'flex-start',
  },
  leftCol: {
    flex: 1.15,
  },
  rightCol: {
    flex: 0.85,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderColor: COLORS.danger,
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: '#FDA4AF',
    fontSize: 12,
    flex: 1,
  },
  renameBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  renameModal: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 20,
  },
  renameTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  renameInput: {
    height: 44,
    backgroundColor: '#09090B',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    color: COLORS.text,
    fontSize: 14,
    marginBottom: 16,
  },
  renameButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  renameCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#18181C',
  },
  renameCancelText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  renameSaveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  renameSaveText: {
    color: COLORS.bg,
    fontSize: 13,
    fontWeight: '700',
  },
});
