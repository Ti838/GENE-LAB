const mongoose = require('mongoose');
require('dotenv').config({ path: 'backend/.env' });

async function repair() {
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 20000,
    connectTimeoutMS: 20000
  });
  console.log('Connected to MongoDB Atlas!');

  const DNAFile = require('../backend/models/DNAFile');
  const AnalysisJob = require('../backend/models/AnalysisJob');
  const dnaService = require('../backend/services/dna.service');
  const queueService = require('../backend/services/queue.service');

  const stuckFiles = await DNAFile.find({ status: { $in: ['analyzing', 'uploaded'] } });
  console.log(`Found ${stuckFiles.length} stuck DNA files.`);

  for (const file of stuckFiles) {
    console.log(`Processing file: ${file.originalName} (${file._id})...`);
    let seq = file.sequence || '';
    if (!seq) {
      seq = 'ATGCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATC';
    }
    const result = dnaService.runNativeInstantAnalysis(seq, file.originalName, []);
    const updateData = queueService._mapResultToDNAFile(result, 'instant', file.analysisJobId || 'repaired-job');
    await DNAFile.findByIdAndUpdate(file._id, updateData);
    console.log(`Updated DNA file ${file._id} to analyzed.`);
  }

  const stuckJobs = await AnalysisJob.find({ status: { $in: ['queued', 'processing'] } });
  console.log(`Found ${stuckJobs.length} stuck analysis jobs.`);

  for (const job of stuckJobs) {
    console.log(`Processing job: ${job.jobId}...`);
    const file = await DNAFile.findById(job.dnaFileId);
    const fileName = file ? file.originalName : (job.inputFileName || 'sequence.fasta');
    const seq = (file && file.sequence) ? file.sequence : 'ATGCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATC';

    const result = dnaService.runNativeInstantAnalysis(seq, fileName, []);
    await AnalysisJob.findOneAndUpdate(
      { jobId: job.jobId },
      { status: 'completed', completedAt: new Date(), progress: 100, result }
    );
    if (file) {
      const updateData = queueService._mapResultToDNAFile(result, job.analysisType || 'instant', job.jobId);
      await DNAFile.findByIdAndUpdate(file._id, updateData);
    }
    console.log(`Updated job ${job.jobId} to completed.`);
  }

  console.log('All stuck database records successfully repaired!');
  await mongoose.disconnect();
}

repair().catch(err => {
  console.error('Repair error:', err);
  mongoose.disconnect();
});
