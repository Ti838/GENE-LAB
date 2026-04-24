/**
 * Copyright (c) 2026 GeneLab. All rights reserved.
 * Professional Database Seeding Script
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('./models/User');
const SequencingRequest = require('./models/SequencingRequest');
const Result = require('./models/Result');
const Announcement = require('./models/Announcement');
const AuditLog = require('./models/AuditLog');

async function seed() {
  const MONGO_URI = process.env.MONGO_URI;
  
  if (!MONGO_URI) {
    console.error('❌ MONGO_URI not found in .env');
    process.exit(1);
  }

  console.log('📡 Connecting to:', MONGO_URI.split('@')[1] || 'LocalDB');
  
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB Atlas');

    // ── CLEAR EXISTING DATA ──────────────────────────────────────────────
    console.log('🧹 Clearing existing data for a fresh start...');
    await Promise.all([
      User.deleteMany({}),
      SequencingRequest.deleteMany({}),
      Result.deleteMany({}),
      Announcement.deleteMany({}),
      AuditLog.deleteMany({})
    ]);

    // ── CREATE PROFESSIONAL USERS ────────────────────────────────────────
    console.log('👥 Creating professional user accounts...');
    
    // System Admin
    const admin = await User.create({
      name: 'GeneLab System Administrator',
      email: 'admin@genelab.ai',
      password: process.env.SEED_ADMIN_PASSWORD || 'GeneLabAdmin2026!',
      role: 'admin',
      organization: 'GeneLab Global Operations',
      isActive: true,
      isEmailVerified: true
    });

    // Senior Geneticist
    const doctor1 = await User.create({
      name: 'Dr. Elena Jameson',
      email: 'dr.jameson@genelab.ai',
      password: process.env.SEED_DOCTOR_PASSWORD || 'Geneticist2026!',
      role: 'doctor',
      organization: 'Mayo Clinic - Genomics Dept',
      specialization: 'Clinical Genetics',
      licenseNumber: 'MD-77281-GL',
      phone: '+1 (555) 928-1100',
      isActive: true,
      isEmailVerified: true
    });

    // Medical Researcher
    const doctor2 = await User.create({
      name: 'Dr. David Chen',
      email: 'dr.chen@genelab.ai',
      password: process.env.SEED_RESEARCHER_PASSWORD || 'Researcher2026!',
      role: 'researcher',
      organization: 'Stanford School of Medicine',
      specialization: 'Molecular Oncology',
      licenseNumber: 'RES-88122-ST',
      phone: '+1 (555) 443-2211',
      isActive: true,
      isEmailVerified: true
    });

    console.log('✅ Users created: Admin, Dr. Jameson, Dr. Chen');

    // ── CREATE ANNOUNCEMENTS ────────────────────────────────────────────
    console.log('📢 Creating system announcements...');
    await Announcement.create([
      {
        title: 'GeneLab v2.4.0 Deployment',
        content: 'We have successfully deployed the new high-throughput sequencing pipeline integration. Performance is improved by 40%.',
        priority: 'high',
        category: 'update',
        authorId: admin._id
      },
      {
        title: 'Scheduled Maintenance',
        content: 'The sequencing nodes will undergo routine maintenance on Sunday at 02:00 UTC. Expect 15 minutes of downtime.',
        priority: 'medium',
        category: 'maintenance',
        authorId: admin._id
      }
    ]);

    // ── CREATE SEQUENCING REQUESTS ──────────────────────────────────────
    console.log('🧬 Generating professional sequencing requests...');
    const requestData = [
      {
        sampleType: 'Whole Genome',
        specimenType: 'Blood',
        patientId: 'GL-PAT-001',
        patientAge: 42,
        biologicalSex: 'Female',
        clinicalIndication: 'Hereditary Breast and Ovarian Cancer (HBOC) syndrome screening',
        analysisType: 'Diagnostic',
        priorityLevel: 'Stat',
        diseasePanels: ['Cancer', 'BRCA+'],
        status: 'completed',
        userId: doctor1._id
      },
      {
        sampleType: 'Whole Exome',
        specimenType: 'Tissue',
        patientId: 'GL-PAT-002',
        patientAge: 58,
        biologicalSex: 'Male',
        clinicalIndication: 'Metastatic lung adenocarcinoma - Somatic profiling',
        analysisType: 'Diagnostic',
        priorityLevel: 'Express',
        diseasePanels: ['Oncology', 'Precision Medicine'],
        status: 'analyzing',
        userId: doctor1._id
      },
      {
        sampleType: 'Targeted Panel',
        specimenType: 'Saliva',
        patientId: 'GL-PAT-003',
        patientAge: 3,
        biologicalSex: 'Female',
        clinicalIndication: 'Developmental delay - Neurodevelopmental panel screening',
        analysisType: 'Diagnostic',
        priorityLevel: 'Standard',
        diseasePanels: ['Pediatric', 'Neurology'],
        status: 'pending',
        userId: doctor1._id
      },
      {
        sampleType: 'RNA-seq',
        specimenType: 'Blood',
        patientId: 'GL-PAT-004',
        patientAge: 29,
        biologicalSex: 'Male',
        clinicalIndication: 'Transcriptome analysis for autoimmune research cohort',
        analysisType: 'Research',
        priorityLevel: 'Standard',
        diseasePanels: ['Immunology'],
        status: 'completed',
        userId: doctor2._id
      }
    ];

    for (const data of requestData) {
      const request = await SequencingRequest.create({
        ...data,
        collectionDate: new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000)
      });

      if (data.status === 'completed') {
        await Result.create({
          requestId: request._id,
          userId: data.userId,
          qualityMetrics: {
            coverageDepth: '32.5x',
            totalReads: '4.1B',
            gcContent: '42.1%',
            passQC: '99.92%',
            contamination: '0.01%',
            readLength: '150bp'
          },
          variantSummary: {
            snvs: 3122,
            indels: 412,
            svs: 24,
            pathogenic: 2,
            vus: 14,
            benign: 5211
          },
          variants: [
            { gene: 'BRCA2', variant: 'c.5946delT', classification: 'Pathogenic', frequency: '0.0004%', clinVar: 'Pathogenic', chromosome: 'chr13', position: 32906729, evidence: 'PMID: 12345678' },
            { gene: 'TP53', variant: 'c.817C>T', classification: 'VUS', frequency: 'Rare', clinVar: 'Uncertain', chromosome: 'chr17', position: 7674220, evidence: 'In-silico prediction: Damaging' }
          ],
          analysisSummary: 'The sequencing results indicate a pathogenic frameshift mutation in BRCA2, significantly increasing the risk for related hereditary syndromes.',
          clinicalRecommendations: 'Urgent referral to genetic counseling is advised. Recommend cascade testing for first-degree relatives.'
        });
      }

      // Add to Audit Log
      await AuditLog.create({
        userId: data.userId,
        action: 'create_request',
        resourceType: 'SequencingRequest',
        resourceId: request._id,
        details: { patientId: data.patientId }
      });
    }

    console.log('✅ Sequencing requests and results generated.');

    console.log('\n🚀 SEEDING COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Admin:    admin@genelab.ai / GeneLabAdmin2026!');
    console.log('Doctor:   dr.jameson@genelab.ai / Geneticist2026!');
    console.log('Researcher: dr.chen@genelab.ai / Researcher2026!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('New Database: GeneLab_PROD');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
}

seed();
