import { EquityReport } from '../types';
import { logger } from '../src/lib/logger';
import type { ConversationResponse } from './conversationClient';
import { streamText } from './streamingClient';

export const streamChatWithGemini = async (
  report: EquityReport,
  messageHistory: { role: 'user' | 'assistant', text: string }[],
  userNotes?: string,
  userThesis?: string,
  reportId?: string,
  onChunk?: (chunk: string) => void
): Promise<string> => {
  if (!reportId) {
    throw new Error('Save this report to enable chat history and persistence.');
  }

  const history = messageHistory.map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    text: m.text
  }));

  let buffer = '';
  try {
    const { requestId } = await streamText('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report, reportId, messageHistory: history, userNotes, userThesis })
    }, (chunk) => {
      buffer += chunk;
      onChunk?.(chunk);
    }, { operation: 'ai.chat.stream' });

    logger.info('chat.stream.completed', { requestId, meta: { reportId, historyLength: messageHistory.length } });
  } catch (err) {
    logger.captureError(err, { meta: { endpoint: '/api/chat/stream', reportId, ticker: report.ticker } });
    throw err;
  }

  return buffer || '';
};

export const streamEquityReport = async (
  ticker: string,
  onChunk?: (chunk: string) => void
): Promise<EquityReport> => {
  let buffer = '';
  try {
    const { requestId } = await streamText('/api/ai/stream-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker })
    }, (chunk) => {
      buffer += chunk;
      onChunk?.(chunk);
    }, { operation: 'ai.reports.stream' });

    logger.info('reports.stream.completed', { meta: { ticker, requestId } });
  } catch (error) {
    logger.captureError(error, { meta: { ticker, endpoint: '/api/ai/stream-report' } });
    throw error;
  }

  try {
    // Attempt to clean fenced code blocks if present
    let text = buffer.replace(/```json\n?/g, '').replace(/```/g, '');
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      text = text.substring(firstBrace, lastBrace + 1);
    }
    if (!text.trim()) {
      throw new Error('Empty stream response');
    }
    const parsed = JSON.parse(text) as Partial<EquityReport>;
    if (!parsed?.ticker || !parsed?.companyName) {
      throw new Error('Streamed report missing required fields (ticker/companyName).');
    }
    return parsed as EquityReport;
  } catch (err) {
    logger.captureError(err, { meta: { ticker, reason: 'parse_stream_report_failed', bufferPreview: buffer.slice(0, 500) } });
    throw new Error('Failed to parse streamed report JSON.');
  }
};
