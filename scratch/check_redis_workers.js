const { Queue } = require('bullmq');
const IORedis = require('ioredis');
require('dotenv').config({ path: 'backend/.env' });

async function run() {
  const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
  console.log('Connecting to Redis:', REDIS_URL);
  const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });

  try {
    const ping = await connection.ping();
    console.log('Ping response:', ping);

    const keys = await connection.keys('*');
    console.log(`Found ${keys.length} keys in Redis:`);
    console.log(keys.slice(0, 20));

    // Check BullMQ workers
    // In BullMQ, workers register themselves in a set: bull:<queue-name>:workers
    const instantWorkers = await connection.smembers('bull:instant-analysis:workers');
    console.log('Workers for instant-analysis:', instantWorkers);

    const deepWorkers = await connection.smembers('bull:deep-analysis:workers');
    console.log('Workers for deep-analysis:', deepWorkers);

  } catch (err) {
    console.error('Redis error:', err);
  } finally {
    connection.disconnect();
  }
}

run().catch(console.error);
