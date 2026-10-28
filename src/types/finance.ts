export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  exchangeRate: number; // relative to INR
}

export type TransactionType = 'expense' | 'income' | 'transfer';

export type PaymentMethod = 'UPI' | 'Credit Card' | 'Debit Card' | 'Net Banking' | 'Cash';

export type TransactionStatus = 'cleared' | 'pending' | 'reconciled';

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  merchant: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  accountId: string;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  tags?: string[];
  notes?: string;
  receiptRef?: string;
  taxDeductible?: boolean;
}

export type AccountType = 'checking' | 'savings' | 'credit' | 'wallet' | 'cash';

export interface Account {
  id: string;
  name: string;
  institution: string;
  type: AccountType;
  balance: number;
  accountNumberMask: string;
  currency: CurrencyCode;
  creditLimit?: number;
  statementDue?: string;
  apy?: number;
}

export interface BudgetCategory {
  id: string;
  name: string;
  allocated: number;
  spent: number;
  categoryGroup: 'Essential Living' | 'Discretionary' | 'Subscriptions & Tech' | 'Savings & Investments';
  color?: string;
  period: 'monthly';
  icon?: string;
}

export interface RecurringPayment {
  id: string;
  name: string;
  amount: number;
  frequency: 'weekly' | 'monthly' | 'yearly';
  category: string;
  paymentMethod: PaymentMethod;
  nextPaymentDate: string; // YYYY-MM-DD
  status: 'active' | 'paused';
  notes?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  isAuthenticated: boolean;
  avatarUrl?: string;
  memberSince?: string;
}

export type MessageSource = 'gemini' | 'deterministic' | 'system';

export interface AdvisorChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  source?: MessageSource;
  model?: string;
  errorType?: string;
  fallbackReason?: string;
  isTransientError?: boolean;
  deterministicInsights?: {
    totalExpenses?: number;
    totalIncome?: number;
    savingsRate?: number;
    topCategory?: { name: string; amount: number; percentage: number };
    monthOverMonthChange?: number;
  };
  isConfigWarning?: boolean;
}

