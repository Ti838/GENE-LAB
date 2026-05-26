/**
 * GenLab AI — Centralized System Logger Service
 * Persists runtime exceptions, errors, and informational events into MongoDB (system_logs collection).
 * Prevents raw stack traces from exposing to client environments.
 */
const SystemLog = require('../models/SystemLog');

/**
 * Logs an event or exception to MongoDB system_logs.
 * @param {string} level - 'info' | 'warn' | 'error' | 'fatal'
 * @param {string|Error} message - Error object or message
 * @param {string} [context] - Originating service/route
 * @param {Object} [req] - Express request object for extracting metadata
 */
async function logEvent(level, message, context = 'system', req = null) {
  try {
    let msgStr = '';
    let stackStr = '';

    if (message instanceof Error) {
      msgStr = message.message;
      stackStr = message.stack;
    } else {
      msgStr = String(message);
    }

    const payload = {
      level,
      message: msgStr,
      stack: stackStr || undefined,
      context,
      userId: req?.user?._id || undefined,
      ipAddress: req?.ip || req?.headers['x-forwarded-for'] || undefined,
      userAgent: req?.headers['user-agent'] || undefined
    };

    // Save asynchronously so it doesn't block the caller
    SystemLog.create(payload).catch(err => {
      console.error('❌ Failed to write system log to MongoDB:', err.message);
    });

    // Mirror to standard console for Docker container log collection
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] [${level.toUpperCase()}] [${context}] ${msgStr}`;
    if (level === 'error' || level === 'fatal') {
      console.error(logLine);
      if (stackStr) console.error(stackStr);
    } else if (level === 'warn') {
      console.warn(logLine);
    } else {
      console.log(logLine);
    }

  } catch (err) {
    console.error('❌ Central logger encountered critical error:', err.message);
  }
}

/**
 * Convenience logger for errors
 */
async function error(err, context = 'system', req = null) {
  return logEvent('error', err, context, req);
}

/**
 * Convenience logger for warnings
 */
async function warn(message, context = 'system', req = null) {
  return logEvent('warn', message, context, req);
}

/**
 * Convenience logger for information
 */
async function info(message, context = 'system', req = null) {
  return logEvent('info', message, context, req);
}

module.exports = {
  logEvent,
  error,
  warn,
  info
};
