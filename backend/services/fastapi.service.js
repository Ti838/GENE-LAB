/**
 * GenLab AI — FastAPI Client Service
 * Axios-based HTTP client for communicating with the Python FastAPI bioinformatics service.
 * Handles file uploads (multipart), JSON requests, and error normalization.
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const FASTAPI_BASE_URL = process.env.FASTAPI_URL || 'http://localhost:8000';

// ── Axios instance with sensible defaults ─────────────────────────────────
const fastapiClient = axios.create({
  baseURL: FASTAPI_BASE_URL,
  timeout: 200_000,  // 200s — BLAST can take a while
  headers: { 'Accept': 'application/json' }
});

/**
 * Sends a DNA file to the FastAPI instant analysis endpoint.
 * @param {string} filePath - Local path to the uploaded file
 * @param {string} fileName - Original file name (used for format detection)
 * @param {string[]} [variantIds] - Optional list of rsIDs for MyVariant lookup
 * @returns {Promise<Object>} Full analysis result
 */
async function runInstantAnalysisFile(filePath, fileName, variantIds = []) {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath), { filename: fileName });
  if (variantIds.length > 0) {
    form.append('variant_ids', variantIds.join(','));
  }

  try {
    const response = await fastapiClient.post('/instant-analysis/', form, {
      headers: { ...form.getHeaders() },
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });
    return response.data;
  } catch (err) {
    throw _normalizeError(err, 'Instant analysis (file)');
  }
}

/**
 * Sends a raw DNA sequence string to the FastAPI instant analysis endpoint.
 * @param {string} sequence - Raw DNA sequence
 * @param {string} [name] - Optional sequence name/label
 * @param {string[]} [variantIds] - Optional rsIDs
 * @returns {Promise<Object>} Full analysis result
 */
async function runInstantAnalysisText(sequence, name = 'manual_sequence', variantIds = []) {
  const form = new FormData();
  form.append('sequence', sequence);
  form.append('name', name);
  if (variantIds.length > 0) {
    form.append('variant_ids', variantIds.join(','));
  }

  try {
    const response = await fastapiClient.post('/instant-analysis/from-text', form, {
      headers: { ...form.getHeaders() }
    });
    return response.data;
  } catch (err) {
    throw _normalizeError(err, 'Instant analysis (text)');
  }
}

/**
 * Sends a DNA file to the FastAPI deep (BLAST) analysis endpoint.
 * @param {string} filePath - Local path to the uploaded file
 * @param {string} fileName - Original file name
 * @returns {Promise<Object>} BLAST analysis result
 */
async function runDeepAnalysisFile(filePath, fileName) {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath), { filename: fileName });

  try {
    const response = await fastapiClient.post('/deep-analysis/', form, {
      headers: { ...form.getHeaders() },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 200_000
    });
    return response.data;
  } catch (err) {
    throw _normalizeError(err, 'Deep analysis (BLAST)');
  }
}

/**
 * Sends a raw DNA sequence to the FastAPI deep (BLAST) endpoint.
 * @param {string} sequence - Raw DNA sequence
 * @param {string} [name] - Optional label
 * @returns {Promise<Object>} BLAST analysis result
 */
async function runDeepAnalysisText(sequence, name = 'manual_sequence') {
  const form = new FormData();
  form.append('sequence', sequence);
  form.append('name', name);

  try {
    const response = await fastapiClient.post('/deep-analysis/from-text', form, {
      headers: { ...form.getHeaders() },
      timeout: 200_000
    });
    return response.data;
  } catch (err) {
    throw _normalizeError(err, 'Deep analysis (BLAST, text)');
  }
}

/**
 * Requests a PDF report for an instant analysis result from FastAPI.
 * @param {Object} analysisResult - The computed analysis result object
 * @returns {Promise<Buffer>} PDF bytes
 */
async function getInstantAnalysisPDF(analysisResult) {
  try {
    const response = await fastapiClient.post('/instant-analysis/report', analysisResult, {
      headers: { 'Content-Type': 'application/json' },
      responseType: 'arraybuffer'
    });
    return Buffer.from(response.data);
  } catch (err) {
    throw _normalizeError(err, 'PDF report generation (instant)');
  }
}

/**
 * Requests a PDF report for a BLAST analysis result from FastAPI.
 * @param {Object} blastResult - The BLAST analysis result object
 * @returns {Promise<Buffer>} PDF bytes
 */
async function getDeepAnalysisPDF(blastResult) {
  try {
    const response = await fastapiClient.post('/deep-analysis/report', blastResult, {
      headers: { 'Content-Type': 'application/json' },
      responseType: 'arraybuffer'
    });
    return Buffer.from(response.data);
  } catch (err) {
    throw _normalizeError(err, 'PDF report generation (deep)');
  }
}

/**
 * Checks FastAPI service health.
 * @returns {Promise<Object>} Health status
 */
async function checkFastAPIHealth() {
  try {
    const response = await fastapiClient.get('/health/', { timeout: 5000 });
    return { reachable: true, data: response.data };
  } catch (err) {
    return { reachable: false, error: err.message };
  }
}

// ── Error normalizer ──────────────────────────────────────────────────────
function _normalizeError(err, context) {
  if (err.response) {
    const detail = err.response.data?.detail || err.response.data || err.message;
    const msg = typeof detail === 'object' ? JSON.stringify(detail) : detail;
    const error = new Error(`FastAPI ${context} error [${err.response.status}]: ${msg}`);
    error.statusCode = err.response.status;
    return error;
  }
  if (err.code === 'ECONNREFUSED') {
    const error = new Error(`FastAPI service is not reachable at ${FASTAPI_BASE_URL}. Is it running?`);
    error.statusCode = 503;
    return error;
  }
  if (err.code === 'ETIMEDOUT' || err.message.includes('timeout')) {
    const error = new Error(`FastAPI ${context} timed out. BLAST analysis can take up to 3 minutes.`);
    error.statusCode = 504;
    return error;
  }
  return err;
}

module.exports = {
  runInstantAnalysisFile,
  runInstantAnalysisText,
  runDeepAnalysisFile,
  runDeepAnalysisText,
  getInstantAnalysisPDF,
  getDeepAnalysisPDF,
  checkFastAPIHealth
};
