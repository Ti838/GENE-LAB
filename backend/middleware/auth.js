/**
 * Copyright (c) 2026 GeneLab. All rights reserved.
 * Do not copy, distribute, or modify without permission.
 */
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getFirebaseAdminAuth } = require('../services/firebaseAdmin');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }
    const token = authHeader.split(' ')[1];
    let user = null;

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      user = await User.findById(decoded.id).select('-password');
    } catch (jwtError) {
      const firebaseAuth = getFirebaseAdminAuth();
      if (!firebaseAuth) {
        throw jwtError;
      }

      const firebaseDecoded = await firebaseAuth.verifyIdToken(token);
      user = await User.findOne({
        $or: [
          { firebaseUid: firebaseDecoded.uid },
          { email: firebaseDecoded.email?.toLowerCase() }
        ]
      }).select('-password');
    }

    if (!user) return res.status(401).json({ message: 'User not found. Token invalid.' });
    if (!user.isActive) return res.status(403).json({ message: 'Account is deactivated.' });
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

const authorizeRoles = (...roles) => (req, res, next) => {
  if (req.user && roles.includes(req.user.role)) return next();
  return res.status(403).json({ message: 'Insufficient access privileges.' });
};

const adminOnly = authorizeRoles('admin');

const doctorOnly = authorizeRoles('doctor', 'researcher', 'admin');

module.exports = { protect, adminOnly, doctorOnly, authorizeRoles };

