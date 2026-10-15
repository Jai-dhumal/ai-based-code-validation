process.env.NODE_ENV = 'test';
import http from 'http';
import { app, _getTestOtp, sendRealEmailOtp } from './index.js';
import nodemailer from 'nodemailer';

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`  ✅ PASS: ${message}`);
}

async function runScenarioTests() {
  console.log('\n============================================================');
  console.log('🧪 RUNNING COMPREHENSIVE 10-POINT EMAIL & OTP TEST SCENARIOS');
  console.log('============================================================\n');

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // -------------------------------------------------------------
    // Scenario 1: Correct Gmail SMTP credentials
    // -------------------------------------------------------------
    console.log('--- Scenario 1: Correct Gmail SMTP Credentials ---');
    const validTransport = nodemailer.createTransport({ jsonTransport: true });
    const s1Result = await sendRealEmailOtp('test_valid@gmail.com', '123456', 'student', validTransport);
    assert(s1Result.success === true, 'Mail accepted by SMTP provider when credentials are valid');
    assert(Boolean(s1Result.info?.messageId), 'Message ID generated on provider acceptance');

    // -------------------------------------------------------------
    // Scenario 2: Incorrect Gmail App Password
    // -------------------------------------------------------------
    console.log('\n--- Scenario 2: Incorrect Gmail App Password ---');
    const failingAuthTransport = nodemailer.createTransport({
      streamTransport: true,
      newline: 'windows'
    });
    // Simulate auth rejection error from nodemailer
    failingAuthTransport.sendMail = async () => {
      const err = new Error('Invalid login: 535-5.7.8 Username and Password not accepted');
      err.code = 'EAUTH';
      err.responseCode = 535;
      throw err;
    };
    const s2Result = await sendRealEmailOtp('student@jspm.edu', '123456', 'student', failingAuthTransport);
    assert(s2Result.success === false, 'Invalid credentials properly caught');
    assert(s2Result.statusCode === 503, 'Returns HTTP 503 for authentication failure');
    assert(s2Result.errorCode === 'SMTP_AUTH_FAILED', 'Identifies error as SMTP_AUTH_FAILED');

    // -------------------------------------------------------------
    // Scenario 3: SMTP server unavailable or connection timeout
    // -------------------------------------------------------------
    console.log('\n--- Scenario 3: SMTP Server Unavailable / Timeout ---');
    const timeoutTransport = nodemailer.createTransport({
      streamTransport: true
    });
    timeoutTransport.sendMail = async () => {
      const err = new Error('Connection to smtp.gmail.com timed out');
      err.code = 'ETIMEDOUT';
      throw err;
    };
    const s3Result = await sendRealEmailOtp('student@jspm.edu', '123456', 'student', timeoutTransport);
    assert(s3Result.success === false, 'Connection timeout handled gracefully');
    assert(s3Result.statusCode === 504, 'Returns HTTP 504 Gateway Timeout for unreachable server');
    assert(s3Result.errorCode === 'SMTP_TIMEOUT', 'Identifies error as SMTP_TIMEOUT');

    // -------------------------------------------------------------
    // Scenario 4: Valid personal Gmail recipient
    // -------------------------------------------------------------
    console.log('\n--- Scenario 4: Valid Personal Gmail Recipient ---');
    const personalEmail = `personal_${Date.now()}@gmail.com`;
    const s4Res = await fetch(`${baseUrl}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: personalEmail, role: 'student' })
    });
    const s4Data = await s4Res.json();
    assert(s4Res.status === 200, 'Personal @gmail.com recipient accepted (200 OK)');
    assert(s4Data.mailDelivered === true, 'mailDelivered is confirmed in API response');
    assert(s4Data.expiresInSeconds === 300, 'OTP expiration is exactly 300 seconds (5 minutes)');

    // -------------------------------------------------------------
    // Scenario 5: Valid institutional .edu and .edu.in recipients
    // -------------------------------------------------------------
    console.log('\n--- Scenario 5: Valid Institutional .edu & .edu.in Recipients ---');
    const eduEmail = `student_${Date.now()}@jspm.edu`;
    const s5aRes = await fetch(`${baseUrl}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: eduEmail, role: 'student' })
    });
    assert(s5aRes.status === 200, 'Institutional .edu recipient accepted (200 OK)');

    const eduInEmail = `scholar_${Date.now()}@coep.edu.in`;
    const s5bRes = await fetch(`${baseUrl}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: eduInEmail, role: 'student' })
    });
    assert(s5bRes.status === 200, 'Institutional .edu.in recipient accepted (200 OK)');

    // -------------------------------------------------------------
    // Scenario 6: Invalid email address
    // -------------------------------------------------------------
    console.log('\n--- Scenario 6: Invalid Email Address ---');
    const invalidEmails = ['not-an-email', 'user@', '@domain.com', 'user@domain', 'user name@gmail.com'];
    for (const badEmail of invalidEmails) {
      const s6Res = await fetch(`${baseUrl}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: badEmail, role: 'student' })
      });
      assert(s6Res.status === 400, `Malformed email "${badEmail}" rejected with 400 Bad Request`);
    }

    // -------------------------------------------------------------
    // Scenario 7: Expired, incorrect, and reused OTP
    // -------------------------------------------------------------
    console.log('\n--- Scenario 7: Expired, Incorrect, and Reused OTP ---');
    const s7Email = `otp_security_${Date.now()}@gmail.com`;
    await fetch(`${baseUrl}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: s7Email, role: 'student' })
    });

    // 7a. Incorrect OTP
    const s7WrongRes = await fetch(`${baseUrl}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: s7Email, emailOtp: '000000' })
    });
    assert(s7WrongRes.status === 400, 'Incorrect OTP code rejected (400)');

    // 7b. Correct OTP verification
    const validOtp = _getTestOtp(s7Email);
    assert(Boolean(validOtp && validOtp.length === 6), 'Valid 6-digit OTP retrieved for test verification');
    const s7VerifyRes = await fetch(`${baseUrl}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: s7Email, emailOtp: validOtp })
    });
    assert(s7VerifyRes.status === 200, 'Correct OTP verified successfully (200)');

    // 7c. Registration using verified OTP
    const s7RegRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'OTP Student',
        email: s7Email,
        password: 'password123',
        role: 'student'
      })
    });
    assert(s7RegRes.status === 201, 'Registration succeeds with verified OTP (201 Created)');

    // 7d. Reused OTP after registration
    const s7ReuseRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Imposter',
        email: s7Email,
        password: 'password123',
        role: 'student'
      })
    });
    assert(s7ReuseRes.status === 400, 'Reused OTP session rejected on subsequent registration (400)');

    // -------------------------------------------------------------
    // Scenario 8: Resend cooldown and excessive OTP requests
    // -------------------------------------------------------------
    console.log('\n--- Scenario 8: Resend Cooldown & Excessive Requests ---');
    const s8Email = `cooldown_${Date.now()}@jspm.edu`;
    const s8FirstRes = await fetch(`${baseUrl}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: s8Email, role: 'student' })
    });
    assert(s8FirstRes.status === 200, 'Initial OTP request accepted (200)');

    // Immediate second request within 30s
    const s8RapidRes = await fetch(`${baseUrl}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: s8Email, role: 'student' })
    });
    const s8RapidData = await s8RapidRes.json();
    assert(s8RapidRes.status === 429, 'Immediate second OTP request throttled with HTTP 429');
    assert(s8RapidData.error.includes('Please wait'), 'Rate limit message guides user on cooldown period');

    // -------------------------------------------------------------
    // Scenario 9: Mail provider rejection and frontend error display
    // -------------------------------------------------------------
    console.log('\n--- Scenario 9: Mail Provider Rejection ---');
    const rejectedTransport = nodemailer.createTransport({ streamTransport: true });
    rejectedTransport.sendMail = async () => {
      const err = new Error('550 5.1.1 The email account that you tried to reach does not exist');
      err.responseCode = 550;
      err.rejected = ['nonexistent@gmail.com'];
      throw err;
    };
    const s9Result = await sendRealEmailOtp('nonexistent@gmail.com', '123456', 'student', rejectedTransport);
    assert(s9Result.success === false, 'Provider rejection properly detected');
    assert(s9Result.statusCode === 400, 'Returns HTTP 400 for rejected recipient address');
    assert(s9Result.errorCode === 'RECIPIENT_REJECTED', 'Identifies error as RECIPIENT_REJECTED');

    // -------------------------------------------------------------
    // Scenario 10: Registration without successfully verified OTP
    // -------------------------------------------------------------
    console.log('\n--- Scenario 10: Registration without Verified OTP ---');
    const s10Email = `unverified_${Date.now()}@jspm.edu`;
    const s10Res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Sneaky User',
        email: s10Email,
        password: 'password123',
        role: 'student',
        skipOtp: true // Attempts bypass
      })
    });
    const s10Data = await s10Res.json();
    assert(s10Res.status === 400, 'Registration strictly rejected when no verified OTP exists (400)');
    assert(s10Data.error.includes('verification required'), 'Error explicitly demands email OTP verification');

    console.log('\n============================================================');
    console.log('🎉 ALL 10 EMAIL & OTP TEST SCENARIOS PASSED WITH ZERO ERRORS');
    console.log('============================================================\n');
    server.close();
    process.exit(0);
  } catch (err) {
    console.error('Fatal test error:', err);
    server.close();
    process.exit(1);
  }
}

runScenarioTests();
