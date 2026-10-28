export default function handler(_req: any, res: any) {
  const apiKey = process.env.GEMINI_API_KEY;
  const hasKey = Boolean(
    apiKey &&
      apiKey.trim() !== '' &&
      apiKey !== 'YOUR_GEMINI_API_KEY' &&
      apiKey !== 'MY_GEMINI_API_KEY'
  );

  const primaryModel = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
  const fallbackModel = primaryModel === 'gemini-3.5-flash' ? 'gemini-3.1-flash-lite' : 'gemini-3.5-flash';

  res.status(200).json({
    hasKey,
    status: hasKey ? 'configured' : 'missing_key',
    model: primaryModel,
    fallbackModel,
  });
}

