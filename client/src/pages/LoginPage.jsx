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
      setEmailOtp('');
      setSuccessMsg(data.message || `A verification OTP has been dispatched to your Gmail (${email}). Please check your inbox.`);
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










        {/* Footnote */}
        <p className="text-center text-xs text-slate-500 mt-6 font-medium">
          Project Team: Deshmukh Vansh, Dhumal Jaydeep, Chede Omkar • Guide: Prof. Nitin Shivale
        </p>
      </div>

    </div>
  );
}
