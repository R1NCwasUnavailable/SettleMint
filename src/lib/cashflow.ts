import {
  ExpenseRecord,
  ItemCategory,
  MemberProfile,
  ParsedLineItem,
  SettlementTransfer,
} from '../types/ledger';

export function isMemberEligibleForCategory(
  member: MemberProfile,
  category: ItemCategory
): boolean {
  if (category === 'common' || category === 'veg') return true;
  if (category === 'alcohol') return member.drinks_alcohol;
  if (category === 'egg')
    return member.diet_tag === 'egg' || member.diet_tag === 'non_veg';
  if (category === 'non_veg') return member.diet_tag === 'non_veg';
  return true;
}

export function getEligibleMembersForItem(
  members: MemberProfile[],
  item: ParsedLineItem
): MemberProfile[] {
  const matched = members.filter(
    (m) =>
      !item.excludedMemberIds.includes(m.id) &&
      isMemberEligibleForCategory(m, item.category)
  );
  return matched.length > 0
    ? matched
    : members.filter((m) => !item.excludedMemberIds.includes(m.id));
}

export function calculateItemizedSplits(
  members: MemberProfile[],
  items: ParsedLineItem[],
  taxAndServiceCharge: number
): { memberSplits: Record<string, number>; grandTotal: number } {
  const rawSubtotals: Record<string, number> = {};
  members.forEach((m) => (rawSubtotals[m.id] = 0));

  let itemsSubtotal = 0;

  for (const item of items) {
    itemsSubtotal += item.amount;
    const pool = getEligibleMembersForItem(members, item);
    if (pool.length > 0) {
      const share = item.amount / pool.length;
      pool.forEach((m) => {
        rawSubtotals[m.id] += share;
      });
    }
  }

  const grandTotal = Number((itemsSubtotal + taxAndServiceCharge).toFixed(2));
  const memberSplits: Record<string, number> = {};
  let runningAllocated = 0;

  members.forEach((m, idx) => {
    const sub = rawSubtotals[m.id] || 0;
    const proportionalTax =
      itemsSubtotal > 0 ? (sub / itemsSubtotal) * taxAndServiceCharge : 0;

    if (idx === members.length - 1) {
      memberSplits[m.id] = Number(
        Math.max(0, grandTotal - runningAllocated).toFixed(2)
      );
    } else {
      const rounded = Number((sub + proportionalTax).toFixed(2));
      memberSplits[m.id] = rounded;
      runningAllocated += rounded;
    }
  });

  return { memberSplits, grandTotal };
}

export function computeMinimumCashFlow(
  members: MemberProfile[],
  expenses: ExpenseRecord[]
): {
  netBalances: Record<string, number>;
  transfers: SettlementTransfer[];
} {
  const netBalances: Record<string, number> = {};
  members.forEach((m) => (netBalances[m.id] = 0));

  for (const exp of expenses) {
    if (netBalances[exp.paid_by_member_id] !== undefined) {
      netBalances[exp.paid_by_member_id] += exp.total_amount;
    }
    for (const [memberId, owed] of Object.entries(exp.splits)) {
      if (netBalances[memberId] !== undefined) {
        netBalances[memberId] -= owed;
      }
    }
  }

  const debtors: { member: MemberProfile; amount: number }[] = [];
  const creditors: { member: MemberProfile; amount: number }[] = [];

  members.forEach((m) => {
    const bal = Number((netBalances[m.id] || 0).toFixed(2));
    netBalances[m.id] = bal;
    if (bal < -0.05) debtors.push({ member: m, amount: Math.abs(bal) });
    if (bal > 0.05) creditors.push({ member: m, amount: bal });
  });

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transfers: SettlementTransfer[] = [];
  let d = 0;
  let c = 0;

  while (d < debtors.length && c < creditors.length) {
    const debtor = debtors[d];
    const creditor = creditors[c];
    const settledAmount = Number(
      Math.min(debtor.amount, creditor.amount).toFixed(2)
    );

    if (settledAmount > 0) {
      const upiDeepLink = `upi://pay?pa=${encodeURIComponent(
        creditor.member.upi_id
      )}&pn=${encodeURIComponent(
        creditor.member.name
      )}&am=${settledAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(
        'SettleMint Trip Settlement'
      )}`;

      transfers.push({
        fromMember: debtor.member,
        toMember: creditor.member,
        amount: settledAmount,
        upiDeepLink,
      });
    }

    debtor.amount = Number((debtor.amount - settledAmount).toFixed(2));
    creditor.amount = Number((creditor.amount - settledAmount).toFixed(2));

    if (debtor.amount <= 0.05) d++;
    if (creditor.amount <= 0.05) c++;
  }

  return { netBalances, transfers };
}
