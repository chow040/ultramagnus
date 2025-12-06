import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config/env.js';
import { authRouter } from './routes/auth.js';
import { aiRouter } from './routes/ai.js';
import { logRouter } from './routes/logs.js';
import { limitsRouter } from './routes/limits.js';
import { dashboardRouter } from './routes/dashboard.js';
import { reportsRouter } from './routes/reports.js';
import { bookmarksRouter } from './routes/bookmarks.js';
import { conversationRouter } from './routes/conversation.js';
import { correlationIdMiddleware } from './middleware/correlationId.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';

export const createApp = () => {
  const app = express();

  // Disable etag/304 for API responses to avoid empty bodies being cached by fetch clients
  app.set('etag', false);

  app.use(helmet());
  app.use(express.json());
  app.use(cors({
    origin: config.allowedOrigins,
    credentials: true
  }));
  app.use(cookieParser());
  app.use(correlationIdMiddleware);
  app.use(requestLogger);

  // Prevent intermediary caching of API responses
  app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/logs', logRouter);
  app.use('/api', limitsRouter);
  app.use('/api', dashboardRouter);
  app.use('/api', reportsRouter);
  app.use('/api', bookmarksRouter);
  app.use('/api', conversationRouter);
  app.use('/api', aiRouter);

  // 404 handler
  app.use((req, res) => {
    req.log?.warn({ message: 'route.not_found', path: req.originalUrl });
    res.status(404).json({ error: 'Not Found', path: req.path, correlationId: req.correlationId });
  });

  app.use(errorHandler);

  return app;
};
