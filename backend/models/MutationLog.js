/**
 * GenLab AI — MutationLog MongoDB Model
 * Records every identified and clinically mapped genetic variant mutation.
 */
const mongoose = require('mongoose');

const mutationLogSchema = new mongoose.Schema({
  dnaFileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DNAFile'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  variantId: {
    type: String,
    required: true
  },
  gene: {
    type: String,
    default: 'Unknown'
  },
  chromosome: {
    type: String
  },
  position: {
    type: Number
  },
  clinicalSignificance: {
    type: String,
    default: 'Uncertain'
  },
  severity: {
    type: String,
    enum: ['LOW', 'MODERATE', 'HIGH', 'UNKNOWN'],
    default: 'UNKNOWN'
  },
  diseaseAssociations: [{
    type: String
  }]
}, {
  timestamps: true,
  collection: 'mutation_logs'
});

// Rapid lookup indices
mutationLogSchema.index({ variantId: 1 });
mutationLogSchema.index({ gene: 1 });
mutationLogSchema.index({ severity: 1 });
mutationLogSchema.index({ userId: 1 });

module.exports = mongoose.model('MutationLog', mutationLogSchema);
