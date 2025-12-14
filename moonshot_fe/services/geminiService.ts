import { streamText } from './streamingClient';

/**
 * Stream chat responses from the backend Gemini chat endpoint.
 */
export const streamChatWithGemini = async (
  report: any,
  messageHistory: Array<{ role: string; text: string }>,
  userNotes: string,
  userThesis: string,
  reportId: string | undefined,
  onChunk: (chunk: string) => void
) => {
  if (!reportId) {
    throw new Error('reportId required for chat');
  }

  return streamText('/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      report,
      reportId,
      messageHistory,
      userNotes,
      userThesis
    })
  }, onChunk, { operation: 'chat.stream' });
};
