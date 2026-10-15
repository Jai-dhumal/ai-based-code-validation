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
  Sun,
  Moon,
  Layers,
  KeyRound,
  ShieldCheck,
  RefreshCw,
  ArrowLeft,
  Sparkles,
  Check
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
  const [facultyKey, setFacultyKey] = useState('');

  // Email OTP Verification state
  const [otpStep, setOtpStep] = useState(false);
  const [emailOtp, setEmailOtp] = useState('');
  const [otpTimer, setOtpTimer] = useState(600);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Google Sign-In modal
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [gEmail, setGEmail] = useState('');
  const [gName, setGName] = useState('');
  const [gFacultyKey, setGFacultyKey] = useState('');

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

  // OTP countdown timer
  useEffect(() => {
    if (!otpStep || otpTimer <= 0) return;
    const interval = setInterval(() => {
      setOtpTimer(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [otpStep, otpTimer]);

  // Handle Standard Sign In
  const handleSignIn = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, expectedRole: role })
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

  // Handle Google Sign-In
  const handleGoogleAuth = async (params = {}) => {
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    setShowGoogleModal(false);

    const resolvedEmail = (params.authEmail || gEmail || email || '').trim().toLowerCase();
    const resolvedName = (params.authName || gName || name || '').trim();
    const resolvedRole = params.authRole || (role === 'admin' ? 'student' : role);
    const resolvedFacultyKey = params.authFacultyKey || gFacultyKey || facultyKey || '';

    if (!resolvedEmail || !resolvedEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address to continue with Google.');
      setIsLoading(false);
      return;
    }

    const finalName = resolvedName || resolvedEmail.split('@')[0];

    try {
      const body = {
        email: resolvedEmail,
        name: finalName,
        role: resolvedRole,
        googleId: `google_${Date.now()}`
      };

      if (resolvedRole === 'teacher') {
        body.facultyKey = resolvedFacultyKey;
      }

      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Google authentication failed');
      }

      if (data.token) {
        localStorage.setItem('ai_validate_token', data.token);
      }
      localStorage.setItem('ai_validate_theme', 'light');

      setSuccessMsg(data.isNewUser 
        ? `Account created! Welcome ${data.user.name}. Opening Dashboard...` 
        : `Welcome back, ${data.user.name}! Opening Dashboard...`);

      setTimeout(() => {
        onLoginSuccess(data.user, data.token);
      }, 500);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 1: Request Email OTP generation
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      setIsLoading(false);
      return;
    }

    if (role === 'teacher' && (!facultyKey || facultyKey.trim() !== 'JSPM-FACULTY-2026')) {
      setErrorMsg('Unauthorized Faculty Key: You cannot register as a Teacher without a valid Institutional Faculty Key (e.g. JSPM-FACULTY-2026).');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          role,
          facultyKey: role === 'teacher' ? facultyKey : undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch verification code');
      }

      setOtpStep(true);
      setOtpTimer(600);
      setSuccessMsg(`Verification OTP sent to your Gmail inbox (${email})!`);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify Email OTP and Complete Registration
  const handleVerifyOtpAndRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    if (!emailOtp || emailOtp.trim().length !== 6) {
      setErrorMsg('Please enter the 6-digit OTP code sent to your Gmail inbox.');
      setIsLoading(false);
      return;
    }

    try {
      // 1. Verify OTP
      const verifyRes = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          emailOtp
        })
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        throw new Error(verifyData.error || 'Invalid OTP code. Please check your Gmail.');
      }

      // 2. Complete Registration
      const regRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          facultyKey: role === 'teacher' ? facultyKey : undefined,
          rollNo: role === 'student' ? (rollNo || `CE2025-${Math.floor(10 + Math.random() * 89)}`) : undefined,
          division: role === 'student' ? division : undefined,
          department
        })
      });

      const regData = await regRes.json();
      if (!regRes.ok) {
        throw new Error(regData.error || 'Registration failed');
      }

      if (regData.token) {
        localStorage.setItem('ai_validate_token', regData.token);
      }

      setSuccessMsg('Student registered successfully! Welcome to the Code Validation System.');
      setTimeout(() => {
        onLoginSuccess(regData.user, regData.token);
      }, 900);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 font-['Plus_Jakarta_Sans',sans-serif]">
      
      {/* Top Header Theme & Status Toggle */}
      {onToggleTheme && (
        <div className="absolute top-5 right-6 flex items-center gap-2">
          <button
            onClick={onToggleTheme}
            className="p-2.5 rounded-2xl bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 shadow-sm transition"
            title="Toggle Theme"
          >
            {isDark ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-indigo-600" />}
          </button>
        </div>
      )}

      {/* Modern Institution Hero Section */}
      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center mb-6">
        <div className="inline-flex items-center justify-center p-3.5 rounded-3xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 mb-3">
          <BookOpen className="w-8 h-8" />
        </div>
        <div className="text-xs font-black uppercase tracking-wider text-indigo-600 mb-1">
          JSPM BSIOTR Wagholi, Pune
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          AI Code Validator 2.0
        </h1>
        <p className="mt-2 text-sm text-slate-600 font-medium max-w-md mx-auto">
          Intelligent Two-Tier Plagiarism Analysis, Online Compiler &amp; Academic Integrity Platform
        </p>
      </div>

      {/* Main Elegant Card Container */}
      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white border border-slate-200/90 rounded-3xl p-8 sm:p-10 shadow-xl shadow-slate-200/70 backdrop-blur-xl">
          
          {/* Top Mode Switcher (Sign In vs Sign Up) */}
          <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => { setAuthMode('signin'); setOtpStep(false); setErrorMsg(''); setSuccessMsg(''); }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
                authMode === 'signin'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { 
                setAuthMode('signup'); 
                setOtpStep(false);
                setErrorMsg(''); 
                setSuccessMsg(''); 
                if (role === 'admin') setRole('student');
              }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
                authMode === 'signup'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Role Selector Pill Tabs */}
          <div className="mb-6">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
              Select Your Portal Role
            </label>
            <div className={`grid ${authMode === 'signup' ? 'grid-cols-2' : 'grid-cols-3'} gap-2.5`}>
              {/* Student */}
              <button
                type="button"
                onClick={() => setRole('student')}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                  role === 'student'
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-700 font-bold shadow-sm'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                <GraduationCap className="w-5 h-5 mb-1" />
                <span className="text-xs font-bold">Student</span>
              </button>

              {/* Teacher */}
              <button
                type="button"
                onClick={() => setRole('teacher')}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                  role === 'teacher'
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-700 font-bold shadow-sm'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                <UserCheck className="w-5 h-5 mb-1" />
                <span className="text-xs font-bold">Faculty / Teacher</span>
              </button>

              {/* Admin (Sign In Only) */}
              {authMode === 'signin' && (
                <button
                  type="button"
                  onClick={() => setRole('admin')}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                    role === 'admin'
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-700 font-bold shadow-sm'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <ShieldAlert className="w-5 h-5 mb-1" />
                  <span className="text-xs font-bold">Admin</span>
                </button>
              )}
            </div>
          </div>

          {/* Modern Google One-Click Button */}
          <div className="mb-6">
            <button
              type="button"
              onClick={() => setShowGoogleModal(true)}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-sm transition hover:shadow"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>{authMode === 'signup' ? 'Sign up with Google' : 'Continue with Google'}</span>
            </button>

            <div className="relative flex py-4 items-center">
              <div className="grow border-t border-slate-200"></div>
              <span className="shrink mx-4 text-slate-400 text-[11px] font-bold uppercase tracking-wider">Or continue with email</span>
              <div className="grow border-t border-slate-200"></div>
            </div>
          </div>

          {/* Alert Messages */}
          {errorMsg && (
            <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start space-x-2">
              <span className="shrink-0 mt-0.5">⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-start space-x-2">
              <span className="shrink-0 mt-0.5">✓</span>
              <span>{successMsg}</span>
            </div>
          )}

          {/* VIEW 1: SIGN IN FORM */}
          {authMode === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Institutional Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                  <input
                    type="email"
                    required
                    placeholder={
                      role === 'admin' ? 'admin@jspm.edu' : 
                      role === 'teacher' ? 'teacher@jspm.edu' : 'student@jspm.edu'
                    }
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl text-slate-900 text-xs focus:outline-none transition font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl text-slate-900 text-xs focus:outline-none transition font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-2 py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition disabled:opacity-50"
              >
                <span>{isLoading ? 'Signing In...' : `Sign In as ${role.toUpperCase()}`}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* VIEW 2: SIGN UP / REGISTRATION FORM */}
          {authMode === 'signup' && !otpStep && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl text-slate-900 text-xs focus:outline-none transition font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Gmail / Institutional Email (for Verification OTP)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                  <input
                    type="email"
                    required
                    placeholder="yourname@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl text-slate-900 text-xs focus:outline-none transition font-medium"
                  />
                </div>
              </div>

              {/* Faculty Authorization Key (Required only for Teachers) */}
              {role === 'teacher' && (
                <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                    <label className="text-xs font-bold text-amber-900">
                      Faculty Authorization Key (Mandatory)
                    </label>
                  </div>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-amber-500 absolute left-3.5 top-3.5 pointer-events-none" />
                    <input
                      type="password"
                      required
                      placeholder="Enter Institutional Faculty Key"
                      value={facultyKey}
                      onChange={(e) => setFacultyKey(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-amber-300 focus:border-amber-500 rounded-xl text-slate-900 text-xs focus:outline-none transition font-medium"
                    />
                  </div>
                  <p className="text-[11px] text-amber-700 mt-1.5">
                    Security Gate: Only authorized faculty with the institutional key can create teacher accounts.
                  </p>
                </div>
              )}

              {role === 'student' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Roll Number
                      </label>
                      <div className="relative">
                        <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                        <input
                          type="text"
                          required
                          placeholder="CE2025-05"
                          value={rollNo}
                          onChange={(e) => setRollNo(e.target.value)}
                          className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl text-slate-900 text-xs focus:outline-none transition font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Division
                      </label>
                      <div className="relative">
                        <Layers className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                        <select
                          value={division}
                          onChange={(e) => setDivision(e.target.value)}
                          className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl text-slate-900 text-xs focus:outline-none transition font-medium"
                        >
                          <option value="A">Division A</option>
                          <option value="B">Division B</option>
                          <option value="C">Division C</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Department
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none z-10" />
                  {departments && departments.length > 0 ? (
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl text-slate-900 text-xs focus:outline-none transition font-medium"
                    >
                      {departments.map((dept, idx) => {
                        const deptVal = typeof dept === 'string' ? dept : (dept.name || dept.departmentName || `Dept ${idx + 1}`);
                        return (
                          <option key={idx} value={deptVal}>
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
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl text-slate-900 text-xs focus:outline-none transition font-medium"
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Create password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl text-slate-900 text-xs focus:outline-none transition font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl text-slate-900 text-xs focus:outline-none transition font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-2 py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition disabled:opacity-50 mt-2"
              >
                <span>{isLoading ? 'Generating Verification Code...' : 'Send Verification OTP to Gmail'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* VIEW 3: EMAIL OTP VERIFICATION STEP */}
          {authMode === 'signup' && otpStep && (
            <form onSubmit={handleVerifyOtpAndRegister} className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => setOtpStep(false)}
                  className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900 transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to details</span>
                </button>
                <div className="text-xs font-bold text-indigo-600">
                  Step 2 of 2: Gmail Verification
                </div>
              </div>

              <div className="text-center py-2">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 mx-auto flex items-center justify-center text-indigo-600 mb-2">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-base text-slate-900">
                  Enter 6-Digit Gmail OTP
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  We sent a 6-digit verification code to <strong>{email}</strong>
                </p>
                <div className="text-xs font-mono font-bold text-indigo-600 mt-1">
                  Code expires in: {formatTimer(otpTimer)}
                </div>
              </div>

              {/* Security Delivery Notice */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 text-xs text-indigo-900 flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold">Confidential Verification Code Dispatched</p>
                  <p className="text-[11px] text-slate-600">
                    Your 6-digit OTP has been sent securely to <strong>{email}</strong>. Please check your Gmail inbox (and Spam/Updates folder) to enter the code.
                  </p>
                </div>
              </div>

              {/* Email OTP Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Enter 6-Digit Email OTP
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                  <input
                    type="text"
                    required
                    maxLength="6"
                    placeholder="Enter 6-digit code"
                    value={emailOtp}
                    onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-10 pr-3.5 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl text-slate-900 text-base focus:outline-none transition font-mono font-bold tracking-widest text-center"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-2 py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition disabled:opacity-50 mt-3"
              >
                <span>{isLoading ? 'Verifying...' : 'Verify OTP & Complete Registration'}</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={isLoading || otpTimer > 540}
                  className="text-xs text-indigo-600 font-bold hover:underline disabled:opacity-50 disabled:no-underline inline-flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Resend Verification Code</span>
                </button>
              </div>
            </form>
          )}

        </div>


        {/* Google Sign-In Modal */}
        {showGoogleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 font-['Plus_Jakarta_Sans',sans-serif]">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full border border-slate-200 shadow-2xl space-y-5">
              
              {/* Header */}
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm mx-auto">
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                </div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                  {authMode === 'signup' ? 'Sign up with Google' : 'Continue with Google'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Enter your details to continue to <span className="text-indigo-600 font-bold">AI Code Validator 2.0</span>
                </p>
              </div>

              {/* Form Fields */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Your Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Rahul Sharma"
                    value={gName}
                    onChange={(e) => setGName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-600 transition font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Gmail / Email Address</label>
                  <input
                    type="email"
                    placeholder="yourname@gmail.com"
                    value={gEmail}
                    onChange={(e) => setGEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-600 transition font-medium"
                    autoFocus
                  />
                </div>

                {/* Faculty key field for teacher role */}
                {role === 'teacher' && (
                  <div>
                    <label className="block text-[11px] font-bold text-amber-700 mb-1">Faculty Authorization Key</label>
                    <input
                      type="password"
                      placeholder="Enter institutional faculty key"
                      value={gFacultyKey}
                      onChange={(e) => setGFacultyKey(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 transition font-medium"
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowGoogleModal(false); setGEmail(''); setGName(''); setGFacultyKey(''); }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleGoogleAuth()}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition disabled:opacity-50"
                >
                  {isLoading ? 'Please wait...' : 'Continue'}
                </button>
              </div>

            </div>
          </div>
        )}







        {/* Footnote */}
        <p className="text-center text-xs text-slate-500 mt-6 font-medium">
          Project Team: Deshmukh Vansh, Dhumal Jaydeep, Chede Omkar • Guide: Prof. Nitin Shivale
        </p>
      </div>

    </div>
  );
}
