import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  StyleSheet,
  Platform,
} from 'react-native';
import {
  ArrowUpRight,
  Copy,
  Share2,
  CheckCheck,
  Check,
  QrCode,
  RotateCcw,
  HandCoins,
} from 'lucide-react-native';
import { ExpenseRecord, MemberProfile, SettlementTransfer } from '../types/ledger';
import { COLORS, MONO_FONT, getAvatarColor, shared } from '../theme';
import UpiQrModal from './UpiQrModal';

interface CashFlowPanelProps {
  members: MemberProfile[];
  expenses?: ExpenseRecord[];
  netBalances: Record<string, number>;
  transfers: SettlementTransfer[];
  onCopyDigest: () => void;
  onShareWhatsApp: () => void;
  onRecordPayment?: (fromMemberId: string, toMemberId: string, amount: number) => Promise<void>;
  copiedBanner: boolean;
}

export default function CashFlowPanel({
  members,
  expenses = [],
  netBalances,
  transfers,
  onCopyDigest,
  onShareWhatsApp,
  onRecordPayment,
  copiedBanner,
}: CashFlowPanelProps) {
  const [copiedUpi, setCopiedUpi] = useState<string | null>(null);
  const [selectedTransferForQr, setSelectedTransferForQr] = useState<SettlementTransfer | null>(null);
  const [settledSuccessMsg, setSettledSuccessMsg] = useState<string | null>(null);

  function copyUpiId(upiId: string) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(upiId);
      setCopiedUpi(upiId);
      setTimeout(() => setCopiedUpi(null), 2000);
    }
  }

  async function handleMarkSettled(t: SettlementTransfer) {
    if (!onRecordPayment) return;
    await onRecordPayment(t.fromMember.id, t.toMember.id, t.amount);
    setSettledSuccessMsg(`Recorded payment: ${t.fromMember.name} paid ₹${t.amount.toFixed(0)} to ${t.toMember.name}`);
    setTimeout(() => setSettledSuccessMsg(null), 3000);
  }

  // Filter recent recorded repayments
  const repayments = expenses.filter((e) => e.title.startsWith('Payment:'));

  return (
    <View style={styles.container}>
      {/* Success Notification Banner */}
      {settledSuccessMsg && (
        <View style={styles.successBanner}>
          <Check size={14} color={COLORS.primary} strokeWidth={2.5} />
          <Text style={styles.successBannerText}>{settledSuccessMsg}</Text>
        </View>
      )}

      {/* Header Actions */}
      <View style={styles.headerRow}>
        <Text style={shared.sectionHeader}>NET POSITION MATRIX</Text>
        <View style={shared.rowCenter}>
          <TouchableOpacity style={styles.actionOutlineBtn} onPress={onCopyDigest}>
            {copiedBanner ? (
              <Check size={12} color={COLORS.primary} strokeWidth={2.5} />
            ) : (
              <Copy size={12} color={COLORS.textMuted} />
            )}
            <Text
              style={[
                styles.actionOutlineText,
                copiedBanner && { color: COLORS.primary, fontWeight: '700' },
              ]}
            >
              {copiedBanner ? 'Copied!' : 'Copy Summary'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.whatsappBtn} onPress={onShareWhatsApp}>
            <Share2 size={12} color={COLORS.bg} strokeWidth={2.5} />
            <Text style={styles.whatsappBtnText}>WhatsApp</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Member Balances Bento Grid */}
      {members.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No members in trip</Text>
          <Text style={styles.emptySub}>Add members in the Members tab to calculate net positions.</Text>
        </View>
      ) : (
        <View style={styles.bentoGrid}>
          {members.map((m, idx) => {
            const net = netBalances[m.id] || 0;
            const isZero = Math.abs(net) < 0.05;
            const isPositive = net > 0.05;
            const avatar = getAvatarColor(idx);

            return (
              <View key={m.id} style={styles.bentoCell}>
                <View style={styles.bentoTop}>
                  <View style={styles.memberInfo}>
                    <View
                      style={[
                        styles.avatarMini,
                        { backgroundColor: avatar.bg, borderColor: avatar.border },
                      ]}
                    >
                      <Text style={[styles.avatarText, { color: avatar.text }]}>
                        {m.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.bentoName} numberOfLines={1}>{m.name}</Text>
                      <Text style={styles.bentoUpi} numberOfLines={1}>{m.upi_id}</Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.statusPill,
                      isZero
                        ? styles.statusPillSettled
                        : isPositive
                        ? styles.statusPillCreditor
                        : styles.statusPillDebtor,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        isZero
                          ? styles.statusTextSettled
                          : isPositive
                          ? styles.statusTextCreditor
                          : styles.statusTextDebtor,
                      ]}
                    >
                      {isZero ? 'SETTLED' : isPositive ? 'GETS BACK' : 'OWES'}
                    </Text>
                  </View>
                </View>

                <View style={styles.bentoAmountRow}>
                  <Text
                    style={[
                      styles.bentoAmount,
                      isZero
                        ? styles.bentoAmountSettled
                        : isPositive
                        ? styles.bentoAmountCreditor
                        : styles.bentoAmountDebtor,
                    ]}
                  >
                    {isZero ? '₹0.00' : isPositive ? `+₹${net.toFixed(2)}` : `-₹${Math.abs(net).toFixed(2)}`}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Minimum Cash Flow Settlement Transfers */}
      <View style={styles.transfersSection}>
        <View style={styles.transfersHeaderRow}>
          <Text style={shared.sectionHeader}>
            OPTIMAL SETTLEMENT PATH ({transfers.length} {transfers.length === 1 ? 'TRANSFER' : 'TRANSFERS'})
          </Text>
          <Text style={styles.algorithmSub}>MIN-CASHFLOW GREEDY SOLVER</Text>
        </View>

        {transfers.length === 0 ? (
          <View style={styles.settledBanner}>
            <View style={styles.checkCircle}>
              <CheckCheck size={18} color={COLORS.primary} strokeWidth={2.5} />
            </View>
            <View>
              <Text style={styles.settledTitle}>All balances are settled!</Text>
              <Text style={styles.settledSub}>No outstanding debts remain between group members.</Text>
            </View>
          </View>
        ) : (
          <View style={styles.transfersList}>
            {transfers.map((t, idx) => {
              const fromIndex = members.findIndex((m) => m.id === t.fromMember.id);
              const toIndex = members.findIndex((m) => m.id === t.toMember.id);
              const fromAvatar = getAvatarColor(fromIndex >= 0 ? fromIndex : 0);
              const toAvatar = getAvatarColor(toIndex >= 0 ? toIndex : 1);
              const isUpiCopied = copiedUpi === t.toMember.upi_id;

              return (
                <View key={idx} style={styles.transferCard}>
                  <View style={styles.transferMain}>
                    {/* From -> To */}
                    <View style={styles.transferMembersRow}>
                      <View style={styles.participantNode}>
                        <View
                          style={[
                            styles.avatarNode,
                            { backgroundColor: fromAvatar.bg, borderColor: fromAvatar.border },
                          ]}
                        >
                          <Text style={[styles.avatarNodeText, { color: fromAvatar.text }]}>
                            {t.fromMember.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <Text style={styles.participantName}>{t.fromMember.name}</Text>
                      </View>

                      <View style={styles.arrowContainer}>
                        <Text style={styles.owesText}>owes</Text>
                        <View style={styles.arrowLine} />
                        <Text style={styles.arrowSymbol}>→</Text>
                      </View>

                      <View style={styles.participantNode}>
                        <View
                          style={[
                            styles.avatarNode,
                            { backgroundColor: toAvatar.bg, borderColor: toAvatar.border },
                          ]}
                        >
                          <Text style={[styles.avatarNodeText, { color: toAvatar.text }]}>
                            {t.toMember.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <Text style={styles.participantName}>{t.toMember.name}</Text>
                      </View>
                    </View>

                    {/* Amount & Actions */}
                    <View style={styles.transferRight}>
                      <Text style={styles.transferAmount}>
                        ₹{t.amount.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                      </Text>

                      <View style={styles.transferButtonsRow}>
                        {/* QR Code Action (Universal Desktop & Mobile) */}
                        <TouchableOpacity
                          style={styles.qrBtn}
                          onPress={() => setSelectedTransferForQr(t)}
                        >
                          <QrCode size={13} color={COLORS.text} />
                          <Text style={styles.qrBtnText}>QR</Text>
                        </TouchableOpacity>

                        {/* Mark Settled Action */}
                        {onRecordPayment && (
                          <TouchableOpacity
                            style={styles.settleActionBtn}
                            onPress={() => handleMarkSettled(t)}
                          >
                            <HandCoins size={13} color={COLORS.primary} />
                            <Text style={styles.settleActionText}>Settle</Text>
                          </TouchableOpacity>
                        )}

                        {/* Pay UPI Link */}
                        <TouchableOpacity
                          style={styles.upiPayBtn}
                          onPress={() => setSelectedTransferForQr(t)}
                        >
                          <Text style={styles.upiPayText}>Pay</Text>
                          <ArrowUpRight size={13} color={COLORS.bg} strokeWidth={2.5} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  <View style={styles.transferFooter}>
                    <Text style={styles.upiLabel}>Payee VPA: </Text>
                    <Text style={styles.upiValue}>{t.toMember.upi_id}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Recent Settled Repayments */}
      {repayments.length > 0 && (
        <View style={styles.repaymentsSection}>
          <Text style={[shared.sectionHeader, { marginTop: 24 }]}>
            RECORDED PAYMENTS & SETTLEMENTS ({repayments.length})
          </Text>
          <View style={styles.repaymentsList}>
            {repayments.map((rep) => {
              const payer = members.find((m) => m.id === rep.paid_by_member_id);
              return (
                <View key={rep.id} style={styles.repaymentCard}>
                  <View style={styles.repaymentLeft}>
                    <View style={styles.repaymentCheckCircle}>
                      <Check size={12} color={COLORS.primary} strokeWidth={2.5} />
                    </View>
                    <View>
                      <Text style={styles.repaymentTitle}>{rep.title}</Text>
                      <Text style={styles.repaymentTime}>{rep.created_at}</Text>
                    </View>
                  </View>
                  <Text style={styles.repaymentAmount}>₹{rep.total_amount.toFixed(2)}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* QR Code Payment Modal */}
      <UpiQrModal
        transfer={selectedTransferForQr}
        onClose={() => setSelectedTransferForQr(null)}
        onMarkAsSettled={handleMarkSettled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  successBannerText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionOutlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 7,
  },
  actionOutlineText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  whatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 7,
  },
  whatsappBtnText: {
    color: COLORS.bg,
    fontSize: 11,
    fontWeight: '700',
  },
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  bentoCell: {
    flex: 1,
    minWidth: 170,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 12,
    padding: 14,
  },
  bentoTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 10,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  avatarMini: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 11,
    fontWeight: '700',
  },
  bentoName: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  bentoUpi: {
    color: COLORS.textDim,
    fontSize: 10,
    fontFamily: MONO_FONT,
    marginTop: 1,
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusPillSettled: {
    backgroundColor: '#18181B',
    borderColor: '#27272A',
  },
  statusPillCreditor: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: '#10B981',
  },
  statusPillDebtor: {
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderColor: '#F43F5E',
  },
  statusText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontFamily: MONO_FONT,
  },
  statusTextSettled: { color: COLORS.textDim },
  statusTextCreditor: { color: COLORS.primary },
  statusTextDebtor: { color: COLORS.danger },
  bentoAmountRow: {
    marginTop: 2,
  },
  bentoAmount: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: MONO_FONT,
  },
  bentoAmountSettled: { color: COLORS.textDim },
  bentoAmountCreditor: { color: COLORS.primary },
  bentoAmountDebtor: { color: COLORS.danger },
  transfersSection: {
    marginTop: 6,
  },
  transfersHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  algorithmSub: {
    color: COLORS.textDim,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    fontFamily: MONO_FONT,
  },
  settledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderRadius: 12,
    padding: 16,
  },
  checkCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settledTitle: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  settledSub: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  transfersList: {
    gap: 10,
  },
  transferCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 12,
    padding: 14,
  },
  transferMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  transferMembersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 200,
  },
  participantNode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  avatarNode: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarNodeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  participantName: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  arrowContainer: {
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  owesText: {
    color: COLORS.textDim,
    fontSize: 9,
    fontFamily: MONO_FONT,
    textTransform: 'uppercase',
  },
  arrowLine: {
    height: 1,
    backgroundColor: COLORS.borderActive,
    width: 24,
    marginVertical: 2,
  },
  arrowSymbol: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  transferRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  transferAmount: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    fontFamily: MONO_FONT,
  },
  transferButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  qrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#18181C',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  qrBtnText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '600',
  },
  settleActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  settleActionText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  upiPayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  upiPayText: {
    color: COLORS.bg,
    fontSize: 12,
    fontWeight: '700',
  },
  transferFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#18181C',
  },
  upiLabel: {
    color: COLORS.textDim,
    fontSize: 10,
    fontFamily: MONO_FONT,
  },
  upiValue: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontFamily: MONO_FONT,
  },
  repaymentsSection: {
    marginTop: 8,
  },
  repaymentsList: {
    gap: 8,
  },
  repaymentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 10,
    padding: 12,
  },
  repaymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  repaymentCheckCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  repaymentTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  repaymentTime: {
    color: COLORS.textDim,
    fontSize: 10,
    marginTop: 2,
  },
  repaymentAmount: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: MONO_FONT,
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    marginBottom: 20,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  emptySub: {
    color: COLORS.textDim,
    fontSize: 12,
    marginTop: 4,
  },
});
