import { startAnalysisWorker } from './analysisQueueWorker.js';
import { logger } from '../utils/logger.js';

const bootstrap = async () => {
  try {
    const boss = await startAnalysisWorker();

    const shutdown = async (signal: NodeJS.Signals) => {
      logger.info({ message: 'analysis_worker.shutdown', signal });
      try {
        await boss.stop({ graceful: true });
      } catch (err) {
        logger.error({ message: 'analysis_worker.stop_failed', err });
      } finally {
        process.exit(0);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    logger.error({ message: 'analysis_worker.start_failed', err });
    process.exit(1);
  }
};

bootstrap();
