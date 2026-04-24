require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('./src/models/User');
const SequencingRequest = require('./src/models/SequencingRequest');
const Result = require('./src/models/Result');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/genelab');
  console.log('✅ Connected to MongoDB');

  // Clear existing demo data
  await User.deleteMany({ email: { $in: ['doctor@genelab.com', 'admin@genelab.com'] } });

  // Create demo doctor
  const doctor = await User.create({
    name: 'Dr. Sarah Johnson',
    email: 'doctor@genelab.com',
    password: 'demo1234',
    role: 'doctor',
    organization: 'Johns Hopkins Hospital',
    specialization: 'Medical Genetics',
    licenseNumber: 'MD-JHH-2024',
    phone: '+1 (410) 955-5000',
    isActive: true,
    isEmailVerified: true
  });
  console.log('👨‍⚕️ Doctor created:', doctor.email);

  // Create demo admin
  const admin = await User.create({
    name: 'System Administrator',
    email: 'admin@genelab.com',
    password: 'admin1234',
    role: 'admin',
    organization: 'GeneLab Inc.',
    isActive: true,
    isEmailVerified: true
  });
  console.log('⚙️  Admin created:', admin.email);

  // Create demo sequencing requests
  const requestData = [
    { sampleType: 'Whole Genome', specimenType: 'Blood', patientId: 'PT-2026-001', patientAge: 45, biologicalSex: 'Female', clinicalIndication: 'Hereditary breast/ovarian cancer predisposition', analysisType: 'Diagnostic', priorityLevel: 'Express', diseasePanels: ['Cancer', 'BRCA'], annotations: ['VEP', 'ClinVar', 'OMIM'], status: 'completed', familyHistory: true },
    { sampleType: 'Whole Exome', specimenType: 'Blood', patientId: 'PT-2026-002', patientAge: 32, biologicalSex: 'Male', clinicalIndication: 'Cardiomyopathy - suspected genetic etiology', analysisType: 'Diagnostic', priorityLevel: 'Standard', diseasePanels: ['Cardiology'], annotations: ['VEP', 'ClinVar'], status: 'analyzing', familyHistory: false },
    { sampleType: 'Targeted Panel', specimenType: 'Tissue', patientId: 'PT-2026-003', patientAge: 58, biologicalSex: 'Male', clinicalIndication: 'Colorectal cancer - somatic mutation profiling', analysisType: 'Diagnostic', priorityLevel: 'Stat', diseasePanels: ['Cancer'], annotations: ['VEP', 'ClinVar', 'OMIM'], status: 'pending', familyHistory: true },
    { sampleType: 'RNA-seq', specimenType: 'Blood', patientId: 'PT-2026-004', patientAge: 28, biologicalSex: 'Female', clinicalIndication: 'Rare neurological disease investigation', analysisType: 'Research', priorityLevel: 'Standard', diseasePanels: ['Neurological', 'Rare Disease'], annotations: ['VEP'], status: 'pending', familyHistory: false },
    { sampleType: 'Whole Genome', specimenType: 'Buccal Swab', patientId: 'PT-2026-005', patientAge: 67, biologicalSex: 'Male', clinicalIndication: 'Population genomics research cohort - cardiovascular', analysisType: 'Research', priorityLevel: 'Standard', diseasePanels: ['Cardiology'], annotations: ['ClinVar', 'dbSNP'], status: 'completed', familyHistory: false },
  ];

  for (const d of requestData) {
    const req = await SequencingRequest.create({ ...d, userId: doctor._id, collectionDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) });
    console.log(`🧬 Request: ${req.sampleId} (${d.status})`);

    if (d.status === 'completed') {
      await Result.create({
        requestId: req._id,
        userId: doctor._id,
        qualityMetrics: { coverageDepth: '30x', totalReads: '3.2B', gcContent: '41%', passQC: '99.8%', contamination: '0%', readLength: '150bp' },
        variantSummary: { snvs: 2543, indels: 234, svs: 12, pathogenic: 3, vus: 18, benign: 4128 },
        variants: [
          { gene: 'BRCA1', variant: 'c.5266dupC', classification: 'Pathogenic', frequency: '0.001%', clinVar: 'Pathogenic', chromosome: 'chr17', position: 41246481 },
          { gene: 'TP53', variant: 'c.817C>T', classification: 'VUS', frequency: 'Rare', clinVar: 'Uncertain significance', chromosome: 'chr17', position: 7674220 },
          { gene: 'EGFR', variant: 'c.2369C>T', classification: 'Benign', frequency: '2.3%', clinVar: 'Benign', chromosome: 'chr7', position: 55249071 },
          { gene: 'BRCA2', variant: 'c.5946delT', classification: 'Pathogenic', frequency: '0.0005%', clinVar: 'Pathogenic', chromosome: 'chr13', position: 32906729 },
          { gene: 'MLH1', variant: 'c.1489A>G', classification: 'Likely Pathogenic', frequency: '0.01%', clinVar: 'Likely pathogenic', chromosome: 'chr3', position: 37038101 }
        ],
        analysisSummary: `Analysis of sample ${req.sampleId} identified clinically significant variants associated with hereditary cancer predisposition.`,
        clinicalRecommendations: 'Urgent genetic counseling recommended. Cascade testing for first-degree relatives advised. Enhanced surveillance protocol indicated.',
        completedAt: new Date()
      });
    }
  }

  console.log('\n🎉 Seed complete!');
  console.log('─────────────────────────────────');
  console.log(' Doctor:  doctor@genelab.com / demo1234');
  console.log(' Admin:   admin@genelab.com / admin1234');
  console.log('─────────────────────────────────');
  process.exit(0);
}

seed().catch(err => { console.error('❌ Seed error:', err); process.exit(1); });
