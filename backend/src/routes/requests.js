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
      // 🧬 TODO: PLUG IN ACTUAL SEQUENCING MODEL HERE
      // When the user builds their actual model, it should be called here
      // to generate real clinical results based on the sampleId.
      
      // Auto-generate mock result for demo for now
      result = await Result.create({
        requestId: req.params.id,
        userId: req.user._id,
        qualityMetrics: { coverageDepth: '30x', totalReads: '3.2B', gcContent: '41%', passQC: '99.8%', contamination: '0%', readLength: '150bp' },
        variantSummary: { snvs: 2543, indels: 234, svs: 12, pathogenic: 3, vus: 18, benign: 4128 },
        variants: [
          { gene: 'BRCA1', variant: 'c.5266dupC', classification: 'Pathogenic', frequency: '0.001%', clinVar: 'Pathogenic', chromosome: 'chr17', position: 41246481, evidence: 'ClinVar: RCV000048267' },
          { gene: 'TP53', variant: 'c.817C>T', classification: 'VUS', frequency: 'Rare', clinVar: 'Uncertain significance', chromosome: 'chr17', position: 7674220, evidence: 'ClinVar: RCV000421986' },
          { gene: 'EGFR', variant: 'c.2369C>T', classification: 'Benign', frequency: '2.3%', clinVar: 'Benign', chromosome: 'chr7', position: 55249071, evidence: 'gnomAD: 0.023' },
          { gene: 'BRCA2', variant: 'c.5946delT', classification: 'Pathogenic', frequency: '0.0005%', clinVar: 'Pathogenic', chromosome: 'chr13', position: 32906729, evidence: 'ClinVar: RCV000048267' },
          { gene: 'MLH1', variant: 'c.1489A>G', classification: 'Likely Pathogenic', frequency: '0.01%', clinVar: 'Likely pathogenic', chromosome: 'chr3', position: 37038101, evidence: 'ClinVar: RCV000075764' }
        ],
        analysisSummary: `Whole genome sequencing analysis of sample ${request.sampleId} identified ${request.sampleType} variants with clinical significance. Three pathogenic variants identified in cancer predisposition genes.`,
        clinicalRecommendations: 'Genetic counseling is strongly recommended. Consider cascade testing for family members. Enhanced surveillance protocol indicated.'
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

