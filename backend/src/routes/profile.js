const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');

// ── GET /api/profile ── Get profile ─────────────────────────────────
router.get('/', protect, async (req, res) => {
  res.json({ user: req.user });
});

// ── PUT /api/profile ── Update profile ──────────────────────────────
router.put('/', protect, async (req, res, next) => {
  try {
    const allowed = ['name', 'phone', 'organization', 'specialization', 'licenseNumber', 'profilePicture'];
    const updates = {};
    allowed.forEach(field => { if (req.body[field] !== undefined) updates[field] = req.body[field]; });

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true }).select('-password');
    res.json({ message: 'Profile updated!', user });
  } catch (err) { next(err); }
});

// ── PUT /api/profile/password ── Change password ────────────────────
router.put('/password', protect, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect.' });
    if (newPassword.length < 8) return res.status(400).json({ message: 'New password must be at least 8 characters.' });
    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password changed successfully!' });
  } catch (err) { next(err); }
});

// ── PUT /api/profile/photo ── Update profile picture ───────────────
router.put('/photo', protect, async (req, res, next) => {
  try {
    const { profilePicture } = req.body;
    if (typeof profilePicture !== 'string' || profilePicture.trim().length === 0) {
      return res.status(400).json({ message: 'profilePicture is required.' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { profilePicture: profilePicture.trim() },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({ message: 'Profile photo updated!', user });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
