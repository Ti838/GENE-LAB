/**
 * GenLab AI — Express.js Server Entry Point
 * Copyright (c) 2026 GeneLab. All rights reserved.
 */
require('dotenv').config();
// Initialize Sentry (optional)
if (process.env.SENTRY_DSN) {
  try {
    const Sentry = require('@sentry/node');
    Sentry.init({ dsn: process.env.SENTRY_DSN });
    console.log('🔒 Sentry initialized');
    // Capture unhandled rejections
    process.on('unhandledRejection', (reason) => {
      Sentry.captureException(reason instanceof Error ? reason : new Error(String(reason)));
    });
  } catch (e) {
    console.warn('Sentry init failed:', e.message);
  }
}
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
const coreRoutes         = require('./routes/core');
const uploadsRoutes      = require('./routes/uploads');

const { errorHandler } = require('./middleware/errorHandler');
const promClient = require('prom-client');

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
// Uploads are served through authenticated API routes, NOT static serving.
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── API Routes ────────────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/requests',      requestRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/profile',       profileRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/dna',           dnaRoutes);
app.use('/api/analysis',      analysisRoutes);
app.use('/api/core',          coreRoutes);
app.use('/api/uploads',       uploadsRoutes);

// ── Metrics endpoint for Prometheus scraping ─────────────────────────────
try {
  promClient.collectDefaultMetrics({ timeout: 5000 });
  const { protect, adminOnly } = require('./middleware/auth');
  app.get('/metrics', protect, adminOnly, async (req, res) => {
    res.set('Content-Type', promClient.register.contentType);
    res.send(await promClient.register.metrics());
  });
  console.log('📈 /metrics endpoint enabled (admin-only)');
} catch (e) {
  console.warn('Prometheus metrics not enabled:', e.message);
}

// ── Health Check ──────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'GeneLab API is running',
    timestamp: new Date().toISOString(),
    dbState: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
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

  // When running on Vercel serverless, do not initialize background queues/workers.
  // Force-disable queues on Vercel to avoid attempting Redis/BullMQ startup in a serverless environment.
  const isVercel = process.env.VERCEL === '1';
  const disableQueuesEnv = process.env.DISABLE_QUEUES === 'true';
  if (!isVercel && !disableQueuesEnv) {
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
