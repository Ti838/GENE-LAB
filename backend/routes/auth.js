/**
 * Copyright (c) 2026 GeneLab. All rights reserved.
 * Do not copy, distribute, or modify without permission.
 */
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { sendVerificationEmail } = require('../utils/email');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRY || '24h' });

// Helper to get base URL for verification links
const getHostUrl = (req) => {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  return `${protocol}://${req.get('host')}`;
};

// ── POST /api/auth/register ──────────────────────────────────────────
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').isIn(['doctor', 'researcher', 'admin', 'employee']).withMessage('Invalid role'),
  body('gender').optional().isIn(['male', 'female', 'other']).withMessage('Invalid gender')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email, password, role, gender, organization, specialization, licenseNumber, phone } = req.body;

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Email already registered.' });

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await User.create({
      name,
      email,
      password,
      role,
      gender,
      organization,
      specialization,
      licenseNumber,
      phone,
      isEmailVerified: false, // Explicitly false for new users
      verificationToken,
      verificationTokenExpires
    });

    await AuditLog.create({ userId: user._id, action: 'register', resourceType: 'user', resourceId: user._id, details: { role }, ipAddress: req.ip });

    // Send verification email
    const hostUrl = getHostUrl(req);
    const emailResult = await sendVerificationEmail(user.email, user.name, verificationToken, hostUrl);

    res.status(201).json({
      message: 'Account created successfully! Please check your email to verify your account before logging in.',
      requiresVerification: true,
      debugVerificationLink: !process.env.RESEND_API_KEY ? emailResult.link : undefined,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) { next(err); }
});

// ── GET /api/auth/verify-email ────────────────────────────────────────
router.get('/verify-email', async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).send(getErrorHtml('Verification token is missing.'));
    }

    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).send(getErrorHtml('Invalid or expired verification token. Please request a new verification email.'));
    }

    user.isEmailVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    await AuditLog.create({
      userId: user._id,
      action: 'verify_email',
      resourceType: 'user',
      resourceId: user._id,
      details: { email: user.email },
      ipAddress: req.ip
    });

    res.send(getSuccessHtml(user.name));
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/resend-verification ────────────────────────────────
router.post('/resend-verification', [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found with this email.' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: 'This email is already verified. You can log in.' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.verificationToken = verificationToken;
    user.verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    const hostUrl = getHostUrl(req);
    await sendVerificationEmail(user.email, user.name, verificationToken, hostUrl);

    res.json({ message: 'Verification email resent successfully! Please check your inbox.' });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/login ─────────────────────────────────────────────
router.post('/login', [
  body('password').notEmpty()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, phone, password } = req.body;
    
    let user;
    if (email) {
      user = await User.findOne({ email: email.toLowerCase().trim() });
    } else if (phone) {
      user = await User.findOne({ phone: phone.trim() });
    } else {
      return res.status(400).json({ message: 'Email or phone number is required.' });
    }
    
    if (!user) return res.status(401).json({ message: 'Invalid credentials.' });

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
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    if (!user.isActive) return res.status(403).json({ message: 'Account deactivated. Contact admin.' });
    
    // Enforce email verification
    if (!user.isEmailVerified) {
      return res.status(403).json({
        message: 'Your email address is not verified yet. Please check your inbox for the verification link.',
        requiresVerification: true,
        email: user.email
      });
    }

    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLogin = new Date();
    await user.save();

    await AuditLog.create({ 
      userId: user._id, 
      action: 'login', 
      resourceType: 'session', 
      details: { email: user.email, phone: user.phone, loginMethod: email ? 'email' : 'phone' }, 
      ipAddress: req.ip 
    });

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

// ── HTML Templates for Email Verification Results ────────────────────
function getSuccessHtml(name) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Email Verified - GeneLab AI</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background-color: #0f172a;
          color: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
        }
        .card {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 16px;
          padding: 40px;
          text-align: center;
          max-width: 450px;
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);
        }
        .icon {
          font-size: 48px;
          margin-bottom: 20px;
        }
        h1 {
          font-size: 24px;
          margin-bottom: 12px;
          background: linear-gradient(135deg, #818cf8, #6366f1);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        p {
          color: #94a3b8;
          font-size: 16px;
          line-height: 1.5;
          margin-bottom: 24px;
        }
        .btn {
          display: inline-block;
          background: #6366f1;
          color: #fff;
          text-decoration: none;
          padding: 12px 28px;
          border-radius: 8px;
          font-weight: 600;
          transition: background 0.2s;
        }
        .btn:hover { background: #4f46e5; }
      </style>
      <script>
        setTimeout(function() {
          window.location.href = '/login';
        }, 5000);
      </script>
    </head>
    <body>
      <div class="card">
        <div class="icon">✅</div>
        <h1>Verification Successful</h1>
        <p>Congratulations ${name}! Your email has been successfully verified. You will be redirected to the login page shortly.</p>
        <a href="/login" class="btn">Go to Login Now</a>
      </div>
    </body>
    </html>
  `;
}

function getErrorHtml(message) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Verification Failed - GeneLab AI</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background-color: #0f172a;
          color: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
        }
        .card {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 16px;
          padding: 40px;
          text-align: center;
          max-width: 450px;
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);
        }
        .icon {
          font-size: 48px;
          margin-bottom: 20px;
        }
        h1 {
          font-size: 24px;
          margin-bottom: 12px;
          color: #f87171;
        }
        p {
          color: #94a3b8;
          font-size: 16px;
          line-height: 1.5;
          margin-bottom: 24px;
        }
        .btn {
          display: inline-block;
          background: #334155;
          color: #fff;
          text-decoration: none;
          padding: 12px 28px;
          border-radius: 8px;
          font-weight: 600;
          transition: background 0.2s;
        }
        .btn:hover { background: #475569; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon">❌</div>
        <h1>Verification Failed</h1>
        <p>${message}</p>
        <a href="/login" class="btn">Return to Login</a>
      </div>
    </body>
    </html>
  `;
}

module.exports = router;

