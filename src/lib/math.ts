// Represents an individual expense in the system
export type Expense = {
  id: string;
  description: string;
  amount: number;
  paidBy: string;
  date: string;
  splitBetween: string[]; // List of profile names who share this cost
};

// Represents a final calculated settlement
export type BalanceTransfer = {
  personOwning: string;
  personOwed: string;
  amount: number;
};

/**
 * Min Cash Flow Algorithm (Debt Simplification)
 * Takes a list of all expenses and calculates the minimum number of 
 * transactions needed to settle all debts in the group.
 */
export function calculateBalances(expenses: Expense[]): BalanceTransfer[] {
  // 1. Calculate net balances for each person
  // Positive balance = they are owed money
  // Negative balance = they owe money
  const netBalances: Record<string, number> = {};

  for (const exp of expenses) {
    if (exp.amount <= 0 || exp.splitBetween.length === 0) continue;

    // The person who paid gets a positive credit for the full amount
    netBalances[exp.paidBy] = (netBalances[exp.paidBy] || 0) + exp.amount;

    // The cost is split equally among the participants
    const splitAmount = exp.amount / exp.splitBetween.length;

    // Each participant gets a negative debit for their share
    for (const person of exp.splitBetween) {
      netBalances[person] = (netBalances[person] || 0) - splitAmount;
    }
  }

  // 2. Separate into Debtors and Creditors
  const debtors: { name: string; amount: number }[] = [];
  const creditors: { name: string; amount: number }[] = [];

  for (const [name, balance] of Object.entries(netBalances)) {
    // We round to avoid floating point precision issues (e.g., 0.000000000004)
    const roundedBalance = Math.round(balance * 100) / 100;
    
    if (roundedBalance < 0) {
      debtors.push({ name, amount: Math.abs(roundedBalance) });
    } else if (roundedBalance > 0) {
      creditors.push({ name, amount: roundedBalance });
    }
  }

  // Sort them so largest debts are settled with largest credits first
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  // 3. Greedily settle debts
  const transfers: BalanceTransfer[] = [];
  let d = 0; // Debtor index
  let c = 0; // Creditor index

  while (d < debtors.length && c < creditors.length) {
    const debtor = debtors[d];
    const creditor = creditors[c];

    const settledAmount = Math.min(debtor.amount, creditor.amount);

    if (settledAmount > 0.01) { // Ignore micro-cents
      transfers.push({
        personOwning: debtor.name,
        personOwed: creditor.name,
        amount: Math.round(settledAmount * 100) / 100
      });
    }

    debtor.amount -= settledAmount;
    creditor.amount -= settledAmount;

    // If debtor is fully settled, move to next debtor
    if (debtor.amount < 0.01) d++;
    // If creditor is fully settled, move to next creditor
    if (creditor.amount < 0.01) c++;
  }

  return transfers;
}
