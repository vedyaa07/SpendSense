import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Helper to check and instantiate GoogleGenAI
function getGeminiClient(): { client: GoogleGenAI | null; hasKey: boolean } {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'YOUR_GEMINI_API_KEY' || apiKey === 'MY_GEMINI_API_KEY') {
    return { client: null, hasKey: false };
  }
  return {
    client: new GoogleGenAI({
      apiKey: apiKey.trim(),
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
        retryOptions: { attempts: 1 }, // Disable unmonitored SDK retries so server has full authority over cancellation & backoff
      },
    }),
    hasKey: true,
  };
}

// Model configuration with verified active availability
const PRIMARY_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
const FALLBACK_MODEL = PRIMARY_MODEL === 'gemini-3.5-flash' ? 'gemini-3.1-flash-lite' : 'gemini-3.5-flash';

// Configurable timeouts
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

// Robust bounded executor with AbortController cancellation and candidate model fallback
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
    const maxAttemptsForThisModel = 2; // 1 initial + 1 retry

    while (modelAttempts < maxAttemptsForThisModel) {
      const elapsedOverall = Date.now() - overallStart;
      if (elapsedOverall >= TOTAL_DEADLINE_MS - 2000) {
        break;
      }

      totalAttemptCount++;
      modelAttempts++;
      lastModelAttempted = model;

      // Use the SDK's HTTP timeout instead of passing an unsupported abortSignal
      // inside generation config. A fresh client gives each attempt its own timeout.
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
        // Minimal safe diagnostic log: attempt, model, result, latency (no secrets or financial data)
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

        // Immediate stop for non-retryable invalid API key
        if (classification.errorType === 'invalid_key') {
          throw { classification, model };
        }

        // If quota exhausted on this model or timeout, switch to secondary model immediately
        if (!classification.canRetrySameModel) {
          break; // Move to next model in modelsToTry
        }

        // If transient and we have retry budget remaining for this model
        if (classification.isTransient && modelAttempts < maxAttemptsForThisModel) {
          const jitter = Math.floor(Math.random() * 150) + 50;
          const delay = Math.min(700 * Math.pow(2, modelAttempts - 1) + jitter, 2000);

          if (Date.now() - overallStart + delay >= TOTAL_DEADLINE_MS - 2000) {
            break; // No time left for backoff delay
          }

          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        break; // Max attempts for this model reached, try next model
      }
    }
  }

  // If all models and retries exhausted
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

// Check AI Advisor status
app.get('/api/ai-status', (_req, res) => {
  const { hasKey } = getGeminiClient();
  res.json({
    hasKey,
    status: hasKey ? 'configured' : 'missing_key',
    model: PRIMARY_MODEL,
    fallbackModel: FALLBACK_MODEL,
  });
});

// Download clean verified project ZIP (no .env, no nested archives)
app.get('/api/download-project', (_req, res) => {
  const zipPath = '/tmp/spendsense-project.zip';
  if (fs.existsSync(zipPath)) {
    res.setHeader('Content-Disposition', 'attachment; filename="spendsense-project.zip"');
    res.setHeader('Content-Type', 'application/zip');
    return fs.createReadStream(zipPath).pipe(res);
  }
  return res.status(404).json({ error: 'Archive not found. Run python3 scripts/package-clean-zip.py' });
});

// AI Advisor conversational endpoint
app.post('/api/ai-advisor', async (req, res) => {
  try {
    const { query, summaryContext } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Valid query string is required.' });
    }

    const { hasKey } = getGeminiClient();
    const apiKey = process.env.GEMINI_API_KEY;
    if (!hasKey || !apiKey) {
      console.log('[AI-Advisor] Status: missing_key');
      return res.json({
        hasKey: false,
        status: 'missing_key',
        source: 'deterministic',
        message: 'No GEMINI_API_KEY configured in environment.',
      });
    }

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

    return res.json({
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
});

// Mount Vite in dev or serve static dist in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: 3000,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`SpendSense server running on http://localhost:${PORT}`);
  });
}

startServer();
