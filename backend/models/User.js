/**
 * Copyright (c) 2026 GeneLab. All rights reserved.
 * Do not copy, distribute, or modify without permission.
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: {
    type: String,
    minlength: 8,
    select: false,
    default: '',
    required: function requiredPassword() {
      return this.authProvider !== 'google';
    }
  },
  role: { type: String, enum: ['doctor', 'researcher', 'admin', 'employee'], default: 'doctor' },
  authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
  firebaseUid: { type: String, trim: true },
  supabaseUid: { type: String, trim: true },
  gender: { type: String, enum: ['male', 'female', 'other'], trim: true },
  organization: { type: String, trim: true },
  specialization: { type: String, trim: true },
  licenseNumber: { type: String, trim: true },
  phone: { type: String, trim: true },
  profilePicture: { type: String, default: '' },
  profilePicturePath: { type: String, default: '' },
  profilePictureProvider: { type: String, enum: ['firebase', 'supabase', 'manual', 'none'], default: 'none' },
  signatureUrl: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  isEmailVerified: { type: Boolean, default: false },
  verificationToken: { type: String },
  verificationTokenExpires: { type: Date },
  passwordResetTokenHash: { type: String },
  passwordResetExpires: { type: Date },
  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date },
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true, collection: 'users' });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Check if account is locked
userSchema.methods.isLocked = function () {
  return this.lockUntil && this.lockUntil > Date.now();
};

// Indexes for ultra-fast queries and organized MongoDB layout
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ firebaseUid: 1 }, { sparse: true });
userSchema.index({ supabaseUid: 1 }, { sparse: true });

module.exports = mongoose.model('User', userSchema);

