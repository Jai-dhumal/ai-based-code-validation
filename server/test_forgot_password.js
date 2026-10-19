process.env.NODE_ENV = 'test';

import { app, _getTestResetOtp } from './index.js';
import { db } from './db.js';
import http from 'http';

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`  ✅ PASS: ${message}`);
}

async function runForgotPasswordTestSuite() {
  console.log('\n🔑 ========================================================');
  console.log('🔑 RUNNING FORGOT PASSWORD & EMAIL RECOVERY TEST SUITE');
  console.log('🔑 ========================================================\n');

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Validation checks for Step 1: /api/auth/forgot-password
    console.log('--- 1. Input Validation & Enumeration Protection ---');
    const emptyRes = await fetch(`${baseUrl}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert(emptyRes.status === 400, 'Empty email is rejected (400)');

    const invalidEmailRes = await fetch(`${baseUrl}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email' })
    });
    assert(invalidEmailRes.status === 400, 'Invalid email format is rejected (400)');

    // Non-existent email should return 200 with generic response to prevent enumeration
    const nonExistentRes = await fetch(`${baseUrl}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `ghost_user_${Date.now()}@jspm.edu` })
    });
    assert(nonExistentRes.status === 200, 'Non-existent email returns 200 generic message to prevent enumeration');
    const nonExistentData = await nonExistentRes.json();
    assert(nonExistentData.message.includes('If an account exists'), 'Enumeration-safe generic message returned');

    // 2. Existing User Password Recovery
    console.log('\n--- 2. OTP Dispatch & Rate Limiting ---');
    // Ensure test user exists in DB
    const testEmail = 'recovery_test_student@jspm.edu';
    let user = db.findUserByEmail(testEmail);
    if (!user) {
      await db.addUser({
        id: `user_rec_${Date.now()}`,
        name: 'Recovery Test User',
        email: testEmail,
        password: 'OriginalPassword123!',
        role: 'student',
        division: 'A',
        department: 'Computer Engineering'
      });
    }

    const forgotRes = await fetch(`${baseUrl}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail })
    });
    assert(forgotRes.status === 200, 'Existing user forgot-password returns 200');

    // Rate limiting: immediate duplicate request should trigger 429 cooldown
    const rateLimitRes = await fetch(`${baseUrl}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail })
    });
    assert(rateLimitRes.status === 429, 'Immediate second OTP request is rate-limited (429)');

    // 3. OTP Verification
    console.log('\n--- 3. OTP Verification & Attempt Enforcing ---');
    const wrongOtpRes = await fetch(`${baseUrl}/api/auth/verify-reset-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, otp: '000000' })
    });
    assert(wrongOtpRes.status === 400, 'Incorrect OTP is rejected (400)');

    // Retrieve active OTP for testing
    const activeOtp = _getTestResetOtp(testEmail);
    assert(activeOtp && activeOtp.length === 6, 'A 6-digit OTP code was generated on the server');

    const validOtpRes = await fetch(`${baseUrl}/api/auth/verify-reset-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, otp: activeOtp })
    });
    assert(validOtpRes.status === 200, 'Valid OTP code accepted (200)');
    const validOtpData = await validOtpRes.json();
    assert(typeof validOtpData.resetToken === 'string' && validOtpData.resetToken.length > 20, 'Returned cryptographically secure resetToken');

    // 4. Password Policy & Reset Execution
    console.log('\n--- 4. Password Reset & Policy Enforcement ---');
    const shortPassRes = await fetch(`${baseUrl}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        resetToken: validOtpData.resetToken,
        newPassword: 'short',
        confirmPassword: 'short'
      })
    });
    assert(shortPassRes.status === 400, 'Password shorter than 8 characters is rejected (400)');

    const mismatchPassRes = await fetch(`${baseUrl}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        resetToken: validOtpData.resetToken,
        newPassword: 'NewPassword1234!',
        confirmPassword: 'DifferentPassword1234!'
      })
    });
    assert(mismatchPassRes.status === 400, 'Mismatched passwords are rejected (400)');

    const newPass = 'UpdatedSecurePassword2026!';
    const resetRes = await fetch(`${baseUrl}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        resetToken: validOtpData.resetToken,
        newPassword: newPass,
        confirmPassword: newPass
      })
    });
    assert(resetRes.status === 200, 'Password reset succeeds with 200');

    // 5. Verify Login with New Password
    console.log('\n--- 5. Verify Authentication with New Password ---');
    const oldLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'OriginalPassword123!',
        expectedRole: 'student'
      })
    });
    assert(oldLoginRes.status === 401, 'Old password no longer works (401)');

    const newLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: newPass,
        expectedRole: 'student'
      })
    });
    assert(newLoginRes.status === 200, 'Login succeeds with new password (200)');
    const loginData = await newLoginRes.json();
    assert(loginData.token && loginData.user.email === testEmail, 'Received valid session token and user profile');

    // 6. Token Invalidation Check (Replay Protection)
    console.log('\n--- 6. Replay Attack Prevention ---');
    const replayResetRes = await fetch(`${baseUrl}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        resetToken: validOtpData.resetToken,
        newPassword: 'AnotherPassword999!',
        confirmPassword: 'AnotherPassword999!'
      })
    });
    assert(replayResetRes.status === 400, 'Reusing invalidated resetToken is rejected (400)');

    console.log('\n🎉 ALL FORGOT PASSWORD & RECOVERY TESTS PASSED SUCCESSFULLY!\n');
  } finally {
    server.close();
  }
}

runForgotPasswordTestSuite().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
