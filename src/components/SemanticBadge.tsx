import React from 'react';

export type BadgeVariant = 'positive' | 'negative' | 'warning' | 'category' | 'neutral';

interface SemanticBadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const SemanticBadge: React.FC<SemanticBadgeProps> = ({
  variant,
  children,
  icon,
  className = '',
  onClick,
}) => {
  let styleClasses = '';

  switch (variant) {
    case 'positive':
      // Background #ECFDF5, text #1B4332, border 1px solid #A7F3D0
      styleClasses = 'bg-[#ECFDF5] text-[#1B4332] border-[#A7F3D0]';
      break;
    case 'negative':
      // Background #FEF2F2, text #991B1B, border 1px solid #FECACA
      styleClasses = 'bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]';
      break;
    case 'warning':
      // Background #FFFBEB, text #92400E, border 1px solid #FDE68A
      styleClasses = 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]';
      break;
    case 'category':
      // Background #F4F4F2, text #121316, border 1px solid #E2E4E0
      styleClasses = 'bg-[#F4F4F2] text-[#121316] border-[#E2E4E0]';
      break;
    case 'neutral':
    default:
      styleClasses = 'bg-[#F4F4F2] text-[#52565E] border-[#E2E4E0]';
      break;
  }

  const clickableClasses = onClick ? 'cursor-pointer hover:opacity-85 transition-opacity' : '';

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 h-6 px-2 text-[12px] font-medium border rounded-[0.25rem] select-none ${styleClasses} ${clickableClasses} ${className}`}
      style={{ height: '24px' }}
    >
      {icon && <span className="flex-shrink-0 text-[11px]">{icon}</span>}
      <span className="truncate">{children}</span>
    </span>
  );
};
