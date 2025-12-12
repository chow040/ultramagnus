import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { config } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

const apiKey = process.env.GEMINI_API_KEY;
const modelName = config.geminiAnalyzeModel;

export function getAnalystLLM() {
  if (!apiKey) {
    logger.warn({ message: 'langchain.gemini.missing_api_key' });
    throw new Error('GEMINI_API_KEY is not configured');
  }

  return new ChatGoogleGenerativeAI({
    model: modelName,
    apiKey,
    temperature: 0,
    maxOutputTokens: 40960,
    streaming: true
  });
}
