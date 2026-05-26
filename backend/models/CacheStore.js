/**
 * GenLab AI — CacheStore MongoDB Model
 * Persists md5(sequence + mode) hashes and their computed results
 * to drastically reduce external API traffic and return results in <2s.
 */
const mongoose = require('mongoose');

const cacheStoreSchema = new mongoose.Schema({
  // MD5 of clean DNA sequence + mode
  hash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // 'instant' | 'deep'
  mode: {
    type: String,
    required: true,
    enum: ['instant', 'deep']
  },

  // The clean sequence string for verification
  sequence: {
    type: String,
    required: true
  },

  // The full serialized computed analysis payload
  result: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  }
}, {
  timestamps: true,
  collection: 'cache_store'
});

// Speed indices
cacheStoreSchema.index({ mode: 1 });

module.exports = mongoose.model('CacheStore', cacheStoreSchema);
