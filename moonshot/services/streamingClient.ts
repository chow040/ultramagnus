import { logger } from '../src/lib/logger';
import { apiFetch } from './apiClient';

export const streamText = async (
  path: string,
  init: RequestInit = {},
  onChunk: (chunk: string) => void,
  options: { operation?: string } = {}
) => {
  const { response, requestId } = await apiFetch(path, init, { operation: options.operation });
  if (!response.ok) {
    const text = await response.text();
    const message = text || `Streaming request failed with status ${response.status}`;
    throw new Error(message);
  }
  if (!response.body) {
    throw new Error('No response body to stream');
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      if (text) onChunk(text);
    }
  } catch (err) {
    logger.captureError(err, { meta: { path, requestId } });
    throw err;
  } finally {
    reader.releaseLock();
  }
  return { requestId };
};
