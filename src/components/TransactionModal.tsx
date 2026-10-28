import React, { useState } from 'react';
import { Account, BudgetCategory, CurrencyCode, PaymentMethod, Transaction, TransactionStatus, TransactionType } from '../types/finance';
import { CURRENCIES, PAYMENT_METHODS } from '../utils/formatters';
import { X, Check } from 'lucide-react';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Omit<Transaction, 'id'>) => void;
  accounts: Account[];
  budgets: BudgetCategory[];
  currencyCode: CurrencyCode;
  initialData?: Transaction | null;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  accounts,
  budgets,
  currencyCode,
  initialData,
}) => {
  if (!isOpen) return null;

  const [merchant, setMerchant] = useState(initialData?.merchant || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [amountStr, setAmountStr] = useState(
    initialData ? Math.abs(initialData.amount).toString() : ''
  );
  const [type, setType] = useState<TransactionType>(initialData?.type || 'expense');
  const [category, setCategory] = useState(
    initialData?.category || (budgets[0]?.name ?? 'Dining & Takeout')
  );
  const [accountId, setAccountId] = useState(
    initialData?.accountId || (accounts[0]?.id ?? '')
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    initialData?.paymentMethod || 'UPI'
  );
  const [date, setDate] = useState(
    initialData?.date || new Date().toISOString().split('T')[0]
  );
  const [status, setStatus] = useState<TransactionStatus>(initialData?.status || 'cleared');
  const [taxDeductible, setTaxDeductible] = useState(initialData?.taxDeductible || false);
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [tagsStr, setTagsStr] = useState(initialData?.tags?.join(', ') || '');

  const currencySymbol = CURRENCIES[currencyCode]?.symbol || '₹';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amountStr);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    // Negate amount if expense
    const finalAmount = type === 'income' ? parsedAmount : -parsedAmount;
    const tags = tagsStr
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    onSave({
      date,
      merchant: merchant.trim() || 'Payee',
      description: description.trim() || category,
      amount: finalAmount,
      type,
      category,
      accountId,
      paymentMethod,
      status,
      taxDeductible,
      notes: notes.trim(),
      tags,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#121316]/40 backdrop-blur-[2px]">
      <div
        className="w-full max-w-lg bg-[#FFFFFF] border border-[#E2E4E0] rounded-[0.75rem] elevation-overlay overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col"
        role="dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E4E0] bg-[#F4F4F2]">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8A909A]">
              Personal Expense Tracker
            </span>
            <h2 className="text-[18px] font-semibold text-[#121316] leading-tight">
              {initialData ? 'Edit Transaction' : 'Record Transaction'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 inline-flex items-center justify-center text-[#52565E] hover:text-[#121316] hover:bg-[#E2E4E0]/50 rounded-[0.25rem] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Income vs Expense Segmented Toggle */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-[#F4F4F2] border border-[#E2E4E0] rounded-[0.25rem]">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`py-1.5 text-[13px] font-semibold rounded-[0.25rem] transition-all capitalize ${
                type === 'expense'
                  ? 'bg-[#FFFFFF] text-[#991B1B] shadow-xs'
                  : 'text-[#52565E] hover:text-[#121316]'
              }`}
            >
              Expense (-)
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`py-1.5 text-[13px] font-semibold rounded-[0.25rem] transition-all capitalize ${
                type === 'income'
                  ? 'bg-[#FFFFFF] text-[#1B4332] shadow-xs'
                  : 'text-[#52565E] hover:text-[#121316]'
              }`}
            >
              Income (+)
            </button>
          </div>

          {/* Amount with embedded non-editable currency affix */}
          <div>
            <label className="block text-[12px] font-semibold uppercase tracking-[0.02em] text-[#52565E] mb-1">
              Amount
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-[15px] font-semibold text-[#8A909A] select-none pointer-events-none">
                {currencySymbol}
              </span>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full h-10 pl-8 pr-3 bg-[#FFFFFF] border border-[#E2E4E0] rounded-[0.25rem] text-[16px] font-semibold text-[#121316] num-tabular input-focus-ring"
              />
            </div>
          </div>

          {/* Merchant & Description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-[0.02em] text-[#52565E] mb-1">
                Payee / Merchant
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Swiggy, Netflix, Shell"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                className="w-full h-10 px-3 bg-[#FFFFFF] border border-[#E2E4E0] rounded-[0.25rem] text-[14px] text-[#121316] input-focus-ring"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-[0.02em] text-[#52565E] mb-1">
                Description / Purpose
              </label>
              <input
                type="text"
                placeholder="e.g. Team dinner, Fuel refill"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full h-10 px-3 bg-[#FFFFFF] border border-[#E2E4E0] rounded-[0.25rem] text-[14px] text-[#121316] input-focus-ring"
              />
            </div>
          </div>

          {/* Category & Payment Method (Explicitly required!) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-[0.02em] text-[#52565E] mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-10 px-3 bg-[#FFFFFF] border border-[#E2E4E0] rounded-[0.25rem] text-[14px] text-[#121316] input-focus-ring"
              >
                {budgets.map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
                <option value="Salary & Income">Salary & Income</option>
                <option value="Freelance & Consulting">Freelance & Consulting</option>
                <option value="Investment & Dividends">Investment & Dividends</option>
                <option value="General Outflow">General Outflow</option>
              </select>
            </div>

            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-[0.02em] text-[#52565E] mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full h-10 px-3 bg-[#FFFFFF] border border-[#E2E4E0] rounded-[0.25rem] text-[14px] text-[#121316] input-focus-ring font-medium"
              >
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm} value={pm}>
                    {pm}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Account & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-[0.02em] text-[#52565E] mb-1">
                Account / Wallet
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full h-10 px-3 bg-[#FFFFFF] border border-[#E2E4E0] rounded-[0.25rem] text-[14px] text-[#121316] input-focus-ring"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.accountNumberMask})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-[0.02em] text-[#52565E] mb-1">
                Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-10 px-3 bg-[#FFFFFF] border border-[#E2E4E0] rounded-[0.25rem] text-[14px] text-[#121316] input-focus-ring"
              />
            </div>
          </div>

          {/* Status & Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-[0.02em] text-[#52565E] mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TransactionStatus)}
                className="w-full h-10 px-3 bg-[#FFFFFF] border border-[#E2E4E0] rounded-[0.25rem] text-[14px] text-[#121316] input-focus-ring capitalize"
              >
                <option value="cleared">Cleared</option>
                <option value="pending">Pending</option>
                <option value="reconciled">Reconciled</option>
              </select>
            </div>

            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-[0.02em] text-[#52565E] mb-1">
                Tags (comma separated)
              </label>
              <input
                type="text"
                placeholder="Food, Weekend, Subscriptions"
                value={tagsStr}
                onChange={(e) => setTagsStr(e.target.value)}
                className="w-full h-10 px-3 bg-[#FFFFFF] border border-[#E2E4E0] rounded-[0.25rem] text-[14px] text-[#121316] input-focus-ring"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[12px] font-semibold uppercase tracking-[0.02em] text-[#52565E] mb-1">
              Notes & Memo
            </label>
            <input
              type="text"
              placeholder="Optional notes or receipt references..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-10 px-3 bg-[#FFFFFF] border border-[#E2E4E0] rounded-[0.25rem] text-[14px] text-[#121316] input-focus-ring"
            />
          </div>

          {/* Tax-Deductible Checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setTaxDeductible(!taxDeductible)}
              className={`w-4 h-4 rounded-[2px] border flex items-center justify-center transition-colors ${
                taxDeductible
                  ? 'bg-[#1B4332] border-[#1B4332] text-white'
                  : 'bg-white border-[#D1D5DB]'
              }`}
            >
              {taxDeductible && <Check className="w-3 h-3 stroke-[3]" />}
            </button>
            <span
              onClick={() => setTaxDeductible(!taxDeductible)}
              className="text-[13px] text-[#121316] cursor-pointer select-none"
            >
              Mark as tax deductible (business or Section 80 expense)
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E2E4E0]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[14px] font-medium text-[#121316] bg-transparent border border-[#E2E4E0] rounded-[0.25rem] hover:bg-[#F4F4F2] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-[14px] font-semibold text-[#FFFFFF] bg-[#1B4332] rounded-[0.25rem] hover:bg-[#2D6A4F] active:bg-[#143326] transition-colors shadow-xs"
            >
              Save Transaction
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
