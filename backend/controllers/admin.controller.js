const User = require('../models/User');
const DNA = require('../models/DNA');
const Log = require('../models/Log');
const fs = require('fs');
const path = require('path');

// ==========================================
// 1. DOCTOR MANAGEMENT
// ==========================================

exports.getDoctors = async (req, res) => {
    try {
        const doctors = await User.find({ role: 'doctor' }).select('-password').sort('-createdAt');
        res.json(doctors);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateDoctorStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'approved', 'blocked', 'pending'

        if (!['approved', 'blocked', 'pending'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const doctor = await User.findById(id);
        if (!doctor || doctor.role !== 'doctor') {
            return res.status(404).json({ message: 'Doctor not found' });
        }

        doctor.status = status;
        await doctor.save();

        await Log.create({ user: req.user.id, action: 'Update Doctor Status', details: `Changed status of ${doctor.email} to ${status}` });

        res.json({ message: `Doctor status updated to ${status}`, doctor });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteDoctor = async (req, res) => {
    try {
        const { id } = req.params;
        const doctor = await User.findById(id);
        
        if (!doctor || doctor.role !== 'doctor') {
            return res.status(404).json({ message: 'Doctor not found' });
        }

        // Delete all DNA files associated with this doctor from the DB
        const dnaFiles = await DNA.find({ doctor: id });
        for (const file of dnaFiles) {
            // Remove physical file
            const filePath = path.join(__dirname, '..', 'uploads', file.filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        await DNA.deleteMany({ doctor: id });

        await User.findByIdAndDelete(id);

        await Log.create({ user: req.user.id, action: 'Delete Doctor', details: `Deleted doctor ${doctor.email} and all associated files` });

        res.json({ message: 'Doctor deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ==========================================
// 2. DNA DATA CONTROL
// ==========================================

exports.getAllDNAFiles = async (req, res) => {
    try {
        const files = await DNA.find().populate('doctor', 'name email').sort('-createdAt');
        res.json(files);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteDNAFile = async (req, res) => {
    try {
        const { id } = req.params;
        const dnaFile = await DNA.findById(id);

        if (!dnaFile) {
            return res.status(404).json({ message: 'File not found' });
        }

        const filePath = path.join(__dirname, '..', 'uploads', dnaFile.filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        await DNA.findByIdAndDelete(id);

        await Log.create({ user: req.user.id, action: 'Delete DNA File', details: `Admin deleted file ${dnaFile.originalName}` });

        res.json({ message: 'File deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ==========================================
// 3. SYSTEM MONITORING & ANALYTICS
// ==========================================

exports.getSystemMetrics = async (req, res) => {
    try {
        const totalDoctors = await User.countDocuments({ role: 'doctor' });
        const pendingDoctors = await User.countDocuments({ role: 'doctor', status: 'pending' });
        const totalFiles = await DNA.countDocuments();
        const totalAnalyses = await DNA.countDocuments({ status: 'analyzed' });
        
        // Get recent logs
        const recentLogs = await Log.find().populate('user', 'name email role').sort('-createdAt').limit(10);

        res.json({
            metrics: {
                totalDoctors,
                pendingDoctors,
                totalFiles,
                totalAnalyses
            },
            recentLogs
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getLogs = async (req, res) => {
    try {
        const logs = await Log.find().populate('user', 'name email role').sort('-createdAt');
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
