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
  Phone,
  KeyRound,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  ArrowLeft
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
  const [mobile, setMobile] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [division, setDivision] = useState('A');
  const [departments, setDepartments] = useState([]);
  const [department, setDepartment] = useState('Computer Engineering');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [facultyKey, setFacultyKey] = useState('');

  // OTP Verification state
  const [otpStep, setOtpStep] = useState(false); // false: details form, true: enter OTPs
  const [emailOtp, setEmailOtp] = useState('');
  const [mobileOtp, setMobileOtp] = useState('');
  const [simulatedOtps, setSimulatedOtps] = useState(null);
  const [otpTimer, setOtpTimer] = useState(600);

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

  // OTP countdown timer
  useEffect(() => {
    if (!otpStep || otpTimer <= 0) return;
    const interval = setInterval(() => {
      setOtpTimer(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [otpStep, otpTimer]);

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

  // Step 1: Request OTP generation
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

    if (!mobile || mobile.trim().length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
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
          mobile,
          role,
          facultyKey: role === 'teacher' ? facultyKey : undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch verification codes');
      }

      if (data.simulation) {
        setSimulatedOtps(data.simulation);
      }

      setOtpStep(true);
      setOtpTimer(600);
      setSuccessMsg('Verification OTPs sent to your Email & Mobile Number!');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTPs and Complete Registration
  const handleVerifyOtpAndRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    if (!emailOtp || !mobileOtp) {
      setErrorMsg('Please enter both the Email OTP and Mobile OTP.');
      setIsLoading(false);
      return;
    }

    try {
      // 1. Verify OTPs
      const verifyRes = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          emailOtp,
          mobileOtp
        })
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        throw new Error(verifyData.error || 'OTP verification failed');
      }

      // 2. Complete Registration
      const regRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          mobile,
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

      setSuccessMsg('Account verified & registered successfully! Logging you in...');
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 dark:from-[#070b14] via-slate-100 dark:via-slate-800 to-indigo-50/30 dark:to-indigo-950/30 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-['Plus_Jakarta_Sans',sans-serif]">
      
      {onToggleTheme && (
        <div className="absolute top-6 right-6">
          <button
            onClick={onToggleTheme}
            className="p-2.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-xs transition"
            title="Toggle Light/Dark Theme"
          >
            {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-600" />}
          </button>
        </div>
      )}

      {/* Header / Brand */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-3xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 mb-4 animate-float">
          <BookOpen className="w-7 h-7" />
        </div>
        <div className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-1">
          JSPM BSIOTR Wagholi, Pune
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          AI Code Validator 2.0
        </h1>
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
          Two-Tier Plagiarism Analysis • Dynamic Viva Quizzes • Academic Integrity
        </p>
      </div>

      {/* Card Form */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 rounded-3xl p-7 sm:p-8 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 backdrop-blur-xl">
          
          {/* Top Mode Switcher (Sign In vs Sign Up) */}
          <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => { setAuthMode('signin'); setOtpStep(false); setErrorMsg(''); setSuccessMsg(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                authMode === 'signin'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                authMode === 'signup'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Register Account
            </button>
          </div>

          {/* Role Selector Pill Tabs */}
          <div className="mb-6">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Select Your Portal Role
            </label>
            <div className={`grid ${authMode === 'signup' ? 'grid-cols-2' : 'grid-cols-3'} gap-2`}>
              {/* Student */}
              <button
                type="button"
                onClick={() => setRole('student')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition ${
                  role === 'student'
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <GraduationCap className="w-4 h-4 mb-1" />
                <span className="text-xs">Student</span>
              </button>

              {/* Teacher */}
              <button
                type="button"
                onClick={() => setRole('teacher')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition ${
                  role === 'teacher'
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <UserCheck className="w-4 h-4 mb-1" />
                <span className="text-xs">Teacher</span>
              </button>

              {/* Admin (Sign In Only) */}
              {authMode === 'signin' && (
                <button
                  type="button"
                  onClick={() => setRole('admin')}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition ${
                    role === 'admin'
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4 mb-1" />
                  <span className="text-xs">Admin</span>
                </button>
              )}
            </div>
          </div>

          {/* Alert Messages */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 text-xs font-semibold flex items-start space-x-2">
              <span className="shrink-0 mt-0.5">⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-start space-x-2">
              <span className="shrink-0 mt-0.5">✓</span>
              <span>{successMsg}</span>
            </div>
          )}

          {/* VIEW 1: SIGN IN FORM */}
          {authMode === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Institutional Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="email"
                    required
                    placeholder={
                      role === 'admin' ? 'admin@jspm.edu' : 
                      role === 'teacher' ? 'teacher@jspm.edu' : 'student@jspm.edu'
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
            </form>
          )}

          {/* VIEW 2: SIGN UP / REGISTRATION FORM */}
          {authMode === 'signup' && !otpStep && (
            <form onSubmit={handleRequestOtp} className="space-y-3.5">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    College / Gmail
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                    <input
                      type="email"
                      required
                      placeholder="student@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-slate-700 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none transition font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Mobile Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                    <input
                      type="tel"
                      required
                      maxLength="10"
                      placeholder="10-digit number"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-slate-700 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none transition font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Faculty Authorization Key (Required only for Teachers) */}
              {role === 'teacher' && (
                <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <label className="text-xs font-bold text-amber-900 dark:text-amber-300">
                      Faculty Authorization Key (Mandatory)
                    </label>
                  </div>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-amber-500 absolute left-3.5 top-3 pointer-events-none" />
                    <input
                      type="password"
                      required
                      placeholder="Enter Institutional Faculty Key"
                      value={facultyKey}
                      onChange={(e) => setFacultyKey(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 focus:border-amber-500 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none transition font-medium"
                    />
                  </div>
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-1.5">
                    Security Gate: Only authorized faculty with the institutional key can create teacher accounts.
                  </p>
                </div>
              )}

              {role === 'student' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Roll Number
                      </label>
                      <div className="relative">
                        <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                        <input
                          type="text"
                          required
                          placeholder="CE2025-05"
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
                <span>{isLoading ? 'Sending Verification Codes...' : 'Verify Mobile & Email (Send OTP)'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* VIEW 3: OTP VERIFICATION STEP */}
          {authMode === 'signup' && otpStep && (
            <form onSubmit={handleVerifyOtpAndRegister} className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setOtpStep(false)}
                  className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
                <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                  Step 2 of 2: OTP Verification
                </div>
              </div>

              <div className="text-center py-2">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 mx-auto flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-2">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Verify Email & Mobile OTP
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Verification codes were sent to <strong>{email}</strong> and <strong>+91 {mobile}</strong>
                </p>
                <div className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                  Codes expire in: {formatTimer(otpTimer)}
                </div>
              </div>

              {/* Simulation Helper Pill for Viva / Lab Demo */}
              {simulatedOtps && (
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-[11px] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      Live Dispatched OTP Codes:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEmailOtp(simulatedOtps.emailOtp);
                        setMobileOtp(simulatedOtps.mobileOtp);
                      }}
                      className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition"
                    >
                      Auto-Fill Codes
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center font-mono font-bold text-emerald-900 dark:text-emerald-200">
                    <div className="p-1.5 rounded-lg bg-emerald-100/60 dark:bg-emerald-900/60">
                      📧 Email: {simulatedOtps.emailOtp}
                    </div>
                    <div className="p-1.5 rounded-lg bg-emerald-100/60 dark:bg-emerald-900/60">
                      📱 Mobile: {simulatedOtps.mobileOtp}
                    </div>
                  </div>
                </div>
              )}

              {/* Email OTP Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Enter 6-Digit Email OTP (Gmail)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="text"
                    required
                    maxLength="6"
                    placeholder="Enter 6-digit email OTP"
                    value={emailOtp}
                    onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-slate-700 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none transition font-mono font-bold tracking-widest"
                  />
                </div>
              </div>

              {/* Mobile OTP Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Enter 6-Digit Mobile SMS OTP
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="text"
                    required
                    maxLength="6"
                    placeholder="Enter 6-digit mobile OTP"
                    value={mobileOtp}
                    onChange={(e) => setMobileOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-slate-700 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none transition font-mono font-bold tracking-widest"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-200 dark:shadow-emerald-900/20 transition disabled:opacity-50 mt-3"
              >
                <span>{isLoading ? 'Verifying & Registering...' : 'Verify OTPs & Complete Registration'}</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={isLoading || otpTimer > 540}
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline disabled:opacity-50 disabled:no-underline inline-flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Resend New OTP Codes</span>
                </button>
              </div>
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
