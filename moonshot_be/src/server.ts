import { createApp } from './app.js';
import { config } from './config/env.js';
import { jobQueueService } from './services/jobQueueService.js';
import { logger } from './utils/logger.js';

try {
  await jobQueueService.start();
} catch (err) {
  logger.error({ message: 'jobqueue.start_failed', err });
}

const app = createApp();
const server = app.listen(config.port, () => {
  logger.info({ message: 'server.listening', port: config.port });
});

const handleFatalError = (err: unknown, context: string) => {
  logger.error({ message: context, err });
};

process.on('unhandledRejection', (reason) => {
  handleFatalError(reason, 'process.unhandled_rejection');
});

process.on('uncaughtException', (err) => {
  handleFatalError(err, 'process.uncaught_exception');
  server.close(() => {
    process.exit(1);
  });
});

const shutdown = async (signal: NodeJS.Signals) => {
  logger.info({ message: 'server.shutdown.initiated', signal });
  server.close(async () => {
    try {
      await jobQueueService.stop();
    } catch (err) {
      logger.error({ message: 'jobqueue.stop_failed', err });
    }
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
