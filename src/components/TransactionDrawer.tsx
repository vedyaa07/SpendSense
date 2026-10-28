import React from 'react';
import { Account, CurrencyCode, Transaction } from '../types/finance';
import { formatCurrency } from '../utils/formatters';
import { SemanticBadge } from './SemanticBadge';
import { X, Trash2, Edit3, ArrowUpRight, ArrowDownRight, CheckCircle2, Clock } from 'lucide-react';

interface TransactionDrawerProps {
  transaction: Transaction | null;
  account?: Account;
  currencyCode: CurrencyCode;
  onClose: () => void;
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
}

export const TransactionDrawer: React.FC<TransactionDrawerProps> = ({
  transaction,
  account,
  currencyCode,
  onClose,
  onEdit,
  onDelete,
}) => {
  if (!transaction) return null;

  const isIncome = transaction.type === 'income';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-[#121316]/30 backdrop-blur-[2px]">
      <div
        className="w-full max-w-md h-full bg-[#FFFFFF] border-l border-[#E2E4E0] flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-200"
        role="dialog"
      >
        {/* Top Header */}
        <div className="p-6 border-b border-[#E2E4E0] bg-[#F4F4F2]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8A909A]">
              Ledger Audit Detail
            </span>
            <button
              onClick={onClose}
              className="w-8 h-8 inline-flex items-center justify-center text-[#52565E] hover:text-[#121316] hover:bg-[#E2E4E0]/50 rounded-[0.25rem] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <div className={`text-[32px] font-semibold num-tabular tracking-tight ${isIncome ? 'text-[#1B4332]' : 'text-[#121316]'}`}>
              {formatCurrency(transaction.amount, currencyCode, { showPlusSign: true })}
            </div>
            <div className="flex items-center">
              {isIncome ? (
                <ArrowDownRight className="w-5 h-5 text-[#10B981]" />
              ) : (
                <ArrowUpRight className="w-5 h-5 text-[#EF4444]" />
              )}
            </div>
          </div>

          <div className="text-[18px] font-medium text-[#121316]">{transaction.merchant}</div>
          <div className="text-[13px] text-[#52565E] mt-0.5">{transaction.description}</div>
        </div>

        {/* Audit Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Metadata Grid */}
          <div className="border border-[#E2E4E0] rounded-[0.5rem] p-4 bg-[#FFFFFF] space-y-3">
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-[#8A909A] font-medium">Posting Date</span>
              <span className="text-[#121316] font-medium num-tabular">{transaction.date}</span>
            </div>

            <div className="border-t border-[#E2E4E0] pt-2 flex items-center justify-between text-[13px]">
              <span className="text-[#8A909A] font-medium">Category</span>
              <SemanticBadge variant="category">{transaction.category}</SemanticBadge>
            </div>

            <div className="border-t border-[#E2E4E0] pt-2 flex items-center justify-between text-[13px]">
              <span className="text-[#8A909A] font-medium">Reconciliation</span>
              <div className="flex items-center gap-1.5">
                {transaction.status === 'cleared' && (
                  <SemanticBadge variant="positive" icon={<CheckCircle2 className="w-3 h-3" />}>
                    Cleared
                  </SemanticBadge>
                )}
                {transaction.status === 'reconciled' && (
                  <SemanticBadge variant="positive" icon={<CheckCircle2 className="w-3 h-3" />}>
                    Reconciled
                  </SemanticBadge>
                )}
                {transaction.status === 'pending' && (
                  <SemanticBadge variant="warning" icon={<Clock className="w-3 h-3" />}>
                    Pending Settlement
                  </SemanticBadge>
                )}
              </div>
            </div>

            <div className="border-t border-[#E2E4E0] pt-2 flex items-center justify-between text-[13px]">
              <span className="text-[#8A909A] font-medium">Source Account</span>
              <span className="text-[#121316] font-medium">
                {account ? `${account.name} (${account.accountNumberMask})` : 'Unknown Account'}
              </span>
            </div>

            <div className="border-t border-[#E2E4E0] pt-2 flex items-center justify-between text-[13px]">
              <span className="text-[#8A909A] font-medium">Payment Method</span>
              <span className="text-[#121316] font-semibold">
                {transaction.paymentMethod || 'UPI'}
              </span>
            </div>

            <div className="border-t border-[#E2E4E0] pt-2 flex items-center justify-between text-[13px]">
              <span className="text-[#8A909A] font-medium">Tax Schedule</span>
              <span className="text-[13px] font-medium text-[#121316]">
                {transaction.taxDeductible ? (
                  <span className="text-[#1B4332] font-semibold">Eligible Deduction</span>
                ) : (
                  <span className="text-[#8A909A]">Standard Personal</span>
                )}
              </span>
            </div>
          </div>

          {/* Tags */}
          {transaction.tags && transaction.tags.length > 0 && (
            <div>
              <span className="block text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8A909A] mb-2">
                Categorical Tags
              </span>
              <div className="flex flex-wrap gap-1.5">
                {transaction.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 text-[11px] font-medium bg-[#F4F4F2] text-[#52565E] border border-[#E2E4E0] rounded-[2px]"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {transaction.notes && (
            <div>
              <span className="block text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8A909A] mb-1">
                Audit Memorandum
              </span>
              <p className="text-[13px] text-[#52565E] leading-relaxed p-3 bg-[#F4F4F2] border border-[#E2E4E0] rounded-[0.25rem]">
                {transaction.notes}
              </p>
            </div>
          )}

          {/* Hash & Ledger ID */}
          <div className="p-3 bg-[#FBFBFA] border border-[#E2E4E0] rounded-[0.25rem] text-[11px] text-[#8A909A] font-mono-data">
            <div>Ledger ID: {transaction.id}</div>
            <div className="mt-1">Batch SHA: 7f8a329e41b..c9</div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-[#E2E4E0] bg-[#FFFFFF] flex items-center justify-between">
          <button
            onClick={() => onDelete(transaction.id)}
            className="flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-[#C62828] border border-[#EF4444]/40 hover:bg-[#FEF2F2] rounded-[0.25rem] transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Entry
          </button>

          <button
            onClick={() => onEdit(transaction)}
            className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-[#121316] bg-[#F4F4F2] border border-[#E2E4E0] hover:bg-[#E2E4E0] rounded-[0.25rem] transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Modify Record
          </button>
        </div>
      </div>
    </div>
  );
};
