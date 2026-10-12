import { app } from './index.js';
import http from 'http';

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`  ✅ PASS: ${message}`);
}

async function runSecurityOtpTests() {
  console.log('\n🔒 ========================================================');
  console.log('🔒 RUNNING SECURITY, OTP & LIVE CODE ANALYSIS TEST SUITE');
  console.log('🔒 ========================================================\n');

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Teacher Registration Security: Attempt without facultyKey
    console.log('--- 1. Teacher Registration Privilege Protection ---');
    const fakeTeacherRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Sneaky Student',
        email: `fake_teacher_${Date.now()}@jspm.edu`,
        password: 'password123',
        role: 'teacher' // Trying to become teacher without key
      })
    });
    assert(fakeTeacherRes.status === 403, 'Unauthorized teacher registration without facultyKey is blocked (403)');

    // 2. Teacher Registration with WRONG facultyKey
    const wrongKeyRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Sneaky Student 2',
        email: `fake_teacher2_${Date.now()}@jspm.edu`,
        password: 'password123',
        role: 'teacher',
        facultyKey: 'WRONG-KEY-123'
      })
    });
    assert(wrongKeyRes.status === 403, 'Teacher registration with invalid facultyKey is blocked (403)');

    // 3. Dual OTP Dispatch
    console.log('\n--- 2. Dual OTP Generation & Verification ---');
    const testEmail = `newuser_${Date.now()}@jspm.edu`;
    const testMobile = '9876543210';

    const sendOtpRes = await fetch(`${baseUrl}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        mobile: testMobile,
        role: 'student'
      })
    });
    const sendOtpData = await sendOtpRes.json();
    assert(sendOtpRes.status === 200, 'OTP dispatch endpoint responds with 200 OK');
    assert(Boolean(sendOtpData.simulation?.emailOtp), 'Generates 6-digit Email OTP');
    assert(Boolean(sendOtpData.simulation?.mobileOtp), 'Generates 6-digit Mobile OTP');

    // 4. Verify OTP with wrong code
    const wrongOtpRes = await fetch(`${baseUrl}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        emailOtp: '000000',
        mobileOtp: '000000'
      })
    });
    assert(wrongOtpRes.status === 400, 'Invalid OTP codes are properly rejected (400)');

    // 5. Verify OTP with correct simulated codes
    const correctOtpRes = await fetch(`${baseUrl}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        emailOtp: sendOtpData.simulation.emailOtp,
        mobileOtp: sendOtpData.simulation.mobileOtp
      })
    });
    assert(correctOtpRes.status === 200, 'Valid Email & Mobile OTPs successfully verified (200 OK)');

    // 6. Complete registration after OTP verification
    const completeRegRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Verified Student',
        email: testEmail,
        mobile: testMobile,
        password: 'password123',
        role: 'student',
        department: 'Computer Engineering'
      })
    });
    const completeRegData = await completeRegRes.json();
    assert(completeRegRes.status === 201, 'Registration completes successfully after OTP verification (201)');
    assert(Boolean(completeRegData.token), 'Registration returns valid JWT session token');

    // 7. Live Code Plagiarism / Authenticity Detection on any code
    console.log('\n--- 3. Real-Time Code Authenticity & Similarity Detection ---');
    const token = completeRegData.token;

    // Check Original code
    const cleanCode = 'def calculate_fibonacci(n):\n    a, b = 0, 1\n    for _ in range(n):\n        a, b = b, a + b\n    return a';
    const cleanRes = await fetch(`${baseUrl}/api/validate/tier1`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ code: cleanCode, assignmentId: 'all' })
    });
    const cleanData = await cleanRes.json();
    assert(cleanRes.status === 200, 'Universal Tier-1 validation accepts code with assignmentId="all"');
    assert(cleanData.score < 25, `Original code produces low similarity (${cleanData.score}%)`);

    // Check Copied code against Omkar's BST
    const copiedBst = `class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right
class BST:
    def __init__(self):
        self.root = None
    def insert(self, val):
        if not self.root:
            self.root = TreeNode(val)
            return`;
    const copiedRes = await fetch(`${baseUrl}/api/validate/tier1`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ code: copiedBst, assignmentId: 'all' })
    });
    const copiedData = await copiedRes.json();
    assert(copiedData.score >= 60, `Copied BST code is flagged as high similarity / copied (${copiedData.score}%)`);

    console.log('\n========================================================');
    console.log('📊 SECURITY, OTP & CODE ANALYSIS: ALL TESTS PASSED ✅');
    console.log('========================================================\n');
  } finally {
    server.close();
  }
}

runSecurityOtpTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
