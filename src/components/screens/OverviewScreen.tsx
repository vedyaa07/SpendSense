import React from 'react';
import { Account, BudgetCategory, CurrencyCode, RecurringPayment, Transaction } from '../../types/finance';
import { formatCurrency, formatPercentage } from '../../utils/formatters';
import { BudgetDepletionGauge } from '../BudgetDepletionGauge';
import { MetricDifferentialRibbon } from '../MetricDifferentialRibbon';
import { SemanticBadge } from '../SemanticBadge';
import {
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  PiggyBank,
  TrendingDown,
  Sparkles,
  ChevronRight,
  CreditCard,
  AlertTriangle,
  Calendar,
  CheckCircle2,
} from 'lucide-react';

interface OverviewScreenProps {
  accounts: Account[];
  budgets: BudgetCategory[];
  transactions: Transaction[];
  recurring: RecurringPayment[];
  currencyCode: CurrencyCode;
  onSelectTransaction: (tx: Transaction) => void;
  onNavigateToTab: (tabId: string) => void;
  onOpenNewTransaction: () => void;
}

export const OverviewScreen: React.FC<OverviewScreenProps> = ({
  accounts,
  budgets,
  transactions,
  recurring,
  currencyCode,
  onSelectTransaction,
  onNavigateToTab,
  onOpenNewTransaction,
}) => {
  // Compute Key Financial Metrics
  const totalBalance = accounts.reduce((acc, curr) => acc + curr.balance, 0);

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalExpenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, curr) => acc + Math.abs(curr.amount), 0);

  const netSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

  // Total monthly budget allocated and spent
  const totalAllocated = budgets.reduce((acc, b) => acc + b.allocated, 0);
  const totalBudgetSpent = budgets.reduce((acc, b) => acc + b.spent, 0);
  const totalBurnPercent = totalAllocated > 0 ? (totalBudgetSpent / totalAllocated) * 100 : 0;

  // Category breakdown calculation
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

  // Overdrawn and near-limit budgets
  const overspentBudgets = budgets.filter((b) => b.spent > b.allocated);
  const nearLimitBudgets = budgets.filter(
    (b) => b.spent >= b.allocated * 0.85 && b.spent <= b.allocated
  );

  // Next upcoming recurring payment
  const upcomingRecurring = recurring
    .filter((r) => r.status === 'active')
    .sort((a, b) => new Date(a.nextPaymentDate).getTime() - new Date(b.nextPaymentDate).getTime())[0];

  // Recent transactions list
  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);

  // Income vs Expense Ratio calculations for visual bar
  const totalVolume = totalIncome + totalExpenses;
  const incomePct = totalVolume > 0 ? (totalIncome / totalVolume) * 100 : 50;
  const expensePct = totalVolume > 0 ? (totalExpenses / totalVolume) * 100 : 50;

  return (
    <div className="space-y-6">
      {/* AI Smart Insights Banner */}
      <div className="bg-[#FFFFFF] border border-[#A7F3D0] rounded-[0.5rem] p-4 sm:p-5 relative overflow-hidden bg-linear-to-r from-[#ECFDF5]/50 to-[#FFFFFF]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-[0.25rem] bg-[#1B4332] text-white flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4 text-[#A7F3D0]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-bold uppercase tracking-wider text-[#1B4332]">
                  Smart Spending Insights
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1B4332] text-white font-medium">
                  Live
                </span>
              </div>
              <p className="text-[13px] text-[#121316] font-medium mt-1 leading-relaxed">
                {overspentBudgets.length > 0 ? (
                  <span>
                    Warning: <strong>{overspentBudgets[0].name}</strong> exceeded budget by{' '}
                    {formatCurrency(overspentBudgets[0].spent - overspentBudgets[0].allocated, currencyCode)}.
                  </span>
                ) : (
                  <span>
                    Great discipline! You have preserved <strong>{formatPercentage(savingsRate)}</strong> of this month's receipts ({formatCurrency(netSavings, currencyCode)}).
                  </span>
                )}
                {categoryBreakdown[0] && (
                  <span className="text-[#52565E] ml-1">
                    Top outflow was <strong>{categoryBreakdown[0].category}</strong> at{' '}
                    {formatCurrency(categoryBreakdown[0].amount, currencyCode)} ({categoryBreakdown[0].percentage.toFixed(0)}%).
                  </span>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateToTab('ai-advisor')}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-[#1B4332] bg-[#FFFFFF] border border-[#A7F3D0] hover:bg-[#ECFDF5] rounded-[0.25rem] transition-colors whitespace-nowrap shadow-2xs"
          >
            Ask AI Advisor
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Hero Financial Summary Card */}
      <div className="bg-[#FFFFFF] border border-[#E2E4E0] rounded-[0.5rem] p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-[#E2E4E0]">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8A909A]">
              Total Available Balance
            </span>
            <div className="flex flex-wrap items-baseline gap-3 mt-1.5">
              <h1 className="text-[36px] sm:text-[44px] font-bold text-[#121316] tracking-tight num-tabular leading-none">
                {formatCurrency(totalBalance, currencyCode)}
              </h1>
              <MetricDifferentialRibbon deltaPct={7.8} periodText="vs last month" />
            </div>
            <p className="text-[13px] text-[#52565E] mt-2">
              Aggregated across {accounts.length} checking, savings, and digital wallet accounts.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onNavigateToTab('reports')}
              className="px-3.5 py-2 text-[13px] font-medium text-[#121316] bg-[#F4F4F2] border border-[#E2E4E0] rounded-[0.25rem] hover:bg-[#E2E4E0] transition-colors"
            >
              Spending Report
            </button>
            <button
              onClick={onOpenNewTransaction}
              className="px-3.5 py-2 text-[13px] font-semibold text-white bg-[#1B4332] hover:bg-[#2D6A4F] rounded-[0.25rem] transition-colors shadow-xs"
            >
              + Add Transaction
            </button>
          </div>
        </div>

        {/* 4 Primary Analytical Metric Tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6">
          {/* Monthly Income */}
          <div className="p-4 bg-[#FBFBFA] border border-[#E2E4E0] rounded-[0.25rem]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8A909A]">
                Monthly Income
              </span>
              <span className="w-5 h-5 rounded-full bg-[#ECFDF5] text-[#1B4332] flex items-center justify-center text-[10px]">
                <ArrowDownRight className="w-3 h-3 text-[#10B981]" />
              </span>
            </div>
            <div className="text-[22px] font-bold text-[#121316] num-tabular mt-2">
              {formatCurrency(totalIncome, currencyCode)}
            </div>
            <div className="mt-1">
              <MetricDifferentialRibbon deltaPct={4.6} periodText="vs target" />
            </div>
          </div>

          {/* Monthly Expenses */}
          <div className="p-4 bg-[#FBFBFA] border border-[#E2E4E0] rounded-[0.25rem]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8A909A]">
                Monthly Expenses
              </span>
              <span className="w-5 h-5 rounded-full bg-[#FEF2F2] text-[#991B1B] flex items-center justify-center text-[10px]">
                <ArrowUpRight className="w-3 h-3 text-[#EF4444]" />
              </span>
            </div>
            <div className="text-[22px] font-bold text-[#121316] num-tabular mt-2">
              {formatCurrency(totalExpenses, currencyCode)}
            </div>
            <div className="mt-1">
              <span className="text-[11px] text-[#52565E] font-medium num-tabular">
                {transactions.filter((t) => t.type === 'expense').length} transactions recorded
              </span>
            </div>
          </div>

          {/* Net Savings */}
          <div className="p-4 bg-[#FBFBFA] border border-[#E2E4E0] rounded-[0.25rem]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8A909A]">
                Net Savings
              </span>
              <span className="w-5 h-5 rounded-full bg-[#ECFDF5] text-[#1B4332] flex items-center justify-center text-[10px]">
                <PiggyBank className="w-3 h-3 text-[#10B981]" />
              </span>
            </div>
            <div className="text-[22px] font-bold text-[#1B4332] num-tabular mt-2">
              {formatCurrency(netSavings, currencyCode)}
            </div>
            <div className="mt-1">
              <span className="text-[11px] text-[#2D6A4F] font-semibold num-tabular">
                {formatPercentage(savingsRate)} retained
              </span>
            </div>
          </div>

          {/* Upcoming Subscriptions */}
          <div className="p-4 bg-[#FBFBFA] border border-[#E2E4E0] rounded-[0.25rem]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8A909A]">
                Recurring Due
              </span>
              <span className="w-5 h-5 rounded-full bg-[#F4F4F2] text-[#52565E] flex items-center justify-center text-[10px]">
                <Calendar className="w-3 h-3" />
              </span>
            </div>
            <div className="text-[22px] font-bold text-[#121316] num-tabular mt-2 truncate">
              {upcomingRecurring ? formatCurrency(upcomingRecurring.amount, currencyCode) : '₹0.00'}
            </div>
            <div className="text-[11px] text-[#52565E] mt-1 font-medium truncate">
              {upcomingRecurring ? `${upcomingRecurring.name}` : 'No upcoming payments'}
            </div>
          </div>
        </div>
      </div>

      {/* Visual Charts Row: Income vs Expenses & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Income vs Expense Comparison Bar Chart (6 cols) */}
        <div className="lg:col-span-6 bg-[#FFFFFF] border border-[#E2E4E0] rounded-[0.5rem] p-6">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E2E4E0]">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8A909A]">
                Cashflow Dynamics
              </span>
              <h3 className="text-[16px] font-bold text-[#121316]">
                Income vs Expense Comparison
              </h3>
            </div>
            <span className="text-[12px] font-medium text-[#52565E] num-tabular">
              Ratio: {((totalIncome / (totalExpenses || 1))).toFixed(2)}x
            </span>
          </div>

          {/* Ratio bar */}
          <div className="w-full h-3 rounded-[2px] overflow-hidden flex bg-[#E2E4E0] mb-4">
            <div
              style={{ width: `${incomePct}%` }}
              className="h-full bg-[#1B4332] transition-all duration-500"
              title={`Income: ${formatPercentage(incomePct)}`}
            />
            <div
              style={{ width: `${expensePct}%` }}
              className="h-full bg-[#C62828] transition-all duration-500"
              title={`Expenses: ${formatPercentage(expensePct)}`}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="p-3 bg-[#FBFBFA] border border-[#E2E4E0] rounded-[0.25rem]">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-[#1B4332]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#1B4332]" />
                Total Inflow ({incomePct.toFixed(0)}%)
              </div>
              <div className="text-[17px] font-bold text-[#121316] num-tabular mt-1">
                {formatCurrency(totalIncome, currencyCode)}
              </div>
            </div>

            <div className="p-3 bg-[#FBFBFA] border border-[#E2E4E0] rounded-[0.25rem]">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-[#991B1B]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#C62828]" />
                Total Outflow ({expensePct.toFixed(0)}%)
              </div>
              <div className="text-[17px] font-bold text-[#121316] num-tabular mt-1">
                {formatCurrency(totalExpenses, currencyCode)}
              </div>
            </div>
          </div>
        </div>

        {/* Category-Wise Spending Breakdown (6 cols) */}
        <div className="lg:col-span-6 bg-[#FFFFFF] border border-[#E2E4E0] rounded-[0.5rem] p-6">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E2E4E0]">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8A909A]">
                Distribution
              </span>
              <h3 className="text-[16px] font-bold text-[#121316]">
                Category-Wise Spending
              </h3>
            </div>
            <button
              onClick={() => onNavigateToTab('reports')}
              className="text-[12px] font-semibold text-[#1B4332] hover:underline"
            >
              Detailed Breakdown
            </button>
          </div>

          <div className="space-y-3">
            {categoryBreakdown.slice(0, 4).map((item) => (
              <div key={item.category} className="space-y-1">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="font-medium text-[#121316]">{item.category}</span>
                  <span className="font-semibold num-tabular text-[#121316]">
                    {formatCurrency(item.amount, currencyCode)}{' '}
                    <span className="text-[11px] text-[#8A909A] font-normal">
                      ({item.percentage.toFixed(1)}%)
                    </span>
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[#E2E4E0] rounded-[1px] overflow-hidden">
                  <div
                    className="h-full bg-[#2D6A4F]"
                    style={{ width: `${Math.min(item.percentage, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Budget Depletion Progress Ribbon & Warnings */}
      <div className="bg-[#FFFFFF] border border-[#E2E4E0] rounded-[0.5rem] p-6">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E2E4E0]">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8A909A]">
              Monthly Limits
            </span>
            <h3 className="text-[18px] font-bold text-[#121316]">
              Budget Progress & Envelope Depletion
            </h3>
          </div>
          <button
            onClick={() => onNavigateToTab('budgets')}
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#1B4332] hover:text-[#2D6A4F]"
          >
            Manage Envelopes
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Aggregate Burn Gauge */}
        <div className="p-4 bg-[#F4F4F2] border border-[#E2E4E0] rounded-[0.25rem] mb-5">
          <div className="flex items-center justify-between text-[13px] font-semibold text-[#121316] mb-2">
            <span>Overall Monthly Budget Burn</span>
            <span className="num-tabular text-[14px]">
              {formatCurrency(totalBudgetSpent, currencyCode)} / {formatCurrency(totalAllocated, currencyCode)} ({totalBurnPercent.toFixed(1)}%)
            </span>
          </div>
          <BudgetDepletionGauge
            spent={totalBudgetSpent}
            allocated={totalAllocated}
            currencyCode={currencyCode}
            showDetails={false}
          />
        </div>

        {/* Top 4 Category Gauges */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {budgets.slice(0, 4).map((category) => (
            <div key={category.id} className="pb-2 border-b border-[#E2E4E0]/60 last:border-0">
              <BudgetDepletionGauge
                name={category.name}
                categoryGroup={category.categoryGroup}
                spent={category.spent}
                allocated={category.allocated}
                currencyCode={currencyCode}
                compact={false}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Recent Transactions List */}
      <div className="bg-[#FFFFFF] border border-[#E2E4E0] rounded-[0.5rem] overflow-hidden">
        <div className="p-6 pb-4 flex items-center justify-between border-b border-[#E2E4E0] bg-[#FFFFFF]">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8A909A]">
              Activity
            </span>
            <h3 className="text-[18px] font-bold text-[#121316]">
              Recent Transactions
            </h3>
          </div>
          <button
            onClick={() => onNavigateToTab('transactions')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-[#121316] bg-[#F4F4F2] border border-[#E2E4E0] hover:bg-[#E2E4E0] rounded-[0.25rem] transition-colors"
          >
            All Transactions
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F4F4F2] border-b border-[#E2E4E0] text-[11px] font-semibold uppercase tracking-[0.04em] text-[#52565E] select-none">
                <th className="py-2.5 px-4 w-[120px]">Date</th>
                <th className="py-2.5 px-4">Payee & Purpose</th>
                <th className="py-2.5 px-4 hidden sm:table-cell">Category</th>
                <th className="py-2.5 px-4 hidden md:table-cell">Payment Method</th>
                <th className="py-2.5 px-4 text-center w-[110px]">Status</th>
                <th className="py-2.5 px-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.map((tx) => {
                const isIncome = tx.type === 'income';

                return (
                  <tr
                    key={tx.id}
                    onClick={() => onSelectTransaction(tx)}
                    className="h-12 bg-[#FFFFFF] hover:bg-[#FBFBFA] border-b border-[#E2E4E0] text-[13px] text-[#121316] cursor-pointer transition-colors"
                    style={{ height: '48px' }}
                  >
                    <td className="py-2 px-4 num-tabular text-[#52565E] font-medium text-[12px]">
                      {tx.date}
                    </td>
                    <td className="py-2 px-4 font-semibold">
                      <div className="truncate max-w-[200px] sm:max-w-xs">{tx.merchant}</div>
                      <div className="text-[11px] text-[#8A909A] font-normal truncate max-w-[200px] sm:max-w-xs">
                        {tx.description}
                      </div>
                    </td>
                    <td className="py-2 px-4 hidden sm:table-cell">
                      <SemanticBadge variant="category">{tx.category}</SemanticBadge>
                    </td>
                    <td className="py-2 px-4 hidden md:table-cell text-[#52565E] text-[12px] font-medium">
                      {tx.paymentMethod || 'UPI'}
                    </td>
                    <td className="py-2 px-4 text-center">
                      {tx.status === 'cleared' && (
                        <SemanticBadge variant="positive">Cleared</SemanticBadge>
                      )}
                      {tx.status === 'reconciled' && (
                        <SemanticBadge variant="positive">Reconciled</SemanticBadge>
                      )}
                      {tx.status === 'pending' && (
                        <SemanticBadge variant="warning">Pending</SemanticBadge>
                      )}
                    </td>
                    <td className="py-2 px-4 text-right font-bold num-tabular text-[14px]">
                      <span className={isIncome ? 'text-[#1B4332]' : 'text-[#121316]'}>
                        {formatCurrency(tx.amount, currencyCode, { showPlusSign: true })}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
