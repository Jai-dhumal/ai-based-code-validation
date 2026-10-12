// Code Tokenizer and Normalizer for multi-language plagiarism analysis

const KEYWORDS = new Set([
  'def', 'class', 'return', 'if', 'elif', 'else', 'while', 'for', 'in', 'try', 'except',
  'finally', 'with', 'as', 'import', 'from', 'pass', 'break', 'continue', 'lambda', 'yield',
  'public', 'private', 'protected', 'static', 'void', 'int', 'float', 'double', 'char',
  'boolean', 'bool', 'new', 'this', 'super', 'extends', 'implements', 'interface',
  'const', 'let', 'var', 'function', 'async', 'await', 'switch', 'case', 'default',
  'struct', 'include', 'namespace', 'using', 'std', 'vector', 'nullptr', 'NULL', 'true', 'false', 'None', 'True', 'False'
]);

export function cleanCode(code) {
  if (!code) return '';
  // Remove multi-line comments
  let cleaned = code.replace(/\/\*[\s\S]*?\*\//g, '');
  // Remove python docstrings
  cleaned = cleaned.replace(/('''[\s\S]*?'''|"""[\s\S]*?""")/g, '');
  // Remove single line comments
  cleaned = cleaned.replace(/\/\/.*$/gm, '');
  cleaned = cleaned.replace(/#.*$/gm, '');
  return cleaned;
}

export function tokenizeCode(code) {
  const cleaned = cleanCode(code);
  const lines = cleaned.split('\n');
  const tokens = [];

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex].trim();
    if (!line) continue;

    // Regex to split into word tokens, strings, numbers, operators
    const regex = /(".*?"|'.*?'|[a-zA-Z_]\w*|\d+(\.\d+)?|[+\-*/%<>=!&|^~]+|[(){}[\];,.:])/g;
    let match;

    while ((match = regex.exec(line)) !== null) {
      const raw = match[0];
      let type = 'OP';
      let value = raw;

      if (/^(".*?"|'.*?')$/.test(raw)) {
        type = 'STR';
        value = '$STR$';
      } else if (/^\d+(\.\d+)?$/.test(raw)) {
        type = 'NUM';
        value = '$NUM$';
      } else if (/^[a-zA-Z_]\w*$/.test(raw)) {
        if (KEYWORDS.has(raw)) {
          type = 'KW';
          value = raw.toLowerCase();
        } else {
          type = 'ID';
          value = '$ID$';
        }
      }

      tokens.push({
        type,
        value,
        raw,
        line: lineIndex + 1
      });
    }
  }

  return tokens;
}

// Generate k-grams from tokens
export function generateNGrams(tokens, k = 4) {
  const ngrams = [];
  if (tokens.length < k) {
    if (tokens.length > 0) {
      ngrams.push({
        text: tokens.map(t => t.value).join(''),
        startLine: tokens[0].line,
        endLine: tokens[tokens.length - 1].line
      });
    }
    return ngrams;
  }

  for (let i = 0; i <= tokens.length - k; i++) {
    const slice = tokens.slice(i, i + k);
    ngrams.push({
      text: slice.map(t => t.value).join(''),
      startLine: slice[0].line,
      endLine: slice[k - 1].line
    });
  }

  return ngrams;
}
