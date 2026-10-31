// End-to-End Test Suite for AI-Powered Automatic Assignment Creation
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  wrapCodeWithDriver,
  stripExecutionDriver,
  hasMainFunction
} from './services/executionDriver.js';
import {
  analyzeAndGenerateAssignment,
  verifyTestcasesIndependently
} from './services/assignmentGenerator.js';
import { executeBatchTestcasesInternal } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read Gemini API Key from .env
let geminiApiKey = process.env.GEMINI_API_KEY || '';
try {
  const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  for (const line of envContent.split('\n')) {
    if (line.startsWith('GEMINI_API_KEY=')) {
      geminiApiKey = line.split('=')[1].trim();
    }
  }
} catch (e) {}

async function runTestSuite() {
  console.log('================================================================');
  console.log('🧪 VERIFYING AI-POWERED AUTOMATIC ASSIGNMENT CREATION SYSTEM');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      passed++;
      console.log(`  ✅ [PASS] ${name}`);
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
    }
  }

  async function testAsync(name, fn) {
    total++;
    try {
      await fn();
      passed++;
      console.log(`  ✅ [PASS] ${name}`);
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
    }
  }

  // 1. Python Execution Driver Generation
  test('Python: Automatic driver generation wraps student function', () => {
    const studentCode = 'def twoSum(nums, target):\n    return [0, 1]';
    const wrapped = wrapCodeWithDriver({
      language: 'python',
      code: studentCode,
      functionConfig: {
        functionName: 'twoSum',
        className: 'Solution',
        parameters: [{ name: 'nums', type: 'int[]' }, { name: 'target', type: 'int' }],
        returnType: 'int[]'
      }
    });
    assert(wrapped.includes('AUTOMATIC EXECUTION HARNESS'), 'Should contain driver marker');
    assert(wrapped.includes('callable_func(*args_to_pass)'), 'Should invoke function');
  });

  // 2. Python Stripping for Plagiarism
  test('Plagiarism Safety: Synthetic driver stripped cleanly', () => {
    const studentCode = 'def twoSum(nums, target):\n    return [0, 1]';
    const wrapped = wrapCodeWithDriver({
      language: 'python',
      code: studentCode,
      functionConfig: {
        functionName: 'twoSum',
        className: 'Solution',
        parameters: [{ name: 'nums', type: 'int[]' }, { name: 'target', type: 'int' }],
        returnType: 'int[]'
      }
    });
    const stripped = stripExecutionDriver(wrapped);
    assert.strictEqual(stripped, studentCode, 'Stripped code must exactly match original student business logic');
  });

  // 3. JavaScript Execution Driver Generation
  test('JavaScript: Driver generation wraps student function', () => {
    const studentCode = 'function twoSum(nums, target) { return [0, 1]; }';
    const wrapped = wrapCodeWithDriver({
      language: 'javascript',
      code: studentCode,
      functionConfig: {
        functionName: 'twoSum',
        className: 'Solution',
        parameters: [{ name: 'nums', type: 'int[]' }, { name: 'target', type: 'int' }],
        returnType: 'int[]'
      }
    });
    assert(wrapped.includes('AUTOMATIC EXECUTION HARNESS'), 'Should contain JS driver marker');
    assert(wrapped.includes('targetFn(...parsedArgs)'), 'Should invoke function with parsed args');
  });

  // 4. C++ Driver Generation
  test('C++: Driver generation synthesizes main harness', () => {
    const studentCode = 'class Solution { public: vector<int> twoSum(vector<int>& nums, int target) { return {0, 1}; } };';
    const wrapped = wrapCodeWithDriver({
      language: 'cpp',
      code: studentCode,
      functionConfig: {
        functionName: 'twoSum',
        className: 'Solution',
        parameters: [{ name: 'nums', type: 'vector<int>' }, { name: 'target', type: 'int' }],
        returnType: 'vector<int>'
      }
    });
    assert(wrapped.includes('int main()'), 'Should contain main function');
    assert(wrapped.includes('solver.twoSum'), 'Should call Solution::twoSum');
  });

  // 5. Existing Main Detection Safety
  test('Driver Safety: Does not double-wrap if code already contains main', () => {
    const codeWithMain = '#include <iostream>\nint main() { return 0; }';
    const wrapped = wrapCodeWithDriver({
      language: 'cpp',
      code: codeWithMain,
      functionConfig: { functionName: 'solve' }
    });
    assert.strictEqual(wrapped, codeWithMain, 'Must not append duplicate main');
  });

  // 6. Real Execution of Function-Based Code (Python)
  await testAsync('Execution: Function-based Python solution runs without manual input parsing', async () => {
    const studentCode = `
def greatestNumber(a, b):
    return a if a > b else b
`;
    const wrapped = wrapCodeWithDriver({
      language: 'python',
      code: studentCode,
      functionConfig: {
        functionName: 'greatestNumber',
        className: 'Solution',
        parameters: [{ name: 'a', type: 'int' }, { name: 'b', type: 'int' }],
        returnType: 'int'
      }
    });

    const res = await executeBatchTestcasesInternal({
      language: 'python',
      code: wrapped,
      testcases: [
        { input: '10 20', expectedOutput: '20' },
        { input: '99 42', expectedOutput: '99' },
        { input: '-5 -12', expectedOutput: '-5' }
      ]
    });

    assert(res.allPassed, `All test cases must pass. Failed: ${JSON.stringify(res.results)}`);
    assert.strictEqual(res.passedCount, 3, 'All 3 testcases should pass');
  });

  // 7. Real Execution of Function-Based Code (JavaScript)
  await testAsync('Execution: Function-based JavaScript solution runs without manual stdin handling', async () => {
    const studentCode = `
function greatestNumber(a, b) {
    return a > b ? a : b;
}
`;
    const wrapped = wrapCodeWithDriver({
      language: 'javascript',
      code: studentCode,
      functionConfig: {
        functionName: 'greatestNumber',
        className: 'Solution',
        parameters: [{ name: 'a', type: 'int' }, { name: 'b', type: 'int' }],
        returnType: 'int'
      }
    });

    const res = await executeBatchTestcasesInternal({
      language: 'javascript',
      code: wrapped,
      testcases: [
        { input: '10 20', expectedOutput: '20' },
        { input: '100 50', expectedOutput: '100' }
      ]
    });

    assert(res.allPassed, `All JS test cases must pass. Results: ${JSON.stringify(res.results)}`);
  });

  // 8. Independent Verification Engine
  await testAsync('Verification: Independent verification validates reference solution', async () => {
    const refCode = `
def twoSum(nums, target):
    seen = {}
    for i, n in enumerate(nums):
        diff = target - n
        if diff in seen:
            return [seen[diff], i]
        seen[n] = i
    return []
`;
    const report = await verifyTestcasesIndependently({
      functionConfig: {
        functionName: 'twoSum',
        className: 'Solution',
        parameters: [{ name: 'nums', type: 'int[]' }, { name: 'target', type: 'int' }],
        returnType: 'int[]'
      },
      referenceSolutionPython: refCode,
      candidateTestcases: [
        { input: '[2, 7, 11, 15]\n9', expectedOutput: '[0, 1]', category: 'basic' },
        { input: '[3, 2, 4]\n6', expectedOutput: '[1, 2]', category: 'normal' },
        { input: '[3, 3]\n6', expectedOutput: '[0, 1]', category: 'boundary' }
      ]
    });

    assert(report.success, 'Verification must succeed');
    assert(report.allPassed, `All testcases must pass reference verification: ${JSON.stringify(report)}`);
    assert.strictEqual(report.passedCount, 3);
  });

  // 9. Full Gemini AI Assignment Analysis & Generation
  if (geminiApiKey) {
    await testAsync('AI Generation: Gemini generates complete assignment configuration from title & statement', async () => {
      const generated = await analyzeAndGenerateAssignment({
        title: 'Two Sum Problem',
        problemStatement: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. Each input has exactly one solution, and you may not use the same element twice.',
        languages: ['python', 'javascript', 'cpp'],
        difficulty: 'Easy',
        apiKey: geminiApiKey
      });

      assert(generated.functionConfig, 'Must have functionConfig');
      assert.strictEqual(typeof generated.functionConfig.functionName, 'string', 'Must have functionName');
      assert(generated.starterCode.python, 'Must have Python starter code');
      assert(generated.starterCode.javascript, 'Must have JavaScript starter code');
      assert(generated.starterCode.cpp, 'Must have C++ starter code');
      assert(Array.isArray(generated.candidateTestcases), 'Must have candidate testcases array');
      assert(generated.candidateTestcases.length >= 4, 'Must have at least 4 test cases');
      assert(Array.isArray(generated.quizQuestions), 'Must have quiz questions array');
      assert(generated.quizQuestions.length >= 3, 'Must have at least 3 quiz questions');
      assert(generated.verification, 'Must include independent verification report');

      console.log(`     -> Generated function: ${generated.functionConfig.functionName}(${generated.functionConfig.parameters.map(p=>p.name).join(', ')})`);
      console.log(`     -> Verified testcases: ${generated.verification.passedCount}/${generated.verification.totalCount} passed`);
      console.log(`     -> Generated quiz questions: ${generated.quizQuestions.length}`);
    });
  }

  console.log('\n================================================================');
  console.log(`📊 AI ASSIGNMENT CREATION TEST RESULTS: ${passed}/${total} PASSED`);
  console.log('================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
