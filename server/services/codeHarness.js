/**
 * LeetCode-Style Multi-Language Execution Harness
 * Automatically equips student submissions (full programs, LeetCode classes, function-only definitions,
 * or raw statement blocks) with missing standard imports, class structures, and driver main runners.
 */

export function prepareRunnableCode({ language = 'python', code = '', stdin = '' }) {
  const lang = (language || 'python').toLowerCase();
  let raw = (code || '').trim();

  // Strip redundant outer braces if user pasted wrapped blocks like {{ ... }} without class/main
  while (
    raw.startsWith('{') && 
    raw.endsWith('}') && 
    !raw.includes('class ') && 
    !raw.includes('int main') && 
    !raw.includes('public static void main')
  ) {
    raw = raw.substring(1, raw.length - 1).trim();
  }

  // ==========================================
  // 1. JAVA (OpenJDK)
  // ==========================================
  if (lang === 'java') {
    let hasClass = /class\s+([A-Za-z0-9_]+)/.test(raw);
    const hasMain = /public\s+static\s+void\s+main/.test(raw);

    // If method only (no class wrapper, no main): wrap in public class Solution
    if (!hasClass && !hasMain) {
      const isMethodOnly = /(?:public|private|protected)?\s*(?:static)?\s*[a-zA-Z0-9_<>\[\]]+\s+[a-zA-Z0-9_]+\s*\([^)]*\)\s*\{/.test(raw);
      if (isMethodOnly) {
        raw = `public class Solution {\n    ${raw}\n}`;
        hasClass = true;
      }
    }

    // Case 1: Full standalone Java program (Class + main)
    if (hasClass && hasMain) {
      const match = raw.match(/class\s+([A-Za-z0-9_]+)/);
      const cName = match ? match[1] : 'Solution';
      let full = raw;
      if (!full.includes('import java.util.')) {
        full = 'import java.util.*;\nimport java.io.*;\nimport java.lang.*;\n' + full;
      }
      return { code: full, className: cName };
    }

    // Case 2: LeetCode Class with methods (No main)
    if (hasClass && !hasMain) {
      const match = raw.match(/class\s+([A-Za-z0-9_]+)/);
      const cName = match ? match[1] : 'Solution';
      
      const allMethods = [...raw.matchAll(/(?:public|private|protected)?\s*(?:static)?\s*([a-zA-Z0-9_<>\[\]]+)\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/g)];
      const targetMethod = allMethods.find(m => m[2] !== cName && m[2] !== 'main');

      const returnType = targetMethod ? targetMethod[1].trim() : 'void';
      const methodName = targetMethod ? targetMethod[2].trim() : null;
      const params = targetMethod ? targetMethod[3].trim() : '';

      const lastBrace = raw.lastIndexOf('}');
      if (lastBrace !== -1 && methodName) {
        const isStatic = targetMethod[0].includes('static');
        const invoker = isStatic ? `${cName}.${methodName}` : `new ${cName}().${methodName}`;

        let driverCall = '';
        if (params.includes('int') || params.includes('Integer')) {
          driverCall = `
          if (sc.hasNextInt()) {
              int arg = sc.nextInt();
              ${returnType === 'void' 
                ? `${invoker}(arg);` 
                : returnType === 'boolean' || returnType === 'Boolean'
                ? `boolean res = ${invoker}(arg);\n              System.out.println(res ? "even" : "odd");`
                : `Object res = ${invoker}(arg);\n              System.out.println(res);`
              }
          } else {
              ${returnType === 'void' ? '' : `System.out.println(${invoker}(4));`}
          }`;
        } else if (params.includes('String')) {
          driverCall = `
          if (sc.hasNext()) {
              String arg = sc.next();
              ${returnType === 'void' ? `${invoker}(arg);` : `Object res = ${invoker}(arg);\n              System.out.println(res);`}
          }`;
        } else {
          driverCall = `${returnType === 'void' ? `${invoker}();` : `Object res = ${invoker}();\n          System.out.println(res);`}`;
        }

        const driver = `
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        Scanner sobj = sc;
        Scanner scanner = sc;
        Scanner in = sc;
        try {
            ${driverCall}
        } catch(Exception e) {}
    }
`;
        const full = 'import java.util.*;\nimport java.io.*;\nimport java.lang.*;\n' + raw.slice(0, lastBrace) + driver + raw.slice(lastBrace);
        return { code: full, className: cName };
      }
    }

    // Case 3: Raw statements (e.g. from user screenshot: n = sobj.nextInt(); if (n % 2 == 0) ...)
    const wrapped = `import java.util.*;
import java.io.*;
import java.lang.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sobj = new Scanner(System.in);
        Scanner sc = sobj;
        Scanner scanner = sobj;
        Scanner in = sobj;
        int n = 0;
        int a = 0, b = 0, c = 0;
        try {
            ${raw}
        } catch (Exception e) {}
    }
}`;
    return { code: wrapped, className: 'Solution' };
  }

  // ==========================================
  // 2. C++ (G++ 9.2)
  // ==========================================
  if (lang === 'cpp' || lang === 'c++') {
    let full = raw;
    if (!full.includes('#include <iostream>')) {
      full = `#include <iostream>\n#include <vector>\n#include <string>\n#include <algorithm>\n#include <cmath>\n#include <queue>\n#include <stack>\n#include <map>\n#include <set>\nusing namespace std;\n\n` + full;
    } else if (!full.includes('using namespace std')) {
      full = full.replace('#include <iostream>', '#include <iostream>\nusing namespace std;');
    }

    const hasMain = /int\s+main\s*\(/.test(full) || /void\s+main\s*\(/.test(full);
    if (!hasMain) {
      const classMatch = full.match(/class\s+([A-Za-z0-9_]+)\s*\{[\s\S]*?([a-zA-Z0-9_<>]+)\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/);
      const funcMatch = full.match(/(?:int|bool|void|string|double|auto)\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/);

      if (classMatch && classMatch[3] !== 'main') {
        const cName = classMatch[1];
        const mName = classMatch[3];
        const isBool = classMatch[2].includes('bool');
        const driver = `
int main() {
    ${cName} sol;
    int n;
    if (cin >> n) {
        auto res = sol.${mName}(n);
        ${isBool ? 'cout << (res ? "even" : "odd") << endl;' : 'cout << res << endl;'}
    }
    return 0;
}
`;
        full = full + '\n' + driver;
      } else if (funcMatch && funcMatch[1] !== 'main') {
        const fName = funcMatch[1];
        const isBool = funcMatch[0].includes('bool');
        const driver = `
int main() {
    int n;
    if (cin >> n) {
        auto res = ${fName}(n);
        ${isBool ? 'cout << (res ? "even" : "odd") << endl;' : 'cout << res << endl;'}
    } else {
        auto res = ${fName}(4);
        ${isBool ? 'cout << (res ? "even" : "odd") << endl;' : 'cout << res << endl;'}
    }
    return 0;
}
`;
        full = full + '\n' + driver;
      } else {
        // Raw statements
        full = full + `\nint main() {\n    int n = 0, a = 0, b = 0;\n    ${raw}\n    return 0;\n}`;
      }
    }
    return { code: full };
  }

  // ==========================================
  // 3. C (GCC)
  // ==========================================
  if (lang === 'c') {
    let full = raw;
    if (!full.includes('#include <stdio.h>')) {
      full = `#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n#include <stdbool.h>\n\n` + full;
    }
    const hasMain = /int\s+main\s*\(/.test(full) || /void\s+main\s*\(/.test(full);
    if (!hasMain) {
      full = full + `\nint main() {\n    int n = 0, a = 0, b = 0;\n    ${raw}\n    return 0;\n}`;
    }
    return { code: full };
  }

  // ==========================================
  // 4. PYTHON (3.12)
  // ==========================================
  if (lang === 'python' || lang === 'py') {
    let full = raw;
    const hasFunc = /def\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/.test(full);
    const hasClass = /class\s+([a-zA-Z0-9_]+)/.test(full);
    
    // Check if there are top-level execution calls outside defs
    const lines = full.split('\n');
    const hasTopLevelCall = lines.some(l => {
      const trimmed = l.trim();
      return trimmed && 
        !trimmed.startsWith('#') && 
        !trimmed.startsWith('def ') && 
        !trimmed.startsWith('class ') && 
        !trimmed.startsWith('import ') && 
        !trimmed.startsWith('from ') && 
        !trimmed.startsWith('@') &&
        !l.startsWith(' ') && 
        !l.startsWith('\t');
    });

    if (hasFunc && !hasTopLevelCall) {
      const allDefs = [...full.matchAll(/def\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/g)];
      const targetDef = allDefs.find(m => m[1] !== '__init__') || allDefs[0];
      const fName = targetDef ? targetDef[1] : 'solve';

      const driver = `
if __name__ == '__main__':
    import sys
    data = sys.stdin.read().split()
    args = [int(x) if x.lstrip('-').isdigit() else x for x in data]
    try:
        ${hasClass 
          ? `sol = Solution()\n        if hasattr(sol, '${fName}'):\n            res = sol.${fName}(*args) if args else sol.${fName}()\n            if isinstance(res, bool):\n                print("even" if res else "odd")\n            elif res is not None:\n                print(res)`
          : `if '${fName}' in globals():\n            res = globals()['${fName}'](*args) if args else globals()['${fName}']()\n            if isinstance(res, bool):\n                print("even" if res else "odd")\n            elif res is not None:\n                print(res)`
        }
    except Exception as e:
        pass
`;
      full = full + '\n' + driver;
    }
    return { code: full };
  }

  // ==========================================
  // 5. JAVASCRIPT (Node.js)
  // ==========================================
  if (lang === 'javascript' || lang === 'js') {
    let full = raw;
    const hasFunc = /(?:function\s+([a-zA-Z0-9_]+)|const\s+([a-zA-Z0-9_]+)\s*=\s*(?:function|\([^)]*\)\s*=>))/.test(full);
    const hasCall = /console\.log|process\.stdout/.test(full);

    if (hasFunc && !hasCall) {
      const match = full.match(/(?:function\s+([a-zA-Z0-9_]+)|const\s+([a-zA-Z0-9_]+)\s*=\s*(?:function|\([^)]*\)\s*=>))/);
      const fName = match[1] || match[2];
      const driver = `
const fs = require('fs');
try {
    const rawInput = fs.readFileSync(0, 'utf-8').trim();
    const args = rawInput ? rawInput.split(/\\s+/).map(x => !isNaN(x) ? Number(x) : x) : [];
    if (typeof ${fName} === 'function') {
        const res = ${fName}(...args);
        if (typeof res === 'boolean') {
            console.log(res ? 'even' : 'odd');
        } else if (res !== undefined) {
            console.log(res);
        }
    }
} catch (e) {}
`;
      full = full + '\n' + driver;
    }
    return { code: full };
  }

  return { code: raw };
}
