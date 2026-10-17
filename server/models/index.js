import mongoose from 'mongoose';

const schemaOptions = {
  timestamps: false,
  versionKey: false,
  strict: false // Allows dynamic field extensions while providing typed defaults
};

// 1. User Schema
export const UserSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'teacher', 'admin'], default: 'student', index: true },
  rollNo: { type: String, default: '' },
  department: { type: String, index: true },
  division: { type: String, default: 'A' },
  divisions: [{ type: String }],
  title: { type: String, default: '' },
  photoUrl: { type: String, default: null },
  lastHeartbeat: { type: String, default: null },
  isOnline: { type: Boolean, default: false },
  createdAt: { type: String, default: () => new Date().toISOString() }
}, schemaOptions);

// 2. Department Schema
export const DepartmentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, unique: true },
  code: { type: String, required: true, unique: true },
  divisions: [{ type: String }]
}, schemaOptions);

// 3. Subject Schema
export const SubjectSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  code: { type: String, required: true },
  semester: { type: Number, default: 1 },
  teacherId: { type: String, default: null },
  department: { type: String, default: '' }
}, schemaOptions);

// 4. Assignment Schema
export const AssignmentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  subject: { type: String, required: true, index: true },
  code: { type: String, default: '' },
  deadline: { type: String, default: '' },
  languages: [{ type: String }],
  minQuizScore: { type: Number, default: 70 },
  teacherId: { type: String, default: null, index: true },
  description: { type: String, default: '' },
  starterCode: { type: mongoose.Schema.Types.Mixed, default: {} },
  department: { type: String, default: 'Computer Engineering', index: true },
  division: { type: String, default: 'all', index: true },
  divisions: [{ type: String }]
}, schemaOptions);

// 5. Submission Schema
export const SubmissionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  assignmentId: { type: String, required: true, index: true },
  studentId: { type: String, required: true, index: true },
  studentName: { type: String, required: true },
  rollNo: { type: String, default: '' },
  language: { type: String, default: 'cpp' },
  submittedAt: { type: String, default: () => new Date().toISOString() },
  code: { type: String, required: true },
  tier1Score: { type: Number, default: 0 },
  tier1Verdict: { type: String, default: 'clean' },
  tier2Score: { type: Number, default: null },
  tier2Verdict: { type: String, default: null },
  quizScore: { type: Number, default: null },
  quizPassed: { type: Boolean, default: false },
  githubStatus: { type: String, default: null },
  githubCommitSha: { type: String, default: null },
  status: { type: String, default: 'submitted' },
  department: { type: String, default: '' },
  division: { type: String, default: 'A' }
}, schemaOptions);

// 6. Quiz Permission Schema
export const QuizPermissionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  studentId: { type: String, required: true, index: true },
  assignmentId: { type: String, required: true, index: true },
  quizId: { type: String, default: null },
  status: { type: String, enum: ['locked', 'available', 'in_progress', 'completed', 'revoked'], default: 'locked', index: true },
  enabledBy: { type: String, default: null },
  enabledAt: { type: String, default: null },
  revokedAt: { type: String, default: null },
  revokedBy: { type: String, default: null }
}, schemaOptions);

// 7. Viva Submission Schema
export const VivaSubmissionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  studentId: { type: String, required: true, index: true },
  assignmentId: { type: String, required: true, index: true },
  originalSubmissionId: { type: String, default: null },
  vivaCode: { type: String, required: true },
  jaccardSimilarity: { type: Number, default: 0 },
  tokenSimilarity: { type: Number, default: 0 },
  comparedAt: { type: String, default: () => new Date().toISOString() },
  reviewStatus: { type: String, default: 'pending' },
  teacherReview: { type: Object, default: null }
}, schemaOptions);

// 8. Quiz Access Request Schema
export const QuizAccessRequestSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  studentId: { type: String, required: true, index: true },
  studentName: { type: String, required: true },
  assignmentId: { type: String, required: true, index: true },
  assignmentTitle: { type: String, default: '' },
  teacherId: { type: String, default: null },
  tier1Score: { type: Number, default: 0 },
  tier1Verdict: { type: String, default: '' },
  tier2Score: { type: Number, default: null },
  tier2Verdict: { type: String, default: null },
  code: { type: String, default: '' },
  language: { type: String, default: 'cpp' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  requestedAt: { type: String, default: () => new Date().toISOString() },
  reviewedAt: { type: String, default: null },
  reviewNote: { type: String, default: '' }
}, schemaOptions);

// 9. Announcement Schema
export const AnnouncementSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  authorId: { type: String, default: null },
  authorName: { type: String, default: 'Admin' },
  authorRole: { type: String, default: 'admin' },
  targetRoles: [{ type: String }],
  createdAt: { type: String, default: () => new Date().toISOString() },
  priority: { type: String, default: 'normal' }
}, schemaOptions);

// 10. Notification Schema
export const NotificationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  type: { type: String, default: 'info' },
  title: { type: String, required: true },
  message: { type: String, required: true },
  relatedId: { type: String, default: null },
  read: { type: Boolean, default: false },
  createdAt: { type: String, default: () => new Date().toISOString() }
}, schemaOptions);

// 11. Activity Log Schema
export const ActivityLogSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  action: { type: String, required: true },
  userId: { type: String, default: null },
  userName: { type: String, default: '' },
  details: { type: String, default: '' },
  timestamp: { type: String, default: () => new Date().toISOString() }
}, schemaOptions);

// 12. Settings Schema
export const SettingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, default: 'global_settings' },
  geminiApiKey: { type: String, default: '' },
  tier1ThresholdLow: { type: Number, default: 30 },
  tier1ThresholdHigh: { type: Number, default: 60 },
  defaultMinQuizScore: { type: Number, default: 70 }
}, schemaOptions);

// Compile Mongoose Models
export const User = mongoose.models.User || mongoose.model('User', UserSchema);
export const Department = mongoose.models.Department || mongoose.model('Department', DepartmentSchema);
export const Subject = mongoose.models.Subject || mongoose.model('Subject', SubjectSchema);
export const Assignment = mongoose.models.Assignment || mongoose.model('Assignment', AssignmentSchema);
export const Submission = mongoose.models.Submission || mongoose.model('Submission', SubmissionSchema);
export const QuizPermission = mongoose.models.QuizPermission || mongoose.model('QuizPermission', QuizPermissionSchema);
export const VivaSubmission = mongoose.models.VivaSubmission || mongoose.model('VivaSubmission', VivaSubmissionSchema);
export const QuizAccessRequest = mongoose.models.QuizAccessRequest || mongoose.model('QuizAccessRequest', QuizAccessRequestSchema);
export const Announcement = mongoose.models.Announcement || mongoose.model('Announcement', AnnouncementSchema);
export const Notification = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
export const ActivityLog = mongoose.models.ActivityLog || mongoose.model('ActivityLog', ActivityLogSchema);
export const Setting = mongoose.models.Setting || mongoose.model('Setting', SettingSchema);
