const path = require('path');
const logDir = path.join(__dirname, 'logs');

module.exports = {
  apps: [
    {
      name: 'moonshot-be',
      script: 'dist/src/server.js',
      cwd: __dirname,
      max_memory_restart: '1G',
      min_uptime: '60s',
      max_restarts: 5,
      restart_delay: 5000,
      merge_logs: true,
      time: true,
      out_file: path.join(logDir, 'pm2-out.log'),
      error_file: path.join(logDir, 'pm2-error.log'),
      env: {
        NODE_ENV: process.env.NODE_ENV || 'production',
        PORT: process.env.PORT || 4000,
        START_WORKER_IN_API: process.env.START_WORKER_IN_API || 'true'
      }
    },
    {
      name: 'moonshot-worker',
      script: 'dist/src/workers/index.js',
      cwd: __dirname,
      max_memory_restart: '1G',
      min_uptime: '60s',
      max_restarts: 5,
      restart_delay: 5000,
      merge_logs: true,
      time: true,
      out_file: path.join(logDir, 'pm2-worker-out.log'),
      error_file: path.join(logDir, 'pm2-worker-error.log'),
      env: {
        NODE_ENV: process.env.NODE_ENV || 'production'
      }
    }
  ]
};
