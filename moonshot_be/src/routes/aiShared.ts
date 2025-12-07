import { getGenAiClient } from '../clients/genai.js';
import { config } from '../config/env.js';

export const MODEL_NAME = config.geminiChatModel;

export const ensureClient = () => {
  try {
    return getGenAiClient();
  } catch (err) {
    throw new Error('Gemini is not configured. Set GEMINI_API_KEY.');
  }
};

export const describeGenAiError = (err: any) => {
  if (!err) return {};
  const providerMsg = err?.error?.message || err?.message || err?.toString?.();
  const status = err?.error?.status || err?.status;
  const code = err?.error?.code || err?.code;
  const body = err?.response?.data || err?.error;
  return {
    providerMessage: providerMsg,
    providerStatus: status,
    providerCode: code,
    providerBody: typeof body === 'string' ? body : body ? JSON.stringify(body) : null
  };
};

export const flushStreamingHeaders = (res: any) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.removeHeader('Content-Length');
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }
};

export const streamText = async (
  res: any,
  iterable: AsyncIterable<string>,
  onChunk?: (chunk: string) => void
) => {
  let wrote = false;
  for await (const chunk of iterable) {
    if (!chunk) continue;
    wrote = true;
    res.write(chunk);
    onChunk?.(chunk);
  }
  return wrote;
};
