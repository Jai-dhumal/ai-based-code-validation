// Execution Driver Generator for Function-Based (LeetCode Style) Assignments
// Automatically generates language-specific execution harnesses around student business logic

/**
 * Checks if code already contains an entry point (main function)
 */
export function hasMainFunction(language, code) {
  if (!code) return false;
  const lang = (language || '').toLowerCase();
  if (lang === 'c' || lang === 'cpp') {
    return /\bint\s+main\s*\(/.test(code) || /\bvoid\s+main\s*\(/.test(code);
  }
  if (lang === 'java') {
    return /\bstatic\s+void\s+main\s*\(/.test(code);
  }
  if (lang === 'python') {
    return /if\s+__name__\s*==\s*['"]__main__['"]/.test(code);
  }
  return false;
}

/**
 * Wraps student solution with execution driver if in function-based mode
 */
export function wrapCodeWithDriver({ language, code, functionConfig, inputFormat = '' }) {
  if (!functionConfig || !functionConfig.functionName) {
    return code; // Nothing to wrap
  }

  const lang = (language || '').toLowerCase();

  // If student already provided their own main function, do not double-wrap
  if (hasMainFunction(lang, code)) {
    return code;
  }

  const funcName = functionConfig.functionName.trim();
  const className = (functionConfig.className || 'Solution').trim();
  const params = Array.isArray(functionConfig.parameters) ? functionConfig.parameters : [];
  const returnType = (functionConfig.returnType || 'void').trim();

  switch (lang) {
    case 'python':
      return generatePythonDriver(code, funcName, className, params);
    case 'javascript':
      return generateJavaScriptDriver(code, funcName, className, params);
    case 'cpp':
      return generateCppDriver(code, funcName, className, params, returnType);
    case 'c':
      return generateCDriver(code, funcName, params, returnType);
    case 'java':
      return generateJavaDriver(code, funcName, className, params, returnType);
    default:
      return code;
  }
}

/**
 * PYTHON DRIVER
 */
function generatePythonDriver(studentCode, funcName, className, params) {
  const driver = `

# --- AUTOMATIC EXECUTION HARNESS (DO NOT EDIT) ---
if __name__ == "__main__":
    import sys
    import json

    raw_input_data = sys.stdin.read().strip()
    lines = [line.strip() for line in raw_input_data.split('\\n') if line.strip()]

    def parse_arg(raw):
        if raw is None: return None
        raw = raw.strip()
        try:
            return json.loads(raw)
        except Exception:
            # Fallback for plain space-separated numbers
            parts = raw.split()
            if len(parts) > 1 and all(p.lstrip('-').replace('.', '', 1).isdigit() for p in parts):
                return [float(p) if '.' in p else int(p) for p in parts]
            if raw.lstrip('-').isdigit():
                return int(raw)
            try:
                return float(raw)
            except ValueError:
                return raw

    parsed_args = []
    if len(lines) == 1 and ${params.length} > 1:
        # Single line containing multiple space-separated arguments
        tokens = lines[0].split()
        if len(tokens) == ${params.length}:
            parsed_args = [parse_arg(t) for t in tokens]
        else:
            parsed_args = [parse_arg(lines[0])]
    else:
        for line in lines:
            parsed_args.append(parse_arg(line))

    # Pad or slice to match expected parameter count
    while len(parsed_args) < ${params.length}:
        parsed_args.append(None)
    args_to_pass = parsed_args[:${params.length}]

    # Locate function in global scope or Solution class
    callable_func = None
    if '${className}' in globals() and hasattr(globals()['${className}'], '${funcName}'):
        instance = globals()['${className}']()
        callable_func = getattr(instance, '${funcName}')
    elif '${funcName}' in globals():
        callable_func = globals()['${funcName}']

    if callable_func is None:
        raise AttributeError(f"Function '${funcName}' not found in submitted code.")

    result = callable_func(*args_to_pass)

    if result is not None:
        if isinstance(result, bool):
            print("true" if result else "false")
        elif isinstance(result, (list, dict)):
            print(json.dumps(result, separators=(',', ':')))
        elif isinstance(result, float):
            print(f"{result:.6f}".rstrip('0').rstrip('.'))
        else:
            print(result)
`;
  return studentCode + driver;
}

/**
 * JAVASCRIPT DRIVER
 */
function generateJavaScriptDriver(studentCode, funcName, className, params) {
  const driver = `

// --- AUTOMATIC EXECUTION HARNESS (DO NOT EDIT) ---
(function() {
    const fs = require('fs');
    const input = fs.readFileSync(0, 'utf-8').trim();
    if (!input && ${params.length} > 0) return;

    const lines = input.split('\\n').map(l => l.trim()).filter(Boolean);

    function parseArg(raw) {
        if (!raw) return raw;
        try {
            return JSON.parse(raw);
        } catch (e) {
            const parts = raw.split(/\\s+/);
            if (parts.length > 1 && parts.every(p => !isNaN(p))) {
                return parts.map(Number);
            }
            if (!isNaN(raw)) return Number(raw);
            return raw;
        }
    }

    let parsedArgs = [];
    if (lines.length === 1 && ${params.length} > 1) {
        const tokens = lines[0].split(/\\s+/);
        if (tokens.length === ${params.length}) {
            parsedArgs = tokens.map(parseArg);
        } else {
            parsedArgs = [parseArg(lines[0])];
        }
    } else {
        parsedArgs = lines.map(parseArg);
    }

    while (parsedArgs.length < ${params.length}) parsedArgs.push(null);
    parsedArgs = parsedArgs.slice(0, ${params.length});

    let targetFn = null;
    if (typeof ${funcName} === 'function') {
        targetFn = ${funcName};
    } else if (typeof ${className} === 'function') {
        try {
            const inst = new ${className}();
            if (typeof inst.${funcName} === 'function') {
                targetFn = inst.${funcName}.bind(inst);
            }
        } catch (e) {}
    }

    if (!targetFn) {
        throw new Error("Function '${funcName}' not found in submitted code.");
    }

    const res = targetFn(...parsedArgs);
    if (res !== undefined) {
        if (typeof res === 'object') {
            console.log(JSON.stringify(res));
        } else {
            console.log(res);
        }
    }
})();
`;
  return studentCode + driver;
}

/**
 * C++ DRIVER
 */
function generateCppDriver(studentCode, funcName, className, params, returnType) {
  const isVector = returnType.includes('vector');
  const isBool = returnType === 'bool';

  // Build parameter reading snippet
  let readInputs = '';
  let callArgs = [];
  params.forEach((p, idx) => {
    const varName = p.name || `arg${idx}`;
    const pType = p.type || 'int';
    callArgs.push(varName);

    if (pType.includes('vector') || pType.includes('[]')) {
      readInputs += `
    int n_${idx};
    if (!(cin >> n_${idx})) return 0;
    vector<int> ${varName}(n_${idx});
    for (int i = 0; i < n_${idx}; ++i) cin >> ${varName}[i];
`;
    } else if (pType.includes('string')) {
      readInputs += `
    string ${varName};
    cin >> ${varName};
`;
    } else if (pType.includes('double') || pType.includes('float')) {
      readInputs += `
    double ${varName};
    cin >> ${varName};
`;
    } else {
      readInputs += `
    long long ${varName};
    cin >> ${varName};
`;
    }
  });

  let outputSnippet = `cout << ans << "\\n";`;
  if (isVector) {
    outputSnippet = `
    cout << "[";
    for (size_t i = 0; i < ans.size(); ++i) {
        cout << ans[i] << (i + 1 < ans.size() ? "," : "");
    }
    cout << "]\\n";`;
  } else if (isBool) {
    outputSnippet = `cout << (ans ? "true" : "false") << "\\n";`;
  }

  const driver = `

// --- AUTOMATIC EXECUTION HARNESS ---
#include <iostream>
#include <vector>
#include <string>
#include <sstream>

using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    ${readInputs}

    #ifdef CLASS_BASED
    ${className} solver;
    auto ans = solver.${funcName}(${callArgs.join(', ')});
    #else
    // Check if Solution class exists
    struct HasSolutionClass {
        template<typename T> static auto test(int) -> decltype(declval<T>().${funcName}(${callArgs.map(() => 'declval<int>()').join(', ')}), true_type());
        template<typename> static false_type test(...);
    };
    ${className} solver;
    auto ans = solver.${funcName}(${callArgs.join(', ')});
    #endif

    ${outputSnippet}

    return 0;
}
`;
  return studentCode + driver;
}

/**
 * C DRIVER
 */
function generateCDriver(studentCode, funcName, params, returnType) {
  let readInputs = '';
  let callArgs = [];
  params.forEach((p, idx) => {
    const varName = p.name || `arg${idx}`;
    callArgs.push(varName);
    readInputs += `
    long long ${varName};
    if (scanf("%lld", &${varName}) != 1) return 0;
`;
  });

  const driver = `

// --- AUTOMATIC EXECUTION HARNESS ---
#include <stdio.h>
#include <stdlib.h>

int main() {
    ${readInputs}
    long long ans = (long long)${funcName}(${callArgs.join(', ')});
    printf("%lld\\n", ans);
    return 0;
}
`;
  return studentCode + driver;
}

/**
 * JAVA DRIVER
 */
function generateJavaDriver(studentCode, funcName, className, params, returnType) {
  let readInputs = '';
  let callArgs = [];

  params.forEach((p, idx) => {
    const varName = p.name || `arg${idx}`;
    const pType = p.type || 'int';
    callArgs.push(varName);

    if (pType.includes('[]')) {
      readInputs += `
        if (!sc.hasNext()) return;
        String line_${idx} = sc.nextLine().trim();
        while (line_${idx}.isEmpty() && sc.hasNext()) line_${idx} = sc.nextLine().trim();
        line_${idx} = line_${idx}.replace("[", "").replace("]", "").replace(",", " ").trim();
        String[] parts_${idx} = line_${idx}.split("\\\\s+");
        int[] ${varName} = new int[parts_${idx}.length];
        for (int i = 0; i < parts_${idx}.length; i++) {
            if (!parts_${idx}[i].isEmpty()) ${varName}[i] = Integer.parseInt(parts_${idx}[i]);
        }
`;
    } else if (pType.includes('String')) {
      readInputs += `
        if (!sc.hasNext()) return;
        String ${varName} = sc.next();
`;
    } else {
      readInputs += `
        if (!sc.hasNextLong()) return;
        long ${varName} = sc.nextLong();
`;
    }
  });

  let outputSnippet = `System.out.println(ans);`;
  if (returnType.includes('[]')) {
    outputSnippet = `System.out.println(java.util.Arrays.toString(ans).replace(" ", ""));`;
  } else if (returnType.toLowerCase() === 'boolean') {
    outputSnippet = `System.out.println(ans ? "true" : "false");`;
  }

  const driver = `

// --- AUTOMATIC EXECUTION HARNESS (DO NOT EDIT) ---
class MainDriver {
    public static void main(String[] args) {
        java.util.Scanner sc = new java.util.Scanner(System.in);
        ${className} solver = new ${className}();
        ${readInputs}
        Object ans = solver.${funcName}(${callArgs.join(', ')});
        ${outputSnippet}
    }
}
`;
  return studentCode + driver;
}

/**
 * Strips synthetic driver comments and code for clean plagiarism comparison
 */
export function stripExecutionDriver(code) {
  if (!code) return '';
  const marker = '// --- AUTOMATIC EXECUTION HARNESS';
  const pyMarker = '# --- AUTOMATIC EXECUTION HARNESS';
  let idx = code.indexOf(marker);
  if (idx !== -1) return code.substring(0, idx).trim();
  idx = code.indexOf(pyMarker);
  if (idx !== -1) return code.substring(0, idx).trim();
  return code;
}
