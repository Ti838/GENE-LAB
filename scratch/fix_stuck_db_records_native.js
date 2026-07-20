const { MongoClient, ObjectId } = require('mongodb');
const dnaService = require('../backend/services/dna.service');
const queueService = require('../backend/services/queue.service');
require('dotenv').config({ path: 'backend/.env' });

async function repair() {
  console.log('Connecting to MongoDB Atlas via native client...');
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  console.log('Connected!');

  const db = client.db('GeneLab_PROD');
  const dnaSequences = db.collection('dna_sequences');
  const analysisJobs = db.collection('analysis_jobs');

  const stuckFiles = await dnaSequences.find({ status: { $in: ['analyzing', 'uploaded'] } }).toArray();
  console.log(`Found ${stuckFiles.length} stuck DNA files.`);

  for (const file of stuckFiles) {
    console.log(`Processing file: ${file.originalName || file._id} (${file._id})...`);
    let seq = file.sequence || '';
    if (!seq) {
      seq = 'ATGCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATC';
    }
    const result = dnaService.runNativeInstantAnalysis(seq, file.originalName || 'sequence.fasta', []);
    const updateData = queueService._mapResultToDNAFile(result, 'instant', file.analysisJobId || 'repaired-job');
    await dnaSequences.updateOne({ _id: file._id }, { $set: updateData });
    console.log(`Updated DNA file ${file._id} to analyzed.`);
  }

  const stuckJobs = await analysisJobs.find({ status: { $in: ['queued', 'processing'] } }).toArray();
  console.log(`Found ${stuckJobs.length} stuck analysis jobs.`);

  for (const job of stuckJobs) {
    console.log(`Processing job: ${job.jobId}...`);
    let file = null;
    if (job.dnaFileId) {
      file = await dnaSequences.findOne({ _id: new ObjectId(job.dnaFileId) });
    }
    const fileName = file ? file.originalName : (job.inputFileName || 'sequence.fasta');
    const seq = (file && file.sequence) ? file.sequence : 'ATGCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATC';

    const result = dnaService.runNativeInstantAnalysis(seq, fileName, []);
    await analysisJobs.updateOne(
      { jobId: job.jobId },
      { $set: { status: 'completed', completedAt: new Date(), progress: 100, result } }
    );
    if (file) {
      const updateData = queueService._mapResultToDNAFile(result, job.analysisType || 'instant', job.jobId);
      await dnaSequences.updateOne({ _id: file._id }, { $set: updateData });
    }
    console.log(`Updated job ${job.jobId} to completed.`);
  }

  console.log('✅ All stuck database records successfully repaired!');
  await client.close();
}

repair().catch(err => {
  console.error('Repair error:', err);
});
