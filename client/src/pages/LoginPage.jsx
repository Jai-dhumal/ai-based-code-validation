import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  GraduationCap, 
  UserCheck, 
  ShieldAlert, 
  ArrowRight, 
  Mail, 
  Lock, 
  User, 
  Hash, 
  Building2,
  CheckCircle2,
  Info,
  Sun,
  Moon,
  Layers
} from 'lucide-react';

export default function LoginPage({ onLoginSuccess, isDark, onToggleTheme }) {
  // 'signin' vs 'signup'
  const [authMode, setAuthMode] = useState('signin'); 
  const [role, setRole] = useState('student'); // 'student' | 'teacher' | 'admin'
  
  // Sign In fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Sign Up fields
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [division, setDivision] = useState('A');
  const [departments, setDepartments] = useState([]);
  const [department, setDepartment] = useState('Computer Engineering');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch departments for registration dropdown
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await fetch('/api/admin/departments');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setDepartments(data);
            const firstDept = typeof data[0] === 'string' ? data[0] : (data[0].name || data[0].departmentName);
            if (firstDept) {
              setDepartment(firstDept);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch departments:', err);
      }
    };
    fetchDepartments();
  }, []);

  // Handle Sign In
  const handleSignIn = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid email or password');
      }

      if (data.token) {
        localStorage.setItem('ai_validate_token', data.token);
      }

      onLoginSuccess(data.user, data.token);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Sign Up
  const handleSignUp = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          rollNo: role === 'student' ? (rollNo || `CE2025-${Math.floor(10 + Math.random() * 89)}`) : undefined,
          division: role === 'student' ? division : undefined,
          department
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      if (data.token) {
        localStorage.setItem('ai_validate_token', data.token);
      }

      setSuccessMsg('Registration successful! Logging you in...');
      setTimeout(() => {
        onLoginSuccess(data.user, data.token);
      }, 900);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 dark:from-[#070b14] via-slate-100 dark:via-slate-800 to-indigo-50/30 dark:to-indigo-950/30 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-['Plus_Jakarta_Sans',sans-serif]">
      
      {onToggleTheme && (
        <button
          onClick={onToggleTheme}
          className="fixed top-4 right-4 z-50 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-lg hover:scale-105 transition-all"
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDark ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-indigo-600" />}
        </button>
      )}

      {/* College Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20">
          <BookOpen className="w-8 h-8" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          JSPM BSIOTR Wagholi
        </h1>
        <p className="text-sm font-bold text-indigo-600 mt-0.5">
          AI-Based Assignment Validation & Code Viva Platform
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Department of Computer Engineering • Academic Year 2025–26
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 rounded-3xl p-7 sm:p-8 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 backdrop-blur-xl">
          
          {/* Main Mode Toggle: Sign In vs Sign Up */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl mb-6 border border-slate-200/60 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => { setAuthMode('signin'); setErrorMsg(''); setSuccessMsg(''); }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition ${
                authMode === 'signin'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Sign In to Account
            </button>

            <button
              type="button"
              onClick={() => { 
                setAuthMode('signup'); 
                if (role === 'admin') setRole('student');
                setErrorMsg(''); 
                setSuccessMsg(''); 
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition ${
                authMode === 'signup'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              New Registration (Sign Up)
            </button>
          </div>

          {/* Role Selector Pills */}
          <div className="flex bg-slate-50 dark:bg-[#070b14] p-1 rounded-xl mb-6 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setRole('student')}
              className={`flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-lg text-xs font-bold transition ${
                role === 'student'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Student</span>
            </button>

            <button
              type="button"
              onClick={() => setRole('teacher')}
              className={`flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-lg text-xs font-bold transition ${
                role === 'teacher'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Teacher</span>
            </button>

            {/* Admin only available for Sign In */}
            {authMode === 'signin' && (
              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-lg text-xs font-bold transition ${
                  role === 'admin'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Admin</span>
              </button>
            )}
          </div>

          {/* Alerts */}
          {errorMsg && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs font-semibold">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* VIEW 1: SIGN IN FORM */}
          {authMode === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="email"
                    required
                    placeholder={
                      role === 'student'
                        ? 'jaydeep@jspm.edu'
                        : role === 'teacher'
                        ? 'nitin.shivale@jspm.edu'
                        : 'admin@jspm.edu'
                    }
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-slate-700 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none transition font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-slate-700 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none transition font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 dark:shadow-indigo-900/20 transition disabled:opacity-50"
              >
                <span>{isLoading ? 'Signing In...' : `Sign In as ${role.toUpperCase()}`}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Helpful Default Login Hints (Clean Info Card) */}
              <div className="mt-5 p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-800 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                <div className="font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Pre-configured Credentials (Password: password123):</span>
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400 pl-4 space-y-0.5 font-mono">
                  {role === 'student' && <p>• Student: jaydeep@jspm.edu or vansh@jspm.edu</p>}
                  {role === 'teacher' && <p>• Teacher: nitin.shivale@jspm.edu</p>}
                  {role === 'admin' && <p>• Administrator: admin@jspm.edu</p>}
                </div>
              </div>
            </form>
          )}

          {/* VIEW 2: SIGN UP / REGISTRATION FORM */}
          {authMode === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-slate-700 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none transition font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  College Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="email"
                    required
                    placeholder="student@jspm.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-slate-700 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none transition font-medium"
                  />
                </div>
              </div>

              {role === 'student' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Roll Number
                    </label>
                    <div className="relative">
                      <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. CE2025-05"
                        value={rollNo}
                        onChange={(e) => setRollNo(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-slate-700 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none transition font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Division
                    </label>
                    <div className="relative">
                      <Layers className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                      <select
                        value={division}
                        onChange={(e) => setDivision(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-slate-700 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none transition font-medium"
                      >
                        <option value="A" className="dark:bg-slate-900">Division A</option>
                        <option value="B" className="dark:bg-slate-900">Division B</option>
                        <option value="C" className="dark:bg-slate-900">Division C</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Department
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none z-10" />
                  {departments && departments.length > 0 ? (
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-slate-700 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none transition font-medium"
                    >
                      {departments.map((dept, idx) => {
                        const deptVal = typeof dept === 'string' ? dept : (dept.name || dept.departmentName || `Dept ${idx + 1}`);
                        return (
                          <option key={idx} value={deptVal} className="dark:bg-slate-900">
                            {deptVal}
                          </option>
                        );
                      })}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="e.g. Computer Engineering"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-slate-700 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none transition font-medium"
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Create password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-slate-700 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none transition font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-slate-700 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none transition font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 dark:shadow-indigo-900/20 transition disabled:opacity-50 mt-2"
              >
                <span>{isLoading ? 'Creating account...' : `Complete Registration as ${role.toUpperCase()}`}</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </form>
          )}

        </div>

        {/* Footnote */}
        <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-6 font-medium">
          Project Team: Deshmukh Vansh, Dhumal Jaydeep, Chede Omkar • Guide: Prof. Nitin Shivale
        </p>
      </div>

    </div>
  );
}
