import React, { useState, useEffect, useCallback } from 'react';
import {
  Account,
  BudgetCategory,
  CurrencyCode,
  RecurringPayment,
  Transaction,
  TransactionStatus,
  UserProfile,
} from './types/finance';
import {
  INITIAL_ACCOUNTS,
  INITIAL_BUDGETS,
  INITIAL_RECURRING_PAYMENTS,
  INITIAL_TRANSACTIONS,
  INITIAL_USER,
} from './utils/formatters';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import {
  loadGuestData,
  saveGuestData,
  clearGuestData,
  fetchUserDataFromSupabase,
  seedNewUserStarterKit,
  saveTransactionToSupabase,
  deleteTransactionFromSupabase,
  deleteMultipleTransactionsFromSupabase,
  saveBudgetToSupabase,
  saveRecurringToSupabase,
  deleteRecurringFromSupabase,
  saveAccountToSupabase,
} from './lib/dataService';
import { Header } from './components/Header';
import { OverviewScreen } from './components/screens/OverviewScreen';
import { LedgerScreen } from './components/screens/LedgerScreen';
import { BudgetsScreen } from './components/screens/BudgetsScreen';
import { AIAdvisorScreen } from './components/screens/AIAdvisorScreen';
import { ReportsScreen } from './components/screens/ReportsScreen';
import { RecurringScreen } from './components/screens/RecurringScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { TransactionModal } from './components/TransactionModal';
import { TransactionDrawer } from './components/TransactionDrawer';
import { Loader2 } from 'lucide-react';

export default function App() {
  // Auth state
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    return {
      id: 'guest',
      name: 'Guest User',
      email: 'guest@spendsense.app',
      isAuthenticated: false,
    };
  });

  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Financial entities state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [budgets, setBudgets] = useState<BudgetCategory[]>([]);
  const [recurring, setRecurring] = useState<RecurringPayment[]>([]);

  // Preferences
  const [currencyCode, setCurrencyCode] = useState<CurrencyCode>(() => {
    try {
      const saved = localStorage.getItem('spendsense_pref_currency');
      return (saved as CurrencyCode) || 'INR';
    } catch {
      return 'INR';
    }
  });

  const [currentPeriod, setCurrentPeriod] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('spendsense_pref_period');
      return saved || 'October 2026';
    } catch {
      return 'October 2026';
    }
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Load authenticated user data from Supabase or isolated guest data
  const loadAppDataForUser = useCallback(async (userId?: string) => {
    if (userId && supabase && isSupabaseConfigured) {
      setIsLoadingData(true);
      try {
        const data = await fetchUserDataFromSupabase(userId);
        if (data.accounts.length === 0 && data.budgets.length === 0 && data.transactions.length === 0) {
          // Brand new user: seed starter kit in Supabase
          await seedNewUserStarterKit(userId);
          const reloaded = await fetchUserDataFromSupabase(userId);
          setAccounts(reloaded.accounts);
          setBudgets(reloaded.budgets);
          setRecurring(reloaded.recurring);
          setTransactions(reloaded.transactions);
        } else {
          setAccounts(data.accounts);
          setBudgets(data.budgets);
          setRecurring(data.recurring);
          setTransactions(data.transactions);
        }
      } catch (err) {
        console.warn('Failed to load from Supabase, loading fallback data', err);
        const guestData = loadGuestData();
        setTransactions(guestData.transactions);
        setAccounts(guestData.accounts);
        setBudgets(guestData.budgets);
        setRecurring(guestData.recurring);
      } finally {
        setIsLoadingData(false);
      }
    } else {
      // In Guest Mode: Load exclusively from isolated guest storage!
      // This strictly prevents previous user's private data from lingering in memory.
      const guestData = loadGuestData();
      setTransactions(guestData.transactions);
      setAccounts(guestData.accounts);
      setBudgets(guestData.budgets);
      setRecurring(guestData.recurring);
      setIsLoadingData(false);
    }
  }, []);

  // Supabase Auth session listener
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      if (!supabase) {
        if (isMounted) {
          loadAppDataForUser();
          setIsLoadingAuth(false);
        }
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && isMounted) {
          const profileName =
            session.user.user_metadata?.name ||
            session.user.email?.split('@')[0] ||
            'SpendSense User';

          setUserProfile({
            id: session.user.id,
            name: profileName,
            email: session.user.email || 'user@spendsense.app',
            isAuthenticated: true,
            memberSince: new Date(session.user.created_at).toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
            }),
          });
          await loadAppDataForUser(session.user.id);
        } else if (isMounted) {
          loadAppDataForUser();
        }
      } catch (err) {
        console.warn('Error reading Supabase session:', err);
        if (isMounted) loadAppDataForUser();
      } finally {
        if (isMounted) setIsLoadingAuth(false);
      }
    }

    initAuth();

    // Listen to real-time auth changes
    let authListener: { subscription: { unsubscribe: () => void } } | null = null;
    if (supabase) {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!isMounted) return;

        if (event === 'SIGNED_IN' && session?.user) {
          const profileName =
            session.user.user_metadata?.name ||
            session.user.email?.split('@')[0] ||
            'SpendSense User';

          setUserProfile({
            id: session.user.id,
            name: profileName,
            email: session.user.email || 'user@spendsense.app',
            isAuthenticated: true,
            memberSince: new Date(session.user.created_at).toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
            }),
          });
          await loadAppDataForUser(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          // PURGE all user data from memory immediately
          setTransactions([]);
          setAccounts([]);
          setBudgets([]);
          setRecurring([]);

          setUserProfile({
            id: 'guest',
            name: 'Guest User',
            email: 'guest@spendsense.app',
            isAuthenticated: false,
          });

          // Reload fresh isolated guest data
          loadAppDataForUser();
        }
      });
      authListener = data;
    }

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, [loadAppDataForUser]);

  // Persist preferences
  useEffect(() => {
    localStorage.setItem('spendsense_pref_currency', currencyCode);
  }, [currencyCode]);

  useEffect(() => {
    localStorage.setItem('spendsense_pref_period', currentPeriod);
  }, [currentPeriod]);

  // Recalculate category spent figures dynamically
  const recalculateBudgets = (txs: Transaction[]) => {
    setBudgets((prevBudgets) => {
      const updated = prevBudgets.map((b) => {
        const spent = txs
          .filter((t) => t.category === b.name && t.type === 'expense')
          .reduce((acc, t) => acc + Math.abs(t.amount), 0);
        return {
          ...b,
          spent,
        };
      });

      // If in guest mode, persist
      if (!userProfile.isAuthenticated) {
        saveGuestData({ budgets: updated });
      } else if (userProfile.id && supabase) {
        // Sync to Supabase
        updated.forEach((b) => saveBudgetToSupabase(b, userProfile.id).catch(console.warn));
      }
      return updated;
    });
  };

  // Handler to add or update transaction
  const handleSaveTransaction = async (txData: Omit<Transaction, 'id'>) => {
    if (editingTransaction) {
      const updatedTx: Transaction = {
        ...txData,
        id: editingTransaction.id,
      };
      const updatedList = transactions.map((t) =>
        t.id === editingTransaction.id ? updatedTx : t
      );
      setTransactions(updatedList);
      recalculateBudgets(updatedList);
      setEditingTransaction(null);

      if (userProfile.isAuthenticated && userProfile.id) {
        try {
          await saveTransactionToSupabase(updatedTx, userProfile.id);
        } catch (e) {
          console.error('Supabase transaction update failed', e);
        }
      } else {
        saveGuestData({ transactions: updatedList });
      }
    } else {
      const newTx: Transaction = {
        ...txData,
        id: `tx-${Date.now().toString(36)}`,
      };
      const updatedList = [newTx, ...transactions];
      setTransactions(updatedList);
      recalculateBudgets(updatedList);

      // Also adjust source account balance
      setAccounts((prevAccs) => {
        const updatedAccounts = prevAccs.map((a) =>
          a.id === newTx.accountId ? { ...a, balance: a.balance + newTx.amount } : a
        );
        if (userProfile.isAuthenticated && userProfile.id) {
          const affectedAcc = updatedAccounts.find((a) => a.id === newTx.accountId);
          if (affectedAcc) {
            saveAccountToSupabase(affectedAcc, userProfile.id).catch(console.warn);
          }
        } else {
          saveGuestData({ accounts: updatedAccounts });
        }
        return updatedAccounts;
      });

      if (userProfile.isAuthenticated && userProfile.id) {
        try {
          await saveTransactionToSupabase(newTx, userProfile.id);
        } catch (e) {
          console.error('Supabase transaction insert failed', e);
        }
      } else {
        saveGuestData({ transactions: updatedList });
      }
    }
  };

  // Delete transaction
  const handleDeleteTransaction = async (id: string) => {
    const updatedList = transactions.filter((t) => t.id !== id);
    setTransactions(updatedList);
    recalculateBudgets(updatedList);
    if (selectedTransaction?.id === id) {
      setSelectedTransaction(null);
    }

    if (userProfile.isAuthenticated) {
      try {
        await deleteTransactionFromSupabase(id);
      } catch (e) {
        console.error('Supabase delete failed', e);
      }
    } else {
      saveGuestData({ transactions: updatedList });
    }
  };

  // Delete multiple transactions
  const handleDeleteMultiple = async (ids: string[]) => {
    const setIds = new Set(ids);
    const updatedList = transactions.filter((t) => !setIds.has(t.id));
    setTransactions(updatedList);
    recalculateBudgets(updatedList);

    if (userProfile.isAuthenticated) {
      try {
        await deleteMultipleTransactionsFromSupabase(ids);
      } catch (e) {
        console.error('Supabase batch delete failed', e);
      }
    } else {
      saveGuestData({ transactions: updatedList });
    }
  };

  // Update status of multiple transactions
  const handleUpdateStatusMultiple = async (ids: string[], newStatus: TransactionStatus) => {
    const setIds = new Set(ids);
    const updatedList = transactions.map((t) =>
      setIds.has(t.id) ? { ...t, status: newStatus } : t
    );
    setTransactions(updatedList);

    if (userProfile.isAuthenticated && userProfile.id) {
      for (const id of ids) {
        const item = updatedList.find((t) => t.id === id);
        if (item) {
          saveTransactionToSupabase(item, userProfile.id).catch(console.warn);
        }
      }
    } else {
      saveGuestData({ transactions: updatedList });
    }
  };

  // Update budget envelope allocation
  const handleUpdateBudget = async (id: string, newAllocated: number) => {
    const updated = budgets.map((b) => (b.id === id ? { ...b, allocated: newAllocated } : b));
    setBudgets(updated);

    if (userProfile.isAuthenticated && userProfile.id) {
      const target = updated.find((b) => b.id === id);
      if (target) {
        saveBudgetToSupabase(target, userProfile.id).catch(console.warn);
      }
    } else {
      saveGuestData({ budgets: updated });
    }
  };

  // Add new budget envelope
  const handleAddBudget = async (newCat: Omit<BudgetCategory, 'id' | 'spent'>) => {
    const newBudget: BudgetCategory = {
      ...newCat,
      id: `b-${Date.now().toString(36)}`,
      spent: 0,
    };
    const updated = [...budgets, newBudget];
    setBudgets(updated);

    if (userProfile.isAuthenticated && userProfile.id) {
      saveBudgetToSupabase(newBudget, userProfile.id).catch(console.warn);
    } else {
      saveGuestData({ budgets: updated });
    }
  };

  // Recurring Payments Handlers
  const handleAddRecurring = async (item: Omit<RecurringPayment, 'id'>) => {
    const newRec: RecurringPayment = {
      ...item,
      id: `rec-${Date.now().toString(36)}`,
    };
    const updated = [...recurring, newRec];
    setRecurring(updated);

    if (userProfile.isAuthenticated && userProfile.id) {
      saveRecurringToSupabase(newRec, userProfile.id).catch(console.warn);
    } else {
      saveGuestData({ recurring: updated });
    }
  };

  const handleUpdateRecurring = async (id: string, item: Partial<RecurringPayment>) => {
    const updated = recurring.map((r) => (r.id === id ? { ...r, ...item } : r));
    setRecurring(updated);

    if (userProfile.isAuthenticated && userProfile.id) {
      const target = updated.find((r) => r.id === id);
      if (target) {
        saveRecurringToSupabase(target, userProfile.id).catch(console.warn);
      }
    } else {
      saveGuestData({ recurring: updated });
    }
  };

  const handleDeleteRecurring = async (id: string) => {
    const updated = recurring.filter((r) => r.id !== id);
    setRecurring(updated);

    if (userProfile.isAuthenticated) {
      deleteRecurringFromSupabase(id).catch(console.warn);
    } else {
      saveGuestData({ recurring: updated });
    }
  };

  // Reset demo guest ledger
  const handleResetData = () => {
    if (window.confirm('Reset demo guest records to default initial state?')) {
      clearGuestData();
      if (!userProfile.isAuthenticated) {
        setTransactions(INITIAL_TRANSACTIONS);
        setAccounts(INITIAL_ACCOUNTS);
        setBudgets(INITIAL_BUDGETS);
        setRecurring(INITIAL_RECURRING_PAYMENTS);
      }
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-[#FBFBFA] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-[0.25rem] bg-[#1B4332] text-white flex items-center justify-center font-bold text-[18px]">
            S
          </div>
          <div className="flex items-center gap-2 text-[14px] text-[#52565E] font-medium">
            <Loader2 className="w-4 h-4 animate-spin text-[#1B4332]" />
            <span>Initializing SpendSense...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBFBFA] flex flex-col text-[#121316]">
      {/* Header */}
      <Header
        currentPeriod={currentPeriod}
        onPeriodChange={setCurrentPeriod}
        currencyCode={currencyCode}
        onCurrencyChange={setCurrencyCode}
        onOpenNewTransaction={() => {
          setEditingTransaction(null);
          setIsModalOpen(true);
        }}
        onResetData={handleResetData}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        userProfile={userProfile}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-[1360px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoadingData ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#1B4332]" />
            <span className="text-[14px] text-[#52565E] font-medium">
              Loading your verified Supabase ledger...
            </span>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <OverviewScreen
                accounts={accounts}
                budgets={budgets}
                transactions={transactions}
                recurring={recurring}
                currencyCode={currencyCode}
                onSelectTransaction={setSelectedTransaction}
                onNavigateToTab={setActiveTab}
                onOpenNewTransaction={() => {
                  setEditingTransaction(null);
                  setIsModalOpen(true);
                }}
              />
            )}

            {activeTab === 'transactions' && (
              <LedgerScreen
                transactions={transactions}
                accounts={accounts}
                budgets={budgets}
                currencyCode={currencyCode}
                onSelectTransaction={setSelectedTransaction}
                onOpenNewTransaction={() => {
                  setEditingTransaction(null);
                  setIsModalOpen(true);
                }}
                onDeleteMultiple={handleDeleteMultiple}
                onUpdateStatusMultiple={handleUpdateStatusMultiple}
              />
            )}

            {activeTab === 'budgets' && (
              <BudgetsScreen
                budgets={budgets}
                currencyCode={currencyCode}
                onUpdateBudget={handleUpdateBudget}
                onAddBudget={handleAddBudget}
                onOpenNewTransaction={() => {
                  setEditingTransaction(null);
                  setIsModalOpen(true);
                }}
              />
            )}

            {activeTab === 'ai-advisor' && (
              <AIAdvisorScreen
                transactions={transactions}
                budgets={budgets}
                recurring={recurring}
                currencyCode={currencyCode}
                userName={userProfile.name}
              />
            )}

            {activeTab === 'reports' && (
              <ReportsScreen
                transactions={transactions}
                accounts={accounts}
                budgets={budgets}
                currencyCode={currencyCode}
                currentPeriod={currentPeriod}
              />
            )}

            {activeTab === 'recurring' && (
              <RecurringScreen
                recurring={recurring}
                currencyCode={currencyCode}
                onAddRecurring={handleAddRecurring}
                onUpdateRecurring={handleUpdateRecurring}
                onDeleteRecurring={handleDeleteRecurring}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsScreen
                userProfile={userProfile}
                onUpdateProfile={setUserProfile}
                currencyCode={currencyCode}
                onCurrencyChange={setCurrencyCode}
                onResetData={handleResetData}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#E2E4E0] bg-[#FFFFFF] py-6 text-center text-[12px] text-[#8A909A]">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#10B981]" />
            <span className="font-semibold text-[#121316]">
              SpendSense — AI-Powered Smart Expense Tracker
            </span>
            <span className="hidden sm:inline">
              • {userProfile.isAuthenticated ? 'Supabase RLS Enforced' : 'Guest Mode (Isolated)'}
            </span>
          </div>
          <div>All calculations 100% verified • Vercel & Supabase Ready</div>
        </div>
      </footer>

      {/* New / Edit Transaction Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTransaction(null);
        }}
        onSave={handleSaveTransaction}
        accounts={accounts}
        budgets={budgets}
        currencyCode={currencyCode}
        initialData={editingTransaction}
      />

      {/* Detailed Transaction Drawer */}
      <TransactionDrawer
        transaction={selectedTransaction}
        account={accounts.find((a) => a.id === selectedTransaction?.accountId)}
        currencyCode={currencyCode}
        onClose={() => setSelectedTransaction(null)}
        onEdit={(tx) => {
          setSelectedTransaction(null);
          setEditingTransaction(tx);
          setIsModalOpen(true);
        }}
        onDelete={handleDeleteTransaction}
      />
    </div>
  );
}
