import React, { useState } from 'react';
import { CurrencyCode, PaymentMethod, RecurringPayment } from '../../types/finance';
import { formatCurrency, PAYMENT_METHODS } from '../../utils/formatters';
import { SemanticBadge } from '../SemanticBadge';
import {
  RefreshCw,
  Plus,
  Calendar,
  CreditCard,
  Trash2,
  Edit2,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  X,
  AlertCircle,
} from 'lucide-react';

interface RecurringScreenProps {
  recurring: RecurringPayment[];
  currencyCode: CurrencyCode;
  onAddRecurring: (item: Omit<RecurringPayment, 'id'>) => void;
  onUpdateRecurring: (id: string, item: Partial<RecurringPayment>) => void;
  onDeleteRecurring: (id: string) => void;
}

export const RecurringScreen: React.FC<RecurringScreenProps> = ({
  recurring,
  currencyCode,
  onAddRecurring,
  onUpdateRecurring,
  onDeleteRecurring,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [frequency, setFrequency] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [category, setCategory] = useState('Digital & Subscriptions');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Credit Card');
  const [nextPaymentDate, setNextPaymentDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');

  // Computations
  const activeItems = recurring.filter((r) => r.status === 'active');
  const monthlyTotal = activeItems.reduce((acc, r) => {
    if (r.frequency === 'weekly') return acc + r.amount * 4.33;
    if (r.frequency === 'yearly') return acc + r.amount / 12;
    return acc + r.amount;
  }, 0);

  const yearlyTotal = monthlyTotal * 12;

  const openCreateModal = () => {
    setEditingId(null);
    setName('');
    setAmountStr('');
    setFrequency('monthly');
    setCategory('Digital & Subscriptions');
    setPaymentMethod('Credit Card');
    setNextPaymentDate(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (item: RecurringPayment) => {
    setEditingId(item.id);
    setName(item.name);
    setAmountStr(item.amount.toString());
    setFrequency(item.frequency);
    setCategory(item.category);
    setPaymentMethod(item.paymentMethod);
    setNextPaymentDate(item.nextPaymentDate);
    setNotes(item.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amountStr);
    if (!name.trim() || isNaN(val) || val <= 0) return;

    if (editingId) {
      onUpdateRecurring(editingId, {
        name: name.trim(),
        amount: val,
        frequency,
        category,
        paymentMethod,
        nextPaymentDate,
        notes: notes.trim(),
      });
    } else {
      onAddRecurring({
        name: name.trim(),
        amount: val,
        frequency,
        category,
        paymentMethod,
        nextPaymentDate,
        status: 'active',
        notes: notes.trim(),
      });
    }
    setIsModalOpen(false);
  };

  const toggleStatus = (id: string, currentStatus: 'active' | 'paused') => {
    onUpdateRecurring(id, {
      status: currentStatus === 'active' ? 'paused' : 'active',
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <div className="bg-[#FFFFFF] border border-[#E2E4E0] rounded-[0.5rem] p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[#E2E4E0]">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8A909A]">
              Fixed Outflows
            </span>
            <h1 className="text-[28px] sm:text-[34px] font-bold text-[#121316] tracking-tight leading-tight">
              Recurring Expenses & Subscriptions
            </h1>
            <p className="text-[13px] text-[#52565E] mt-1.5 max-w-2xl">
              Monitor monthly subscriptions, memberships, utilities, and scheduled payments. Avoid bill shock with automated tracking of upcoming auto-debit dates.
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-semibold text-white bg-[#1B4332] hover:bg-[#2D6A4F] rounded-[0.25rem] transition-colors shadow-xs self-start lg:self-auto"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Add Recurring Payment
          </button>
        </div>

        {/* 3 Summary Metric Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
          <div className="p-4 bg-[#FBFBFA] border border-[#E2E4E0] rounded-[0.25rem]">
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8A909A]">
              Monthly Subscription Burn
            </span>
            <div className="text-[22px] font-bold text-[#121316] num-tabular mt-1.5">
              {formatCurrency(monthlyTotal, currencyCode)}
            </div>
            <div className="text-[11px] text-[#52565E] mt-1">
              Active commitments normalized to monthly rate
            </div>
          </div>

          <div className="p-4 bg-[#FBFBFA] border border-[#E2E4E0] rounded-[0.25rem]">
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8A909A]">
              Annualized Commitment
            </span>
            <div className="text-[22px] font-bold text-[#121316] num-tabular mt-1.5">
              {formatCurrency(yearlyTotal, currencyCode)}
            </div>
            <div className="text-[11px] text-[#52565E] mt-1">
              Projected 12-month recurring cash outflow
            </div>
          </div>

          <div className="p-4 bg-[#FBFBFA] border border-[#E2E4E0] rounded-[0.25rem]">
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8A909A]">
              Active Subscriptions
            </span>
            <div className="text-[22px] font-bold text-[#1B4332] num-tabular mt-1.5">
              {activeItems.length} of {recurring.length}
            </div>
            <div className="text-[11px] text-[#2D6A4F] mt-1 font-medium">
              {recurring.length - activeItems.length} paused or inactive
            </div>
          </div>
        </div>
      </div>

      {/* Subscriptions Ledger Table */}
      <div className="bg-[#FFFFFF] border border-[#E2E4E0] rounded-[0.5rem] overflow-hidden">
        <div className="p-6 pb-4 flex items-center justify-between border-b border-[#E2E4E0] bg-[#FFFFFF]">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8A909A]">
              Schedule
            </span>
            <h3 className="text-[18px] font-bold text-[#121316]">
              Configured Recurring Commitments
            </h3>
          </div>
          <span className="text-[12px] font-medium text-[#52565E]">
            {recurring.length} Total Registered
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F4F4F2] border-b border-[#E2E4E0] text-[11px] font-bold uppercase tracking-wider text-[#52565E] select-none">
                <th className="py-2.5 px-4">Service & Plan</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4">Payment Method</th>
                <th className="py-2.5 px-4">Frequency</th>
                <th className="py-2.5 px-4">Next Due Date</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 px-4 text-right">Amount</th>
                <th className="py-2.5 px-4 text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recurring.map((item) => {
                const isActive = item.status === 'active';

                return (
                  <tr
                    key={item.id}
                    className="h-12 border-b border-[#E2E4E0] hover:bg-[#FBFBFA] text-[13px] text-[#121316] transition-colors"
                    style={{ height: '48px' }}
                  >
                    <td className="py-2 px-4">
                      <div className="font-bold text-[#121316]">{item.name}</div>
                      {item.notes && (
                        <div className="text-[11px] text-[#8A909A] truncate max-w-xs">{item.notes}</div>
                      )}
                    </td>

                    <td className="py-2 px-4">
                      <SemanticBadge variant="category">{item.category}</SemanticBadge>
                    </td>

                    <td className="py-2 px-4 text-[#52565E] font-medium">
                      {item.paymentMethod}
                    </td>

                    <td className="py-2 px-4 capitalize font-medium text-[#52565E]">
                      {item.frequency}
                    </td>

                    <td className="py-2 px-4 num-tabular font-medium text-[#121316]">
                      {item.nextPaymentDate}
                    </td>

                    <td className="py-2 px-4 text-center">
                      <button
                        onClick={() => toggleStatus(item.id, item.status)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                          isActive
                            ? 'bg-[#ECFDF5] text-[#1B4332] border border-[#A7F3D0]'
                            : 'bg-[#F4F4F2] text-[#8A909A] border border-[#E2E4E0]'
                        }`}
                        title="Click to toggle active/pause"
                      >
                        {isActive ? <CheckCircle2 className="w-3 h-3 text-[#10B981]" /> : <PauseCircle className="w-3 h-3" />}
                        {isActive ? 'Active' : 'Paused'}
                      </button>
                    </td>

                    <td className="py-2 px-4 text-right font-bold num-tabular text-[14px]">
                      {formatCurrency(item.amount, currencyCode)}
                    </td>

                    <td className="py-2 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1 text-[#52565E] hover:text-[#121316] rounded transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteRecurring(item.id)}
                          className="p-1 text-[#EF4444] hover:text-[#DC2626] rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Recurring Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#121316]/40 backdrop-blur-[2px]">
          <div className="w-full max-w-md bg-[#FFFFFF] border border-[#E2E4E0] rounded-[0.75rem] elevation-overlay overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E4E0] bg-[#F4F4F2]">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8A909A]">
                  Subscription Form
                </span>
                <h3 className="text-[17px] font-bold text-[#121316]">
                  {editingId ? 'Edit Recurring Payment' : 'New Recurring Payment'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 inline-flex items-center justify-center text-[#52565E] hover:text-[#121316] rounded-[0.25rem]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[12px] font-semibold uppercase tracking-[0.02em] text-[#52565E] mb-1">
                  Name / Provider
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Netflix, Rent, Cult.fit"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-10 px-3 bg-[#FFFFFF] border border-[#E2E4E0] rounded-[0.25rem] text-[14px] text-[#121316] input-focus-ring"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-semibold uppercase tracking-[0.02em] text-[#52565E] mb-1">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="1499.00"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    className="w-full h-10 px-3 bg-[#FFFFFF] border border-[#E2E4E0] rounded-[0.25rem] text-[14px] text-[#121316] num-tabular input-focus-ring"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-semibold uppercase tracking-[0.02em] text-[#52565E] mb-1">
                    Frequency
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as any)}
                    className="w-full h-10 px-3 bg-[#FFFFFF] border border-[#E2E4E0] rounded-[0.25rem] text-[14px] text-[#121316] input-focus-ring"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-semibold uppercase tracking-[0.02em] text-[#52565E] mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full h-10 px-3 bg-[#FFFFFF] border border-[#E2E4E0] rounded-[0.25rem] text-[14px] text-[#121316] input-focus-ring"
                  >
                    {PAYMENT_METHODS.map((pm) => (
                      <option key={pm} value={pm}>
                        {pm}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold uppercase tracking-[0.02em] text-[#52565E] mb-1">
                    Next Payment Date
                  </label>
                  <input
                    type="date"
                    required
                    value={nextPaymentDate}
                    onChange={(e) => setNextPaymentDate(e.target.value)}
                    className="w-full h-10 px-3 bg-[#FFFFFF] border border-[#E2E4E0] rounded-[0.25rem] text-[14px] text-[#121316] input-focus-ring"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-semibold uppercase tracking-[0.02em] text-[#52565E] mb-1">
                  Category
                </label>
                <input
                  type="text"
                  placeholder="Digital & Subscriptions, Health, Rent"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-10 px-3 bg-[#FFFFFF] border border-[#E2E4E0] rounded-[0.25rem] text-[14px] text-[#121316] input-focus-ring"
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold uppercase tracking-[0.02em] text-[#52565E] mb-1">
                  Memo / Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Auto-debit from ICICI card"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full h-10 px-3 bg-[#FFFFFF] border border-[#E2E4E0] rounded-[0.25rem] text-[14px] text-[#121316] input-focus-ring"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E2E4E0]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-[13px] font-medium text-[#121316] bg-transparent border border-[#E2E4E0] rounded-[0.25rem] hover:bg-[#F4F4F2]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-[13px] font-semibold text-white bg-[#1B4332] rounded-[0.25rem] hover:bg-[#2D6A4F]"
                >
                  {editingId ? 'Update Subscription' : 'Save Recurring'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
