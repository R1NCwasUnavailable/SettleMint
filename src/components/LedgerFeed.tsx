import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import {
  Receipt,
  Search,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronUp,
  Plus,
  Sparkles,
  RefreshCw,
  HandCoins,
} from 'lucide-react-native';
import { ExpenseRecord, MemberProfile } from '../types/ledger';
import { COLORS, MONO_FONT, getAvatarColor, shared } from '../theme';

interface LedgerFeedProps {
  expenses: ExpenseRecord[];
  members: MemberProfile[];
  pendingSyncIds: string[];
  onAddExpensePress: () => void;
  onEditExpense?: (expense: ExpenseRecord) => void;
  onDeleteExpense: (expenseId: string) => void;
  onLoadSample: () => void;
  onFlushQueue: () => void;
}

export default function LedgerFeed({
  expenses,
  members,
  pendingSyncIds,
  onAddExpensePress,
  onEditExpense,
  onDeleteExpense,
  onLoadSample,
  onFlushQueue,
}: LedgerFeedProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredExpenses = expenses.filter((exp) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const payer = members.find((m) => m.id === exp.paid_by_member_id);
    return (
      exp.title.toLowerCase().includes(query) ||
      (payer && payer.name.toLowerCase().includes(query))
    );
  });

  function confirmDelete(expenseId: string, title: string) {
    if (Platform.OS === 'web') {
      if (window.confirm(`Delete "${title}"? This will recalculate all group balances.`)) {
        onDeleteExpense(expenseId);
      }
    } else {
      Alert.alert(
        'Delete Expense',
        `Are you sure you want to delete "${title}"? This will recalculate all balances.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => onDeleteExpense(expenseId) },
        ]
      );
    }
  }

  return (
    <View style={styles.container}>
      {/* Feed Header */}
      <View style={styles.headerRow}>
        <View style={shared.rowCenter}>
          <Text style={shared.sectionHeader}>
            COMMITTED EXPENSES ({expenses.length})
          </Text>
        </View>

        <View style={shared.rowCenter}>
          {pendingSyncIds.length > 0 && (
            <TouchableOpacity style={styles.syncBtn} onPress={onFlushQueue}>
              <RefreshCw size={12} color={COLORS.warning} />
              <Text style={styles.syncBtnText}>
                {pendingSyncIds.length} Queued
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.addBtnSmall} onPress={onAddExpensePress}>
            <Plus size={14} color={COLORS.bg} strokeWidth={2.5} />
            <Text style={styles.addBtnSmallText}>New Expense</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar (if more than 2 expenses) */}
      {expenses.length > 2 && (
        <View style={styles.searchWrap}>
          <Search size={14} color={COLORS.textDim} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search expenses by title or payer..."
            placeholderTextColor={COLORS.textDim}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      )}

      {/* Empty State */}
      {expenses.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <Receipt size={28} color={COLORS.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>No expenses logged yet</Text>
          <Text style={styles.emptySubtitle}>
            Start tracking group spending. Log bills manually, scan receipt photos, or use AI voice dictation.
          </Text>

          <View style={styles.emptyActionsRow}>
            <TouchableOpacity style={styles.emptyActionPrimary} onPress={onAddExpensePress}>
              <Plus size={16} color={COLORS.bg} strokeWidth={2.5} />
              <Text style={styles.emptyActionPrimaryText}>Add Expense</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.emptyActionSecondary} onPress={onLoadSample}>
              <Sparkles size={15} color={COLORS.primary} />
              <Text style={styles.emptyActionSecondaryText}>Load Demo Trip</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : filteredExpenses.length === 0 ? (
        <View style={styles.noMatchCard}>
          <Text style={styles.noMatchText}>No expenses match "{searchQuery}"</Text>
        </View>
      ) : (
        /* Expenses List */
        <View style={styles.list}>
          {filteredExpenses.map((exp) => {
            const isPayment = exp.title.startsWith('Payment:');
            const payer = members.find((m) => m.id === exp.paid_by_member_id);
            const payerIndex = members.findIndex((m) => m.id === exp.paid_by_member_id);
            const avatar = getAvatarColor(payerIndex >= 0 ? payerIndex : 0);
            const isQueued = pendingSyncIds.includes(exp.id);
            const isExpanded = expandedId === exp.id;
            const participantsCount = Object.keys(exp.splits).filter(
              (mId) => (exp.splits[mId] || 0) > 0
            ).length;

            return (
              <View key={exp.id} style={[styles.card, isPayment && styles.paymentCard]}>
                <TouchableOpacity
                  style={styles.cardMain}
                  activeOpacity={0.8}
                  onPress={() => setExpandedId(isExpanded ? null : exp.id)}
                >
                  <View style={styles.cardLeft}>
                    <View
                      style={[
                        styles.avatar,
                        isPayment
                          ? styles.paymentAvatar
                          : { backgroundColor: avatar.bg, borderColor: avatar.border },
                      ]}
                    >
                      {isPayment ? (
                        <HandCoins size={16} color={COLORS.primary} />
                      ) : (
                        <Text style={[styles.avatarText, { color: avatar.text }]}>
                          {payer?.name ? payer.name.charAt(0).toUpperCase() : '?'}
                        </Text>
                      )}
                    </View>

                    <View style={styles.metaCol}>
                      <Text style={[styles.expenseTitle, isPayment && { color: COLORS.primary }]}>
                        {exp.title}
                      </Text>
                      <View style={styles.subMetaRow}>
                        <Text style={styles.payerText}>
                          Paid by <Text style={{ color: COLORS.text, fontWeight: '600' }}>{payer?.name || 'Unknown'}</Text>
                        </Text>
                        <Text style={styles.dotSeparator}>•</Text>
                        <Text style={styles.timeText}>{exp.created_at}</Text>
                        {isQueued && (
                          <>
                            <Text style={styles.dotSeparator}>•</Text>
                            <Text style={styles.queuedBadge}>OFFLINE</Text>
                          </>
                        )}
                      </View>
                    </View>
                  </View>

                  <View style={styles.cardRight}>
                    <Text style={[styles.amountText, isPayment && { color: COLORS.primary }]}>
                      ₹{exp.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Text>
                    <View style={styles.participantsBadge}>
                      <Text style={styles.participantsText}>
                        {isPayment ? 'Settlement' : `${participantsCount} ${participantsCount === 1 ? 'person' : 'people'}`}
                      </Text>
                      {isExpanded ? (
                        <ChevronUp size={13} color={COLORS.textDim} />
                      ) : (
                        <ChevronDown size={13} color={COLORS.textDim} />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Expanded Split Breakdown & Actions */}
                {isExpanded && (
                  <View style={styles.expandedBreakdown}>
                    <View style={styles.breakdownHeader}>
                      <Text style={styles.breakdownTitle}>SPLIT DETAILS</Text>
                      <View style={shared.rowCenter}>
                        {!isPayment && onEditExpense && (
                          <TouchableOpacity
                            style={styles.editBtn}
                            onPress={() => onEditExpense(exp)}
                          >
                            <Edit2 size={12} color={COLORS.textMuted} />
                            <Text style={styles.editBtnText}>Edit</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={styles.deleteBtn}
                          onPress={() => confirmDelete(exp.id, exp.title)}
                        >
                          <Trash2 size={12} color={COLORS.danger} />
                          <Text style={styles.deleteBtnText}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.splitPillsGrid}>
                      {members.map((m, idx) => {
                        const owed = exp.splits[m.id] || 0;
                        if (owed === 0) return null;
                        const mAvatar = getAvatarColor(idx);
                        return (
                          <View key={m.id} style={styles.splitPill}>
                            <View
                              style={[
                                styles.avatarMini,
                                { backgroundColor: mAvatar.bg, borderColor: mAvatar.border },
                              ]}
                            >
                              <Text style={[styles.avatarMiniText, { color: mAvatar.text }]}>
                                {m.name.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                            <Text style={styles.splitPillName}>{m.name}</Text>
                            <Text style={styles.splitPillVal}>₹{owed.toFixed(0)}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E1906',
    borderWidth: 1,
    borderColor: '#78350F',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  syncBtnText: {
    color: COLORS.warning,
    fontSize: 11,
    fontWeight: '600',
  },
  addBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 7,
  },
  addBtnSmallText: {
    color: COLORS.bg,
    fontSize: 12,
    fontWeight: '700',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 38,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
  },
  emptyState: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 28,
    alignItems: 'center',
    textAlign: 'center',
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.surfaceHover,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    color: COLORS.textDim,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 380,
    marginBottom: 20,
  },
  emptyActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  emptyActionPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyActionPrimaryText: {
    color: COLORS.bg,
    fontSize: 13,
    fontWeight: '700',
  },
  emptyActionSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#18181C',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyActionSecondaryText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  noMatchCard: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  noMatchText: {
    color: COLORS.textDim,
    fontSize: 13,
  },
  list: {
    gap: 10,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 12,
    overflow: 'hidden',
  },
  paymentCard: {
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  cardMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 12,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentAvatar: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: COLORS.primary,
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '700',
  },
  metaCol: {
    flex: 1,
  },
  expenseTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3,
  },
  subMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  payerText: {
    color: COLORS.textDim,
    fontSize: 12,
  },
  dotSeparator: {
    color: COLORS.borderActive,
    fontSize: 12,
  },
  timeText: {
    color: COLORS.textDim,
    fontSize: 12,
  },
  queuedBadge: {
    color: COLORS.warning,
    fontSize: 10,
    fontWeight: '700',
    fontFamily: MONO_FONT,
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  amountText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: MONO_FONT,
    marginBottom: 4,
  },
  participantsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  participantsText: {
    color: COLORS.textDim,
    fontSize: 11,
  },
  expandedBreakdown: {
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
    padding: 12,
    backgroundColor: '#0C0C0F',
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  breakdownTitle: {
    color: COLORS.textDim,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    fontFamily: MONO_FONT,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    backgroundColor: '#1C1C22',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  editBtnText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
  },
  deleteBtnText: {
    color: COLORS.danger,
    fontSize: 11,
    fontWeight: '600',
  },
  splitPillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  splitPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#141418',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  avatarMini: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarMiniText: {
    fontSize: 8,
    fontWeight: '700',
  },
  splitPillName: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
  splitPillVal: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: MONO_FONT,
  },
});
