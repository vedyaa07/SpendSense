import React, { useState } from 'react';
import { BudgetCategory, CurrencyCode } from '../../types/finance';
import { formatCurrency, getGaugeColor } from '../../utils/formatters';
import { BudgetDepletionGauge } from '../BudgetDepletionGauge';
import { Plus, Edit2, AlertTriangle, CheckCircle, X } from 'lucide-react';

interface BudgetsScreenProps {
  budgets: BudgetCategory[];
  currencyCode: CurrencyCode;
  onUpdateBudget: (id: string, newAllocated: number) => void;
  onAddBudget: (category: Omit<BudgetCategory, 'id' | 'spent'>) => void;
  onOpenNewTransaction: () => void;
}

export const BudgetsScreen: React.FC<BudgetsScreenProps> = ({
  budgets,
  currencyCode,
  onUpdateBudget,
  onAddBudget,
  onOpenNewTransaction,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAllocatedStr, setEditAllocatedStr] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatAllocated, setNewCatAllocated] = useState('');
  const [newCatGroup, setNewCatGroup] = useState<BudgetCategory['categoryGroup']>('Essential Living');

  // Overall totals
  const totalAllocated = budgets.reduce((acc, b) => acc + b.allocated, 0);
  const totalSpent = budgets.reduce((acc, b) => acc + b.spent, 0);
  const totalRemaining = totalAllocated - totalSpent;
  const overallBurnPct = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

  // Overspent and warning categories
  const overspentCategories = budgets.filter((b) => b.spent > b.allocated);
  const warningCategories = budgets.filter((b) => b.spent >= b.allocated * 0.85 && b.spent <= b.allocated);

  const startEdit = (b: BudgetCategory) => {
    setEditingId(b.id);
    setEditAllocatedStr(b.allocated.toString());
  };

  const saveEdit = (id: string) => {
    const val = parseFloat(editAllocatedStr);
    if (!isNaN(val) && val >= 0) {
      onUpdateBudget(id, val);
    }
    setEditingId(null);
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(newCatAllocated);
    if (!newCatName.trim() || isNaN(val) || val <= 0) return;

    onAddBudget({
      name: newCatName.trim(),
      allocated: val,
      categoryGroup: newCatGroup,
      period: 'monthly',
    });

    setNewCatName('');
    setNewCatAllocated('');
    setIsAddModalOpen(false);
  };

  const groups: BudgetCategory['categoryGroup'][] = [
    'Essential Living',
    'Discretionary',
    'Subscriptions & Tech',
    'Savings & Investments',
  ];

  return (
    <div className="space-y-6">
      {/* Top Envelope Header Card */}
      <div className="bg-[#FFFFFF] border border-[#E2E4E0] rounded-[0.5rem] p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[#E2E4E0]">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8A909A]">
              Personal Expense Budgets
            </span>
            <h1 className="text-[28px] sm:text-[34px] font-bold text-[#121316] tracking-tight leading-tight">
              Monthly Category Budgets
            </h1>
            <p className="text-[13px] text-[#52565E] mt-1.5 max-w-2xl">
              Track allocated spending limits with minimal 4px depletion tracks. Warnings trigger automatically at 85% capacity with overspending alerts.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium text-[#121316] bg-[#F4F4F2] border border-[#E2E4E0] hover:bg-[#E2E4E0] rounded-[0.25rem] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New Budget
            </button>
            <button
              onClick={onOpenNewTransaction}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-semibold text-white bg-[#1B4332] hover:bg-[#2D6A4F] rounded-[0.25rem] transition-colors shadow-xs"
            >
              + Record Expense
            </button>
          </div>
        </div>

        {/* Macro Gauge Progress & Summary Banner */}
        <div className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between mb-3 gap-2">
            <div>
              <span className="text-[13px] font-bold text-[#121316]">
                Total Monthly Budget Depletion
              </span>
              <span className="text-[12px] text-[#8A909A] ml-2 num-tabular">
                ({overallBurnPct.toFixed(1)}% burned across {budgets.length} categories)
              </span>
            </div>
            <div className="text-[14px] font-bold num-tabular text-right">
              <span className="text-[#121316]">{formatCurrency(totalSpent, currencyCode)}</span>
              <span className="text-[#8A909A] font-normal mx-1.5">spent of</span>
              <span className="text-[#52565E]">{formatCurrency(totalAllocated, currencyCode)}</span>
            </div>
          </div>

          <BudgetDepletionGauge
            spent={totalSpent}
            allocated={totalAllocated}
            currencyCode={currencyCode}
            showDetails={false}
          />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-[#E2E4E0]">
            <div>
              <span className="text-[11px] uppercase tracking-[0.04em] text-[#8A909A] font-semibold">
                Total Remaining Cushion
              </span>
              <div className={`text-[18px] font-bold num-tabular mt-1 ${totalRemaining >= 0 ? 'text-[#1B4332]' : 'text-[#C62828]'}`}>
                {formatCurrency(totalRemaining, currencyCode)}
              </div>
            </div>

            <div>
              <span className="text-[11px] uppercase tracking-[0.04em] text-[#8A909A] font-semibold">
                Average Daily Burn
              </span>
              <div className="text-[18px] font-bold text-[#121316] num-tabular mt-1">
                {formatCurrency(totalSpent / 27, currencyCode)} / day
              </div>
            </div>

            <div>
              <span className="text-[11px] uppercase tracking-[0.04em] text-[#8A909A] font-semibold">
                Active Categories
              </span>
              <div className="text-[18px] font-bold text-[#121316] num-tabular mt-1">
                {budgets.length} Envelopes
              </div>
            </div>

            <div>
              <span className="text-[11px] uppercase tracking-[0.04em] text-[#8A909A] font-semibold">
                Overall Health
              </span>
              <div className="text-[18px] font-bold text-[#2D6A4F] num-tabular mt-1 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-[#10B981]" />
                Disciplined
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Warnings & Threshold Notices */}
      {(overspentCategories.length > 0 || warningCategories.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {overspentCategories.map((b) => (
            <div
              key={b.id}
              className="p-4 bg-[#FEF2F2] border border-[#FECACA] rounded-[0.25rem] flex items-start gap-3"
            >
              <AlertTriangle className="w-5 h-5 text-[#C62828] shrink-0 mt-0.5" />
              <div>
                <h4 className="text-[14px] font-bold text-[#991B1B]">
                  Overdrawn: {b.name}
                </h4>
                <p className="text-[12px] text-[#7F1D1D] mt-0.5 leading-relaxed">
                  Spent {formatCurrency(b.spent, currencyCode)} against {formatCurrency(b.allocated, currencyCode)} limit (+{formatCurrency(b.spent - b.allocated, currencyCode)} over budget).
                </p>
              </div>
            </div>
          ))}

          {warningCategories.map((b) => (
            <div
              key={b.id}
              className="p-4 bg-[#FFFBEB] border border-[#FDE68A] rounded-[0.25rem] flex items-start gap-3"
            >
              <AlertTriangle className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
              <div>
                <h4 className="text-[14px] font-bold text-[#92400E]">
                  Warning (85%+): {b.name}
                </h4>
                <p className="text-[12px] text-[#78350F] mt-0.5 leading-relaxed">
                  Remaining cushion is only {formatCurrency(b.allocated - b.spent, currencyCode)} with days remaining in current cycle.
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Categorized Envelopes Grid */}
      <div className="space-y-6">
        {groups.map((group) => {
          const groupBudgets = budgets.filter((b) => b.categoryGroup === group);
          if (groupBudgets.length === 0) return null;

          const groupAllocated = groupBudgets.reduce((acc, b) => acc + b.allocated, 0);
          const groupSpent = groupBudgets.reduce((acc, b) => acc + b.spent, 0);

          return (
            <div key={group} className="bg-[#FFFFFF] border border-[#E2E4E0] rounded-[0.5rem] p-6">
              <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#E2E4E0]">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8A909A]">
                    Category Tier
                  </span>
                  <h3 className="text-[16px] font-bold text-[#121316]">{group}</h3>
                </div>
                <div className="text-right text-[13px] font-bold num-tabular text-[#52565E]">
                  <span>{formatCurrency(groupSpent, currencyCode)}</span>
                  <span className="text-[#8A909A] font-normal mx-1">/</span>
                  <span>{formatCurrency(groupAllocated, currencyCode)}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                {groupBudgets.map((category) => {
                  const percent = category.allocated > 0 ? (category.spent / category.allocated) * 100 : 0;
                  const { status } = getGaugeColor(percent);
                  const isEditing = editingId === category.id;

                  return (
                    <div
                      key={category.id}
                      className="p-4 bg-[#FBFBFA] border border-[#E2E4E0] rounded-[0.25rem] relative group"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="text-[14px] font-bold text-[#121316] flex items-center gap-2">
                            {category.name}
                            {status === 'overdrawn' && (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA] rounded-[2px]">
                                Exceeded
                              </span>
                            )}
                            {status === 'warning' && (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A] rounded-[2px]">
                                85%+ Burn
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#8A909A] mt-0.5 num-tabular">
                            {percent.toFixed(1)}% depleted
                          </div>
                        </div>

                        {/* Edit Button */}
                        <button
                          onClick={() => startEdit(category)}
                          className="opacity-0 group-hover:opacity-100 text-[#52565E] hover:text-[#121316] transition-opacity p-1"
                          title="Adjust allocation limit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {isEditing ? (
                        <div className="mb-3 p-2 bg-[#FFFFFF] border border-[#1B4332] rounded-[0.25rem]">
                          <label className="block text-[10px] uppercase font-bold text-[#52565E] mb-1">
                            Set New Budget Limit
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={editAllocatedStr}
                              onChange={(e) => setEditAllocatedStr(e.target.value)}
                              className="h-8 px-2 border border-[#E2E4E0] text-[13px] rounded-[0.25rem] w-full num-tabular input-focus-ring"
                            />
                            <button
                              onClick={() => saveEdit(category.id)}
                              className="px-2.5 py-1 text-[12px] bg-[#1B4332] text-white rounded-[0.25rem] font-semibold"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-2 py-1 text-[12px] text-[#52565E] hover:bg-[#F4F4F2] rounded-[0.25rem]"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-baseline justify-between text-[13px] mb-2 num-tabular">
                          <span className="text-[#52565E]">
                            Spent: <strong className="text-[#121316] font-semibold">{formatCurrency(category.spent, currencyCode)}</strong>
                          </span>
                          <span className="text-[#52565E]">
                            Limit: <strong className="text-[#121316] font-semibold">{formatCurrency(category.allocated, currencyCode)}</strong>
                          </span>
                        </div>
                      )}

                      <BudgetDepletionGauge
                        spent={category.spent}
                        allocated={category.allocated}
                        currencyCode={currencyCode}
                        showDetails={false}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add New Category Budget Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#121316]/40 backdrop-blur-[2px]">
          <div className="w-full max-w-md bg-[#FFFFFF] border border-[#E2E4E0] rounded-[0.75rem] elevation-overlay overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E4E0] bg-[#F4F4F2]">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8A909A]">
                  New Budget Limit
                </span>
                <h3 className="text-[17px] font-bold text-[#121316]">
                  Create Category Budget
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 inline-flex items-center justify-center text-[#52565E] hover:text-[#121316] rounded-[0.25rem]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="p-6 space-y-4">
              <div>
                <label className="block text-[12px] font-semibold uppercase tracking-[0.02em] text-[#52565E] mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Travel & Vacations, Personal Care"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full h-10 px-3 bg-[#FFFFFF] border border-[#E2E4E0] rounded-[0.25rem] text-[14px] text-[#121316] input-focus-ring"
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold uppercase tracking-[0.02em] text-[#52565E] mb-1">
                  Monthly Limit Amount (₹)
                </label>
                <input
                  type="number"
                  required
                  placeholder="15000"
                  value={newCatAllocated}
                  onChange={(e) => setNewCatAllocated(e.target.value)}
                  className="w-full h-10 px-3 bg-[#FFFFFF] border border-[#E2E4E0] rounded-[0.25rem] text-[14px] text-[#121316] num-tabular input-focus-ring"
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold uppercase tracking-[0.02em] text-[#52565E] mb-1">
                  Category Group
                </label>
                <select
                  value={newCatGroup}
                  onChange={(e) => setNewCatGroup(e.target.value as BudgetCategory['categoryGroup'])}
                  className="w-full h-10 px-3 bg-[#FFFFFF] border border-[#E2E4E0] rounded-[0.25rem] text-[14px] text-[#121316] input-focus-ring"
                >
                  <option value="Essential Living">Essential Living</option>
                  <option value="Discretionary">Discretionary</option>
                  <option value="Subscriptions & Tech">Subscriptions & Tech</option>
                  <option value="Savings & Investments">Savings & Investments</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E2E4E0]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-[13px] font-medium text-[#121316] bg-transparent border border-[#E2E4E0] rounded-[0.25rem] hover:bg-[#F4F4F2]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-[13px] font-semibold text-white bg-[#1B4332] rounded-[0.25rem] hover:bg-[#2D6A4F]"
                >
                  Create Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
