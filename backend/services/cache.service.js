/**
 * GenLab AI — Cache & MD5 Verification Service
 * Manages the high-performance caching layer using md5 hashes.
 * Ensures <2s response times for identical DNA queries and maps mutation logs.
 */
const crypto = require('crypto');
const CacheStore = require('../models/CacheStore');
const MutationLog = require('../models/MutationLog');

/**
 * Normalizes a DNA sequence: uppercase, removes whitespaces, preserves only strict ATGC.
 * @param {string} seq - Raw DNA sequence
 * @returns {string} Cleaned strict sequence
 */
function cleanSequence(seq) {
  if (!seq) return '';
  return seq.toUpperCase().replace(/[^ATGC]/g, '');
}

/**
 * Calculates MD5 checksum for a cleaned sequence + mode.
 * @param {string} seq - Raw sequence
 * @param {string} mode - 'instant' | 'deep'
 * @returns {string} MD5 digest string
 */
function calculateHash(seq, mode) {
  const cleaned = cleanSequence(seq);
  return crypto.createHash('md5')
    .update(`${cleaned}_${mode}`)
    .digest('hex');
}

/**
 * Queries cache store for existing result.
 * @param {string} seq - Sequence string
 * @param {string} mode - 'instant' | 'deep'
 * @returns {Promise<Object|null>} Cached payload or null
 */
async function getCachedResult(seq, mode) {
  try {
    const hash = calculateHash(seq, mode);
    const cached = await CacheStore.findOne({ hash }).lean();
    if (cached) {
      console.log(`🚀 [Cache Hit] Serving ${mode} analysis instantly from MongoDB cache store (hash: ${hash})`);
      return cached.result;
    }
    return null;
  } catch (err) {
    console.error('⚠️ Cache fetch failed:', err.message);
    return null;
  }
}

/**
 * Saves analysis results to the MongoDB cache_store and maps variants to mutation_logs.
 * @param {string} seq - Cleaned sequence string
 * @param {string} mode - 'instant' | 'deep'
 * @param {Object} result - Computed analysis payload
 * @param {string} [userId] - Optional operator ID for mutation logs
 * @param {string} [dnaFileId] - Optional associated DNAFile ID
 */
async function setCachedResult(seq, mode, result, userId = null, dnaFileId = null) {
  try {
    const hash = calculateHash(seq, mode);
    const cleaned = cleanSequence(seq);
    
    // Save to CacheStore
    await CacheStore.findOneAndUpdate(
      { hash },
      { hash, mode, sequence: cleaned, result },
      { upsert: true, new: true }
    );
    console.log(`💾 [Cache Write] Saved ${mode} analysis to cache store (hash: ${hash})`);

    // Extract variants for MutationLog if instant mode with mutation results
    if (mode === 'instant' && result.mutation_analysis && Array.isArray(result.mutation_analysis.variants)) {
      const variants = result.mutation_analysis.variants;
      const logs = variants.map(v => ({
        dnaFileId,
        userId: userId || result.userId || undefined,
        variantId: v.variant_id || v.rsid || 'unknown',
        gene: v.gene || 'Unknown',
        chromosome: v.chromosome,
        position: v.position,
        clinicalSignificance: v.clinical_significance || 'Uncertain',
        severity: ['HIGH', 'MODERATE', 'LOW'].includes(v.severity) ? v.severity : 'UNKNOWN',
        diseaseAssociations: Array.isArray(v.disease_associations) ? v.disease_associations : []
      })).filter(log => log.userId); // Only log if associated with a user action

      if (logs.length > 0) {
        await MutationLog.insertMany(logs, { ordered: false }).catch(err => {
          // Gracefully handle any duplicate inserts
          console.warn('⚠️ Mutation logs bulk write partially succeeded:', err.message);
        });
        console.log(`🧬 [Mutation Log] Registered ${logs.length} variants in mutation_logs`);
      }
    }
  } catch (err) {
    console.error('⚠️ Cache store failed:', err.message);
  }
}

module.exports = {
  cleanSequence,
  calculateHash,
  getCachedResult,
  setCachedResult
};
