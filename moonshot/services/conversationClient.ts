import { apiJson } from './apiClient';
import { logger } from '../src/lib/logger';

export type ConversationRole = 'user' | 'assistant' | 'system';

export interface ConversationMessage {
  id: string;
  role: ConversationRole;
  content: string;
  createdAt?: string | null;
}

export interface ConversationSummary {
  text: string;
  coverageUpTo?: string | null;
}

export interface ConversationResponse {
  summary?: ConversationSummary | null;
  messages: ConversationMessage[];
}

export const fetchConversation = async (reportId: string, limit?: number) => {
  try {
    const query = typeof limit === 'number' ? `?limit=${limit}` : '';
    const { data } = await apiJson<ConversationResponse>(`/api/reports/${reportId}/chat${query}`, {
      method: 'GET'
    }, { operation: 'conversation.fetch' });
    return data;
  } catch (error) {
    logger.captureError(error, { meta: { action: 'conversation.fetch', reportId } });
    throw error;
  }
};
