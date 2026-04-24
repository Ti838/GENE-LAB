const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.put('/', protect, async (req, res) => {
    try {
        const allowed = ['name', 'phone', 'specialization', 'profilePhoto'];
        const updates = {};

        allowed.forEach((field) => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        if (req.body.organization !== undefined) {
            updates.hospital = req.body.organization;
        }

        if (req.body.licenseNumber !== undefined) {
            updates.licenseId = req.body.licenseNumber;
        }

        if (req.body.profilePicture !== undefined) {
            updates.profilePhoto = req.body.profilePicture;
        }

        const user = await User.findByIdAndUpdate(req.user.id, updates, {
            new: true,
            runValidators: true
        }).select('-password');

        res.json({ message: 'Profile updated!', user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.put('/photo', protect, async (req, res) => {
    try {
        const { profilePicture } = req.body;
        if (!profilePicture) {
            return res.status(400).json({ message: 'profilePicture is required.' });
        }

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { profilePhoto: profilePicture },
            { new: true, runValidators: true }
        ).select('-password');

        res.json({ message: 'Profile photo updated!', user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.put('/password', protect, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Both currentPassword and newPassword are required.' });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect.' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ message: 'New password must be at least 8 characters.' });
        }

        user.password = newPassword;
        await user.save();

        res.json({ message: 'Password changed successfully!' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
