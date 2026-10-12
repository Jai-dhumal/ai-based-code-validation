import os

portal_code = """import React, { useState, useEffect } from 'react';
import { 
  Users, FileCode, AlertTriangle, CheckCircle2, Plus, Eye, 
  TrendingUp, BarChart3, PieChart, Printer, Search, Filter, 
  Award, Sparkles, GitCommit, GitCompare, X, Clock, ChevronRight,
  Megaphone, UserCheck, GraduationCap, LayoutDashboard, Inbox, BookOpen, Users2, Trash2
} from 'lucide-react';

export default function TeacherPortal({ 
  currentUser, 
  assignments, 
  submissions, 
  onRefreshData 
}) {
  const [activeTab, setActiveTab] = useState('powerbi'); // 'powerbi' | 'requests' | 'students' | 'assignments' | 'announcements'
  const [selectedAsgFilter, setSelectedAsgFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New assignment form fields
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Data Structures & Algorithms');
  const [code, setCode] = useState('CS302');
  const [deadline, setDeadline] = useState('2026-11-15');
  const [minQuiz, setMinQuiz] = useState(70);
  const [desc, setDesc] = useState('');

  // Phase 3 State
  const [quizRequests, setQuizRequests] = useState([]);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [teacherSubjects, setTeacherSubjects] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [reviewNote, setReviewNote] = useState('');
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '', priority: 'normal' });
  const [requestFilter, setRequestFilter] = useState('all');

  // Fetch Teacher Data
  const fetchTeacherData = async () => {
    try {
      const [reqRes, stdRes, annRes, subRes] = await Promise.all([
        fetch(`/api/quiz-requests?teacherId=${currentUser.id}`).then(r => r.ok ? r.json() : []),
        fetch('/api/admin/students').then(r => r.ok ? r.json() : []),
        fetch('/api/announcements').then(r => r.ok ? r.json() : []),
        fetch(`/api/subjects?teacherId=${currentUser.id}`).then(r => r.ok ? r.json() : [])
      ]);
      setQuizRequests(Array.isArray(reqRes) ? reqRes : (reqRes.data || []));
      setEnrolledStudents(Array.isArray(stdRes) ? stdRes : (stdRes.data || []));
      setAnnouncements(Array.isArray(annRes) ? annRes : (annRes.data || []));
      setTeacherSubjects(Array.isArray(subRes) ? subRes : (subRes.data || []));
    } catch (err) {
      console.error('Error fetching teacher data:', err);
    }
  };

  useEffect(() => {
    fetchTeacherData();
  }, [currentUser.id, activeTab]);

  // Handle assignment creation
  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          subject,
          code,
          deadline: new Date(deadline).toISOString(),
          minQuizScore: Number(minQuiz),
          description: desc,
          languages: ['python'],
          starterCode: { python: '# Write your code here\\n' },
          teacherId: currentUser.id
        })
      });

      if (res.ok) {
        setIsCreateModalOpen(false);
        onRefreshData();
        setTitle('');
        setDesc('');
      }
    } catch (err) {
      alert('Error creating assignment: ' + err.message);
    }
  };

  const handlePostAnnouncement = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newAnnouncement,
          authorId: currentUser.id,
          authorName: currentUser.name,
          authorRole: 'teacher',
          targetRoles: ['student']
        })
      });
      if (res.ok) {
        setNewAnnouncement({ title: '', content: '', priority: 'normal' });
        fetchTeacherData();
      }
    } catch (err) {
      alert('Error posting announcement: ' + err.message);
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    try {
      const res = await fetch(`/api/announcements/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchTeacherData();
      }
    } catch (err) {
      alert('Error deleting announcement: ' + err.message);
    }
  };

  const handleReviewRequest = async (status) => {
    if (!selectedRequest) return;
    try {
      const res = await fetch(`/api/quiz-requests/${selectedRequest.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reviewNote })
      });
      if (res.ok) {
        setSelectedRequest(null);
        setReviewNote('');
        fetchTeacherData();
      }
    } catch (err) {
      alert('Error reviewing request: ' + err.message);
    }
  };

  // Filter submissions by assignment & search
  const filteredSubmissions = submissions.filter(s => {
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

  const filteredRequests = quizRequests.filter(r => {
    if (requestFilter === 'all') return true;
    return r.status === requestFilter;
  });

  // Power BI Telemetry Calculations
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

  const pendingRequestsCount = quizRequests.filter(r => r.status === 'pending').length;

  // Grade helper based on Quiz + Originality
  const getPerformanceGrade = (quizScore, plagScore) => {
    const composite = (quizScore * 0.7) + ((100 - plagScore) * 0.3);
    if (quizScore < 70) return { grade: 'Needs Retest', color: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800' };
    if (composite >= 88) return { grade: 'Grade A+ (Distinction)', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800' };
    if (composite >= 78) return { grade: 'Grade A (First Class)', color: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800' };
    return { grade: 'Grade B (Pass)', color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800' };
  };

  return (
    <div className="space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      
      {/* Teacher Subject Banner / Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 card-float">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-lg">
            {currentUser.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 dark:text-white">
              Faculty: Prof. {currentUser.name} • Department of Computer Engineering
            </h1>
            <div className="flex flex-wrap gap-2 mt-2">
              {teacherSubjects.length > 0 ? (
                teacherSubjects.map((sub, i) => (
                  <span key={i} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700">
                    {sub.name} ({sub.code})
                  </span>
                ))
              ) : (
                <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700">
                  No Subjects Assigned
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Ribbon */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3 transition-colors">
        <div className="flex flex-wrap items-center space-x-1.5 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl">
          <button
            onClick={() => setActiveTab('powerbi')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-bold transition-all card-float ${
              activeTab === 'powerbi'
                ? 'bg-white dark:bg-indigo-600 text-indigo-700 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className={`w-4 h-4 ${activeTab === 'powerbi' ? 'text-indigo-600 dark:text-white' : ''}`} />
            <span>📊 Power BI Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('requests')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-bold transition-all card-float ${
              activeTab === 'requests'
                ? 'bg-white dark:bg-indigo-600 text-indigo-700 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Inbox className="w-4 h-4" />
            <span>📥 Quiz Requests</span>
            {pendingRequestsCount > 0 && (
              <span className="ml-1.5 bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                {pendingRequestsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('students')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-bold transition-all card-float ${
              activeTab === 'students'
                ? 'bg-white dark:bg-indigo-600 text-indigo-700 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users2 className="w-4 h-4" />
            <span>👥 Student Directory</span>
          </button>

          <button
            onClick={() => setActiveTab('assignments')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-bold transition-all card-float ${
              activeTab === 'assignments'
                ? 'bg-white dark:bg-indigo-600 text-indigo-700 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>📚 Course Assignments</span>
          </button>

          <button
            onClick={() => setActiveTab('announcements')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-bold transition-all card-float ${
              activeTab === 'announcements'
                ? 'bg-white dark:bg-indigo-600 text-indigo-700 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Megaphone className="w-4 h-4" />
            <span>📢 Announcements</span>
          </button>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => window.print()}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition card-float"
            title="Export / Print PDF Report"
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

      {/* VIEW 1: POWER BI */}
      {activeTab === 'powerbi' && (
        <div className="space-y-6">
          {/* Power BI Title Banner */}
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

              {/* Assignment Filter */}
              <div className="flex items-center space-x-2 bg-white dark:bg-slate-800 px-3.5 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs card-float shrink-0">
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

          {/* 4 Power BI KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs card-float">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                <span>Evaluated Students</span>
                <Users className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-white mt-2">{totalSubmissions}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                <span>Total student assignment submissions</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs card-float">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                <span>Viva Pass Rate</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2">{passRate}%</div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full transition-all duration-700" style={{ width: `${passRate}%` }}></div>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {passedCount} of {totalSubmissions || 1} students cleared benchmark
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs card-float">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                <span>Avg 10-Question Score</span>
                <Award className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-3xl font-black text-blue-600 dark:text-blue-400 mt-2">{avgQuizScore}%</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Average marks on code understanding viva</div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs card-float">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                <span>Plagiarism Risk Alerts</span>
                <AlertTriangle className="w-4 h-4 text-red-500" />
              </div>
              <div className="text-3xl font-black text-red-600 dark:text-red-400 mt-2">{highPlagCount}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {highPlagCount > 0 ? `${highPlagCount} code submissions require audit` : 'Zero high-similarity violations'}
              </div>
            </div>
          </div>

          {/* Visual Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Chart 1: Student Viva Score */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs card-float">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-indigo-600" />
                    Student Viva Marks vs. Benchmark
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Individual 10-question AI viva scores</p>
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
                        <div className="relative w-full bg-slate-100 dark:bg-slate-800 h-3.5 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                          <div className="absolute top-0 bottom-0 w-0.5 bg-slate-900 dark:bg-white z-10" style={{ left: '70%' }}></div>
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              isPassed ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-red-500 to-red-400'
                            }`}
                            style={{ width: `${Math.min(100, sub.quizScore || 0)}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500 text-xs">No submissions recorded for this assignment yet.</div>
              )}
            </div>

            {/* Chart 2: Plagiarism Risk */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs card-float flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-purple-600" />
                    Code Originality & Plagiarism Risk
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">Cohort categorized by Tier-1 & Tier-2 similarity thresholds</p>

                <div className="h-5 w-full bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden flex border border-slate-200 dark:border-slate-700 mb-6">
                  <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${totalSubmissions > 0 ? (cleanCount / totalSubmissions) * 100 : 33}%` }}></div>
                  <div className="bg-amber-500 h-full transition-all duration-500" style={{ width: `${totalSubmissions > 0 ? (borderlineCount / totalSubmissions) * 100 : 33}%` }}></div>
                  <div className="bg-red-500 h-full transition-all duration-500" style={{ width: `${totalSubmissions > 0 ? (highPlagCount / totalSubmissions) * 100 : 34}%` }}></div>
                </div>

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

          {/* Performance Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden card-float">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Student Comprehensive Performance Evaluation</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Individual grades and scores based on assignment code originality and 10-question AI viva marks</p>
              </div>
              <div className="relative w-64">
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
                    <th className="px-6 py-3.5 text-right">Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {filteredSubmissions.map((sub) => {
                    const gradeInfo = getPerformanceGrade(sub.quizScore || 0, sub.tier1Score || 0);
                    return (
                      <tr key={sub.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900 dark:text-white">{sub.studentName}</div>
                          <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">{sub.rollNo}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-slate-800 dark:text-slate-200">{sub.assignmentTitle}</div>
                          <div className="text-[10px] text-slate-400 font-mono uppercase">{sub.language}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                            sub.tier1Score >= 75 ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800'
                              : sub.tier1Score >= 35 ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                          }`}>{sub.tier1Score}% Match</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-extrabold text-slate-900 dark:text-white text-sm">{sub.quizScore}%</div>
                          <div className="text-[10px] text-slate-400">{Math.round((sub.quizScore / 100) * 10)}/10 Correct</div>
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
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => setSelectedSubmission({ ...sub, inspectMode: 'readOnly' })}
                            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition card-float"
                          >
                            Inspect Code
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: QUIZ REQUESTS */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Student Quiz Authorization Requests</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Review flagged code and approve/reject viva access.</p>
            </div>
            <div className="flex space-x-2 text-xs">
              {['all', 'pending', 'approved', 'rejected'].map(status => (
                <button
                  key={status}
                  onClick={() => setRequestFilter(status)}
                  className={`px-3 py-1.5 rounded-xl font-bold capitalize transition ${
                    requestFilter === status 
                      ? 'bg-indigo-600 text-white shadow-sm' 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRequests.map(req => (
              <div key={req.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs card-float space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-extrabold text-slate-900 dark:text-white">{req.studentName}</h4>
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">{req.rollNo}</span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
                    req.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300'
                    : req.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300'
                    : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300'
                  }`}>
                    {req.status}
                  </span>
                </div>
                
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  <p><strong>Assignment:</strong> {req.assignmentTitle}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="font-bold">Plagiarism Match:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      (req.tier1Score || 0) >= 75 ? 'bg-red-50 text-red-700 border-red-200'
                        : (req.tier1Score || 0) >= 35 ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {req.tier1Score}%
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] opacity-75">Requested on: {new Date(req.createdAt).toLocaleString()}</p>
                </div>

                {req.reviewNote && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    <strong>Note:</strong> {req.reviewNote}
                  </div>
                )}

                {req.status === 'pending' && (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <button
                      onClick={() => { setSelectedRequest(req); setSelectedSubmission({ ...req, inspectMode: 'review' }); }}
                      className="px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 text-xs font-bold transition hover:bg-indigo-100 dark:hover:bg-indigo-900/60"
                    >
                      Inspect & Review
                    </button>
                  </div>
                )}
              </div>
            ))}
            {filteredRequests.length === 0 && (
              <div className="col-span-full text-center py-8 text-slate-500 text-xs">No requests found.</div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 3: STUDENT DIRECTORY */}
      {activeTab === 'students' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Student Directory</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">View enrolled students and their overall progress.</p>
            </div>
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {enrolledStudents.filter(s => 
              s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
              s.rollNo?.toLowerCase().includes(searchQuery.toLowerCase())
            ).map(student => {
              const stSubs = submissions.filter(sub => sub.studentId === student.id);
              const passed = stSubs.filter(sub => sub.quizPassed).length;
              const avgScore = stSubs.length ? Math.round(stSubs.reduce((a, b) => a + (b.quizScore || 0), 0) / stSubs.length) : 0;

              return (
                <div key={student.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs card-float flex flex-col space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold">
                      {student.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">{student.name}</h4>
                      <p className="text-[10px] text-slate-500 font-mono">{student.rollNo} • {student.department || 'Computer Engineering'}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-center border border-slate-100 dark:border-slate-700">
                      <div className="text-slate-500 mb-1">Assignments</div>
                      <div className="font-bold text-slate-900 dark:text-white">{passed} / {stSubs.length} Passed</div>
                    </div>
                    <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-center border border-slate-100 dark:border-slate-700">
                      <div className="text-slate-500 mb-1">Avg Score</div>
                      <div className="font-bold text-indigo-600 dark:text-indigo-400">{avgScore}%</div>
                    </div>
                  </div>
                  <div className="mt-auto pt-2 flex items-center justify-between text-[10px] text-slate-500">
                    <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="w-3 h-3"/> Active</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 4: COURSE ASSIGNMENTS */}
      {activeTab === 'assignments' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Active Programming Assignments</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Manage course assignments, deadlines, and passing criteria.</p>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition card-float"
            >
              <Plus className="w-4 h-4" />
              <span>+ Create Assignment</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assignments.map((asg) => {
              const asgSubs = submissions.filter(s => s.assignmentId === asg.id);
              return (
                <div key={asg.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-3 card-float">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 font-mono">{asg.code} - {asg.subject}</span>
                    <span className="text-[10px] px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                      {asgSubs.length} Submissions
                    </span>
                  </div>
                  <h4 className="font-extrabold text-base text-slate-900 dark:text-white">{asg.title}</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">{asg.description}</p>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                    <span>Deadline: {new Date(asg.deadline).toLocaleDateString()}</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold">Passing Mark: {asg.minQuizScore}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 5: ANNOUNCEMENTS */}
      {activeTab === 'announcements' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-4">Post New Announcement</h3>
            <form onSubmit={handlePostAnnouncement} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Title</label>
                  <input type="text" required value={newAnnouncement.title} onChange={e => setNewAnnouncement({...newAnnouncement, title: e.target.value})} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-600 text-slate-900 dark:text-white" placeholder="Announcement title..." />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Priority</label>
                  <select value={newAnnouncement.priority} onChange={e => setNewAnnouncement({...newAnnouncement, priority: e.target.value})} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-600 text-slate-900 dark:text-white">
                    <option value="normal">Normal</option>
                    <option value="important">Important</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Content</label>
                <textarea rows="3" required value={newAnnouncement.content} onChange={e => setNewAnnouncement({...newAnnouncement, content: e.target.value})} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-600 text-slate-900 dark:text-white" placeholder="Write message here..."></textarea>
              </div>
              <div className="flex justify-end">
                <button type="submit" className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition shadow-xs">Post Announcement</button>
              </div>
            </form>
          </div>

          <div className="space-y-3">
            {announcements.map(ann => (
              <div key={ann.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex justify-between gap-4 card-float">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      ann.priority === 'urgent' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                      : ann.priority === 'important' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' 
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}>{ann.priority}</span>
                    <span className="text-[10px] text-slate-400">{new Date(ann.createdAt).toLocaleString()}</span>
                  </div>
                  <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">{ann.title}</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{ann.content}</p>
                </div>
                {ann.authorId === currentUser.id && (
                  <button onClick={() => handleDeleteAnnouncement(ann.id)} className="p-2 text-slate-400 hover:text-red-500 transition rounded-lg h-fit">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Code Inspection & Approval Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full p-6 space-y-4 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
              <div>
                <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Student Solution: {selectedSubmission.studentName} ({selectedSubmission.rollNo})
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedSubmission.assignmentTitle} • Plagiarism: {selectedSubmission.tier1Score}%
                  {selectedSubmission.inspectMode !== 'review' && ` • 10-Question Viva: ${selectedSubmission.quizScore}%`}
                </p>
              </div>
              <button
                onClick={() => { setSelectedSubmission(null); setSelectedRequest(null); }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <pre className="p-4 bg-slate-900 text-emerald-400 font-['Fira_Code',monospace] text-xs rounded-2xl leading-relaxed whitespace-pre-wrap break-words">
                {selectedSubmission.code || 'No code available.'}
              </pre>
            </div>

            {selectedSubmission.inspectMode === 'review' ? (
              <div className="shrink-0 space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <textarea
                  placeholder="Optional review notes..."
                  value={reviewNote}
                  onChange={e => setReviewNote(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:border-indigo-600 text-slate-900 dark:text-white"
                  rows="2"
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => handleReviewRequest('rejected')} className="px-4 py-2 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/40 dark:text-red-400 dark:hover:bg-red-900/60 text-xs font-bold transition">Reject Request</button>
                  <button onClick={() => handleReviewRequest('approved')} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition">Approve Viva Access</button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end pt-2 shrink-0">
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  Close Audit View
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Assignment Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="font-extrabold text-base text-slate-900 dark:text-white">Create New Programming Assignment</h4>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateAssignment} className="space-y-3.5 text-xs max-h-[70vh] overflow-y-auto px-1">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Assignment Title</label>
                <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-600 text-slate-900 dark:text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Course Code</label>
                  <input type="text" required value={code} onChange={(e) => setCode(e.target.value)} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-600 text-slate-900 dark:text-white" />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Subject Name</label>
                  {teacherSubjects.length > 0 ? (
                    <select required value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-600 text-slate-900 dark:text-white">
                      {teacherSubjects.map(ts => <option key={ts.id} value={ts.name}>{ts.name}</option>)}
                      <option value="Other">Other...</option>
                    </select>
                  ) : (
                    <input type="text" required value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-600 text-slate-900 dark:text-white" />
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Deadline Date</label>
                  <input type="date" required value={deadline} onChange={(e) => setDeadline(e.target.value)} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-600 text-slate-900 dark:text-white" />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Min Quiz Score (%)</label>
                  <input type="number" required min="0" max="100" value={minQuiz} onChange={(e) => setMinQuiz(e.target.value)} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-600 text-slate-900 dark:text-white" />
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Problem Description</label>
                <textarea rows="3" required value={desc} onChange={(e) => setDesc(e.target.value)} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-600 text-slate-900 dark:text-white" />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 font-semibold">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition shadow-xs">Publish Assignment</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
"""

with open(r'c:\Users\User\OneDrive\Desktop\AI based code validation2.0\client\src\pages\TeacherPortal.jsx', 'w', encoding='utf-8') as f:
    f.write(portal_code)
