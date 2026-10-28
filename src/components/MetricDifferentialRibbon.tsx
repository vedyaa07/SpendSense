import React from 'react';
import { formatPercentage } from '../utils/formatters';

interface MetricDifferentialRibbonProps {
  deltaPct: number;
  periodText?: string;
  inverse?: boolean; // if true, positive is bad (like expenses increasing)
  className?: string;
}

export const MetricDifferentialRibbon: React.FC<MetricDifferentialRibbonProps> = ({
  deltaPct,
  periodText = 'vs last month',
  inverse = false,
  className = '',
}) => {
  const isPositive = deltaPct > 0;
  const isZero = deltaPct === 0;

  // For expenses: delta > 0 is overspending (bad -> red/negative).
  // For income/net worth: delta > 0 is good -> green/positive.
  const isGood = inverse ? !isPositive : isPositive;

  let textColor = '#2D6A4F';
  if (!isZero) {
    textColor = isGood ? '#1B4332' : '#991B1B';
  } else {
    textColor = '#52565E';
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 text-[12px] font-medium leading-none ${className}`}
      style={{ color: textColor }}
    >
      <span className="inline-flex items-center justify-center w-3 h-3 text-[12px] font-semibold leading-none">
        {isZero ? '—' : isPositive ? '↑' : '↓'}
      </span>
      <span className="num-tabular font-medium">{formatPercentage(deltaPct, { showSign: true })}</span>
      {periodText && (
        <span className="text-[#8A909A] font-normal text-[11px] tracking-normal">
          {periodText}
        </span>
      )}
    </div>
  );
};
