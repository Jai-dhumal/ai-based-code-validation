import React, { useState, useRef } from 'react';
import {
  Play,
  Square,
  Terminal,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Code2,
  Upload,
  RefreshCw,
  Copy,
  Trash2
} from 'lucide-react';

// ── Language Configuration ──────────────────────────────────────────────────
const LANGUAGES = {
  python: {
    label: 'Python',
    icon: '🐍',
    color: 'text-yellow-400',
    bg: 'bg-yellow-950/40 border-yellow-800/50',
    judge0Id: 71,          // Python 3.8
    extension: '.py',
    starter: `# Python Solution
def hello_world():
    print("Hello, World!")

hello_world()
`,
    monoColor: 'text-yellow-300'
  },
  cpp: {
    label: 'C++',
    icon: '⚡',
    color: 'text-blue-400',
    bg: 'bg-blue-950/40 border-blue-800/50',
    judge0Id: 54,          // C++ (GCC 9.2.0)
    extension: '.cpp',
    starter: `// C++ Solution
#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    return 0;
}
`,
    monoColor: 'text-blue-300'
  },
  c: {
    label: 'C',
    icon: '🔧',
    color: 'text-cyan-400',
    bg: 'bg-cyan-950/40 border-cyan-800/50',
    judge0Id: 50,          // C (GCC 9.2.0)
    extension: '.c',
    starter: `// C Solution
#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    return 0;
}
`,
    monoColor: 'text-cyan-300'
  },
  java: {
    label: 'Java',
    icon: '☕',
    color: 'text-orange-400',
    bg: 'bg-orange-950/40 border-orange-800/50',
    judge0Id: 62,          // Java (OpenJDK 13.0.1)
    extension: '.java',
    starter: `// Java Solution
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}
`,
    monoColor: 'text-orange-300'
  },
  javascript: {
    label: 'JavaScript',
    icon: '🌐',
    color: 'text-yellow-300',
    bg: 'bg-yellow-950/30 border-yellow-800/40',
    judge0Id: 63,          // JavaScript (Node.js 12.14.0)
    extension: '.js',
    starter: `// JavaScript Solution
function helloWorld() {
    console.log("Hello, World!");
}

helloWorld();
`,
    monoColor: 'text-yellow-200'
  },
  csharp: {
    label: 'C#',
    icon: '🎯',
    color: 'text-purple-400',
    bg: 'bg-purple-950/40 border-purple-800/50',
    judge0Id: 51,          // C# (Mono 6.6.0.161)
    extension: '.cs',
    starter: `// C# Solution
using System;

class Program {
    static void Main(string[] args) {
        Console.WriteLine("Hello, World!");
    }
}
`,
    monoColor: 'text-purple-300'
  }
};

// ── Status badge helper ─────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    Accepted:         { cls: 'bg-emerald-950/60 text-emerald-400 border-emerald-800', icon: <CheckCircle className="w-3 h-3" />, label: 'Accepted' },
    'Wrong Answer':   { cls: 'bg-red-950/60 text-red-400 border-red-800',            icon: <XCircle className="w-3 h-3" />,    label: 'Wrong Answer' },
    'Runtime Error':  { cls: 'bg-red-950/60 text-red-400 border-red-800',            icon: <XCircle className="w-3 h-3" />,    label: 'Runtime Error' },
    'Compile Error':  { cls: 'bg-amber-950/60 text-amber-400 border-amber-800',      icon: <XCircle className="w-3 h-3" />,    label: 'Compile Error' },
    'Time Limit Exceeded': { cls: 'bg-amber-950/60 text-amber-400 border-amber-800', icon: <Clock className="w-3 h-3" />,     label: 'Time Limit Exceeded' },
  };
  const info = map[status] || { cls: 'bg-slate-800 text-slate-400 border-slate-700', icon: <Terminal className="w-3 h-3" />, label: status };
  return (
    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${info.cls}`}>
      {info.icon} {info.label}
    </span>
  );
};

// ── Main Component ──────────────────────────────────────────────────────────
export default function CompilerPanel({ initialCode = '', initialLanguage = 'python', onLanguageChange }) {
  const [language, setLanguage]       = useState(initialLanguage);
  const [code, setCode]               = useState(initialCode || LANGUAGES[initialLanguage]?.starter || '');
  const [stdin, setStdin]             = useState('');
  const [output, setOutput]           = useState(null);   // { stdout, stderr, status, time, memory }
  const [isRunning, setIsRunning]     = useState(false);
  const [showStdin, setShowStdin]     = useState(false);
  const [showOutput, setShowOutput]   = useState(true);
  const [copyDone, setCopyDone]       = useState(false);
  const fileInputRef                  = useRef(null);
  const lang                          = LANGUAGES[language];

  const lineCount   = (code || '').split('\n').length;
  const lineNumbers = Array.from({ length: Math.max(lineCount, 20) }, (_, i) => i + 1);

  // ── Language switch ───────────────────────────────────────────────────────
  const handleLangChange = (newLang) => {
    setLanguage(newLang);
    setCode(LANGUAGES[newLang].starter);
    setOutput(null);
    onLanguageChange?.(newLang);
  };

  // ── File upload ───────────────────────────────────────────────────────────
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { if (typeof ev.target?.result === 'string') setCode(ev.target.result); };
    reader.readAsText(file);
  };

  // ── Copy output ───────────────────────────────────────────────────────────
  const handleCopyOutput = () => {
    const text = output?.stdout || output?.stderr || '';
    navigator.clipboard.writeText(text).then(() => {
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 1500);
    });
  };

  // ── RUN ───────────────────────────────────────────────────────────────────
  const handleRun = async () => {
    if (!code.trim()) return;
    setIsRunning(true);
    setOutput(null);
    setShowOutput(true);

    try {
      const res = await fetch('/api/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language,
          code,
          stdin: stdin || ''
        })
      });

      const contentType = res.headers.get('content-type') || '';
      let data;
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(text || `Server error (${res.status})`);
      }
      if (!res.ok) throw new Error(data.stderr || data.error || 'Compilation failed');
      setOutput(data);
    } catch (err) {
      setOutput({
        stdout: '',
        stderr: err.message,
        status: 'Runtime Error',
        time: null,
        memory: null
      });
    } finally {
      setIsRunning(false);
    }
  };

  // ── KEY HANDLER (Ctrl+Enter to run) ──────────────────────────────────────
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!isRunning) handleRun();
    }
    // Tab insertion
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = e.target;
      const start = ta.selectionStart;
      const end   = ta.selectionEnd;
      const newVal = code.substring(0, start) + '    ' + code.substring(end);
      setCode(newVal);
      setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + 4; }, 0);
    }
  };

  // ── RESET HANDLER ────────────────────────────────────────────────────────
  const handleResetCode = () => {
    try {
      if (code && code.trim() !== (lang.starter || '').trim()) {
        const confirmDiscard = window.confirm(
          "Are you sure you want to reset the editor? All unsaved code and compiler output will be discarded."
        );
        if (!confirmDiscard) return;
      }
      setCode(lang.starter || '');
      setOutput(null);
      setStdin('');
    } catch (err) {
      console.error('Compiler reset error:', err);
      alert('Unable to reset editor: ' + (err.message || 'Unknown error'));
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl flex flex-col">

      {/* ── TOP BAR ──────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">

        {/* Left: window dots + title */}
        <div className="flex items-center space-x-3">
          <div className="flex space-x-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          </div>
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <Code2 className="w-3.5 h-3.5 text-indigo-400" />
            Online Compiler &amp; IDE
          </span>
        </div>

        {/* Right: language pills + actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Language Selector */}
          {Object.entries(LANGUAGES).map(([key, info]) => (
            <button
              key={key}
              onClick={() => handleLangChange(key)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                language === key
                  ? `${info.bg} ${info.color} shadow-inner`
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
              }`}
            >
              <span>{info.icon}</span>
              <span>{info.label}</span>
            </button>
          ))}

          {/* Upload File */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".py,.cpp,.c,.java,.js,.ts,.cs,.txt"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 text-[11px] font-medium hover:bg-indigo-600/30 transition"
            title="Upload file"
          >
            <Upload className="w-3 h-3" />
            Upload
          </button>

          {/* Reset */}
          <button
            onClick={handleResetCode}
            className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-700 transition"
            title="Reset to starter code and clear output"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── EDITOR BODY ──────────────────────────────────────────────────── */}
      <div className="relative flex bg-slate-950/90 font-mono text-xs" style={{ minHeight: '320px', maxHeight: '480px' }}>
        {/* Line Numbers */}
        <div className="w-12 py-3 bg-slate-950/60 text-slate-600 select-none text-right pr-3 font-['Fira_Code',monospace] border-r border-slate-900 shrink-0 overflow-hidden">
          {lineNumbers.map((num) => (
            <div key={num} className="leading-6">{num}</div>
          ))}
        </div>

        {/* Code Textarea */}
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Write your ${lang.label} code here… (Ctrl+Enter to run)`}
          spellCheck={false}
          className="w-full p-3 bg-transparent text-slate-200 font-['Fira_Code',monospace] leading-6 focus:outline-none resize-none overflow-y-auto selection:bg-indigo-500/30"
          style={{ minHeight: '320px' }}
        />
      </div>

      {/* ── STATUS BAR ───────────────────────────────────────────────────── */}
      <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center space-x-3">
          <span>Lines: {lineCount}</span>
          <span>Chars: {(code || '').length}</span>
          <span className={`font-bold ${lang.color}`}>{lang.icon} {lang.label}</span>
        </div>
        <span className="text-slate-600">Ctrl+Enter to run</span>
      </div>

      {/* ── STDIN (collapsible) ───────────────────────────────────────────── */}
      <div className="border-t border-slate-800">
        <button
          onClick={() => setShowStdin(p => !p)}
          className="w-full px-4 py-2 bg-slate-950 text-slate-400 text-[11px] font-semibold flex items-center justify-between hover:bg-slate-900 transition"
        >
          <span className="flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5" /> Standard Input (stdin)
          </span>
          {showStdin ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        {showStdin && (
          <textarea
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
            placeholder="Optional: provide stdin input here (one value per line)…"
            rows={3}
            className="w-full px-4 py-2 bg-slate-900 text-slate-300 font-['Fira_Code',monospace] text-xs focus:outline-none resize-none border-t border-slate-800"
          />
        )}
      </div>

      {/* ── RUN BUTTON ───────────────────────────────────────────────────── */}
      <div className="px-4 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
        <span className="text-[11px] text-slate-500">
          Executes securely via sandboxed environment
        </span>
        <button
          onClick={handleRun}
          disabled={isRunning || !code.trim()}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition disabled:opacity-50 ${
            isRunning
              ? 'bg-slate-700 text-slate-300 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20'
          }`}
        >
          {isRunning
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Running…</>
            : <><Play className="w-4 h-4" /> ▶ Run Code</>
          }
        </button>
      </div>

      {/* ── OUTPUT PANEL ─────────────────────────────────────────────────── */}
      {output && (
        <div className="border-t border-slate-800">
          {/* Output header */}
          <div className="px-4 py-2 bg-slate-950 flex items-center justify-between">
            <button
              onClick={() => setShowOutput(p => !p)}
              className="flex items-center gap-2 text-[11px] font-semibold text-slate-400 hover:text-slate-200 transition"
            >
              <Terminal className="w-3.5 h-3.5" />
              Output
              {showOutput ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            <div className="flex items-center gap-3">
              {/* Meta info */}
              {output.time && (
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {output.time}s
                </span>
              )}
              {output.memory && (
                <span className="text-[11px] text-slate-500">
                  {Math.round(output.memory / 1024)} KB
                </span>
              )}
              <StatusBadge status={output.status} />
              {/* Copy */}
              <button
                onClick={handleCopyOutput}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700 text-[11px] transition"
                title="Copy output"
              >
                <Copy className="w-3 h-3" />
                {copyDone ? 'Copied!' : 'Copy'}
              </button>
              {/* Clear */}
              <button
                onClick={() => setOutput(null)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-red-400 border border-slate-700 transition"
                title="Clear output"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Output body */}
          {showOutput && (
            <div className="bg-slate-950 px-4 pb-4">
              {output.stdout && (
                <pre className="text-emerald-400 font-['Fira_Code',monospace] text-xs leading-6 whitespace-pre-wrap max-h-64 overflow-y-auto">
                  {output.stdout}
                </pre>
              )}
              {output.stderr && (
                <pre className="text-red-400 font-['Fira_Code',monospace] text-xs leading-6 whitespace-pre-wrap max-h-48 overflow-y-auto mt-2">
                  {output.stderr}
                </pre>
              )}
              {!output.stdout && !output.stderr && (
                <p className="text-slate-500 text-xs italic">No output produced.</p>
              )}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
