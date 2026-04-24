/**
 * Copyright (c) 2026 GeneLab. All rights reserved.
 * Do not copy, distribute, or modify without permission.
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 8 },
  role: { type: String, enum: ['doctor', 'researcher', 'admin', 'employee'], default: 'doctor' },
  organization: { type: String, trim: true },
  specialization: { type: String, trim: true },
  licenseNumber: { type: String, trim: true },
  phone: { type: String, trim: true },
  profilePicture: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  isEmailVerified: { type: Boolean, default: true },
  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date },
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Check if account is locked
userSchema.methods.isLocked = function () {
  return this.lockUntil && this.lockUntil > Date.now();
};

module.exports = mongoose.model('User', userSchema);

