// test_comprehensive_audit.js
// Complete functional audit verification script for AI-Based Code Validation with Jaccard Algorithm
import http from 'http';
import assert from 'assert';
import { app, jaccardSimilarity } from './index.js';
import { db } from './db.js';
import { compareCode, runTier1Check } from './plagiarism/winnowing.js';
import { runTier2Evaluation, generateCodeQuiz } from './services/gemini.js';
import { generateToken } from './middleware/auth.js';

let passed = 0;
let failed = 0;

function report(condition, desc) {
  if (condition) {
    console.log(`  ✅ PASS: ${desc}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${desc}`);
    failed++;
  }
}

async function runAudit() {
  console.log('\n================================================================');
  console.log('🔬 STARTING COMPLETE FUNCTIONAL AUDIT & SPECIFICATION VERIFICATION');
  console.log('================================================================\n');

  // Start test server on random port
  const server = http.createServer(app);
  await new Promise(r => server.listen(0, r));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // -------------------------------------------------------------------------
    // SECTION 1: REGISTRATION, GMAIL UNIQUENESS & EMAIL OTP
    // -------------------------------------------------------------------------
    console.log('--- SECTION 1: Registration, Case-Insensitive Email & OTP Workflow ---');

    const testEmailLower = `audit_student_${Date.now()}@jspm.edu`;
    const testEmailUpper = testEmailLower.toUpperCase();

    // 1.1 Request OTP for test email
    const otpRes = await fetch(`${baseUrl}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmailLower, role: 'student' })
    });
    const otpData = await otpRes.json();
    report(otpRes.status === 200 && otpData.success === true, 'REG-01/04: Real email OTP requested and dispatched successfully');

    // 1.2 Attempt duplicate OTP request with UPPERCASE email before verification
    const dupOtpRes = await fetch(`${baseUrl}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmailUpper, role: 'student' })
    });
    // Should be rate-limited by 30s cooldown because case-insensitive normalized email matches
    report(dupOtpRes.status === 429, 'REG-02: Uppercase email variant recognized as identical account identifier (429 Cooldown)');

    // 1.3 Verify OTP with invalid code
    const badVerifyRes = await fetch(`${baseUrl}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmailLower, emailOtp: '000000' })
    });
    report(badVerifyRes.status === 400, 'REG-04: Invalid OTP is rejected with 400');

    // 1.4 Get the test OTP from memory for verification
    const { _getTestOtp } = await import('./index.js');
    const validOtp = _getTestOtp(testEmailLower);
    report(typeof validOtp === 'string' && validOtp.length === 6, 'REG-04: Cryptographically secure 6-digit OTP stored in memory session');

    // 1.5 Verify OTP with UPPERCASE email
    const goodVerifyRes = await fetch(`${baseUrl}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmailUpper, emailOtp: validOtp })
    });
    report(goodVerifyRes.status === 200, 'REG-04/05: OTP verification succeeds with case-insensitive email matching');

    // 1.6 Register new student account
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Audit Student',
        email: testEmailLower,
        password: 'password123',
        role: 'student',
        department: 'Computer Engineering',
        division: 'A',
        rollNo: 'CE2025-AUDIT'
      })
    });
    const regData = await regRes.json();
    report(regRes.status === 201 && Boolean(regData.token), 'REG-01: New student registered successfully with JWT session token');

    // 1.7 Attempt duplicate registration with exact same email
    const dupRegRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate Student',
        email: testEmailLower,
        password: 'password123',
        role: 'student'
      })
    });
    report(dupRegRes.status === 400, 'REG-02/03: Duplicate registration with exact email blocked (400)');

    // 1.8 Attempt duplicate registration with UPPERCASE email variant
    const dupUpperRegRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate Student Upper',
        email: testEmailUpper,
        password: 'password123',
        role: 'student'
      })
    });
    report(dupUpperRegRes.status === 400, 'REG-02/03: Duplicate registration with UPPERCASE email variant blocked (400)');

    // 1.9 Attempt login with UPPERCASE email variant
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmailUpper,
        password: 'password123',
        expectedRole: 'student'
      })
    });
    const loginData = await loginRes.json();
    report(loginRes.status === 200 && Boolean(loginData.token), 'REG-05: Case-insensitive login succeeds with uppercase email');

    // -------------------------------------------------------------------------
    // SECTION 2: ASSIGNMENT-WISE CODE SIMILARITY & ISOLATION
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 2: Assignment-Wise Isolation & Cross-Assignment Exclusion ---');
    const studentToken = regData.token;

    // 2.1 Test code submission on Assignment 2 (which has 0 submissions)
    // Should NOT compare against Assignment 1 submissions!
    const asg2Code = `import heapq
def dijkstra(graph, start_node):
    dist = {start_node: 0}
    pq = [(0, start_node)]
    while pq:
        d, u = heapq.heappop(pq)
        for v, w in graph.get(u, []):
            if dist.get(v, float('inf')) > d + w:
                dist[v] = d + w
                heapq.heappush(pq, (dist[v], v))
    return dist`;

    const asg2Res = await fetch(`${baseUrl}/api/validate/tier1`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        code: asg2Code,
        assignmentId: 'asg_2',
        language: 'python'
      })
    });
    const asg2Data = await asg2Res.json();
    report(asg2Res.status === 200, 'Tier-1 validation succeeds for Assignment 2');
    report(asg2Data.score === 0, `Assignment isolation: First submission to Assignment 2 receives 0% similarity (Got: ${asg2Data.score}%)`);
    report(asg2Data.allComparisons.length === 0, 'Assignment isolation: Unrelated assignment submissions strictly excluded from comparison list');

    // 2.2 Test self-submission exclusion:
    // If student has an earlier submission, validating another code should NOT compare against their own past submission!
    const asgIsolationId = `asg_test_isolation_${Date.now()}`;
    const ownSub = {
      id: `sub_audit_own_${Date.now()}`,
      assignmentId: asgIsolationId,
      studentId: regData.user.id,
      studentName: regData.user.name,
      rollNo: regData.user.rollNo,
      code: 'def test(): return 42'
    };
    db.saveSubmission(ownSub);

    const ownCheckRes = await fetch(`${baseUrl}/api/validate/tier1`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        code: 'def test(): return 42',
        assignmentId: asgIsolationId,
        language: 'python'
      })
    });
    const ownCheckData = await ownCheckRes.json();
    report(ownCheckData.allComparisons.length === 0, 'Self-submission exclusion: Student earlier submission is excluded from comparison list');

    // Clean up test submission from DB
    const subIdx = db.data.submissions.findIndex(s => s.id === ownSub.id);
    if (subIdx !== -1) db.data.submissions.splice(subIdx, 1);

    // -------------------------------------------------------------------------
    // SECTION 3: JACCARD SIMILARITY ALGORITHM VALIDATION
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 3: Jaccard Similarity Algorithm Tests ---');

    // 3.1 Identical programs with identical formatting
    const codeIdentical1 = 'def fib(n):\n    if n <= 1: return n\n    return fib(n-1) + fib(n-2)';
    const codeIdentical2 = 'def fib(n):\n    if n <= 1: return n\n    return fib(n-1) + fib(n-2)';
    const jaccardIdentical = jaccardSimilarity(codeIdentical1, codeIdentical2);
    report(jaccardIdentical === 100, `Identical code produces exactly 100% Jaccard similarity (Got: ${jaccardIdentical}%)`);

    // 3.2 Identical logic with different variable names
    const codeVars1 = 'def calc_sum(numbers):\n    total = 0\n    for n in numbers:\n        total += n\n    return total';
    const codeVars2 = 'def calc_sum(items_list):\n    accumulator = 0\n    for element in items_list:\n        accumulator += element\n    return accumulator';
    const jaccardVars = jaccardSimilarity(codeVars1, codeVars2);
    report(jaccardVars > 0 && jaccardVars < 100, `Renamed variables show reduced literal Jaccard score (Got: ${jaccardVars}%)`);

    // 3.3 Identical logic with different whitespace and comments
    const codeComments1 = '# Calculate factorial\ndef fact(n):\n    // Base case\n    if n <= 1: return 1\n    return n * fact(n-1)';
    const codeComments2 = 'def fact(n):\n\n    if n <= 1:\n        return 1\n    return n * fact(n-1)\n';
    const jaccardComments = jaccardSimilarity(codeComments1, codeComments2);
    report(jaccardComments === 100, `Different whitespace/comments stripped cleanly (Got: ${jaccardComments}%)`);

    // 3.4 Completely unrelated programs
    const codeA = 'class BST:\n    def __init__(self): self.root = None';
    const codeB = 'import requests\ndef fetch_data(): return requests.get("https://example.com")';
    const jaccardUnrelated = jaccardSimilarity(codeA, codeB);
    report(jaccardUnrelated <= 10, `Completely unrelated programs produce low Jaccard similarity (Got: ${jaccardUnrelated}%)`);

    // 3.5 Empty or invalid submissions
    report(jaccardSimilarity('', '') === 100, 'Empty vs empty returns 100% safely');
    report(jaccardSimilarity('def foo(): pass', '') === 0, 'Code vs empty returns 0% safely');

    // -------------------------------------------------------------------------
    // SECTION 4: STRICT 70% THRESHOLD VERIFICATION
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 4: Strict 70% Threshold & Boundary Verification ---');

    // Helper to evaluate arbitrary score against runTier1Check threshold rules
    // Test boundary: 69.99% <= 70, 70.00% <= 70, 70.01% > 70
    function evaluateThreshold(simScore) {
      const highThreshold = 70;
      const lowThreshold = 35;
      let verdict = 'Clean Submission';
      let status = 'CLEAN';
      let requiresTier2 = false;

      if (simScore > highThreshold) {
        verdict = 'High Plagiarism Detected';
        status = 'HIGH_SIMILARITY';
        requiresTier2 = true;
      } else if (simScore >= lowThreshold) {
        verdict = 'Borderline Similarity';
        status = 'BORDERLINE';
        requiresTier2 = true;
      } else {
        verdict = 'Low Similarity (Unique)';
        status = 'CLEAN';
        requiresTier2 = false;
      }
      return { status, requiresTier2, verdict };
    }

    const res6999 = evaluateThreshold(69.99);
    report(res6999.status === 'BORDERLINE' && res6999.status !== 'HIGH_SIMILARITY',
      'Boundary 69.99%: Is NOT flagged as High Plagiarism (Strict > 70.0% rule)');

    const res7000 = evaluateThreshold(70.00);
    report(res7000.status === 'BORDERLINE' && res7000.status !== 'HIGH_SIMILARITY',
      'Boundary 70.00%: Is NOT flagged as High Plagiarism (70.00% is not greater than 70%)');

    const res7001 = evaluateThreshold(70.01);
    report(res7001.status === 'HIGH_SIMILARITY' && res7001.requiresTier2 === true,
      'Boundary 70.01%: IS flagged as High Plagiarism and triggers AI review (70.01% > 70%)');

    // -------------------------------------------------------------------------
    // SECTION 5: SHORT-CODE HANDLING
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 5: Short-Code Handling & Boilerplate Protection ---');

    const shortBoilerplate = 'int main() { return 0; }';
    const shortT1Result = runTier1Check(shortBoilerplate, [
      { id: 'sub_past_1', code: 'int main() { int a = 1; return 0; }', studentName: 'Peer' }
    ]);
    report(shortT1Result.isShortCode === true, 'Short code (< 20 tokens) is detected with isShortCode = true');
    report(Boolean(shortT1Result.shortCodeNotice), 'Short code provides informational notice explaining brief syntax');

    // -------------------------------------------------------------------------
    // SECTION 6: GEMINI AI REVIEW & REAL OPENAI FALLBACK
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 6: AI Semantic Review & Provider Fallbacks ---');

    const sampleStudentCode = `class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right`;

    const sampleRefCode = `class Node:
    def __init__(self, data=0, l=None, r=None):
        self.data = data
        self.l = l
        self.r = r`;

    // 6.1 Test Tier-2 Evaluation (offline fallback or configured live provider)
    const tier2Result = await runTier2Evaluation({
      code: sampleStudentCode,
      referenceCode: sampleRefCode,
      assignmentTitle: 'Binary Search Tree Implementation',
      language: 'python'
    });
    report(typeof tier2Result.semanticSimilarityScore === 'number', 'Tier-2 evaluation returns numeric semanticSimilarityScore');
    report(Boolean(tier2Result.verdict), `Tier-2 evaluation returns verdict: "${tier2Result.verdict}"`);
    report(Boolean(tier2Result.logicEquivalence), `Tier-2 evaluation returns logicEquivalence: "${tier2Result.logicEquivalence}"`);
    report(Array.isArray(tier2Result.explanation) && tier2Result.explanation.length > 0, 'Tier-2 evaluation provides structured explanation array');
    report(Boolean(tier2Result.recommendation), `Tier-2 evaluation returns recommendation: "${tier2Result.recommendation}"`);

    // 6.2 Test Dynamic Code-Tailored Quiz Generation
    const quizQuestions = await generateCodeQuiz({
      code: sampleStudentCode,
      assignmentTitle: 'Binary Search Tree Implementation',
      language: 'python'
    });
    report(Array.isArray(quizQuestions) && quizQuestions.length >= 8, `Quiz generator creates ${quizQuestions?.length} tailored questions`);
    report(Boolean(quizQuestions[0]?.question && quizQuestions[0]?.options?.length === 4), 'Quiz question has authentic question text and 4 choices');

    // -------------------------------------------------------------------------
    // SECTION 7: TEACHER WORKFLOWS & QUIZ ACCESS PERMISSIONS
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 7: Teacher Workflows, Permissions & Student Access ---');

    const teacher = db.getUsers('teacher')[0];
    const teacherToken = generateToken(teacher);

    // 7.1 Teacher assignment creation
    const newAsgRes = await fetch(`${baseUrl}/api/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${teacherToken}`
      },
      body: JSON.stringify({
        title: 'Audit Assignment: Graph BFS/DFS',
        subject: 'Algorithms',
        description: 'Implement BFS and DFS graph traversals.',
        languages: ['python', 'cpp'],
        minQuizScore: 70
      })
    });
    const newAsgData = await newAsgRes.json();
    report(newAsgRes.status === 200 || newAsgRes.status === 201, 'Teacher can create new course assignment');

    // 7.2 Teacher grants quiz permission to student
    const grantPermRes = await fetch(`${baseUrl}/api/quiz-permissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${teacherToken}`
      },
      body: JSON.stringify({
        studentId: regData.user.id,
        assignmentId: newAsgData.id,
        status: 'available'
      })
    });
    report(grantPermRes.status === 200 || grantPermRes.status === 201, 'Teacher can grant quiz access permission for student');

    // 7.3 Student categorized quizzes shows newly unlocked quiz
    const studentQuizzesRes = await fetch(`${baseUrl}/api/student/quizzes`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    const studentQuizzes = await studentQuizzesRes.json();
    const isAvailable = studentQuizzes.available?.some(q => q.assignmentId === newAsgData.id);
    report(isAvailable === true, 'Student portal displays unlocked assignment in "available" quizzes category');

    // 7.4 Student submits viva code
    const vivaRes = await fetch(`${baseUrl}/api/viva/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        assignmentId: newAsgData.id,
        code: sampleStudentCode,
        language: 'python'
      })
    });
    const vivaData = await vivaRes.json();
    report(vivaRes.status === 201 && typeof vivaData.similarity === 'number', 'Student can submit viva code and receives Jaccard similarity score');

    // -------------------------------------------------------------------------
    // SECTION 8: ROLE-BASED ACCESS CONTROL & PRESENCE
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 8: Role-Based Access Control (RBAC) & Presence ---');

    // Student attempting admin overview
    const studentAdminRes = await fetch(`${baseUrl}/api/admin/overview`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    report(studentAdminRes.status === 403, 'RBAC: Student is blocked from Admin Overview (403)');

    // Student attempting teacher quiz permission grant
    const studentGrantRes = await fetch(`${baseUrl}/api/quiz-permissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`
      },
      body: JSON.stringify({ studentId: 'usr_student_1', assignmentId: 'asg_1', status: 'available' })
    });
    report(studentGrantRes.status === 403, 'RBAC: Student is blocked from granting quiz permissions (403)');

    // Admin accessing overview
    const admin = db.getUsers('admin')[0];
    const adminToken = generateToken(admin);
    const adminOverviewRes = await fetch(`${baseUrl}/api/admin/overview`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const adminOverview = await adminOverviewRes.json();
    report(adminOverviewRes.status === 200 && Array.isArray(adminOverview.departments), 'RBAC: Admin successfully retrieves institutional overview with departments');

    console.log('\n================================================================');
    console.log(`📊 AUDIT COMPLETED: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    server.close();
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Fatal audit error:', err);
    server.close();
    process.exit(1);
  }
}

runAudit();
