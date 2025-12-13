import { ChatOpenAI } from '@langchain/openai';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

export const getOpenAIChat = () => {
  if (!config.openaiApiKey && !process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  return new ChatOpenAI({
    modelName: config.openaiChatModel,
    temperature: 0,
    maxRetries: 2
  });
};

export const logOpenAIModel = () =>
  logger.info({
    message: 'openai.model.selected',
    model: config.openaiChatModel
  });
