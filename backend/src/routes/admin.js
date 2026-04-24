/**
 * Copyright (c) 2026 GeneLab. All rights reserved.
 * Do not copy, distribute, or modify without permission.
 */
const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const User = require('../models/User');
const SequencingRequest = require('../models/SequencingRequest');
const AuditLog = require('../models/AuditLog');

// ── GET /api/admin/stats ── System Stats ────────────────────────────
router.get('/stats', protect, adminOnly, async (req, res, next) => {
  try {
    const [totalUsers, totalDoctors, totalAdmins, totalRequests, pendingRequests, completedRequests] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: { $in: ['doctor', 'researcher'] } }),
      User.countDocuments({ role: 'admin' }),
      SequencingRequest.countDocuments(),
      SequencingRequest.countDocuments({ status: 'pending' }),
      SequencingRequest.countDocuments({ status: 'completed' })
    ]);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const newUsersThisMonth = await User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });
    const requestsThisMonth = await SequencingRequest.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });

    res.json({
      totalUsers, totalDoctors, totalAdmins, totalRequests,
      pendingRequests, completedRequests, newUsersThisMonth, requestsThisMonth,
      systemHealth: { uptime: '99.95%', cpu: '34%', memory: '62%', status: 'Operational' }
    });
  } catch (err) { next(err); }
});

// ── GET /api/admin/users ── List all users ───────────────────────────
router.get('/users', protect, adminOnly, async (req, res, next) => {
  try {
    const { search, role, status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;
    if (search) filter.$or = [{ name: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }, { organization: new RegExp(search, 'i') }];

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ users, total, page: Number(page), totalPages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
});

// ── PUT /api/admin/users/:id ── Update user ─────────────────────────
router.put('/users/:id', protect, adminOnly, async (req, res, next) => {
  try {
    const { isActive, role } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { isActive, role }, { new: true, runValidators: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found.' });

    await AuditLog.create({ userId: req.user._id, action: 'update_user', resourceType: 'user', resourceId: user._id, details: { isActive, role } });
    res.json({ message: 'User updated successfully.', user });
  } catch (err) { next(err); }
});

// ── GET /api/admin/requests ── All requests ─────────────────────────
router.get('/requests', protect, adminOnly, async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const total = await SequencingRequest.countDocuments(filter);
    const requests = await SequencingRequest.find(filter)
      .populate('userId', 'name email organization role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ requests, total, page: Number(page), totalPages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
});

// ── PUT /api/admin/requests/:id/approve ── Approve request ──────────
router.put('/requests/:id/approve', protect, adminOnly, async (req, res, next) => {
  try {
    const request = await SequencingRequest.findByIdAndUpdate(
      req.params.id,
      { status: 'analyzing', adminNotes: req.body.notes || '' },
      { new: true }
    );
    if (!request) return res.status(404).json({ message: 'Request not found.' });

    // Simulate completion after a short time (in real app, this would be a background job)
    setTimeout(async () => {
      await SequencingRequest.findByIdAndUpdate(req.params.id, { status: 'completed', completedAt: new Date() });
    }, 5000);

    await AuditLog.create({ userId: req.user._id, action: 'approve_request', resourceType: 'SequencingRequest', resourceId: request._id });
    res.json({ message: 'Request approved! Analysis started.', request });
  } catch (err) { next(err); }
});

// ── PUT /api/admin/requests/:id/reject ── Reject request ────────────
router.put('/requests/:id/reject', protect, adminOnly, async (req, res, next) => {
  try {
    const request = await SequencingRequest.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected', adminNotes: req.body.notes || 'Request rejected by admin.' },
      { new: true }
    );
    if (!request) return res.status(404).json({ message: 'Request not found.' });

    await AuditLog.create({ userId: req.user._id, action: 'reject_request', resourceType: 'SequencingRequest', resourceId: request._id });
    res.json({ message: 'Request rejected.', request });
  } catch (err) { next(err); }
});

// ── GET /api/admin/audit-logs ── Audit logs ─────────────────────────
router.get('/audit-logs', protect, adminOnly, async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const total = await AuditLog.countDocuments();
    const logs = await AuditLog.find()
      .populate('userId', 'name email role')
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ logs, total, page: Number(page), totalPages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
});

module.exports = router;

