/**
 * Copyright (c) 2026 GeneLab. All rights reserved.
 * Do not copy, distribute, or modify without permission.
 */
const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth.middleware');
const { 
    getDoctors, 
    updateDoctorStatus, 
    deleteDoctor, 
    getAllDNAFiles, 
    deleteDNAFile, 
    getSystemMetrics,
    getLogs
} = require('../controllers/admin.controller');

// All routes here are protected and require admin role
router.use(protect);
router.use(adminOnly);

// Doctor Management
router.get('/doctors', getDoctors);
router.put('/doctors/:id/status', updateDoctorStatus);
router.delete('/doctors/:id', deleteDoctor);

// DNA Data Control
router.get('/dna', getAllDNAFiles);
router.delete('/dna/:id', deleteDNAFile);

// System Monitoring & Analytics
router.get('/metrics', getSystemMetrics);
router.get('/logs', getLogs);

module.exports = router;

