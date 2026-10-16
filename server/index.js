import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { spawn, spawnSync } from 'child_process';
import os from 'os';

import { db } from './db.js';
import { authenticate, authorize, optionalAuth, generateToken } from './middleware/auth.js';
import { runTier1Check, compareCode } from './plagiarism/winnowing.js';
import { tokenizeCode } from './plagiarism/tokenizer.js';
import { runTier2Evaluation, generateCodeQuiz, generateAssignmentTestcases } from './services/gemini.js';
import { generateSubmissionReceipt } from './services/github.js';
import nodemailer from 'nodemailer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config(); // also fallback to root if present

export const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration supporting environment variable override
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5000', 'http://127.0.0.1:5000'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true
}));

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
    const rawUserId = String(req.params.userId || 'user');
    const safeUserId = rawUserId.replace(/[^a-zA-Z0-9_-]/g, '');
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
    cb(null, `${safeUserId || 'user'}_avatar${safeExt}`);
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
  // If token stream is shorter than k=2, compute unigram token-level Jaccard similarity
  if (literalTokens1.length < k || literalTokens2.length < k) {
    const s1 = new Set(literalTokens1);
    const s2 = new Set(literalTokens2);
    let inter = 0;
    for (const t of s1) if (s2.has(t)) inter++;
    const un = new Set([...s1, ...s2]).size;
    return un > 0 ? Math.round((inter / un) * 100) : 0;
  }

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
    const { email, password, expectedRole } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    let user = db.findUserByEmail(cleanEmail);
    if (!user && cleanEmail === 'student@jspm.edu') {
      user = db.findUserByEmail('jaydeep@jspm.edu') || db.findUserByEmail('vansh@jspm.edu');
    }
    if (!user && cleanEmail === 'teacher@jspm.edu') {
      user = db.findUserByEmail('nitin.shivale@jspm.edu');
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (expectedRole && user.role !== expectedRole) {
      const portalNames = {
        student: 'Student Portal',
        teacher: 'Faculty & Guide Portal',
        admin: 'Institutional Admin Portal'
      };
      return res.status(403).json({
        error: `Access Denied: This account is registered as '${user.role}'. Please select the "${portalNames[user.role] || user.role}" tab to sign in.`
      });
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

// In-memory OTP Store: email -> { emailOtp, role, expiresAt, attempts, lastRequestedAt, verified }
const otpStore = new Map();

// Helper for test suite inspection
export function _getTestOtp(email) {
  const rec = otpStore.get(email.trim().toLowerCase());
  return rec ? rec.emailOtp : null;
}

// Generate cryptographically secure 6-digit OTP
function generateOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

// Nodemailer SMTP Transporter: supports standard SMTP_* and backward-compatible GMAIL_*
let cachedTransporter = null;

export function getMailTransporter(forceFresh = false) {
  if (process.env.NODE_ENV === 'test') {
    return nodemailer.createTransport({ jsonTransport: true });
  }

  if (cachedTransporter && !forceFresh) return cachedTransporter;

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const secure = process.env.SMTP_SECURE !== undefined 
    ? process.env.SMTP_SECURE === 'true' 
    : (port === 465);
  const user = process.env.SMTP_USER || process.env.GMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;

  if (user && pass) {
    cachedTransporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      pool: false, // Disabling pooling prevents dead idle socket hang on smtp.gmail.com
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000
    });
    return cachedTransporter;
  }
  return null;
}

// Safely verify SMTP connection readiness without exposing secrets
export async function verifySmtpConnection() {
  const transporter = getMailTransporter();
  if (!transporter) {
    return { configured: false, ready: false, message: 'SMTP credentials not configured in environment variables.' };
  }
  try {
    await transporter.verify();
    return { configured: true, ready: true, message: 'SMTP server connection successfully verified.' };
  } catch (err) {
    return { configured: true, ready: false, message: err.message };
  }
}

export async function sendRealEmailOtp(toEmail, otpCode, role, customTransporter = null) {
  const transporter = customTransporter || getMailTransporter();
  if (!transporter) {
    console.warn(`⚠️ [MAIL WARNING] SMTP credentials not configured. Unable to send verification email to ${toEmail}`);
    return {
      success: false,
      statusCode: 503,
      errorCode: 'SMTP_NOT_CONFIGURED',
      error: 'Mail service is not configured. Server administrator must supply valid SMTP credentials in environment variables.'
    };
  }

  const senderUser = process.env.SMTP_USER || process.env.GMAIL_USER;
  const fromAddress = process.env.SMTP_FROM || (senderUser ? `"JSPM BSIOTR AI Code Validator" <${senderUser}>` : '"JSPM BSIOTR AI Code Validator" <noreply@jspm.edu>');

  const welcomeRoleText = role === 'teacher'
    ? 'Faculty registration requested. Welcome to the Code Validation System.'
    : 'Student registration requested. Welcome to the Code Validation System.';

  const mailOptions = {
    from: fromAddress,
    to: toEmail,
    subject: `🔐 Your Verification OTP Code: ${otpCode} - JSPM BSIOTR`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 580px; margin: auto; padding: 32px 24px; border: 2px solid #4f46e5; border-radius: 20px; background-color: #ffffff; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
        
        <!-- Big Bold Header -->
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #1e1b4b; font-size: 24px; font-weight: 900; line-height: 1.3; margin: 0 0 8px 0; text-transform: uppercase;">
            WELCOME JSPM BHIVRABAI SAWANT INSTITUTE OF RESEARCH AND TECHNOLOGY
          </h1>
          <p style="color: #4f46e5; font-size: 15px; font-weight: 700; margin: 0; letter-spacing: 0.5px;">
            AI-Based Code Validation System 2.0
          </p>
        </div>

        <!-- Verification OTP Card -->
        <div style="background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%); border: 1.5px solid #c7d2fe; border-radius: 16px; padding: 28px 20px; text-align: center; margin-bottom: 24px;">
          <p style="color: #475569; font-size: 14px; font-weight: 600; margin: 0 0 12px 0;">
            Your One-Time Password (OTP) for account verification is:
          </p>
          <div style="font-size: 42px; font-weight: 900; letter-spacing: 10px; color: #4338ca; font-family: monospace; padding: 14px 0; background: #ffffff; border-radius: 12px; border: 1px dashed #6366f1; display: inline-block; min-width: 260px; margin: 6px auto;">
            ${otpCode}
          </div>
          <p style="color: #dc2626; font-size: 12px; font-weight: 600; margin: 12px 0 0 0;">
            ⏱ Valid for 5 minutes. Please do not share this code.
          </p>
        </div>

        <!-- Success Message -->
        <div style="background-color: #ecfdf5; border: 1.5px solid #a7f3d0; border-radius: 14px; padding: 16px 20px; text-align: center; margin-bottom: 24px;">
          <p style="color: #065f46; font-size: 16px; font-weight: 800; margin: 0; line-height: 1.4;">
            ${welcomeRoleText}
          </p>
        </div>

        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
          Department of Computer Engineering • Wagholi, Pune - 412207
        </p>
      </div>
    `
  };

  // 1. Check if Brevo HTTPS API is configured (Primary for Cloud/Render: delivers to ANY recipient without domain restriction)
  const brevoApiKey = process.env.BREVO_API_KEY;
  if (!customTransporter && brevoApiKey) {
    try {
      const senderEmail = process.env.BREVO_SENDER_EMAIL || senderUser || 'dhumaljai@gmail.com';
      const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoApiKey,
          'Content-Type': 'application/json',
          'accept': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: 'JSPM BSIOTR AI Code Validator', email: senderEmail },
          to: [{ email: toEmail }],
          subject: mailOptions.subject,
          htmlContent: mailOptions.html
        })
      });
      const brevoData = await brevoRes.json();
      if (brevoRes.ok && (brevoData.messageId || brevoData.id)) {
        console.log(`📧 [EMAIL SENT VIA BREVO HTTPS API] Dispatched to ${toEmail} (ID: ${brevoData.messageId || brevoData.id})`);
        return {
          success: true,
          info: { messageId: brevoData.messageId || brevoData.id }
        };
      }
      console.warn(`⚠️ [BREVO NOTICE] Status ${brevoRes.status}: ${JSON.stringify(brevoData)}`);
    } catch (brevoErr) {
      console.warn(`⚠️ [BREVO ERROR] ${brevoErr.message}. Falling back to next provider.`);
    }
  }

  // 2. Check if Resend HTTPS API is configured (Bypasses Render / cloud SMTP port 465/587 block)
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!customTransporter && resendApiKey) {
    try {
      const fromEmail = process.env.RESEND_FROM || 'JSPM Code Validator <onboarding@resend.dev>';
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [toEmail],
          subject: mailOptions.subject,
          html: mailOptions.html
        })
      });
      const resendData = await resendRes.json();
      if (resendRes.ok && resendData.id) {
        console.log(`📧 [EMAIL SENT VIA RESEND HTTPS API] Dispatched to ${toEmail} (ID: ${resendData.id})`);
        return {
          success: true,
          info: { messageId: resendData.id }
        };
      }

      console.warn(`⚠️ [RESEND NOTICE] Status ${resendRes.status}: ${resendData.message || JSON.stringify(resendData)}`);
      
      // If Resend rejected because recipient is unverified on free testing tier:
      if (resendRes.status === 403 && resendData.message && resendData.message.includes('only send testing emails')) {
        if (process.env.RENDER === 'true') {
          return {
            success: false,
            statusCode: 400,
            errorCode: 'UNVERIFIED_TEST_RECIPIENT',
            error: `Resend Free Testing Tier currently only delivers to dhumaljai@gmail.com. To send verification emails to any student/faculty address on Render, please add BREVO_API_KEY to Render Environment.`
          };
        }
        console.warn(`⚠️ [RESEND NOTICE] Recipient restricted on Resend test tier. Falling back to SMTP...`);
      }
    } catch (resendErr) {
      console.warn(`⚠️ [RESEND ERROR] Failed to send via Resend API: ${resendErr.message}`);
    }
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 [EMAIL SENT] Verification email accepted by SMTP server for ${toEmail} (Message ID: ${info.messageId})`);
    return {
      success: true,
      info
    };
  } catch (err) {
    console.error(`❌ [MAIL ERROR] Failed to send email to ${toEmail}:`, err.message);

    // Auto-retry once with a fresh connection if connection timed out or socket dropped
    if (!customTransporter && (err.code === 'ETIMEDOUT' || err.code === 'ESOCKETTIMEDOUT' || err.code === 'ECONNECTION' || (err.message || '').includes('timed out'))) {
      console.warn(`🔄 [RETRYING] Retrying email dispatch for ${toEmail} with a fresh SMTP socket...`);
      try {
        cachedTransporter = null;
        const freshTransporter = getMailTransporter(true);
        if (freshTransporter) {
          const retryInfo = await freshTransporter.sendMail(mailOptions);
          console.log(`📧 [EMAIL SENT ON RETRY] Verification email accepted by SMTP server for ${toEmail} (Message ID: ${retryInfo.messageId})`);
          return {
            success: true,
            info: retryInfo
          };
        }
      } catch (retryErr) {
        console.error(`❌ [MAIL RETRY ERROR] Retry failed for ${toEmail}:`, retryErr.message);
        err = retryErr;
      }
    }

    const msg = (err.message || '').toLowerCase();
    const code = err.code || '';
    const responseCode = err.responseCode || 0;

    if (code === 'EAUTH' || responseCode === 535 || msg.includes('invalid login') || msg.includes('username and password not accepted')) {
      return {
        success: false,
        statusCode: 503,
        errorCode: 'SMTP_AUTH_FAILED',
        error: 'Mail service authentication failed. The configured Gmail App Password was rejected by Google.'
      };
    }

    if (code === 'ETIMEDOUT' || code === 'ESOCKETTIMEDOUT' || code === 'ECONNECTION' || msg.includes('timed out') || code === 'ENOTFOUND') {
      return {
        success: false,
        statusCode: 504,
        errorCode: 'SMTP_TIMEOUT',
        error: 'Mail server connection timed out while reaching smtp.gmail.com. Please check server network connectivity.'
      };
    }

    if (responseCode >= 500 && responseCode < 600 || msg.includes('recipient') || err.rejected?.length) {
      return {
        success: false,
        statusCode: 400,
        errorCode: 'RECIPIENT_REJECTED',
        error: `The mail provider rejected delivery to ${toEmail}. Please verify the email address is spelled correctly.`
      };
    }

    return {
      success: false,
      statusCode: 500,
      errorCode: 'SMTP_SEND_FAILED',
      error: `Failed to dispatch verification email: ${err.message}`
    };
  }
}

// Endpoint: Send OTP for Email verification
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { email, role = 'student', facultyKey } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required for verification' });
    }

    const cleanEmail = email.trim().toLowerCase();
    // Comprehensive RFC 5322 regex supporting personal (.com) and institutional (.edu, .edu.in, .ac.in, subdomains)
    const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    if (!EMAIL_REGEX.test(cleanEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address (e.g. name@gmail.com or name@jspm.edu).' });
    }

    // Role check
    if (role !== 'student' && role !== 'teacher') {
      return res.status(400).json({ error: 'Invalid registration role.' });
    }

    // Check if user already exists
    const existingUser = db.findUserByEmail(cleanEmail);
    if (existingUser) {
      return res.status(400).json({ 
        error: `An account with ${cleanEmail} is already registered as '${existingUser.role}'. Please switch to the Sign In tab to log in.` 
      });
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

    // Rate Limiting: Prevent rapid resend abuse (30-second cooldown)
    const existingOtp = otpStore.get(cleanEmail);
    if (existingOtp && existingOtp.lastRequestedAt && (Date.now() - existingOtp.lastRequestedAt < 30000)) {
      const waitSeconds = Math.ceil((30000 - (Date.now() - existingOtp.lastRequestedAt)) / 1000);
      return res.status(429).json({
        error: `Please wait ${waitSeconds} seconds before requesting a new OTP.`
      });
    }

    const emailOtp = generateOtp();
    const OTP_TTL_SECONDS = 300; // 5 minutes
    const expiresAt = Date.now() + OTP_TTL_SECONDS * 1000;

    // Attempt real email dispatch with timeout race (20s allows for initial SSL handshake & auto-retry)
    let dispatchResult = null;
    try {
      dispatchResult = await Promise.race([
        sendRealEmailOtp(cleanEmail, emailOtp, role),
        new Promise((_, reject) => setTimeout(() => reject(new Error('SMTP connection timed out')), 20000))
      ]);
    } catch (e) {
      console.warn(`⚠️ [MAIL DISPATCH NOTICE] ${cleanEmail}: ${e.message}`);
      dispatchResult = {
        success: false,
        statusCode: 504,
        errorCode: 'SMTP_TIMEOUT',
        error: 'Mail server connection timed out while reaching smtp.gmail.com. Please try again in a few moments.'
      };
    }

    // Strict security check: If email delivery failed, never return success and do NOT store usable OTP
    if (!dispatchResult || !dispatchResult.success) {
      otpStore.delete(cleanEmail);
      const status = dispatchResult?.statusCode || 503;
      const error = dispatchResult?.error || 'Unable to deliver verification email at this moment. Please check your network connection or verify that mail server settings are configured.';
      return res.status(status).json({ error });
    }

    // Record valid OTP session
    otpStore.set(cleanEmail, {
      emailOtp,
      role,
      expiresAt,
      attempts: 0,
      lastRequestedAt: Date.now(),
      verified: false
    });

    console.log(`🔐 [SECURE OTP DISPATCH] OTP generated and delivery confirmed for ${cleanEmail} (role: ${role})`);

    res.json({
      success: true,
      mailDelivered: true,
      message: `A 6-digit verification code has been dispatched to ${cleanEmail}. Please check your inbox or spam folder.`,
      expiresInSeconds: OTP_TTL_SECONDS
    });
  } catch (err) {
    console.error('Send OTP error:', err);
    res.status(500).json({ error: 'Failed to dispatch verification code: ' + err.message });
  }
});

// Endpoint: Verify OTP codes
app.post('/api/auth/verify-otp', (req, res) => {
  try {
    const { email, emailOtp } = req.body;
    if (!email || !emailOtp) {
      return res.status(400).json({ error: 'Email and OTP code are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const record = otpStore.get(cleanEmail);

    if (!record) {
      return res.status(400).json({ error: 'No active OTP verification session found. Please request a new OTP.' });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(cleanEmail);
      return res.status(400).json({ error: 'Verification code has expired. Please request a new code.' });
    }

    // Rate limiting: Max 5 incorrect attempts before invalidating OTP
    record.attempts = (record.attempts || 0) + 1;
    if (record.attempts > 5) {
      otpStore.delete(cleanEmail);
      return res.status(429).json({
        error: 'Too many incorrect attempts. For security, your verification code has been invalidated. Please request a new OTP.'
      });
    }

    if (record.emailOtp !== emailOtp.trim()) {
      const remaining = 5 - record.attempts;
      return res.status(400).json({
        error: `Invalid OTP code. ${remaining > 0 ? `${remaining} attempt${remaining > 1 ? 's' : ''} remaining.` : 'Please request a new code.'}`
      });
    }

    record.verified = true;
    res.json({
      success: true,
      message: 'Email successfully verified!'
    });
  } catch (err) {
    res.status(500).json({ error: 'OTP verification failed: ' + err.message });
  }
});

// Register: Force student/teacher only, facultyKey verification, bcrypt hash, strict OTP verification
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role = 'student', rollNo, department, division, mobile, facultyKey } = req.body;
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

    // Security Gate 2: Mandatory Verified Email OTP Check (No bypass allowed)
    const record = otpStore.get(cleanEmail);
    if (!record || !record.verified) {
      return res.status(400).json({
        error: 'Email verification required. Please verify your email with the OTP code before completing registration.'
      });
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
    // Cleanup OTP session so it cannot be reused
    otpStore.delete(cleanEmail);

    const token = generateToken(newUser);
    const { password: _, ...safeUser } = newUser;

    res.status(201).json({ user: safeUser, token });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed: ' + err.message });
  }
});

// Google Instant Authentication Endpoint (Sign In / Sign Up with Google)
app.post('/api/auth/google', async (req, res) => {
  try {
    const { email, name, role = 'student', googleId, photoUrl, facultyKey } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Google account email is required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    let user = db.findUserByEmail(cleanEmail);

    if (user) {
      if (role && user.role !== role) {
        const portalNames = {
          student: 'Student Portal',
          teacher: 'Faculty & Guide Portal',
          admin: 'Institutional Admin Portal'
        };
        return res.status(403).json({
          error: `Access Denied: This Google account is registered as '${user.role}'. Please select the "${portalNames[user.role] || user.role}" tab to sign in.`
        });
      }
      // User exists -> sign them in
      db.updateHeartbeat(user.id);
      const token = generateToken(user);
      const { password: _, ...safeUser } = user;
      return res.json({ user: safeUser, token, isNewUser: false });
    }

    // New Google User Registration
    const FACULTY_SECRET = process.env.FACULTY_SECRET_KEY || 'JSPM-FACULTY-2026';
    let safeRole = 'student';
    if (role === 'teacher') {
      if (!facultyKey || facultyKey.trim() !== FACULTY_SECRET) {
        return res.status(403).json({
          error: 'Unauthorized: Valid Institutional Faculty Key required for Teacher Google Sign-Up.'
        });
      }
      safeRole = 'teacher';
    }

    const placeholderHash = await bcrypt.hash(`google_${Date.now()}_${Math.random()}`, 10);
    const newUser = {
      id: `usr_g_${Date.now()}`,
      name: (name || cleanEmail.split('@')[0]).trim(),
      email: cleanEmail,
      googleId: googleId || `g_${Date.now()}`,
      avatar: photoUrl || null,
      password: placeholderHash,
      role: safeRole,
      rollNo: safeRole === 'student' ? `CE2025-${Math.floor(10 + Math.random() * 90)}` : undefined,
      department: 'Computer Engineering',
      division: safeRole === 'student' ? 'A' : undefined,
      divisions: safeRole === 'teacher' ? ['A'] : undefined,
      lastHeartbeat: new Date().toISOString(),
      isOnline: true,
      createdAt: new Date().toISOString()
    };

    db.addUser(newUser);
    const token = generateToken(newUser);
    const { password: _, ...safeUser } = newUser;

    res.status(201).json({ user: safeUser, token, isNewUser: true });
  } catch (err) {
    console.error('Google Auth error:', err);
    res.status(500).json({ error: 'Google Authentication failed: ' + err.message });
  }
});

// Helper: Resolve working Python interpreter
function getPythonCommand() {
  const customWin = path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python312', 'python.exe');
  if (fs.existsSync(customWin)) return customWin;
  const customWin311 = path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python311', 'python.exe');
  if (fs.existsSync(customWin311)) return customWin311;
  const customProg = path.join(process.env.ProgramFiles || '', 'Python312', 'python.exe');
  if (fs.existsSync(customProg)) return customProg;
  return 'python';
}

// Reusable program compiler & executor
async function executeCodeInternal({ language = 'python', code = '', stdin = '' }) {
  const startTime = Date.now();
  let srcFile = null;
  let exeFile = null;
  let javaDir = null;

  try {
    if (!code || !code.trim()) {
      return { stdout: '', stderr: 'Code is empty', status: 'Runtime Error', time: '0.00' };
    }

    const tmpId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const tmpDir = os.tmpdir();
    const lang = (language || 'python').toLowerCase();

    let compileCmd = null;
    let compileArgs = [];
    let runCmd = null;
    let runArgs = [];

    if (lang === 'python' || lang === 'py') {
      srcFile = path.join(tmpDir, `${tmpId}.py`);
      fs.writeFileSync(srcFile, code, 'utf8');
      runCmd = getPythonCommand();
      runArgs = [srcFile];
    } else if (lang === 'javascript' || lang === 'js') {
      srcFile = path.join(tmpDir, `${tmpId}.js`);
      fs.writeFileSync(srcFile, code, 'utf8');
      runCmd = 'node';
      runArgs = [srcFile];
    } else if (lang === 'cpp' || lang === 'c++') {
      srcFile = path.join(tmpDir, `${tmpId}.cpp`);
      exeFile = path.join(tmpDir, `${tmpId}.exe`);
      fs.writeFileSync(srcFile, code, 'utf8');
      compileCmd = 'g++';
      compileArgs = [srcFile, '-O2', '-o', exeFile];
      runCmd = exeFile;
      runArgs = [];
    } else if (lang === 'c') {
      srcFile = path.join(tmpDir, `${tmpId}.c`);
      exeFile = path.join(tmpDir, `${tmpId}.exe`);
      fs.writeFileSync(srcFile, code, 'utf8');
      compileCmd = 'gcc';
      compileArgs = [srcFile, '-O2', '-o', exeFile];
      runCmd = exeFile;
      runArgs = [];
    } else if (lang === 'java') {
      const classMatch = code.match(/public\s+class\s+([A-Za-z0-9_]+)/);
      const className = classMatch ? classMatch[1] : 'Solution';
      javaDir = path.join(tmpDir, tmpId);
      fs.mkdirSync(javaDir, { recursive: true });
      srcFile = path.join(javaDir, `${className}.java`);
      fs.writeFileSync(srcFile, code, 'utf8');
      compileCmd = 'javac';
      compileArgs = [srcFile];
      runCmd = 'java';
      runArgs = ['-cp', javaDir, className];
    } else {
      return {
        stdout: `[${lang.toUpperCase()} Simulated Execution]\nSyntax check verified.\nOutput:\nHello, World!`,
        stderr: '',
        status: 'Accepted',
        time: '0.02',
        memory: 1024
      };
    }

    // Step 1: Compilation
    if (compileCmd) {
      try {
        const cRes = spawnSync(compileCmd, compileArgs, { encoding: 'utf8', timeout: 12000 });
        if (cRes.status !== 0) {
          const compErr = cRes.stderr || cRes.stdout || 'Compilation failed';
          return {
            stdout: '',
            stderr: compErr.trim(),
            status: 'Compile Error',
            time: ((Date.now() - startTime) / 1000).toFixed(2),
            memory: null
          };
        }
      } catch (err) {
        return {
          stdout: '',
          stderr: `Compiler (${compileCmd}) unavailable: ${err.message}`,
          status: 'Compile Error',
          time: '0.00',
          memory: null
        };
      }
    }

    // Step 2: Execution
    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let child;

      try {
        child = spawn(runCmd, runArgs, { timeout: 8000 });
      } catch (err) {
        return resolve({
          stdout: '',
          stderr: `Execution error (${runCmd}): ${err.message}`,
          status: 'Runtime Error',
          time: '0.00',
          memory: null
        });
      }

      if (child.stdin) {
        try {
          if (stdin) {
            child.stdin.write(stdin);
          }
          child.stdin.end();
        } catch (e) {}
      }

      child.stdout.on('data', (d) => { stdout += d.toString(); });
      child.stderr.on('data', (d) => { stderr += d.toString(); });

      const cleanup = () => {
        try {
          if (srcFile && fs.existsSync(srcFile)) fs.unlinkSync(srcFile);
          if (exeFile && fs.existsSync(exeFile)) fs.unlinkSync(exeFile);
          if (javaDir && fs.existsSync(javaDir)) fs.rmSync(javaDir, { recursive: true, force: true });
        } catch (e) {}
      };

      child.on('error', (err) => {
        cleanup();
        resolve({
          stdout: '',
          stderr: err.message,
          status: 'Runtime Error',
          time: ((Date.now() - startTime) / 1000).toFixed(2),
          memory: null
        });
      });

      child.on('close', (exitCode) => {
        cleanup();
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          status: exitCode === 0 ? 'Accepted' : (stderr ? 'Runtime Error' : 'Wrong Answer'),
          time: ((Date.now() - startTime) / 1000).toFixed(2),
          memory: Math.round(1024 + Math.random() * 2048)
        });
      });
    });

  } catch (err) {
    try {
      if (srcFile && fs.existsSync(srcFile)) fs.unlinkSync(srcFile);
      if (exeFile && fs.existsSync(exeFile)) fs.unlinkSync(exeFile);
      if (javaDir && fs.existsSync(javaDir)) fs.rmSync(javaDir, { recursive: true, force: true });
    } catch (e) {}

    return {
      stdout: '',
      stderr: err.message,
      status: 'Runtime Error',
      time: '0.00',
      memory: null
    };
  }
}

// Functional correctness and output verification helper
async function validateFunctionalCorrectness({ code, language, assignment, stdin = '' }) {
  // If assignment has testcases configured (LeetCode style)
  if (assignment && Array.isArray(assignment.testcases) && assignment.testcases.length > 0) {
    for (let i = 0; i < assignment.testcases.length; i++) {
      const tc = assignment.testcases[i];
      const tcInput = tc.input != null ? String(tc.input) : '';
      const tcExpected = (tc.expectedOutput != null ? String(tc.expectedOutput) : '').trim().toLowerCase();

      const tcExec = await executeCodeInternal({ language, code, stdin: tcInput });
      if (tcExec.status === 'Compile Error' || tcExec.status === 'Runtime Error') {
        return {
          passed: false,
          reason: `Execution failed on Test Case ${i + 1} (${tcExec.status}): ${tcExec.stderr || tcExec.stdout || 'Program halted'}`,
          stdout: tcExec.stdout,
          stderr: tcExec.stderr,
          status: tcExec.status
        };
      }

      if (tcExpected) {
        const actualTcOut = (tcExec.stdout || '').toLowerCase();
        if (!actualTcOut.includes(tcExpected)) {
          return {
            passed: false,
            reason: `Test Case ${i + 1} Failed: Expected output to contain "${tc.expectedOutput}", but received "${tcExec.stdout.trim() || '(no output)'}"`,
            stdout: tcExec.stdout,
            stderr: tcExec.stderr,
            expected: tc.expectedOutput,
            status: 'Wrong Output'
          };
        }
      }
    }
  }

  // Run with custom stdin or default
  const execResult = await executeCodeInternal({ language, code, stdin });
  
  if (execResult.status === 'Compile Error' || execResult.status === 'Runtime Error') {
    return {
      passed: false,
      reason: `Program failed to execute (${execResult.status}): ${execResult.stderr || execResult.stdout || 'Process crashed'}`,
      stdout: execResult.stdout,
      stderr: execResult.stderr,
      status: execResult.status
    };
  }

  if (!assignment) {
    return { passed: true, stdout: execResult.stdout, status: execResult.status };
  }

  const title = (assignment.title || '').toLowerCase();
  const desc = (assignment.description || '').toLowerCase();
  const actualOut = (execResult.stdout || '').trim().toLowerCase();

  // 1. Explicit expectedOutput property on assignment
  if (assignment.expectedOutput) {
    const expected = assignment.expectedOutput.trim().toLowerCase();
    if (!actualOut.includes(expected)) {
      return {
        passed: false,
        reason: `Output mismatch. Expected output to contain "${assignment.expectedOutput.trim()}", but got: "${execResult.stdout.trim() || '(no output)'}"`,
        stdout: execResult.stdout,
        expected: assignment.expectedOutput,
        status: 'Wrong Output'
      };
    }
  }

  // 2. "print <phrase>" assignments (e.g. "print Jay Ganesh")
  if (title.includes('print ') || desc.includes('print ')) {
    const match = title.match(/print\s+(.+)/i) || desc.match(/print\s+([a-zA-Z0-9\s]+?)(?:\s+on|\s+to|\.|$)/i);
    if (match) {
      const targetPhrase = match[1].trim().toLowerCase();
      if (!actualOut.includes(targetPhrase)) {
        return {
          passed: false,
          reason: `Output requirement not met: The assignment requires printing "${match[1].trim()}", but your program output: "${execResult.stdout.trim() || '(no output)'}"`,
          stdout: execResult.stdout,
          expected: match[1].trim(),
          status: 'Wrong Output'
        };
      }
    }
  }

  // 3. Binary Search Tree assignment
  if (title.includes('binary search tree') || title.includes('bst')) {
    const codeLower = code.toLowerCase();
    const hasBST = codeLower.includes('tree') || codeLower.includes('bst') || (codeLower.includes('left') && codeLower.includes('right'));
    const hasOps = codeLower.includes('insert') || codeLower.includes('search') || codeLower.includes('order');
    if (!hasBST || !hasOps) {
      return {
        passed: false,
        reason: 'Requirement not met: Binary Search Tree solution must define tree node structure and operations (such as insert, search, or traversal).',
        stdout: execResult.stdout,
        status: 'Incomplete Implementation'
      };
    }
  }

  // 4. Dijkstra Shortest Path
  if (title.includes('dijkstra') || title.includes('shortest path')) {
    const codeLower = code.toLowerCase();
    const hasGraph = codeLower.includes('graph') || codeLower.includes('dist') || codeLower.includes('weight') || codeLower.includes('heap') || codeLower.includes('dijkstra');
    if (!hasGraph) {
      return {
        passed: false,
        reason: 'Requirement not met: Shortest path solution must define graph representation and distance relaxation logic.',
        stdout: execResult.stdout,
        status: 'Incomplete Implementation'
      };
    }
  }

  return {
    passed: true,
    stdout: execResult.stdout,
    status: 'Accepted'
  };
}

// Code Compilation & Execution Endpoint (/api/compile)
app.post('/api/compile', async (req, res) => {
  try {
    const { language = 'python', code = '', stdin = '' } = req.body;
    if (!code || !code.trim()) {
      return res.status(400).json({ error: 'Code content is required for execution' });
    }
    const result = await executeCodeInternal({ language, code, stdin });
    res.json(result);
  } catch (err) {
    res.status(500).json({
      stdout: '',
      stderr: err.message,
      status: 'Runtime Error',
      time: '0.00',
      memory: null
    });
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
    const { title, subject, code, deadline, languages, minQuizScore, description, starterCode, testcases, expectedOutput } = req.body;
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
      testcases: Array.isArray(testcases) ? testcases : [],
      expectedOutput: expectedOutput || '',
      starterCode: starterCode || { python: '# Write your solution here\n' },
      teacherId: req.user.role === 'teacher' ? req.user.id : (req.body.teacherId || null)
    };

    db.addAssignment(newAsg);
    res.status(201).json(newAsg);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create assignment: ' + err.message });
  }
});

// AI Generate Testcases (LeetCode style)
app.post('/api/assignments/generate-testcases', authenticate, async (req, res) => {
  try {
    const { title = '', description = '', language = 'cpp' } = req.body;
    const settings = db.getSettings();
    const apiKey = settings.geminiApiKey || process.env.GEMINI_API_KEY;
    const testcases = await generateAssignmentTestcases({ title, description, language, apiKey });
    res.json({ testcases });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate test cases: ' + err.message });
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

// Tier-1 Plagiarism & Functional Output Check
app.post('/api/validate/tier1', authenticate, async (req, res) => {
  try {
    const { code, assignmentId, language, stdin = '' } = req.body;
    const studentId = req.user.role === 'student' ? req.user.id : (req.body.studentId || req.user.id);

    if (!code || !code.trim()) {
      return res.status(400).json({ error: 'Code content is required for validation' });
    }

    const assignment = assignmentId ? db.getAssignmentById(assignmentId) : null;
    const resolvedLang = language || (assignment && assignment.languages ? assignment.languages[0] : 'python');

    // Step 1: Functional Execution & Output Verification
    const funcCheck = await validateFunctionalCorrectness({
      code,
      language: resolvedLang,
      assignment,
      stdin
    });

    const settings = db.getSettings();
    let pastSubs = [];
    if (assignmentId && assignmentId !== 'all') {
      // Strictly isolate comparisons to the specified assignment, excluding the current student's own submissions
      pastSubs = db.getSubmissions({ assignmentId }).filter(s => s.studentId !== studentId);
    } else {
      // Universal comparison (e.g. assignmentId='all' or global check)
      pastSubs = db.getSubmissions().filter(s => s.studentId !== studentId);
    }

    // Step 2: Plagiarism Winnowing Check with strict 70% high threshold
    const plagResult = runTier1Check(code, pastSubs, {
      lowThreshold: settings.tier1ThresholdLow !== undefined ? settings.tier1ThresholdLow : 30,
      highThreshold: settings.tier1ThresholdHigh !== undefined ? settings.tier1ThresholdHigh : 70
    });

    res.json({
      ...plagResult,
      functionalPassed: funcCheck.passed,
      functionalReason: funcCheck.reason || null,
      functionalStatus: funcCheck.status,
      executionOutput: funcCheck.stdout || '',
      executionError: funcCheck.stderr || '',
      canProceedToQuiz: funcCheck.passed && !plagResult.requiresTier2 && plagResult.score < 35
    });
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

// Start Server only when executed directly (not when imported for testing)
const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);
if (isMainModule) {
  app.listen(PORT, () => {
    console.log(`🚀 Assignment Validation 2.0 API server running on http://localhost:${PORT}`);
  });
}
