import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import bcrypt from 'bcryptjs';

import { db } from './db.js';
import { authenticate, authorize, optionalAuth, generateToken } from './middleware/auth.js';
import { runTier1Check, compareCode } from './plagiarism/winnowing.js';
import { tokenizeCode } from './plagiarism/tokenizer.js';
import { runTier2Evaluation, generateCodeQuiz } from './services/gemini.js';
import { generateSubmissionReceipt } from './services/github.js';
import nodemailer from 'nodemailer';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve frontend build if present
const clientDist = path.join(__dirname, '../client/dist');
app.use(express.static(clientDist));

// In-memory file upload helper (for code files)
const upload = multer({ storage: multer.memoryStorage() });

// Profile photo storage — saved to server/data/avatars/
const AVATARS_DIR = path.join(__dirname, 'data', 'avatars');
if (!fs.existsSync(AVATARS_DIR)) {
  fs.mkdirSync(AVATARS_DIR, { recursive: true });
}

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, AVATARS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${req.params.userId}${ext}`);
  }
});
const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  }
});

// Serve avatar images
app.use('/api/profile/photo', express.static(AVATARS_DIR));

// Helper: Calculate robust Jaccard similarity between two code samples
export function jaccardSimilarity(code1, code2) {
  const c1 = (code1 || '').trim();
  const c2 = (code2 || '').trim();
  if (!c1 && !c2) return 100;
  if (!c1 || !c2) return 0;

  const rawTokens1 = tokenizeCode(c1);
  const rawTokens2 = tokenizeCode(c2);

  if (rawTokens1.length === 0 && rawTokens2.length === 0) return 100;
  if (rawTokens1.length === 0 || rawTokens2.length === 0) return 0;

  // 1. Literal token comparison (sensitive to variable names and identifiers)
  // Use raw identifier values so renaming variables actually changes the token stream
  const literalTokens1 = rawTokens1.map(t => (t.type === 'ID' ? t.raw.toLowerCase() : t.value));
  const literalTokens2 = rawTokens2.map(t => (t.type === 'ID' ? t.raw.toLowerCase() : t.value));

  // Build k-grams (k=2) to capture sequence and control flow
  const k = 2;
  const ngrams1 = new Set();
  for (let i = 0; i <= literalTokens1.length - k; i++) {
    ngrams1.add(literalTokens1.slice(i, i + k).join(' '));
  }
  const ngrams2 = new Set();
  for (let i = 0; i <= literalTokens2.length - k; i++) {
    ngrams2.add(literalTokens2.slice(i, i + k).join(' '));
  }

  // Jaccard similarity = intersection / union
  let intersection = 0;
  for (const gram of ngrams1) {
    if (ngrams2.has(gram)) intersection++;
  }
  const union = new Set([...ngrams1, ...ngrams2]).size;
  return union > 0 ? Math.round((intersection / union) * 100) : 0;
}

// ==========================================
// 1. HEALTH & SYSTEM STATUS
// ==========================================
app.get('/api/health', (req, res) => {
  try {
    const settings = db.getSettings();
    res.json({
      status: 'online',
      timestamp: new Date().toISOString(),
      geminiConfigured: Boolean(settings.geminiApiKey || process.env.GEMINI_API_KEY),
      usersCount: db.getUsers().length,
      assignmentsCount: db.getAssignments().length,
      submissionsCount: db.getSubmissions().length
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve system health: ' + err.message });
  }
});

// ==========================================
// 2. AUTHENTICATION & SESSION ENDPOINTS
// ==========================================

// Login: Hash-compare using bcrypt with legacy plain-text migration
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = db.findUserByEmail(email.trim());
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    let isPasswordValid = false;
    const isBcryptHash = typeof user.password === 'string' &&
      (user.password.startsWith('$2a$') || user.password.startsWith('$2b$'));

    if (isBcryptHash) {
      isPasswordValid = await bcrypt.compare(password, user.password);
    } else {
      // Legacy plain-text match check
      if (user.password === password) {
        isPasswordValid = true;
        // Transparent migration: hash password in background/DB
        const hashed = await bcrypt.hash(password, 10);
        db.updateUser(user.id, { password: hashed });
      }
    }

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update presence
    db.updateHeartbeat(user.id);

    // Generate real JWT token
    const token = generateToken(user);
    const updatedUser = db.findUserById(user.id) || user;
    const { password: _, ...safeUser } = updatedUser;

    res.json({ user: safeUser, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal login error: ' + err.message });
  }
});

// In-memory OTP Store: email -> { emailOtp, mobileOtp, mobile, role, expiresAt, verified }
const otpStore = new Map();

// Generate 6-digit OTP
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Nodemailer Transporter for Real Gmail OTP Dispatch
function getMailTransporter() {
  const user = process.env.GMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS;

  if (user && pass) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass }
    });
  }
  return null;
}

async function sendRealEmailOtp(toEmail, otpCode, role) {
  const transporter = getMailTransporter();
  if (!transporter) {
    console.log(`ℹ️ [MAILER] No Gmail credentials configured in .env. OTP for ${toEmail}: ${otpCode}`);
    return false;
  }

  const mailOptions = {
    from: `"JSPM BSIOTR AI Code Validator" <${process.env.GMAIL_USER || 'noreply@jspm.edu'}>`,
    to: toEmail,
    subject: `🔐 Your Verification OTP Code: ${otpCode} - JSPM BSIOTR`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #4f46e5; margin: 0;">JSPM BSIOTR Wagholi, Pune</h2>
          <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">AI-Based Code Validation Platform 2.0</p>
        </div>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 20px;">
          <p style="color: #334155; font-size: 14px; margin: 0 0 10px 0;">Your 6-Digit Email Verification Code for <strong>${role.toUpperCase()}</strong> registration is:</p>
          <div style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #4f46e5; font-family: monospace; padding: 10px 0;">
            ${otpCode}
          </div>
          <p style="color: #ef4444; font-size: 12px; margin: 8px 0 0 0;">Valid for 10 minutes. Do not share this code with anyone.</p>
        </div>
        <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">
          Department of Computer Engineering • Academic Year 2025-26
        </p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 [REAL EMAIL SENT] Successfully sent OTP ${otpCode} to ${toEmail}: ${info.messageId}`);
    return true;
  } catch (err) {
    console.error(`❌ [MAIL ERROR] Failed to send email to ${toEmail}:`, err.message);
    return false;
  }
}

// Endpoint: Send OTP for Email and Mobile verification
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { email, mobile, role = 'student', facultyKey } = req.body;

    if (!email || !mobile) {
      return res.status(400).json({ error: 'Email and mobile number are required for verification' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanMobile = mobile.trim();

    // Check if user already exists
    if (db.findUserByEmail(cleanEmail)) {
      return res.status(400).json({ error: 'An account with this email is already registered' });
    }

    // Security Gate: Teacher Registration Authorization Check
    const FACULTY_SECRET = process.env.FACULTY_SECRET_KEY || 'JSPM-FACULTY-2026';
    if (role === 'teacher') {
      if (!facultyKey || facultyKey.trim() !== FACULTY_SECRET) {
        return res.status(403).json({
          error: 'Unauthorized Faculty Key: You cannot register as a Teacher without a valid Institutional Faculty Key.'
        });
      }
    }

    const emailOtp = generateOtp();
    const mobileOtp = generateOtp();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    otpStore.set(cleanEmail, {
      emailOtp,
      mobileOtp,
      mobile: cleanMobile,
      role,
      expiresAt,
      verified: false
    });

    // Send real Gmail OTP
    const sentRealMail = await sendRealEmailOtp(cleanEmail, emailOtp, role);

    console.log(`\n🔐 [SECURE OTP LOG] Dispatch for ${cleanEmail} (${cleanMobile}):`);
    console.log(`   📧 Email OTP:  ${emailOtp} ${sentRealMail ? '(SENT VIA GMAIL)' : '(Logged to Server Terminal)'}`);
    console.log(`   📱 Mobile OTP: ${mobileOtp} (Logged to Server Terminal)\n`);

    res.json({
      success: true,
      message: sentRealMail
        ? `Verification OTP sent to your Gmail inbox (${cleanEmail})!`
        : `Verification code generated. Please check your email inbox.`,
      expiresInSeconds: 600
    });
  } catch (err) {
    console.error('Send OTP error:', err);
    res.status(500).json({ error: 'Failed to dispatch verification codes: ' + err.message });
  }
});

// Endpoint: Verify OTP codes
app.post('/api/auth/verify-otp', (req, res) => {
  try {
    const { email, emailOtp, mobileOtp } = req.body;
    if (!email || !emailOtp || !mobileOtp) {
      return res.status(400).json({ error: 'Email and both OTP codes are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const record = otpStore.get(cleanEmail);

    if (!record) {
      return res.status(400).json({ error: 'No active OTP verification session found. Please request a new OTP.' });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(cleanEmail);
      return res.status(400).json({ error: 'Verification codes have expired. Please request new codes.' });
    }

    if (record.emailOtp !== emailOtp.trim() || record.mobileOtp !== mobileOtp.trim()) {
      return res.status(400).json({ error: 'Invalid OTP codes. Please double-check the codes entered.' });
    }

    record.verified = true;
    res.json({
      success: true,
      message: 'Both Email and Mobile Number successfully verified!'
    });
  } catch (err) {
    res.status(500).json({ error: 'OTP verification failed: ' + err.message });
  }
});

// Register: Force student/teacher only, facultyKey verification, bcrypt hash, presence
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role = 'student', rollNo, department, division, mobile, facultyKey, skipOtp } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();

    if (db.findUserByEmail(cleanEmail)) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Security Gate 1: Block unauthorized Teacher registration
    const FACULTY_SECRET = process.env.FACULTY_SECRET_KEY || 'JSPM-FACULTY-2026';
    let safeRole = 'student';
    if (role === 'teacher') {
      if (!facultyKey || facultyKey.trim() !== FACULTY_SECRET) {
        return res.status(403).json({
          error: 'Unauthorized: Invalid Faculty Authorization Key. Only approved faculty can register as teachers.'
        });
      }
      safeRole = 'teacher';
    } else {
      safeRole = 'student';
    }

    // Security Gate 2: OTP Verification Check (unless automated test skip flag is passed)
    if (!skipOtp) {
      const record = otpStore.get(cleanEmail);
      if (record && !record.verified) {
        return res.status(400).json({ error: 'Please verify both Email and Mobile OTPs before completing registration.' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      id: `usr_${Date.now()}`,
      name: name.trim(),
      email: cleanEmail,
      mobile: mobile ? mobile.trim() : undefined,
      password: hashedPassword,
      role: safeRole,
      rollNo: safeRole === 'student' ? (rollNo || `CE2025-${Math.floor(10 + Math.random() * 90)}`) : undefined,
      department: department || 'Computer Engineering',
      division: safeRole === 'student' ? (division || 'A') : undefined,
      divisions: safeRole === 'teacher' ? ['A'] : undefined,
      lastHeartbeat: new Date().toISOString(),
      isOnline: true,
      createdAt: new Date().toISOString()
    };

    db.addUser(newUser);
    // Cleanup OTP session
    otpStore.delete(cleanEmail);

    const token = generateToken(newUser);
    const { password: _, ...safeUser } = newUser;

    res.status(201).json({ user: safeUser, token });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed: ' + err.message });
  }
});

// Heartbeat endpoint
app.post('/api/auth/heartbeat', authenticate, (req, res) => {
  try {
    db.updateHeartbeat(req.user.id);
    res.json({ success: true, isOnline: true });
  } catch (err) {
    res.status(500).json({ error: 'Heartbeat update failed: ' + err.message });
  }
});

// Logout endpoint
app.post('/api/auth/logout', authenticate, (req, res) => {
  try {
    db.markUserOffline(req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Logout failed: ' + err.message });
  }
});

// ==========================================
// 3. ADMIN MANAGEMENT ENDPOINTS
// ==========================================

// Admin: Faculty/Teachers list
app.get('/api/admin/teachers', authenticate, authorize('admin'), (req, res) => {
  try {
    const teachers = db.getUsers().filter(u => u.role === 'teacher').map(({ password, ...u }) => u);
    res.json(teachers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve teachers: ' + err.message });
  }
});

// Admin: Add Teacher
app.post('/api/admin/teachers', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { name, email, password = 'password123', department = 'Computer Engineering', title = 'Assistant Professor' } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }
    if (db.findUserByEmail(email.trim())) {
      return res.status(400).json({ error: 'A user with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newTeacher = {
      id: `usr_teacher_${Date.now()}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      role: 'teacher',
      department,
      title,
      isOnline: false,
      lastHeartbeat: null,
      createdAt: new Date().toISOString()
    };

    db.addUser(newTeacher);
    const { password: _, ...safeTeacher } = newTeacher;
    res.status(201).json(safeTeacher);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create teacher: ' + err.message });
  }
});

// Admin: Remove Teacher
app.delete('/api/admin/teachers/:id', authenticate, authorize('admin'), (req, res) => {
  try {
    const { id } = req.params;
    const user = db.findUserById(id);
    if (!user || user.role !== 'teacher') {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    db.deleteUser(id);
    res.json({ success: true, message: 'Teacher removed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete teacher: ' + err.message });
  }
});

// Admin: Comprehensive Overview with Department & Division Stats
app.get('/api/admin/overview', authenticate, authorize('admin'), (req, res) => {
  try {
    const users = db.getUsers();
    const students = users.filter(u => u.role === 'student');
    const teachers = users.filter(u => u.role === 'teacher');
    const assignments = db.getAssignments();
    const submissions = db.getSubmissions();
    const subjects = db.getSubjects();
    const quizRequests = db.getQuizAccessRequests();
    const announcements = db.getAnnouncements();

    // 2-minute presence window
    const onlineUsers = db.getOnlineUsers(null, 120000);
    const onlineUserIds = new Set(onlineUsers.map(u => u.id));
    const onlineStudents = onlineUsers.filter(u => u.role === 'student');
    const onlineTeachers = onlineUsers.filter(u => u.role === 'teacher');

    // Department & Division Stats
    const departments = db.getDepartments();
    const deptStats = departments.map(d => {
      const deptStudents = students.filter(s => s.department === d.name || s.department === d.code);
      const deptTeachers = teachers.filter(t => t.department === d.name || t.department === d.code);

      const divisionMetrics = (d.divisions && d.divisions.length > 0 ? d.divisions : ['A', 'B', 'C']).map(div => {
        const divName = typeof div === 'string' ? div : (div?.division || 'A');
        const divStudents = deptStudents.filter(s => (s.division || 'A') === divName);
        return {
          division: divName,
          studentCount: divStudents.length,
          onlineCount: divStudents.filter(s => onlineUserIds.has(s.id)).length
        };
      });

      return {
        id: d.id,
        name: d.name,
        code: d.code,
        studentCount: deptStudents.length,
        teacherCount: deptTeachers.length,
        divisions: Array.isArray(d.divisions) ? d.divisions : ['A', 'B', 'C'],
        divisionStats: divisionMetrics,
        divisionsList: divisionMetrics
      };
    });

    // Teacher assignment workload stats
    const teacherWorkload = teachers.map(t => {
      const teacherAsgs = assignments.filter(a => a.teacherId === t.id);
      const asgIds = new Set(teacherAsgs.map(a => a.id));
      const teacherSubs = submissions.filter(s => asgIds.has(s.assignmentId));
      return {
        teacherId: t.id,
        name: t.name,
        email: t.email,
        department: t.department,
        assignmentCount: teacherAsgs.length,
        submissionCount: teacherSubs.length,
        isOnline: onlineUserIds.has(t.id)
      };
    });

    res.json({
      totalStudents: students.length,
      totalTeachers: teachers.length,
      totalAssignments: assignments.length,
      totalSubmissions: submissions.length,
      totalSubjects: subjects.length,
      pendingQuizRequests: quizRequests.filter(r => r.status === 'pending').length,
      totalAnnouncements: announcements.length,
      onlineUsersCount: onlineUsers.length,
      offlineUsersCount: users.length - onlineUsers.length,
      onlineStudentsCount: onlineStudents.length,
      onlineTeachersCount: onlineTeachers.length,
      onlineStudents: onlineStudents.length,
      onlineTeachers: onlineTeachers.length,
      teachers: teachers.map(({ password, ...t }) => ({
        ...t,
        isOnline: onlineUserIds.has(t.id)
      })),
      students: students.map(({ password, ...s }) => ({
        ...s,
        isOnline: onlineUserIds.has(s.id)
      })),
      departments: deptStats,
      teacherWorkload,
      subjects,
      recentSubmissions: submissions.slice(-10).reverse(),
      passRate: submissions.length > 0 ? Math.round((submissions.filter(s => s.quizPassed).length / submissions.length) * 100) : 0
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate admin overview: ' + err.message });
  }
});

// Admin: Department Management CRUD
app.get('/api/admin/departments', authenticate, authorize('admin'), (req, res) => {
  try {
    const depts = db.getDepartments();
    res.json(depts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch departments: ' + err.message });
  }
});

app.post('/api/admin/departments', authenticate, authorize('admin'), (req, res) => {
  try {
    const { name, code, divisions = ['A', 'B'] } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Department name is required' });
    }

    const newDept = {
      id: `dept_${Date.now()}`,
      name: name.trim(),
      code: code ? code.trim().toUpperCase() : name.trim().substring(0, 4).toUpperCase(),
      divisions: Array.isArray(divisions) && divisions.length > 0 ? divisions : ['A', 'B'],
      createdAt: new Date().toISOString()
    };

    db.addDepartment(newDept);
    res.status(201).json(newDept);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create department: ' + err.message });
  }
});

app.put('/api/admin/departments/:id', authenticate, authorize('admin'), (req, res) => {
  try {
    const updated = db.updateDepartment(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Department not found' });
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update department: ' + err.message });
  }
});

app.delete('/api/admin/departments/:id', authenticate, authorize('admin'), (req, res) => {
  try {
    const success = db.deleteDepartment(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Department not found' });
    }
    res.json({ success: true, message: 'Department deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete department: ' + err.message });
  }
});

// Admin: Students List with submission/quiz stats
app.get('/api/admin/students', authenticate, authorize('admin'), (req, res) => {
  try {
    const users = db.getUsers();
    const submissions = db.getSubmissions();
    const now = Date.now();

    const students = users
      .filter(u => u.role === 'student')
      .map(({ password, ...s }) => {
        const studentSubs = submissions.filter(sub => sub.studentId === s.id);
        const passedSubs = studentSubs.filter(sub => sub.quizPassed);
        const avgQuiz = studentSubs.length > 0
          ? Math.round(studentSubs.reduce((acc, sub) => acc + (sub.quizScore || 0), 0) / studentSubs.length)
          : 0;

        const isOnline = Boolean(
          s.isOnline && s.lastHeartbeat && (now - new Date(s.lastHeartbeat).getTime() <= 120000)
        );

        return {
          ...s,
          totalSubmissions: studentSubs.length,
          passedSubmissions: passedSubs.length,
          averageQuizScore: avgQuiz,
          isOnline
        };
      });

    res.json(students);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve students: ' + err.message });
  }
});

// Admin: Detailed Student Profile
app.get('/api/admin/students/:id', authenticate, authorize('admin'), (req, res) => {
  try {
    const student = db.findUserById(req.params.id);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ error: 'Student not found' });
    }

    const { password, ...safeStudent } = student;
    const submissions = db.getSubmissions({ studentId: student.id });
    const quizPermissions = db.getQuizPermissions({ studentId: student.id });
    const quizRequests = db.getQuizAccessRequests({ studentId: student.id });
    const vivaSubmissions = db.getVivaSubmissions({ studentId: student.id });
    const assignments = db.getAssignments();

    const completedAssignmentIds = new Set(submissions.filter(s => s.quizPassed).map(s => s.assignmentId));

    res.json({
      student: safeStudent,
      submissions,
      quizPermissions,
      quizRequests,
      vivaSubmissions,
      stats: {
        totalAssignments: assignments.length,
        completedAssignments: completedAssignmentIds.size,
        submissionCount: submissions.length,
        averageQuizScore: submissions.length > 0
          ? Math.round(submissions.reduce((acc, s) => acc + (s.quizScore || 0), 0) / submissions.length)
          : 0
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve student profile: ' + err.message });
  }
});

// Admin: Delete Student
app.delete('/api/admin/students/:id', authenticate, authorize('admin'), (req, res) => {
  try {
    const user = db.findUserById(req.params.id);
    if (!user || user.role !== 'student') {
      return res.status(404).json({ error: 'Student not found' });
    }
    db.deleteUser(req.params.id);
    res.json({ success: true, message: 'Student removed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete student: ' + err.message });
  }
});

// ==========================================
// 4. ASSIGNMENTS ENDPOINTS
// ==========================================

// Get all assignments (public / optionalAuth)
app.get('/api/assignments', optionalAuth, (req, res) => {
  try {
    const assignments = db.getAssignments();
    const submissions = db.getSubmissions();

    const enriched = assignments.map(a => {
      const asgSubs = submissions.filter(s => s.assignmentId === a.id);
      return {
        ...a,
        submissionCount: asgSubs.length,
        averageQuizScore: asgSubs.length > 0
          ? Math.round(asgSubs.reduce((acc, curr) => acc + (curr.quizScore || 0), 0) / asgSubs.length)
          : 0
      };
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch assignments: ' + err.message });
  }
});

// Get single assignment
app.get('/api/assignments/:id', optionalAuth, (req, res) => {
  try {
    const assignment = db.getAssignmentById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    res.json(assignment);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch assignment: ' + err.message });
  }
});

// Create assignment (Teacher/Admin only)
app.post('/api/assignments', authenticate, authorize('teacher', 'admin'), (req, res) => {
  try {
    const { title, subject, code, deadline, languages, minQuizScore, description, starterCode } = req.body;
    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    const newAsg = {
      id: `asg_${Date.now()}`,
      title: title.trim(),
      subject: subject || 'Computer Science',
      code: code || `CS${Math.floor(100 + Math.random() * 900)}`,
      deadline: deadline || new Date(Date.now() + 14 * 86400000).toISOString(),
      languages: Array.isArray(languages) && languages.length > 0 ? languages : ['python'],
      minQuizScore: Number(minQuizScore) || 70,
      description,
      starterCode: starterCode || { python: '# Write your solution here\n' },
      teacherId: req.user.role === 'teacher' ? req.user.id : (req.body.teacherId || null)
    };

    db.addAssignment(newAsg);
    res.status(201).json(newAsg);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create assignment: ' + err.message });
  }
});

// Update assignment (Teacher/Admin only)
app.put('/api/assignments/:id', authenticate, authorize('teacher', 'admin'), (req, res) => {
  try {
    const asg = db.getAssignmentById(req.params.id);
    if (!asg) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    if (req.user.role === 'teacher' && asg.teacherId && asg.teacherId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied: You can only edit your own assignments' });
    }

    const updated = db.updateAssignment(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update assignment: ' + err.message });
  }
});

// Delete assignment (Teacher/Admin only)
app.delete('/api/assignments/:id', authenticate, authorize('teacher', 'admin'), (req, res) => {
  try {
    const asg = db.getAssignmentById(req.params.id);
    if (!asg) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    if (req.user.role === 'teacher' && asg.teacherId && asg.teacherId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied: You can only delete your own assignments' });
    }

    db.deleteAssignment(req.params.id);
    res.json({ success: true, message: 'Assignment deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete assignment: ' + err.message });
  }
});

// File Upload Helper
app.post('/api/upload', upload.single('codeFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const content = req.file.buffer.toString('utf8');
  const filename = req.file.originalname;
  res.json({ filename, code: content });
});

// ==========================================
// 5. VALIDATION & CODE ANALYSIS
// ==========================================

// Tier-1 Plagiarism Check
app.post('/api/validate/tier1', authenticate, (req, res) => {
  try {
    const { code, assignmentId } = req.body;
    const studentId = req.user.role === 'student' ? req.user.id : (req.body.studentId || req.user.id);

    if (!code || !code.trim()) {
      return res.status(400).json({ error: 'Code content is required for validation' });
    }

    const settings = db.getSettings();
    let pastSubs = [];
    if (assignmentId && assignmentId !== 'all') {
      pastSubs = db.getSubmissions({ assignmentId }).filter(s => s.studentId !== studentId);
      // Fallback: if no past submissions for this assignment, compare across all assignments
      if (pastSubs.length === 0) {
        pastSubs = db.getSubmissions().filter(s => s.studentId !== studentId);
      }
    } else {
      pastSubs = db.getSubmissions().filter(s => s.studentId !== studentId);
    }

    const result = runTier1Check(code, pastSubs, {
      lowThreshold: settings.tier1ThresholdLow || 25,
      highThreshold: settings.tier1ThresholdHigh || 60
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Tier-1 check failed: ' + err.message });
  }
});

// Tier-2 Gemini AI Semantic Check
app.post('/api/validate/tier2', authenticate, async (req, res) => {
  try {
    const { code, assignmentId, referenceCode, studentName } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }

    const assignment = assignmentId ? db.getAssignmentById(assignmentId) : null;
    const settings = db.getSettings();
    const apiKey = settings.geminiApiKey || process.env.GEMINI_API_KEY;

    const analysis = await runTier2Evaluation({
      code,
      referenceCode,
      assignmentTitle: assignment ? assignment.title : 'Coding Assignment',
      language: assignment && assignment.languages ? assignment.languages[0] : 'python',
      apiKey,
      studentName: studentName || req.user.name
    });

    res.json(analysis);
  } catch (err) {
    console.error('Tier-2 evaluation error:', err);
    res.status(500).json({ error: 'Failed to run Tier-2 Gemini check: ' + err.message });
  }
});

// ==========================================
// 6. QUIZ SYSTEM (PERMISSIONS & EVALUATION)
// ==========================================

// Generate AI Viva Quiz — checks quiz permission for student
app.post('/api/quiz/generate', authenticate, async (req, res) => {
  try {
    const { code, assignmentId, language } = req.body;
    const studentId = req.user.role === 'student' ? req.user.id : (req.body.studentId || req.user.id);

    if (!code || !assignmentId) {
      return res.status(400).json({ error: 'Code and assignmentId are required' });
    }

    // Check quiz permission
    const permission = db.getStudentQuizPermission(studentId, assignmentId);
    if (!permission || permission.status !== 'available') {
      return res.status(403).json({
        error: 'Quiz access not authorized. Your teacher must enable quiz permission for this assignment before you can take the viva.',
        permissionStatus: permission ? permission.status : 'locked',
        requiresApproval: true
      });
    }

    const assignment = db.getAssignmentById(assignmentId);
    const settings = db.getSettings();
    const apiKey = settings.geminiApiKey || process.env.GEMINI_API_KEY;

    const questions = await generateCodeQuiz({
      code,
      assignmentTitle: assignment ? assignment.title : 'Data Structures',
      language: language || (assignment && assignment.languages ? assignment.languages[0] : 'python'),
      apiKey
    });

    // Strip answers from client payload
    const sanitizedQuestions = questions.map((q, idx) => ({
      id: q.id || idx + 1,
      question: q.question,
      options: q.options
    }));

    // Cache solution keys in server memory
    const quizKey = `quiz_${assignmentId}_${studentId}_${Date.now()}`;
    req.app.locals[quizKey] = questions;

    setTimeout(() => {
      delete req.app.locals[quizKey];
    }, 30 * 60 * 1000); // 30 min TTL

    res.json({
      questions: sanitizedQuestions,
      quizKey,
      count: sanitizedQuestions.length,
      passingThreshold: assignment ? assignment.minQuizScore : 70
    });
  } catch (err) {
    console.error('Quiz generation error:', err);
    res.status(500).json({ error: 'Failed to generate quiz: ' + err.message });
  }
});

// Submit Quiz & Evaluate
app.post('/api/quiz/submit', authenticate, (req, res) => {
  try {
    const { quizKey, answers, assignmentId } = req.body;
    const studentId = req.user.role === 'student' ? req.user.id : (req.body.studentId || req.user.id);

    if (!answers || !assignmentId) {
      return res.status(400).json({ error: 'Answers and assignmentId are required' });
    }

    const assignment = db.getAssignmentById(assignmentId);
    const minScore = assignment ? assignment.minQuizScore : 70;

    let storedQuestions = quizKey ? req.app.locals[quizKey] : null;
    if (!storedQuestions) {
      storedQuestions = [
        { id: 1, correctIndex: 2, explanation: 'Inserting strictly ascending values degenerates into an O(n) skewed tree.' },
        { id: 2, correctIndex: 0, explanation: 'Iterative traversal uses O(1) auxiliary space without recursion stack frames.' },
        { id: 3, correctIndex: 1, explanation: 'When tree is empty, search loop terminates safely without error.' },
        { id: 4, correctIndex: 1, explanation: 'In-order traversal yields elements in sorted ascending order.' },
        { id: 5, correctIndex: 1, explanation: 'Collecting n elements takes O(n) auxiliary space.' },
        { id: 6, correctIndex: 1, explanation: 'Unassigned pointers default to None.' },
        { id: 7, correctIndex: 1, explanation: 'Duplicate keys are rejected or ignored.' },
        { id: 8, correctIndex: 1, explanation: 'Balanced BST search takes O(log n) time.' },
        { id: 9, correctIndex: 0, explanation: 'Values smaller than root traverse to left child.' },
        { id: 10, correctIndex: 1, explanation: 'Reverse in-order traversal (Right -> Root -> Left) produces descending keys.' }
      ];
    }

    let correctCount = 0;
    const breakdown = storedQuestions.map((q, idx) => {
      const studentAnswer = answers[idx];
      const isCorrect = studentAnswer === q.correctIndex;
      if (isCorrect) correctCount++;
      return {
        questionId: q.id,
        question: q.question,
        studentSelected: studentAnswer,
        correctIndex: q.correctIndex,
        isCorrect,
        explanation: q.explanation || 'Correct conceptual understanding demonstrated.'
      };
    });

    const percentage = Math.round((correctCount / storedQuestions.length) * 100);
    const passed = percentage >= minScore;

    if (quizKey && req.app.locals[quizKey]) {
      delete req.app.locals[quizKey];
    }

    // Update permission status & attempt history
    const permission = db.getStudentQuizPermission(studentId, assignmentId);
    if (permission) {
      const currentAttempts = (permission.attemptsUsed || 0) + 1;
      const maxAttempts = permission.maxAttempts || 3;
      let newStatus = permission.status;

      if (passed) {
        newStatus = 'completed';
      } else if (currentAttempts >= maxAttempts) {
        newStatus = 'locked';
      }

      db.updateQuizPermission(permission.id, {
        attemptsUsed: currentAttempts,
        status: newStatus,
        lastScore: percentage,
        lastAttemptAt: new Date().toISOString()
      });
    }

    res.json({
      score: percentage,
      correctCount,
      totalQuestions: storedQuestions.length,
      minRequiredScore: minScore,
      passed,
      canSubmitToGithub: passed,
      breakdown
    });
  } catch (err) {
    res.status(500).json({ error: 'Quiz submission error: ' + err.message });
  }
});

// ==========================================
// 7. SUBMISSIONS & GITHUB VERIFICATION
// ==========================================

// Final Assignment Submission
app.post('/api/submissions/final', authenticate, (req, res) => {
  try {
    const {
      assignmentId,
      code,
      language,
      tier1Result,
      tier2Result,
      quizResult,
      githubRepoUrl
    } = req.body;

    const studentId = req.user.role === 'student' ? req.user.id : (req.body.studentId || req.user.id);

    if (!assignmentId || !code) {
      return res.status(400).json({ error: 'Missing required assignmentId or code' });
    }

    const student = db.findUserById(studentId);
    const assignment = db.getAssignmentById(assignmentId);

    if (!student || !assignment) {
      return res.status(404).json({ error: 'Student or assignment not found' });
    }

    // Enforce quiz passing condition
    if (!quizResult || !quizResult.passed) {
      return res.status(403).json({
        error: `Final submission locked: You must pass the AI viva quiz with at least ${assignment.minQuizScore}% score first!`
      });
    }

    const receipt = generateSubmissionReceipt({
      studentId: student.id,
      rollNo: student.rollNo,
      studentName: student.name,
      assignmentId: assignment.id,
      assignmentTitle: assignment.title,
      quizScore: quizResult.score,
      tier1Score: tier1Result?.score || 0,
      tier2Verdict: tier2Result?.verdict,
      githubRepoUrl
    });

    const submissionRecord = {
      id: `sub_${Date.now()}`,
      assignmentId: assignment.id,
      assignmentTitle: assignment.title,
      studentId: student.id,
      studentName: student.name,
      rollNo: student.rollNo,
      department: student.department,
      language: language || 'python',
      submittedAt: new Date().toISOString(),
      code,
      tier1Score: tier1Result?.score || 0,
      tier1Verdict: tier1Result?.verdict || 'Clean',
      tier2Score: tier2Result?.semanticSimilarityScore || null,
      tier2Verdict: tier2Result?.verdict || null,
      tier2Report: tier2Result || null,
      quizScore: quizResult.score,
      quizPassed: true,
      githubStatus: 'Committed & Pushed',
      githubCommitSha: receipt.commitSha,
      githubRepoUrl: receipt.github.repoUrl,
      verificationHash: receipt.verificationHash,
      status: 'Approved'
    };

    db.saveSubmission(submissionRecord);

    // Activity log
    db.addActivityLog({
      id: `log_${Date.now()}`,
      action: 'assignment_final_submitted',
      userId: student.id,
      userName: student.name,
      details: `Completed submission for ${assignment.title} (Quiz: ${quizResult.score}%)`,
      timestamp: new Date().toISOString()
    });

    res.status(201).json({
      success: true,
      submission: submissionRecord,
      receipt
    });
  } catch (err) {
    res.status(500).json({ error: 'Submission failed: ' + err.message });
  }
});

// Submissions Queries
app.get('/api/submissions', authenticate, (req, res) => {
  try {
    const { assignmentId } = req.query;
    let studentId = req.query.studentId;

    // Enforce student privacy
    if (req.user.role === 'student') {
      studentId = req.user.id;
    }

    const submissions = db.getSubmissions({ assignmentId, studentId });
    res.json(submissions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve submissions: ' + err.message });
  }
});

// Teacher Analytics Matrix
app.get('/api/analytics/matrix/:assignmentId', authenticate, authorize('teacher', 'admin'), (req, res) => {
  try {
    const { assignmentId } = req.params;
    const subs = db.getSubmissions({ assignmentId });

    const matrix = [];
    for (let i = 0; i < subs.length; i++) {
      for (let j = i + 1; j < subs.length; j++) {
        const comp = compareCode(subs[i].code, subs[j].code);
        matrix.push({
          studentA: { id: subs[i].studentId, name: subs[i].studentName, rollNo: subs[i].rollNo },
          studentB: { id: subs[j].studentId, name: subs[j].studentName, rollNo: subs[j].rollNo },
          similarity: comp.similarity,
          sharedBlocks: comp.intersectionCount
        });
      }
    }

    res.json({
      assignmentId,
      totalSubmissions: subs.length,
      pairsCompared: matrix.length,
      matrix: matrix.sort((a, b) => b.similarity - a.similarity)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate similarity matrix: ' + err.message });
  }
});

// ==========================================
// 8. QUIZ PERMISSIONS MANAGEMENT (TEACHER)
// ==========================================

// Get permissions (filtered by teacher assignments if teacher)
app.get('/api/quiz-permissions', authenticate, authorize('teacher', 'admin'), (req, res) => {
  try {
    let perms = db.getQuizPermissions();

    if (req.user.role === 'teacher') {
      const teacherAsgs = db.getAssignments().filter(a => a.teacherId === req.user.id).map(a => a.id);
      perms = perms.filter(p => teacherAsgs.includes(p.assignmentId));
    }

    if (req.query.assignmentId) perms = perms.filter(p => p.assignmentId === req.query.assignmentId);
    if (req.query.studentId) perms = perms.filter(p => p.studentId === req.query.studentId);
    if (req.query.status) perms = perms.filter(p => p.status === req.query.status);

    res.json(perms);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch quiz permissions: ' + err.message });
  }
});

// Create/Update permission (grant access to student)
app.post('/api/quiz-permissions', authenticate, authorize('teacher', 'admin'), (req, res) => {
  try {
    const { studentId, assignmentId, status = 'available', maxAttempts, expiresAt } = req.body;
    if (!studentId || !assignmentId) {
      return res.status(400).json({ error: 'studentId and assignmentId are required' });
    }

    const existing = db.getStudentQuizPermission(studentId, assignmentId);
    if (existing) {
      const updated = db.updateQuizPermission(existing.id, {
        status: status || 'available',
        grantedBy: req.user.id,
        updatedAt: new Date().toISOString(),
        ...(maxAttempts !== undefined ? { maxAttempts: Number(maxAttempts) } : {}),
        ...(expiresAt !== undefined ? { expiresAt } : {})
      });
      return res.json(updated);
    }

    const newPerm = {
      id: `qp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      studentId,
      assignmentId,
      status: status || 'available',
      attemptsUsed: 0,
      maxAttempts: maxAttempts ? Number(maxAttempts) : 3,
      grantedBy: req.user.id,
      grantedAt: new Date().toISOString(),
      expiresAt: expiresAt || null
    };

    db.addQuizPermission(newPerm);

    // Notify student
    db.addNotification({
      id: `notif_${Date.now()}`,
      userId: studentId,
      type: 'quiz_permission_granted',
      title: 'Quiz Access Enabled!',
      message: `Your teacher has granted you quiz access for assignment ${assignmentId}. You can now take the viva.`,
      relatedId: newPerm.id,
      read: false,
      createdAt: new Date().toISOString()
    });

    res.status(201).json(newPerm);
  } catch (err) {
    res.status(500).json({ error: 'Failed to grant quiz permission: ' + err.message });
  }
});

// Update permission status
app.put('/api/quiz-permissions/:id', authenticate, authorize('teacher', 'admin'), (req, res) => {
  try {
    const updated = db.updateQuizPermission(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Quiz permission not found' });
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update quiz permission: ' + err.message });
  }
});

// Get all permissions for a student
app.get('/api/quiz-permissions/student/:studentId', authenticate, (req, res) => {
  try {
    if (req.user.role === 'student' && req.user.id !== req.params.studentId) {
      return res.status(403).json({ error: 'Access denied: You can only view your own permissions' });
    }

    const perms = db.getQuizPermissions({ studentId: req.params.studentId });
    res.json(perms);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch student permissions: ' + err.message });
  }
});

// Check if student has active permission for assignment
app.get('/api/quiz-permissions/check/:assignmentId/:studentId', authenticate, (req, res) => {
  try {
    if (req.user.role === 'student' && req.user.id !== req.params.studentId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const perm = db.getStudentQuizPermission(req.params.studentId, req.params.assignmentId);
    const hasActivePermission = Boolean(perm && perm.status === 'available');

    res.json({
      hasPermission: hasActivePermission,
      permission: perm || null,
      status: perm ? perm.status : 'locked'
    });
  } catch (err) {
    res.status(500).json({ error: 'Permission check error: ' + err.message });
  }
});

// ==========================================
// 9. TEACHER STUDENT VIEWS
// ==========================================

// Teacher: Get all students with submission & quiz status for an assignment
app.get('/api/teacher/students/:assignmentId', authenticate, authorize('teacher', 'admin'), (req, res) => {
  try {
    const { assignmentId } = req.params;
    const assignment = db.getAssignmentById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const students = db.getUsers().filter(u => u.role === 'student');
    const subs = db.getSubmissions({ assignmentId });
    const perms = db.getQuizPermissions({ assignmentId });
    const vivas = db.getVivaSubmissions({ assignmentId });

    const studentList = students.map(({ password, ...s }) => {
      const studentSub = subs.find(sub => sub.studentId === s.id);
      const studentPerm = perms.find(p => p.studentId === s.id);
      const studentViva = vivas.find(v => v.studentId === s.id);

      return {
        ...s,
        hasSubmitted: Boolean(studentSub),
        submission: studentSub || null,
        quizPermission: studentPerm || null,
        permissionStatus: studentPerm ? studentPerm.status : 'locked',
        vivaSubmission: studentViva || null
      };
    });

    res.json({ assignment, students: studentList });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve assignment students: ' + err.message });
  }
});

// Teacher: Full student detail with all submissions, permissions, and viva records
app.get('/api/teacher/student-detail/:studentId', authenticate, authorize('teacher', 'admin'), (req, res) => {
  try {
    const student = db.findUserById(req.params.studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const { password, ...safeStudent } = student;
    const submissions = db.getSubmissions({ studentId: student.id });
    const permissions = db.getQuizPermissions({ studentId: student.id });
    const vivaSubmissions = db.getVivaSubmissions({ studentId: student.id });
    const quizRequests = db.getQuizAccessRequests({ studentId: student.id });

    res.json({
      student: safeStudent,
      submissions,
      quizPermissions: permissions,
      vivaSubmissions,
      quizRequests
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve student details: ' + err.message });
  }
});

// ==========================================
// 10. VIVA CODE EDITOR ENDPOINTS
// ==========================================

// Submit viva code reproduction & calculate similarity
app.post('/api/viva/submit', authenticate, (req, res) => {
  try {
    const { assignmentId, code, language } = req.body;
    if (!assignmentId || !code) {
      return res.status(400).json({ error: 'assignmentId and code are required' });
    }

    // Retrieve student's original submission
    const subs = db.getSubmissions({ assignmentId, studentId: req.user.id });
    const originalSub = subs.length > 0 ? subs[subs.length - 1] : null;
    const originalCode = originalSub ? originalSub.code : '';

    const similarity = jaccardSimilarity(originalCode, code);

    const vivaRecord = {
      id: `viva_${Date.now()}`,
      studentId: req.user.id,
      studentName: req.user.name,
      rollNo: req.user.rollNo,
      assignmentId,
      code,
      vivaCode: code,
      language: language || 'python',
      similarity,
      jaccardSimilarity: similarity,
      submittedAt: new Date().toISOString()
    };

    db.addVivaSubmission(vivaRecord);

    res.status(201).json({
      similarity,
      jaccardSimilarity: similarity,
      vivaId: vivaRecord.id,
      viva: vivaRecord
    });
  } catch (err) {
    res.status(500).json({ error: 'Viva submission failed: ' + err.message });
  }
});

// Teacher/Admin: Get all viva submissions for an assignment
app.get('/api/viva/submissions/:assignmentId', authenticate, authorize('teacher', 'admin'), (req, res) => {
  try {
    const vivas = db.getVivaSubmissions({ assignmentId: req.params.assignmentId });
    res.json(vivas);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch viva submissions: ' + err.message });
  }
});

// Get viva detail (teacher sees all, student sees own)
app.get('/api/viva/detail/:vivaId', authenticate, (req, res) => {
  try {
    const viva = db.getVivaSubmissionById(req.params.vivaId);
    if (!viva) {
      return res.status(404).json({ error: 'Viva record not found' });
    }

    if (req.user.role === 'student' && viva.studentId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied: You can only view your own viva records' });
    }

    res.json(viva);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve viva detail: ' + err.message });
  }
});

// ==========================================
// 11. STUDENT CATEGORIZED QUIZZES
// ==========================================

// Student: Categorized Quizzes (available, locked, inProgress, completed)
app.get('/api/student/quizzes', authenticate, (req, res) => {
  try {
    const studentId = req.user.id;
    const assignments = db.getAssignments();
    const permissions = db.getQuizPermissions({ studentId });
    const submissions = db.getSubmissions({ studentId });

    const categorized = {
      available: [],
      locked: [],
      inProgress: [],
      completed: []
    };

    assignments.forEach(asg => {
      // Find latest permission for this assignment
      const perm = permissions.slice().reverse().find(p => p.assignmentId === asg.id);
      const sub = submissions.find(s => s.assignmentId === asg.id);

      const item = {
        assignmentId: asg.id,
        assignmentTitle: asg.title,
        assignment: asg,
        permission: perm || null,
        submission: sub || null,
        status: perm ? perm.status : 'locked'
      };

      if (!perm || perm.status === 'locked') {
        categorized.locked.push(item);
      } else if (perm.status === 'available') {
        categorized.available.push(item);
      } else if (perm.status === 'in_progress') {
        categorized.inProgress.push(item);
      } else if (perm.status === 'completed') {
        categorized.completed.push(item);
      } else {
        categorized.locked.push(item);
      }
    });

    res.json(categorized);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch student quizzes: ' + err.message });
  }
});

// ==========================================
// 12. USER PROFILE & AVATAR
// ==========================================

// Profile update with strict role/permission protections
app.post('/api/profile/update', authenticate, (req, res) => {
  try {
    const { name, rollNo, department, division, title } = req.body;
    // Non-admins can ONLY update their own profile
    const targetUserId = (req.user.role === 'admin' && req.body.userId) ? req.body.userId : req.user.id;

    const user = db.findUserById(targetUserId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const allowed = {};
    if (name !== undefined) allowed.name = name.trim();
    if (rollNo !== undefined) allowed.rollNo = rollNo.trim();

    // Prevent students from modifying department, division, or role
    if (req.user.role === 'admin') {
      if (req.body.role !== undefined) allowed.role = req.body.role;
      if (department !== undefined) allowed.department = department.trim();
      if (division !== undefined) allowed.division = division;
      if (title !== undefined) allowed.title = title.trim();
    } else if (req.user.role === 'teacher') {
      if (department !== undefined) allowed.department = department.trim();
      if (title !== undefined) allowed.title = title.trim();
    }

    const updated = db.updateUser(targetUserId, allowed);
    const { password: _, ...safeUser } = updated;

    res.json({ success: true, user: safeUser });
  } catch (err) {
    res.status(500).json({ error: 'Profile update failed: ' + err.message });
  }
});

// Upload profile photo
app.post('/api/profile/photo/:userId', authenticate, uploadAvatar.single('photo'), (req, res) => {
  try {
    const { userId } = req.params;
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({ error: 'Access denied: You can only update your own photo' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No photo uploaded' });
    }

    const ext = path.extname(req.file.originalname) || '.jpg';
    const photoUrl = `/api/profile/photo/${userId}${ext}`;

    db.updateUser(userId, { photoUrl });
    res.json({ success: true, photoUrl });
  } catch (err) {
    res.status(500).json({ error: 'Avatar upload failed: ' + err.message });
  }
});

// ==========================================
// 13. SETTINGS ENDPOINTS
// ==========================================

// Settings GET (public/read-only)
app.get('/api/settings', (req, res) => {
  try {
    const settings = db.getSettings();
    res.json({
      geminiApiKeyConfigured: Boolean(settings.geminiApiKey || process.env.GEMINI_API_KEY),
      geminiKeyPreview: settings.geminiApiKey ? `${settings.geminiApiKey.substring(0, 6)}...` : '',
      tier1ThresholdLow: settings.tier1ThresholdLow,
      tier1ThresholdHigh: settings.tier1ThresholdHigh,
      defaultMinQuizScore: settings.defaultMinQuizScore
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve settings: ' + err.message });
  }
});

// Settings POST (Admin / Teacher only)
app.post('/api/settings', authenticate, authorize('admin', 'teacher'), (req, res) => {
  try {
    const { geminiApiKey, tier1ThresholdLow, tier1ThresholdHigh, defaultMinQuizScore } = req.body;
    const updated = db.updateSettings({
      ...(geminiApiKey !== undefined ? { geminiApiKey } : {}),
      ...(tier1ThresholdLow !== undefined ? { tier1ThresholdLow: Number(tier1ThresholdLow) } : {}),
      ...(tier1ThresholdHigh !== undefined ? { tier1ThresholdHigh: Number(tier1ThresholdHigh) } : {}),
      ...(defaultMinQuizScore !== undefined ? { defaultMinQuizScore: Number(defaultMinQuizScore) } : {})
    });

    res.json({
      success: true,
      geminiApiKeyConfigured: Boolean(updated.geminiApiKey),
      tier1ThresholdLow: updated.tier1ThresholdLow,
      tier1ThresholdHigh: updated.tier1ThresholdHigh,
      defaultMinQuizScore: updated.defaultMinQuizScore
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings: ' + err.message });
  }
});

// ==========================================
// 14. SUBJECTS ENDPOINTS
// ==========================================

// Get subjects (optionalAuth)
app.get('/api/subjects', optionalAuth, (req, res) => {
  try {
    const { teacherId } = req.query;
    const subjects = teacherId ? db.getSubjectsByTeacher(teacherId) : db.getSubjects();
    res.json(subjects);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve subjects: ' + err.message });
  }
});

// Add subject (Teacher/Admin only)
app.post('/api/subjects', authenticate, authorize('teacher', 'admin'), (req, res) => {
  try {
    const { name, code, semester, teacherId, department } = req.body;
    if (!name || !code) {
      return res.status(400).json({ error: 'Name and code are required' });
    }

    const subject = {
      id: `subj_${Date.now()}`,
      name: name.trim(),
      code: code.trim().toUpperCase(),
      semester: Number(semester) || 1,
      teacherId: teacherId || (req.user.role === 'teacher' ? req.user.id : null),
      department: department || 'Computer Engineering'
    };

    db.addSubject(subject);
    res.status(201).json(subject);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create subject: ' + err.message });
  }
});

// Update subject (Teacher/Admin only)
app.put('/api/subjects/:id', authenticate, authorize('teacher', 'admin'), (req, res) => {
  try {
    const updated = db.updateSubject(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update subject: ' + err.message });
  }
});

// Delete subject (Teacher/Admin only)
app.delete('/api/subjects/:id', authenticate, authorize('teacher', 'admin'), (req, res) => {
  try {
    const success = db.deleteSubject(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete subject: ' + err.message });
  }
});

// ==========================================
// 15. QUIZ ACCESS REQUESTS
// ==========================================

// Get request status for student & assignment
app.get('/api/quiz-requests/status/:assignmentId/:studentId', authenticate, (req, res) => {
  try {
    const { assignmentId, studentId } = req.params;
    if (req.user.role === 'student' && req.user.id !== studentId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const requests = db.getQuizAccessRequests({ assignmentId, studentId });
    if (requests.length === 0) {
      return res.json({ hasRequest: false, status: 'none' });
    }

    const latest = requests[requests.length - 1];
    res.json({
      hasRequest: true,
      requestId: latest.id,
      status: latest.status,
      reviewedAt: latest.reviewedAt,
      reviewNote: latest.reviewNote,
      requestedAt: latest.requestedAt
    });
  } catch (err) {
    res.status(500).json({ error: 'Error checking quiz request status: ' + err.message });
  }
});

// List quiz requests
app.get('/api/quiz-requests', authenticate, (req, res) => {
  try {
    const { assignmentId, status } = req.query;
    let { studentId, teacherId } = req.query;

    if (req.user.role === 'student') {
      studentId = req.user.id;
    } else if (req.user.role === 'teacher') {
      teacherId = req.user.id;
    }

    const requests = db.getQuizAccessRequests({ studentId, teacherId, assignmentId, status });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch quiz requests: ' + err.message });
  }
});

// Create quiz access request
app.post('/api/quiz-requests', authenticate, (req, res) => {
  try {
    const {
      assignmentId,
      assignmentTitle,
      teacherId,
      tier1Score,
      tier1Verdict,
      tier2Score,
      tier2Verdict,
      code,
      language
    } = req.body;

    const studentId = req.user.id;
    const studentName = req.user.name;

    if (!assignmentId) {
      return res.status(400).json({ error: 'assignmentId is required' });
    }

    // Prevent duplicate pending requests
    const existing = db.getQuizAccessRequests({ studentId, assignmentId, status: 'pending' });
    if (existing.length > 0) {
      return res.status(409).json({
        error: 'You already have a pending quiz access request for this assignment',
        existingRequest: existing[0]
      });
    }

    const request = {
      id: `qar_${Date.now()}`,
      studentId,
      studentName: studentName || 'Unknown',
      assignmentId,
      assignmentTitle: assignmentTitle || 'Assignment',
      teacherId: teacherId || null,
      tier1Score: tier1Score || 0,
      tier1Verdict: tier1Verdict || '',
      tier2Score: tier2Score || null,
      tier2Verdict: tier2Verdict || null,
      code: code || '',
      language: language || 'python',
      status: 'pending',
      requestedAt: new Date().toISOString(),
      reviewedAt: null,
      reviewNote: null
    };

    db.addQuizAccessRequest(request);

    if (teacherId) {
      db.addNotification({
        id: `notif_${Date.now()}`,
        userId: teacherId,
        type: 'quiz_request',
        title: 'New Quiz Access Request',
        message: `${studentName} has requested quiz access for ${assignmentTitle}`,
        relatedId: request.id,
        read: false,
        createdAt: new Date().toISOString()
      });
    }

    db.addActivityLog({
      id: `log_${Date.now()}`,
      action: 'quiz_request_created',
      userId: studentId,
      userName: studentName,
      details: `Requested quiz access for ${assignmentTitle}`,
      timestamp: new Date().toISOString()
    });

    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create quiz request: ' + err.message });
  }
});

// Review quiz access request (Teacher/Admin only)
app.put('/api/quiz-requests/:id', authenticate, authorize('teacher', 'admin'), (req, res) => {
  try {
    const { status, reviewNote } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be approved or rejected' });
    }

    const request = db.getQuizAccessRequestById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const updated = db.updateQuizAccessRequest(req.params.id, {
      status,
      reviewNote: reviewNote || null,
      reviewedAt: new Date().toISOString()
    });

    // If approved, automatically create/update quiz permission for the student
    if (status === 'approved') {
      const existingPerm = db.getStudentQuizPermission(request.studentId, request.assignmentId);
      if (existingPerm) {
        db.updateQuizPermission(existingPerm.id, {
          status: 'available',
          grantedBy: req.user.id,
          updatedAt: new Date().toISOString()
        });
      } else {
        db.addQuizPermission({
          id: `qp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          studentId: request.studentId,
          assignmentId: request.assignmentId,
          status: 'available',
          attemptsUsed: 0,
          maxAttempts: 3,
          grantedBy: req.user.id,
          grantedAt: new Date().toISOString(),
          expiresAt: null
        });
      }
    }

    // Notify student
    db.addNotification({
      id: `notif_${Date.now()}`,
      userId: request.studentId,
      type: status === 'approved' ? 'quiz_approved' : 'quiz_rejected',
      title: status === 'approved' ? 'Quiz Access Approved!' : 'Quiz Access Rejected',
      message: status === 'approved'
        ? `Your quiz access for ${request.assignmentTitle} has been approved. You can now take the viva.`
        : `Your quiz access for ${request.assignmentTitle} has been rejected.${reviewNote ? ' Note: ' + reviewNote : ''}`,
      relatedId: request.id,
      read: false,
      createdAt: new Date().toISOString()
    });

    // Activity log
    db.addActivityLog({
      id: `log_${Date.now()}_review`,
      action: `quiz_request_${status}`,
      userId: req.user.id,
      userName: req.user.name,
      details: `${status === 'approved' ? 'Approved' : 'Rejected'} quiz request from ${request.studentName} for ${request.assignmentTitle}`,
      timestamp: new Date().toISOString()
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to review request: ' + err.message });
  }
});

// ==========================================
// 16. ANNOUNCEMENTS & NOTIFICATIONS
// ==========================================

// Announcements (optionalAuth)
app.get('/api/announcements', optionalAuth, (req, res) => {
  try {
    const { role } = req.query;
    const filterRole = role || (req.user ? req.user.role : null);
    const announcements = filterRole ? db.getAnnouncements({ targetRole: filterRole }) : db.getAnnouncements();
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch announcements: ' + err.message });
  }
});

// Post Announcement (Teacher/Admin only)
app.post('/api/announcements', authenticate, authorize('teacher', 'admin'), (req, res) => {
  try {
    const { title, content, targetRoles, priority } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const announcement = {
      id: `ann_${Date.now()}`,
      title: title.trim(),
      content: content.trim(),
      authorId: req.user.id,
      authorName: req.user.name,
      authorRole: req.user.role,
      targetRoles: Array.isArray(targetRoles) ? targetRoles : ['student', 'teacher'],
      priority: priority || 'normal',
      createdAt: new Date().toISOString()
    };

    db.addAnnouncement(announcement);
    res.status(201).json(announcement);
  } catch (err) {
    res.status(500).json({ error: 'Failed to post announcement: ' + err.message });
  }
});

// Delete Announcement (Teacher/Admin only)
app.delete('/api/announcements/:id', authenticate, authorize('teacher', 'admin'), (req, res) => {
  try {
    const success = db.deleteAnnouncement(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete announcement: ' + err.message });
  }
});

// Notifications
app.get('/api/notifications/:userId', authenticate, (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.id !== req.params.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const notifications = db.getNotifications(req.params.userId);
    const unreadCount = notifications.filter(n => !n.read).length;
    res.json({ notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications: ' + err.message });
  }
});

app.put('/api/notifications/:id/read', authenticate, (req, res) => {
  try {
    const notif = db.markNotificationRead(req.params.id);
    if (!notif) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.json(notif);
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark notification read: ' + err.message });
  }
});

app.put('/api/notifications/read-all/:userId', authenticate, (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.id !== req.params.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    db.markAllNotificationsRead(req.params.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark notifications read: ' + err.message });
  }
});

// Activity Logs
app.get('/api/activity-logs', authenticate, authorize('teacher', 'admin'), (req, res) => {
  try {
    const { limit } = req.query;
    const logs = db.getActivityLogs(Number(limit) || 50);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch activity logs: ' + err.message });
  }
});

// ==========================================
// 17. STATIC CATCH-ALL ROUTE (SPA SUPPORT)
// ==========================================
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  const indexHtml = path.join(clientDist, 'index.html');
  if (fs.existsSync(indexHtml)) {
    return res.sendFile(indexHtml);
  }
  res.send('AI-Based Assignment Validation 2.0 API Server Online');
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Assignment Validation 2.0 API server running on http://localhost:${PORT}`);
});
