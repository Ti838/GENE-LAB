const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { protect } = require('../middleware/auth');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/email');
const { getFirebaseAdminAuth } = require('../services/firebaseAdmin');

const generateToken = (user) => jwt.sign(
  { id: user._id.toString(), role: user.role, provider: user.authProvider },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRY || '24h' }
);

const serializeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
  organization: user.organization,
  specialization: user.specialization,
  licenseNumber: user.licenseNumber,
  profilePicture: user.profilePicture,
  authProvider: user.authProvider,
  isEmailVerified: user.isEmailVerified,
  createdAt: user.createdAt,
  lastLogin: user.lastLogin
});

const getHostUrl = (req) => {
  if (process.env.FRONTEND_URL && process.env.FRONTEND_URL !== '*') {
    return process.env.FRONTEND_URL.replace(/\/$/, '');
  }
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  return `${protocol}://${req.get('host')}`;
};

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const logSecurityEvent = async (userId, action, resourceType, details, req) => {
  try {
    await AuditLog.create({
      userId,
      action,
      resourceType,
      resourceId: userId,
      details,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
  } catch (error) {
    console.warn(`Audit log skipped for ${action}:`, error.message);
  }
};

const verifyRequest = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed');
    error.statusCode = 400;
    error.details = errors.array();
    throw error;
  }
};

router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('confirmPassword').optional().custom((value, { req }) => value === req.body.password).withMessage('Passwords do not match'),
  body('role').isIn(['doctor', 'researcher', 'admin', 'employee']).withMessage('Invalid role'),
  body('gender').optional().isIn(['male', 'female', 'other']).withMessage('Invalid gender')
], async (req, res, next) => {
  try {
    verifyRequest(req);

    const {
      name,
      email,
      password,
      role,
      gender,
      organization,
      specialization,
      licenseNumber,
      phone
    } = req.body;

    const normalizedEmail = email.toLowerCase().trim();
    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) return res.status(409).json({ message: 'Email already registered.' });

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role,
      gender,
      organization,
      specialization,
      licenseNumber,
      phone,
      authProvider: 'local',
      isEmailVerified: false,
      verificationToken,
      verificationTokenExpires
    });

    await logSecurityEvent(user._id, 'register', 'user', { role, authProvider: 'local' }, req);

    const hostUrl = getHostUrl(req);
    const emailResult = await sendVerificationEmail(user.email, user.name, verificationToken, hostUrl);

    res.status(201).json({
      message: 'Account created successfully. Please verify your email before logging in.',
      requiresVerification: true,
      debugVerificationLink: !process.env.RESEND_API_KEY ? emailResult.link : undefined,
      user: serializeUser(user)
    });
  } catch (err) {
    if (err.details) return res.status(err.statusCode || 400).json({ message: err.message, errors: err.details });
    next(err);
  }
});

router.post('/login', [
  body('password').notEmpty().withMessage('Password is required'),
  body('email').optional().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('phone').optional().isString().trim()
], async (req, res, next) => {
  try {
    verifyRequest(req);

    const { email, phone, password } = req.body;
    const normalizedEmail = email ? email.toLowerCase().trim() : '';

    let user;
    if (normalizedEmail) {
      user = await User.findOne({ email: normalizedEmail }).select('+password');
    } else if (phone) {
      user = await User.findOne({ phone: phone.trim() }).select('+password');
    } else {
      return res.status(400).json({ message: 'Email or phone number is required.' });
    }

    if (!user) return res.status(401).json({ message: 'Invalid credentials.' });
    if (user.authProvider === 'google' && !user.password) {
      return res.status(400).json({ message: 'This account uses Google sign-in. Continue with Google.' });
    }
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

    await logSecurityEvent(user._id, 'login', 'session', { email: user.email, phone: user.phone, loginMethod: normalizedEmail ? 'email' : 'phone' }, req);

    const token = generateToken(user);
    res.json({
      message: 'Login successful!',
      token,
      user: serializeUser(user)
    });
  } catch (err) {
    if (err.details) return res.status(err.statusCode || 400).json({ message: err.message, errors: err.details });
    next(err);
  }
});

router.post('/google', [
  body('idToken').notEmpty().withMessage('Firebase ID token is required'),
  body('role').optional().isIn(['doctor', 'researcher', 'admin', 'employee']).withMessage('Invalid role')
], async (req, res, next) => {
  try {
    verifyRequest(req);

    const { idToken, role } = req.body;
    const firebaseAuth = getFirebaseAdminAuth();
    if (!firebaseAuth) {
      return res.status(503).json({ message: 'Firebase authentication is not configured on the server.' });
    }

    const decoded = await firebaseAuth.verifyIdToken(idToken);
    const normalizedEmail = (decoded.email || '').toLowerCase().trim();

    if (!normalizedEmail) {
      return res.status(400).json({ message: 'Google account does not expose an email address.' });
    }

    let user = await User.findOne({ $or: [{ firebaseUid: decoded.uid }, { email: normalizedEmail }] });

    if (!user) {
      user = await User.create({
        name: decoded.name || normalizedEmail.split('@')[0],
        email: normalizedEmail,
        role: role || 'doctor',
        authProvider: 'google',
        firebaseUid: decoded.uid,
        profilePicture: decoded.picture || '',
        profilePictureProvider: decoded.picture ? 'firebase' : 'none',
        isEmailVerified: true,
        lastLogin: new Date()
      });
    } else {
      user.firebaseUid = user.firebaseUid || decoded.uid;
      if (!user.name && decoded.name) user.name = decoded.name;
      if (decoded.picture && !user.profilePicture) {
        user.profilePicture = decoded.picture;
        user.profilePictureProvider = 'firebase';
      }
      user.isEmailVerified = true;
      user.lastLogin = new Date();
      if (user.authProvider !== 'google' && !user.password) {
        user.authProvider = 'google';
      }
      await user.save();
    }

    await logSecurityEvent(user._id, 'google_login', 'session', { email: normalizedEmail, firebaseUid: decoded.uid }, req);

    const token = generateToken(user);
    res.json({
      message: 'Google login successful!',
      token,
      user: serializeUser(user),
      isNewUser: false
    });
  } catch (err) {
    if (err.details) return res.status(err.statusCode || 400).json({ message: err.message, errors: err.details });
    next(err);
  }
});

router.post('/forgot-password', [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail()
], async (req, res, next) => {
  try {
    verifyRequest(req);

    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ message: 'If an account exists for that email, a reset link has been sent.' });
    }

    if (user.authProvider === 'google' && !user.password) {
      return res.status(400).json({ message: 'This account uses Google sign-in. Use Google login instead of password reset.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetTokenHash = hashToken(resetToken);
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const hostUrl = getHostUrl(req);
    const resetEmail = await sendPasswordResetEmail(user.email, user.name, resetToken, hostUrl);

    await logSecurityEvent(user._id, 'forgot_password', 'user', { email: user.email }, req);

    res.json({
      message: 'If an account exists for that email, a reset link has been sent.',
      debugResetLink: !process.env.RESEND_API_KEY ? resetEmail.link : undefined
    });
  } catch (err) {
    if (err.details) return res.status(err.statusCode || 400).json({ message: err.message, errors: err.details });
    next(err);
  }
});

router.post('/reset-password', [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
], async (req, res, next) => {
  try {
    verifyRequest(req);

    const { token, newPassword } = req.body;
    const tokenHash = hashToken(token);

    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpires: { $gt: new Date() }
    }).select('+password');

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired password reset token.' });
    }

    if (user.authProvider === 'google' && !user.password) {
      return res.status(400).json({ message: 'Google-linked accounts do not support password resets.' });
    }

    user.password = newPassword;
    user.authProvider = 'local';
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpires = undefined;
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    await logSecurityEvent(user._id, 'reset_password', 'user', { email: user.email }, req);

    res.json({ message: 'Password updated successfully. Please log in again.' });
  } catch (err) {
    if (err.details) return res.status(err.statusCode || 400).json({ message: err.message, errors: err.details });
    next(err);
  }
});

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

    await logSecurityEvent(user._id, 'verify_email', 'user', { email: user.email }, req);

    res.send(getSuccessHtml(user.name));
  } catch (err) {
    next(err);
  }
});

router.post('/resend-verification', [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail()
], async (req, res, next) => {
  try {
    verifyRequest(req);

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
    if (err.details) return res.status(err.statusCode || 400).json({ message: err.message, errors: err.details });
    next(err);
  }
});

router.get('/me', protect, async (req, res) => {
  res.json({ user: serializeUser(req.user) });
});

router.get('/firebase-config', (req, res) => {
  const config = {
    apiKey: process.env.FIREBASE_WEB_API_KEY || '',
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.FIREBASE_WEB_APP_ID || '',
    measurementId: process.env.FIREBASE_MEASUREMENT_ID || ''
  };

  res.json({
    configured: Boolean(config.apiKey && config.authDomain && config.projectId && config.appId),
    config
  });
});

function getSuccessHtml(name) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Email Verified - GeneLab AI</title>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background-color: #0f172a;
          color: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
          padding: 24px;
          box-sizing: border-box;
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
        .icon { font-size: 48px; margin-bottom: 20px; }
        h1 {
          font-size: 24px;
          margin-bottom: 12px;
          background: linear-gradient(135deg, #818cf8, #6366f1);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        p { color: #94a3b8; font-size: 16px; line-height: 1.5; margin-bottom: 24px; }
        .btn {
          display: inline-block;
          background: #6366f1;
          color: #fff;
          text-decoration: none;
          padding: 12px 28px;
          border-radius: 8px;
          font-weight: 600;
        }
      </style>
      <script>
        setTimeout(function() { window.location.href = '/login'; }, 5000);
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
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background-color: #0f172a;
          color: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
          padding: 24px;
          box-sizing: border-box;
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
        .icon { font-size: 48px; margin-bottom: 20px; }
        h1 { font-size: 24px; margin-bottom: 12px; color: #f87171; }
        p { color: #94a3b8; font-size: 16px; line-height: 1.5; margin-bottom: 24px; }
        .btn {
          display: inline-block;
          background: #334155;
          color: #fff;
          text-decoration: none;
          padding: 12px 28px;
          border-radius: 8px;
          font-weight: 600;
        }
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