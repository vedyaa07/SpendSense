import { supabase, isSupabaseConfigured } from './supabase';
import {
  Account,
  BudgetCategory,
  RecurringPayment,
  Transaction,
  UserProfile,
} from '../types/finance';
import {
  INITIAL_ACCOUNTS,
  INITIAL_BUDGETS,
  INITIAL_RECURRING_PAYMENTS,
  INITIAL_TRANSACTIONS,
} from '../utils/formatters';

// Storage key specifically for isolated Guest mode
const GUEST_STORAGE_KEYS = {
  TRANSACTIONS: 'spendsense_guest_tx_v3',
  ACCOUNTS: 'spendsense_guest_acc_v3',
  BUDGETS: 'spendsense_guest_budgets_v3',
  RECURRING: 'spendsense_guest_recurring_v3',
};

// -----------------------------------------------------------------------------
// Guest Mode Isolated Storage Helpers
// -----------------------------------------------------------------------------
export function loadGuestData() {
  try {
    const tx = localStorage.getItem(GUEST_STORAGE_KEYS.TRANSACTIONS);
    const acc = localStorage.getItem(GUEST_STORAGE_KEYS.ACCOUNTS);
    const bg = localStorage.getItem(GUEST_STORAGE_KEYS.BUDGETS);
    const rec = localStorage.getItem(GUEST_STORAGE_KEYS.RECURRING);

    return {
      transactions: tx ? JSON.parse(tx) : INITIAL_TRANSACTIONS,
      accounts: acc ? JSON.parse(acc) : INITIAL_ACCOUNTS,
      budgets: bg ? JSON.parse(bg) : INITIAL_BUDGETS,
      recurring: rec ? JSON.parse(rec) : INITIAL_RECURRING_PAYMENTS,
    };
  } catch {
    return {
      transactions: INITIAL_TRANSACTIONS,
      accounts: INITIAL_ACCOUNTS,
      budgets: INITIAL_BUDGETS,
      recurring: INITIAL_RECURRING_PAYMENTS,
    };
  }
}

export function saveGuestData(data: {
  transactions?: Transaction[];
  accounts?: Account[];
  budgets?: BudgetCategory[];
  recurring?: RecurringPayment[];
}) {
  try {
    if (data.transactions) {
      localStorage.setItem(GUEST_STORAGE_KEYS.TRANSACTIONS, JSON.stringify(data.transactions));
    }
    if (data.accounts) {
      localStorage.setItem(GUEST_STORAGE_KEYS.ACCOUNTS, JSON.stringify(data.accounts));
    }
    if (data.budgets) {
      localStorage.setItem(GUEST_STORAGE_KEYS.BUDGETS, JSON.stringify(data.budgets));
    }
    if (data.recurring) {
      localStorage.setItem(GUEST_STORAGE_KEYS.RECURRING, JSON.stringify(data.recurring));
    }
  } catch (err) {
    console.warn('Failed to save guest data to localStorage', err);
  }
}

export function clearGuestData() {
  localStorage.removeItem(GUEST_STORAGE_KEYS.TRANSACTIONS);
  localStorage.removeItem(GUEST_STORAGE_KEYS.ACCOUNTS);
  localStorage.removeItem(GUEST_STORAGE_KEYS.BUDGETS);
  localStorage.removeItem(GUEST_STORAGE_KEYS.RECURRING);
}

// -----------------------------------------------------------------------------
// Mappers: Supabase Snake_Case <-> App CamelCase
// -----------------------------------------------------------------------------
function mapDbToAccount(row: any): Account {
  return {
    id: row.id,
    name: row.name,
    institution: row.institution,
    type: row.type,
    balance: Number(row.balance || 0),
    accountNumberMask: row.account_number_mask || '••••0000',
    currency: row.currency || 'INR',
    creditLimit: row.credit_limit ? Number(row.credit_limit) : undefined,
    statementDue: row.statement_due || undefined,
    apy: row.apy ? Number(row.apy) : undefined,
  };
}

function mapAccountToDb(acc: Account, userId: string) {
  return {
    id: acc.id,
    user_id: userId,
    name: acc.name,
    institution: acc.institution,
    type: acc.type,
    balance: acc.balance,
    account_number_mask: acc.accountNumberMask,
    currency: acc.currency,
    credit_limit: acc.creditLimit ?? null,
    statement_due: acc.statementDue ?? null,
    apy: acc.apy ?? null,
  };
}

function mapDbToBudget(row: any): BudgetCategory {
  return {
    id: row.id,
    name: row.name,
    allocated: Number(row.allocated || 0),
    spent: Number(row.spent || 0),
    categoryGroup: row.category_group,
    period: row.period || 'monthly',
  };
}

function mapBudgetToDb(b: BudgetCategory, userId: string) {
  return {
    id: b.id,
    user_id: userId,
    name: b.name,
    allocated: b.allocated,
    spent: b.spent,
    category_group: b.categoryGroup,
    period: b.period,
  };
}

function mapDbToRecurring(row: any): RecurringPayment {
  return {
    id: row.id,
    name: row.name,
    amount: Number(row.amount || 0),
    frequency: row.frequency,
    category: row.category,
    paymentMethod: row.payment_method,
    nextPaymentDate: row.next_payment_date,
    status: row.status,
    notes: row.notes || undefined,
  };
}

function mapRecurringToDb(r: RecurringPayment, userId: string) {
  return {
    id: r.id,
    user_id: userId,
    name: r.name,
    amount: r.amount,
    frequency: r.frequency,
    category: r.category,
    payment_method: r.paymentMethod,
    next_payment_date: r.nextPaymentDate,
    status: r.status,
    notes: r.notes ?? null,
  };
}

function mapDbToTransaction(row: any): Transaction {
  return {
    id: row.id,
    date: row.date,
    merchant: row.merchant,
    description: row.description || '',
    amount: Number(row.amount || 0),
    type: row.type,
    category: row.category,
    accountId: row.account_id || '',
    paymentMethod: row.payment_method || 'UPI',
    status: row.status || 'cleared',
    tags: Array.isArray(row.tags) ? row.tags : [],
    notes: row.notes || undefined,
    receiptRef: row.receipt_ref || undefined,
    taxDeductible: Boolean(row.tax_deductible),
  };
}

function mapTransactionToDb(t: Transaction, userId: string) {
  return {
    id: t.id,
    user_id: userId,
    date: t.date,
    merchant: t.merchant,
    description: t.description ?? '',
    amount: t.amount,
    type: t.type,
    category: t.category,
    account_id: t.accountId || null,
    payment_method: t.paymentMethod,
    status: t.status,
    tags: t.tags || [],
    notes: t.notes ?? null,
    receipt_ref: t.receiptRef ?? null,
    tax_deductible: t.taxDeductible ?? false,
  };
}

// -----------------------------------------------------------------------------
// Authenticated Supabase Database Operations
// -----------------------------------------------------------------------------

export async function fetchUserDataFromSupabase(userId: string) {
  if (!supabase) throw new Error('Supabase is not initialized');

  const [accRes, budgetRes, recRes, txRes] = await Promise.all([
    supabase.from('accounts').select('*').order('created_at', { ascending: true }),
    supabase.from('budget_categories').select('*').order('created_at', { ascending: true }),
    supabase.from('recurring_payments').select('*').order('next_payment_date', { ascending: true }),
    supabase.from('transactions').select('*').order('date', { ascending: false }),
  ]);

  // If tables do not exist yet or request failed with error
  if (accRes.error || budgetRes.error || recRes.error || txRes.error) {
    const err = accRes.error || budgetRes.error || recRes.error || txRes.error;
    console.error('Supabase fetch error:', err);
    throw err;
  }

  const accounts = (accRes.data || []).map(mapDbToAccount);
  const budgets = (budgetRes.data || []).map(mapDbToBudget);
  const recurring = (recRes.data || []).map(mapDbToRecurring);
  const transactions = (txRes.data || []).map(mapDbToTransaction);

  return { accounts, budgets, recurring, transactions };
}

// Seed clean default starter kit for a new authenticated user if their DB is empty
export async function seedNewUserStarterKit(userId: string) {
  if (!supabase) return;

  try {
    const starterAccounts = [
      {
        id: `acc-main-${userId.slice(0, 6)}`,
        user_id: userId,
        name: 'Primary Salary Account',
        institution: 'HDFC Bank',
        type: 'checking',
        balance: 75000.0,
        account_number_mask: '••4921',
        currency: 'INR',
      },
      {
        id: `acc-sav-${userId.slice(0, 6)}`,
        user_id: userId,
        name: 'Emergency Savings Fund',
        institution: 'ICICI Bank',
        type: 'savings',
        balance: 150000.0,
        account_number_mask: '••8190',
        currency: 'INR',
      },
      {
        id: `acc-card-${userId.slice(0, 6)}`,
        user_id: userId,
        name: 'Everyday Cashback Card',
        institution: 'ICICI Bank',
        type: 'credit',
        balance: -12400.0,
        account_number_mask: '••1044',
        currency: 'INR',
        credit_limit: 200000.0,
        statement_due: 'Nov 15, 2026',
      },
      {
        id: `acc-upi-${userId.slice(0, 6)}`,
        user_id: userId,
        name: 'UPI Daily Wallet',
        institution: 'PhonePe / GPay',
        type: 'wallet',
        balance: 4500.0,
        account_number_mask: '••UPI',
        currency: 'INR',
      },
    ];

    const starterBudgets = [
      {
        id: `b-rent-${userId.slice(0, 6)}`,
        user_id: userId,
        name: 'Rent & Housing',
        allocated: 35000,
        spent: 35000,
        category_group: 'Essential Living',
        period: 'monthly',
      },
      {
        id: `b-groc-${userId.slice(0, 6)}`,
        user_id: userId,
        name: 'Groceries & Provisions',
        allocated: 15000,
        spent: 8400,
        category_group: 'Essential Living',
        period: 'monthly',
      },
      {
        id: `b-dine-${userId.slice(0, 6)}`,
        user_id: userId,
        name: 'Dining & Takeout',
        allocated: 12000,
        spent: 9800,
        category_group: 'Discretionary',
        period: 'monthly',
      },
      {
        id: `b-tech-${userId.slice(0, 6)}`,
        user_id: userId,
        name: 'Digital & Subscriptions',
        allocated: 7500,
        spent: 4900,
        category_group: 'Subscriptions & Tech',
        period: 'monthly',
      },
      {
        id: `b-transit-${userId.slice(0, 6)}`,
        user_id: userId,
        name: 'Commute & Fuel',
        allocated: 6000,
        spent: 3800,
        category_group: 'Essential Living',
        period: 'monthly',
      },
      {
        id: `b-save-${userId.slice(0, 6)}`,
        user_id: userId,
        name: 'Monthly Savings Target',
        allocated: 40000,
        spent: 40000,
        category_group: 'Savings & Investments',
        period: 'monthly',
      },
    ];

    const starterRecurring = [
      {
        id: `rec-rent-${userId.slice(0, 6)}`,
        user_id: userId,
        name: 'Apartment Monthly Rent',
        amount: 35000.0,
        frequency: 'monthly',
        category: 'Rent & Housing',
        payment_method: 'Net Banking',
        next_payment_date: '2026-11-01',
        status: 'active',
      },
      {
        id: `rec-net-${userId.slice(0, 6)}`,
        user_id: userId,
        name: 'Broadband Fiber Uplink',
        amount: 1299.0,
        frequency: 'monthly',
        category: 'Digital & Subscriptions',
        payment_method: 'UPI',
        next_payment_date: '2026-11-05',
        status: 'active',
      },
      {
        id: `rec-str-${userId.slice(0, 6)}`,
        user_id: userId,
        name: 'Netflix Streaming',
        amount: 649.0,
        frequency: 'monthly',
        category: 'Digital & Subscriptions',
        payment_method: 'Credit Card',
        next_payment_date: '2026-11-12',
        status: 'active',
      },
    ];

    const starterTransactions = [
      {
        id: `tx-1-${userId.slice(0, 6)}`,
        user_id: userId,
        date: new Date().toISOString().split('T')[0],
        merchant: 'Swiggy Gourmet',
        description: 'Dinner delivery with friends',
        amount: -980.0,
        type: 'expense',
        category: 'Dining & Takeout',
        account_id: starterAccounts[3].id,
        payment_method: 'UPI',
        status: 'cleared',
        tags: ['Dinner'],
      },
      {
        id: `tx-2-${userId.slice(0, 6)}`,
        user_id: userId,
        date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
        merchant: 'Apartment Rental Corp',
        description: 'Prime Apartment Monthly Rent',
        amount: -35000.0,
        type: 'expense',
        category: 'Rent & Housing',
        account_id: starterAccounts[0].id,
        payment_method: 'Net Banking',
        status: 'reconciled',
        tags: ['Fixed', 'Housing'],
      },
      {
        id: `tx-3-${userId.slice(0, 6)}`,
        user_id: userId,
        date: new Date(Date.now() - 86400000 * 5).toISOString().split('T')[0],
        merchant: 'Client Advisory Retainer',
        description: 'Product Advisory Q4 Deposit',
        amount: 85000.0,
        type: 'income',
        category: 'Salary & Income',
        account_id: starterAccounts[0].id,
        payment_method: 'Net Banking',
        status: 'cleared',
        tags: ['Salary'],
      },
    ];

    await Promise.all([
      supabase.from('accounts').insert(starterAccounts),
      supabase.from('budget_categories').insert(starterBudgets),
      supabase.from('recurring_payments').insert(starterRecurring),
      supabase.from('transactions').insert(starterTransactions),
    ]);
  } catch (err) {
    console.warn('Could not seed starter kit in Supabase:', err);
  }
}

// Transaction mutations in Supabase
export async function saveTransactionToSupabase(tx: Transaction, userId: string) {
  if (!supabase) return;
  const dbRecord = mapTransactionToDb(tx, userId);
  const { error } = await supabase.from('transactions').upsert(dbRecord);
  if (error) throw error;
}

export async function deleteTransactionFromSupabase(id: string) {
  if (!supabase) return;
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw error;
}

export async function deleteMultipleTransactionsFromSupabase(ids: string[]) {
  if (!supabase) return;
  const { error } = await supabase.from('transactions').delete().in('id', ids);
  if (error) throw error;
}

// Budget mutations in Supabase
export async function saveBudgetToSupabase(b: BudgetCategory, userId: string) {
  if (!supabase) return;
  const dbRecord = mapBudgetToDb(b, userId);
  const { error } = await supabase.from('budget_categories').upsert(dbRecord);
  if (error) throw error;
}

// Recurring mutations in Supabase
export async function saveRecurringToSupabase(r: RecurringPayment, userId: string) {
  if (!supabase) return;
  const dbRecord = mapRecurringToDb(r, userId);
  const { error } = await supabase.from('recurring_payments').upsert(dbRecord);
  if (error) throw error;
}

export async function deleteRecurringFromSupabase(id: string) {
  if (!supabase) return;
  const { error } = await supabase.from('recurring_payments').delete().eq('id', id);
  if (error) throw error;
}

// Account mutations in Supabase
export async function saveAccountToSupabase(a: Account, userId: string) {
  if (!supabase) return;
  const dbRecord = mapAccountToDb(a, userId);
  const { error } = await supabase.from('accounts').upsert(dbRecord);
  if (error) throw error;
}
