import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Image,
  StyleSheet,
  Platform,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { X, Copy, Check, ArrowUpRight, QrCode } from 'lucide-react-native';
import QRCode from 'qrcode';
import { SettlementTransfer } from '../types/ledger';
import { COLORS, MONO_FONT } from '../theme';

interface UpiQrModalProps {
  transfer: SettlementTransfer | null;
  onClose: () => void;
  onMarkAsSettled?: (transfer: SettlementTransfer) => void;
}

export default function UpiQrModal({
  transfer,
  onClose,
  onMarkAsSettled,
}: UpiQrModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (transfer) {
      setLoading(true);
      QRCode.toDataURL(transfer.upiDeepLink, {
        width: 260,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })
        .then((url) => {
          setQrDataUrl(url);
          setLoading(false);
        })
        .catch((err) => {
          console.error('Failed to generate UPI QR code:', err);
          setLoading(false);
        });
    } else {
      setQrDataUrl(null);
    }
  }, [transfer]);

  if (!transfer) return null;

  function copyUpiId() {
    if (!transfer) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(transfer.toMember.upi_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleOpenApp() {
    if (!transfer) return;
    Linking.openURL(transfer.upiDeepLink).catch(() => {
      alert('Could not open UPI app. Please scan the QR code with your phone.');
    });
  }

  return (
    <Modal visible={!!transfer} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <QrCode size={18} color={COLORS.primary} />
              <Text style={styles.headerTitle}>UPI Payment QR</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Transfer Summary */}
          <View style={styles.summaryBox}>
            <Text style={styles.transferText}>
              <Text style={{ color: COLORS.text, fontWeight: '700' }}>{transfer.fromMember.name}</Text>
              {' owes '}
              <Text style={{ color: COLORS.primary, fontWeight: '700' }}>{transfer.toMember.name}</Text>
            </Text>
            <Text style={styles.amountText}>₹{transfer.amount.toFixed(2)}</Text>
          </View>

          {/* QR Code Container */}
          <View style={styles.qrContainer}>
            {loading ? (
              <ActivityIndicator size="large" color={COLORS.primary} />
            ) : qrDataUrl ? (
              <Image source={{ uri: qrDataUrl }} style={styles.qrImage} />
            ) : (
              <Text style={styles.errorText}>Could not render QR code.</Text>
            )}
            <Text style={styles.scanHint}>Scan with any UPI App (GPay, PhonePe, Paytm, BHIM)</Text>
          </View>

          {/* Payee VPA Details */}
          <View style={styles.vpaRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.vpaLabel}>PAYEE UPI ID</Text>
              <Text style={styles.vpaText}>{transfer.toMember.upi_id}</Text>
            </View>
            <TouchableOpacity style={styles.copyBtn} onPress={copyUpiId}>
              {copied ? (
                <Check size={13} color={COLORS.primary} />
              ) : (
                <Copy size={13} color={COLORS.textDim} />
              )}
              <Text style={[styles.copyBtnText, copied && { color: COLORS.primary }]}>
                {copied ? 'Copied' : 'Copy'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            {Platform.OS !== 'web' ? (
              <TouchableOpacity style={styles.openAppBtn} onPress={handleOpenApp}>
                <Text style={styles.openAppText}>Open UPI App</Text>
                <ArrowUpRight size={14} color={COLORS.bg} strokeWidth={2.5} />
              </TouchableOpacity>
            ) : null}

            {onMarkAsSettled && (
              <TouchableOpacity
                style={styles.settledBtn}
                onPress={() => {
                  onMarkAsSettled(transfer);
                  onClose();
                }}
              >
                <Check size={14} color={COLORS.primary} strokeWidth={2.5} />
                <Text style={styles.settledBtnText}>Mark as Settled</Text>
              </TouchableOpacity>
            )}
          </View>
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
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: '#18181C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryBox: {
    alignItems: 'center',
    backgroundColor: '#09090B',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 10,
    padding: 12,
    width: '100%',
    marginBottom: 16,
  },
  transferText: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginBottom: 4,
  },
  amountText: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '800',
    fontFamily: MONO_FONT,
  },
  qrContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  qrImage: {
    width: 220,
    height: 220,
    borderRadius: 6,
  },
  scanHint: {
    color: '#52525B',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 10,
    textAlign: 'center',
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    padding: 20,
  },
  vpaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#09090B',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: '100%',
    marginBottom: 16,
  },
  vpaLabel: {
    color: COLORS.textDim,
    fontSize: 9,
    fontWeight: '700',
    fontFamily: MONO_FONT,
    letterSpacing: 0.8,
  },
  vpaText: {
    color: COLORS.text,
    fontSize: 13,
    fontFamily: MONO_FONT,
    fontWeight: '600',
    marginTop: 2,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#18181C',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  copyBtnText: {
    color: COLORS.textDim,
    fontSize: 11,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  openAppBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    height: 42,
    borderRadius: 8,
  },
  openAppText: {
    color: COLORS.bg,
    fontSize: 13,
    fontWeight: '700',
  },
  settledBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: COLORS.primary,
    height: 42,
    borderRadius: 8,
  },
  settledBtnText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
});

