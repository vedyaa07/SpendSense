import React from 'react';
import { CurrencyCode } from '../types/finance';
import { formatCurrency, getGaugeColor } from '../utils/formatters';

interface BudgetDepletionGaugeProps {
  name?: string;
  categoryGroup?: string;
  spent: number;
  allocated: number;
  currencyCode?: CurrencyCode;
  showDetails?: boolean;
  compact?: boolean;
  className?: string;
}

export const BudgetDepletionGauge: React.FC<BudgetDepletionGaugeProps> = ({
  name,
  categoryGroup,
  spent,
  allocated,
  currencyCode = 'INR',
  showDetails = true,
  compact = false,
  className = '',
}) => {
  const percent = allocated > 0 ? (spent / allocated) * 100 : 0;
  const { barColor, status } = getGaugeColor(percent);
  const remaining = allocated - spent;
  const isOverdrawn = remaining < 0;

  // Clamped width for the 4px track
  const barWidth = Math.min(Math.max(percent, 0), 100);

  return (
    <div className={`w-full ${className}`}>
      {showDetails && (
        <div className="flex items-baseline justify-between mb-2">
          <div className="flex flex-col">
            {name && (
              <span className="text-[14px] font-medium text-[#121316] leading-tight flex items-center gap-2">
                {name}
                {status === 'overdrawn' && (
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-[2px] bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]">
                    Exceeded
                  </span>
                )}
                {status === 'warning' && (
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-[2px] bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]">
                    85%+ Capacity
                  </span>
                )}
              </span>
            )}
            {categoryGroup && !compact && (
              <span className="text-[11px] uppercase tracking-[0.04em] text-[#8A909A] font-medium mt-0.5">
                {categoryGroup}
              </span>
            )}
          </div>

          <div className="text-right">
            <div className="text-[13px] font-medium num-tabular">
              <span className={status === 'overdrawn' ? 'text-[#C62828] font-semibold' : 'text-[#121316]'}>
                {formatCurrency(spent, currencyCode)}
              </span>
              <span className="text-[#8A909A] font-normal mx-1">/</span>
              <span className="text-[#52565E]">{formatCurrency(allocated, currencyCode)}</span>
            </div>
            {!compact && (
              <div className="text-[11px] num-tabular text-[#8A909A] mt-0.5">
                {isOverdrawn ? (
                  <span className="text-[#C62828] font-medium">
                    +{formatCurrency(Math.abs(remaining), currencyCode)} over
                  </span>
                ) : (
                  <span>{formatCurrency(remaining, currencyCode)} left ({percent.toFixed(0)}%)</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SpendSense 4px tall minimal horizontal track with #E2E4E0 background */}
      <div
        className="w-full h-1 bg-[#E2E4E0] relative overflow-hidden"
        style={{ height: '4px' }}
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full transition-all duration-500 ease-out"
          style={{
            width: `${barWidth}%`,
            backgroundColor: barColor,
          }}
        />
      </div>
    </div>
  );
};
