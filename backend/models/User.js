const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String },
    specialization: { type: String },
    hospital: { type: String },
    licenseId: { type: String },
    profilePhoto: { type: String, default: '' },
    role: { type: String, enum: ['doctor', 'admin'], default: 'doctor' },
    status: { type: String, enum: ['pending', 'approved', 'blocked'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

module.exports = mongoose.model('User', userSchema);
