const mongoose = require('mongoose');

let connectionPromise = global.__GENELAB_MONGO_CONNECTION__ || null;

async function ensureMongoConnection() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!connectionPromise) {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/genelab';
    
    // Add fast-fail timeouts to prevent serverless function from hanging on firewall block
    const options = {
      connectTimeoutMS: 8000,
      socketTimeoutMS: 8000,
      serverSelectionTimeoutMS: 8000
    };

    connectionPromise = mongoose.connect(mongoUri, options)
      .then(() => mongoose.connection)
      .catch(err => {
        // Reset cached promise on failure to allow retry on next request
        connectionPromise = null;
        global.__GENELAB_MONGO_CONNECTION__ = null;
        throw err;
      });
      
    global.__GENELAB_MONGO_CONNECTION__ = connectionPromise;
  }

  return connectionPromise;
}

module.exports = { ensureMongoConnection };