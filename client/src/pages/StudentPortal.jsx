import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  BrainCircuit, 
  FileCode, 
  ArrowRight, 
  Sparkles, 
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
  Maximize2,
  Minimize2,
  Play,
  Terminal
} from 'lucide-react';
import confetti from 'canvas-confetti';
import QuizModal from '../components/QuizModal.jsx';
import SubmissionReceiptModal from '../components/SubmissionReceiptModal.jsx';
import Tier2Modal from '../components/Tier2Modal.jsx';
import CompilerPanel from '../components/CompilerPanel.jsx';

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
  const [isRunningCode, setIsRunningCode] = useState(false);
  const [stdinInput, setStdinInput] = useState('');

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

  // Load existing submission or starter code
  useEffect(() => {
    if (selectedAssignment) {
      setCode(selectedAssignment.starterCode?.[selectedLanguage] || '# Write your solution here\n');
      setPlagResult(null);
      setAiReport(null);
      setQuizData(null);
      setQuizResult(null);
      setReceipt(null);
      setQuizRequestStatus('none');
      setQuizRequestDetails(null);
      setVivaResult(null);
      setVivaCode('');

      // Fetch quiz request status with Authorization header
      fetch(`/api/quiz-requests/status/${selectedAssignment.id}/${currentUser?.id}`, {
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

      // Check if already submitted
      const existing = submissions.find(
        s => s.assignmentId === selectedAssignment.id && s.studentId === currentUser?.id
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
          passed: existing.quizPassed ?? (existing.quizScore >= (selectedAssignment.minQuizScore || 70)),
          minRequiredScore: selectedAssignment.minQuizScore || 70,
          correctCount: existing.correctAnswers || 7,
          totalQuestions: existing.totalQuestions || 10
        });
      }
    }
  }, [selectedAssignment, currentUser?.id, submissions, selectedLanguage]);

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
  // RUN & COMPILE CODE (Instant Execution)
  const handleRunCode = async () => {
    if (!code || !code.trim()) {
      alert('Please enter code before running.');
      return;
    }

    setIsRunningCode(true);
    setShowConsole(true);
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

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Execution failed');
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
  };

  // STEP 1: Check Plagiarism
  const handleCheckPlagiarism = async () => {
    if (!code || code.trim().length < 20) {
      alert('Please write or paste your code before checking.');
      return;
    }

    setIsCheckingPlag(true);
    setPlagResult(null);
    setAiReport(null);

    try {
      // 1. Run Tier-1 Plagiarism Check
      const res = await fetch('/api/validate/tier1', {
        method: 'POST',
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          code,
          assignmentId: selectedAssignment.id,
          studentId: currentUser?.id
        })
      });

      const t1Data = await res.json();
      setPlagResult(t1Data);

      // 2. If borderline, automatically trigger Tier-2 Gemini check
      if (t1Data.requiresTier2) {
        const t2Res = await fetch('/api/validate/tier2', {
          method: 'POST',
          headers: getAuthHeaders(true),
          body: JSON.stringify({
            code,
            assignmentId: selectedAssignment.id,
            referenceCode: t1Data.mostSimilarSubmission?.code,
            studentName: currentUser?.name
          })
        });
        const t2Data = await t2Res.json();
        setAiReport(t2Data);
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setIsCheckingPlag(false);
    }
  };

  // Step 2: Request Quiz Access
  const handleRequestQuizAccess = async () => {
    setIsRequestingAccess(true);
    try {
      const res = await fetch('/api/quiz-requests', {
        method: 'POST',
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          studentId: currentUser?.id,
          studentName: currentUser?.name,
          assignmentId: selectedAssignment.id,
          assignmentTitle: selectedAssignment.title,
          teacherId: selectedAssignment.teacherId || 'usr_teacher_1',
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
  const handleStartQuiz = async () => {
    setIsGeneratingQuiz(true);
    try {
      const res = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          code,
          assignmentId: selectedAssignment.id,
          language: selectedLanguage,
          studentId: currentUser?.id
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

  const isClean = plagResult && plagResult.score < 35;
  const isBorderline = plagResult && plagResult.score >= 35 && plagResult.score < 75;
  const isHighPlag = plagResult && plagResult.score >= 75;
  const canTakeQuiz = isClean || isBorderline;

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
              <span>{selectedAssignment.code}</span>
              <span>•</span>
              <span>{selectedAssignment.subject}</span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              {selectedAssignment.title}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
              {selectedAssignment.description}
            </p>
          </div>

          <div className="flex sm:flex-col items-end justify-between gap-2 shrink-0">
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Deadline: {new Date(selectedAssignment.deadline).toLocaleDateString()}
            </span>
            <span className="text-xs px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800">
              Quiz Pass Mark: {selectedAssignment.minQuizScore}%
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION: CODE BOX AREA & STEP 1 PLAGIARISM CHECK                         */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4 card-float transition-colors">
        
        {/* Editor Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center space-x-2">
            <FileCode className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              Your Code Solution ({selectedLanguage.charAt(0).toUpperCase() + selectedLanguage.slice(1)})
            </span>
          </div>

          {selectedAssignment?.languages?.length > 1 && (
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {selectedAssignment.languages.map(lang => (
                <option key={lang} value={lang}>{lang.charAt(0).toUpperCase() + lang.slice(1)}</option>
              ))}
            </select>
          )}

          {/* Quick Demo Buttons for Easy 1-Click Testing */}
          <div className="flex items-center space-x-2">
            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">Try Demo:</span>
            <button
              onClick={() => setCode(DEMO_PRESETS.original.code)}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-semibold transition card-float"
              title="Loads clean, original code"
            >
              Original Code
            </button>
            <button
              onClick={() => setCode(DEMO_PRESETS.borderline.code)}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-semibold transition card-float"
              title="Loads modified code with renamed variables"
            >
              Borderline Code
            </button>
            <button
              onClick={() => setCode(DEMO_PRESETS.copied.code)}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-semibold transition card-float"
              title="Loads exact copied code"
            >
              Copied Code
            </button>

            {/* LeetCode Fullscreen / Minimize Toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen(prev => !prev)}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition ml-2"
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
                  onClick={handleRunCode}
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

          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            rows={isFullscreen ? 24 : 14}
            placeholder="Write or paste your code here... (Click 'Run & Compile Code' to test execution)"
            spellCheck="false"
            className={`w-full p-4 bg-slate-900 text-emerald-400 font-['Fira_Code',monospace] text-xs rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed shadow-inner ${isFullscreen ? 'grow resize-none mb-3' : 'resize-y min-h-[220px]'}`}
          />

          {/* Collapsible Console Drawer inside Editor */}
          {showConsole && (
            <div className="mt-3 p-4 bg-slate-950 rounded-2xl border border-slate-800 text-xs font-mono">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-slate-400 mb-2">
                <span className="flex items-center gap-1.5 font-bold text-slate-200">
                  <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                  Compiler Console &amp; Test Output
                </span>
                <button
                  type="button"
                  onClick={() => setShowConsole(false)}
                  className="text-slate-500 hover:text-slate-300 text-[11px]"
                >
                  Close Console ✕
                </button>
              </div>

              {isRunningCode ? (
                <div className="text-indigo-400 animate-pulse py-2">Compiling and executing code...</div>
              ) : consoleOutput ? (
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${consoleOutput.status === 'Accepted' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'}`}>
                      {consoleOutput.status}
                    </span>
                    {consoleOutput.time && <span className="text-[10px] text-slate-500">{consoleOutput.time}s</span>}
                  </div>
                  {consoleOutput.stdout && (
                    <pre className="text-emerald-400 whitespace-pre-wrap">{consoleOutput.stdout}</pre>
                  )}
                  {consoleOutput.stderr && (
                    <pre className="text-rose-400 whitespace-pre-wrap">{consoleOutput.stderr}</pre>
                  )}
                  {!consoleOutput.stdout && !consoleOutput.stderr && (
                    <span className="text-slate-500 italic">Program finished with no output.</span>
                  )}
                </div>
              ) : (
                <span className="text-slate-500 italic">Click 'Run &amp; Compile Code' below to execute solution.</span>
              )}
            </div>
          )}
        </div>

        {/* Action Controls: Run Code & Step 1 Check Plagiarism */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <button
              onClick={handleRunCode}
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
                  : `Score: ${quizResult.score}% (${quizResult.correctCount}/${quizResult.totalQuestions} correct). Required: ${selectedAssignment.minQuizScore}% (7/10).`}
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
              onClick={handleStartQuiz}
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
        onSubmitQuiz={handleSubmitQuiz}
        isSubmitting={isSubmittingQuiz}
        result={quizResult}
        onResetQuiz={() => {
          setQuizResult(null);
          handleStartQuiz();
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
