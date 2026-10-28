import React, { useState, useMemo } from 'react';
import { Account, BudgetCategory, CurrencyCode, PaymentMethod, Transaction, TransactionStatus, TransactionType } from '../../types/finance';
import { formatCurrency, PAYMENT_METHODS } from '../../utils/formatters';
import { SemanticBadge } from '../SemanticBadge';
import {
  Search,
  Download,
  Plus,
  Check,
  Trash2,
  CheckCircle2,
  Clock,
  ArrowUpDown,
  CreditCard,
  SlidersHorizontal,
} from 'lucide-react';

interface LedgerScreenProps {
  transactions: Transaction[];
  accounts: Account[];
  budgets: BudgetCategory[];
  currencyCode: CurrencyCode;
  onSelectTransaction: (tx: Transaction) => void;
  onOpenNewTransaction: () => void;
  onDeleteMultiple: (ids: string[]) => void;
  onUpdateStatusMultiple: (ids: string[], status: TransactionStatus) => void;
}

export const LedgerScreen: React.FC<LedgerScreenProps> = ({
  transactions,
  accounts,
  budgets,
  currencyCode,
  onSelectTransaction,
  onOpenNewTransaction,
  onDeleteMultiple,
  onUpdateStatusMultiple,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter & sort transactions
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((tx) => {
        // Search
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const matchesMerchant = tx.merchant.toLowerCase().includes(query);
          const matchesDesc = tx.description.toLowerCase().includes(query);
          const matchesCategory = tx.category.toLowerCase().includes(query);
          const matchesPayment = tx.paymentMethod?.toLowerCase().includes(query);
          const matchesTags = tx.tags?.some((t) => t.toLowerCase().includes(query));
          if (!matchesMerchant && !matchesDesc && !matchesCategory && !matchesPayment && !matchesTags) {
            return false;
          }
        }
        // Type
        if (typeFilter !== 'all' && tx.type !== typeFilter) {
          return false;
        }
        // Status
        if (statusFilter !== 'all' && tx.status !== statusFilter) {
          return false;
        }
        // Payment Method
        if (paymentMethodFilter !== 'all' && tx.paymentMethod !== paymentMethodFilter) {
          return false;
        }
        // Category
        if (categoryFilter !== 'all' && tx.category !== categoryFilter) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date-desc') {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        }
        if (sortBy === 'date-asc') {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        }
        if (sortBy === 'amount-desc') {
          return Math.abs(b.amount) - Math.abs(a.amount);
        }
        if (sortBy === 'amount-asc') {
          return Math.abs(a.amount) - Math.abs(b.amount);
        }
        return 0;
      });
  }, [transactions, searchQuery, typeFilter, statusFilter, paymentMethodFilter, categoryFilter, sortBy]);

  // Aggregate sums for current filtered view
  const aggregateAmount = filteredTransactions.reduce((acc, t) => acc + t.amount, 0);

  // Selection handlers
  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredTransactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTransactions.map((t) => t.id)));
    }
  };

  // CSV export
  const exportCSV = () => {
    const headers = ['ID', 'Date', 'Payee', 'Description', 'Amount', 'Type', 'Category', 'PaymentMethod', 'Status', 'TaxDeductible'];
    const rows = filteredTransactions.map((t) => [
      t.id,
      t.date,
      `"${t.merchant.replace(/"/g, '""')}"`,
      `"${t.description.replace(/"/g, '""')}"`,
      t.amount,
      t.type,
      `"${t.category.replace(/"/g, '""')}"`,
      `"${t.paymentMethod || 'UPI'}"`,
      t.status,
      t.taxDeductible ? 'Yes' : 'No',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `spendsense_transactions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Top Filter and Search Control Bar */}
      <div className="bg-[#FFFFFF] border border-[#E2E4E0] rounded-[0.5rem] p-4 lg:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8A909A]" />
            <input
              type="text"
              placeholder="Search payees, categories, payment methods, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-3 bg-[#FFFFFF] border border-[#E2E4E0] rounded-[0.25rem] text-[14px] text-[#121316] input-focus-ring placeholder:text-[#8A909A]"
            />
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={exportCSV}
              className="inline-flex items-center gap-1.5 h-10 px-3.5 text-[13px] font-medium text-[#121316] bg-[#FFFFFF] border border-[#E2E4E0] hover:bg-[#F4F4F2] rounded-[0.25rem] transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-[#52565E]" />
              Export CSV
            </button>
            <button
              onClick={onOpenNewTransaction}
              className="inline-flex items-center gap-1.5 h-10 px-4 text-[13px] font-semibold text-white bg-[#1B4332] hover:bg-[#2D6A4F] rounded-[0.25rem] transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              Add Transaction
            </button>
          </div>
        </div>

        {/* Filter & Sorting Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mt-3 pt-3 border-t border-[#E2E4E0]">
          {/* Type Filter */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8A909A] mb-1">
              Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full h-9 px-2.5 bg-[#FFFFFF] border border-[#E2E4E0] rounded-[0.25rem] text-[13px] text-[#121316] input-focus-ring cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="expense">Expenses Only</option>
              <option value="income">Income Only</option>
            </select>
          </div>

          {/* Payment Method Filter */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8A909A] mb-1">
              Payment Method
            </label>
            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
              className="w-full h-9 px-2.5 bg-[#FFFFFF] border border-[#E2E4E0] rounded-[0.25rem] text-[13px] text-[#121316] input-focus-ring cursor-pointer"
            >
              <option value="all">All Methods</option>
              {PAYMENT_METHODS.map((pm) => (
                <option key={pm} value={pm}>
                  {pm}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8A909A] mb-1">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full h-9 px-2.5 bg-[#FFFFFF] border border-[#E2E4E0] rounded-[0.25rem] text-[13px] text-[#121316] input-focus-ring cursor-pointer"
            >
              <option value="all">All Categories</option>
              {budgets.map((b) => (
                <option key={b.id} value={b.name}>
                  {b.name}
                </option>
              ))}
              <option value="Salary & Income">Salary & Income</option>
              <option value="Freelance & Consulting">Freelance & Consulting</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8A909A] mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-9 px-2.5 bg-[#FFFFFF] border border-[#E2E4E0] rounded-[0.25rem] text-[13px] text-[#121316] input-focus-ring cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="cleared">Cleared</option>
              <option value="reconciled">Reconciled</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          {/* Sorting */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8A909A] mb-1">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full h-9 px-2.5 bg-[#FFFFFF] border border-[#E2E4E0] rounded-[0.25rem] text-[13px] text-[#121316] input-focus-ring cursor-pointer"
            >
              <option value="date-desc">Date (Newest First)</option>
              <option value="date-asc">Date (Oldest First)</option>
              <option value="amount-desc">Amount (Highest)</option>
              <option value="amount-asc">Amount (Lowest)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Batch Action Strip */}
      {selectedIds.size > 0 && (
        <div className="bg-[#1B4332] text-white px-4 py-2.5 rounded-[0.25rem] flex items-center justify-between animate-in fade-in duration-150">
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-semibold num-tabular">
              {selectedIds.size} {selectedIds.size === 1 ? 'transaction' : 'transactions'} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onUpdateStatusMultiple(Array.from(selectedIds), 'cleared');
                setSelectedIds(new Set());
              }}
              className="px-2.5 py-1 text-[12px] font-medium bg-white/10 hover:bg-white/20 rounded-[2px] transition-colors"
            >
              Mark Cleared
            </button>
            <button
              onClick={() => {
                onUpdateStatusMultiple(Array.from(selectedIds), 'reconciled');
                setSelectedIds(new Set());
              }}
              className="px-2.5 py-1 text-[12px] font-medium bg-white/10 hover:bg-white/20 rounded-[2px] transition-colors"
            >
              Mark Reconciled
            </button>
            <button
              onClick={() => {
                onDeleteMultiple(Array.from(selectedIds));
                setSelectedIds(new Set());
              }}
              className="px-2.5 py-1 text-[12px] font-medium bg-[#EF4444] hover:bg-[#DC2626] rounded-[2px] transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Transactions Table */}
      <div className="bg-[#FFFFFF] border border-[#E2E4E0] rounded-[0.5rem] overflow-hidden">
        {/* Table summary sub-header */}
        <div className="px-4 py-2.5 bg-[#FBFBFA] border-b border-[#E2E4E0] flex items-center justify-between text-[12px] text-[#52565E]">
          <div className="flex items-center gap-2">
            <span>
              Showing <strong className="text-[#121316] num-tabular">{filteredTransactions.length}</strong> of{' '}
              <strong className="text-[#121316] num-tabular">{transactions.length}</strong> transactions
            </span>
          </div>
          <div className="num-tabular">
            <span>Filtered Net Balance: </span>
            <strong className={`font-semibold ${aggregateAmount >= 0 ? 'text-[#1B4332]' : 'text-[#121316]'}`}>
              {formatCurrency(aggregateAmount, currencyCode, { showPlusSign: true })}
            </strong>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F4F4F2] border-b border-[#E2E4E0] text-[11px] font-semibold uppercase tracking-[0.04em] text-[#52565E] select-none">
                <th className="py-2.5 px-3 w-10 text-center">
                  <button
                    onClick={handleSelectAll}
                    className={`w-4 h-4 rounded-[2px] border flex items-center justify-center transition-colors ${
                      selectedIds.size > 0 && selectedIds.size === filteredTransactions.length
                        ? 'bg-[#1B4332] border-[#1B4332] text-white'
                        : 'bg-white border-[#D1D5DB]'
                    }`}
                  >
                    {selectedIds.size > 0 && <Check className="w-3 h-3 stroke-[3]" />}
                  </button>
                </th>
                <th className="py-2.5 px-3 w-[110px]">Date</th>
                <th className="py-2.5 px-4">Payee & Description</th>
                <th className="py-2.5 px-4 hidden sm:table-cell">Category</th>
                <th className="py-2.5 px-4 hidden md:table-cell">Method</th>
                <th className="py-2.5 px-3 text-center w-[110px]">Status</th>
                <th className="py-2.5 px-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#8A909A] text-[14px]">
                    No transactions match the current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const isSelected = selectedIds.has(tx.id);
                  const isIncome = tx.type === 'income';

                  return (
                    <tr
                      key={tx.id}
                      onClick={() => onSelectTransaction(tx)}
                      className={`h-12 border-b border-[#E2E4E0] text-[13px] text-[#121316] cursor-pointer transition-colors ${
                        isSelected ? 'bg-[#ECFDF5]/60 hover:bg-[#ECFDF5]' : 'bg-[#FFFFFF] hover:bg-[#FBFBFA]'
                      }`}
                      style={{ height: '48px' }}
                    >
                      {/* Checkbox */}
                      <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => handleToggleSelect(tx.id, e)}
                          className={`w-4 h-4 rounded-[2px] border flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'bg-[#1B4332] border-[#1B4332] text-white'
                              : 'bg-white border-[#D1D5DB]'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </button>
                      </td>

                      {/* Date */}
                      <td className="py-2 px-3 num-tabular text-[#52565E] font-medium text-[12px] whitespace-nowrap">
                        {tx.date}
                      </td>

                      {/* Payee / Description */}
                      <td className="py-2 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#121316]">{tx.merchant}</span>
                          {tx.taxDeductible && (
                            <span className="text-[9px] uppercase font-bold tracking-wider px-1 py-0.2 bg-[#ECFDF5] text-[#1B4332] border border-[#A7F3D0] rounded-[2px]">
                              Tax Deductible
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#8A909A] truncate max-w-sm">
                          {tx.description}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-2 px-4 hidden sm:table-cell">
                        <SemanticBadge variant="category">{tx.category}</SemanticBadge>
                      </td>

                      {/* Payment Method */}
                      <td className="py-2 px-4 hidden md:table-cell text-[#52565E] text-[12px] font-medium whitespace-nowrap">
                        {tx.paymentMethod || 'UPI'}
                      </td>

                      {/* Status */}
                      <td className="py-2 px-3 text-center">
                        {tx.status === 'cleared' && (
                          <SemanticBadge variant="positive" icon={<CheckCircle2 className="w-3 h-3" />}>
                            Cleared
                          </SemanticBadge>
                        )}
                        {tx.status === 'reconciled' && (
                          <SemanticBadge variant="positive" icon={<CheckCircle2 className="w-3 h-3" />}>
                            Reconciled
                          </SemanticBadge>
                        )}
                        {tx.status === 'pending' && (
                          <SemanticBadge variant="warning" icon={<Clock className="w-3 h-3" />}>
                            Pending
                          </SemanticBadge>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-2 px-4 text-right font-bold num-tabular text-[14px] whitespace-nowrap">
                        <span className={isIncome ? 'text-[#1B4332]' : 'text-[#121316]'}>
                          {formatCurrency(tx.amount, currencyCode, { showPlusSign: true })}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
