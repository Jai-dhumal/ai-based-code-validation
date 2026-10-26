import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  FileCode, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  Eye, 
  TrendingUp, 
  BarChart3,
  PieChart,
  Printer,
  Search,
  Filter,
  Award,
  Sparkles,
  GitCommit,
  GitCompare,
  X,
  Clock,
  ChevronRight,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  Check,
  RefreshCw,
  UserCheck,
  ArrowLeft,
  ExternalLink,
  Code2,
  Copy,
  BookOpen,
  AlertCircle,
  HelpCircle,
  Settings,
  CheckSquare,
  Square,
  ChevronDown,
  Edit
} from 'lucide-react';

// Helper for auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('ai_validate_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

export default function TeacherPortal({ 
  currentUser, 
  assignments = [], 
  submissions = [], 
  onRefreshData,
  onOpenSettings
}) {
  // Navigation tabs: 'powerbi' | 'assignments' | 'quiz_permissions' | 'student_details' | 'viva_review'
  const [activeTab, setActiveTab] = useState('powerbi');

  // ==========================================
  // TAB 1: POWER BI PERFORMANCE DASHBOARD STATE
  // ==========================================
  const [selectedAsgFilter, setSelectedAsgFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  // ==========================================
  // TAB 2: COURSE ASSIGNMENTS STATE
  // ==========================================
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAsgId, setEditingAsgId] = useState(null);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Data Structures & Algorithms');
  const [code, setCode] = useState('CS302');
  const [deadline, setDeadline] = useState('2026-11-15');
  const [minQuiz, setMinQuiz] = useState(70);
  const [desc, setDesc] = useState('');
  const [inputFormat, setInputFormat] = useState('');
  const [outputFormat, setOutputFormat] = useState('');
  const [constraints, setConstraints] = useState('');
  const [targetDepartment, setTargetDepartment] = useState(currentUser?.department || 'Computer Engineering');
  const [targetDivision, setTargetDivision] = useState('all');
  const [testcases, setTestcases] = useState([]);
  const [isGeneratingAiTestcases, setIsGeneratingAiTestcases] = useState(false);
  const [isSubmittingAsg, setIsSubmittingAsg] = useState(false);

  // ==========================================
  // TAB 3: QUIZ PERMISSIONS STATE
  // ==========================================
  const [selectedPermAsgId, setSelectedPermAsgId] = useState(() => assignments[0]?.id || '');
  const [permStudents, setPermStudents] = useState([]);
  const [quizRequests, setQuizRequests] = useState([]);
  const [isLoadingPerms, setIsLoadingPerms] = useState(false);
  const [permSearch, setPermSearch] = useState('');
  const [permStatusFilter, setPermStatusFilter] = useState('all');
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [rejectModalReq, setRejectModalReq] = useState(null);
  const [rejectNote, setRejectNote] = useState('');
  const [permActionLoading, setPermActionLoading] = useState(null);

  // ==========================================
  // TAB 4: STUDENT DETAILS STATE
  // ==========================================
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [studentDetailData, setStudentDetailData] = useState(null);
  const [isLoadingStudentDetail, setIsLoadingStudentDetail] = useState(false);
  const [studentInspectCode, setStudentInspectCode] = useState(null);

  // ==========================================
  // TAB 5: VIVA REVIEW STATE
  // ==========================================
  const [selectedVivaAsgId, setSelectedVivaAsgId] = useState(() => assignments[0]?.id || '');
  const [vivaSubmissions, setVivaSubmissions] = useState([]);
  const [isLoadingVivas, setIsLoadingVivas] = useState(false);
  const [vivaSearch, setVivaSearch] = useState('');
  const [vivaStatusFilter, setVivaStatusFilter] = useState('all');
  const [selectedVivaComparison, setSelectedVivaComparison] = useState(null);
  const [vivaReviewNote, setVivaReviewNote] = useState('');
  const [isUpdatingViva, setIsUpdatingViva] = useState(false);
  const [copiedCodeType, setCopiedCodeType] = useState(null);

  // Sync selected assignments when assignments prop updates
  useEffect(() => {
    if (assignments.length > 0) {
      if (!selectedPermAsgId || !assignments.some(a => a.id === selectedPermAsgId)) {
        setSelectedPermAsgId(assignments[0].id);
      }
      if (!selectedVivaAsgId || !assignments.some(a => a.id === selectedVivaAsgId)) {
        setSelectedVivaAsgId(assignments[0].id);
      }
    }
  }, [assignments]);

  // ==========================================
  // DATA FETCHING: QUIZ PERMISSIONS TAB
  // ==========================================
  const fetchQuizPermissionsData = async (asgId) => {
    if (!asgId) return;
    setIsLoadingPerms(true);
    try {
      // 1. Fetch assignment students & their status
      const studentsRes = await fetch(`/api/teacher/students/${asgId}`, {
        headers: getAuthHeaders()
      });
      
      // 2. Fetch pending quiz requests for this assignment
      const requestsRes = await fetch(`/api/quiz-requests?assignmentId=${asgId}`, {
        headers: getAuthHeaders()
      });

      let fetchedStudents = [];
      if (studentsRes.ok) {
        const data = await studentsRes.json();
        fetchedStudents = data.students || (Array.isArray(data) ? data : []);
      } else {
        // Fallback: derive from props submissions & unique student users
        const asgSubs = submissions.filter(s => s.assignmentId === asgId);
        const map = new Map();
        asgSubs.forEach(s => {
          map.set(s.studentId, {
            id: s.studentId,
            name: s.studentName,
            rollNo: s.rollNo,
            department: s.department || 'Computer Engineering',
            division: s.division || 'A',
            hasSubmitted: true,
            submission: s,
            permissionStatus: s.quizPassed ? 'completed' : 'locked'
          });
        });
        fetchedStudents = Array.from(map.values());
      }

      setPermStudents(fetchedStudents);

      if (requestsRes.ok) {
        const reqData = await requestsRes.json();
        setQuizRequests(Array.isArray(reqData) ? reqData : []);
      } else {
        setQuizRequests([]);
      }
    } catch (err) {
      console.error('Error fetching quiz permissions data:', err);
    } finally {
      setIsLoadingPerms(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'quiz_permissions' && selectedPermAsgId) {
      fetchQuizPermissionsData(selectedPermAsgId);
    }
  }, [activeTab, selectedPermAsgId]);

  // Handle Enable Quiz for single student
  const handleEnableQuiz = async (studentId, permId) => {
    setPermActionLoading(studentId);
    try {
      const res = await fetch('/api/quiz-permissions', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          studentId,
          assignmentId: selectedPermAsgId,
          status: 'available'
        })
      });
      if (res.ok) {
        await fetchQuizPermissionsData(selectedPermAsgId);
        if (onRefreshData) onRefreshData();
      } else {
        const err = await res.json();
        alert('Failed to enable quiz: ' + (err.error || 'Server error'));
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setPermActionLoading(null);
    }
  };

  // Handle Revoke Access
  const handleRevokeQuiz = async (permId, studentId) => {
    setPermActionLoading(studentId);
    try {
      if (permId) {
        const res = await fetch(`/api/quiz-permissions/${permId}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ status: 'revoked' })
        });
        if (res.ok) {
          await fetchQuizPermissionsData(selectedPermAsgId);
          if (onRefreshData) onRefreshData();
        }
      } else {
        // If permId wasn't known, post with status revoked
        const res = await fetch('/api/quiz-permissions', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            studentId,
            assignmentId: selectedPermAsgId,
            status: 'revoked'
          })
        });
        if (res.ok) {
          await fetchQuizPermissionsData(selectedPermAsgId);
          if (onRefreshData) onRefreshData();
        }
      }
    } catch (err) {
      alert('Error revoking quiz: ' + err.message);
    } finally {
      setPermActionLoading(null);
    }
  };

  // Handle Approve Quiz Request
  const handleApproveRequest = async (request) => {
    try {
      // 1. PUT quiz-requests/:id -> status: 'approved'
      const putRes = await fetch(`/api/quiz-requests/${request.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: 'approved' })
      });

      // 2. POST /api/quiz-permissions -> status: 'available'
      await fetch('/api/quiz-permissions', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          studentId: request.studentId,
          assignmentId: request.assignmentId,
          status: 'available'
        })
      });

      if (putRes.ok) {
        await fetchQuizPermissionsData(selectedPermAsgId);
        if (onRefreshData) onRefreshData();
      }
    } catch (err) {
      alert('Error approving request: ' + err.message);
    }
  };

  // Handle Reject Quiz Request
  const handleRejectRequest = async () => {
    if (!rejectModalReq) return;
    try {
      const res = await fetch(`/api/quiz-requests/${rejectModalReq.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          status: 'rejected',
          reviewNote: rejectNote || 'Code did not pass plagiarism/integrity standards'
        })
      });
      if (res.ok) {
        setRejectModalReq(null);
        setRejectNote('');
        await fetchQuizPermissionsData(selectedPermAsgId);
        if (onRefreshData) onRefreshData();
      }
    } catch (err) {
      alert('Error rejecting request: ' + err.message);
    }
  };

  // Bulk Enable Quiz Access
  const handleBulkEnable = async () => {
    if (selectedStudentIds.length === 0) return;
    if (!window.confirm(`Enable quiz access for ${selectedStudentIds.length} selected students?`)) return;

    try {
      setIsLoadingPerms(true);
      await Promise.all(
        selectedStudentIds.map(sid =>
          fetch('/api/quiz-permissions', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
              studentId: sid,
              assignmentId: selectedPermAsgId,
              status: 'available'
            })
          })
        )
      );
      setSelectedStudentIds([]);
      await fetchQuizPermissionsData(selectedPermAsgId);
      if (onRefreshData) onRefreshData();
    } catch (err) {
      alert('Error during bulk enable: ' + err.message);
    } finally {
      setIsLoadingPerms(false);
    }
  };

  // ==========================================
  // DATA FETCHING: STUDENT DETAILS TAB
  // ==========================================
  const fetchStudentDetail = async (studentId) => {
    setSelectedStudentId(studentId);
    setIsLoadingStudentDetail(true);
    try {
      const res = await fetch(`/api/teacher/student-detail/${studentId}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setStudentDetailData(data);
      } else {
        // Fallback: derive from submissions & assignments prop
        const studentSubs = submissions.filter(s => s.studentId === studentId);
        const sub = studentSubs[0];
        setStudentDetailData({
          student: {
            id: studentId,
            name: sub?.studentName || 'Student',
            rollNo: sub?.rollNo || 'N/A',
            department: sub?.department || 'Computer Engineering',
            division: sub?.division || 'A',
            email: `${sub?.studentName?.toLowerCase().replace(/\s+/g, '') || 'student'}@jspm.edu`
          },
          submissions: studentSubs,
          quizPermissions: [],
          vivaSubmissions: [],
          quizRequests: []
        });
      }
    } catch (err) {
      console.error('Error fetching student details:', err);
    } finally {
      setIsLoadingStudentDetail(false);
    }
  };

  // Derive unique student list for Student Details list view
  const allStudentsList = useMemo(() => {
    const map = new Map();
    // First from submissions
    submissions.forEach(s => {
      if (s.studentId && !map.has(s.studentId)) {
        map.set(s.studentId, {
          id: s.studentId,
          name: s.studentName,
          rollNo: s.rollNo,
          department: s.department || 'Computer Engineering',
          division: s.division || 'A',
          totalSubs: submissions.filter(item => item.studentId === s.studentId).length,
          lastSubAt: s.submittedAt
        });
      }
    });
    // Add default enrolled demo students if not in map
    const demoStudents = [
      { id: 'usr_student_1', name: 'Vansh Deshmukh', rollNo: 'CE2025-01', department: 'Computer Engineering', division: 'A' },
      { id: 'usr_student_2', name: 'Jaydeep Dhumal', rollNo: 'CE2025-02', department: 'Computer Engineering', division: 'A' },
      { id: 'usr_student_3', name: 'Omkar Chede', rollNo: 'CE2025-03', department: 'Computer Engineering', division: 'A' }
    ];
    demoStudents.forEach(ds => {
      if (!map.has(ds.id)) {
        map.set(ds.id, {
          ...ds,
          totalSubs: submissions.filter(item => item.studentId === ds.id).length,
          lastSubAt: null
        });
      }
    });
    return Array.from(map.values());
  }, [submissions]);

  // ==========================================
  // DATA FETCHING: VIVA REVIEW TAB
  // ==========================================
  const fetchVivaSubmissions = async (asgId) => {
    if (!asgId) return;
    setIsLoadingVivas(true);
    try {
      const res = await fetch(`/api/viva/submissions/${asgId}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setVivaSubmissions(Array.isArray(data) ? data : []);
      } else {
        // Fallback: derive from assignment submissions
        const asgSubs = submissions.filter(s => s.assignmentId === asgId);
        const derived = asgSubs.map(sub => ({
          id: `viva_${sub.id}`,
          submissionId: sub.id,
          studentId: sub.studentId,
          studentName: sub.studentName,
          rollNo: sub.rollNo,
          assignmentId: sub.assignmentId,
          originalCode: sub.code || '# No submission code',
          vivaCode: sub.code 
            ? `# Interactive AI Viva Re-Implementation\n# Demonstrated by ${sub.studentName}\n` + sub.code
            : '# No viva code available',
          similarityScore: sub.tier1Score ?? 85,
          timestamp: sub.submittedAt || new Date().toISOString(),
          reviewStatus: sub.quizPassed ? 'Verified' : 'Needs Review'
        }));
        setVivaSubmissions(derived);
      }
    } catch (err) {
      console.error('Error fetching viva submissions:', err);
    } finally {
      setIsLoadingVivas(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'viva_review' && selectedVivaAsgId) {
      fetchVivaSubmissions(selectedVivaAsgId);
    }
  }, [activeTab, selectedVivaAsgId]);

  // Update viva review status
  const handleUpdateVivaStatus = async (vivaId, status) => {
    setIsUpdatingViva(true);
    try {
      const res = await fetch(`/api/viva/submissions/${vivaId}/review`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          reviewStatus: status,
          notes: vivaReviewNote
        })
      });
      // Local state update
      setVivaSubmissions(prev =>
        prev.map(v => (v.id === vivaId ? { ...v, reviewStatus: status, reviewNotes: vivaReviewNote } : v))
      );
      if (selectedVivaComparison && selectedVivaComparison.id === vivaId) {
        setSelectedVivaComparison(prev => ({ ...prev, reviewStatus: status, reviewNotes: vivaReviewNote }));
      }
    } catch (err) {
      alert('Error updating viva status: ' + err.message);
    } finally {
      setIsUpdatingViva(false);
    }
  };

  // Copy code snippet helper
  const handleCopyCode = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeType(type);
    setTimeout(() => setCopiedCodeType(null), 2000);
  };

  // AI Auto-Generate Test Cases
  const handleAiGenerateTestcases = async () => {
    if (!title || !title.trim()) {
      alert('Please enter an Assignment Title first.');
      return;
    }
    setIsGeneratingAiTestcases(true);
    try {
      const res = await fetch('/api/assignments/generate-testcases', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title,
          description: desc,
          language: 'cpp'
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.testcases) && data.testcases.length > 0) {
          setTestcases(data.testcases.map(tc => ({
            input: String(tc.input ?? '').replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').trim(),
            expectedOutput: String(tc.expectedOutput ?? '').replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').trim(),
            explanation: String(tc.explanation ?? '').trim()
          })));
        }
      }
    } catch (err) {
      console.warn('AI testcases generation error:', err);
    } finally {
      setIsGeneratingAiTestcases(false);
    }
  };

  // Handle assignment creation
  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    setIsSubmittingAsg(true);
    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title,
          subject,
          code,
          deadline: new Date(deadline).toISOString(),
          minQuizScore: Number(minQuiz),
          description: desc,
          problemStatement: desc,
          inputFormat,
          outputFormat,
          constraints,
          department: targetDepartment || currentUser?.department || 'Computer Engineering',
          division: targetDivision,
          divisions: targetDivision === 'all' ? ['A', 'B', 'C'] : [targetDivision],
          languages: ['python', 'cpp', 'c', 'java', 'javascript'],
          testcases: testcases || [],
          examples: testcases || [],
          starterCode: {
            python: '# Python Solution\nprint("Hello World")\n',
            cpp: '// C++ Solution\n#include <iostream>\nusing namespace std;\n\nint main() {\n    return 0;\n}\n',
            c: '// C Solution\n#include <stdio.h>\n\nint main() {\n    return 0;\n}\n',
            java: '// Java Solution\npublic class Solution {\n    public static void main(String[] args) {\n    }\n}\n',
            javascript: '// JavaScript Solution\nconsole.log("Hello World");\n'
          }
        })
      });

      if (res.ok) {
        setIsCreateModalOpen(false);
        if (onRefreshData) onRefreshData();
        setTitle('');
        setDesc('');
        setInputFormat('');
        setOutputFormat('');
        setConstraints('');
        setTestcases([]);
        setTargetDivision('all');
      } else {
        const err = await res.json();
        alert('Error: ' + (err.error || 'Failed to create assignment'));
      }
    } catch (err) {
      alert('Error creating assignment: ' + err.message);
    } finally {
      setIsSubmittingAsg(false);
    }
  };

  // Open Edit Modal for an assignment
  const handleOpenEditModal = (asg) => {
    setEditingAsgId(asg.id);
    setTitle(asg.title || '');
    setSubject(asg.subject || 'Data Structures & Algorithms');
    setCode(asg.code || '');
    setDeadline(asg.deadline ? asg.deadline.split('T')[0] : '2026-11-15');
    setMinQuiz(asg.minQuizScore || 70);
    setDesc(asg.problemStatement || asg.description || '');
    setInputFormat(asg.inputFormat || '');
    setOutputFormat(asg.outputFormat || '');
    setConstraints(asg.constraints || '');
    setTargetDepartment(asg.department || currentUser?.department || 'Computer Engineering');
    setTargetDivision(asg.division || 'all');
    const existingCases = (Array.isArray(asg.examples) && asg.examples.length > 0)
      ? asg.examples
      : (Array.isArray(asg.testcases) ? asg.testcases : []);
    setTestcases(existingCases.map(tc => ({
      input: tc.input || '',
      expectedOutput: tc.expectedOutput || '',
      explanation: tc.explanation || ''
    })));
    setIsEditModalOpen(true);
  };

  // Handle assignment update
  const handleUpdateAssignment = async (e) => {
    e.preventDefault();
    if (!editingAsgId) return;
    setIsSubmittingAsg(true);
    try {
      const res = await fetch(`/api/assignments/${editingAsgId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title,
          subject,
          code,
          deadline: new Date(deadline).toISOString(),
          minQuizScore: Number(minQuiz),
          description: desc,
          problemStatement: desc,
          inputFormat,
          outputFormat,
          constraints,
          department: targetDepartment || currentUser?.department || 'Computer Engineering',
          division: targetDivision,
          divisions: targetDivision === 'all' ? ['A', 'B', 'C'] : [targetDivision],
          testcases: testcases || [],
          examples: testcases || []
        })
      });

      if (res.ok) {
        setIsEditModalOpen(false);
        setEditingAsgId(null);
        if (onRefreshData) onRefreshData();
      } else {
        const err = await res.json();
        alert('Error: ' + (err.error || 'Failed to update assignment'));
      }
    } catch (err) {
      alert('Error updating assignment: ' + err.message);
    } finally {
      setIsSubmittingAsg(false);
    }
  };

  // ==========================================
  // TAB 1: POWER BI TELEMETRY CALCULATIONS
  // ==========================================
  const filteredSubmissions = useMemo(() => {
    return submissions.filter(s => {
      if (selectedAsgFilter !== 'all' && s.assignmentId !== selectedAsgFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          s.studentName?.toLowerCase().includes(q) ||
          s.rollNo?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [submissions, selectedAsgFilter, searchQuery]);

  const totalSubmissions = filteredSubmissions.length;
  const passedCount = filteredSubmissions.filter(s => s.quizPassed).length;
  const passRate = totalSubmissions > 0 ? Math.round((passedCount / totalSubmissions) * 100) : 0;
  
  const cleanCount = filteredSubmissions.filter(s => s.tier1Score < 35).length;
  const borderlineCount = filteredSubmissions.filter(s => s.tier1Score >= 35 && s.tier1Score < 75).length;
  const highPlagCount = filteredSubmissions.filter(s => s.tier1Score >= 75).length;

  const avgQuizScore = totalSubmissions > 0 
    ? Math.round(filteredSubmissions.reduce((a, b) => a + (b.quizScore || 0), 0) / totalSubmissions)
    : 0;

  const avgPlagiarism = totalSubmissions > 0
    ? Math.round(filteredSubmissions.reduce((a, b) => a + (b.tier1Score || 0), 0) / totalSubmissions)
    : 0;

  // Grade helper based on Quiz + Originality
  const getPerformanceGrade = (quizScore, plagScore) => {
    const composite = (quizScore * 0.7) + ((100 - plagScore) * 0.3);
    if (quizScore < 70) return { grade: 'Needs Retest', color: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800' };
    if (composite >= 88) return { grade: 'Grade A+ (Distinction)', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800' };
    if (composite >= 78) return { grade: 'Grade A (First Class)', color: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800' };
    return { grade: 'Grade B (Pass)', color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800' };
  };

  // Pending Quiz Requests Count for Badge
  const pendingRequestsCount = quizRequests.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      
      {/* Official Academic Print Header (Only visible on paper / PDF export) */}
      <div className="hidden print:block p-4 mb-4 bg-white border-b-2 border-slate-800">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">JSPM'S BSIOTR, WAGHOLI, PUNE</h1>
            <h2 className="text-xs font-bold text-slate-700">DEPARTMENT OF COMPUTER ENGINEERING</h2>
            <p className="text-[10px] text-slate-500 mt-0.5">Continuous Assessment & AI Code Validation Viva Performance Report</p>
          </div>
          <div className="text-right text-[10px] text-slate-600 space-y-0.5">
            <p><span className="font-bold">Faculty:</span> {currentUser?.name || 'Prof. Faculty'}</p>
            <p><span className="font-bold">Academic Year:</span> 2025-2026</p>
            <p><span className="font-bold">Generated:</span> {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
          </div>
        </div>
      </div>

      {/* ==========================================
          POWER BI / NAVIGATION RIBBON
      ========================================== */}
      <div className="no-print bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3 transition-colors">
        
        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('powerbi')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all card-float whitespace-nowrap ${
              activeTab === 'powerbi'
                ? 'bg-white dark:bg-indigo-600 text-indigo-700 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-white" />
            <span>📊 Performance Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('assignments')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all card-float whitespace-nowrap ${
              activeTab === 'assignments'
                ? 'bg-white dark:bg-indigo-600 text-indigo-700 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>Course Assignments</span>
          </button>

          <button
            onClick={() => setActiveTab('quiz_permissions')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all card-float whitespace-nowrap relative ${
              activeTab === 'quiz_permissions'
                ? 'bg-white dark:bg-indigo-600 text-indigo-700 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Quiz Permissions</span>
            {pendingRequestsCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black animate-pulse">
                {pendingRequestsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('student_details');
              setSelectedStudentId(null);
            }}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all card-float whitespace-nowrap ${
              activeTab === 'student_details'
                ? 'bg-white dark:bg-indigo-600 text-indigo-700 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Student Details</span>
          </button>

          <button
            onClick={() => setActiveTab('viva_review')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all card-float whitespace-nowrap ${
              activeTab === 'viva_review'
                ? 'bg-white dark:bg-indigo-600 text-indigo-700 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <GitCompare className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>Viva Review</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition card-float"
              title="Portal Settings"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Settings</span>
            </button>
          )}

          <button
            onClick={() => window.print()}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition card-float"
            title="Export / Print PDF Power BI Report"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Export Report</span>
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition card-float"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Create Assignment</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: POWER BI STUDENT PERFORMANCE EVALUATION DASHBOARD
      ========================================================================= */}
      {activeTab === 'powerbi' && (
        <div className="space-y-6">
          
          {/* Power BI Title Banner with Floating Badges */}
          <div className="relative bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-blue-500/10 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-slate-900 border border-indigo-200/60 dark:border-indigo-800/60 rounded-3xl p-6 shadow-xs overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 animate-float shrink-0">
                  <BarChart3 className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-indigo-600 text-white shadow-xs">
                      Power BI Telemetry
                    </span>
                    <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-400">
                      JSPM BSIOTR Computer Engineering
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                    Student Performance & Viva Marks Evaluation
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Real-time academic evaluation based on coding assignment originality and 10-question AI viva marks.
                  </p>
                </div>
              </div>

              {/* Assignment Filter Dropdown */}
              <div className="no-print flex items-center space-x-2 bg-white dark:bg-slate-800 px-3.5 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs card-float shrink-0">
                <Filter className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Filter Assignment:</span>
                <select
                  value={selectedAsgFilter}
                  onChange={(e) => setSelectedAsgFilter(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Assignments</option>
                  {assignments.map(a => (
                    <option key={a.id} value={a.id}>{a.title}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 4 Power BI KPI Cards with Floating Animations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* KPI 1: Submissions */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs card-float">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                <span>Evaluated Students</span>
                <Users className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-white mt-2">
                {totalSubmissions}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                <span>Total student assignment submissions</span>
              </div>
            </div>

            {/* KPI 2: Viva Pass Rate */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs card-float">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                <span>Viva Pass Rate</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
                {passRate}%
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-700" 
                  style={{ width: `${passRate}%` }}
                ></div>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {passedCount} of {totalSubmissions || 1} students cleared 70% benchmark
              </div>
            </div>

            {/* KPI 3: Avg Quiz Marks */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs card-float">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                <span>Avg 10-Question Score</span>
                <Award className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-3xl font-black text-blue-600 dark:text-blue-400 mt-2">
                {avgQuizScore}%
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Average marks on code understanding viva
              </div>
            </div>

            {/* KPI 4: Plagiarism Flagged */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs card-float">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                <span>Plagiarism Risk Alerts</span>
                <AlertTriangle className="w-4 h-4 text-red-500" />
              </div>
              <div className="text-3xl font-black text-red-600 dark:text-red-400 mt-2">
                {highPlagCount}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {highPlagCount > 0 ? `${highPlagCount} code submissions require audit` : 'Zero high-similarity violations'}
              </div>
            </div>

          </div>

          {/* Power BI Visual Performance Comparison Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Chart 1 (7 cols): Student Viva Score Comparison Bar Chart */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs card-float">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-indigo-600" />
                    Student Viva Marks vs. 70% Passing Benchmark
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Individual 10-question AI viva scores compared against passing standard
                  </p>
                </div>
                <span className="text-[11px] px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800">
                  Target: 70%
                </span>
              </div>

              {filteredSubmissions.length > 0 ? (
                <div className="space-y-4 pt-2">
                  {filteredSubmissions.map((sub) => {
                    const isPassed = (sub.quizScore || 0) >= 70;
                    return (
                      <div key={sub.id} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-800 dark:text-slate-200">{sub.studentName}</span>
                            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">({sub.rollNo})</span>
                          </div>
                          <span className={`font-mono font-extrabold ${isPassed ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            {sub.quizScore}% {isPassed ? '✓ Passed' : '✗ Below Benchmark'}
                          </span>
                        </div>

                        {/* Interactive Bar */}
                        <div className="relative w-full bg-slate-100 dark:bg-slate-800 h-3.5 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                          {/* 70% benchmark indicator line */}
                          <div 
                            className="absolute top-0 bottom-0 w-0.5 bg-slate-900 dark:bg-white z-10" 
                            style={{ left: '70%' }}
                            title="70% Passing Threshold"
                          ></div>
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              isPassed 
                                ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' 
                                : 'bg-gradient-to-r from-red-500 to-red-400'
                            }`}
                            style={{ width: `${Math.min(100, sub.quizScore || 0)}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500 text-xs">
                  No submissions recorded for this assignment yet.
                </div>
              )}
            </div>

            {/* Chart 2 (5 cols): Plagiarism Risk & Integrity Spectrum */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs card-float flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-purple-600" />
                    Code Originality & Plagiarism Risk
                  </h3>
                  <span className="text-[10px] font-mono text-slate-400">AY 2025-26</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
                  Cohort categorized by Tier-1 & Tier-2 similarity thresholds
                </p>

                {/* Visual Segment Bar */}
                <div className="h-5 w-full bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden flex border border-slate-200 dark:border-slate-700 mb-6">
                  <div 
                    className="bg-emerald-500 h-full transition-all duration-500" 
                    style={{ width: `${totalSubmissions > 0 ? (cleanCount / totalSubmissions) * 100 : 33}%` }}
                    title={`Clean: ${cleanCount}`}
                  ></div>
                  <div 
                    className="bg-amber-500 h-full transition-all duration-500" 
                    style={{ width: `${totalSubmissions > 0 ? (borderlineCount / totalSubmissions) * 100 : 33}%` }}
                    title={`Borderline: ${borderlineCount}`}
                  ></div>
                  <div 
                    className="bg-red-500 h-full transition-all duration-500" 
                    style={{ width: `${totalSubmissions > 0 ? (highPlagCount / totalSubmissions) * 100 : 34}%` }}
                    title={`High Plagiarism: ${highPlagCount}`}
                  ></div>
                </div>

                {/* Legend list */}
                <div className="space-y-3">
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Clean / Original (&lt;35%)</span>
                    </div>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{cleanCount} Student(s)</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Borderline / AI Checked (35-75%)</span>
                    </div>
                    <span className="font-bold text-amber-600 dark:text-amber-400">{borderlineCount} Student(s)</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="w-3 h-3 rounded-full bg-red-500"></span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">High Plagiarism (&gt;75%)</span>
                    </div>
                    <span className="font-bold text-red-600 dark:text-red-400">{highPlagCount} Student(s)</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>Avg Similarity: {avgPlagiarism}%</span>
                <span>Threshold: 70% passing</span>
              </div>
            </div>

          </div>

          {/* Student Performance Evaluation Table (Assignment & Quiz Marks) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden card-float">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Student Comprehensive Performance Evaluation
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Individual grades and scores based on assignment code originality and 10-question AI viva marks
                </p>
              </div>

              <div className="no-print relative w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search student or roll no..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600 font-medium"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Student / Roll No</th>
                    <th className="px-6 py-3.5">Assignment</th>
                    <th className="px-6 py-3.5">Plagiarism Result</th>
                    <th className="px-6 py-3.5">Viva Marks (10 Questions)</th>
                    <th className="px-6 py-3.5">Performance Grade</th>
                    <th className="px-6 py-3.5">GitHub Push</th>
                    <th className="no-print px-6 py-3.5 text-right">Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {filteredSubmissions.length > 0 ? (
                    filteredSubmissions.map((sub) => {
                      const gradeInfo = getPerformanceGrade(sub.quizScore || 0, sub.tier1Score || 0);

                      return (
                        <tr key={sub.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                          <td className="px-6 py-4">
                            <button
                              onClick={() => {
                                setActiveTab('student_details');
                                fetchStudentDetail(sub.studentId);
                              }}
                              className="text-left group"
                            >
                              <div className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition flex items-center gap-1">
                                <span>{sub.studentName}</span>
                                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
                              </div>
                              <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">{sub.rollNo}</div>
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-slate-800 dark:text-slate-200">{sub.assignmentTitle}</div>
                            <div className="text-[10px] text-slate-400 font-mono uppercase">{sub.language}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                              sub.tier1Score >= 75
                                ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800'
                                : sub.tier1Score >= 35
                                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                            }`}>
                              {sub.tier1Score}% Match
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-extrabold text-slate-900 dark:text-white text-sm">
                              {sub.quizScore}%
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {Math.round((sub.quizScore / 100) * 10)}/10 Correct
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${gradeInfo.color}`}>
                              {gradeInfo.grade}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs">
                            {sub.githubCommitSha ? (
                              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{sub.githubCommitSha.substring(0, 7)}</span>
                              </span>
                            ) : (
                              <span className="text-slate-400">Pending</span>
                            )}
                          </td>
                          <td className="no-print px-6 py-4 text-right">
                            <button
                              onClick={() => setSelectedSubmission(sub)}
                              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition card-float"
                            >
                              Inspect Code
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                        No student performance records match your filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* =========================================================================
          TAB 2: COURSE ASSIGNMENTS
      ========================================================================= */}
      {activeTab === 'assignments' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Active Programming Assignments</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Manage course assignments, deadlines, and minimum quiz pass marks.</p>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition card-float"
            >
              <Plus className="w-4 h-4" />
              <span>+ Create Assignment</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {assignments.map((asg) => {
              const asgSubs = submissions.filter(s => s.assignmentId === asg.id);
              const passedCount = asgSubs.filter(s => s.quizPassed).length;

              return (
                <div key={asg.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4 card-float transition">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 font-mono px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl border border-indigo-200 dark:border-indigo-800">
                          {asg.code}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          {asg.division && asg.division.toLowerCase() !== 'all' ? `Div ${asg.division}` : 'All Divs'}
                        </span>
                      </div>
                      <span className="text-[10px] px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                        {asgSubs.length} Submissions
                      </span>
                    </div>

                    <h4 className="font-extrabold text-base text-slate-900 dark:text-white">{asg.title}</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">{asg.description}</p>
                  </div>
                  
                  <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Deadline: {new Date(asg.deadline).toLocaleDateString()}</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold">Min Pass: {asg.minQuizScore}%</span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => {
                          setSelectedPermAsgId(asg.id);
                          setActiveTab('quiz_permissions');
                        }}
                        className="flex-1 py-2 px-3 text-center bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Manage Quizzes</span>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedVivaAsgId(asg.id);
                          setActiveTab('viva_review');
                        }}
                        className="py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition"
                        title="Review Viva Submissions"
                      >
                        <GitCompare className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleOpenEditModal(asg)}
                        className="py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition flex items-center gap-1"
                        title="Edit Assignment Specifications & Test Cases"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: QUIZ PERMISSIONS (PER-STUDENT, PER-ASSIGNMENT CONTROL)
      ========================================================================= */}
      {activeTab === 'quiz_permissions' && (
        <div className="space-y-6">
          
          {/* Header Controls Banner */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-600 text-white">
                  Access Management
                </span>
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  Per-Student Gatekeeping
                </span>
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                AI Viva Quiz Permission Gate
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Control which students are allowed to take the 10-question AI viva quiz. Approve incoming access requests or grant bulk access.
              </p>
            </div>

            {/* Assignment Switcher */}
            <div className="flex items-center space-x-3 bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 shrink-0">
              <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <div className="text-left">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Select Assignment</div>
                <select
                  value={selectedPermAsgId}
                  onChange={(e) => setSelectedPermAsgId(e.target.value)}
                  className="bg-transparent text-xs font-extrabold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                >
                  {assignments.map(a => (
                    <option key={a.id} value={a.id}>{a.code} — {a.title}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Pending Quiz Requests Banner (if any) */}
          {quizRequests.filter(r => r.status === 'pending').length > 0 && (
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300 dark:border-amber-800/60 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                      Pending Quiz Access Requests ({quizRequests.filter(r => r.status === 'pending').length})
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Students who have completed code validation and are awaiting teacher authorization to sit for the viva.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {quizRequests.filter(r => r.status === 'pending').map((req) => (
                  <div key={req.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-extrabold text-xs text-slate-900 dark:text-white">{req.studentName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">ID: {req.studentId}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        req.tier1Score >= 75
                          ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300'
                          : req.tier1Score >= 35
                          ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}>
                        {req.tier1Score}% Similarity
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl space-y-1">
                      <div className="flex justify-between">
                        <span>Requested:</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {new Date(req.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Status:</span>
                        <span className="font-bold text-amber-600 dark:text-amber-400">Awaiting Teacher</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 pt-1">
                      <button
                        onClick={() => handleApproveRequest(req)}
                        className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => {
                          setRejectModalReq(req);
                          setRejectNote('');
                        }}
                        className="py-1.5 px-3 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-600 dark:bg-slate-800 dark:hover:bg-red-950/50 dark:text-slate-300 dark:hover:text-red-400 text-xs font-bold rounded-xl transition"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Student Quiz Permission Table Section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden">
            
            {/* Table Action Ribbon */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                
                {/* Search */}
                <div className="relative w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search student or roll no..."
                    value={permSearch}
                    onChange={(e) => setPermSearch(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600 font-medium"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={permStatusFilter}
                  onChange={(e) => setPermStatusFilter(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 font-medium focus:outline-none"
                >
                  <option value="all">All Permissions</option>
                  <option value="available">Available (Unlocked)</option>
                  <option value="locked">Locked</option>
                  <option value="completed">Completed</option>
                  <option value="revoked">Revoked</option>
                </select>

                <button
                  onClick={() => fetchQuizPermissionsData(selectedPermAsgId)}
                  disabled={isLoadingPerms}
                  className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 transition"
                  title="Refresh permissions list"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPerms ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Bulk Actions */}
              <div className="flex items-center space-x-2">
                {selectedStudentIds.length > 0 && (
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    {selectedStudentIds.length} selected
                  </span>
                )}
                
                <button
                  onClick={handleBulkEnable}
                  disabled={selectedStudentIds.length === 0}
                  className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                    selectedStudentIds.length > 0
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs card-float'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Bulk Enable Access</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5 w-12">
                      <input
                        type="checkbox"
                        checked={
                          permStudents.length > 0 &&
                          selectedStudentIds.length === permStudents.length
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStudentIds(permStudents.map(s => s.id || s.studentId));
                          } else {
                            setSelectedStudentIds([]);
                          }
                        }}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </th>
                    <th className="px-6 py-3.5">Student Name / Roll No</th>
                    <th className="px-6 py-3.5">Code Submission Status</th>
                    <th className="px-6 py-3.5">Similarity Score</th>
                    <th className="px-6 py-3.5">Permission Status</th>
                    <th className="px-6 py-3.5">Quiz Score</th>
                    <th className="px-6 py-3.5 text-right">Gate Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {isLoadingPerms ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
                        Loading student quiz permissions...
                      </td>
                    </tr>
                  ) : permStudents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                        No students found for this assignment.
                      </td>
                    </tr>
                  ) : (
                    permStudents
                      .filter(st => {
                        const sId = st.id || st.studentId;
                        const sName = st.name || st.studentName || '';
                        const sRoll = st.rollNo || '';
                        const q = permSearch.toLowerCase();
                        if (q && !sName.toLowerCase().includes(q) && !sRoll.toLowerCase().includes(q)) return false;
                        
                        const status = st.permissionStatus || 'locked';
                        if (permStatusFilter !== 'all' && status !== permStatusFilter) return false;
                        return true;
                      })
                      .map((st) => {
                        const sId = st.id || st.studentId;
                        const isSelected = selectedStudentIds.includes(sId);
                        const hasSubmitted = st.hasSubmitted || !!st.submission;
                        const sub = st.submission;
                        const permStatus = st.permissionStatus || 'locked';
                        const permId = st.quizPermission?.id || st.permissionId;
                        const isActionLoading = permActionLoading === sId;

                        return (
                          <tr key={sId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                            <td className="px-6 py-4">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedStudentIds(prev => [...prev, sId]);
                                  } else {
                                    setSelectedStudentIds(prev => prev.filter(id => id !== sId));
                                  }
                                }}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                            </td>

                            <td className="px-6 py-4">
                              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <span>{st.name || st.studentName}</span>
                              </div>
                              <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">
                                {st.rollNo} • {st.division ? `Div ${st.division}` : 'CE'}
                              </div>
                            </td>

                            <td className="px-6 py-4">
                              {hasSubmitted ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Submitted</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                                  <Clock className="w-3 h-3" />
                                  <span>Pending</span>
                                </span>
                              )}
                            </td>

                            <td className="px-6 py-4">
                              {sub ? (
                                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                                  (sub.tier1Score ?? 0) >= 75
                                    ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800'
                                    : (sub.tier1Score ?? 0) >= 35
                                    ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                                }`}>
                                  {sub.tier1Score ?? 0}% Match
                                </span>
                              ) : (
                                <span className="text-slate-400 text-xs">—</span>
                              )}
                            </td>

                            <td className="px-6 py-4">
                              {permStatus === 'available' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
                                  <Unlock className="w-3 h-3" />
                                  <span>Available (Unlocked)</span>
                                </span>
                              )}
                              {permStatus === 'completed' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Completed</span>
                                </span>
                              )}
                              {permStatus === 'revoked' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800">
                                  <Lock className="w-3 h-3" />
                                  <span>Revoked</span>
                                </span>
                              )}
                              {permStatus === 'locked' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                                  <Lock className="w-3 h-3" />
                                  <span>Locked</span>
                                </span>
                              )}
                            </td>

                            <td className="px-6 py-4">
                              {sub?.quizScore !== undefined && sub?.quizScore !== null ? (
                                <div className="font-extrabold text-slate-900 dark:text-white">
                                  {sub.quizScore}%
                                  <span className="text-[10px] text-slate-400 ml-1 font-normal">
                                    {sub.quizPassed ? '(Passed)' : '(Failed)'}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>

                            <td className="px-6 py-4 text-right">
                              {permStatus === 'available' ? (
                                <button
                                  onClick={() => handleRevokeQuiz(permId, sId)}
                                  disabled={isActionLoading}
                                  className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-bold transition flex items-center gap-1 ml-auto"
                                >
                                  <Lock className="w-3 h-3" />
                                  <span>Revoke Access</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleEnableQuiz(sId, permId)}
                                  disabled={isActionLoading}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition flex items-center gap-1 ml-auto"
                                >
                                  <Unlock className="w-3 h-3" />
                                  <span>Enable Quiz</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Reject Note Modal */}
          {rejectModalReq && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                    Reject Quiz Request: {rejectModalReq.studentName}
                  </h4>
                  <button
                    onClick={() => setRejectModalReq(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3">
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Provide instructions or feedback to the student regarding why their request was denied (e.g. high code similarity, need to re-implement specific function).
                  </p>

                  <textarea
                    rows={4}
                    placeholder="Enter review note for the student..."
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-red-500 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setRejectModalReq(null)}
                    className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleRejectRequest}
                    className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow-xs"
                  >
                    Confirm Rejection
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* =========================================================================
          TAB 4: STUDENT DETAILS (INDIVIDUAL STUDENT RECORD VIEW)
      ========================================================================= */}
      {activeTab === 'student_details' && (
        <div className="space-y-6">
          
          {/* If a student is selected, render full profile view */}
          {selectedStudentId && studentDetailData ? (
            <div className="space-y-6 animate-in fade-in">
              
              {/* Back navigation & Header */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setSelectedStudentId(null)}
                  className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition card-float"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Student Directory</span>
                </button>
              </div>

              {/* Student Profile Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 card-float">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-500/20">
                    {studentDetailData.student?.name?.substring(0, 2).toUpperCase() || 'ST'}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800">
                        Enrolled Student
                      </span>
                      <span className="text-xs font-mono text-slate-500">
                        {studentDetailData.student?.rollNo}
                      </span>
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                      {studentDetailData.student?.name}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {studentDetailData.student?.email} • {studentDetailData.student?.department || 'Computer Engineering'} (Div {studentDetailData.student?.division || 'A'})
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Total Submissions</div>
                    <div className="text-xl font-black text-slate-900 dark:text-white">
                      {studentDetailData.submissions?.length || 0}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4 Performance KPI Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
                  <div className="text-slate-400 text-xs font-bold uppercase">Submissions Evaluated</div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                    {studentDetailData.submissions?.length || 0}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">Across all coursework assignments</div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
                  <div className="text-slate-400 text-xs font-bold uppercase">Average Plagiarism</div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                    {studentDetailData.stats?.avgSimilarity ?? (
                      studentDetailData.submissions?.length > 0
                        ? Math.round(studentDetailData.submissions.reduce((a, b) => a + (b.tier1Score || 0), 0) / studentDetailData.submissions.length)
                        : 0
                    )}%
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">Tier-1 & AST similarity metric</div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
                  <div className="text-slate-400 text-xs font-bold uppercase">Average Viva Marks</div>
                  <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-2">
                    {studentDetailData.stats?.avgQuizScore ?? (
                      studentDetailData.submissions?.length > 0
                        ? Math.round(studentDetailData.submissions.reduce((a, b) => a + (b.quizScore || 0), 0) / studentDetailData.submissions.length)
                        : 0
                    )}%
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">10-question AI viva scores</div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
                  <div className="text-slate-400 text-xs font-bold uppercase">Viva Quizzes Cleared</div>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
                    {studentDetailData.submissions?.filter(s => s.quizPassed).length || 0}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">Scored &gt;= 70% passing standard</div>
                </div>
              </div>

              {/* All Submissions by this student */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      Assignment Submission Records
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Code submissions, originality scores, AI viva performance, and repository commits
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {studentDetailData.submissions?.length || 0} Records
                  </span>
                </div>

                {studentDetailData.submissions && studentDetailData.submissions.length > 0 ? (
                  <div className="space-y-3">
                    {studentDetailData.submissions.map((sub) => (
                      <div key={sub.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                            {sub.assignmentTitle || sub.assignmentId}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-3">
                            <span>Language: <strong className="uppercase text-slate-700 dark:text-slate-300">{sub.language || 'python'}</strong></span>
                            <span>Submitted: {new Date(sub.submittedAt).toLocaleDateString()}</span>
                            {sub.githubCommitSha && (
                              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                                SHA: {sub.githubCommitSha.substring(0, 7)}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                            sub.tier1Score >= 75
                              ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300'
                              : sub.tier1Score >= 35
                              ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}>
                            {sub.tier1Score}% Match
                          </span>

                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                            sub.quizPassed
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300'
                          }`}>
                            Viva: {sub.quizScore}% {sub.quizPassed ? 'Passed' : 'Failed'}
                          </span>

                          <button
                            onClick={() => setStudentInspectCode(sub)}
                            className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition"
                          >
                            View Code
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-xs text-slate-400">
                    No assignment submissions recorded for this student yet.
                  </div>
                )}
              </div>

              {/* Quiz Permission & Requests History */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Permission History */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-3">
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    Quiz Permissions History
                  </h4>
                  {studentDetailData.quizPermissions && studentDetailData.quizPermissions.length > 0 ? (
                    <div className="space-y-2">
                      {studentDetailData.quizPermissions.map(p => (
                        <div key={p.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs flex justify-between items-center">
                          <div>
                            <div className="font-bold text-slate-800 dark:text-slate-200">{p.assignmentId}</div>
                            <div className="text-[10px] text-slate-400">Granted: {new Date(p.grantedAt).toLocaleDateString()}</div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            {p.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 py-4 text-center">No explicit permission records found.</p>
                  )}
                </div>

                {/* Quiz Requests History */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-3">
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500" />
                    Quiz Access Requests
                  </h4>
                  {studentDetailData.quizRequests && studentDetailData.quizRequests.length > 0 ? (
                    <div className="space-y-2">
                      {studentDetailData.quizRequests.map(r => (
                        <div key={r.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs flex justify-between items-center">
                          <div>
                            <div className="font-bold text-slate-800 dark:text-slate-200">{r.assignmentTitle || r.assignmentId}</div>
                            <div className="text-[10px] text-slate-400">{new Date(r.requestedAt).toLocaleDateString()}</div>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            r.status === 'approved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                            r.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' :
                            'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}>
                            {r.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 py-4 text-center">No quiz requests sent by student.</p>
                  )}
                </div>

              </div>

            </div>
          ) : (
            
            // Student Directory list view
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Student Academic Records</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Browse individual student dossiers, past submissions, and viva historical data.</p>
                </div>

                <div className="relative w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search by name or roll no..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {allStudentsList
                  .filter(st => {
                    const q = studentSearch.toLowerCase();
                    return !q || st.name.toLowerCase().includes(q) || st.rollNo?.toLowerCase().includes(q);
                  })
                  .map((st) => (
                    <div key={st.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4 card-float flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3.5">
                          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-extrabold flex items-center justify-center text-sm border border-indigo-200 dark:border-indigo-800">
                            {st.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">{st.name}</h4>
                            <div className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400">{st.rollNo}</div>
                          </div>
                        </div>

                        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs text-slate-500 space-y-1">
                          <div className="flex justify-between">
                            <span>Department:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{st.department}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Division:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{st.division}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total Submissions:</span>
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">{st.totalSubs}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => fetchStudentDetail(st.id)}
                        className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 card-float"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>View Student Record</span>
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Student Code Inspection Modal in Details tab */}
          {studentInspectCode && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                      {studentInspectCode.assignmentTitle} Solution
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Plagiarism: {studentInspectCode.tier1Score}% • Viva Score: {studentInspectCode.quizScore}%
                    </p>
                  </div>
                  <button
                    onClick={() => setStudentInspectCode(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <pre className="p-4 bg-slate-900 text-emerald-400 font-['Fira_Code',monospace] text-xs rounded-2xl max-h-96 overflow-y-auto leading-relaxed">
                  {studentInspectCode.code}
                </pre>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setStudentInspectCode(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* =========================================================================
          TAB 5: VIVA REVIEW (VIVA CODE COMPARISON REVIEW)
      ========================================================================= */}
      {activeTab === 'viva_review' && (
        <div className="space-y-6">
          
          {/* Header Banner */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-purple-600 text-white">
                  Viva Forensic Audit
                </span>
                <span className="text-xs font-semibold text-purple-700 dark:text-purple-400">
                  Side-by-Side Verification
                </span>
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Viva Code Authorship & Review
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Compare original student submissions against viva interactive re-implementation to verify true conceptual ownership.
              </p>
            </div>

            {/* Assignment Switcher */}
            <div className="flex items-center space-x-3 bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 shrink-0">
              <BookOpen className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <div className="text-left">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Assignment</div>
                <select
                  value={selectedVivaAsgId}
                  onChange={(e) => setSelectedVivaAsgId(e.target.value)}
                  className="bg-transparent text-xs font-extrabold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                >
                  {assignments.map(a => (
                    <option key={a.id} value={a.id}>{a.code} — {a.title}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Heuristic Disclaimer Alert */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 flex items-start space-x-3">
            <HelpCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div className="text-xs text-indigo-900 dark:text-indigo-200 space-y-0.5">
              <div className="font-bold">Evaluation Principle: Heuristic Authorship Indicator</div>
              <p className="text-indigo-700/80 dark:text-indigo-300/80">
                Similarity is a heuristic estimate, not proof of authorship. Evaluate student conceptual explanation in context with viva questions.
              </p>
            </div>
          </div>

          {/* Viva Submissions Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="relative w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search student or roll no..."
                    value={vivaSearch}
                    onChange={(e) => setVivaSearch(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600 font-medium"
                  />
                </div>

                <select
                  value={vivaStatusFilter}
                  onChange={(e) => setVivaStatusFilter(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 font-medium focus:outline-none"
                >
                  <option value="all">All Review Statuses</option>
                  <option value="Verified">Verified</option>
                  <option value="Needs Review">Needs Review</option>
                </select>

                <button
                  onClick={() => fetchVivaSubmissions(selectedVivaAsgId)}
                  disabled={isLoadingVivas}
                  className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 transition"
                  title="Refresh viva records"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingVivas ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="text-xs font-bold text-slate-500">
                {vivaSubmissions.length} Submissions Evaluated
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Student Name / Roll No</th>
                    <th className="px-6 py-3.5">Original Code Preview</th>
                    <th className="px-6 py-3.5">Viva Code Preview</th>
                    <th className="px-6 py-3.5">Similarity %</th>
                    <th className="px-6 py-3.5">Timestamp</th>
                    <th className="px-6 py-3.5">Review Status</th>
                    <th className="px-6 py-3.5 text-right">Audit Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {isLoadingVivas ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-purple-600 mb-2" />
                        Loading viva comparison submissions...
                      </td>
                    </tr>
                  ) : vivaSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                        No viva submissions recorded for this assignment yet.
                      </td>
                    </tr>
                  ) : (
                    vivaSubmissions
                      .filter(v => {
                        const q = vivaSearch.toLowerCase();
                        if (q && !v.studentName?.toLowerCase().includes(q) && !v.rollNo?.toLowerCase().includes(q)) return false;
                        if (vivaStatusFilter !== 'all' && v.reviewStatus !== vivaStatusFilter) return false;
                        return true;
                      })
                      .map((viva) => (
                        <tr key={viva.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-900 dark:text-white">{viva.studentName}</div>
                            <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">{viva.rollNo}</div>
                          </td>

                          <td className="px-6 py-4 max-w-xs font-mono text-[11px] text-slate-600 dark:text-slate-400 truncate">
                            {viva.originalCode ? viva.originalCode.substring(0, 45) + '...' : '—'}
                          </td>

                          <td className="px-6 py-4 max-w-xs font-mono text-[11px] text-slate-600 dark:text-slate-400 truncate">
                            {viva.vivaCode ? viva.vivaCode.substring(0, 45) + '...' : '—'}
                          </td>

                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                              (viva.similarityScore ?? 0) >= 80
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                                : (viva.similarityScore ?? 0) >= 60
                                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
                                : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800'
                            }`}>
                              {viva.similarityScore ?? 0}% Match
                            </span>
                          </td>

                          <td className="px-6 py-4 text-slate-500 text-[11px]">
                            {new Date(viva.timestamp || viva.createdAt).toLocaleDateString()}
                          </td>

                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              viva.reviewStatus === 'Verified'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300'
                                : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300'
                            }`}>
                              {viva.reviewStatus || 'Needs Review'}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => {
                                setSelectedVivaComparison(viva);
                                setVivaReviewNote(viva.reviewNotes || '');
                              }}
                              className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition card-float"
                            >
                              Compare Code
                            </button>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Side-by-Side Code Comparison Modal */}
          {selectedVivaComparison && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-6xl w-full max-h-[92vh] flex flex-col overflow-hidden">
                
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-600 text-white">
                        Viva Code Comparison
                      </span>
                      <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                        {selectedVivaComparison.rollNo}
                      </span>
                    </div>
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white mt-0.5">
                      {selectedVivaComparison.studentName} — Authorship Verification
                    </h3>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      (selectedVivaComparison.similarityScore ?? 0) >= 80
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300'
                    }`}>
                      {selectedVivaComparison.similarityScore ?? 0}% Similarity
                    </span>

                    <button
                      onClick={() => setSelectedVivaComparison(null)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Heuristic Notice Strip */}
                <div className="px-6 py-2.5 bg-indigo-50/50 dark:bg-indigo-950/20 border-b border-indigo-100 dark:border-indigo-900/40 text-[11px] text-indigo-800 dark:text-indigo-300 flex items-center justify-between">
                  <span>ℹ️ Similarity is a heuristic estimate, not proof of authorship.</span>
                  <span className="font-semibold">Review Status: {selectedVivaComparison.reviewStatus || 'Needs Review'}</span>
                </div>

                {/* Code Comparison Panels */}
                <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Left: Original Submission */}
                  <div className="space-y-2 flex flex-col">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                        <FileCode className="w-4 h-4 text-indigo-500" />
                        <span>Original Submitted Code</span>
                      </div>
                      <button
                        onClick={() => handleCopyCode(selectedVivaComparison.originalCode || '', 'orig')}
                        className="flex items-center space-x-1 text-[11px] text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copiedCodeType === 'orig' ? 'Copied!' : 'Copy'}</span>
                      </button>
                    </div>

                    <pre className="p-4 bg-slate-900 text-slate-200 font-['Fira_Code',monospace] text-xs rounded-2xl flex-1 max-h-[420px] overflow-auto leading-relaxed border border-slate-800">
                      {selectedVivaComparison.originalCode || '# No original code recorded'}
                    </pre>
                  </div>

                  {/* Right: Viva Code */}
                  <div className="space-y-2 flex flex-col">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                        <Code2 className="w-4 h-4 text-purple-500" />
                        <span>Viva Interactive Code</span>
                      </div>
                      <button
                        onClick={() => handleCopyCode(selectedVivaComparison.vivaCode || '', 'viva')}
                        className="flex items-center space-x-1 text-[11px] text-slate-500 hover:text-purple-600 dark:hover:text-purple-400"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copiedCodeType === 'viva' ? 'Copied!' : 'Copy'}</span>
                      </button>
                    </div>

                    <pre className="p-4 bg-slate-900 text-emerald-400 font-['Fira_Code',monospace] text-xs rounded-2xl flex-1 max-h-[420px] overflow-auto leading-relaxed border border-slate-800">
                      {selectedVivaComparison.vivaCode || '# No viva code recorded'}
                    </pre>
                  </div>

                </div>

                {/* Audit Actions & Notes Footer */}
                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="w-full sm:w-1/2">
                    <input
                      type="text"
                      placeholder="Teacher review audit notes (optional)..."
                      value={vivaReviewNote}
                      onChange={(e) => setVivaReviewNote(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600"
                    />
                  </div>

                  <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end">
                    <button
                      onClick={() => handleUpdateVivaStatus(selectedVivaComparison.id, 'Needs Review')}
                      disabled={isUpdatingViva}
                      className="px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-bold transition"
                    >
                      Mark Needs Review
                    </button>

                    <button
                      onClick={() => handleUpdateVivaStatus(selectedVivaComparison.id, 'Verified')}
                      disabled={isUpdatingViva}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>Mark Verified ✓</span>
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      )}

      {/* =========================================================================
          GLOBAL MODALS
      ========================================================================= */}

      {/* 1. Code Inspection Modal (for Tab 1 Power BI) */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Student Solution: {selectedSubmission.studentName} ({selectedSubmission.rollNo})
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedSubmission.assignmentTitle} • Plagiarism: {selectedSubmission.tier1Score}% • 10-Question Viva: {selectedSubmission.quizScore}%
                </p>
              </div>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <pre className="p-4 bg-slate-900 text-emerald-400 font-['Fira_Code',monospace] text-xs rounded-2xl max-h-96 overflow-y-auto leading-relaxed">
              {selectedSubmission.code}
            </pre>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedSubmission(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Create Assignment Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                Create New Programming Assignment
              </h4>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Assignment Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Graph Traversal: BFS & DFS"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-600 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Course Code</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-600 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Deadline Date</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-600 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Subject</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-600 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Min Passing Viva Score (%)</label>
                  <input
                    type="number"
                    min="50"
                    max="100"
                    value={minQuiz}
                    onChange={(e) => setMinQuiz(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-600 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Target Department</label>
                  <input
                    type="text"
                    value={targetDepartment}
                    onChange={(e) => setTargetDepartment(e.target.value)}
                    placeholder="e.g. Computer Engineering"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-600 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Target Division</label>
                  <select
                    value={targetDivision}
                    onChange={(e) => setTargetDivision(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-600 text-slate-900 dark:text-white"
                  >
                    <option value="all">All Divisions (A, B, C)</option>
                    <option value="A">Division A Only</option>
                    <option value="B">Division B Only</option>
                    <option value="C">Division C Only</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Problem Description</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain the problem statement..."
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-600 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1 text-xs">Input Format (Optional)</label>
                  <input
                    type="text"
                    value={inputFormat}
                    onChange={(e) => setInputFormat(e.target.value)}
                    placeholder="e.g. Space-separated integers on line 1"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1 text-xs">Output Format (Optional)</label>
                  <input
                    type="text"
                    value={outputFormat}
                    onChange={(e) => setOutputFormat(e.target.value)}
                    placeholder="e.g. A single integer or boolean string"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1 text-xs">Constraints (Optional)</label>
                <input
                  type="text"
                  value={constraints}
                  onChange={(e) => setConstraints(e.target.value)}
                  placeholder="e.g. 1 <= N <= 10^5, -10^9 <= val <= 10^9"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white"
                />
              </div>

              {/* LeetCode Testcases Configuration & AI Generator */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 dark:text-slate-200 block text-xs flex items-center gap-1.5">
                    <span>🧪 Assignment Test Cases ({testcases.length})</span>
                    <span className="text-[10px] text-slate-500 font-normal">(LeetCode Style Stdin &amp; Output)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAiGenerateTestcases}
                    disabled={isGeneratingAiTestcases}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs transition"
                  >
                    {isGeneratingAiTestcases ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-amber-300" />}
                    <span>{isGeneratingAiTestcases ? 'Generating...' : '✨ AI Generate Testcases'}</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {testcases.map((tc, idx) => (
                    <div key={idx} className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">Case {idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => setTestcases(prev => prev.filter((_, i) => i !== idx))}
                          className="text-rose-500 hover:text-rose-700 font-bold text-[10px]"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <textarea
                          rows={2}
                          placeholder="Input (stdin)"
                          value={tc.input || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTestcases(prev => prev.map((t, i) => i === idx ? { ...t, input: val } : t));
                          }}
                          className="p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-mono text-slate-900 dark:text-white resize-y"
                        />
                        <textarea
                          rows={2}
                          placeholder="Expected Output"
                          value={tc.expectedOutput || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTestcases(prev => prev.map((t, i) => i === idx ? { ...t, expectedOutput: val } : t));
                          }}
                          className="p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-mono text-slate-900 dark:text-white resize-y"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setTestcases(prev => [...prev, { input: '', expectedOutput: '', explanation: '' }])}
                  className="w-full py-1 text-center text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  + Add Custom Testcase
                </button>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAsg}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition shadow-xs flex items-center gap-1.5"
                >
                  {isSubmittingAsg && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Publish Assignment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Assignment Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <Edit className="w-5 h-5 text-indigo-600" />
                <span>Edit Assignment Specifications</span>
              </h3>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateAssignment} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Assignment Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-600 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Course Code</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-600 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Deadline Date</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-600 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Subject</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-600 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Min Passing Viva Score (%)</label>
                  <input
                    type="number"
                    min="50"
                    max="100"
                    value={minQuiz}
                    onChange={(e) => setMinQuiz(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-600 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Target Department</label>
                  <input
                    type="text"
                    value={targetDepartment}
                    onChange={(e) => setTargetDepartment(e.target.value)}
                    placeholder="e.g. Computer Engineering"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-600 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Target Division</label>
                  <select
                    value={targetDivision}
                    onChange={(e) => setTargetDivision(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-600 text-slate-900 dark:text-white"
                  >
                    <option value="all">All Divisions (A, B, C)</option>
                    <option value="A">Division A Only</option>
                    <option value="B">Division B Only</option>
                    <option value="C">Division C Only</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Problem Description</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain the problem statement..."
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-600 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1 text-xs">Input Format (Optional)</label>
                  <input
                    type="text"
                    value={inputFormat}
                    onChange={(e) => setInputFormat(e.target.value)}
                    placeholder="e.g. Space-separated integers on line 1"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1 text-xs">Output Format (Optional)</label>
                  <input
                    type="text"
                    value={outputFormat}
                    onChange={(e) => setOutputFormat(e.target.value)}
                    placeholder="e.g. A single integer or boolean string"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1 text-xs">Constraints (Optional)</label>
                <input
                  type="text"
                  value={constraints}
                  onChange={(e) => setConstraints(e.target.value)}
                  placeholder="e.g. 1 <= N <= 10^5, -10^9 <= val <= 10^9"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white"
                />
              </div>

              {/* LeetCode Testcases Configuration & AI Generator */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 dark:text-slate-200 block text-xs flex items-center gap-1.5">
                    <span>🧪 Assignment Test Cases ({testcases.length})</span>
                    <span className="text-[10px] text-slate-500 font-normal">(LeetCode Style Stdin &amp; Output)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAiGenerateTestcases}
                    disabled={isGeneratingAiTestcases}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs transition"
                  >
                    {isGeneratingAiTestcases ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-amber-300" />}
                    <span>{isGeneratingAiTestcases ? 'Generating...' : '✨ AI Generate Testcases'}</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {testcases.map((tc, idx) => (
                    <div key={idx} className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">Case {idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => setTestcases(prev => prev.filter((_, i) => i !== idx))}
                          className="text-rose-500 hover:text-rose-700 font-bold text-[10px]"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <textarea
                          rows={2}
                          placeholder="Input (stdin, e.g. 1\n10\n1\n20\n2\n3\n5)"
                          value={tc.input || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTestcases(prev => prev.map((t, i) => i === idx ? { ...t, input: val } : t));
                          }}
                          className="p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-mono text-slate-900 dark:text-white resize-y"
                        />
                        <textarea
                          rows={2}
                          placeholder="Expected Output (e.g. Event 10 added...)"
                          value={tc.expectedOutput || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTestcases(prev => prev.map((t, i) => i === idx ? { ...t, expectedOutput: val } : t));
                          }}
                          className="p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-mono text-slate-900 dark:text-white resize-y"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setTestcases(prev => [...prev, { input: '', expectedOutput: '', explanation: '' }])}
                  className="w-full py-1 text-center text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  + Add Custom Testcase
                </button>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAsg}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition shadow-xs flex items-center gap-1.5"
                >
                  {isSubmittingAsg && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
