/**
 * GenLab AI — Express.js Server Entry Point
 * Copyright (c) 2026 GeneLab. All rights reserved.
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const path = require('path');
const { ensureMongoConnection } = require('./utils/mongo');

// ── Routes ─────────────────────────────────────────────────────────────────
const authRoutes         = require('./routes/auth');
const requestRoutes      = require('./routes/requests');
const adminRoutes        = require('./routes/admin');
const profileRoutes      = require('./routes/profile');
const announcementRoutes = require('./routes/announcements');
const dnaRoutes          = require('./routes/dna');
const analysisRoutes     = require('./routes/analysis');

const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// Keep the database connection alive for both local Node and serverless Vercel runs.
app.use(async (req, res, next) => {
  try {
    await ensureMongoConnection();
    next();
  } catch (err) {
    next(err);
  }
});

// ── Security Middleware ───────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ── Rate Limiting ─────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { message: 'Too many requests, please try again later.' }
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Too many auth attempts, please try again later.' }
});
const analysisLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,  // Max 10 analysis requests per minute per IP
  message: { message: 'Analysis rate limit exceeded. Please wait before submitting another analysis.' }
});

app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);
app.use('/api/analysis/', analysisLimiter);

// ── Body Parsing ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// ── Static Uploads (optional — serves uploaded files if needed) ───────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── API Routes ────────────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/requests',      requestRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/profile',       profileRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/dna',           dnaRoutes);
app.use('/api/analysis',      analysisRoutes);

// ── Health Check ──────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'GeneLab API is running',
    timestamp: new Date().toISOString(),
    dbState: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    fastapiUrl: process.env.FASTAPI_URL || 'http://localhost:8000',
    redisUrl: process.env.REDIS_URL ? 'configured' : 'default (localhost:6379)'
  });
});

// ── 404 Handler ───────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// ── Error Handler ─────────────────────────────────────────────────────────
app.use(errorHandler);

// ── MongoDB + Server Startup ──────────────────────────────────────────────
async function startServer() {
  const PORT = process.env.PORT || 5000;

  await ensureMongoConnection();
  console.log('✅ MongoDB connected successfully');

  if (process.env.VERCEL !== '1' && process.env.DISABLE_QUEUES !== 'true') {
    try {
      const { initQueues } = require('./services/queue.service');
      initQueues();
    } catch (err) {
      console.warn('⚠️  Queue initialization skipped:', err.message);
    }
  }

  app.listen(PORT, () => {
    console.log(`🧬 GeneLab Server running on http://localhost:${PORT}`);
    console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🐍 FastAPI URL: ${process.env.FASTAPI_URL || 'http://localhost:8000'}`);
    console.log(`📊 API Endpoints:`);
    console.log(`   POST /api/analysis/instant-analysis`);
    console.log(`   POST /api/analysis/deep-analysis`);
    console.log(`   POST /api/analysis/upload-csv`);
    console.log(`   GET  /api/analysis/analysis-status/:id`);
    console.log(`   GET  /api/analysis/analysis-result/:id`);
    console.log(`   GET  /api/analysis/download-report/:id`);
  });
}

if (require.main === module && process.env.VERCEL !== '1') {
  startServer().catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
}

module.exports = app;
