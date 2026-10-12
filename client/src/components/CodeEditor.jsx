import React, { useRef } from 'react';
import { Upload, FileCode, Sparkles, RefreshCw, AlertTriangle, CheckCircle, Copy } from 'lucide-react';

const SAMPLE_CODES = {
  unique: {
    label: '✨ Original Solution (Passes Tier-1 cleanly)',
    code: `class TreeNode:\n    def __init__(self, key):\n        self.key = key\n        self.left_child = None\n        self.right_child = None\n\nclass BinarySearchTree:\n    def __init__(self):\n        self.root_node = None\n\n    def insert(self, key):\n        # Custom recursive insertion\n        def _rec_insert(curr, key):\n            if not curr:\n                return TreeNode(key)\n            if key < curr.key:\n                curr.left_child = _rec_insert(curr.left_child, key)\n            elif key > curr.key:\n                curr.right_child = _rec_insert(curr.right_child, key)\n            return curr\n\n        self.root_node = _rec_insert(self.root_node, key)\n\n    def search(self, key):\n        curr = self.root_node\n        while curr and curr.key != key:\n            curr = curr.left_child if key < curr.key else curr.right_child\n        return curr is not None\n\n    def in_order(self):\n        # Stack-based traversal\n        res, stack = [], []\n        curr = self.root_node\n        while curr or stack:\n            while curr:\n                stack.append(curr)\n                curr = curr.left_child\n            curr = stack.pop()\n            res.append(curr.key)\n            curr = curr.right_child\n        return res\n`
  },
  borderline: {
    label: '⚠️ Borderline Modified Solution (Triggers Tier-2 AI Check)',
    code: `class TreeNode:\n    def __init__(self, item=0, left=None, right=None):\n        self.val = item\n        self.left = left\n        self.right = right\n\nclass BinarySearchTree:\n    def __init__(self):\n        self.root = None\n\n    def insert(self, new_val):\n        # Iterative loop modified with renamed variables\n        if self.root is None:\n            self.root = TreeNode(new_val)\n            return\n        current_node = self.root\n        while True:\n            if new_val < current_node.val:\n                if current_node.left is None:\n                    current_node.left = TreeNode(new_val)\n                    break\n                current_node = current_node.left\n            elif new_val > current_node.val:\n                if current_node.right is None:\n                    current_node.right = TreeNode(new_val)\n                    break\n                current_node = current_node.right\n            else:\n                break\n\n    def search(self, target):\n        current_node = self.root\n        while current_node is not None:\n            if current_node.val == target:\n                return True\n            elif target < current_node.val:\n                current_node = current_node.left\n            else:\n                current_node = current_node.right\n        return False\n\n    def in_order(self):\n        result_list = []\n        def traverse_tree(curr):\n            if not curr: return\n            traverse_tree(curr.left)\n            result_list.append(curr.val)\n            traverse_tree(curr.right)\n        traverse_tree(self.root)\n        return result_list\n`
  },
  copied: {
    label: '🚨 Exact Copy of Omkar\'s Code (Flagged > 80% Plagiarism)',
    code: `class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\nclass BinarySearchTree:\n    def __init__(self):\n        self.root = None\n\n    def insert(self, val):\n        if not self.root:\n            self.root = TreeNode(val)\n            return\n        curr = self.root\n        while True:\n            if val < curr.val:\n                if not curr.left:\n                    curr.left = TreeNode(val)\n                    break\n                curr = curr.left\n            elif val > curr.val:\n                if not curr.right:\n                    curr.right = TreeNode(val)\n                    break\n                curr = curr.right\n            else:\n                break\n\n    def search(self, val):\n        curr = self.root\n        while curr:\n            if curr.val == val:\n                return True\n            elif val < curr.val:\n                curr = curr.left\n            else:\n                curr = curr.right\n        return False\n\n    def in_order(self):\n        res = []\n        def traverse(node):\n            if not node: return\n            traverse(node.left)\n            res.append(node.val)\n            traverse(node.right)\n        traverse(self.root)\n        return res\n`
  }
};

export default function CodeEditor({ 
  code, 
  onChange, 
  language, 
  onLanguageChange, 
  languages = ['python', 'cpp', 'java'],
  onReset 
}) {
  const fileInputRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        onChange(content);
      }
    };
    reader.readAsText(file);
  };

  const lineCount = (code || '').split('\n').length;
  const lineNumbers = Array.from({ length: Math.max(lineCount, 12) }, (_, i) => i + 1);

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
      
      {/* Editor Header Bar */}
      <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="flex space-x-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
          </div>
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <FileCode className="w-3.5 h-3.5 text-indigo-400" />
            Solution Editor
          </span>
          <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-md px-2 py-1 focus:outline-none focus:border-indigo-500"
          >
            {languages.map((lang) => (
              <option key={lang} value={lang}>
                {lang.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        {/* Action Controls & Preset Loaders */}
        <div className="flex items-center space-x-2">
          {/* Quick presets for testing */}
          <div className="hidden sm:flex items-center space-x-1">
            <button
              onClick={() => onChange(SAMPLE_CODES.unique.code)}
              className="text-[11px] px-2.5 py-1 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-800/60 hover:bg-emerald-900/40 transition"
              title="Load original implementation"
            >
              Original Code
            </button>
            <button
              onClick={() => onChange(SAMPLE_CODES.borderline.code)}
              className="text-[11px] px-2.5 py-1 rounded bg-amber-950/40 text-amber-400 border border-amber-800/60 hover:bg-amber-900/40 transition"
              title="Load borderline renamed code to trigger Tier-2 Gemini check"
            >
              Borderline Code
            </button>
            <button
              onClick={() => onChange(SAMPLE_CODES.copied.code)}
              className="text-[11px] px-2.5 py-1 rounded bg-red-950/40 text-red-400 border border-red-800/60 hover:bg-red-900/40 transition"
              title="Load exact copied code"
            >
              Copied Code
            </button>
          </div>

          {/* Upload Button */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".py,.cpp,.c,.java,.js,.txt"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 text-xs font-medium hover:bg-indigo-600/30 transition"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload File</span>
          </button>

          {/* Reset Starter Code */}
          <button
            onClick={onReset}
            title="Reset Starter Code"
            className="p-1 rounded-lg bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-700 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="relative flex min-h-[380px] max-h-[520px] bg-slate-950/90 font-mono text-xs">
        {/* Line Numbers */}
        <div className="w-12 py-3 bg-slate-950/60 text-slate-600 select-none text-right pr-3 font-['Fira_Code',monospace] border-r border-slate-900 shrink-0">
          {lineNumbers.map((num) => (
            <div key={num} className="leading-6">
              {num}
            </div>
          ))}
        </div>

        {/* Textarea */}
        <textarea
          value={code}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste or write your implementation here..."
          spellCheck="false"
          className="w-full h-full p-3 bg-transparent text-slate-200 font-['Fira_Code',monospace] leading-6 focus:outline-none resize-none overflow-y-auto selection:bg-indigo-500/30"
          style={{ minHeight: '380px' }}
        />
      </div>

      {/* Editor Footer Status */}
      <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center space-x-3">
          <span>Lines: {lineCount}</span>
          <span>Chars: {(code || '').length}</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-slate-400">Tokens analyzed: {Math.round((code || '').split(/\s+/).length * 1.3)}</span>
        </div>
      </div>
    </div>
  );
}
