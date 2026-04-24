const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ message: 'User not found. Token invalid.' });
    if (!user.isActive) return res.status(403).json({ message: 'Account is deactivated.' });
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') return next();
  return res.status(403).json({ message: 'Admin access only.' });
};

const doctorOnly = (req, res, next) => {
  if (req.user && (req.user.role === 'doctor' || req.user.role === 'researcher')) return next();
  return res.status(403).json({ message: 'Doctor/Researcher access only.' });
};

module.exports = { protect, adminOnly, doctorOnly };
