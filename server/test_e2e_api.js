process.env.NODE_ENV = 'test';
// E2E HTTP API Testing Suite
// Tests all endpoints against live HTTP server
import http from 'http';
import { app, _getTestOtp } from './index.js';

let server;
let baseUrl;
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n🚀 Starting End-to-End HTTP API Validation...\n');

  // Start on dynamic port
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      console.log(`Test server running on ${baseUrl}\n`);
      resolve();
    });
  });

  try {
    // 1. Health check
    console.log('--- 1. Health Endpoint ---');
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200, 'Health endpoint responds with 200');
    assert(healthData.status === 'online', 'Health status is online');

    // 2. Authentication: Login
    console.log('\n--- 2. Auth Endpoints ---');
    // Admin login
    const adminLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@jspm.edu', password: 'password123' })
    });
    const adminLoginData = await adminLoginRes.json();
    assert(adminLoginRes.status === 200, 'Admin can login with status 200');
    assert(Boolean(adminLoginData.token), 'Admin receives valid JWT token');
    const adminToken = adminLoginData.token;

    // Student login
    const studentLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'omkar@jspm.edu', password: 'password123' })
    });
    const studentLoginData = await studentLoginRes.json();
    assert(studentLoginRes.status === 200, 'Student can login with status 200');
    const studentToken = studentLoginData.token;

    // Teacher login
    const teacherLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nitin.shivale@jspm.edu', password: 'password123' })
    });
    const teacherLoginData = await teacherLoginRes.json();
    assert(teacherLoginRes.status === 200, 'Teacher can login with status 200');
    const teacherToken = teacherLoginData.token;

    // Registration privilege escalation attempt
    const hackerEmail = `hacker_${Date.now()}@jspm.edu`;
    await fetch(`${baseUrl}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: hackerEmail, role: 'student' })
    });
    const hackerOtp = _getTestOtp(hackerEmail);
    if (hackerOtp) {
      await fetch(`${baseUrl}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: hackerEmail, emailOtp: hackerOtp })
      });
    }

    const badRegRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Hacker',
        email: hackerEmail,
        password: 'password123',
        role: 'admin' // Attempt privilege escalation!
      })
    });
    const badRegData = await badRegRes.json();
    assert(badRegRes.status === 201 && badRegData.user.role === 'student', 'Unauthorized admin registration falls back to student (Privilege Escalation Blocked)');

    // Heartbeat
    console.log('\n--- 3. Heartbeat & Presence ---');
    const hbRes = await fetch(`${baseUrl}/api/auth/heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`
      }
    });
    const hbData = await hbRes.json();
    assert(hbRes.status === 200, 'Heartbeat updates successfully with valid token');
    assert(hbData.isOnline === true, 'Heartbeat confirms isOnline = true');

    // 4. Role Authorization: Admin Overview
    console.log('\n--- 4. Role-Based Access Control ---');
    const studentOverviewRes = await fetch(`${baseUrl}/api/admin/overview`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    assert(studentOverviewRes.status === 403, 'Student blocked from Admin Overview (403 Forbidden)');

    const adminOverviewRes = await fetch(`${baseUrl}/api/admin/overview`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const adminOverviewData = await adminOverviewRes.json();
    assert(adminOverviewRes.status === 200, 'Admin can access Overview (200 OK)');
    assert(Array.isArray(adminOverviewData.departments), 'Admin Overview provides departments array');
    assert(adminOverviewData.totalStudents >= 3, 'Overview provides real totalStudents count');
    assert(adminOverviewData.onlineStudents >= 1, 'Overview shows live online students accurately');

    // 5. Admin Departments CRUD
    console.log('\n--- 5. Department Management ---');
    const deptsRes = await fetch(`${baseUrl}/api/admin/departments`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const deptsData = await deptsRes.json();
    assert(deptsRes.status === 200 && deptsData.length >= 5, 'Admin can list departments (200 OK)');

    // 6. Teacher Quiz Permission Management
    console.log('\n--- 6. Teacher Quiz Permission & Student Status ---');
    const teacherStudentsRes = await fetch(`${baseUrl}/api/teacher/students/asg_1`, {
      headers: { 'Authorization': `Bearer ${teacherToken}` }
    });
    const teacherStudentsData = await teacherStudentsRes.json();
    assert(teacherStudentsRes.status === 200, 'Teacher can fetch students for assignment (200 OK)');
    assert(Array.isArray(teacherStudentsData.students), 'Students list returned for assignment');

    // Enable Quiz Permission for omkar (usr_student_3)
    const enablePermRes = await fetch(`${baseUrl}/api/quiz-permissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${teacherToken}`
      },
      body: JSON.stringify({
        studentId: 'usr_student_3',
        assignmentId: 'asg_1',
        status: 'available'
      })
    });
    assert(enablePermRes.status === 200 || enablePermRes.status === 201, 'Teacher can grant quiz access to student (200/201)');

    // 7. Student Categorized Quizzes
    console.log('\n--- 7. Student Categorized Quizzes ---');
    const studentQuizzesRes = await fetch(`${baseUrl}/api/student/quizzes`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    const studentQuizzesData = await studentQuizzesRes.json();
    assert(studentQuizzesRes.status === 200, 'Student can fetch categorized quizzes (200 OK)');
    assert(Array.isArray(studentQuizzesData.available), 'Quizzes response contains available list');
    const omkarCanPlayAsg1 = studentQuizzesData.available.some(q => q.assignmentId === 'asg_1');
    assert(omkarCanPlayAsg1, 'Student sees unlocked assignment quiz in available list');

    // 8. Viva Code Editor & Jaccard Comparison
    console.log('\n--- 8. Viva Code Submission & Jaccard Engine ---');
    const vivaSubmitRes = await fetch(`${baseUrl}/api/viva/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        assignmentId: 'asg_1',
        language: 'python',
        code: `class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\nclass BinarySearchTree:\n    def __init__(self):\n        self.root = None\n    def insert(self, val):\n        pass\n`
      })
    });
    const vivaSubmitData = await vivaSubmitRes.json();
    assert(vivaSubmitRes.status === 201, 'Student can submit viva code for comparison (201 Created)');
    assert(typeof vivaSubmitData.jaccardSimilarity === 'number', 'Viva returns numeric Jaccard similarity');
    assert(vivaSubmitData.jaccardSimilarity > 0, `Jaccard similarity calculated: ${vivaSubmitData.jaccardSimilarity}%`);

    // 9. Teacher Viva Review
    console.log('\n--- 9. Teacher Viva Review ---');
    const teacherVivaRes = await fetch(`${baseUrl}/api/viva/submissions/asg_1`, {
      headers: { 'Authorization': `Bearer ${teacherToken}` }
    });
    const teacherVivaData = await teacherVivaRes.json();
    assert(teacherVivaRes.status === 200, 'Teacher can fetch viva submissions (200 OK)');
    assert(teacherVivaData.some(v => v.studentId === 'usr_student_3'), 'Teacher sees student viva submission in review panel');

    // 10. Logout & Offline Status
    console.log('\n--- 10. Logout & Offline Sync ---');
    const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`
      }
    });
    assert(logoutRes.status === 200, 'Student can logout cleanly (200 OK)');

  } catch (err) {
    console.error('Test Suite Error:', err);
    failed++;
  } finally {
    await new Promise((resolve) => server.close(resolve));
    console.log('\n========================================================');
    console.log(`📊 HTTP E2E TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================\n');
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
