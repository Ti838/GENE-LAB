/**
 * Copyright (c) 2026 GeneLab. All rights reserved.
 * Do not copy, distribute, or modify without permission.
 */
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const SequencingRequest = require('../models/SequencingRequest');
const Result = require('../models/Result');
const AuditLog = require('../models/AuditLog');
const dnaAnalysis = require('../services/dnaAnalysis');

// ── GET /api/requests ── List user's requests ──────────────────────
router.get('/', protect, async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10, search } = req.query;
    const filter = { userId: req.user._id };
    if (status) filter.status = status;
    if (search) filter.$or = [{ sampleId: new RegExp(search, 'i') }, { clinicalIndication: new RegExp(search, 'i') }];

    const total = await SequencingRequest.countDocuments(filter);
    const requests = await SequencingRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ requests, total, page: Number(page), totalPages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
});

// ── POST /api/requests ── Create new request ───────────────────────
router.post('/', protect, async (req, res, next) => {
  try {
    const request = await SequencingRequest.create({ ...req.body, userId: req.user._id });

    await AuditLog.create({ userId: req.user._id, action: 'create_request', resourceType: 'SequencingRequest', resourceId: request._id, details: { sampleId: request.sampleId } });

    res.status(201).json({ message: 'Sequencing request submitted successfully!', request });
  } catch (err) { next(err); }
});

// ── GET /api/requests/:id ── Get single request ────────────────────
router.get('/:id', protect, async (req, res, next) => {
  try {
    const request = await SequencingRequest.findOne({ _id: req.params.id, userId: req.user._id });
    if (!request) return res.status(404).json({ message: 'Request not found.' });
    res.json({ request });
  } catch (err) { next(err); }
});

// ── GET /api/requests/:id/result ── Get result for request ─────────
router.get('/:id/result', protect, async (req, res, next) => {
  try {
    const request = await SequencingRequest.findOne({ _id: req.params.id, userId: req.user._id });
    if (!request) return res.status(404).json({ message: 'Request not found.' });
    if (request.status !== 'completed') return res.status(400).json({ message: 'Results not yet available.' });

    let result = await Result.findOne({ requestId: req.params.id });
    if (!result) {
      // 🧬 Using DNA Analysis Service (Future Integration Point)
      const analysisResults = await dnaAnalysis.analyzeDNA(request.dnaFile, request.sampleType);
      
      result = await Result.create({
        requestId: req.params.id,
        userId: req.user._id,
        ...analysisResults
      });
    }
    res.json({ result, request });
  } catch (err) { next(err); }
});

// ── DELETE /api/requests/:id ── Cancel request ─────────────────────
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const request = await SequencingRequest.findOne({ _id: req.params.id, userId: req.user._id });
    if (!request) return res.status(404).json({ message: 'Request not found.' });
    if (!['pending'].includes(request.status)) return res.status(400).json({ message: 'Only pending requests can be cancelled.' });

    await SequencingRequest.deleteOne({ _id: req.params.id });
    res.json({ message: 'Request cancelled successfully.' });
  } catch (err) { next(err); }
});

module.exports = router;

