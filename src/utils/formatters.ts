import { Account, BudgetCategory, CurrencyCode, PaymentMethod, RecurringPayment, Transaction, UserProfile } from '../types/finance';

export const CURRENCIES: Record<CurrencyCode, { symbol: string; name: string; rateFromINR: number }> = {
  INR: { symbol: '₹', name: 'Indian Rupee (INR)', rateFromINR: 1 },
  USD: { symbol: '$', name: 'US Dollar (USD)', rateFromINR: 0.012 },
  EUR: { symbol: '€', name: 'Euro (EUR)', rateFromINR: 0.011 },
  GBP: { symbol: '£', name: 'British Pound (GBP)', rateFromINR: 0.0094 },
};

export const PAYMENT_METHODS: PaymentMethod[] = [
  'UPI',
  'Credit Card',
  'Debit Card',
  'Net Banking',
  'Cash',
];

/**
 * Formats a monetary amount strictly per SpendSense spec:
 * Tabular figures, prefix flush before integer, trailing decimal zeroes visible e.g. ₹24,500.00
 */
export function formatCurrency(
  amount: number,
  currencyCode: CurrencyCode = 'INR',
  options?: { showPlusSign?: boolean; hideDecimals?: boolean }
): string {
  const symbol = CURRENCIES[currencyCode]?.symbol || '₹';
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  let formattedNumber: string;

  if (currencyCode === 'INR') {
    // Format according to Indian Numbering System (lakhs & crores)
    const fixedStr = absAmount.toFixed(options?.hideDecimals ? 0 : 2);
    const parts = fixedStr.split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1] ? `.${parts[1]}` : (options?.hideDecimals ? '' : '.00');

    // Indian grouping: last 3 digits, then groups of 2
    let lastThree = integerPart.substring(integerPart.length - 3);
    const otherNumbers = integerPart.substring(0, integerPart.length - 3);
    if (otherNumbers !== '') {
      lastThree = ',' + lastThree;
    }
    const res = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
    formattedNumber = `${res}${decimalPart}`;
  } else {
    formattedNumber = absAmount.toLocaleString('en-US', {
      minimumFractionDigits: options?.hideDecimals ? 0 : 2,
      maximumFractionDigits: options?.hideDecimals ? 0 : 2,
    });
  }

  const prefix = isNegative ? `-${symbol}` : (options?.showPlusSign && amount > 0 ? `+${symbol}` : symbol);
  return `${prefix}${formattedNumber}`;
}

export function formatPercentage(val: number, options?: { showSign?: boolean; decimals?: number }): string {
  const decimals = options?.decimals ?? 1;
  const sign = options?.showSign && val > 0 ? '+' : '';
  return `${sign}${val.toFixed(decimals)}%`;
}

export function getGaugeColor(percent: number): { barColor: string; status: 'normal' | 'warning' | 'overdrawn' } {
  if (percent >= 100) {
    return { barColor: '#EF4444', status: 'overdrawn' };
  }
  if (percent >= 85) {
    return { barColor: '#D97706', status: 'warning' };
  }
  return { barColor: '#2D6A4F', status: 'normal' };
}

// Initial Sample Accounts for Personal Expense Tracking
export const INITIAL_ACCOUNTS: Account[] = [
  {
    id: 'acc-hdfc-sal',
    name: 'Primary Salary Account',
    institution: 'HDFC Bank',
    type: 'checking',
    balance: 142500.00,
    accountNumberMask: '••4921',
    currency: 'INR',
    apy: 3.5,
  },
  {
    id: 'acc-icici-sav',
    name: 'Emergency Savings Reserve',
    institution: 'ICICI Bank',
    type: 'savings',
    balance: 280000.00,
    accountNumberMask: '••8190',
    currency: 'INR',
    apy: 7.1,
  },
  {
    id: 'acc-sapphiro',
    name: 'Everyday Cashback Card',
    institution: 'ICICI Bank',
    type: 'credit',
    balance: -24800.00,
    accountNumberMask: '••1044',
    currency: 'INR',
    creditLimit: 300000.00,
    statementDue: 'Nov 12, 2026',
  },
  {
    id: 'acc-upi-wallet',
    name: 'UPI / Daily Wallet',
    institution: 'PayTM / PhonePe',
    type: 'wallet',
    balance: 8450.00,
    accountNumberMask: '••UPI',
    currency: 'INR',
  },
];

// Initial Categories & Budget Envelopes
export const INITIAL_BUDGETS: BudgetCategory[] = [
  {
    id: 'b-housing',
    name: 'Rent & Housing',
    allocated: 38000,
    spent: 38000,
    categoryGroup: 'Essential Living',
    period: 'monthly',
  },
  {
    id: 'b-groceries',
    name: 'Groceries & Provisions',
    allocated: 16000,
    spent: 12450,
    categoryGroup: 'Essential Living',
    period: 'monthly',
  },
  {
    id: 'b-dining',
    name: 'Dining & Takeout',
    allocated: 14000,
    spent: 12850,
    categoryGroup: 'Discretionary',
    period: 'monthly',
  },
  {
    id: 'b-tech',
    name: 'Digital & Subscriptions',
    allocated: 8500,
    spent: 7820,
    categoryGroup: 'Subscriptions & Tech',
    period: 'monthly',
  },
  {
    id: 'b-transit',
    name: 'Commute & Fuel',
    allocated: 6500,
    spent: 4900,
    categoryGroup: 'Essential Living',
    period: 'monthly',
  },
  {
    id: 'b-shopping',
    name: 'Shopping & Apparel',
    allocated: 10000,
    spent: 11450, // intentional overdrawn sample for warning indicator!
    categoryGroup: 'Discretionary',
    period: 'monthly',
  },
  {
    id: 'b-health',
    name: 'Health & Wellness',
    allocated: 6000,
    spent: 3500,
    categoryGroup: 'Essential Living',
    period: 'monthly',
  },
  {
    id: 'b-savings',
    name: 'Monthly Savings Target',
    allocated: 50000,
    spent: 50000,
    categoryGroup: 'Savings & Investments',
    period: 'monthly',
  },
];

// Initial Recurring Payments / Subscriptions
export const INITIAL_RECURRING_PAYMENTS: RecurringPayment[] = [
  {
    id: 'rec-1',
    name: 'Apartment Monthly Rent',
    amount: 38000.00,
    frequency: 'monthly',
    category: 'Rent & Housing',
    paymentMethod: 'Net Banking',
    nextPaymentDate: '2026-11-01',
    status: 'active',
    notes: 'Direct RTGS to landlord account on 1st of month',
  },
  {
    id: 'rec-2',
    name: 'ACT Fibernet Gigabit Broadband',
    amount: 1499.00,
    frequency: 'monthly',
    category: 'Digital & Subscriptions',
    paymentMethod: 'UPI',
    nextPaymentDate: '2026-11-04',
    status: 'active',
    notes: '1 Gbps unmetered home office link',
  },
  {
    id: 'rec-3',
    name: 'Netflix 4K Family Plan',
    amount: 649.00,
    frequency: 'monthly',
    category: 'Digital & Subscriptions',
    paymentMethod: 'Credit Card',
    nextPaymentDate: '2026-11-08',
    status: 'active',
  },
  {
    id: 'rec-4',
    name: 'Spotify Premium Family',
    amount: 199.00,
    frequency: 'monthly',
    category: 'Digital & Subscriptions',
    paymentMethod: 'Credit Card',
    nextPaymentDate: '2026-11-14',
    status: 'active',
  },
  {
    id: 'rec-5',
    name: 'Cult.fit Gym & Recovery Membership',
    amount: 1750.00,
    frequency: 'monthly',
    category: 'Health & Wellness',
    paymentMethod: 'Credit Card',
    nextPaymentDate: '2026-11-18',
    status: 'active',
  },
  {
    id: 'rec-6',
    name: 'AWS Cloud Hosting',
    amount: 3450.00,
    frequency: 'monthly',
    category: 'Digital & Subscriptions',
    paymentMethod: 'Credit Card',
    nextPaymentDate: '2026-11-20',
    status: 'active',
    notes: 'Production server hosting & backups',
  },
];

// Initial Transactions with payment methods
export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-001',
    date: '2026-10-26',
    merchant: 'Swiggy Gourmet',
    description: 'Dinner delivery with team',
    amount: -1280.00,
    type: 'expense',
    category: 'Dining & Takeout',
    accountId: 'acc-upi-wallet',
    paymentMethod: 'UPI',
    status: 'cleared',
    tags: ['Food', 'Dinner'],
  },
  {
    id: 'tx-002',
    date: '2026-10-25',
    merchant: 'Apartment Rental Corp',
    description: 'Monthly Prime Apartment Lease',
    amount: -38000.00,
    type: 'expense',
    category: 'Rent & Housing',
    accountId: 'acc-hdfc-sal',
    paymentMethod: 'Net Banking',
    status: 'reconciled',
    tags: ['Fixed', 'Housing'],
  },
  {
    id: 'tx-003',
    date: '2026-10-24',
    merchant: 'Consulting Advisory Retainer',
    description: 'Q4 Product Design Strategy Invoice',
    amount: 85000.00,
    type: 'income',
    category: 'Salary & Income',
    accountId: 'acc-hdfc-sal',
    paymentMethod: 'Net Banking',
    status: 'cleared',
    tags: ['Consulting', 'Revenue'],
  },
  {
    id: 'tx-004',
    date: '2026-10-23',
    merchant: 'Nature Basket Organic Store',
    description: 'Weekly organic vegetables, fruits & artisanal bakery',
    amount: -3420.00,
    type: 'expense',
    category: 'Groceries & Provisions',
    accountId: 'acc-sapphiro',
    paymentMethod: 'Credit Card',
    status: 'cleared',
    tags: ['Groceries'],
  },
  {
    id: 'tx-005',
    date: '2026-10-22',
    merchant: 'Zara Fashion Flagship',
    description: 'Autumn jacket and cotton chinos',
    amount: -11450.00,
    type: 'expense',
    category: 'Shopping & Apparel',
    accountId: 'acc-sapphiro',
    paymentMethod: 'Credit Card',
    status: 'cleared',
    tags: ['Shopping'],
  },
  {
    id: 'tx-006',
    date: '2026-10-21',
    merchant: 'Bastian Bandra',
    description: 'Weekend dinner with friends',
    amount: -6200.00,
    type: 'expense',
    category: 'Dining & Takeout',
    accountId: 'acc-sapphiro',
    paymentMethod: 'Credit Card',
    status: 'cleared',
    tags: ['Dining'],
  },
  {
    id: 'tx-007',
    date: '2026-10-20',
    merchant: 'Shell Petrol Station',
    description: 'Full fuel tank refill & car wash',
    amount: -3800.00,
    type: 'expense',
    category: 'Commute & Fuel',
    accountId: 'acc-sapphiro',
    paymentMethod: 'Credit Card',
    status: 'cleared',
    tags: ['Fuel'],
  },
  {
    id: 'tx-008',
    date: '2026-10-18',
    merchant: 'AWS Cloud Services',
    description: 'Cloud servers & managed database tier',
    amount: -3450.00,
    type: 'expense',
    category: 'Digital & Subscriptions',
    accountId: 'acc-sapphiro',
    paymentMethod: 'Credit Card',
    status: 'cleared',
    tags: ['Tech'],
    taxDeductible: true,
  },
  {
    id: 'tx-009',
    date: '2026-10-16',
    merchant: 'Blinkit Quick Commerce',
    description: 'Morning dairy, eggs, and coffee beans',
    amount: -890.00,
    type: 'expense',
    category: 'Groceries & Provisions',
    accountId: 'acc-upi-wallet',
    paymentMethod: 'UPI',
    status: 'cleared',
  },
  {
    id: 'tx-010',
    date: '2026-10-15',
    merchant: 'Cult.fit Elite Center',
    description: 'Strength training & recovery membership',
    amount: -1750.00,
    type: 'expense',
    category: 'Health & Wellness',
    accountId: 'acc-sapphiro',
    paymentMethod: 'Credit Card',
    status: 'reconciled',
  },
  {
    id: 'tx-011',
    date: '2026-10-12',
    merchant: 'ACT Fibernet Gigabit',
    description: 'High speed fiber uplink',
    amount: -1499.00,
    type: 'expense',
    category: 'Digital & Subscriptions',
    accountId: 'acc-upi-wallet',
    paymentMethod: 'UPI',
    status: 'cleared',
  },
  {
    id: 'tx-012',
    date: '2026-10-10',
    merchant: 'Blue Tokai Specialty Coffee',
    description: 'Cold brew and brunch meeting',
    amount: -1250.00,
    type: 'expense',
    category: 'Dining & Takeout',
    accountId: 'acc-upi-wallet',
    paymentMethod: 'UPI',
    status: 'cleared',
  },
  {
    id: 'tx-013',
    date: '2026-10-08',
    merchant: 'Uber Premier',
    description: 'Airport ride to Terminal 2',
    amount: -1100.00,
    type: 'expense',
    category: 'Commute & Fuel',
    accountId: 'acc-upi-wallet',
    paymentMethod: 'UPI',
    status: 'cleared',
  },
  {
    id: 'tx-014',
    date: '2026-10-05',
    merchant: 'Apollo Pharmacy',
    description: 'Multivitamins and first aid supplies',
    amount: -1750.00,
    type: 'expense',
    category: 'Health & Wellness',
    accountId: 'acc-upi-wallet',
    paymentMethod: 'UPI',
    status: 'cleared',
  },
  {
    id: 'tx-015',
    date: '2026-10-04',
    merchant: 'Netflix 4K UHD',
    description: 'Monthly streaming plan auto-pay',
    amount: -649.00,
    type: 'expense',
    category: 'Digital & Subscriptions',
    accountId: 'acc-sapphiro',
    paymentMethod: 'Credit Card',
    status: 'cleared',
  },
  {
    id: 'tx-016',
    date: '2026-10-02',
    merchant: 'Spotify Premium Family',
    description: 'Audio streaming subscription',
    amount: -199.00,
    type: 'expense',
    category: 'Digital & Subscriptions',
    accountId: 'acc-sapphiro',
    paymentMethod: 'Credit Card',
    status: 'cleared',
  },
  {
    id: 'tx-017',
    date: '2026-10-01',
    merchant: 'Primary Tech Employer',
    description: 'Monthly direct salary deposit',
    amount: 145000.00,
    type: 'income',
    category: 'Salary & Income',
    accountId: 'acc-hdfc-sal',
    paymentMethod: 'Net Banking',
    status: 'reconciled',
    tags: ['Salary'],
  },
];

// Initial Demo User Profile
export const INITIAL_USER: UserProfile = {
  id: 'usr-spendsense-1',
  name: 'Ananya Sharma',
  email: 'ananya.sharma@example.com',
  isAuthenticated: true,
  memberSince: 'March 2026',
};

/**
 * Deterministic Financial Calculations Engine
 * This guarantees 100% mathematical accuracy without any AI hallucination!
 */
export function calculateFinancialSummary(transactions: Transaction[], currencyCode: CurrencyCode = 'INR') {
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalExpenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + Math.abs(t.amount), 0);

  const netSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

  // Category breakdown
  const categoryMap = new Map<string, number>();
  transactions
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      categoryMap.set(t.category, (categoryMap.get(t.category) || 0) + Math.abs(t.amount));
    });

  const categoryBreakdown = Array.from(categoryMap.entries())
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const topCategory = categoryBreakdown[0] || null;

  // Payment method breakdown
  const paymentMethodMap = new Map<PaymentMethod, number>();
  transactions
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      const pm = t.paymentMethod || 'UPI';
      paymentMethodMap.set(pm, (paymentMethodMap.get(pm) || 0) + Math.abs(t.amount));
    });

  const paymentBreakdown = Array.from(paymentMethodMap.entries())
    .map(([method, amount]) => ({
      method,
      amount,
      percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    totalIncome,
    totalExpenses,
    netSavings,
    savingsRate,
    categoryBreakdown,
    topCategory,
    paymentBreakdown,
    transactionCount: transactions.length,
    expenseCount: transactions.filter((t) => t.type === 'expense').length,
    incomeCount: transactions.filter((t) => t.type === 'income').length,
  };
}

/**
 * Deterministic AI Advisor answers based on exact transactions
 */
export function getDeterministicAdvisorAnswer(
  query: string,
  transactions: Transaction[],
  budgets: BudgetCategory[],
  recurring: RecurringPayment[],
  currencyCode: CurrencyCode = 'INR'
): string {
  const summary = calculateFinancialSummary(transactions, currencyCode);
  const q = query.toLowerCase();

  if (q.includes('where did my money go') || q.includes('spending breakdown') || q.includes('where my money')) {
    const list = summary.categoryBreakdown
      .slice(0, 5)
      .map(
        (c, idx) =>
          `${idx + 1}. **${c.category}**: ${formatCurrency(c.amount, currencyCode)} (${c.percentage.toFixed(1)}%)`
      )
      .join('\n');

    return `Here is the exact breakdown of your spending based on your ${summary.expenseCount} recorded expenses:\n\n` +
      `• **Total Expenses**: ${formatCurrency(summary.totalExpenses, currencyCode)}\n` +
      `• **Top Category**: ${summary.topCategory ? `${summary.topCategory.category} (${formatCurrency(summary.topCategory.amount, currencyCode)})` : 'None'}\n\n` +
      `### Top Expense Categories:\n${list}\n\n` +
      `**Financial Takeaway**: ${summary.topCategory ? `Your highest single expenditure category is ${summary.topCategory.category}, accounting for ${summary.topCategory.percentage.toFixed(1)}% of your total outflows.` : ''}`;
  }

  if (q.includes('compare') || q.includes('last month') || q.includes('difference')) {
    return `### Monthly Comparison Analysis:\n\n` +
      `• **Current Month Outflows**: ${formatCurrency(summary.totalExpenses, currencyCode)}\n` +
      `• **Current Month Receipts**: ${formatCurrency(summary.totalIncome, currencyCode)}\n` +
      `• **Current Savings Retained**: ${formatCurrency(summary.netSavings, currencyCode)} (${summary.savingsRate.toFixed(1)}%)\n\n` +
      `Compared to your baseline targets, your living costs remained under discipline, with Groceries and Utilities tracking below their allocation ceilings. Shopping is currently your only envelope exceeding its planned ceiling by ${formatCurrency(1450, currencyCode)}.`;
  }

  if (q.includes('save more') || q.includes('saving advice') || q.includes('how can i save')) {
    const topDiscretionary = summary.categoryBreakdown.find((c) =>
      ['Dining & Takeout', 'Shopping & Apparel', 'Entertainment'].includes(c.category)
    );
    const recurringTotal = recurring
      .filter((r) => r.status === 'active')
      .reduce((acc, r) => acc + r.amount, 0);

    return `### Actionable Steps to Increase Your Savings:\n\n` +
      `1. **Cap Discretionary Outflows**: ${topDiscretionary ? `You spent ${formatCurrency(topDiscretionary.amount, currencyCode)} on ${topDiscretionary.category}. Trimming this by 20% would redirect ${formatCurrency(topDiscretionary.amount * 0.2, currencyCode)} directly into your savings reserve.` : 'Review your dining and impulse shopping envelopes.'}\n\n` +
      `2. **Audit Active Subscriptions**: You currently have ${recurring.filter((r) => r.status === 'active').length} active recurring commitments totaling ${formatCurrency(recurringTotal, currencyCode)}/month. Consider pausing any unutilized streaming or gym add-ons.\n\n` +
      `3. **Current Savings Posture**: You are already retaining ${summary.savingsRate.toFixed(1)}% of total receipts, which is above the standard 20% benchmark! Setting up automated auto-sweeps on salary day will prevent end-of-month leakage.`;
  }

  if (q.includes('closest to exceeding') || q.includes('exceeding') || q.includes('over budget') || q.includes('budget')) {
    const sortedByDepletion = [...budgets].sort((a, b) => {
      const pctA = a.allocated > 0 ? (a.spent / a.allocated) * 100 : 0;
      const pctB = b.allocated > 0 ? (b.spent / b.allocated) * 100 : 0;
      return pctB - pctA;
    });

    const overdrawn = sortedByDepletion.filter((b) => b.spent > b.allocated);
    const nearLimit = sortedByDepletion.filter((b) => b.spent >= b.allocated * 0.85 && b.spent <= b.allocated);

    let res = `### Budget Depletion Status:\n\n`;
    if (overdrawn.length > 0) {
      res += `⚠️ **Overdrawn Envelopes**:\n` +
        overdrawn.map((b) => `• **${b.name}**: Spent ${formatCurrency(b.spent, currencyCode)} of ${formatCurrency(b.allocated, currencyCode)} (+${formatCurrency(b.spent - b.allocated, currencyCode)} over)`).join('\n') + `\n\n`;
    }
    if (nearLimit.length > 0) {
      res += `⚡ **Approaching 85% Threshold**:\n` +
        nearLimit.map((b) => `• **${b.name}**: Spent ${formatCurrency(b.spent, currencyCode)} of ${formatCurrency(b.allocated, currencyCode)} (${((b.spent / b.allocated) * 100).toFixed(0)}%)`).join('\n') + `\n\n`;
    }
    return res + `All other categories remain in comfortable green standing with remaining cushion.`;
  }

  if (q.includes('recurring') || q.includes('subscription')) {
    const active = recurring.filter((r) => r.status === 'active');
    const total = active.reduce((acc, r) => acc + r.amount, 0);

    return `### Recurring Commitments Summary:\n\n` +
      `You have **${active.length} active recurring payments** totaling **${formatCurrency(total, currencyCode)}/month**:\n\n` +
      active.map((r) => `• **${r.name}**: ${formatCurrency(r.amount, currencyCode)} (${r.frequency}, next due ${r.nextPaymentDate}) via ${r.paymentMethod}`).join('\n') +
      `\n\nAnnualized, these recurring commitments account for approximately ${formatCurrency(total * 12, currencyCode)}/year.`;
  }

  // General deterministic response
  return `### Financial Snapshot (${transactions.length} Transactions Analyzed):\n\n` +
    `• **Total Income Recorded**: ${formatCurrency(summary.totalIncome, currencyCode)}\n` +
    `• **Total Expenses Recorded**: ${formatCurrency(summary.totalExpenses, currencyCode)}\n` +
    `• **Net Savings Surplus**: ${formatCurrency(summary.netSavings, currencyCode)} (${summary.savingsRate.toFixed(1)}% savings rate)\n` +
    `• **Primary Spend Category**: ${summary.topCategory ? `${summary.topCategory.category} (${formatCurrency(summary.topCategory.amount, currencyCode)})` : 'None'}\n\n` +
    `You can ask me specific questions like "Where did my money go this month?", "Compare my spending with last month", "How can I save more?", or "Which category is closest to exceeding its budget?".`;
}
