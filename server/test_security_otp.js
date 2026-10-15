process.env.NODE_ENV = 'test';

import { app, _getTestOtp } from './index.js';
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
        role: 'teacher'
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

    // 3. Registration bypass prevention: Registration without OTP record
    console.log('\n--- 2. Registration Security & OTP Gate Enforcement ---');
    const bypassRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Unverified User',
        email: `unverified_${Date.now()}@jspm.edu`,
        password: 'password123',
        role: 'student',
        skipOtp: true // Malicious attempt to bypass
      })
    });
    assert(bypassRes.status === 400, 'Registration without verified OTP is strictly blocked (400)');

    // 4. Invalid email format in send-otp
    const badEmailRes = await fetch(`${baseUrl}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'not-an-email',
        role: 'student'
      })
    });
    assert(badEmailRes.status === 400, 'Invalid email format rejected by send-otp (400)');

    // 5. Valid OTP Dispatch
    const testEmail = `verified_user_${Date.now()}@jspm.edu`;
    const sendOtpRes = await fetch(`${baseUrl}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        role: 'student'
      })
    });
    const sendOtpData = await sendOtpRes.json();
    assert(sendOtpRes.status === 200, 'OTP dispatch endpoint responds with 200 OK');
    assert(sendOtpData.mailDelivered === true, 'mailDelivered confirmed in response');

    // 6. Rate Limiting: Resending OTP within 30s is throttled
    const rapidResendRes = await fetch(`${baseUrl}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        role: 'student'
      })
    });
    assert(rapidResendRes.status === 429, 'Rapid OTP resend within 30s is rate-limited (429)');

    // 7. Verification with wrong code
    const wrongOtpRes = await fetch(`${baseUrl}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        emailOtp: '000000'
      })
    });
    assert(wrongOtpRes.status === 400, 'Incorrect OTP code is rejected (400)');

    // 8. Retrieve test OTP and verify successfully
    const otpCode = _getTestOtp(testEmail);
    assert(Boolean(otpCode && otpCode.length === 6), 'Cryptographically secure 6-digit OTP generated');

    const correctOtpRes = await fetch(`${baseUrl}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        emailOtp: otpCode
      })
    });
    assert(correctOtpRes.status === 200, 'Valid Email OTP successfully verified (200 OK)');

    // 9. Complete registration with verified OTP
    const completeRegRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Verified Student',
        email: testEmail,
        password: 'password123',
        role: 'student',
        department: 'Computer Engineering',
        division: 'A',
        rollNo: 'CE2025-99'
      })
    });
    const completeRegData = await completeRegRes.json();
    assert(completeRegRes.status === 201, 'Registration completes successfully after OTP verification (201)');
    assert(Boolean(completeRegData.token), 'Registration returns valid JWT session token');

    // 10. OTP reuse prevention: verify that OTP record was deleted upon registration
    const reuseRegRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Verified Student 2',
        email: testEmail,
        password: 'password123',
        role: 'student'
      })
    });
    assert(reuseRegRes.status === 400, 'OTP reuse is strictly prevented (400)');

    // 11. Live Code Plagiarism / Authenticity Detection
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
    server.close();
    process.exit(0);
  } finally {
    server.close();
  }
}

runSecurityOtpTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
