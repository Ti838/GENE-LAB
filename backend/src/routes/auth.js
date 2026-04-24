const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRY || '24h' });

// ── POST /api/auth/register ──────────────────────────────────────────
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').isIn(['doctor', 'researcher', 'admin']).withMessage('Invalid role')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email, password, role, organization, specialization, licenseNumber, phone } = req.body;

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Email already registered.' });

    const user = await User.create({ name, email, password, role, organization, specialization, licenseNumber, phone });

    await AuditLog.create({ userId: user._id, action: 'register', resourceType: 'user', resourceId: user._id, details: { role }, ipAddress: req.ip });

    const token = generateToken(user._id);
    res.status(201).json({
      message: 'Account created successfully!',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, organization: user.organization }
    });
  } catch (err) { next(err); }
});

// ── POST /api/auth/login ─────────────────────────────────────────────
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid email or password.' });

    if (user.isLocked()) {
      const remaining = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(423).json({ message: `Account locked. Try again in ${remaining} minute(s).` });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
        user.failedLoginAttempts = 0;
      }
      await user.save();
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    if (!user.isActive) return res.status(403).json({ message: 'Account deactivated. Contact admin.' });

    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLogin = new Date();
    await user.save();

    await AuditLog.create({ userId: user._id, action: 'login', resourceType: 'session', details: { email }, ipAddress: req.ip });

    const token = generateToken(user._id);
    res.json({
      message: 'Login successful!',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, organization: user.organization, specialization: user.specialization }
    });
  } catch (err) { next(err); }
});

// ── GET /api/auth/me ─────────────────────────────────────────────────
router.get('/me', require('../middleware/auth').protect, async (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
