process.env.NODE_ENV = 'test';

import { app } from './index.js';
import { db } from './db.js';
import http from 'http';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'plagiarism-detector-jwt-secret-key-2026';

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`  ✅ PASS: ${message}`);
}

function makeToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      department: user.department,
      division: user.division
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

async function runAssignmentDataFlowTests() {
  console.log('\n========================================================');
  console.log('🧪 RUNNING ASSIGNMENT DATA FLOW & PER-ASSIGNMENT ISOLATION TESTS');
  console.log('========================================================\n');

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // Setup test users
    const teacherUser = db.getUsers().find(u => u.role === 'teacher') || {
      id: 'usr_teacher_1',
      name: 'Dr. Jane Smith',
      email: 'jane.smith@jspm.edu',
      role: 'teacher',
      department: 'Computer Engineering'
    };

    const studentCE = db.getUsers().find(u => u.role === 'student' && (u.department === 'Computer Engineering' || !u.department)) || {
      id: 'usr_student_1',
      name: 'John Doe',
      email: 'john.doe@jspm.edu',
      role: 'student',
      department: 'Computer Engineering',
      division: 'A'
    };

    let studentIT = db.getUsers().find(u => u.role === 'student' && u.department === 'Information Technology');
    if (!studentIT) {
      studentIT = {
        id: 'usr_student_it_test',
        name: 'IT Student',
        email: 'it_test_student@jspm.edu',
        role: 'student',
        department: 'Information Technology',
        division: 'B'
      };
      await db.addUser(studentIT);
    }

    const teacherToken = makeToken(teacherUser);
    const studentCEToken = makeToken(studentCE);
    const studentITToken = makeToken(studentIT);

    // -----------------------------------------------------------------
    // TEST 1: Fetching Assignment A returns its own specific examples
    // -----------------------------------------------------------------
    console.log('--- TEST 1: Fetch Assignment A ("Find Greatest of Two Numbers") ---');
    const resA = await fetch(`${baseUrl}/api/assignments/asg_3`, {
      headers: { 'Authorization': `Bearer ${studentCEToken}` }
    });
    assert(resA.status === 200, 'Assignment A (asg_3) fetched successfully (200)');
    const dataA = await resA.json();
    assert(dataA.id === 'asg_3', 'Returned assignment ID matches asg_3');
    assert(Array.isArray(dataA.examples), 'examples is an array');
    assert(dataA.examples.length >= 1, 'asg_3 has at least 1 example');
    assert(dataA.examples[0].input === '10 20', 'asg_3 example input is "10 20"');
    assert(dataA.examples[0].expectedOutput === '20', 'asg_3 example expected output is "20"');
    assert(dataA.problemStatement && dataA.problemStatement.toLowerCase().includes('great'), 'asg_3 problemStatement is assignment-specific');

    // -----------------------------------------------------------------
    // TEST 2: Fetching Assignment B returns its own real data (NOT A\'s examples)
    // -----------------------------------------------------------------
    console.log('\n--- TEST 2: Fetch Assignment B ("Binary Search Tree Implementation") ---');
    const resB = await fetch(`${baseUrl}/api/assignments/asg_1`, {
      headers: { 'Authorization': `Bearer ${studentCEToken}` }
    });
    assert(resB.status === 200, 'Assignment B (asg_1) fetched successfully (200)');
    const dataB = await resB.json();
    assert(dataB.id === 'asg_1', 'Returned assignment ID matches asg_1');
    assert(Array.isArray(dataB.examples), 'asg_1 examples is an array');
    assert(dataB.examples.length === 0, 'asg_1 has no fabricated examples (empty array)');
    assert(
      !JSON.stringify(dataB).includes('10 20'),
      'asg_1 does NOT contain Assignment A\'s example values ("10 20")'
    );
    assert(
      !JSON.stringify(dataB.examples).includes('10\\n'),
      'asg_1 examples do NOT contain hardcoded fallback "10\\n"'
    );

    // -----------------------------------------------------------------
    // TEST 3: Assignments A and B do not share examples or test cases
    // -----------------------------------------------------------------
    console.log('\n--- TEST 3: Assignment Example Isolation ---');
    assert(dataA.examples !== dataB.examples, 'Examples arrays are different references');
    assert(dataA.examples.length !== dataB.examples.length, 'Examples counts are distinct');
    assert(dataA.title !== dataB.title, 'Assignment titles are distinct');

    // -----------------------------------------------------------------
    // TEST 4: Updating Assignment A does not modify Assignment B
    // -----------------------------------------------------------------
    console.log('\n--- TEST 4: Updating Assignment A Does Not Bleed Into B ---');
    const updatedExamplesA = [
      { input: '10 20', expectedOutput: '20', explanation: 'Between 10 and 20, 20 is greater.' },
      { input: '50 100', expectedOutput: '100', explanation: 'Between 50 and 100, 100 is greater.' }
    ];

    const putRes = await fetch(`${baseUrl}/api/assignments/asg_3`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${teacherToken}`
      },
      body: JSON.stringify({
        title: 'Find Greatest of Two Numbers (Updated)',
        examples: updatedExamplesA,
        testcases: updatedExamplesA
      })
    });
    assert(putRes.status === 200, 'PUT /api/assignments/asg_3 succeeded (200)');

    // Verify Assignment A has updated examples
    const verifyA = await (await fetch(`${baseUrl}/api/assignments/asg_3`, {
      headers: { 'Authorization': `Bearer ${studentCEToken}` }
    })).json();
    assert(verifyA.examples.length === 2, 'asg_3 now has 2 examples');
    assert(verifyA.examples[1].input === '50 100', 'asg_3 second example saved correctly');

    // Verify Assignment B was NOT touched
    const verifyB = await (await fetch(`${baseUrl}/api/assignments/asg_1`, {
      headers: { 'Authorization': `Bearer ${studentCEToken}` }
    })).json();
    assert(verifyB.examples.length === 0, 'asg_1 still has 0 examples after updating asg_3');
    assert(!JSON.stringify(verifyB).includes('50 100'), 'asg_1 does NOT contain updated example from asg_3');

    // -----------------------------------------------------------------
    // TEST 5: Assignments without examples return explicit empty array []
    // -----------------------------------------------------------------
    console.log('\n--- TEST 5: Missing Examples Explicit Empty Result ---');
    const resDijkstra = await fetch(`${baseUrl}/api/assignments/asg_2`, {
      headers: { 'Authorization': `Bearer ${studentCEToken}` }
    });
    assert(resDijkstra.status === 200, 'asg_2 fetched successfully');
    const dataDijkstra = await resDijkstra.json();
    assert(Array.isArray(dataDijkstra.examples), 'examples is explicitly an array');
    assert(dataDijkstra.examples.length === 0, 'asg_2 returns empty array, never fake fallback values');

    // -----------------------------------------------------------------
    // TEST 6: Non-existent assignment ID returns 404
    // -----------------------------------------------------------------
    console.log('\n--- TEST 6: Non-Existent Assignment ID (404) ---');
    const res404 = await fetch(`${baseUrl}/api/assignments/non_existent_id_99999`, {
      headers: { 'Authorization': `Bearer ${studentCEToken}` }
    });
    assert(res404.status === 404, 'Non-existent assignment returns 404 Not Found');

    // -----------------------------------------------------------------
    // TEST 7: Malformed assignment ID returns 400
    // -----------------------------------------------------------------
    console.log('\n--- TEST 7: Malformed Assignment ID Validation (400) ---');
    const res400 = await fetch(`${baseUrl}/api/assignments/%20`, {
      headers: { 'Authorization': `Bearer ${studentCEToken}` }
    });
    assert(res400.status === 400, 'Malformed whitespace assignment ID returns 400 Bad Request');

    // -----------------------------------------------------------------
    // TEST 8: Department Authorization Separation (403 for cross-department student)
    // -----------------------------------------------------------------
    console.log('\n--- TEST 8: Cross-Department RBAC Access Check ---');
    const resForbidden = await fetch(`${baseUrl}/api/assignments/asg_1`, {
      headers: { 'Authorization': `Bearer ${studentITToken}` }
    });
    assert(resForbidden.status === 403, 'Cross-department student access is rejected (403 Forbidden)');

    // -----------------------------------------------------------------
    // TEST 9: Teacher creates and edits new assignment with distinct examples
    // -----------------------------------------------------------------
    console.log('\n--- TEST 9: Teacher Full Lifecycle Assignment Creation & Persistence ---');
    const newAsgPayload = {
      title: 'Matrix Multiplication Test',
      code: 'CS309',
      subject: 'Data Structures & Algorithms',
      description: 'Multiply two matrices and print result.',
      problemStatement: 'Multiply two N x N matrices.',
      inputFormat: 'N followed by two matrices',
      outputFormat: 'Resultant N x N matrix',
      constraints: '1 <= N <= 100',
      deadline: new Date(Date.now() + 86400000 * 7).toISOString(),
      department: 'Computer Engineering',
      division: 'all',
      divisions: ['A', 'B', 'C'],
      languages: ['python', 'cpp'],
      examples: [
        { input: '2\n1 2\n3 4\n1 0\n0 1', expectedOutput: '1 2\n3 4', explanation: 'Identity multiplication' }
      ],
      testcases: [
        { input: '2\n1 2\n3 4\n1 0\n0 1', expectedOutput: '1 2\n3 4', explanation: 'Identity multiplication' }
      ]
    };

    const createRes = await fetch(`${baseUrl}/api/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${teacherToken}`
      },
      body: JSON.stringify(newAsgPayload)
    });
    assert(createRes.status === 201, 'Teacher successfully created new assignment (201)');
    const createdAsg = await createRes.json();
    assert(createdAsg.id, 'New assignment has unique ID');
    assert(createdAsg.examples.length === 1, 'Created assignment persists its 1 example');
    assert(createdAsg.examples[0].input.includes('1 2'), 'Created assignment example input persisted accurately');

    // Fetch newly created assignment directly by ID
    const fetchCreated = await (await fetch(`${baseUrl}/api/assignments/${createdAsg.id}`, {
      headers: { 'Authorization': `Bearer ${studentCEToken}` }
    })).json();
    assert(fetchCreated.id === createdAsg.id, 'Retrieved assignment matches created ID');
    assert(fetchCreated.examples.length === 1, 'Retrieved assignment has correct example count');
    assert(fetchCreated.inputFormat === 'N followed by two matrices', 'Input format preserved');
    assert(fetchCreated.outputFormat === 'Resultant N x N matrix', 'Output format preserved');

    // Clean up created test assignment
    await db.deleteAssignment(createdAsg.id);

    console.log('\n========================================================');
    console.log('🎉 ALL ASSIGNMENT DATA FLOW REGRESSION TESTS PASSED (9/9)');
    console.log('========================================================\n');
  } catch (err) {
    console.error('❌ Test execution error:', err);
    process.exit(1);
  } finally {
    server.close();
  }
}

runAssignmentDataFlowTests();
