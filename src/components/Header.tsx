import React, { useState } from 'react';
import { CurrencyCode, UserProfile } from '../types/finance';
import { CURRENCIES } from '../utils/formatters';
import {
  Plus,
  RotateCcw,
  Calendar,
  Sparkles,
  ChevronDown,
  User,
  Menu,
  X,
  CreditCard,
  Bot,
  LayoutDashboard,
  Receipt,
  PiggyBank,
  FileBarChart2,
  RefreshCw,
  Settings as SettingsIcon,
} from 'lucide-react';

interface HeaderProps {
  currentPeriod: string;
  onPeriodChange: (period: string) => void;
  currencyCode: CurrencyCode;
  onCurrencyChange: (code: CurrencyCode) => void;
  onOpenNewTransaction: () => void;
  onResetData: () => void;
  activeTab: string;
  onTabChange: (tabId: string) => void;
  userProfile: UserProfile;
}

export const Header: React.FC<HeaderProps> = ({
  currentPeriod,
  onPeriodChange,
  currencyCode,
  onCurrencyChange,
  onOpenNewTransaction,
  onResetData,
  activeTab,
  onTabChange,
  userProfile,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const periods = ['October 2026', 'September 2026', 'August 2026', 'Q3 2026', 'Full Year 2026'];

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
    { id: 'transactions', label: 'Transactions', icon: <Receipt className="w-3.5 h-3.5" /> },
    { id: 'budgets', label: 'Budgets', icon: <PiggyBank className="w-3.5 h-3.5" /> },
    { id: 'ai-advisor', label: 'AI Advisor', icon: <Sparkles className="w-3.5 h-3.5 text-[#2D6A4F]" />, highlight: true },
    { id: 'reports', label: 'Reports', icon: <FileBarChart2 className="w-3.5 h-3.5" /> },
    { id: 'recurring', label: 'Recurring Payments', icon: <RefreshCw className="w-3.5 h-3.5" /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon className="w-3.5 h-3.5" /> },
  ];

  const handleNavClick = (tabId: string) => {
    onTabChange(tabId);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FFFFFF] border-b border-[#E2E4E0]">
      {/* Top Utility & Brand Bar */}
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 border-b border-[#E2E4E0]/60">
          {/* Brand Identity */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleNavClick('dashboard')}
              className="flex items-center gap-2.5 text-left group"
            >
              <div className="w-8 h-8 rounded-[0.25rem] bg-[#1B4332] flex items-center justify-center text-white font-semibold text-[15px] tracking-wider select-none shadow-xs group-hover:bg-[#2D6A4F] transition-colors">
                S
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-[17px] font-semibold text-[#121316] tracking-tight">
                    SpendSense
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-[2px] bg-[#ECFDF5] text-[#1B4332] border border-[#A7F3D0]">
                    <Sparkles className="w-2.5 h-2.5 text-[#10B981]" />
                    AI-Powered
                  </span>
                </div>
                <span className="text-[11px] text-[#52565E] font-medium hidden sm:block">
                  Smart Personal Expense Tracker
                </span>
              </div>
            </button>
          </div>

          {/* Center / Right Control Cluster */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Period Selector */}
            <div className="relative hidden md:inline-flex items-center">
              <Calendar className="w-3.5 h-3.5 absolute left-2.5 text-[#8A909A] pointer-events-none" />
              <select
                value={currentPeriod}
                onChange={(e) => onPeriodChange(e.target.value)}
                className="h-9 pl-8 pr-7 text-[13px] font-medium text-[#121316] bg-[#F4F4F2] border border-[#E2E4E0] rounded-[0.25rem] appearance-none input-focus-ring cursor-pointer"
              >
                {periods.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2 text-[#8A909A] pointer-events-none" />
            </div>

            {/* Currency Selector */}
            <select
              value={currencyCode}
              onChange={(e) => onCurrencyChange(e.target.value as CurrencyCode)}
              className="h-9 px-2 text-[13px] font-semibold text-[#121316] bg-[#F4F4F2] border border-[#E2E4E0] rounded-[0.25rem] input-focus-ring cursor-pointer num-tabular"
            >
              {(Object.keys(CURRENCIES) as CurrencyCode[]).map((c) => (
                <option key={c} value={c}>
                  {CURRENCIES[c].symbol} {c}
                </option>
              ))}
            </select>

            {/* User Profile / Auth State Pill */}
            <button
              onClick={() => handleNavClick('settings')}
              className="hidden lg:inline-flex items-center gap-1.5 h-9 px-2.5 text-[12px] font-medium text-[#121316] bg-[#F4F4F2] hover:bg-[#E2E4E0] border border-[#E2E4E0] rounded-[0.25rem] transition-colors"
              title="Account & Auth Settings"
            >
              <div className="w-5 h-5 rounded-full bg-[#1B4332] text-white flex items-center justify-center text-[10px] font-bold">
                {userProfile.name.charAt(0)}
              </div>
              <span className="max-w-[90px] truncate">{userProfile.name.split(' ')[0]}</span>
            </button>

            {/* Primary Action Button */}
            <button
              onClick={onOpenNewTransaction}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 text-[13px] font-medium text-white bg-[#1B4332] hover:bg-[#2D6A4F] active:bg-[#143326] rounded-[0.25rem] transition-colors shadow-xs select-none"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden sm:inline">Add Expense</span>
              <span className="sm:hidden">Add</span>
            </button>

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden w-9 h-9 inline-flex items-center justify-center border border-[#E2E4E0] rounded-[0.25rem] text-[#52565E] hover:text-[#121316] hover:bg-[#F4F4F2]"
            >
              {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Desktop Tab Navigation Ribbon: Dashboard, Transactions, Budgets, AI Advisor, Reports, Recurring Payments, Settings */}
        <nav className="hidden md:flex items-center space-x-1 sm:space-x-4 overflow-x-auto no-scrollbar pt-1">
          {navItems.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleNavClick(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-[13px] font-medium whitespace-nowrap border-b-2 transition-all relative ${
                  isActive
                    ? 'border-[#1B4332] text-[#1B4332] font-semibold'
                    : 'border-transparent text-[#52565E] hover:text-[#121316] hover:border-[#E2E4E0]'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.highlight && !isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Mobile Drawer Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-b border-[#E2E4E0] bg-[#FFFFFF] px-4 py-3 space-y-1 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="py-1 mb-2 border-b border-[#E2E4E0]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A909A]">
              Navigation
            </span>
          </div>
          {navItems.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleNavClick(tab.id)}
                className={`w-full flex items-center justify-between px-3 py-2 text-[13px] rounded-[0.25rem] transition-colors ${
                  isActive
                    ? 'bg-[#1B4332] text-white font-semibold'
                    : 'text-[#121316] hover:bg-[#F4F4F2]'
                }`}
              >
                <div className="flex items-center gap-2">
                  {tab.icon}
                  <span>{tab.label}</span>
                </div>
                {tab.highlight && !isActive && (
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-[#ECFDF5] text-[#1B4332]">
                    Smart
                  </span>
                )}
              </button>
            );
          })}
          <div className="pt-2 border-t border-[#E2E4E0] flex items-center justify-between text-[12px] text-[#52565E]">
            <span>Period: {currentPeriod}</span>
            <button
              onClick={() => {
                onResetData();
                setIsMobileMenuOpen(false);
              }}
              className="text-[#991B1B] hover:underline"
            >
              Reset Data
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
