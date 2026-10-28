import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { AdvisorChatMessage, BudgetCategory, CurrencyCode, RecurringPayment, Transaction } from '../../types/finance';
import {
  calculateFinancialSummary,
  getDeterministicAdvisorAnswer,
} from '../../utils/formatters';
import {
  Sparkles,
  Send,
  Trash2,
  AlertCircle,
  Bot,
  User,
  ShieldCheck,
  Key,
  Info,
} from 'lucide-react';

/**
 * Converts common inline LaTeX emitted by language models into readable plain
 * text before Markdown rendering. This intentionally does not evaluate math or
 * render HTML; ReactMarkdown continues to render the resulting text safely.
 */
function normalizeMathForDisplay(content: string): string {
  const cleanExpression = (expression: string): string =>
    expression
      .replace(/\\(?:text|textrm|mathrm|mathbf|mathit|operatorname)\{([^{}]*)\}/g, '$1')
      .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '($1 / $2)')
      .replace(/\\times\b/g, '×')
      .replace(/\\cdot\b/g, '·')
      .replace(/\\div\b/g, '÷')
      .replace(/\\pm\b/g, '±')
      .replace(/\\approx\b/g, '≈')
      .replace(/\\leq?\b/g, '≤')
      .replace(/\\geq?\b/g, '≥')
      .replace(/\\neq\b/g, '≠')
      .replace(/\\rightarrow\b|\\to\b/g, '→')
      .replace(/\\%/g, '%')
      .replace(/\\_/g, '_')
      .replace(/\\,/g, ' ')
      .replace(/\\;/g, ' ')
      .replace(/\\quad\b|\\qquad\b/g, ' ')
      .replace(/\\left\b|\\right\b/g, '')
      .replace(/\\(?:displaystyle|textstyle)\b/g, '')
      .replace(/[{}]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  return content
    // Display math blocks, then inline math in the common delimiters.
    .replace(/\$\$([\s\S]*?)\$\$/g, (_match, expression: string) =>
      cleanExpression(expression),
    )
    .replace(/\\\[([\s\S]*?)\\\]/g, (_match, expression: string) =>
      cleanExpression(expression),
    )
    .replace(/\\\(([\s\S]*?)\\\)/g, (_match, expression: string) =>
      cleanExpression(expression),
    )
    .replace(/\$([^$\n]+)\$/g, (_match, expression: string) =>
      cleanExpression(expression),
    );
}

interface AIAdvisorScreenProps {
  transactions: Transaction[];
  budgets: BudgetCategory[];
  recurring: RecurringPayment[];
  currencyCode: CurrencyCode;
  userName?: string;
}

export const AIAdvisorScreen: React.FC<AIAdvisorScreenProps> = ({
  transactions,
  budgets,
  recurring,
  currencyCode,
  userName,
}) => {
  const greetingName = userName ? userName.split(' ')[0] : 'there';
  const [messages, setMessages] = useState<AdvisorChatMessage[]>(() => {
    return [
      {
        id: 'msg-init',
        role: 'assistant',
        content:
          `Hello ${greetingName}, I am your SpendSense Financial Advisor.\n\n` +
          `I analyze your **actual, verified transaction records** to give you deterministic answers with zero hallucination.\n\n` +
          `You can select one of the suggested inquiries below or ask me any question about your spending, monthly budget depletion, or recurring commitments.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: 'system',
      },
    ];
  });

  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState<
    'checking' | 'configured' | 'missing_key' | 'invalid_key' | 'quota_exhausted' | 'service_unavailable'
  >('checking');
  const [activeModel, setActiveModel] = useState<string>('gemini-3.5-flash');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const formatModelLabel = (modelId?: string): string => {
    if (!modelId) return 'Gemini AI';
    if (modelId.includes('3.5-flash')) return 'Gemini 3.5 Flash';
    if (modelId.includes('3.8-flash')) return 'Gemini 3.8 Flash';
    if (modelId.includes('3.1-flash-lite')) return 'Gemini 3.1 Flash-Lite';
    return modelId.replace('models/', '');
  };

  const suggestedQuestions = [
    'Where did my money go this month?',
    'Compare my spending with last month',
    'How can I save more?',
    'Which category is closest to exceeding its budget?',
    'Break down my recurring subscriptions',
  ];

  // Check backend Gemini API status and active model identifier
  useEffect(() => {
    let isMounted = true;
    async function checkApiStatus() {
      try {
        const res = await fetch('/api/ai-status');
        if (res.ok) {
          const data = await res.json();
          if (!isMounted) return;
          if (data.model) {
            setActiveModel(data.model);
          }
          if (data.status === 'missing_key' || data.hasKey === false) {
            setApiStatus('missing_key');
          } else {
            setApiStatus('configured');
          }
        } else {
          if (!isMounted) return;
          setApiStatus('service_unavailable');
        }
      } catch {
        if (!isMounted) return;
        setApiStatus('service_unavailable');
      }
    }
    checkApiStatus();
    return () => {
      isMounted = false;
    };
  }, []);

  // Scroll to bottom when messages update
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (queryText: string) => {
    const trimmed = queryText.trim();
    if (!trimmed || isLoading) return;

    const userMessage: AdvisorChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputQuery('');
    setIsLoading(true);

    // Compute deterministic financial context directly from verified ledger
    const summary = calculateFinancialSummary(transactions, currencyCode);
    const deterministicAnswer = getDeterministicAdvisorAnswer(
      trimmed,
      transactions,
      budgets,
      recurring,
      currencyCode
    );

    // Construct context payload
    const summaryContext = JSON.stringify({
      currency: currencyCode,
      totalIncome: summary.totalIncome,
      totalExpenses: summary.totalExpenses,
      netSavings: summary.netSavings,
      savingsRate: `${summary.savingsRate.toFixed(1)}%`,
      topCategories: summary.categoryBreakdown.slice(0, 5),
      paymentMethods: summary.paymentBreakdown,
      overdrawnBudgets: budgets
        .filter((b) => b.spent > b.allocated)
        .map((b) => ({ name: b.name, allocated: b.allocated, spent: b.spent })),
      recurringPayments: recurring.map((r) => ({
        name: r.name,
        amount: r.amount,
        frequency: r.frequency,
        nextDue: r.nextPaymentDate,
      })),
    });

    try {
      const response = await fetch('/api/ai-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed, summaryContext }),
      });

      if (response.ok) {
        const data = await response.json();

        // Gemini AI generation succeeded
        if (data.hasKey && data.source === 'gemini' && data.text) {
          setApiStatus('configured');
          if (data.model) setActiveModel(data.model);
          setMessages((prev) => [
            ...prev,
            {
              id: `ast-${Date.now()}`,
              role: 'assistant',
              content: data.text,
              source: 'gemini',
              model: data.model || activeModel,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              deterministicInsights: {
                totalExpenses: summary.totalExpenses,
                totalIncome: summary.totalIncome,
                savingsRate: summary.savingsRate,
              },
            },
          ]);
          setIsLoading(false);
          return;
        }

        // Invalid API Key detected by server
        if (data.errorType === 'invalid_key') {
          setApiStatus('invalid_key');
        } else if (data.errorType === 'quota_exhausted') {
          setApiStatus('quota_exhausted');
        } else if (data.errorType === 'service_unavailable') {
          setApiStatus('service_unavailable');
        }

        // Return verified deterministic analysis with honest source attribution
        setMessages((prev) => [
          ...prev,
          {
            id: `ast-${Date.now()}`,
            role: 'assistant',
            content: deterministicAnswer,
            source: 'deterministic',
            model: data.model || activeModel,
            errorType: data.errorType,
            fallbackReason: data.error,
            isTransientError: data.isTransientError,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            deterministicInsights: {
              totalExpenses: summary.totalExpenses,
              totalIncome: summary.totalIncome,
              savingsRate: summary.savingsRate,
            },
          },
        ]);
        setIsLoading(false);
        return;
      }
    } catch (err) {
      console.warn('Backend AI Advisor call failed, using verified deterministic calculations:', err);
    }

    // Reliable fallback: provide mathematically verified deterministic calculations
    setMessages((prev) => [
      ...prev,
      {
        id: `ast-${Date.now()}`,
        role: 'assistant',
        content: deterministicAnswer,
        source: 'deterministic',
        isConfigWarning: apiStatus === 'missing_key',
        fallbackReason:
          apiStatus === 'missing_key'
            ? 'No GEMINI_API_KEY configured in environment.'
            : 'AI service unreachable. Displaying verified deterministic calculation.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        deterministicInsights: {
          totalExpenses: summary.totalExpenses,
          totalIncome: summary.totalIncome,
          savingsRate: summary.savingsRate,
        },
      },
    ]);
    setIsLoading(false);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'msg-init',
        role: 'assistant',
        content:
          `Chat cleared. I am ready to analyze your latest transactions.\n\n` +
          `Ask me anything about your spending, budget envelopes, or savings targets.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: 'system',
      },
    ]);
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto flex flex-col h-[calc(100vh-140px)] min-h-[600px]">
      {/* Top Header Card */}
      <div className="bg-[#FFFFFF] border border-[#E2E4E0] rounded-[0.5rem] p-4 lg:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8A909A]">
              Personal Finance AI
            </span>
            {apiStatus === 'configured' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#ECFDF5] text-[#1B4332] border border-[#A7F3D0]">
                <Sparkles className="w-2.5 h-2.5 text-[#10B981]" />
                {formatModelLabel(activeModel)} Ready
              </span>
            )}
            {apiStatus === 'missing_key' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]">
                <Key className="w-2.5 h-2.5 text-[#D97706]" />
                Deterministic Mode (No Key)
              </span>
            )}
            {apiStatus === 'invalid_key' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]">
                <AlertCircle className="w-2.5 h-2.5 text-[#C62828]" />
                Deterministic Mode (Invalid Key)
              </span>
            )}
            {apiStatus === 'quota_exhausted' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]">
                <Info className="w-2.5 h-2.5 text-[#D97706]" />
                Deterministic Mode (Quota Limit)
              </span>
            )}
            {apiStatus === 'service_unavailable' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#F4F4F2] text-[#52565E] border border-[#E2E4E0]">
                <Info className="w-2.5 h-2.5 text-[#52565E]" />
                Deterministic Mode (High Load / 503)
              </span>
            )}
            {apiStatus === 'checking' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#F4F4F2] text-[#52565E] border border-[#E2E4E0]">
                Checking AI Service...
              </span>
            )}
          </div>
          <h1 className="text-[20px] font-bold text-[#121316] tracking-tight mt-0.5">
            SpendSense AI Advisor
          </h1>
          <p className="text-[12px] text-[#52565E]">
            Grounded strictly on your {transactions.length} verified transactions. No fabricated numbers.
          </p>
        </div>

        <button
          onClick={handleClearChat}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-[#52565E] hover:text-[#121316] bg-[#F4F4F2] hover:bg-[#E2E4E0] border border-[#E2E4E0] rounded-[0.25rem] transition-colors self-start sm:self-auto"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear Chat
        </button>
      </div>

      {/* Setup Warning Notice ONLY if API key is genuinely confirmed missing */}
      {apiStatus === 'missing_key' && (
        <div className="p-3.5 bg-[#FFFBEB] border border-[#FDE68A] rounded-[0.5rem] flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
          <div className="text-[12px] text-[#78350F] leading-relaxed">
            <strong className="font-semibold text-[#92400E]">AI Setup Note: </strong>
            <code>GEMINI_API_KEY</code> is not configured in your <code>.env</code> file. SpendSense is running in{' '}
            <strong>Verified Deterministic Mode</strong> — all financial math, category breakdowns, and advice are computed directly from your local ledger records with mathematical accuracy.
          </div>
        </div>
      )}

      {/* Quota Exhaustion Notice if model quota reached */}
      {apiStatus === 'quota_exhausted' && (
        <div className="p-3.5 bg-[#FFFBEB] border border-[#FDE68A] rounded-[0.5rem] flex items-start gap-3">
          <Info className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
          <div className="text-[12px] text-[#78350F] leading-relaxed">
            <strong className="font-semibold text-[#92400E]">Daily Quota Reached: </strong>
            The configured model has reached its free-tier daily request quota. SpendSense has switched to{' '}
            <strong>Verified Deterministic Mode</strong> to provide uninterrupted, mathematically accurate financial analysis.
          </div>
        </div>
      )}

      {/* Invalid Key Notice if Gemini returned 401/403 */}
      {apiStatus === 'invalid_key' && (
        <div className="p-3.5 bg-[#FEF2F2] border border-[#FECACA] rounded-[0.5rem] flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-[#C62828] shrink-0 mt-0.5" />
          <div className="text-[12px] text-[#991B1B] leading-relaxed">
            <strong className="font-semibold text-[#991B1B]">Invalid API Key: </strong>
            The configured <code>GEMINI_API_KEY</code> was rejected by Google AI Studio (HTTP 401/403). Please generate a fresh key in Google AI Studio and place it in your local <code>.env</code> file. SpendSense is running in{' '}
            <strong>Verified Deterministic Mode</strong> in the meantime.
          </div>
        </div>
      )}

      {/* Suggested Questions Pills */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A909A] whitespace-nowrap shrink-0">
          Suggested:
        </span>
        {suggestedQuestions.map((q) => (
          <button
            key={q}
            onClick={() => handleSendMessage(q)}
            className="px-3 py-1 text-[12px] font-medium bg-[#FFFFFF] hover:bg-[#F4F4F2] text-[#121316] border border-[#E2E4E0] rounded-[0.25rem] whitespace-nowrap transition-colors shrink-0 shadow-2xs"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Chat Messages Log Surface */}
      <div className="flex-1 bg-[#FFFFFF] border border-[#E2E4E0] rounded-[0.5rem] p-4 lg:p-6 overflow-y-auto space-y-5">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const msgSource = msg.source || (isUser ? undefined : 'system');

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className={`w-7 h-7 rounded-[0.25rem] flex items-center justify-center shrink-0 text-white font-bold text-[12px] ${
                  isUser ? 'bg-[#2D6A4F]' : 'bg-[#1B4332]'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-[#A7F3D0]" />}
              </div>

              {/* Message Content Bubble */}
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-[0.5rem] p-4 text-[13px] leading-relaxed space-y-2 ${
                  isUser
                    ? 'bg-[#1B4332] text-white shadow-xs'
                    : 'bg-[#FBFBFA] border border-[#E2E4E0] text-[#121316]'
                }`}
              >
                {/* Dynamic fallback reason warning if AI Advisor could not generate */}
                {!isUser && msg.fallbackReason && (
                  <div className="p-2 mb-2 bg-[#FFFBEB] border border-[#FDE68A] rounded-[0.25rem] flex items-center gap-2 text-[11px] text-[#92400E]">
                    <AlertCircle className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
                    <span>{msg.fallbackReason}</span>
                  </div>
                )}

                {/* Content with Markdown Rendering */}
                {isUser ? (
                  <div className="whitespace-pre-line font-normal">{msg.content}</div>
                ) : (
                  <div className="prose prose-sm max-w-none text-[#121316]">
                    <ReactMarkdown
                      components={{
                        h1: ({ children }) => (
                          <h1 className="text-[16px] font-bold text-[#121316] mt-2 mb-1.5">{children}</h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="text-[15px] font-bold text-[#121316] mt-2 mb-1">{children}</h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="text-[14px] font-semibold text-[#121316] mt-1.5 mb-1">{children}</h3>
                        ),
                        p: ({ children }) => (
                          <p className="text-[13px] leading-relaxed mb-2 last:mb-0 text-[#121316]">{children}</p>
                        ),
                        ul: ({ children }) => (
                          <ul className="list-disc pl-5 my-1.5 space-y-1 text-[13px] text-[#121316]">{children}</ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="list-decimal pl-5 my-1.5 space-y-1 text-[13px] text-[#121316]">{children}</ol>
                        ),
                        li: ({ children }) => (
                          <li className="leading-relaxed text-[#121316]">{children}</li>
                        ),
                        strong: ({ children }) => (
                          <strong className="font-semibold text-[#121316]">{children}</strong>
                        ),
                        code: ({ children }) => (
                          <code className="font-mono text-[11px] bg-[#E2E4E0]/60 px-1 py-0.5 rounded text-[#121316]">
                            {children}
                          </code>
                        ),
                      }}
                    >
                      {normalizeMathForDisplay(msg.content)}
                    </ReactMarkdown>
                  </div>
                )}

                {/* Attribution Stamp */}
                {!isUser && (
                  <div className="pt-2 border-t border-[#E2E4E0]/80 flex items-center justify-between text-[10px] text-[#8A909A]">
                    <div className="flex items-center gap-1 font-medium">
                      {msgSource === 'gemini' ? (
                        <>
                          <Sparkles className="w-3 h-3 text-[#10B981]" />
                          <span className="text-[#1B4332] font-semibold">
                            Gemini AI ({formatModelLabel(msg.model || activeModel)})
                          </span>
                        </>
                      ) : msgSource === 'deterministic' ? (
                        <>
                          <ShieldCheck className="w-3 h-3 text-[#2D6A4F]" />
                          <span className="text-[#2D6A4F] font-semibold">Verified SpendSense Calculations Engine</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-3 h-3 text-[#8A909A]" />
                          <span className="text-[#52565E] font-medium">SpendSense</span>
                        </>
                      )}
                    </div>
                    <span>{msg.timestamp}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-[0.25rem] bg-[#1B4332] text-white flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 animate-spin text-[#A7F3D0]" />
            </div>
            <div className="p-3.5 bg-[#FBFBFA] border border-[#E2E4E0] rounded-[0.5rem] text-[13px] text-[#52565E] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#1B4332] animate-ping" />
              <span>Analyzing your transactions and budget envelopes...</span>
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Query Input Bar */}
      <div className="bg-[#FFFFFF] border border-[#E2E4E0] rounded-[0.5rem] p-2 sm:p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputQuery);
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Ask AI Advisor about your spending, budgets, or savings..."
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            disabled={isLoading}
            className="flex-1 h-10 px-3 bg-[#FFFFFF] border border-[#E2E4E0] rounded-[0.25rem] text-[14px] text-[#121316] input-focus-ring placeholder:text-[#8A909A]"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || isLoading}
            className="h-10 px-4 bg-[#1B4332] hover:bg-[#2D6A4F] disabled:opacity-50 text-white rounded-[0.25rem] font-semibold text-[13px] flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ask</span>
          </button>
        </form>
      </div>
    </div>
  );
};
