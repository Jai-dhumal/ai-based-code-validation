import assert from 'assert';
import { executeCodeInternal, normalizeOutput, compareOutputs } from './index.js';

console.log('================================================================');
console.log('🧪 LOCAL SUITE: COMPREHENSIVE 5-LANGUAGE COMPILER & RUNTIME TEST');
console.log('================================================================\n');

const testCasesByLanguage = {
  // ── 1. PYTHON (3.12) ────────────────────────────────────────────────────────
  python: [
    {
      name: 'Python: Hello World',
      code: 'print("Hello, Antigravity!")',
      stdin: '',
      expectedOutput: 'Hello, Antigravity!',
      expectStatus: 'Accepted'
    },
    {
      name: 'Python: Basic Arithmetic',
      code: 'a = 15\nb = 27\nprint(a + b)',
      stdin: '',
      expectedOutput: '42',
      expectStatus: 'Accepted'
    },
    {
      name: 'Python: Single & Multiple Input (stdin)',
      code: 'import sys\nvals = sys.stdin.read().split()\nprint("Sum:", sum(int(x) for x in vals))',
      stdin: '10\n20\n30',
      expectedOutput: 'Sum: 60',
      expectStatus: 'Accepted'
    },
    {
      name: 'Python: Conditionals & Loops & Collections',
      code: `
nums = [1, 2, 3, 4, 5, 6]
evens = [x for x in nums if x % 2 == 0]
print("Evens:", evens)
`,
      stdin: '',
      expectedOutput: 'Evens: [2, 4, 6]',
      expectStatus: 'Accepted'
    },
    {
      name: 'Python: Functions & Multiline Output',
      code: `
def greet(name):
    print(f"Line 1: Welcome, {name}")
    print(f"Line 2: System Ready")

greet("Alice")
`,
      stdin: '',
      expectedOutput: 'Line 1: Welcome, Alice\nLine 2: System Ready',
      expectStatus: 'Accepted'
    },
    {
      name: 'Python: Runtime Error (ZeroDivisionError)',
      code: 'print(100 / 0)',
      stdin: '',
      expectedOutput: '',
      expectStatus: 'Runtime Error'
    }
  ],

  // ── 2. JAVASCRIPT (Node.js) ─────────────────────────────────────────────────
  javascript: [
    {
      name: 'JavaScript: Hello World',
      code: 'console.log("Hello, JavaScript!");',
      stdin: '',
      expectedOutput: 'Hello, JavaScript!',
      expectStatus: 'Accepted'
    },
    {
      name: 'JavaScript: Basic Arithmetic',
      code: 'const a = 14, b = 28; console.log(a + b);',
      stdin: '',
      expectedOutput: '42',
      expectStatus: 'Accepted'
    },
    {
      name: 'JavaScript: User Input (stdin)',
      code: `
const fs = require('fs');
const tokens = fs.readFileSync(0, 'utf8').trim().split(/\\s+/);
console.log("Tokens:", tokens.join('-'));
`,
      stdin: 'apple banana cherry',
      expectedOutput: 'Tokens: apple-banana-cherry',
      expectStatus: 'Accepted'
    },
    {
      name: 'JavaScript: Loops & Collections',
      code: `
const arr = [10, 20, 30];
const mapped = arr.map(x => x * 2);
console.log(mapped.join(' '));
`,
      stdin: '',
      expectedOutput: '20 40 60',
      expectStatus: 'Accepted'
    },
    {
      name: 'JavaScript: Runtime Error (TypeError)',
      code: 'const obj = null; obj.nonExistentMethod();',
      stdin: '',
      expectedOutput: '',
      expectStatus: 'Runtime Error'
    }
  ],

  // ── 3. C (MinGW / GCC) ──────────────────────────────────────────────────────
  c: [
    {
      name: 'C: Hello World',
      code: `
#include <stdio.h>
int main() {
    printf("Hello from C\\n");
    return 0;
}
`,
      stdin: '',
      expectedOutput: 'Hello from C',
      expectStatus: 'Accepted'
    },
    {
      name: 'C: Basic Arithmetic & Loops',
      code: `
#include <stdio.h>
int main() {
    int sum = 0;
    for (int i = 1; i <= 5; i++) {
        sum += i;
    }
    printf("Sum is %d\\n", sum);
    return 0;
}
`,
      stdin: '',
      expectedOutput: 'Sum is 15',
      expectStatus: 'Accepted'
    },
    {
      name: 'C: User Input (scanf stdin)',
      code: `
#include <stdio.h>
int main() {
    int a, b;
    if (scanf("%d %d", &a, &b) == 2) {
        printf("Result: %d\\n", a * b);
    }
    return 0;
}
`,
      stdin: '6 7',
      expectedOutput: 'Result: 42',
      expectStatus: 'Accepted'
    },
    {
      name: 'C: Compilation Error',
      code: `
#include <stdio.h>
int main() {
    this_is_a_syntax_error_without_type;
    return 0;
}
`,
      stdin: '',
      expectedOutput: '',
      expectStatus: 'Compile Error'
    }
  ],

  // ── 4. C++ (MinGW / G++) ────────────────────────────────────────────────────
  cpp: [
    {
      name: 'C++: Hello World',
      code: `
#include <iostream>
using namespace std;
int main() {
    cout << "Hello from C++" << endl;
    return 0;
}
`,
      stdin: '',
      expectedOutput: 'Hello from C++',
      expectStatus: 'Accepted'
    },
    {
      name: 'C++: User Input & Vectors (cin stdin)',
      code: `
#include <iostream>
#include <vector>
#include <numeric>
using namespace std;
int main() {
    int n, val;
    cin >> n;
    int total = 0;
    for (int i = 0; i < n; i++) {
        cin >> val;
        total += val;
    }
    cout << "Total: " << total << endl;
    return 0;
}
`,
      stdin: '3\n10 20 30',
      expectedOutput: 'Total: 60',
      expectStatus: 'Accepted'
    },
    {
      name: 'C++: Class with Methods & Harness Dispatch',
      code: `
#include <iostream>
using namespace std;
class Calculator {
public:
    void compute(int a, int b) {
        cout << "Sum: " << (a + b) << endl;
    }
};
int main() {
    Calculator c;
    c.compute(18, 24);
    return 0;
}
`,
      stdin: '',
      expectedOutput: 'Sum: 42',
      expectStatus: 'Accepted'
    },
    {
      name: 'C++: Compilation Error',
      code: `
#include <iostream>
int main() {
    cout << undefined_variable << endl;
    return 0;
}
`,
      stdin: '',
      expectedOutput: '',
      expectStatus: 'Compile Error'
    }
  ],

  // ── 5. JAVA (OpenJDK 17 / 27) ───────────────────────────────────────────────
  java: [
    {
      name: 'Java: Hello World',
      code: `
public class Solution {
    public static void main(String[] args) {
        System.out.println("Hello from Java!");
    }
}
`,
      stdin: '',
      expectedOutput: 'Hello from Java!',
      expectStatus: 'Accepted'
    },
    {
      name: 'Java: Basic Arithmetic & Scanner Stdin',
      code: `
import java.util.Scanner;
public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int a = sc.nextInt();
        int b = sc.nextInt();
        System.out.println("Product: " + (a * b));
    }
}
`,
      stdin: '6 7',
      expectedOutput: 'Product: 42',
      expectStatus: 'Accepted'
    },
    {
      name: 'Java: Loops, Collections, and Multiline Output',
      code: `
import java.util.ArrayList;
import java.util.List;
public class Solution {
    public static void main(String[] args) {
        List<String> items = new ArrayList<>();
        items.add("Item A");
        items.add("Item B");
        items.add("Item C");
        for (String s : items) {
            System.out.println(s);
        }
    }
}
`,
      stdin: '',
      expectedOutput: 'Item A\nItem B\nItem C',
      expectStatus: 'Accepted'
    },
    {
      name: 'Java: Compilation Error (javac diagnostic)',
      code: `
public class Solution {
    public static void main(String[] args) {
        int x = "incompatible_string_type";
    }
}
`,
      stdin: '',
      expectedOutput: '',
      expectStatus: 'Compile Error'
    },
    {
      name: 'Java: Runtime Error (ArithmeticException)',
      code: `
public class Solution {
    public static void main(String[] args) {
        int bad = 10 / 0;
        System.out.println(bad);
    }
}
`,
      stdin: '',
      expectedOutput: '',
      expectStatus: 'Runtime Error'
    }
  ]
};

async function runAllTests() {
  let passedCount = 0;
  let totalCount = 0;
  const resultsByLang = {};

  for (const [lang, tests] of Object.entries(testCasesByLanguage)) {
    console.log(`\n───────────────────────────────────────────────────`);
    console.log(`🔷 Testing Language: ${lang.toUpperCase()}`);
    console.log(`───────────────────────────────────────────────────`);
    resultsByLang[lang] = { passed: 0, total: tests.length, tests: [] };

    for (const test of tests) {
      totalCount++;
      const result = await executeCodeInternal({
        language: lang,
        code: test.code,
        stdin: test.stdin
      });

      let pass = false;
      let failureReason = '';

      if (test.expectStatus === 'Accepted') {
        const comp = compareOutputs(result.stdout, test.expectedOutput);
        if (result.status === 'Accepted' && comp.passed) {
          pass = true;
        } else {
          failureReason = `Expected status Accepted with output '${test.expectedOutput}', but got status '${result.status}' with output '${result.stdout}' (stderr: ${result.stderr})`;
        }
      } else if (test.expectStatus === 'Compile Error') {
        if (result.status === 'Compile Error') {
          pass = true;
        } else {
          failureReason = `Expected status Compile Error, got '${result.status}' (stdout: ${result.stdout})`;
        }
      } else if (test.expectStatus === 'Runtime Error') {
        if (result.status === 'Runtime Error') {
          pass = true;
        } else {
          failureReason = `Expected status Runtime Error, got '${result.status}' (stdout: ${result.stdout})`;
        }
      }

      if (pass) {
        passedCount++;
        resultsByLang[lang].passed++;
        console.log(`  ✅ PASS: ${test.name} (${result.time}s)`);
      } else {
        console.error(`  ❌ FAIL: ${test.name}`);
        console.error(`     Reason: ${failureReason}`);
      }
      resultsByLang[lang].tests.push({ name: test.name, pass, reason: failureReason });
    }
  }

  console.log('\n================================================================');
  console.log(`📊 FINAL LOCAL COMPILER TEST RESULTS: ${passedCount} / ${totalCount} PASSED`);
  console.log('================================================================');
  for (const [lang, stats] of Object.entries(resultsByLang)) {
    console.log(`  • ${lang.toUpperCase().padEnd(12)}: ${stats.passed}/${stats.total} PASS`);
  }

  if (passedCount === totalCount) {
    console.log('\n🎉 ALL 5 LANGUAGE RUNTIMES AND LOCAL COMPILER TESTS PASSED (100%)');
    process.exit(0);
  } else {
    console.error('\n❌ SOME LOCAL COMPILER TESTS FAILED');
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
