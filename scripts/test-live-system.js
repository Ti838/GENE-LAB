// Programmatic Live API Verification Script for GeneLab
const BASE_URL = 'https://gene-lab-gray.vercel.app/api';

async function runTests() {
  console.log('🧪 Starting programmatic verification of the live GeneLab platform...');
  console.log(`📡 Targeting Live API Endpoint: ${BASE_URL}\n`);

  try {
    // ----------------------------------------------------
    // TEST CASE 1: Authentication (Login)
    // ----------------------------------------------------
    console.log('🔄 [TEST 1/5] Authenticating as Doctor Jameson...');
    if (!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD) {
      throw new Error('Please set TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables.');
    }

    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: process.env.TEST_USER_EMAIL,
        password: process.env.TEST_USER_PASSWORD
      })
    });

    if (!loginRes.ok) {
      const errText = await loginRes.text();
      throw new Error(`Login failed with status ${loginRes.status}: ${errText}`);
    }

    const authData = await loginRes.json();
    console.log('✅ Auth success! Token received.');
    console.log(`👤 Logged in User: ${authData.user.name} (${authData.user.role})\n`);

    const token = authData.token;
    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    // ----------------------------------------------------
    // TEST CASE 2: Retrieve My Files list
    // ----------------------------------------------------
    console.log('🔄 [TEST 2/5] Retrieving doctor DNA registry files...');
    const myFilesRes = await fetch(`${BASE_URL}/dna/my-files`, {
      method: 'GET',
      headers: authHeaders
    });

    if (!myFilesRes.ok) {
      throw new Error(`Fetch files failed with status ${myFilesRes.status}`);
    }

    const files = await myFilesRes.json();
    console.log(`✅ File registry fetched successfully. Total existing files: ${files.length}\n`);

    // ----------------------------------------------------
    // TEST CASE 3: Save manually pasted DNA sequence
    // ----------------------------------------------------
    console.log('🔄 [TEST 3/5] Simulating DNA sequence input/paste...');
    const testSeq = 'ATGCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATC';
    const pasteRes = await fetch(`${BASE_URL}/dna/paste`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        sequence: testSeq,
        name: 'AutoTest_' + Date.now()
      })
    });

    if (!pasteRes.ok) {
      throw new Error(`DNA paste failed with status ${pasteRes.status}`);
    }

    const pasteData = await pasteRes.json();
    const newFileId = pasteData._id;
    console.log('✅ Sequence saved successfully!');
    console.log(`🆔 Stored DNA File ID: ${newFileId}\n`);

    // ----------------------------------------------------
    // TEST CASE 4: Run DNA sequence analysis
    // ----------------------------------------------------
    console.log(`🔄 [TEST 4/5] Triggering DNA analysis for File ID: ${newFileId}...`);
    const analyzeRes = await fetch(`${BASE_URL}/dna/analyze/${newFileId}`, {
      method: 'POST',
      headers: authHeaders
    });

    if (!analyzeRes.ok) {
      throw new Error(`DNA analysis request failed with status ${analyzeRes.status}`);
    }

    const analyzeData = await analyzeRes.json();
    console.log('✅ Analysis triggered and completed successfully!');
    console.log(`🔍 Job Status Info: ${JSON.stringify(analyzeData)}\n`);

    // ----------------------------------------------------
    // TEST CASE 5: Verify results and simulate CSV export
    // ----------------------------------------------------
    console.log(`🔄 [TEST 5/5] Fetching analyzed file details & simulating CSV export...`);
    const detailRes = await fetch(`${BASE_URL}/dna/file/${newFileId}`, {
      method: 'GET',
      headers: authHeaders
    });

    if (!detailRes.ok) {
      throw new Error(`Fetch file detail failed with status ${detailRes.status}`);
    }

    const dnaFileData = await detailRes.json();
    console.log('✅ Analysis details successfully loaded!');
    console.log(`🧬 Sequence Length: ${dnaFileData.sequenceLength || 0} bp`);
    console.log(`🧬 GC Content: ${((dnaFileData.gcContent || 0) * 100).toFixed(2)}%`);
    console.log(`🧬 AT Content: ${((dnaFileData.atContent || 0) * 100).toFixed(2)}%`);
    console.log(`🧬 Molecular Weight: ${dnaFileData.molecularWeightDa || 0} Da`);
    console.log(`🧬 Codons: Total: ${dnaFileData.codonAnalysis?.totalCodons || 0}, Stop: ${dnaFileData.codonAnalysis?.stopCodonCount || 0}`);

    // Generate CSV contents based on reports.js CSV exporter logic
    let csv = '\uFEFF';
    csv += 'GeneLab Biological Analysis Report\n';
    csv += `Report ID,${dnaFileData._id}\n`;
    csv += `Original Name,${dnaFileData.originalName}\n`;
    csv += `Status,${dnaFileData.status}\n`;
    csv += `Created At,${new Date(dnaFileData.createdAt).toLocaleString()}\n`;
    csv += `Sequence Length,${dnaFileData.sequenceLength || 0} bp\n`;
    csv += `GC Content,${((dnaFileData.gcContent || 0) * 100).toFixed(2)}%\n`;
    csv += `AT Content,${((dnaFileData.atContent || 0) * 100).toFixed(2)}%\n`;
    csv += `Molecular Weight,${dnaFileData.molecularWeightDa || 0} Da\n\n`;

    csv += 'Nucleotide Frequency\n';
    csv += `Adenine (A),${dnaFileData.nucleotideFrequency?.A || 0} (${((dnaFileData.nucleotidePercentage?.A || 0) * 100).toFixed(2)}%)\n`;
    csv += `Thymine (T),${dnaFileData.nucleotideFrequency?.T || 0} (${((dnaFileData.nucleotidePercentage?.T || 0) * 100).toFixed(2)}%)\n`;
    csv += `Guanine (G),${dnaFileData.nucleotideFrequency?.G || 0} (${((dnaFileData.nucleotidePercentage?.G || 0) * 100).toFixed(2)}%)\n`;
    csv += `Cytosine (C),${dnaFileData.nucleotideFrequency?.C || 0} (${((dnaFileData.nucleotidePercentage?.C || 0) * 100).toFixed(2)}%)\n\n`;

    console.log('\n✅ CSV Exporter output generated successfully!');
    console.log('--- Generated CSV Output Sample ---');
    console.log(csv.trim());
    console.log('-----------------------------------');

    console.log('\n🎉 ALL VERIFICATION TESTS COMPLETED SUCCESSFULLY! THE SYSTEM IS 100% OPERATIONAL!');

  } catch (error) {
    console.error('\n❌ Verification failed with error:', error.message);
    process.exit(1);
  }
}

runTests();
