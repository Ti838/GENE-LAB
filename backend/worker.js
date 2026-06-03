require('dotenv').config();
const { ensureMongoConnection } = require('./utils/mongo');
const { initQueues } = require('./services/queue.service');

async function startWorker() {
  try {
    await ensureMongoConnection();
    console.log('Connected to MongoDB — starting queue workers');
    initQueues();
    // Keep process alive
    process.stdin.resume();

    process.on('SIGINT', () => {
      console.log('Worker shutting down (SIGINT)');
      process.exit(0);
    });
    process.on('SIGTERM', () => {
      console.log('Worker shutting down (SIGTERM)');
      process.exit(0);
    });
  } catch (err) {
    console.error('Failed to start worker:', err);
    process.exit(1);
  }
}

startWorker();
