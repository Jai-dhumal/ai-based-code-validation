import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  BrainCircuit, 
  FileCode, 
  ArrowRight, 
  Sparkles, 
  AlertCircle,
  AlertTriangle, 
  XCircle,
  Award,
  Upload,
  RefreshCw,
  HelpCircle,
  GitBranch,
  Lock,
  Unlock,
  BookOpen,
  Code2,
  Check,
  RotateCcw,
  Gauge,
  Layers,
  ChevronRight,
  ChevronDown,
  Maximize2,
  Minimize2,
  Play,
  Terminal
} from 'lucide-react';
import confetti from 'canvas-confetti';
import Editor from '@monaco-editor/react';
import QuizModal from '../components/QuizModal.jsx';
import SubmissionReceiptModal from '../components/SubmissionReceiptModal.jsx';
import Tier2Modal from '../components/Tier2Modal.jsx';
import CompilerPanel from '../components/CompilerPanel.jsx';

const getMonacoLanguage = (lang) => {
  if (lang === 'cpp' || lang === 'c++') return 'cpp';
  if (lang === 'c') return 'c';
  if (lang === 'python' || lang === 'py') return 'python';
  if (lang === 'java') return 'java';
  if (lang === 'javascript' || lang === 'js') return 'javascript';
  return 'python';
};

const cleanInputDisplay = (val) => {
  if (val == null || val === '') return '(None)';
  const s = String(val);
  return s
    .replace(/\\r\\n/g, ' ')
    .replace(/\\n/g, ' ')
    .replace(/\r\n/g, ' ')
    .replace(/\n/g, ' ')
    .trim() || '(None)';
};

// Sample codes for quick testing
const DEMO_PRESETS = {
  original: {
    label: '✨ Load Original Solution',
    code: `class TreeNode:\n    def __init__(self, key):\n        self.key = key\n        self.left_child = None\n        self.right_child = None\n\nclass BinarySearchTree:\n    def __init__(self):\n        self.root_node = None\n\n    def insert(self, key):\n        def _rec_insert(curr, key):\n            if not curr:\n                return TreeNode(key)\n            if key < curr.key:\n                curr.left_child = _rec_insert(curr.left_child, key)\n            elif key > curr.key:\n                curr.right_child = _rec_insert(curr.right_child, key)\n            return curr\n        self.root_node = _rec_insert(self.root_node, key)\n\n    def search(self, key):\n        curr = self.root_node\n        while curr and curr.key != key:\n            curr = curr.left_child if key < curr.key else curr.right_child\n        return curr is not None\n\n    def in_order(self):\n        res, stack = [], []\n        curr = self.root_node\n        while curr or stack:\n            while curr:\n                stack.append(curr)\n                curr = curr.left_child\n            curr = stack.pop()\n            res.append(curr.key)\n            curr = curr.right_child\n        return res\n`
  },
  borderline: {
    label: '⚠️ Load Modified Solution (Triggers AI Check)',
    code: `class TreeNode:\n    def __init__(self, item=0, left=None, right=None):\n        self.val = item\n        self.left = left\n        self.right = right\n\nclass BinarySearchTree:\n    def __init__(self):\n        self.root = None\n\n    def insert(self, new_val):\n        if self.root is None:\n            self.root = TreeNode(new_val)\n            return\n        current_node = self.root\n        while True:\n            if new_val < current_node.val:\n                if current_node.left is None:\n                    current_node.left = TreeNode(new_val)\n                    break\n                current_node = current_node.left\n            elif new_val > current_node.val:\n                if current_node.right is None:\n                    current_node.right = TreeNode(new_val)\n                    break\n                current_node = current_node.right\n            else:\n                break\n\n    def search(self, target):\n        current_node = self.root\n        while current_node is not None:\n            if current_node.val == target:\n                return True\n            elif target < current_node.val:\n                current_node = current_node.left\n            else:\n                current_node = current_node.right\n        return False\n\n    def in_order(self):\n        result_list = []\n        def traverse_tree(curr):\n            if not curr: return\n            traverse_tree(curr.left)\n            result_list.append(curr.val)\n            traverse_tree(curr.right)\n        traverse_tree(self.root)\n        return result_list\n`
  },
  copied: {
    label: '🚨 Load Copied Solution (Omkar\'s Code)',
    code: `class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\nclass BinarySearchTree:\n    def __init__(self):\n        self.root = None\n\n    def insert(self, val):\n        if not self.root:\n            self.root = TreeNode(val)\n            return\n        curr = self.root\n        while True:\n            if val < curr.val:\n                if not curr.left:\n                    curr.left = TreeNode(val)\n                    break\n                curr = curr.left\n            elif val > curr.val:\n                if not curr.right:\n                    curr.right = TreeNode(val)\n                    break\n                curr = curr.right\n            else:\n                break\n\n    def search(self, val):\n        curr = self.root\n        while curr:\n            if curr.val == val:\n                return True\n            elif val < curr.val:\n                curr = curr.left\n            else:\n                curr = curr.right\n        return False\n\n    def in_order(self):\n        res = []\n        def traverse(node):\n            if not node: return\n            traverse(node.left)\n            res.append(node.val)\n            traverse(node.right)\n        traverse(self.root)\n        return res\n`
  }
};

const STARTER_CODES = {
  python: `# Python Solution
print("Jay Ganesh")
`,
  cpp: `// C++ Solution
#include <iostream>
using namespace std;

int main() {
    cout << "Jay Ganesh from C++" << endl;
    return 0;
}
`,
  c: `// C Solution
#include <stdio.h>

int main() {
    printf("Jay Ganesh from C\\n");
    return 0;
}
`,
  java: `// Java Solution
public class Solution {
    public static void main(String[] args) {
        System.out.println("Jay Ganesh from Java");
    }
}
`,
  javascript: `// JavaScript Solution
console.log("Jay Ganesh from JS");
`
};

const MULTI_LANG_PRESETS = {
  python: DEMO_PRESETS,
  cpp: {
    original: {
      label: '✨ Original C++',
      code: `// C++ Binary Search Implementation\n#include <iostream>\n#include <vector>\nusing namespace std;\n\nint binarySearch(const vector<int>& arr, int target) {\n    int left = 0, right = arr.size() - 1;\n    while (left <= right) {\n        int mid = left + (right - left) / 2;\n        if (arr[mid] == target) return mid;\n        if (arr[mid] < target) left = mid + 1;\n        else right = mid - 1;\n    }\n    return -1;\n}\n\nint main() {\n    vector<int> arr = {2, 5, 8, 12, 16, 23, 38, 56, 72, 91};\n    int result = binarySearch(arr, 23);\n    cout << "Element found at index: " << result << endl;\n    return 0;\n}\n`
    },
    borderline: {
      label: '⚠️ Modified C++',
      code: `// C++ Binary Search - Renamed Variables\n#include <iostream>\n#include <vector>\nusing namespace std;\n\nint findVal(const vector<int>& nums, int key) {\n    int low = 0, high = nums.size() - 1;\n    while (low <= high) {\n        int m = low + (high - low) / 2;\n        if (nums[m] == key) return m;\n        if (nums[m] < key) low = m + 1;\n        else high = m - 1;\n    }\n    return -1;\n}\n\nint main() {\n    vector<int> data = {2, 5, 8, 12, 16, 23, 38, 56, 72, 91};\n    int idx = findVal(data, 23);\n    cout << "Index: " << idx << endl;\n    return 0;\n}\n`
    },
    copied: {
      label: '🚨 Copied C++',
      code: `// C++ Binary Search Implementation\n#include <iostream>\n#include <vector>\nusing namespace std;\n\nint binarySearch(const vector<int>& arr, int target) {\n    int left = 0, right = arr.size() - 1;\n    while (left <= right) {\n        int mid = left + (right - left) / 2;\n        if (arr[mid] == target) return mid;\n        if (arr[mid] < target) left = mid + 1;\n        else right = mid - 1;\n    }\n    return -1;\n}\n\nint main() {\n    vector<int> arr = {2, 5, 8, 12, 16, 23, 38, 56, 72, 91};\n    int result = binarySearch(arr, 23);\n    cout << "Element found at index: " << result << endl;\n    return 0;\n}\n`
    }
  },
  c: {
    original: {
      label: '✨ Original C',
      code: `// C Binary Search Implementation\n#include <stdio.h>\n\nint binarySearch(int arr[], int n, int target) {\n    int left = 0, right = n - 1;\n    while (left <= right) {\n        int mid = left + (right - left) / 2;\n        if (arr[mid] == target) return mid;\n        if (arr[mid] < target) left = mid + 1;\n        else right = mid - 1;\n    }\n    return -1;\n}\n\nint main() {\n    int arr[] = {2, 5, 8, 12, 16, 23, 38, 56, 72, 91};\n    int n = sizeof(arr) / sizeof(arr[0]);\n    int res = binarySearch(arr, n, 23);\n    printf("Element found at index: %d\\n", res);\n    return 0;\n}\n`
    },
    borderline: {
      label: '⚠️ Modified C',
      code: `// C Binary Search - Renamed\n#include <stdio.h>\n\nint searchItem(int list[], int len, int val) {\n    int lo = 0, hi = len - 1;\n    while (lo <= hi) {\n        int m = lo + (hi - lo) / 2;\n        if (list[m] == val) return m;\n        if (list[m] < val) lo = m + 1;\n        else hi = m - 1;\n    }\n    return -1;\n}\n\nint main() {\n    int list[] = {2, 5, 8, 12, 16, 23, 38, 56, 72, 91};\n    int ans = searchItem(list, 10, 23);\n    printf("Index: %d\\n", ans);\n    return 0;\n}\n`
    },
    copied: {
      label: '🚨 Copied C',
      code: `// C Binary Search Implementation\n#include <stdio.h>\n\nint binarySearch(int arr[], int n, int target) {\n    int left = 0, right = n - 1;\n    while (left <= right) {\n        int mid = left + (right - left) / 2;\n        if (arr[mid] == target) return mid;\n        if (arr[mid] < target) left = mid + 1;\n        else right = mid - 1;\n    }\n    return -1;\n}\n\nint main() {\n    int arr[] = {2, 5, 8, 12, 16, 23, 38, 56, 72, 91};\n    int n = sizeof(arr) / sizeof(arr[0]);\n    int res = binarySearch(arr, n, 23);\n    printf("Element found at index: %d\\n", res);\n    return 0;\n}\n`
    }
  },
  java: {
    original: {
      label: '✨ Original Java',
      code: `// Java Binary Search\npublic class Solution {\n    public static int search(int[] arr, int target) {\n        int left = 0, right = arr.length - 1;\n        while (left <= right) {\n            int mid = left + (right - left) / 2;\n            if (arr[mid] == target) return mid;\n            if (arr[mid] < target) left = mid + 1;\n            else right = mid - 1;\n        }\n        return -1;\n    }\n\n    public static void main(String[] args) {\n        int[] arr = {2, 5, 8, 12, 16, 23, 38, 56, 72, 91};\n        int idx = search(arr, 23);\n        System.out.println("Element found at index: " + idx);\n    }\n}\n`
    },
    borderline: {
      label: '⚠️ Modified Java',
      code: `// Java Binary Search - Renamed\npublic class Solution {\n    public static int find(int[] nums, int key) {\n        int lo = 0, hi = nums.length - 1;\n        while (lo <= hi) {\n            int m = lo + (hi - lo) / 2;\n            if (nums[m] == key) return m;\n            if (nums[m] < key) lo = m + 1;\n            else hi = m - 1;\n        }\n        return -1;\n    }\n\n    public static void main(String[] args) {\n        int[] nums = {2, 5, 8, 12, 16, 23, 38, 56, 72, 91};\n        int ans = find(nums, 23);\n        System.out.println("Index: " + ans);\n    }\n}\n`
    },
    copied: {
      label: '🚨 Copied Java',
      code: `// Java Binary Search\npublic class Solution {\n    public static int search(int[] arr, int target) {\n        int left = 0, right = arr.length - 1;\n        while (left <= right) {\n            int mid = left + (right - left) / 2;\n            if (arr[mid] == target) return mid;\n            if (arr[mid] < target) left = mid + 1;\n            else right = mid - 1;\n        }\n        return -1;\n    }\n\n    public static void main(String[] args) {\n        int[] arr = {2, 5, 8, 12, 16, 23, 38, 56, 72, 91};\n        int idx = search(arr, 23);\n        System.out.println("Element found at index: " + idx);\n    }\n}\n`
    }
  },
  javascript: {
    original: {
      label: '✨ Original JS',
      code: `// JavaScript Solution\nfunction binarySearch(arr, target) {\n    let left = 0, right = arr.length - 1;\n    while (left <= right) {\n        const mid = Math.floor((left + right) / 2);\n        if (arr[mid] === target) return mid;\n        if (arr[mid] < target) left = mid + 1;\n        else right = mid - 1;\n    }\n    return -1;\n}\n\nconst arr = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91];\nconsole.log("Element found at index:", binarySearch(arr, 23));\n`
    },
    borderline: {
      label: '⚠️ Modified JS',
      code: `// JavaScript Solution - Renamed\nconst findTarget = (list, key) => {\n    let lo = 0, hi = list.length - 1;\n    while (lo <= hi) {\n        const m = Math.floor((lo + hi) / 2);\n        if (list[m] === key) return m;\n        if (list[m] < key) lo = m + 1;\n        else hi = m - 1;\n    }\n    return -1;\n};\n\nconst nums = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91];\nconsole.log("Index:", findTarget(nums, 23));\n`
    },
    copied: {
      label: '🚨 Copied JS',
      code: `// JavaScript Solution\nfunction binarySearch(arr, target) {\n    let left = 0, right = arr.length - 1;\n    while (left <= right) {\n        const mid = Math.floor((left + right) / 2);\n        if (arr[mid] === target) return mid;\n        if (arr[mid] < target) left = mid + 1;\n        else right = mid - 1;\n    }\n    return -1;\n}\n\nconst arr = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91];\nconsole.log("Element found at index:", binarySearch(arr, 23));\n`
    }
  }
};

/**
 * Standard Auth Headers Builder
 */
const getAuthHeaders = (includeContentType = false) => {
  const token = localStorage.getItem('ai_validate_token') || '';
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
};

/**
 * Client-side Jaccard similarity fallback calculation
 */
const calculateJaccardSimilarity = (strA, strB) => {
  if (!strA || !strB) return 0;
  const tokenize = (text) => {
    const tokens = text.toLowerCase().match(/\w+|[^\s\w]/g) || [];
    return new Set(tokens);
  };
  const setA = tokenize(strA);
  const setB = tokenize(strB);
  if (setA.size === 0 && setB.size === 0) return 100;
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union > 0 ? Math.round((intersection / union) * 100) : 0;
};

export default function StudentPortal({ 
  currentUser, 
  assignments = [], 
  selectedAssignment, 
  onSelectAssignment,
  submissions = [], 
  onRefreshSubmissions 
}) {
  const [code, setCode] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('python');
  
  // Plagiarism & AI check state
  const [isCheckingPlag, setIsCheckingPlag] = useState(false);
  const [plagResult, setPlagResult] = useState(null);
  const [aiReport, setAiReport] = useState(null);
  const [isTier2ModalOpen, setIsTier2ModalOpen] = useState(false);

  // Quiz Request State
  const [quizRequestStatus, setQuizRequestStatus] = useState('none');
  const [quizRequestDetails, setQuizRequestDetails] = useState(null);
  const [isRequestingAccess, setIsRequestingAccess] = useState(false);

  // Quiz state
  const [quizData, setQuizData] = useState(null);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [quizResult, setQuizResult] = useState(null);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
  const [quizAttempt, setQuizAttempt] = useState(1);

  // Final submission state
  const [isFinalSubmitting, setIsFinalSubmitting] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Available Quizzes Section State
  const [quizList, setQuizList] = useState({
    available: [],
    completed: [],
    locked: []
  });
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(false);
  const [activeQuizFilterTab, setActiveQuizFilterTab] = useState('all'); // 'all' | 'available' | 'completed' | 'locked'

  // Fresh Assignment Details State (Ensures clean per-assignment data isolation)
  const [assignmentDetails, setAssignmentDetails] = useState(null);
  const [isLoadingAssignmentDetails, setIsLoadingAssignmentDetails] = useState(false);
  const [assignmentDetailsError, setAssignmentDetailsError] = useState(null);

  // Viva Code Editor State
  const [vivaCode, setVivaCode] = useState('');
  const [vivaLanguage, setVivaLanguage] = useState('python');
  const [isSubmittingViva, setIsSubmittingViva] = useState(false);
  const [vivaResult, setVivaResult] = useState(null);

  // Real-Time Pre-Submission Plagiarism / Authenticity State
  const [realtimeScore, setRealtimeScore] = useState(null);
  const [realtimeStatus, setRealtimeStatus] = useState(null); // 'ORIGINAL' | 'BORDERLINE' | 'COPIED' | null
  const [realtimeVerdict, setRealtimeVerdict] = useState('');
  const [isLiveAnalyzing, setIsLiveAnalyzing] = useState(false);

  // LeetCode-Style Resizable & Fullscreen IDE State
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showConsole, setShowConsole] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState(null);
  const [testcaseResults, setTestcaseResults] = useState(null);
  const [activeRunningCase, setActiveRunningCase] = useState(null);
  const [isRunningCode, setIsRunningCode] = useState(false);
  const [stdinInput, setStdinInput] = useState('');
  const [consoleTab, setConsoleTab] = useState('testcases'); // 'testcases' | 'stdin' | 'output'

  // Editor and Font References
  const editorRef = useRef(null);
  const monacoRef = useRef(null);

  // File Upload & Starter Template State
  const fileInputRef = useRef(null);
  const [isPresetsDropdownOpen, setIsPresetsDropdownOpen] = useState(false);

  // Handle local code file upload (.py, .cpp, .c, .java, .js, .txt)
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Auto-detect language from extension
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'py') setSelectedLanguage('python');
    else if (ext === 'cpp' || ext === 'cc' || ext === 'cxx') setSelectedLanguage('cpp');
    else if (ext === 'c') setSelectedLanguage('c');
    else if (ext === 'java') setSelectedLanguage('java');
    else if (ext === 'js' || ext === 'jsx') setSelectedLanguage('javascript');

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setCode(content);
        // Clear previous analysis so new check can be run
        setPlagResult(null);
        setAiReport(null);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Reset editor to official faculty starter template and clear compiler/test outputs
  const handleResetStarterCode = () => {
    try {
      const activeAsg = assignmentDetails || selectedAssignment;
      const template = activeAsg?.starterCode?.[selectedLanguage] || 
        STARTER_CODES[selectedLanguage] || 
        MULTI_LANG_PRESETS[selectedLanguage]?.starter?.code || 
        '# Write your solution here\n';

      if (code && code.trim() !== template.trim()) {
        const confirmDiscard = window.confirm(
          "Are you sure you want to reset the editor? All unsaved code edits, console outputs, and test results will be discarded."
        );
        if (!confirmDiscard) return;
      }

      setCode(template);
      setConsoleOutput(null);
      setTestcaseResults(null);
      setActiveRunningCase(null);
      setStdinInput('');
      setPlagResult(null);
      setAiReport(null);
      setRealtimeScore(null);
      setRealtimeStatus(null);
      setRealtimeVerdict('');
    } catch (err) {
      console.error('Reset editor error:', err);
      alert('Unable to reset editor: ' + (err.message || 'Unknown error occurred'));
    }
  };

  // Debounced Live Code Authenticity Detection as student writes code
  useEffect(() => {
    if (!code || code.trim().length < 35) {
      setRealtimeScore(null);
      setRealtimeStatus(null);
      setRealtimeVerdict('');
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsLiveAnalyzing(true);
        const res = await fetch('/api/validate/tier1', {
          method: 'POST',
          headers: getAuthHeaders(true),
          body: JSON.stringify({
            code,
            assignmentId: selectedAssignment?.id || 'all',
            studentId: currentUser?.id
          })
        });

        if (res.ok) {
          const data = await res.json();
          setRealtimeScore(data.score);
          if (data.score < 25) {
            setRealtimeStatus('ORIGINAL');
            setRealtimeVerdict('Original / Authentic Code');
          } else if (data.isShortCode) {
            setRealtimeStatus('STANDARD_SHORT');
            setRealtimeVerdict('Standard Short Code Implementation');
          } else if (data.score < 60) {
            setRealtimeStatus('BORDERLINE');
            setRealtimeVerdict('Borderline Similarity Detected');
          } else {
            setRealtimeStatus('COPIED');
            setRealtimeVerdict('Copied / High Plagiarism Detected');
          }
        }
      } catch (err) {
        console.warn('Real-time analysis error:', err);
      } finally {
        setIsLiveAnalyzing(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [code, selectedAssignment?.id, currentUser?.id]);

  // Synchronize language when selected assignment changes
  useEffect(() => {
    if (selectedAssignment?.languages?.length > 0) {
      setSelectedLanguage(selectedAssignment.languages[0]);
      setVivaLanguage(selectedAssignment.languages[0]);
    }
  }, [selectedAssignment]);

  // Fetch fresh Assignment Details whenever selectedAssignment ID changes
  useEffect(() => {
    if (!selectedAssignment?.id) {
      setAssignmentDetails(null);
      return;
    }
    let isCancelled = false;
    setIsLoadingAssignmentDetails(true);
    setAssignmentDetails(null);
    setAssignmentDetailsError(null);

    fetch(`/api/assignments/${selectedAssignment.id}`, {
      headers: getAuthHeaders()
    })
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to fetch assignment details (Status ${res.status})`);
        }
        return res.json();
      })
      .then((data) => {
        if (!isCancelled) {
          setAssignmentDetails(data);
          setIsLoadingAssignmentDetails(false);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.warn('Assignment details fetch error:', err);
          setAssignmentDetailsError(err.message);
          setIsLoadingAssignmentDetails(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedAssignment?.id]);

  const activeAssignment = assignmentDetails || selectedAssignment;

  // Load existing submission or starter code
  useEffect(() => {
    if (activeAssignment) {
      setCode(activeAssignment.starterCode?.[selectedLanguage] || '# Write your solution here\n');
      setPlagResult(null);
      setAiReport(null);
      setQuizData(null);
      setQuizResult(null);
      setReceipt(null);
      setQuizRequestStatus('none');
      setQuizRequestDetails(null);
      setVivaResult(null);
      setVivaCode('');
      setTestcaseResults(null);
      setConsoleOutput(null);

      // Fetch quiz request status with Authorization header
      if (activeAssignment.id && currentUser?.id) {
        fetch(`/api/quiz-requests/status/${activeAssignment.id}/${currentUser.id}`, {
          headers: getAuthHeaders()
        })
          .then(res => {
            if (!res.ok) throw new Error('Status fetch failed');
            return res.json();
          })
          .then(data => {
            if (data && data.hasRequest) {
              setQuizRequestStatus(data.status);
              setQuizRequestDetails(data);
            }
          })
          .catch(err => console.warn('Status check warning:', err));
      }

      // Check if already submitted
      const existing = submissions.find(
        s => s.assignmentId === activeAssignment.id && s.studentId === currentUser?.id
      );
      if (existing) {
        setCode(existing.code);
        if (existing.language) {
          setVivaLanguage(existing.language);
        }
        setPlagResult({
          score: existing.tier1Score,
          verdict: existing.tier1Verdict,
          status: existing.tier1Score < 35 ? 'CLEAN' : existing.tier1Score <= 75 ? 'BORDERLINE' : 'HIGH_SIMILARITY'
        });
        setQuizResult({
          score: existing.quizScore,
          passed: existing.quizPassed ?? (existing.quizScore >= (activeAssignment.minQuizScore || 70)),
          minRequiredScore: activeAssignment.minQuizScore || 70,
          correctCount: existing.correctAnswers || 7,
          totalQuestions: existing.totalQuestions || 10
        });
      }
    }
  }, [activeAssignment?.id, currentUser?.id, submissions, selectedLanguage]);

  // Fetch Available Quizzes
  const fetchStudentQuizzes = async () => {
    setIsLoadingQuizzes(true);
    try {
      const res = await fetch('/api/student/quizzes', {
        headers: getAuthHeaders()
      });

      if (res.ok) {
        const data = await res.json();
        if (data && (Array.isArray(data.available) || Array.isArray(data.completed) || Array.isArray(data.locked))) {
          setQuizList({
            available: data.available || [],
            completed: data.completed || [],
            locked: data.locked || []
          });
          return;
        } else if (Array.isArray(data)) {
          // Categorize array if flat
          const avail = data.filter(q => q.status === 'available' || q.status === 'approved');
          const comp = data.filter(q => q.status === 'completed' || q.status === 'passed');
          const lock = data.filter(q => q.status === 'locked' || q.status === 'pending' || q.status === 'none');
          setQuizList({ available: avail, completed: comp, locked: lock });
          return;
        }
      }
    } catch (err) {
      console.warn('API /api/student/quizzes not returned, building list from state:', err);
    } finally {
      setIsLoadingQuizzes(false);
    }

    // Fallback: intelligently synthesize categorized quizzes from assignments and submissions
    const avail = [];
    const comp = [];
    const lock = [];

    (assignments || []).forEach(asg => {
      const sub = (submissions || []).find(
        s => s.assignmentId === asg.id && s.studentId === currentUser?.id
      );

      if (sub) {
        comp.push({
          id: asg.id,
          assignmentId: asg.id,
          title: asg.title,
          subject: asg.subject || 'Computer Engineering',
          status: 'completed',
          score: sub.quizScore ?? sub.score ?? 85,
          passed: sub.quizPassed ?? true
        });
      } else if (selectedAssignment?.id === asg.id && quizRequestStatus === 'approved') {
        avail.push({
          id: asg.id,
          assignmentId: asg.id,
          title: asg.title,
          subject: asg.subject || 'Computer Engineering',
          status: 'available',
          minQuizScore: asg.minQuizScore || 70
        });
      } else {
        lock.push({
          id: asg.id,
          assignmentId: asg.id,
          title: asg.title,
          subject: asg.subject || 'Computer Engineering',
          status: 'locked',
          minQuizScore: asg.minQuizScore || 70
        });
      }
    });

    setQuizList({
      available: avail,
      completed: comp,
      locked: lock
    });
  };

  useEffect(() => {
    fetchStudentQuizzes();
  }, [assignments, submissions, currentUser?.id, quizRequestStatus, selectedAssignment?.id]);

  if (!selectedAssignment) return null;

  // Existing submission check for current assignment
  const currentSubmission = (submissions || []).find(
    s => s.assignmentId === selectedAssignment.id && s.studentId === currentUser?.id
  );
  const hasSubmittedCurrentAssignment = Boolean(currentSubmission);
  // Helper to determine assignment testcases (Strictly assignment-specific, never generic fallbacks)
  const getTestCases = () => {
    if (Array.isArray(activeAssignment?.testcases) && activeAssignment.testcases.length > 0) {
      return activeAssignment.testcases;
    }
    if (Array.isArray(activeAssignment?.examples) && activeAssignment.examples.length > 0) {
      return activeAssignment.examples.map(ex => ({
        input: ex.input || '',
        expectedOutput: ex.expectedOutput || '',
        explanation: ex.explanation || ''
      }));
    }
    return [];
  };

  // RUN & COMPILE CODE (Automatic Testcases Execution)
  const handleRunCode = async (customStdin = null, singleCaseIdx = null) => {
    // Sanitize parameters: prevent React SyntheticEvent from being treated as stdin string
    if (typeof customStdin !== 'string') {
      customStdin = null;
    }

    if (!code || !code.trim()) {
      alert('Please enter code before running.');
      return;
    }

    setIsRunningCode(true);
    setShowConsole(true);

    // Case A: Custom input execution from stdin tab or explicit customStdin
    if (singleCaseIdx === null && (customStdin !== null || consoleTab === 'stdin')) {
      const activeStdin = customStdin !== null ? customStdin : (stdinInput || '');
      setConsoleTab('output');
      setConsoleOutput(null);

      try {
        const res = await fetch('/api/compile', {
          method: 'POST',
          headers: getAuthHeaders(true),
          body: JSON.stringify({
            language: selectedLanguage,
            code,
            stdin: activeStdin
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
        if (!res.ok) throw new Error(data.stderr || data.error || 'Execution failed');
        setConsoleOutput(data);
      } catch (err) {
        setConsoleOutput({
          stdout: '',
          stderr: err.message,
          status: 'Runtime Error',
          time: '0.00'
        });
      } finally {
        setIsRunningCode(false);
      }
      return;
    }

    // Case B: Run a single specific testcase
    if (singleCaseIdx !== null) {
      setActiveRunningCase(singleCaseIdx);
      try {
        const cases = getTestCases();
        const targetCase = cases[singleCaseIdx] || { input: customStdin || '', expectedOutput: '(Any)' };
        const res = await fetch('/api/compile/testcases', {
          method: 'POST',
          headers: getAuthHeaders(true),
          body: JSON.stringify({
            language: selectedLanguage,
            code,
            testcases: [targetCase]
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

        const singleResult = data.results && data.results[0] ? data.results[0] : {
          caseIndex: singleCaseIdx + 1,
          input: targetCase.input || '',
          expectedOutput: targetCase.expectedOutput || '',
          actualOutput: '',
          stderr: data.compileError || data.error || 'Failed',
          passed: false,
          status: data.hasCompileError ? 'Compile Error' : 'Runtime Error',
          time: '0.00'
        };

        setTestcaseResults(prev => {
          const existing = prev?.results ? [...prev.results] : cases.map((c, i) => ({
            caseIndex: i + 1,
            input: c.input,
            expectedOutput: c.expectedOutput,
            actualOutput: '',
            stderr: '',
            passed: false,
            status: 'Pending'
          }));
          existing[singleCaseIdx] = {
            ...singleResult,
            caseIndex: singleCaseIdx + 1
          };
          const passedCount = existing.filter(r => r.passed).length;
          return {
            allPassed: passedCount === existing.length,
            hasCompileError: data.hasCompileError || false,
            compileError: data.compileError || '',
            total: existing.length,
            passedCount,
            results: existing
          };
        });
      } catch (err) {
        console.error('Single testcase execution error:', err);
      } finally {
        setIsRunningCode(false);
        setActiveRunningCase(null);
      }
      return;
    }

    // Case C: Main "Run & Compile Code" button — Automatically executes all testcases!
    const testcases = getTestCases();

    if (testcases.length === 0) {
      // If assignment has no predefined testcases, execute program directly and display stdout/stderr in Output tab
      setConsoleTab('output');
      setConsoleOutput(null);
      try {
        const res = await fetch('/api/compile', {
          method: 'POST',
          headers: getAuthHeaders(true),
          body: JSON.stringify({
            language: selectedLanguage,
            code,
            stdin: stdinInput || ''
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
        setConsoleOutput(data);
      } catch (err) {
        setConsoleOutput({
          status: 'Execution Error',
          stderr: err.message,
          stdout: '',
          time: '0.00'
        });
      } finally {
        setIsRunningCode(false);
      }
      return;
    }

    setConsoleTab('testcases');

    try {
      const res = await fetch('/api/compile/testcases', {
        method: 'POST',
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          language: selectedLanguage,
          code,
          testcases
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
      if (!res.ok) throw new Error(data.error || 'Execution failed');
      setTestcaseResults(data);
      if (data.hasCompileError) {
        setConsoleOutput({
          stdout: '',
          stderr: data.compileError,
          status: 'Compile Error',
          time: '0.00'
        });
      }
    } catch (err) {
      console.error('Testcases execution failed:', err);
      setTestcaseResults({
        allPassed: false,
        hasCompileError: true,
        compileError: err.message,
        total: testcases.length,
        passedCount: 0,
        results: testcases.map((tc, i) => ({
          caseIndex: i + 1,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          actualOutput: '',
          stderr: err.message,
          passed: false,
          status: 'Runtime Error'
        }))
      });
    } finally {
      setIsRunningCode(false);
    }
  };

  // STEP 1: Check Plagiarism
  const handleCheckPlagiarism = async () => {
    if (!code || code.trim().length < 10) {
      alert('Please write or paste your code before checking.');
      return;
    }

    setIsCheckingPlag(true);
    setPlagResult(null);
    setAiReport(null);

    try {
      const targetAssignmentId = activeAssignment?.id || selectedAssignment?.id || 'all';

      // 1. Run Tier-1 Plagiarism Check
      const res = await fetch('/api/validate/tier1', {
        method: 'POST',
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          code,
          assignmentId: targetAssignmentId,
          studentId: currentUser?.id,
          language: selectedLanguage,
          stdin: stdinInput || ''
        })
      });

      const t1Data = await res.json();
      if (!res.ok) {
        alert(t1Data.error || `Validation failed with status ${res.status}`);
        return;
      }
      setPlagResult(t1Data);

      // 2. If borderline, automatically trigger Tier-2 Gemini check
      if (t1Data.requiresTier2) {
        const t2Res = await fetch('/api/validate/tier2', {
          method: 'POST',
          headers: getAuthHeaders(true),
          body: JSON.stringify({
            code,
            assignmentId: targetAssignmentId,
            referenceCode: t1Data.mostSimilarSubmission?.code,
            studentName: currentUser?.name
          })
        });
        if (t2Res.ok) {
          const t2Data = await t2Res.json();
          setAiReport(t2Data);
        }
      }
    } catch (err) {
      alert('Error checking plagiarism: ' + err.message);
    } finally {
      setIsCheckingPlag(false);
    }
  };

  // Step 2: Request Quiz Access
  const handleRequestQuizAccess = async () => {
    setIsRequestingAccess(true);
    try {
      const targetAssignment = activeAssignment || selectedAssignment;
      const res = await fetch('/api/quiz-requests', {
        method: 'POST',
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          studentId: currentUser?.id,
          studentName: currentUser?.name,
          assignmentId: targetAssignment?.id || 'asg_3',
          assignmentTitle: targetAssignment?.title || 'Assignment',
          teacherId: targetAssignment?.teacherId || 'usr_teacher_1',
          tier1Score: plagResult?.score || 0,
          tier1Verdict: plagResult?.verdict || 'Clean',
          tier2Score: aiReport?.semanticSimilarityScore || null,
          tier2Verdict: aiReport?.verdict || null,
          code,
          language: selectedLanguage
        })
      });
      const data = await res.json();
      if (res.ok) {
        setQuizRequestStatus('pending');
        setQuizRequestDetails(data);
        fetchStudentQuizzes();
      } else {
        alert(data.error || 'Failed to submit quiz request');
      }
    } catch (err) {
      console.error('Request quiz access error:', err);
      alert('Network error while requesting quiz access');
    } finally {
      setIsRequestingAccess(false);
    }
  };

  const checkApprovalStatus = async () => {
    try {
      const res = await fetch(`/api/quiz-requests/status/${selectedAssignment.id}/${currentUser?.id}`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.hasRequest) {
        setQuizRequestStatus(data.status);
        setQuizRequestDetails(data);
        fetchStudentQuizzes();
      }
    } catch (err) {
      console.error('Status check error:', err);
    }
  };

  // STEP 2: Start Quiz
  const handleStartQuiz = async (overrideAttempt) => {
    setIsGeneratingQuiz(true);
    const currentAttempt = overrideAttempt !== undefined ? overrideAttempt : quizAttempt;
    try {
      const res = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          code,
          assignmentId: selectedAssignment.id,
          language: selectedLanguage,
          studentId: currentUser?.id,
          attempt: currentAttempt
        })
      });

      const data = await res.json();
      setQuizData(data);
      setQuizResult(null);
      setIsQuizModalOpen(true);
    } catch (err) {
      alert('Error generating quiz: ' + err.message);
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  // Submit Quiz Answers
  const handleSubmitQuiz = async (answers) => {
    setIsSubmittingQuiz(true);
    try {
      const res = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          quizKey: quizData?.quizKey,
          answers,
          assignmentId: selectedAssignment.id,
          code
        })
      });

      const data = await res.json();
      setQuizResult(data);

      if (data?.passed) {
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 }
          });
        } catch (e) {}
      }
    } catch (err) {
      alert('Error submitting quiz: ' + err.message);
    } finally {
      setIsSubmittingQuiz(false);
    }
  };

  // STEP 3: Final Submit Assignment
  const handleFinalSubmit = async () => {
    if (!quizResult?.passed) {
      alert('You must pass the quiz first!');
      return;
    }

    setIsFinalSubmitting(true);
    try {
      const res = await fetch('/api/submissions/final', {
        method: 'POST',
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          assignmentId: selectedAssignment.id,
          studentId: currentUser?.id,
          code,
          language: selectedLanguage,
          tier1Result: plagResult,
          tier2Result: aiReport,
          quizResult
        })
      });

      const data = await res.json();
      if (data.success) {
        setReceipt(data.receipt);
        setIsReceiptModalOpen(true);
        setIsQuizModalOpen(false);
        if (onRefreshSubmissions) {
          onRefreshSubmissions();
        }
        fetchStudentQuizzes();

        try {
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.55 }
          });
        } catch (e) {}
      } else {
        alert(data.error || 'Submission failed');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setIsFinalSubmitting(false);
    }
  };

  // Viva Code Submit
  const handleSubmitViva = async () => {
    if (!vivaCode || vivaCode.trim().length < 10) {
      alert('Please enter your viva code implementation from memory.');
      return;
    }

    setIsSubmittingViva(true);
    setVivaResult(null);

    const originalSubmittedCode = currentSubmission?.code || code;

    try {
      const res = await fetch('/api/viva/submit', {
        method: 'POST',
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          assignmentId: selectedAssignment.id,
          studentId: currentUser?.id,
          code: vivaCode,
          language: vivaLanguage
        })
      });

      if (res.ok) {
        const data = await res.json();
        const score = Number(data.similarity ?? data.jaccardSimilarity ?? data.score ?? 0);
        setVivaResult({
          similarity: Math.round(score),
          message: data.message || 'Viva comparison verified successfully.'
        });

        if (score >= 80) {
          try {
            confetti({
              particleCount: 75,
              spread: 60,
              origin: { y: 0.7 }
            });
          } catch (e) {}
        }
      } else {
        // Fallback to client-side Jaccard similarity
        const score = calculateJaccardSimilarity(originalSubmittedCode, vivaCode);
        setVivaResult({
          similarity: score,
          message: 'Comparison computed via Jaccard similarity metric.'
        });

        if (score >= 80) {
          try {
            confetti({
              particleCount: 75,
              spread: 60,
              origin: { y: 0.7 }
            });
          } catch (e) {}
        }
      }
    } catch (err) {
      console.warn('Backend viva submit error, using client-side calculation:', err);
      const score = calculateJaccardSimilarity(originalSubmittedCode, vivaCode);
      setVivaResult({
        similarity: score,
        message: 'Comparison computed via Jaccard similarity metric.'
      });

      if (score >= 80) {
        try {
          confetti({
            particleCount: 75,
            spread: 60,
            origin: { y: 0.7 }
          });
        } catch (e) {}
      }
    } finally {
      setIsSubmittingViva(false);
    }
  };

  // Navigate to quiz flow when clicking Start Quiz in Available Quizzes
  const handleStartQuizFromAvailableList = (item) => {
    const targetId = item.assignmentId || item.id;
    const targetAsg = (assignments || []).find(a => a.id === targetId);
    if (targetAsg && onSelectAssignment) {
      onSelectAssignment(targetAsg);
    }
    // If it's the currently selected assignment and ready
    if (targetId === selectedAssignment?.id) {
      handleStartQuiz();
    }
  };

  const hasFatalExecutionError = plagResult && (plagResult.functionalStatus === 'Compile Error' || plagResult.functionalStatus === 'Runtime Error');
  const hasFunctionalNotice = plagResult && plagResult.functionalPassed === false && !hasFatalExecutionError;
  const isClean = plagResult && plagResult.score < 35 && !hasFatalExecutionError;
  const isBorderline = plagResult && plagResult.score >= 35 && plagResult.score <= 70 && !hasFatalExecutionError;
  const isShortCode = plagResult && plagResult.isShortCode && !hasFatalExecutionError;
  const isAiApproved = plagResult && aiReport && (aiReport.recommendation === 'Approve for Quiz' || aiReport.logicEquivalence === 'Low') && !hasFatalExecutionError;
  const isHighPlag = plagResult && plagResult.score > 70 && !isShortCode && !isAiApproved && !hasFatalExecutionError;
  const canTakeQuiz = (isClean || isBorderline || isShortCode || isAiApproved) && !hasFatalExecutionError;

  return (
    <div className="space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">

      {/* ========================================================================= */}
      {/* SECTION: AVAILABLE QUIZZES                                                */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs card-float transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shadow-xs">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                Available Quizzes & Comprehension Vivas
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold font-mono">
                  {(quizList.available.length + quizList.completed.length + quizList.locked.length)} Total
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Track your cleared viva assessments, approved quiz entries, and review status.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setActiveQuizFilterTab('all')}
                className={`px-3 py-1 rounded-lg transition ${activeQuizFilterTab === 'all' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                All
              </button>
              <button
                onClick={() => setActiveQuizFilterTab('available')}
                className={`px-3 py-1 rounded-lg transition ${activeQuizFilterTab === 'available' ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                Available ({quizList.available.length})
              </button>
              <button
                onClick={() => setActiveQuizFilterTab('completed')}
                className={`px-3 py-1 rounded-lg transition ${activeQuizFilterTab === 'completed' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                Completed ({quizList.completed.length})
              </button>
              <button
                onClick={() => setActiveQuizFilterTab('locked')}
                className={`px-3 py-1 rounded-lg transition ${activeQuizFilterTab === 'locked' ? 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                Locked ({quizList.locked.length})
              </button>
            </div>

            <button
              onClick={fetchStudentQuizzes}
              disabled={isLoadingQuizzes}
              title="Refresh Quizzes"
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingQuizzes ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Quizzes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* 1. AVAILABLE QUIZZES (Green Cards) */}
          {(activeQuizFilterTab === 'all' || activeQuizFilterTab === 'available') && quizList.available.map((quiz) => (
            <div 
              key={`avail-${quiz.id || quiz.assignmentId}`}
              className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 flex flex-col justify-between space-y-3 card-float shadow-xs"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                    Cleared for Viva
                  </span>
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                    {quiz.subject || 'Computer Engineering'}
                  </span>
                </div>
                <h4 className="text-sm font-extrabold text-emerald-950 dark:text-emerald-100 line-clamp-1">
                  {quiz.title}
                </h4>
                <p className="text-xs text-emerald-800 dark:text-emerald-300/80 mt-1 line-clamp-2">
                  Teacher approved. You can take your 10-question AI viva now.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-emerald-200/60 dark:border-emerald-800/40">
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                  Pass Mark: {quiz.minQuizScore || selectedAssignment.minQuizScore || 70}%
                </span>
                <button
                  onClick={() => handleStartQuizFromAvailableList(quiz)}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm shadow-emerald-600/30 transition card-float"
                >
                  <BrainCircuit className="w-3.5 h-3.5" />
                  <span>Start Quiz</span>
                </button>
              </div>
            </div>
          ))}

          {/* 2. COMPLETED QUIZZES (Gray Cards with Score Badge) */}
          {(activeQuizFilterTab === 'all' || activeQuizFilterTab === 'completed') && quizList.completed.map((quiz) => (
            <div 
              key={`comp-${quiz.id || quiz.assignmentId}`}
              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-3 card-float shadow-xs"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                    Completed
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                    {quiz.subject || 'Computer Engineering'}
                  </span>
                </div>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white line-clamp-1">
                  {quiz.title}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                  Comprehension viva certified and assignment submitted.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
                <span className="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5" />
                  Score: {quiz.score}%
                </span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Certified
                </span>
              </div>
            </div>
          ))}

          {/* 3. LOCKED QUIZZES (Gray with Locked Icon) */}
          {(activeQuizFilterTab === 'all' || activeQuizFilterTab === 'locked') && quizList.locked.map((quiz) => (
            <div 
              key={`lock-${quiz.id || quiz.assignmentId}`}
              className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800/80 flex flex-col justify-between space-y-3 opacity-80"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" />
                    Locked
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                    {quiz.subject || 'Computer Engineering'}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 line-clamp-1">
                  {quiz.title}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                  Waiting for teacher approval. Run plagiarism check and request access.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Waiting for approval
                </span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                  Pass: {quiz.minQuizScore || selectedAssignment.minQuizScore || 70}%
                </span>
              </div>
            </div>
          ))}

          {/* Empty state */}
          {quizList.available.length === 0 && quizList.completed.length === 0 && quizList.locked.length === 0 && (
            <div className="col-span-full py-8 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              No quizzes recorded at this moment. Plagiarism check your solutions to initiate quizzes!
            </div>
          )}

        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION: ASSIGNMENT HEADER CARD                                           */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs card-float transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1">
              <span>{activeAssignment.code}</span>
              <span>•</span>
              <span>{activeAssignment.subject}</span>
              {activeAssignment.division && (
                <>
                  <span>•</span>
                  <span className="text-slate-500 font-medium">Division {activeAssignment.division}</span>
                </>
              )}
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              {activeAssignment.title}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
              {activeAssignment.problemStatement || activeAssignment.description}
            </p>
            {activeAssignment.inputFormat && (
              <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                <span className="font-bold text-slate-700 dark:text-slate-300">Input Format: </span>
                <span>{activeAssignment.inputFormat}</span>
              </div>
            )}
            {activeAssignment.outputFormat && (
              <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                <span className="font-bold text-slate-700 dark:text-slate-300">Output Format: </span>
                <span>{activeAssignment.outputFormat}</span>
              </div>
            )}
            {activeAssignment.constraints && (
              <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                <span className="font-bold text-slate-700 dark:text-slate-300">Constraints: </span>
                <span className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300">{activeAssignment.constraints}</span>
              </div>
            )}
          </div>

          <div className="flex sm:flex-col items-end justify-between gap-2 shrink-0">
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Deadline: {activeAssignment.deadline ? new Date(activeAssignment.deadline).toLocaleDateString() : 'N/A'}
            </span>
            <span className="text-xs px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800">
              Quiz Pass Mark: {activeAssignment.minQuizScore}%
            </span>
          </div>
        </div>

        {/* LeetCode Style Problem Examples Banner */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            <span>Example Specifications &amp; Expected Outputs:</span>
          </h4>
          {isLoadingAssignmentDetails ? (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-500" />
              <span>Loading assignment specifications...</span>
            </div>
          ) : (() => {
            const assignmentExamples = (Array.isArray(activeAssignment?.examples) && activeAssignment.examples.length > 0)
              ? activeAssignment.examples
              : (Array.isArray(activeAssignment?.testcases) && activeAssignment.testcases.length > 0)
                ? activeAssignment.testcases
                : [];
            
            if (assignmentExamples.length === 0) {
              return (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-500 dark:text-slate-400">
                  No sample input/output examples configured for this assignment.
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {assignmentExamples.map((tc, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs font-mono">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">Example {idx + 1}:</span>
                    <div className="text-[11px] text-slate-700 dark:text-slate-300 mt-1">
                      <span className="text-slate-500 font-sans font-medium">Input (stdin): </span>
                      <code className="text-emerald-600 dark:text-emerald-400 font-bold">{cleanInputDisplay(tc.input)}</code>
                    </div>
                    <div className="text-[11px] text-slate-700 dark:text-slate-300 mt-0.5">
                      <span className="text-slate-500 font-sans font-medium">Expected Output: </span>
                      <code className="text-indigo-600 dark:text-indigo-400 font-bold">{tc.expectedOutput || '(None)'}</code>
                    </div>
                    {tc.explanation && (
                      <div className="text-[10px] text-slate-500 font-sans italic mt-1">
                        {tc.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION: CODE BOX AREA & STEP 1 PLAGIARISM CHECK                         */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4 card-float transition-colors">
        
        {/* Editor Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5">
              <FileCode className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                Language:
              </span>
            </div>

            {/* Language Selector Dropdown - Always visible for any language */}
            <select
              value={selectedLanguage}
              onChange={(e) => {
                const newLang = e.target.value;
                setSelectedLanguage(newLang);
                setVivaLanguage(newLang);
                setCode(selectedAssignment?.starterCode?.[newLang] || STARTER_CODES[newLang] || '# Write code here\n');
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-slate-800 border border-indigo-200 dark:border-slate-700 text-indigo-700 dark:text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs cursor-pointer"
              title="Select Programming Language"
            >
              <option value="python">🐍 Python (3.12)</option>
              <option value="cpp">⚡ C++ (G++ 9.2)</option>
              <option value="c">🔧 C (GCC)</option>
              <option value="java">☕ Java (OpenJDK)</option>
              <option value="javascript">🌐 JavaScript (Node.js)</option>
            </select>
          </div>

          {/* Professional IDE Action Toolbar */}
          <div className="flex items-center space-x-2">
            {/* Hidden File Input for code file upload */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".py,.cpp,.c,.java,.js,.txt,.cc,.cxx,.cs"
              className="hidden"
            />

            {/* 1. Upload Code File Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-1.5 text-[11px] px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold transition shadow-xs card-float"
              title="Upload code file (.py, .cpp, .java, etc.)"
            >
              <Upload className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden sm:inline">Upload File</span>
            </button>

            {/* 2. Reset to Starter Template Button */}
            <button
              type="button"
              onClick={handleResetStarterCode}
              className="flex items-center space-x-1.5 text-[11px] px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold transition shadow-xs card-float"
              title="Reset code to official starter template and clear console & test results"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Reset</span>
            </button>

            {/* 3. Subtle Test Scenarios Dropdown (Preserved for Viva Demonstration) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsPresetsDropdownOpen(prev => !prev)}
                className="flex items-center space-x-1.5 text-[11px] px-2.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800 font-semibold transition shadow-xs card-float"
                title="Load evaluation test scenarios"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span className="hidden xs:inline">Test Scenarios</span>
                <ChevronDown className="w-3 h-3 opacity-70" />
              </button>

              {isPresetsDropdownOpen && (
                <div 
                  className="absolute right-0 mt-1.5 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl py-1.5 z-50 text-xs font-medium"
                  onMouseLeave={() => setIsPresetsDropdownOpen(false)}
                >
                  <div className="px-3.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 mb-1">
                    Evaluation Presets (Viva Defense)
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const presets = MULTI_LANG_PRESETS[selectedLanguage] || DEMO_PRESETS;
                      setCode(presets.original.code);
                      setPlagResult(null);
                      setAiReport(null);
                      setIsPresetsDropdownOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 flex items-center space-x-2 transition"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                    <div>
                      <div className="font-bold">Original Solution</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">Clean, authentic code (Low similarity)</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const presets = MULTI_LANG_PRESETS[selectedLanguage] || DEMO_PRESETS;
                      setCode(presets.borderline.code);
                      setPlagResult(null);
                      setAiReport(null);
                      setIsPresetsDropdownOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-800 dark:text-amber-300 flex items-center space-x-2 transition"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
                    <div>
                      <div className="font-bold">Borderline Solution</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">Renamed variables (Triggers AI check)</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const presets = MULTI_LANG_PRESETS[selectedLanguage] || DEMO_PRESETS;
                      setCode(presets.copied.code);
                      setPlagResult(null);
                      setAiReport(null);
                      setIsPresetsDropdownOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-800 dark:text-rose-300 flex items-center space-x-2 transition"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0"></span>
                    <div>
                      <div className="font-bold">Copied Solution</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">Direct duplicate match (Flags plagiarism)</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* LeetCode Fullscreen / Minimize Toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen(prev => !prev)}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen (LeetCode Mode)'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4 text-indigo-600" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Live Code Authenticity & Similarity Detector Banner */}
        <div className="flex items-center justify-between p-2.5 px-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Live Authenticity:
            </span>
            {isLiveAnalyzing ? (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 animate-pulse">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Analyzing written code...</span>
              </span>
            ) : realtimeStatus === 'ORIGINAL' ? (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300 text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Original Code ({realtimeScore}% similarity)</span>
              </span>
            ) : realtimeStatus === 'STANDARD_SHORT' ? (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold border border-blue-300 text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Standard Short Code ({realtimeScore}% match)</span>
              </span>
            ) : realtimeStatus === 'BORDERLINE' ? (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold border border-amber-300 text-[11px]">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Borderline Similarity ({realtimeScore}% match)</span>
              </span>
            ) : realtimeStatus === 'COPIED' ? (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold border border-rose-300 text-[11px]">
                <XCircle className="w-3.5 h-3.5" />
                <span>Copied Code ({realtimeScore}% similarity with database)</span>
              </span>
            ) : (
              <span className="text-[11px] text-slate-400 italic">
                Type or paste code to analyze authenticity in real-time
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
            Dual-Stream Winnowing Engine
          </span>
        </div>

        {/* Text Area (with LeetCode full-screen container) */}
        <div className={`relative ${isFullscreen ? 'fixed inset-0 z-50 bg-slate-900 p-6 flex flex-col justify-between' : ''}`}>
          {isFullscreen && (
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Code2 className="w-4 h-4 text-indigo-400" />
                <span>{selectedAssignment?.title || 'Coding IDE'} — LeetCode Fullscreen Mode</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleRunCode()}
                  disabled={isRunningCode}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{isRunningCode ? 'Running...' : 'Run Code'}</span>
                </button>
                <button
                  onClick={() => setIsFullscreen(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Exit Fullscreen</span>
                </button>
              </div>
            </div>
          )}

          {/* Microsoft VS Code Monaco Editor */}
          <div className="rounded-2xl overflow-hidden border border-slate-700/80 shadow-md bg-[#1e1e1e]">
            <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#333333] text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></span>
                <span className="ml-2 font-mono text-[11px] text-slate-300 font-semibold">
                  solution.{selectedLanguage === 'cpp' ? 'cpp' : selectedLanguage === 'c' ? 'c' : selectedLanguage === 'java' ? 'java' : selectedLanguage === 'javascript' ? 'js' : 'py'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="font-mono text-slate-400">VS Code Monaco Engine</span>
                <span className="px-1.5 py-0.5 rounded bg-[#333333] text-indigo-300 font-mono text-[10px]">
                  UTF-8
                </span>
              </div>
            </div>

            <Editor
              height={isFullscreen ? 'calc(100vh - 340px)' : '380px'}
              language={getMonacoLanguage(selectedLanguage)}
              theme="vs-dark"
              value={code}
              onChange={(val) => setCode(val || '')}
              onMount={(editor, monaco) => {
                editorRef.current = editor;
                monacoRef.current = monaco;
                if (document.fonts && document.fonts.ready) {
                  document.fonts.ready.then(() => {
                    try {
                      monaco.editor.remeasureFonts();
                      editor.layout();
                    } catch (e) {}
                  });
                }
                setTimeout(() => {
                  try {
                    monaco.editor.remeasureFonts();
                    editor.layout();
                  } catch (e) {}
                }, 200);
              }}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: "Consolas, 'Courier New', monospace",
                fontLigatures: false,
                letterSpacing: 0,
                lineHeight: 20,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 4,
                bracketPairColorization: { enabled: true },
                suggestOnTriggerCharacters: true,
                wordWrap: 'off',
                scrollBeyondLastColumn: 2,
                fixedOverflowWidgets: true,
                formatOnPaste: true,
                padding: { top: 12, bottom: 12 }
              }}
            />
          </div>

          {/* LeetCode-Style Interactive Console Drawer (Testcases, Stdin, Output) */}
          {showConsole && (
            <div className="mt-3 p-4 bg-slate-950 rounded-2xl border border-slate-800 text-xs font-mono">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-slate-400 mb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                  <div className="flex gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setConsoleTab('testcases')}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold transition ${consoleTab === 'testcases' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      🧪 Test Cases ({getTestCases().length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setConsoleTab('stdin')}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold transition ${consoleTab === 'stdin' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      ⌨️ Custom Input (stdin)
                    </button>
                    <button
                      type="button"
                      onClick={() => setConsoleTab('output')}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold transition ${consoleTab === 'output' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      📟 Execution Output {consoleOutput && `(${consoleOutput.status})`}
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowConsole(false)}
                  className="text-slate-500 hover:text-slate-300 text-[11px] font-bold"
                >
                  Close Console ✕
                </button>
              </div>

              {/* TAB 1: TEST CASES & EXAMPLES (LeetCode Style) */}
              {consoleTab === 'testcases' && (
                <div className="space-y-3">
                  {/* Test Cases Execution Status Banner */}
                  {isRunningCode ? (
                    <div className="p-3 bg-indigo-950/40 rounded-xl border border-indigo-800/60 flex items-center gap-2 text-indigo-300">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                      <span className="font-bold text-xs">Compiling & executing against assignment test cases...</span>
                    </div>
                  ) : testcaseResults?.hasCompileError ? (
                    <div className="p-3 bg-rose-950/50 rounded-xl border border-rose-800 text-rose-300 space-y-1">
                      <div className="flex items-center gap-2 font-bold text-xs text-rose-400">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Compilation / Syntax Error</span>
                      </div>
                      <pre className="text-[11px] font-mono text-rose-200 whitespace-pre-wrap bg-black/40 p-2 rounded-lg mt-1 max-h-36 overflow-y-auto">
                        {testcaseResults.compileError}
                      </pre>
                    </div>
                  ) : testcaseResults ? (
                    <div className={`p-3 rounded-xl border flex items-center justify-between ${
                      testcaseResults.allPassed 
                        ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300' 
                        : 'bg-amber-950/40 border-amber-800/80 text-amber-300'
                    }`}>
                      <div className="flex items-center gap-2">
                        {testcaseResults.allPassed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-amber-400" />
                        )}
                        <span className="font-bold text-xs">
                          {testcaseResults.allPassed
                            ? `All ${testcaseResults.passedCount}/${testcaseResults.total} Test Cases Passed — Accepted!`
                            : `${testcaseResults.passedCount} of ${testcaseResults.total} Test Cases Passed — Review outputs below`}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono opacity-80">
                        {testcaseResults.allPassed ? 'Requirements Verified ✓' : 'Output Mismatch ✗'}
                      </span>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400">
                      Click <strong>"Run & Compile Code"</strong> to automatically verify your solution against assignment test cases, or click <strong>"Run Case"</strong> to test individually.
                    </p>
                  )}

                  {getTestCases().length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400">
                      <p className="font-medium text-slate-300">No pre-configured test cases for this assignment.</p>
                      <p className="text-[11px] text-slate-500 mt-1">You can test your code with custom inputs using the <strong>Custom Input (stdin)</strong> tab.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {getTestCases().map((tc, idx) => {
                        const res = testcaseResults?.results?.[idx];
                        const isRunningThis = isRunningCode && (activeRunningCase === idx);

                        return (
                          <div 
                            key={idx} 
                            className={`p-3 rounded-xl border transition space-y-2 ${
                              res 
                                ? (res.passed 
                                    ? 'bg-emerald-950/20 border-emerald-800/60' 
                                    : 'bg-rose-950/20 border-rose-800/60')
                                : 'bg-slate-900/90 border-slate-800'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold text-slate-300">Case {idx + 1}</span>
                                {res && (
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                    res.passed 
                                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
                                      : res.status === 'Compile Error'
                                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                                      : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                                  }`}>
                                    {res.passed ? '✓ Passed' : res.status === 'Compile Error' ? 'Compile Error' : '✗ Wrong Answer'}
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRunCode(tc.input || '', idx)}
                                disabled={isRunningCode}
                                className="px-2 py-0.5 rounded bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-600/30 text-[10px] font-bold transition flex items-center gap-1 disabled:opacity-50"
                              >
                                <Play className="w-2.5 h-2.5" />
                                <span>{isRunningThis ? 'Running...' : 'Run Case'}</span>
                              </button>
                            </div>

                            <div className="text-[11px]">
                              <span className="text-slate-500">Input: </span>
                              <span className="text-emerald-300 font-mono">
                                {cleanInputDisplay(tc.input)}
                              </span>
                            </div>

                            <div className="text-[11px]">
                              <span className="text-slate-500">Expected: </span>
                              <span className="text-indigo-300 font-mono font-bold">
                                {tc.expectedOutput || '(Any)'}
                              </span>
                            </div>

                            {/* Actual output from execution */}
                            {res && (
                              <div className="text-[11px] pt-1 border-t border-slate-800">
                                <span className="text-slate-500 block mb-0.5">Your Output:</span>
                                <pre className={`p-1.5 rounded text-[11px] font-mono whitespace-pre-wrap ${
                                  res.passed 
                                    ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-900/60' 
                                    : 'bg-rose-950/40 text-rose-300 border border-rose-900/60'
                                }`}>
                                  {res.actualOutput || (res.status === 'Compile Error' ? '(Compilation Failed)' : '(No output generated)')}
                                </pre>
                                {res.stderr && res.status !== 'Compile Error' && (
                                  <p className="text-[10px] text-rose-400 mt-1 font-mono">{res.stderr}</p>
                                )}
                                {res.time && (
                                  <span className="text-[9px] text-slate-500 font-mono block mt-0.5">Runtime: {res.time}s</span>
                                )}
                              </div>
                            )}

                            {tc.explanation && (
                              <p className="text-[10px] text-slate-400 italic border-t border-slate-800/80 pt-1">
                                {tc.explanation}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: CUSTOM INPUT (STDIN) */}
              {consoleTab === 'stdin' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-300 font-bold">
                      Standard Input (stdin for <code className="text-indigo-300">cin &gt;&gt;</code> / <code className="text-indigo-300">scanf</code> / <code className="text-indigo-300">input()</code>):
                    </label>
                    <span className="text-[10px] text-slate-500">Enter multi-line values, one per prompt</span>
                  </div>
                  <textarea
                    rows={4}
                    value={stdinInput}
                    onChange={(e) => setStdinInput(e.target.value)}
                    placeholder={"e.g.\n4\n6"}
                    className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-emerald-300 font-mono text-xs focus:outline-none focus:border-indigo-500 resize-y"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleRunCode(stdinInput || '')}
                      disabled={isRunningCode}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition"
                    >
                      <Play className="w-3 h-3" />
                      <span>{isRunningCode ? 'Executing...' : 'Run Code with Stdin'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: EXECUTION OUTPUT */}
              {consoleTab === 'output' && (
                <div>
                  {isRunningCode ? (
                    <div className="text-indigo-400 animate-pulse py-2 flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Compiling and executing code with stdin...</span>
                    </div>
                  ) : consoleOutput ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${consoleOutput.status === 'Accepted' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'}`}>
                          {consoleOutput.status}
                        </span>
                        {consoleOutput.time && <span className="text-[10px] text-slate-500">{consoleOutput.time}s</span>}
                      </div>
                      {consoleOutput.stdout && (
                        <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-slate-500 block mb-1">Standard Output (stdout):</span>
                          <pre className="text-emerald-400 whitespace-pre-wrap">{consoleOutput.stdout}</pre>
                        </div>
                      )}
                      {consoleOutput.stderr && (
                        <div className="p-2.5 bg-rose-950/40 rounded-xl border border-rose-900/60">
                          <span className="text-[10px] text-rose-400 block mb-1">Error / Diagnostics (stderr):</span>
                          <pre className="text-rose-400 whitespace-pre-wrap">{consoleOutput.stderr}</pre>
                        </div>
                      )}
                      {!consoleOutput.stdout && !consoleOutput.stderr && (
                        <span className="text-slate-500 italic">Program finished cleanly with no output.</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-500 italic">Click 'Run &amp; Compile Code' or 'Run Case' to test execution.</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Controls: Run Code & Step 1 Check Plagiarism */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleRunCode()}
              disabled={isRunningCode || !code.trim()}
              className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs shadow-sm transition disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isRunningCode ? 'Running...' : 'Run & Compile Code'}</span>
            </button>

            <button
              onClick={() => setShowConsole(prev => !prev)}
              className="flex items-center space-x-1 px-3 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs transition"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Console</span>
            </button>
          </div>

          <button
            onClick={handleCheckPlagiarism}
            disabled={isCheckingPlag}
            className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition disabled:opacity-50 card-float"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isCheckingPlag ? 'Checking Plagiarism...' : 'Step 1: Check Plagiarism'}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION: RESULT CARDS (Clean, Borderline, High Plagiarism)                */}
      {/* ========================================================================= */}
      {plagResult && (
        <div className="space-y-4">
          {/* 0A. If Program Crashed (Fatal Compile or Runtime Error) */}
          {hasFatalExecutionError && (
            <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-800 rounded-3xl p-6 text-rose-950 dark:text-rose-100 space-y-3 card-float">
              <div className="flex items-start space-x-3.5">
                <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-black text-xl shrink-0 shadow-sm animate-float">
                  ✕
                </div>
                <div className="grow">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200 font-bold text-[10px] uppercase">
                      {plagResult.functionalStatus || 'Execution Error'}
                    </span>
                    <h4 className="font-extrabold text-sm text-rose-900 dark:text-rose-200">
                      Compilation or Runtime Error
                    </h4>
                  </div>
                  <p className="text-xs text-rose-700 dark:text-rose-300 mt-1 font-medium">
                    {plagResult.functionalReason}
                  </p>
                  {plagResult.executionError && (
                    <div className="mt-2.5 p-3 bg-slate-900 rounded-xl font-mono text-xs text-rose-400 border border-slate-800">
                      <span className="text-slate-400 text-[10px] uppercase tracking-wider block mb-1">Compiler Diagnostics:</span>
                      {plagResult.executionError}
                    </div>
                  )}
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold mt-2.5">
                    👉 Fix the syntax or runtime error above and re-click Step 1 to verify.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 0B. If Code Had Advisory Output Difference (Non-fatal, Originality Verified) */}
          {hasFunctionalNotice && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-3xl p-5 text-amber-950 dark:text-amber-100 space-y-2 card-float">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-xs">
                  ℹ️
                </div>
                <div className="grow">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200 font-bold text-[10px] uppercase">
                      Sample Notice
                    </span>
                    <h4 className="font-extrabold text-xs text-amber-900 dark:text-amber-200">
                      Output Format Observation
                    </h4>
                  </div>
                  <p className="text-xs text-amber-800 dark:text-amber-300 mt-1 font-medium">
                    {plagResult.functionalReason}
                  </p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold mt-1">
                    ✓ Your code's originality ({plagResult.score}% similarity) has been verified. You may proceed to Step 2 for the AI Viva.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 1. If Code is Clean */}
          {isClean && (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-3xl p-6 text-emerald-950 dark:text-emerald-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 card-float">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-black text-base shrink-0 shadow-sm animate-float">
                  {plagResult.score}%
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-emerald-900 dark:text-emerald-300">
                    ✅ Original Code! Plagiarism is very low ({plagResult.score}%).
                  </h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                    Your code is unique and approved. Request teacher access to take the AI viva.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 2. If Code is Borderline (Renamed variables) */}
          {isBorderline && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-3xl p-6 text-amber-950 dark:text-amber-100 space-y-3 card-float">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black text-base shrink-0 shadow-sm animate-float">
                    {plagResult.score}%
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-amber-900 dark:text-amber-300">
                      ⚠️ Borderline Similarity ({plagResult.score}%). AI Deep Check completed.
                    </h4>
                    <p className="text-xs text-amber-800 dark:text-amber-400 mt-0.5">
                      Your logic is similar to another student with renamed variables ({aiReport?.renamedIdentifiers?.join(', ') || 'curr -> current_node'}).
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsTier2ModalOpen(true)}
                  className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-amber-200 hover:bg-amber-300 dark:bg-amber-800 dark:hover:bg-amber-700 text-amber-900 dark:text-amber-100 font-bold text-xs transition shrink-0"
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>View Detailed AI Logic Analysis</span>
                </button>
              </div>

              <div className="bg-white/70 dark:bg-slate-900/70 p-3.5 rounded-2xl border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-300">
                <strong>Why take the viva?</strong> Passing the 10-question comprehension viva with ≥ 70% proves that you authentically understand the logic yourself.
              </div>
            </div>
          )}

          {/* 2.5 If Code is Short / Standard Problem Implementation */}
          {isShortCode && plagResult.score >= 35 && (
            <div className="bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-3xl p-6 text-indigo-950 dark:text-indigo-100 space-y-3 card-float">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-base shrink-0 shadow-sm animate-float">
                    {plagResult.score}%
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-200 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 font-bold text-[10px] uppercase">
                        Standard Short Code
                      </span>
                      <h4 className="font-extrabold text-sm text-indigo-900 dark:text-indigo-300">
                        ⚡ Standard Implementation ({plagResult.score}% match)
                      </h4>
                    </div>
                    <p className="text-xs text-indigo-800 dark:text-indigo-300 mt-1 font-medium">
                      Because this problem statement has a brief syntax, high similarity with peers is expected. Proceed to Step 2 to take the 10-question AI Viva Quiz to verify your individual comprehension.
                    </p>
                  </div>
                </div>

                {aiReport && (
                  <button
                    onClick={() => setIsTier2ModalOpen(true)}
                    className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900 dark:hover:bg-indigo-800 text-indigo-900 dark:text-indigo-100 font-bold text-xs transition shrink-0"
                  >
                    <HelpCircle className="w-4 h-4" />
                    <span>View AI Analysis</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 3. If Code is High Plagiarism */}
          {isHighPlag && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-3xl p-6 text-red-950 dark:text-red-100 flex items-center space-x-3.5 card-float">
              <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center font-black text-base shrink-0 shadow-sm animate-float">
                {plagResult.score}%
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-red-900 dark:text-red-300">
                  ❌ High Plagiarism Detected ({plagResult.score}% match).
                </h4>
                <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">
                  Your code matches an existing submission by another student ({plagResult.mostSimilarSubmission?.studentName}). Please write your own original solution before submitting.
                </p>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION: STEP 2 - REQUEST TEACHER APPROVAL FOR AI VIVA                   */}
      {/* ========================================================================= */}
      {canTakeQuiz && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs card-float transition-colors">
          {quizRequestStatus === 'none' && (
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">Step 2: Request Teacher Approval for AI Viva</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Supervising Faculty: Prof. Nitin Shivale (Computer Engineering)</p>
              </div>
              <button 
                onClick={handleRequestQuizAccess} 
                disabled={isRequestingAccess} 
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition shrink-0"
              >
                <ArrowRight className="w-4 h-4" />
                <span>{isRequestingAccess ? 'Requesting...' : 'Request Quiz Access from Teacher →'}</span>
              </button>
            </div>
          )}
          {quizRequestStatus === 'pending' && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                <h4 className="font-extrabold text-sm text-amber-900 dark:text-amber-300">⏳ Quiz Access Request Submitted — Awaiting Teacher Review</h4>
                <p className="text-xs text-amber-800 dark:text-amber-400 mt-1">Your code and originality score have been sent to Prof. Nitin Shivale for inspection. Once approved, your AI Comprehension Viva will be unlocked.</p>
              </div>
              <button 
                onClick={checkApprovalStatus} 
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 font-bold text-xs shadow-sm transition shrink-0"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Check Approval Status</span>
              </button>
            </div>
          )}
          {quizRequestStatus === 'approved' && (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                <h4 className="font-extrabold text-sm text-emerald-900 dark:text-emerald-300">✅ Quiz Access Approved by Faculty!</h4>
                <p className="text-xs text-emerald-800 dark:text-emerald-400 mt-1">Teacher reviewed your code. You are cleared to take the 10-Question AI Comprehension Viva.</p>
              </div>
              <button 
                onClick={handleStartQuiz} 
                disabled={isGeneratingQuiz} 
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition shrink-0"
              >
                <BrainCircuit className="w-4 h-4" />
                <span>{isGeneratingQuiz ? 'Loading 10 Questions...' : 'Start Supervised AI Viva (10 Questions) →'}</span>
              </button>
            </div>
          )}
          {quizRequestStatus === 'rejected' && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                <h4 className="font-extrabold text-sm text-red-900 dark:text-red-300">❌ Quiz Access Denied</h4>
                <p className="text-xs text-red-800 dark:text-red-400 mt-1">Note: {quizRequestDetails?.reviewNote || 'Please revise your code and re-check plagiarism.'}</p>
              </div>
              <button 
                onClick={() => setQuizRequestStatus('none')} 
                className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs font-bold transition shrink-0"
              >
                Re-check Code & Submit New Request
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION: STEP 3 - QUIZ RESULT & FINAL SUBMISSION                          */}
      {/* ========================================================================= */}
      {quizResult && (
        <div className={`border rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 card-float ${
          quizResult.passed 
            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100' 
            : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-950 dark:text-red-100'
        }`}>
          <div>
            <h4 className="font-extrabold text-sm flex items-center gap-1.5">
              {quizResult.passed ? <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> : <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />}
              <span>
                {quizResult.passed 
                  ? `Quiz Passed! You scored ${quizResult.score}% (${quizResult.correctCount}/${quizResult.totalQuestions} correct)` 
                  : `Score: ${quizResult.score}% (${quizResult.correctCount}/${quizResult.totalQuestions} correct). Required: ${activeAssignment?.minQuizScore || selectedAssignment?.minQuizScore}% (7/10).`}
              </span>
            </h4>
            <p className="text-xs mt-0.5 opacity-80">
              {quizResult.passed 
                ? 'Your understanding of the code is certified. You can now make the final submission.' 
                : 'Please review your code implementation and retry the 10 questions.'}
            </p>
          </div>

          {quizResult.passed ? (
            <button
              onClick={handleFinalSubmit}
              disabled={isFinalSubmitting}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition shrink-0 card-float"
            >
              <GitBranch className="w-4 h-4" />
              <span>{isFinalSubmitting ? 'Submitting...' : 'Step 3: Final Submit Assignment →'}</span>
            </button>
          ) : (
            <button
              onClick={() => {
                const nextAttempt = quizAttempt + 1;
                setQuizAttempt(nextAttempt);
                setQuizResult(null);
                handleStartQuiz(nextAttempt);
              }}
              className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs font-bold hover:bg-red-50 dark:hover:bg-red-900/30 transition shrink-0 card-float"
            >
              Retry 10-Question Viva
            </button>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION: VIVA CODE EDITOR (Visible only after submission)                */}
      {/* ========================================================================= */}
      {hasSubmittedCurrentAssignment && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs card-float transition-colors space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shadow-xs">
                <Code2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Viva Code Editor - Demonstrate Your Understanding
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  During viva, re-enter your code from memory. Your viva code will be compared against your original submission using Jaccard similarity.
                </p>
              </div>
            </div>

            {/* Language Selector */}
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400 font-semibold">Language:</span>
              <select
                value={vivaLanguage}
                onChange={(e) => setVivaLanguage(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {(selectedAssignment?.languages || ['python']).map(lang => (
                  <option key={lang} value={lang}>{lang.charAt(0).toUpperCase() + lang.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Viva Textarea */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1 font-medium">
                <FileCode className="w-3.5 h-3.5 text-indigo-500" />
                Write solution from memory:
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                {vivaCode.length} characters
              </span>
            </div>

            <textarea
              value={vivaCode}
              onChange={(e) => setVivaCode(e.target.value)}
              rows="10"
              placeholder="# Write your logic from memory here as asked during oral viva...&#10;class TreeNode:&#10;    # reconstruct your algorithm"
              spellCheck="false"
              className="w-full p-4 bg-slate-900 text-cyan-300 font-['Fira_Code',monospace] text-xs rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed shadow-inner"
            />
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
              <Gauge className="w-4 h-4 text-indigo-500" />
              <span>Token-based n-gram Jaccard similarity metric</span>
            </div>

            <div className="flex items-center space-x-3">
              {vivaCode && (
                <button
                  onClick={() => {
                    setVivaCode('');
                    setVivaResult(null);
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition"
                >
                  Clear Editor
                </button>
              )}

              <button
                onClick={handleSubmitViva}
                disabled={isSubmittingViva || !vivaCode.trim()}
                className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition disabled:opacity-50 card-float"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isSubmittingViva ? 'Evaluating Viva Code...' : 'Submit Viva Code'}</span>
              </button>
            </div>
          </div>

          {/* Viva Evaluation Result Display */}
          {vivaResult && (
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  
                  {/* Gauge Badge */}
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg text-white shadow-md shrink-0 ${
                    vivaResult.similarity >= 80 
                      ? 'bg-emerald-500 shadow-emerald-500/30' 
                      : vivaResult.similarity >= 50 
                      ? 'bg-amber-500 shadow-amber-500/30' 
                      : 'bg-red-500 shadow-red-500/30'
                  }`}>
                    {vivaResult.similarity}%
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      {vivaResult.similarity >= 80 && (
                        <span className="px-2.5 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-extrabold text-xs border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          High Similarity - Good comprehension
                        </span>
                      )}
                      {vivaResult.similarity >= 50 && vivaResult.similarity < 80 && (
                        <span className="px-2.5 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-extrabold text-xs border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Moderate Similarity - Partial recall
                        </span>
                      )}
                      {vivaResult.similarity < 50 && (
                        <span className="px-2.5 py-0.5 rounded-lg bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 font-extrabold text-xs border border-red-300 dark:border-red-800 flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" />
                          Low Similarity
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-1">
                      {vivaResult.message || `Your viva code matches ${vivaResult.similarity}% of the original submission logic.`}
                    </p>
                  </div>
                </div>

                {/* Visual Progress Bar Gauge */}
                <div className="w-full md:w-48 bg-slate-200 dark:bg-slate-700 h-3 rounded-full overflow-hidden shrink-0">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      vivaResult.similarity >= 80 
                        ? 'bg-emerald-500' 
                        : vivaResult.similarity >= 50 
                        ? 'bg-amber-500' 
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, vivaResult.similarity))}%` }}
                  />
                </div>
              </div>

              {/* Informative Note as Required */}
              <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-300 leading-relaxed">
                <span className="font-bold">Note: </span>
                Similarity is a heuristic estimate. Different approaches to the same problem may show lower similarity even with good understanding.
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS                                                                    */}
      {/* ========================================================================= */}
      <SubmissionReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        receipt={receipt}
      />

      <QuizModal
        isOpen={isQuizModalOpen}
        onClose={() => setIsQuizModalOpen(false)}
        quizData={quizData}
        assignmentTitle={selectedAssignment?.title}
        assignmentSubject={selectedAssignment?.subject}
        onSubmitQuiz={handleSubmitQuiz}
        isSubmitting={isSubmittingQuiz}
        result={quizResult}
        onResetQuiz={() => {
          const nextAttempt = quizAttempt + 1;
          setQuizAttempt(nextAttempt);
          setQuizResult(null);
          handleStartQuiz(nextAttempt);
        }}
        onProceedToGithub={() => {
          setIsQuizModalOpen(false);
          handleFinalSubmit();
        }}
      />

      <Tier2Modal 
        isOpen={isTier2ModalOpen} 
        onClose={() => setIsTier2ModalOpen(false)} 
        report={aiReport} 
        onProceedToQuiz={handleRequestQuizAccess} 
      />

    </div>
  );
}
