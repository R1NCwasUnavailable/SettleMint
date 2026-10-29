import { Share, Platform, Linking } from 'react-native';
import { ExpenseRecord, MemberProfile, SettlementTransfer } from '../types/ledger';

export function buildTripSummaryMessage(params: {
  tripName: string;
  members: MemberProfile[];
  expenses: ExpenseRecord[];
  netBalances: Record<string, number>;
  transfers: SettlementTransfer[];
}): string {
  const { tripName, members, expenses, netBalances, transfers } = params;
  const totalSpend = expenses.reduce((sum, e) => sum + e.total_amount, 0);

  const lines: string[] = [
    `*🟢 SETTLEMINT TRIP LEDGER*`,
    `*Trip:* ${tripName}`,
    `*Total Spend:* ₹${totalSpend.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (${expenses.length} bills)`,
    `────────────────────`,
    `*📊 NET POSITIONS*`,
  ];

  members.forEach((m) => {
    const net = netBalances[m.id] || 0;
    const sign = net >= 0 ? '+' : '-';
    const tag = Math.abs(net) < 0.05 ? 'Settled' : net > 0 ? 'Owed' : 'Owes';
    lines.push(`• *${m.name}:* ${sign}₹${Math.abs(net).toFixed(0)} _(${tag})_`);
  });

  lines.push(``);
  lines.push(`*⚡ MINIMUM CASH FLOW (${transfers.length} TRANSFERS)*`);

  if (transfers.length === 0) {
    lines.push(`All balances are 100% settled! 🎉`);
  } else {
    transfers.forEach((t, idx) => {
      lines.push(
        `${idx + 1}. *${t.fromMember.name} ➔ ${t.toMember.name}*: *₹${t.amount.toFixed(0)}*`,
        `   UPI: \`${t.toMember.upi_id}\``,
        `   ${t.upiDeepLink}`
      );
    });
  }

  if (expenses.length > 0) {
    lines.push(``);
    lines.push(`*🧾 RECENT BILLS*`);
    expenses.slice(0, 5).forEach((e) => {
      const payer = members.find((m) => m.id === e.paid_by_member_id);
      lines.push(`• ${e.title}: ₹${e.total_amount.toFixed(0)} _(Paid by ${payer?.name || 'Member'})_`);
    });
  }

  return lines.join('\n');
}

export async function shareToWhatsApp(message: string): Promise<void> {
  const encoded = encodeURIComponent(message);
  const whatsappUrl =
    Platform.OS === 'web'
      ? `https://wa.me/?text=${encoded}`
      : `whatsapp://send?text=${encoded}`;

  try {
    const supported = await Linking.canOpenURL(whatsappUrl);
    if (supported || Platform.OS === 'web') {
      await Linking.openURL(whatsappUrl);
      return;
    }
  } catch {
    // Fallback to native system share sheet
  }

  await Share.share({
    message,
    title: 'SettleMint Trip Summary',
  });
}

export async function copySummaryToClipboard(message: string): Promise<boolean> {
  try {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(message);
      return true;
    }
    await Share.share({ message });
    return true;
  } catch {
    return false;
  }
}
