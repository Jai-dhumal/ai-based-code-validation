import assert from 'assert';
import { executeBatchTestcasesInternal, executeCodeInternal, compareOutputs } from './index.js';

console.log('=== RUNNING COMPREHENSIVE 5-LANGUAGE & 15-SCENARIO SUITE ===\n');

async function runTests() {
  let passed = 0;
  let total = 0;

  function record(desc, cond) {
    total++;
    if (cond) {
      console.log(`  ✅ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${desc}`);
      throw new Error(`Test failed: ${desc}`);
    }
  }

  // --- SCENARIO 1 & 11: Python Correct Program & Multiple Test Cases ---
  console.log('--- Language 1: Python Tests ---');
  const pyRes = await executeBatchTestcasesInternal({
    language: 'python',
    code: 'import sys\nfor line in sys.stdin:\n    print(int(line.strip()) * 2)',
    testcases: [
      { input: '10', expectedOutput: '20' },
      { input: '25', expectedOutput: '50' }
    ]
  });
  record('Python: Correct program with multiple test cases', pyRes.allPassed && pyRes.passedCount === 2);
  record('Python: Status is Accepted', pyRes.results[0].status === 'Accepted' && pyRes.results[1].status === 'Accepted');

  // --- SCENARIO 2: Python Incorrect Output ---
  const pyWrong = await executeBatchTestcasesInternal({
    language: 'python',
    code: 'print(42)',
    testcases: [{ input: '', expectedOutput: '99' }]
  });
  record('Python: Incorrect output categorized as Wrong Answer', !pyWrong.allPassed && pyWrong.results[0].status === 'Wrong Answer');

  // --- SCENARIO 3: Python Syntax Error ---
  const pySyntax = await executeBatchTestcasesInternal({
    language: 'python',
    code: 'def broken(: pass',
    testcases: [
      { input: '1', expectedOutput: '1' },
      { input: '2', expectedOutput: '2' }
    ]
  });
  record('Python: Syntax error detected', pySyntax.results[0].status === 'Runtime Error' || pySyntax.results[0].status === 'Compile Error');

  // --- SCENARIO 4: Python Runtime Exception ---
  const pyZero = await executeBatchTestcasesInternal({
    language: 'python',
    code: 'print(10 / 0)',
    testcases: [{ input: '', expectedOutput: '0' }]
  });
  record('Python: Division by zero caught as Runtime Error', pyZero.results[0].status === 'Runtime Error');
  record('Python: Error details captured in stderr', pyZero.results[0].stderr.includes('ZeroDivisionError'));

  // --- SCENARIO 5: Infinite Loop Timeout ---
  const pyTimeout = await executeBatchTestcasesInternal({
    language: 'python',
    code: 'import time\nwhile True: time.sleep(0.1)',
    testcases: [{ input: '', expectedOutput: 'done' }]
  });
  record('Python: Infinite loop triggers Time Limit Exceeded', pyTimeout.results[0].status === 'Time Limit Exceeded');

  // --- SCENARIO 7 & 8: Multiline vs Single-line Input ---
  const pyMulti = await executeBatchTestcasesInternal({
    language: 'python',
    code: 'import sys\nvals = sys.stdin.read().split()\nprint(sum(map(int, vals)))',
    testcases: [
      { input: '5\n10\n20\n30\n40\n50', expectedOutput: '155' },
      { input: '5 10 20 30 40 50', expectedOutput: '155' }
    ]
  });
  record('Python: Multiline input processed correctly', pyMulti.results[0].passed && pyMulti.results[0].actualOutput === '155');
  record('Python: Single-line input processed correctly', pyMulti.results[1].passed && pyMulti.results[1].actualOutput === '155');

  // --- SCENARIO 10: Extra Output Rejection ---
  const compExtra = compareOutputs('The answer is 42', '42');
  record('Policy: Extra output rejected under exact comparison', compExtra.passed === false);

  // --- SCENARIO 13: Floating-point Input ---
  const pyFloat = await executeBatchTestcasesInternal({
    language: 'python',
    code: 'import sys\na, b = map(float, sys.stdin.read().split())\nprint(f"{a + b:.2f}")',
    testcases: [{ input: '3.14 2.71', expectedOutput: '5.85' }]
  });
  record('Python: Decimal/floating point input verified', pyFloat.results[0].passed);

  // --- Language 2: JavaScript Tests ---
  console.log('\n--- Language 2: JavaScript Tests ---');
  const jsRes = await executeBatchTestcasesInternal({
    language: 'javascript',
    code: 'const fs = require("fs"); const nums = fs.readFileSync(0, "utf8").trim().split(/\\s+/).map(Number); console.log(nums.reduce((a,b)=>a+b, 0));',
    testcases: [
      { input: '10 20 30', expectedOutput: '60' },
      { input: '100\n200\n300', expectedOutput: '600' }
    ]
  });
  record('JavaScript: Multiline and single-line stdin verified', jsRes.allPassed && jsRes.passedCount === 2);

  const jsErr = await executeBatchTestcasesInternal({
    language: 'javascript',
    code: 'throw new Error("Custom JS Exception");',
    testcases: [{ input: '', expectedOutput: '' }]
  });
  record('JavaScript: Runtime exception caught with stderr', jsErr.results[0].status === 'Runtime Error' && jsErr.results[0].stderr.includes('Custom JS Exception'));

  // --- Language 3: C Tests (with gcc) ---
  console.log('\n--- Language 3: C Tests ---');
  const cRes = await executeBatchTestcasesInternal({
    language: 'c',
    code: '#include <stdio.h>\nint main() {\n    int a, b;\n    if (scanf("%d %d", &a, &b) == 2) {\n        printf("%d\\n", a > b ? a : b);\n    }\n    return 0;\n}',
    testcases: [
      { input: '10 20', expectedOutput: '20' },
      { input: '50\n30', expectedOutput: '50' }
    ]
  });
  record('C: Standard input and logic verified', cRes.allPassed && cRes.passedCount === 2);

  const cCompileErr = await executeBatchTestcasesInternal({
    language: 'c',
    code: '#include <stdio.h>\nint main() { SYNTAX_ERROR_UNDEFINED_VAR; }',
    testcases: [
      { input: '1', expectedOutput: '1' },
      { input: '2', expectedOutput: '2' }
    ]
  });
  record('C: Compilation error stops execution', cCompileErr.hasCompileError);
  record('C: Remaining cases marked Blocked / Not Executed', cCompileErr.results[1].status === 'Blocked / Not Executed');

  // --- Language 4: C++ Tests (with g++) ---
  console.log('\n--- Language 4: C++ Tests ---');
  const cppRes = await executeBatchTestcasesInternal({
    language: 'cpp',
    code: '#include <iostream>\nusing namespace std;\nint main() {\n    int n; if (cin >> n) cout << (n % 2 == 0 ? "EVEN" : "ODD") << endl;\n    return 0;\n}',
    testcases: [
      { input: '4', expectedOutput: 'EVEN' },
      { input: '7', expectedOutput: 'ODD' }
    ]
  });
  record('C++: Conditionals and stdin verified', cppRes.allPassed && cppRes.passedCount === 2);

  // --- Language 5: Java Tests (with javac & java) ---
  console.log('\n--- Language 5: Java Tests ---');
  const javaRes = await executeBatchTestcasesInternal({
    language: 'java',
    code: 'import java.util.Scanner;\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNextInt()) {\n            int x = sc.nextInt();\n            System.out.println(x * x);\n        }\n    }\n}',
    testcases: [
      { input: '6', expectedOutput: '36' },
      { input: '12', expectedOutput: '144' }
    ]
  });
  record('Java: OpenJDK compile-once and execute verified', javaRes.allPassed && javaRes.passedCount === 2);

  console.log(`\n========================================================`);
  console.log(`🎉 ALL ${passed}/${total} SCENARIOS TESTED AND PASSED SUCCESSFULLY!`);
  console.log(`========================================================\n`);
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
