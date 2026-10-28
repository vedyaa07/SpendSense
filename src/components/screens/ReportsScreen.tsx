import React, { useState } from 'react';
import { Account, BudgetCategory, CurrencyCode, Transaction } from '../../types/finance';
import { formatCurrency, formatPercentage } from '../../utils/formatters';
import {
  Download,
  Printer,
  FileText,
  Calendar,
  TrendingDown,
  TrendingUp,
  PieChart,
  BarChart3,
  CheckCircle,
} from 'lucide-react';

interface ReportsScreenProps {
  transactions: Transaction[];
  accounts: Account[];
  budgets: BudgetCategory[];
  currencyCode: CurrencyCode;
  currentPeriod: string;
}

export const ReportsScreen: React.FC<ReportsScreenProps> = ({
  transactions,
  accounts,
  budgets,
  currencyCode,
  currentPeriod,
}) => {
  const [reportTimeframe, setReportTimeframe] = useState<'monthly' | 'weekly'>('monthly');

  // Total Income and Expense
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

  // Weekly spending breakdown (based on transaction day of month)
  const weeks = [
    { label: 'Week 1 (Day 1 - 7)', minDay: 1, maxDay: 7 },
    { label: 'Week 2 (Day 8 - 14)', minDay: 8, maxDay: 14 },
    { label: 'Week 3 (Day 15 - 21)', minDay: 15, maxDay: 21 },
    { label: 'Week 4 (Day 22 - 28)', minDay: 22, maxDay: 28 },
    { label: 'Week 5 (Day 29 - 31)', minDay: 29, maxDay: 31 },
  ];

  const weeklyData = weeks.map((w) => {
    const weekExpenses = transactions.filter((t) => {
      if (t.type !== 'expense') return false;
      const day = parseInt(t.date.split('-')[2] || '0', 10);
      return day >= w.minDay && day <= w.maxDay;
    });
    const amount = weekExpenses.reduce((acc, t) => acc + Math.abs(t.amount), 0);
    return {
      label: w.label,
      amount,
      count: weekExpenses.length,
    };
  });

  const maxWeeklyAmount = Math.max(...weeklyData.map((w) => w.amount), 1);

  // CSV Export for Report
  const exportReportCSV = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Period', currentPeriod],
      ['Total Income', totalIncome],
      ['Total Expenses', totalExpenses],
      ['Net Savings', netSavings],
      ['Savings Rate', `${savingsRate.toFixed(1)}%`],
      [],
      ['Category', 'Amount', 'Percentage'],
      ...categoryBreakdown.map((c) => [c.category, c.amount, `${c.percentage.toFixed(1)}%`]),
      [],
      ['Weekly Segment', 'Expenses Amount'],
      ...weeklyData.map((w) => [w.label, w.amount]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `spendsense_report_${currentPeriod.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 gap-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#1B4332]" />
          <span className="text-[12px] font-bold text-[#52565E] uppercase tracking-wider">
            Spending Summary & Financial Report • {currentPeriod}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportReportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-[#121316] bg-[#FFFFFF] border border-[#E2E4E0] hover:bg-[#F4F4F2] rounded-[0.25rem] transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-[#52565E]" />
            Export CSV
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-[#121316] bg-[#FFFFFF] border border-[#E2E4E0] hover:bg-[#F4F4F2] rounded-[0.25rem] transition-colors shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5 text-[#52565E]" />
            Print Report
          </button>
        </div>
      </div>

      {/* Main Report Document Paper */}
      <div className="bg-[#FFFFFF] border border-[#E2E4E0] rounded-[0.25rem] p-6 sm:p-10 shadow-xs font-sans">
        {/* Masthead */}
        <div className="text-center pb-6 border-b-2 border-[#121316] mb-6">
          <div className="text-[10px] sm:text-[11px] font-bold tracking-[0.25em] uppercase text-[#8A909A] mb-1">
            Personal Expense & Savings Statement
          </div>
          <h1 className="text-[26px] sm:text-[34px] font-bold tracking-tight text-[#121316] uppercase">
            SpendSense Monthly Dispatch
          </h1>
          <div className="flex flex-wrap items-center justify-between text-[11px] font-semibold text-[#52565E] border-t border-b border-[#E2E4E0] py-1.5 mt-3 px-2">
            <span>PERIOD: {currentPeriod.toUpperCase()}</span>
            <span>CURRENCY: {currencyCode}</span>
            <span>TOTAL EXPENSES: {formatCurrency(totalExpenses, currencyCode)}</span>
            <span>SAVINGS RATE: {savingsRate.toFixed(1)}%</span>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="mb-8 p-4 bg-[#FBFBFA] border-l-2 border-[#1B4332] text-[13px] text-[#52565E] leading-relaxed">
          &ldquo;During {currentPeriod}, total recognized receipts totaled {formatCurrency(totalIncome, currencyCode)}, against operating outflows of {formatCurrency(totalExpenses, currencyCode)}. This yields a net retained savings surplus of {formatCurrency(netSavings, currencyCode)} ({savingsRate.toFixed(1)}% savings rate).&rdquo;
        </div>

        {/* Section 1: Income vs Expense Summary */}
        <div className="mb-8">
          <div className="flex items-baseline justify-between border-b border-[#121316] pb-1 mb-3">
            <h2 className="text-[14px] font-bold uppercase tracking-wider text-[#121316]">
              I. Income Versus Expense Reconciliation
            </h2>
            <span className="text-[11px] text-[#8A909A] font-semibold uppercase">Amount ({currencyCode})</span>
          </div>

          <table className="w-full text-[13px] border-collapse">
            <tbody>
              <tr className="border-b border-[#E2E4E0] py-2">
                <td className="py-2.5 text-[#121316] font-medium">Gross Inflow (Salaries, Invoices, Retainers)</td>
                <td className="py-2.5 text-right num-tabular font-bold text-[#1B4332]">
                  {formatCurrency(totalIncome, currencyCode)}
                </td>
              </tr>
              <tr className="border-b border-[#E2E4E0] py-2">
                <td className="py-2.5 text-[#121316] font-medium">Total Operating Outflows (Expenses & Living)</td>
                <td className="py-2.5 text-right num-tabular font-bold text-[#991B1B]">
                  {formatCurrency(totalExpenses, currencyCode)}
                </td>
              </tr>
              <tr className="bg-[#ECFDF5] font-bold text-[14px]">
                <td className="py-3 px-3 text-[#1B4332]">Net Retained Savings Surplus</td>
                <td className="py-3 px-3 text-right num-tabular text-[#1B4332]">
                  {formatCurrency(netSavings, currencyCode)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 2: Weekly Spending Trajectory */}
        <div className="mb-8">
          <div className="flex items-baseline justify-between border-b border-[#121316] pb-1 mb-3">
            <h2 className="text-[14px] font-bold uppercase tracking-wider text-[#121316]">
              II. Weekly Outflow Trajectory & Run-Rate
            </h2>
            <span className="text-[11px] text-[#8A909A] font-semibold uppercase">Burn Breakdown</span>
          </div>

          <div className="space-y-3 pt-1">
            {weeklyData.map((week) => (
              <div key={week.label} className="space-y-1">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="font-semibold text-[#121316]">
                    {week.label}{' '}
                    <span className="text-[11px] text-[#8A909A] font-normal">
                      ({week.count} {week.count === 1 ? 'txn' : 'txns'})
                    </span>
                  </span>
                  <span className="font-bold num-tabular text-[#121316]">
                    {formatCurrency(week.amount, currencyCode)}
                  </span>
                </div>
                <div className="w-full h-2 bg-[#E2E4E0] rounded-[1px] overflow-hidden">
                  <div
                    className="h-full bg-[#1B4332]"
                    style={{ width: `${(week.amount / maxWeeklyAmount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Category-Wise Breakdown Table */}
        <div className="mb-8">
          <div className="flex items-baseline justify-between border-b border-[#121316] pb-1 mb-3">
            <h2 className="text-[14px] font-bold uppercase tracking-wider text-[#121316]">
              III. Category-Wise Expense Distribution
            </h2>
            <span className="text-[11px] text-[#8A909A] font-semibold uppercase">Share of Total</span>
          </div>

          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="bg-[#F4F4F2] border-b border-[#E2E4E0] text-[11px] font-bold uppercase tracking-wider text-[#52565E]">
                <th className="py-2 px-3 text-left">Category</th>
                <th className="py-2 px-3 text-right">Expenditure</th>
                <th className="py-2 px-3 text-right">Share (%)</th>
              </tr>
            </thead>
            <tbody>
              {categoryBreakdown.map((item) => (
                <tr key={item.category} className="border-b border-[#E2E4E0] hover:bg-[#FBFBFA]">
                  <td className="py-2 px-3 font-semibold text-[#121316]">{item.category}</td>
                  <td className="py-2 px-3 text-right num-tabular font-medium text-[#121316]">
                    {formatCurrency(item.amount, currencyCode)}
                  </td>
                  <td className="py-2 px-3 text-right num-tabular text-[#52565E] font-medium">
                    {item.percentage.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Signoff */}
        <div className="mt-10 pt-4 border-t border-[#E2E4E0] flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#8A909A] gap-2">
          <div className="flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-[#10B981]" />
            <span>Audited & Calculated by SpendSense Smart Analytics</span>
          </div>
          <div>Confidential • Personal Record</div>
        </div>
      </div>
    </div>
  );
};
