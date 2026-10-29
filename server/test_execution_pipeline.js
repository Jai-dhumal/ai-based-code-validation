import assert from 'assert';
import { normalizeOutput, compareOutputs } from './index.js';
import { prepareRunnableCode } from './services/codeHarness.js';
import { spawn } from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs';

console.log('=== RUNNING COMPREHENSIVE EXECUTION PIPELINE TESTS ===\n');

// 1. Output Normalization Tests
console.log('Test 1: Output Normalization (CRLF, literal \\n, trailing spaces)');
const raw1 = 'Line 1\\r\\nLine 2\\nLine 3   \r\n';
const norm1 = normalizeOutput(raw1);
assert.strictEqual(norm1, 'Line 1\nLine 2\nLine 3   \n');
console.log('  ✓ normalizeOutput normalized all newline variants');

// 2. Output Comparison Tests
console.log('\nTest 2: compareOutputs Policy Verification');

// 2a. Exact Match
assert.strictEqual(compareOutputs('Hello World', 'Hello World').passed, true);
console.log('  ✓ Exact match passed');

// 2b. Case-insensitive Match
assert.strictEqual(compareOutputs('hello world', 'HELLO WORLD').passed, true);
console.log('  ✓ Case-insensitive match passed');

// 2c. CRLF vs LF Match
assert.strictEqual(compareOutputs('10\r\n20\r\n30', '10\n20\n30').passed, true);
console.log('  ✓ CRLF vs LF match passed');

// 2d. Trailing Whitespace on Lines
assert.strictEqual(compareOutputs('10   \n20 \n30', '10\n20\n30').passed, true);
console.log('  ✓ Trailing line whitespace tolerance passed');

// 2e. Collapsed Whitespace
assert.strictEqual(compareOutputs('Event 10 added to queue.\nEvent 20 added to queue.', 'Event 10 added to queue. Event 20 added to queue.').passed, true);
console.log('  ✓ Whitespace collapsed match passed');

// 2f. Numeric Sequence Match (e.g. linked list output formats)
assert.strictEqual(compareOutputs('10 -> 20 -> 30 -> NULL', '10 20 30').passed, true);
assert.strictEqual(compareOutputs('[10, 20, 30]', '10 20 30').passed, true);
console.log('  ✓ Numeric sequence match (linked list / array formats) passed');

// 2g. Rejection of genuinely wrong outputs
assert.strictEqual(compareOutputs('42', '99').passed, false);
assert.strictEqual(compareOutputs('False', 'True').passed, false);
console.log('  ✓ Genuinely wrong outputs correctly rejected');

// 3. Harness Tests for C++
console.log('\nTest 3: C++ Code Harness Transformations');

// 3a. Program with existing main should NOT be modified with a second main
const cppWithMain = `#include <iostream>
using namespace std;
int main() {
    cout << "Output: 42" << endl;
    return 0;
}`;
const prepCppMain = prepareRunnableCode({ language: 'cpp', code: cppWithMain });
const mainMatches = (prepCppMain.code.match(/int\s+main/g) || []).length;
assert.strictEqual(mainMatches, 1, 'Should contain exactly 1 main function');
console.log('  ✓ C++ program with main preserved without duplicate main');

// 3b. LinkedList class without main: should auto-inject multi-method driver
const cppLinkedList = `class LinkedList {
public:
    void insert(int val) {}
    void display() {}
};`;
const prepLL = prepareRunnableCode({ language: 'cpp', code: cppLinkedList });
assert(prepLL.code.includes('sol.insert'), 'Should call insert');
assert(prepLL.code.includes('sol.display()'), 'Should call display()');
console.log('  ✓ C++ LinkedList class automatically calls insert and display()');

// 3c. TextEditor class without main: should auto-inject command dispatcher
const cppTextEditor = `class TextEditor {
public:
    void makeChange(string text) {}
    void undo() {}
    void redo() {}
    void getCurrentState() {}
};`;
const prepTE = prepareRunnableCode({ language: 'cpp', code: cppTextEditor });
assert(prepTE.code.includes('sol.makeChange'), 'Should dispatch makeChange');
assert(prepTE.code.includes('sol.undo'), 'Should dispatch undo');
assert(prepTE.code.includes('sol.getCurrentState()'), 'Should call getCurrentState');
console.log('  ✓ C++ TextEditor class dispatches actions and inspects state');

// 4. Harness Tests for Python
console.log('\nTest 4: Python Code Harness Transformations');

// 4a. Python with existing top-level execution
const pyTopLevel = `n = int(input())
print(n * 2)`;
const prepPyTop = prepareRunnableCode({ language: 'python', code: pyTopLevel });
assert(!prepPyTop.code.includes('Solution()'), 'Top-level program should not have Solution injected');
console.log('  ✓ Python script with top-level statements preserved as-is');

// 4b. Python class without main
const pyClass = `class LibraryManager:
    def __init__(self):
        self.books = []
    def add_book(self, title):
        self.books.append(title)
    def display(self):
        return ', '.join(self.books)`;
const prepPyClass = prepareRunnableCode({ language: 'python', code: pyClass });
assert(prepPyClass.code.includes('sol = LibraryManager()'), 'Should instantiate LibraryManager, not hardcoded Solution');
assert(prepPyClass.code.includes('traceback.print_exc'), 'Should print traceback on error, not pass');
console.log('  ✓ Python class dynamically instantiates correct class and preserves traceback');

// 5. Live Process Execution Tests (Using local Python runtime)
console.log('\nTest 5: Real Execution Pipeline with Python & Stdin');

async function runPythonScript(code, stdin) {
  const prepared = prepareRunnableCode({ language: 'python', code, stdin });
  const tmpId = `test_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const srcFile = path.join(os.tmpdir(), `${tmpId}.py`);
  fs.writeFileSync(srcFile, prepared.code, 'utf8');

  return new Promise((resolve) => {
    const child = spawn('python', [srcFile]);
    let stdout = '';
    let stderr = '';
    if (child.stdin) {
      if (stdin != null && String(stdin).length > 0) {
        const s = String(stdin);
        child.stdin.write(s.endsWith('\n') ? s : s + '\n');
      }
      child.stdin.end();
    }
    child.stdout.on('data', d => stdout += d.toString());
    child.stderr.on('data', d => stderr += d.toString());
    child.on('close', exitCode => {
      try { fs.unlinkSync(srcFile); } catch (e) {}
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        status: exitCode === 0 ? 'Accepted' : 'Runtime Error'
      });
    });
  });
}

// 5a. Custom Stdin Multi-line Execution
const customExec = await runPythonScript(
  'import sys\nlines = sys.stdin.read().split()\nprint("Sum:", sum(int(x) for x in lines))',
  '10\n20\n30'
);
assert.strictEqual(customExec.status, 'Accepted');
assert.strictEqual(customExec.stdout, 'Sum: 60');
console.log('  ✓ Multi-line stdin custom input correctly executed');

// 5b. Python Library Borrowing simulation (User Request 2)
const libExec = await runPythonScript(`
records = {"Alice": 5, "Bob": 0, "Charlie": 5, "Dave": 2}
counts = list(records.values())
avg = sum(counts) / len(counts)
max_borrow = max(records, key=records.get)
min_borrow = min(records, key=records.get)
zero_count = counts.count(0)
from collections import Counter
mode_count = Counter(counts).most_common(1)[0][0]
print(f"Average: {avg:.2f}")
print(f"Highest: {max_borrow} ({records[max_borrow]})")
print(f"Lowest: {min_borrow} ({records[min_borrow]})")
print(f"Zero borrowings: {zero_count}")
print(f"Mode count: {mode_count}")
`, '');
assert.strictEqual(libExec.status, 'Accepted');
assert(libExec.stdout.includes('Average: 3.00'));
assert(libExec.stdout.includes('Zero borrowings: 1'));
console.log('  ✓ Library management program executed and verified');

// 5c. Python Runtime Exception Handling
const errExec = await runPythonScript('def fail(): return 1 / 0\nfail()', '');
assert.strictEqual(errExec.status, 'Runtime Error');
assert(errExec.stderr.includes('ZeroDivisionError'));
console.log('  ✓ Runtime error caught with actual traceback without crashing');

console.log('\n=== ALL PIPELINE REGRESSION TESTS PASSED SUCCESSFULLY! ===');
process.exit(0);
