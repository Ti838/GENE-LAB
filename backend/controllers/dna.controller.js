const DNA = require('../models/DNA');
const Log = require('../models/Log');
const fs = require('fs');
const path = require('path');
const {
    parseSequence,
    basicAnalysis,
    patternSearch,
    detectRepeats,
    reverseComplement,
    transcribeToRNA,
    compareSequences
} = require('../services/dna.service');

// ==========================================
// 1. DNA DATA INPUT
// ==========================================

/** Upload a DNA file (FASTA / CSV / TXT) */
exports.uploadDNA = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        // Read file and extract sequence immediately
        const filePath = path.join(__dirname, '..', 'uploads', req.file.filename);
        const rawContent = fs.readFileSync(filePath, 'utf-8');
        const sequence = parseSequence(rawContent);

        const dnaDoc = await DNA.create({
            doctor: req.user.id,
            filename: req.file.filename,
            originalName: req.file.originalname,
            fileType: req.file.mimetype,
            sequence: sequence.substring(0, 500000), // Store up to 500k chars
            status: 'uploaded'
        });

        await Log.create({ user: req.user.id, action: 'Upload DNA', details: `Uploaded file ${req.file.originalname} (${sequence.length} bases)` });

        res.status(201).json(dnaDoc);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/** Paste DNA sequence manually (no file) */
exports.pasteSequence = async (req, res) => {
    try {
        const { sequence: rawSeq, name } = req.body;
        if (!rawSeq || rawSeq.trim().length === 0) {
            return res.status(400).json({ message: 'No sequence provided' });
        }

        const sequence = parseSequence(rawSeq);
        if (sequence.length === 0) {
            return res.status(400).json({ message: 'No valid nucleotides (A, T, G, C) found in input' });
        }

        const dnaDoc = await DNA.create({
            doctor: req.user.id,
            filename: `pasted_${Date.now()}.txt`,
            originalName: name || `Pasted Sequence ${new Date().toISOString().slice(0, 10)}`,
            fileType: 'text/plain',
            sequence: sequence.substring(0, 500000),
            status: 'uploaded'
        });

        await Log.create({ user: req.user.id, action: 'Paste DNA', details: `Pasted sequence "${dnaDoc.originalName}" (${sequence.length} bases)` });

        res.status(201).json(dnaDoc);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/** Get all files belonging to the logged-in doctor */
exports.getDoctorFiles = async (req, res) => {
    try {
        const files = await DNA.find({ doctor: req.user.id }).select('-sequence').sort('-createdAt');
        res.json(files);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/** Delete own file */
exports.deleteDoctorFile = async (req, res) => {
    try {
        const { id } = req.params;
        const dnaDoc = await DNA.findOne({ _id: id, doctor: req.user.id });
        if (!dnaDoc) return res.status(404).json({ message: 'File not found' });

        // Remove physical file
        const filePath = path.join(__dirname, '..', 'uploads', dnaDoc.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

        await DNA.findByIdAndDelete(id);
        await Log.create({ user: req.user.id, action: 'Delete DNA', details: `Deleted file ${dnaDoc.originalName}` });

        res.json({ message: 'File deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ==========================================
// 2. BASIC DNA ANALYSIS
// ==========================================

/** Run full basic analysis: length, ATGC count, GC content, AT ratio */
exports.analyzeDNA = async (req, res) => {
    try {
        const { id } = req.params;
        const dnaDoc = await DNA.findOne({ _id: id, doctor: req.user.id });
        if (!dnaDoc) return res.status(404).json({ message: 'File not found' });

        let sequence = dnaDoc.sequence;

        // If sequence wasn't stored, try reading from file
        if (!sequence || sequence.length === 0) {
            const filePath = path.join(__dirname, '..', 'uploads', dnaDoc.filename);
            if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'Physical file not found' });
            const raw = fs.readFileSync(filePath, 'utf-8');
            sequence = parseSequence(raw);
            dnaDoc.sequence = sequence.substring(0, 500000);
        }

        const results = basicAnalysis(sequence);

        dnaDoc.status = 'analyzed';
        dnaDoc.analysisResults = {
            totalNucleotides: results.totalNucleotides,
            gcContent: results.gcContent,
            atRatio: results.atRatio,
            counts: results.counts,
            mutations: []
        };
        await dnaDoc.save();

        await Log.create({ user: req.user.id, action: 'Analyze DNA', details: `Analyzed ${dnaDoc.originalName} (${results.totalNucleotides} bases)` });

        res.json(dnaDoc);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ==========================================
// 3. ADVANCED ANALYSIS
// ==========================================

/** Pattern search (e.g. ATG, TATA box) */
exports.searchPattern = async (req, res) => {
    try {
        const { id } = req.params;
        const { pattern } = req.body;
        if (!pattern) return res.status(400).json({ message: 'Pattern is required' });

        const dnaDoc = await DNA.findOne({ _id: id, doctor: req.user.id });
        if (!dnaDoc || !dnaDoc.sequence) return res.status(404).json({ message: 'Sequence not found' });

        const result = patternSearch(dnaDoc.sequence, pattern);

        await Log.create({ user: req.user.id, action: 'Pattern Search', details: `Searched "${pattern}" in ${dnaDoc.originalName}: found ${result.count} matches` });

        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/** Detect repeated sequences (k-mers) */
exports.findRepeats = async (req, res) => {
    try {
        const { id } = req.params;
        const { kmerLength } = req.body;

        const dnaDoc = await DNA.findOne({ _id: id, doctor: req.user.id });
        if (!dnaDoc || !dnaDoc.sequence) return res.status(404).json({ message: 'Sequence not found' });

        const repeats = detectRepeats(dnaDoc.sequence, kmerLength || 6);

        res.json({ totalRepeats: repeats.length, repeats });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/** Reverse complement generation */
exports.getReverseComplement = async (req, res) => {
    try {
        const { id } = req.params;
        const dnaDoc = await DNA.findOne({ _id: id, doctor: req.user.id });
        if (!dnaDoc || !dnaDoc.sequence) return res.status(404).json({ message: 'Sequence not found' });

        const rc = reverseComplement(dnaDoc.sequence);

        res.json({
            originalLength: dnaDoc.sequence.length,
            original: dnaDoc.sequence.substring(0, 200) + (dnaDoc.sequence.length > 200 ? '...' : ''),
            reverseComplement: rc.substring(0, 200) + (rc.length > 200 ? '...' : ''),
            fullReverseComplement: rc
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/** DNA → RNA transcription */
exports.transcribe = async (req, res) => {
    try {
        const { id } = req.params;
        const dnaDoc = await DNA.findOne({ _id: id, doctor: req.user.id });
        if (!dnaDoc || !dnaDoc.sequence) return res.status(404).json({ message: 'Sequence not found' });

        const rna = transcribeToRNA(dnaDoc.sequence);

        res.json({
            dnaLength: dnaDoc.sequence.length,
            rnaLength: rna.length,
            dnaPreview: dnaDoc.sequence.substring(0, 200),
            rnaPreview: rna.substring(0, 200),
            fullRNA: rna
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ==========================================
// 4. COMPARISON
// ==========================================

/** Compare two DNA sequences */
exports.compareSequences = async (req, res) => {
    try {
        const { id1, id2 } = req.body;
        if (!id1 || !id2) return res.status(400).json({ message: 'Two sequence IDs are required' });

        const doc1 = await DNA.findOne({ _id: id1, doctor: req.user.id });
        const doc2 = await DNA.findOne({ _id: id2, doctor: req.user.id });

        if (!doc1 || !doc2) return res.status(404).json({ message: 'One or both sequences not found' });
        if (!doc1.sequence || !doc2.sequence) return res.status(400).json({ message: 'One or both sequences have no data' });

        const result = compareSequences(doc1.sequence, doc2.sequence);

        await Log.create({
            user: req.user.id,
            action: 'Compare DNA',
            details: `Compared ${doc1.originalName} vs ${doc2.originalName}: ${result.similarity}% similarity`
        });

        res.json({
            file1: doc1.originalName,
            file2: doc2.originalName,
            ...result
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
