/**
 * GenLab AI — SystemLog MongoDB Model
 * Centralized logging schema for system warnings, errors, and uncaught exceptions.
 */
const mongoose = require('mongoose');

const systemLogSchema = new mongoose.Schema({
  level: {
    type: String,
    enum: ['info', 'warn', 'error', 'fatal'],
    default: 'info',
    required: true
  },
  message: {
    type: String,
    required: true
  },
  stack: {
    type: String
  },
  context: {
    type: String,
    required: true,
    default: 'system'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  }
}, {
  timestamps: true,
  collection: 'system_logs'
});

// Indices for compliance audit sorting
systemLogSchema.index({ level: 1 });
systemLogSchema.index({ context: 1 });
systemLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('SystemLog', systemLogSchema);
