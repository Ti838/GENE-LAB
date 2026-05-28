const BASE_URL = 'https://gene-lab-gray.vercel.app/api';
const testEmail = `test.user.${Date.now()}@genelab.ai`;

async function runTests() {
  console.log('🧪 Starting complete E2E test including Registration on Live API...');
  
  try {
    // 1. REGISTER
    console.log('\n🔄 [TEST 1/6] Registering a new account...');
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Auto User',
        email: testEmail,
        password: 'Password123!',
        role: 'researcher',
        gender: 'other'
      })
    });
    
    if (!regRes.ok) throw new Error(await regRes.text());
    console.log('✅ Registration successful!');
    const regData = await regRes.json();
    console.log(`Debug Verification Link: ${regData.debugVerificationLink}`);
    
    // Simulate clicking the verification link
    if (regData.debugVerificationLink) {
        console.log('\n🔄 [TEST 2/6] Verifying email...');
        const token = new URL(regData.debugVerificationLink).searchParams.get('token');
        const verRes = await fetch(`${BASE_URL}/auth/verify-email?token=${token}`);
        if (!verRes.ok) throw new Error('Verification failed');
        console.log('✅ Email verified successfully!');
    } else {
        console.log('⚠️ No debug verification link returned. If RESEND is active, it went to email.');
    }

    // 3. LOGIN
    console.log('\n🔄 [TEST 3/6] Logging in with new account...');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'Password123!' })
    });
    
    if (!loginRes.ok) throw new Error(await loginRes.text());
    const authData = await loginRes.json();
    console.log('✅ Login successful! Token received.');
    const token = authData.token;
    
    // 4. DNA PASTE
    console.log('\n🔄 [TEST 4/6] Creating DNA record...');
    const pasteRes = await fetch(`${BASE_URL}/dna/paste`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ sequence: 'ATGCATGCATGC', name: 'New_Account_Test' })
    });
    if (!pasteRes.ok) throw new Error(await pasteRes.text());
    const fileId = (await pasteRes.json())._id;
    console.log('✅ DNA record created. ID:', fileId);
    
    // 5. DNA ANALYZE
    console.log('\n🔄 [TEST 5/6] Triggering DNA analysis...');
    const analyzeRes = await fetch(`${BASE_URL}/dna/analyze/${fileId}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!analyzeRes.ok) throw new Error(await analyzeRes.text());
    console.log('✅ DNA analysis completed successfully!');
    
    // 6. CSV REPORT FETCH
    console.log('\n🔄 [TEST 6/6] Fetching final analysis report for CSV export...');
    const reportRes = await fetch(`${BASE_URL}/dna/file/${fileId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!reportRes.ok) throw new Error(await reportRes.text());
    const reportData = await reportRes.json();
    console.log('✅ Report fetched. AT Content:', reportData.atContent);
    
    console.log('\n🎉 ALL FULL FLOW TESTS PASSED (Registration -> Verify -> Login -> DNA -> Report)!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

runTests();
