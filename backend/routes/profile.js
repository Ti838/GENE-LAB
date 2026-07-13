/**
 * Copyright (c) 2026 GeneLab. All rights reserved.
 * Do not copy, distribute, or modify without permission.
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const { uploadBufferToFirebase } = require('../services/firebaseStorage');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

// ── GET /api/profile ── Get profile ─────────────────────────────────
router.get('/', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/profile ── Update profile ──────────────────────────────
router.put('/', protect, async (req, res, next) => {
  try {
    const allowed = ['name', 'phone', 'organization', 'specialization', 'licenseNumber', 'gender'];
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
    const user = await User.findById(req.user._id).select('+password');

    if (!user.password) {
      return res.status(400).json({ message: 'This account uses Google sign-in. Password changes are not available.' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect.' });
    if (newPassword.length < 8) return res.status(400).json({ message: 'New password must be at least 8 characters.' });
    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password changed successfully!' });
  } catch (err) { next(err); }
});

// ── PUT /api/profile/photo ── Update profile picture ───────────────
router.put('/photo', protect, upload.single('profilePhoto'), async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (req.file) {
      const uploadResult = await uploadBufferToFirebase({
        buffer: req.file.buffer,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        folder: 'profile-images',
        ownerId: req.user._id.toString(),
        metadata: { userId: req.user._id.toString(), purpose: 'profile-photo' }
      });

       user.profilePicture = uploadResult.downloadUrl;
      user.profilePicturePath = uploadResult.storagePath;
      user.profilePictureProvider = 'local';
      await user.save();

      return res.json({
        message: 'Profile photo updated!',
        user: await User.findById(req.user._id).select('-password'),
        upload: uploadResult
      });
    }

    const { profilePicture } = req.body;
    if (typeof profilePicture !== 'string' || profilePicture.trim().length === 0) {
      return res.status(400).json({ message: 'profilePicture is required.' });
    }

    user.profilePicture = profilePicture.trim();
    user.profilePicturePath = '';
    user.profilePictureProvider = 'manual';
    await user.save();

    res.json({ message: 'Profile photo updated!', user: await User.findById(req.user._id).select('-password') });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/profile/signature ── Update digital signature ──────────
router.put('/signature', protect, upload.single('signature'), async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (req.file) {
      const uploadResult = await uploadBufferToFirebase({
        buffer: req.file.buffer,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        folder: 'signatures',
        ownerId: req.user._id.toString(),
        metadata: { userId: req.user._id.toString(), purpose: 'digital-signature' }
      });

      user.signatureUrl = uploadResult.downloadUrl;
      await user.save();

      return res.json({
        message: 'Signature updated successfully!',
        user: await User.findById(req.user._id).select('-password'),
        signatureUrl: uploadResult.downloadUrl
      });
    }

    const { signatureUrl } = req.body;
    if (typeof signatureUrl !== 'string' || signatureUrl.trim().length === 0) {
      return res.status(400).json({ message: 'Signature file or URL is required.' });
    }

    user.signatureUrl = signatureUrl.trim();
    await user.save();

    res.json({ message: 'Signature updated successfully!', user: await User.findById(req.user._id).select('-password'), signatureUrl: user.signatureUrl });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

