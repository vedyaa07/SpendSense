import { GoogleGenAI } from '@google/genai';

const PRIMARY_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
const FALLBACK_MODEL = PRIMARY_MODEL === 'gemini-3.5-flash' ? 'gemini-3.1-flash-lite' : 'gemini-3.5-flash';

const PER_ATTEMPT_TIMEOUT_MS = parseInt(process.env.GEMINI_TIMEOUT_MS || '20000', 10);
const TOTAL_DEADLINE_MS = parseInt(process.env.GEMINI_MAX_TOTAL_MS || '45000', 10);

interface GeminiClassification {
  errorType:
    | 'missing_key'
    | 'invalid_key'
    | 'quota_exhausted'
    | 'rate_limited'
    | 'service_unavailable'
    | 'timeout'
    | 'network_error'
    | 'general_error';
  isTransient: boolean;
  canRetrySameModel: boolean;
  userFriendlyMessage: string;
  statusCode: number;
}

function classifyGeminiError(err: any): GeminiClassification {
  const status = Number(err?.status || err?.response?.status || 0);
  const msg = String(err?.message || '');
  const isAbort =
    err?.name === 'AbortError' ||
    err?.name === 'TimeoutError' ||
    msg.includes('timed out') ||
    msg.includes('timeout') ||
    msg.includes('aborted');

  if (isAbort) {
    return {
      errorType: 'timeout',
      isTransient: true,
      canRetrySameModel: true,
      userFriendlyMessage: 'AI request timed out. SpendSense provided verified deterministic analysis below.',
      statusCode: 408,
    };
  }

  const isInvalidKey =
    (status === 400 && (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid'))) ||
    status === 401 ||
    status === 403 ||
    msg.includes('API_KEY_INVALID') ||
    msg.includes('API key not valid') ||
    msg.includes('PERMISSION_DENIED');

  if (isInvalidKey) {
    return {
      errorType: 'invalid_key',
      isTransient: false,
      canRetrySameModel: false,
      userFriendlyMessage:
        'The configured Gemini API key is invalid or unauthorized (HTTP 401/403). SpendSense provided verified deterministic analysis below.',
      statusCode: status || 401,
    };
  }

  const isDailyQuota =
    status === 429 &&
    (msg.includes('RESOURCE_EXHAUSTED') ||
      msg.includes('quota') ||
      msg.includes('Free Tier') ||
      msg.includes('daily limit') ||
      msg.includes('QuotaFailure') ||
      msg.includes('retryDelay'));

  if (isDailyQuota) {
    return {
      errorType: 'quota_exhausted',
      isTransient: false,
      canRetrySameModel: false,
      userFriendlyMessage:
        'Gemini daily request quota exceeded for this model. SpendSense provided verified deterministic analysis below.',
      statusCode: 429,
    };
  }

  if (status === 429) {
    return {
      errorType: 'rate_limited',
      isTransient: true,
      canRetrySameModel: true,
      userFriendlyMessage:
        'Gemini rate limit reached (HTTP 429). SpendSense provided verified deterministic analysis below.',
      statusCode: 429,
    };
  }

  const isServiceUnavailable =
    status === 503 ||
    status === 502 ||
    status === 500 ||
    msg.includes('503') ||
    msg.includes('UNAVAILABLE') ||
    msg.includes('Overloaded') ||
    msg.includes('high demand');

  if (isServiceUnavailable) {
    return {
      errorType: 'service_unavailable',
      isTransient: true,
      canRetrySameModel: true,
      userFriendlyMessage:
        'Gemini is temporarily experiencing high demand (HTTP 503). SpendSense provided verified deterministic analysis below.',
      statusCode: status || 503,
    };
  }

  const isNetwork =
    msg.includes('fetch failed') ||
    msg.includes('ECONNRESET') ||
    msg.includes('ENOTFOUND') ||
    msg.includes('ETIMEDOUT');

  if (isNetwork) {
    return {
      errorType: 'network_error',
      isTransient: true,
      canRetrySameModel: true,
      userFriendlyMessage:
        'Network connectivity issue reaching Gemini API. SpendSense provided verified deterministic analysis below.',
      statusCode: 504,
    };
  }

  return {
    errorType: 'general_error',
    isTransient: false,
    canRetrySameModel: false,
    userFriendlyMessage:
      'The AI Advisor encountered an unexpected error. SpendSense provided verified deterministic analysis below.',
    statusCode: status || 500,
  };
}

async function generateContentWithSmartRetry(
  apiKey: string,
  prompt: string,
  systemInstruction: string
): Promise<{ text: string; model: string }> {
  const modelsToTry = [PRIMARY_MODEL, FALLBACK_MODEL];
  const overallStart = Date.now();
  let totalAttemptCount = 0;
  let lastClassification: GeminiClassification | null = null;
  let lastModelAttempted = PRIMARY_MODEL;

  for (const model of modelsToTry) {
    let modelAttempts = 0;
    const maxAttemptsForThisModel = 2;

    while (modelAttempts < maxAttemptsForThisModel) {
      const elapsedOverall = Date.now() - overallStart;
      if (elapsedOverall >= TOTAL_DEADLINE_MS - 2000) {
        break;
      }

      totalAttemptCount++;
      modelAttempts++;
      lastModelAttempted = model;

      // Configure the SDK's HTTP timeout for this individual attempt.
      // AbortSignal is not a generation setting and should not be placed in config.
      const attemptTimeout = Math.max(1000, Math.min(PER_ATTEMPT_TIMEOUT_MS, TOTAL_DEADLINE_MS - elapsedOverall));
      const attemptStart = Date.now();
      const attemptClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: { 'User-Agent': 'aistudio-build' },
          timeout: attemptTimeout,
          retryOptions: { attempts: 1 },
        },
      });

      try {
        const response = await attemptClient.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        });
        const latency = Date.now() - attemptStart;
        console.log(`[AI-Advisor] [Attempt ${totalAttemptCount}] Model: ${model} | Result: OK | Latency: ${latency}ms`);
        return {
          text: response.text || '',
          model,
        };
      } catch (err: any) {
        const latency = Date.now() - attemptStart;
        const classification = classifyGeminiError(err);
        lastClassification = classification;

        console.log(
          `[AI-Advisor] [Attempt ${totalAttemptCount}] Model: ${model} | Result: ${classification.errorType} (HTTP ${classification.statusCode}) | Latency: ${latency}ms`
        );

        if (classification.errorType === 'invalid_key') {
          throw { classification, model };
        }

        if (!classification.canRetrySameModel) {
          break;
        }

        if (classification.isTransient && modelAttempts < maxAttemptsForThisModel) {
          const jitter = Math.floor(Math.random() * 150) + 50;
          const delay = Math.min(700 * Math.pow(2, modelAttempts - 1) + jitter, 2000);

          if (Date.now() - overallStart + delay >= TOTAL_DEADLINE_MS - 2000) {
            break;
          }

          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        break;
      }
    }
  }

  throw {
    classification: lastClassification || {
      errorType: 'general_error',
      isTransient: false,
      canRetrySameModel: false,
      userFriendlyMessage:
        'The AI Advisor is momentarily unavailable. SpendSense provided verified deterministic analysis below.',
      statusCode: 500,
    },
    model: lastModelAttempted,
  };
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query, summaryContext } = req.body || {};

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Valid query string is required.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === '' || apiKey === 'YOUR_GEMINI_API_KEY' || apiKey === 'MY_GEMINI_API_KEY') {
      return res.json({
        hasKey: false,
        status: 'missing_key',
        source: 'deterministic',
        message: 'No GEMINI_API_KEY configured in environment.',
      });
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey.trim(),
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
        retryOptions: { attempts: 1 },
      },
    });

    const prompt = `User Query: "${query.trim()}"\n\nVerified User Financial Context:\n${
      typeof summaryContext === 'string' ? summaryContext : JSON.stringify(summaryContext)
    }\n\nPlease provide a clear, concise, actionable financial advisory response tailored to their exact figures. Do not invent any numbers, accounts, or percentages not provided in the context.`;

    const systemInstruction = `You are SpendSense AI, an intelligent personal finance assistant for personal expense tracking.
Rules:
1. Always base calculations strictly on the user's verified financial data provided in the prompt.
2. Never invent balances, transactions, percentages, or financial conclusions.
3. Keep answers clear, encouraging, structured with bold highlights and bullet points.
4. Format all monetary values in INR with the ₹ symbol (e.g. ₹12,450.00).
5. Separate deterministic calculations from advisory advice.`;

    const result = await generateContentWithSmartRetry(apiKey.trim(), prompt, systemInstruction);

    return res.status(200).json({
      hasKey: true,
      source: 'gemini',
      model: result.model,
      text: result.text,
    });
  } catch (error: any) {
    const classification: GeminiClassification = error?.classification || classifyGeminiError(error);
    const model = error?.model || PRIMARY_MODEL;

    return res.status(200).json({
      hasKey: true,
      source: 'fallback',
      model,
      errorType: classification.errorType,
      isTransientError: classification.isTransient,
      error: classification.userFriendlyMessage,
    });
  }
}

