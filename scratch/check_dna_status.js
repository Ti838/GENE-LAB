const mongoose = require('mongoose');
require('dotenv').config({ path: 'backend/.env' });

async function run() {
  console.log('Connecting to Mongo:', process.env.MONGO_URI);
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected!');

  const DNAFile = mongoose.model('DNAFile', new mongoose.Schema({}, { strict: false, collection: 'dna_sequences' }));
  const files = await DNAFile.find({}).sort({ createdAt: -1 }).limit(10);
  console.log(`Found ${files.length} DNA files in 'dna_sequences':`);
  files.forEach(f => {
    console.log({
      _id: f._id,
      originalName: f.get('originalName'),
      status: f.get('status'),
      errorMessage: f.get('errorMessage'),
      createdAt: f.get('createdAt'),
      doctor: f.get('doctor'),
      hasAnomalies: f.get('hasAnomalies')
    });
  });

  const AnalysisJob = mongoose.model('AnalysisJob', new mongoose.Schema({}, { strict: false, collection: 'analysis_jobs' }));
  const jobs = await AnalysisJob.find({}).sort({ createdAt: -1 }).limit(10);
  console.log(`\nFound ${jobs.length} Analysis jobs in 'analysis_jobs':`);
  jobs.forEach(j => {
    console.log({
      jobId: j.get('jobId'),
      status: j.get('status'),
      errorMessage: j.get('errorMessage'),
      analysisType: j.get('analysisType'),
      createdAt: j.get('createdAt')
    });
  });

  await mongoose.disconnect();
}

run().catch(console.error);
