const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload.middleware');
const { protect } = require('../middleware/auth.middleware');
const {
    uploadDNA,
    pasteSequence,
    getDoctorFiles,
    deleteDoctorFile,
    analyzeDNA,
    searchPattern,
    findRepeats,
    getReverseComplement,
    transcribe,
    compareSequences
} = require('../controllers/dna.controller');

// All DNA routes require authentication
router.use(protect);

// --- Data Input ---
router.post('/upload', upload.single('dnaFile'), uploadDNA);
router.post('/paste', pasteSequence);

// --- File Management ---
router.get('/my-files', getDoctorFiles);
router.delete('/:id', deleteDoctorFile);

// --- Basic Analysis ---
router.post('/:id/analyze', analyzeDNA);

// --- Advanced Analysis ---
router.post('/:id/pattern', searchPattern);
router.post('/:id/repeats', findRepeats);
router.get('/:id/reverse-complement', getReverseComplement);
router.get('/:id/transcribe', transcribe);

// --- Comparison ---
router.post('/compare', compareSequences);

module.exports = router;
