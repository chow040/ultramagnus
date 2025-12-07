import { Router } from 'express';
import { logger } from '../utils/logger.js';
import { requireAuth } from '../middleware/auth.js';
import {
  appendMessage,
  ConversationError,
  getConversation,
  summarizeIfNeeded
} from '../services/conversationService.js';
import { MODEL_NAME, ensureClient, describeGenAiError, flushStreamingHeaders, streamText } from './aiShared.js';

export const aiChatRouter = Router();

aiChatRouter.post('/chat', requireAuth, async (req, res) => {
  const log = req.log || logger;
  const { report, reportId: reportIdBody, messageHistory, userNotes, userThesis } = req.body || {};
  const reportId = report?.id || reportIdBody;
  const userId = (req as any).userId as string | undefined;

  if (!report || !messageHistory) {
    return res.status(400).json({ error: 'Report and messageHistory are required.' });
  }
  if (!reportId) {
    return res.status(400).json({ error: 'reportId is required to persist chat.' });
  }
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let client;
  try {
    client = ensureClient();
  } catch (err: any) {
    return res.status(503).json({ error: err.message });
  }

  const contextSummary = `
    STOCK ANALYSIS CONTEXT:
    Company: ${report.companyName} (${report.ticker})
    Price: ${report.currentPrice} (${report.priceChange})
    Verdict: ${report.verdict}
    Moonshot Score: ${report.rocketScore}/100
    Summary: ${report.summary}
    Bull Case: ${report.scenarioAnalysis?.bull?.price}
    Bear Case: ${report.scenarioAnalysis?.bear?.price}
    Short Term Factors: ${(report.shortTermFactors?.positive || []).map((f: any) => f.title).join(', ')}
    Risks: ${(report.shortTermFactors?.negative || []).map((f: any) => f.title).join(', ')}
    
    USER'S NOTES:
    "${userNotes || 'No notes yet.'}"

    USER'S INVESTMENT THESIS:
    "${userThesis || 'No thesis defined yet.'}"
  `;

  const systemInstruction = `
  You are 'Ultramagnus', an elite Wall Street equity research assistant. 
  Your goal is to help the user understand the stock report for ${report.ticker}.
  
  RULES:
  1. Use the provided STOCK ANALYSIS CONTEXT to answer questions.
  2. If the user asks about their notes or thesis, refer to the USER'S NOTES section.
  3. Keep answers concise, punchy, and professional (financial analyst persona).
  4. If asked for real-time news not in the report, use the googleSearch tool.
  5. Do not hallucinate data not present in the context or found via search.
  6. Format responses with clean Markdown (bolding key figures).
  `;

  const normalizedHistory = Array.isArray(messageHistory)
    ? messageHistory.map((m: any) => {
        const role = m?.role === 'assistant' ? 'model' : m?.role === 'user' ? 'user' : 'user';
        return { role, text: m?.text || '' };
      })
    : [];

  const contents = [
    { role: 'user', parts: [{ text: `System Context:\n${contextSummary}\n\n${systemInstruction}` }] },
    ...normalizedHistory.map((m: any) => ({ role: m.role, parts: [{ text: m.text }] }))
  ];

  const promptTextSize = (() => {
    const base = contextSummary.length + systemInstruction.length;
    const history = Array.isArray(messageHistory)
      ? messageHistory.reduce((sum: number, m: any) => sum + (m?.text?.length || 0), 0)
      : 0;
    return base + history;
  })();

  log.info({
    message: 'ai.chat.request',
    ticker: report?.ticker || null,
    reportId,
    userId,
    historyLength: Array.isArray(messageHistory) ? messageHistory.length : 0,
    promptTextSize,
    correlationId: req.correlationId
  });

  try {
    const ai = client;
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
    const text = response.text || "I couldn't generate a response.";

    // Persist the latest user message (if present) and the assistant reply
    const latestUserMessage = Array.isArray(messageHistory)
      ? [...messageHistory].reverse().find((m: any) => m?.role === 'user' && typeof m?.text === 'string')
      : null;

    try {
      if (latestUserMessage?.text) {
        await appendMessage({
          reportId,
          userId,
          role: 'user',
          content: latestUserMessage.text,
          model: MODEL_NAME
        });
      }

      const { messageId, sessionId } = await appendMessage({
        reportId,
        userId,
        role: 'assistant',
        content: text,
        model: MODEL_NAME
      });

      const summaryResult = await summarizeIfNeeded(reportId, userId);
      const conversation = await getConversation(reportId, userId);

      return res.json({ text, messageId, sessionId, summaryResult, conversation });
    } catch (persistErr: any) {
      const status = persistErr instanceof ConversationError ? persistErr.status || 400 : 500;
      const code = persistErr?.code;
      if (status >= 500) {
        log.error({ message: 'ai.chat.persist_failed', err: persistErr, userId, reportId });
      } else {
        log.warn({ message: 'ai.chat.persist_blocked', err: persistErr, userId, reportId });
      }
      return res.status(status).json({ error: persistErr.message || 'Failed to persist chat', code, text });
    }
  } catch (err: any) {
    const providerDetails = describeGenAiError(err);
    log.error({
      message: 'ai.chat.failed',
      err,
      ticker: report?.ticker || null,
      reportId,
      providerDetails,
      correlationId: req.correlationId
    });
    return res.status(502).json({
      error: 'AI provider is temporarily unavailable. Please retry in a moment.',
      code: 'genai_upstream_error',
      correlationId: req.correlationId,
      providerDetails
    });
  }
});

aiChatRouter.post('/chat/stream', requireAuth, async (req, res) => {
  const { report, reportId, messageHistory, userNotes, userThesis } = req.body || {};
  const log = req.log || logger;
  const userId = (req as any).userId as string | undefined;
  if (!report || !messageHistory) {
    return res.status(400).json({ error: 'Report and messageHistory are required.' });
  }
  if (!reportId) {
    return res.status(400).json({ error: 'reportId is required.' });
  }
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let client;
  try {
    client = ensureClient();
  } catch (err: any) {
    return res.status(503).json({ error: err.message || 'AI client unavailable' });
  }

  const contextSummary = `
    STOCK ANALYSIS CONTEXT:
    Company: ${report.companyName} (${report.ticker})
    Price: ${report.currentPrice} (${report.priceChange})
    Verdict: ${report.verdict}
    Moonshot Score: ${report.rocketScore}/100
    Summary: ${report.summary}
    Bull Case: ${report.scenarioAnalysis?.bull?.price}
    Bear Case: ${report.scenarioAnalysis?.bear?.price}
    Short Term Factors: ${(report.shortTermFactors?.positive || []).map((f: any) => f.title).join(', ')}
    Risks: ${(report.shortTermFactors?.negative || []).map((f: any) => f.title).join(', ')}
    
    USER'S NOTES:
    "${userNotes || 'No notes yet.'}"

    USER'S INVESTMENT THESIS:
    "${userThesis || 'No thesis defined yet.'}"
  `;

  const systemInstruction = `
  You are 'Ultramagnus', an elite Wall Street equity research assistant. 
  Use the STOCK ANALYSIS CONTEXT to answer. Keep answers concise, punchy, and professional.
  `;

  const rawHistory = Array.isArray(messageHistory)
    ? messageHistory.slice(-12).map((m: any) => ({
        role: m?.role === 'assistant' ? 'model' : 'user',
        text: m?.text || ''
      }))
    : [];

  const systemMsgText = `System Context:\n${contextSummary}\n\n${systemInstruction}`;
  const mergedContents: { role: string; parts: { text: string }[] }[] = [
    { role: 'user', parts: [{ text: systemMsgText }] }
  ];

  for (const msg of rawHistory) {
    const lastMsg = mergedContents[mergedContents.length - 1];
    if (lastMsg.role === msg.role) {
      lastMsg.parts[0].text += `\n\n---\n\n${msg.text}`;
    } else {
      mergedContents.push({ role: msg.role, parts: [{ text: msg.text }] });
    }
  }

  if (mergedContents[mergedContents.length - 1].role === 'model') {
    mergedContents.push({ role: 'user', parts: [{ text: 'Please continue.' }] });
  }

  flushStreamingHeaders(res);

  try {
    const stream = await client.models.generateContentStream({
      model: MODEL_NAME,
      contents: mergedContents
    });

    let wrote = false;
    const iterable = {
      async *[Symbol.asyncIterator]() {
        for await (const chunk of stream) {
          const c = chunk as any;
          const textPart = typeof c.text === 'function' ? c.text() : c.text;
          if (textPart) {
            wrote = true;
            yield textPart;
          }
        }
      }
    };

    const streamed = await streamText(res, iterable as AsyncIterable<string>);
    if (!wrote && !streamed) {
      if (!res.headersSent) {
        return res.status(502).end('Stream produced no content');
      }
    }
    res.end();
  } catch (err: any) {
    const providerDetails = describeGenAiError(err);
    log.warn({
      message: 'ai.stream.chat.failed',
      providerDetails,
      errorString: err?.message || err?.toString?.(),
      reportId,
      userId
    });
    if (!res.headersSent) {
      res.status(502).json({ error: 'Failed to stream chat', providerDetails });
    } else {
      res.end();
    }
  }
});
