const mongoose = require('mongoose');

let connectionPromise = global.__GENELAB_MONGO_CONNECTION__ || null;

async function ensureMongoConnection() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!connectionPromise) {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/genelab';
    connectionPromise = mongoose.connect(mongoUri).then(() => mongoose.connection);
    global.__GENELAB_MONGO_CONNECTION__ = connectionPromise;
  }

  return connectionPromise;
}

module.exports = { ensureMongoConnection };