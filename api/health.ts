export default function handler(req: any, res: any) {
  const key = process.env.GEMINI_API_KEY?.trim();
  const hasValidKey = Boolean(key && key !== 'MY_GEMINI_API_KEY' && key.length > 5);
  return res.status(200).json({
    status: 'ok',
    hasGeminiKey: hasValidKey,
    time: new Date().toISOString(),
  });
}
