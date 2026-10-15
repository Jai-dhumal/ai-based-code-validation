import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar.jsx';
import LoginPage from './pages/LoginPage.jsx';
import StudentPortal from './pages/StudentPortal.jsx';
import TeacherPortal from './pages/TeacherPortal.jsx';
import AdminPortal from './pages/AdminPortal.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import ProfileModal from './components/ProfileModal.jsx';
import { BookOpen, CheckCircle2, Clock, ShieldCheck } from 'lucide-react';

const authHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': 'Bearer ' + (localStorage.getItem('ai_validate_token') || '')
});

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('ai_validate_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      localStorage.removeItem('ai_validate_user');
      return null;
    }
  });

  // Light theme by default
  const [isDark, setIsDark] = useState(() => {
    try {
      return localStorage.getItem('ai_validate_theme') === 'dark';
    } catch (e) {
      return false;
    }
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('ai_validate_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('ai_validate_theme', 'light');
    }
  }, [isDark]);

  const handleToggleTheme = () => setIsDark(prev => !prev);

  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [systemStatus, setSystemStatus] = useState(null);
  const [settings, setSettings] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch application data
  const fetchData = async () => {
    try {
      const headers = authHeaders();
      const [healthRes, asgRes, subRes, setRes] = await Promise.all([
        fetch('/api/health'),
        fetch('/api/assignments', { headers }),
        fetch('/api/submissions', { headers }).catch(() => ({ ok: false })),
        fetch('/api/settings', { headers })
      ]);

      const healthData = await healthRes.json();
      const asgData = await asgRes.json();
      const subData = subRes.ok ? await subRes.json() : [];
      const setData = await setRes.json();

      setSystemStatus(healthData);
      setAssignments(Array.isArray(asgData) ? asgData : []);
      setSubmissions(Array.isArray(subData) ? subData : []);
      setSettings(setData);

      if (Array.isArray(asgData) && asgData.length > 0 && !selectedAssignment) {
        setSelectedAssignment(asgData[0]);
      }
    } catch (err) {
      console.error('Initial data fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Heartbeat every 60s while logged in
  useEffect(() => {
    if (!currentUser) return;
    const intervalId = setInterval(async () => {
      try {
        await fetch('/api/auth/heartbeat', { method: 'POST', headers: authHeaders() });
      } catch (err) {
        console.error('Heartbeat error:', err);
      }
    }, 60000);
    return () => clearInterval(intervalId);
  }, [currentUser]);

  const handleLoginSuccess = (user, token) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('ai_validate_user', JSON.stringify(user));
      const authToken = token || user?.token;
      if (authToken) {
        localStorage.setItem('ai_validate_token', authToken);
      }
    } catch (e) {}
    fetchData();
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', headers: authHeaders() });
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      setCurrentUser(null);
      try {
        localStorage.removeItem('ai_validate_user');
        localStorage.removeItem('ai_validate_token');
      } catch (e) {}
    }
  };

  const handleProfileUpdate = (updatedUser) => {
    const merged = { ...currentUser, ...updatedUser };
    setCurrentUser(merged);
    try {
      localStorage.setItem('ai_validate_user', JSON.stringify(merged));
    } catch (e) {}
  };

  const handleSaveSettings = async (newSettings) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(newSettings)
      });
      const data = await res.json();
      setSettings(data);
      fetchData();
    } catch (err) {
      console.error('Save settings error:', err);
    }
  };

  // Validate user session integrity
  const isValidUser = Boolean(
    currentUser &&
    currentUser.id &&
    ['student', 'teacher', 'admin'].includes(currentUser.role)
  );

  // If not logged in or invalid session, show login page
  if (!isValidUser) {
    if (currentUser) {
      try {
        localStorage.removeItem('ai_validate_user');
        localStorage.removeItem('ai_validate_token');
      } catch (e) {}
    }
    return <LoginPage onLoginSuccess={handleLoginSuccess} isDark={isDark} onToggleTheme={handleToggleTheme} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif] transition-colors duration-200">
      
      {/* Top Navigation Bar */}
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        systemStatus={systemStatus}
        isDark={isDark}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Role-Specific View */}
      <main className="grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* ADMINISTRATOR */}
        {currentUser.role === 'admin' && (
          <AdminPortal currentUser={currentUser} />
        )}

        {/* TEACHER */}
        {currentUser.role === 'teacher' && (
          <TeacherPortal
            currentUser={currentUser}
            assignments={assignments}
            submissions={submissions}
            onRefreshData={fetchData}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        )}

        {/* STUDENT */}
        {currentUser.role === 'student' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Sidebar: Assignments List */}
            <div className="lg:col-span-4 xl:col-span-3 space-y-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs card-float">
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    My Assignments
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                    {assignments.length} Tasks
                  </span>
                </div>

                <div className="space-y-2">
                  {(assignments || []).map((asg) => {
                    const isSelected = selectedAssignment?.id === asg.id;
                    const studentSub = (submissions || []).find(
                      s => s && s.assignmentId === asg.id && s.studentId === currentUser?.id
                    );

                    return (
                      <button
                        key={asg.id}
                        onClick={() => setSelectedAssignment(asg)}
                        className={`w-full text-left p-3.5 rounded-2xl border transition-all card-float ${
                          isSelected
                            ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 text-indigo-950 dark:text-white shadow-xs'
                            : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                            {asg.code}
                          </span>
                          {studentSub ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Passed
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                              Pending
                            </span>
                          )}
                        </div>

                        <h4 className={`text-xs font-bold line-clamp-1 ${
                          isSelected ? 'text-indigo-950 dark:text-white font-extrabold' : 'text-slate-800 dark:text-slate-200'
                        }`}>
                          {asg.title}
                        </h4>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {asg.deadline ? new Date(asg.deadline).toLocaleDateString() : 'Active'}
                          </span>
                          <span className="font-semibold text-slate-600 dark:text-slate-300">Pass: ≥{asg.minQuizScore || 70}%</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Project Credits Banner */}
              <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 shadow-xs space-y-2 card-float">
                <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
                  <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  JSPM BSIOTR Project Team
                </div>
                <div className="text-[11px] leading-relaxed space-y-0.5 text-slate-600 dark:text-slate-400">
                  <p>1. Deshmukh Vansh</p>
                  <p>2. Dhumal Jaydeep</p>
                  <p>3. Chede Omkar</p>
                  <p className="text-indigo-700 dark:text-indigo-400 font-bold pt-1">Guide: Prof. Nitin Shivale</p>
                </div>
              </div>

            </div>

            {/* Right Main Area: Student Portal */}
            <div className="lg:col-span-8 xl:col-span-9">
              <StudentPortal
                currentUser={currentUser}
                assignments={assignments}
                selectedAssignment={selectedAssignment}
                onSelectAssignment={setSelectedAssignment}
                submissions={submissions}
                onRefreshSubmissions={fetchData}
              />
            </div>

          </div>
        )}

      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentSettings={settings}
        onSaveSettings={handleSaveSettings}
      />

      {/* Profile Edit Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        currentUser={currentUser}
        onProfileUpdate={handleProfileUpdate}
      />

    </div>
  );
}
