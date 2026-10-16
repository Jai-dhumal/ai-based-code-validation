import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';

// Ensure Windows resolves MongoDB Atlas SRV records properly
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

import mongoose from 'mongoose';
import {
  User,
  Department,
  Subject,
  Assignment,
  Submission,
  QuizPermission,
  VivaSubmission,
  QuizAccessRequest,
  Announcement,
  Notification,
  ActivityLog,
  Setting
} from './models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Pre-computed bcrypt hash for 'password123'
const DEFAULT_HASHED_PASS = '$2b$10$zP6BVC7XrDeV1dYLegbyOeF9YRhlo2WNdfWMnOXCNbkYyVR9JnDdq';

const defaultData = {
  users: [
    {
      id: 'usr_student_1',
      name: 'Vansh Deshmukh',
      email: 'vansh@jspm.edu',
      password: DEFAULT_HASHED_PASS,
      role: 'student',
      rollNo: 'CE2025-01',
      department: 'Computer Engineering',
      division: 'A',
      lastHeartbeat: null,
      isOnline: false,
      createdAt: '2026-09-01T00:00:00Z'
    },
    {
      id: 'usr_student_2',
      name: 'Jaydeep Dhumal',
      email: 'jaydeep@jspm.edu',
      password: DEFAULT_HASHED_PASS,
      role: 'student',
      rollNo: 'CE2025-02',
      department: 'Computer Engineering',
      division: 'A',
      lastHeartbeat: null,
      isOnline: false,
      createdAt: '2026-09-01T00:00:00Z'
    },
    {
      id: 'usr_student_3',
      name: 'Omkar Chede',
      email: 'omkar@jspm.edu',
      password: DEFAULT_HASHED_PASS,
      role: 'student',
      rollNo: 'CE2025-03',
      department: 'Computer Engineering',
      division: 'A',
      lastHeartbeat: null,
      isOnline: false,
      createdAt: '2026-09-01T00:00:00Z'
    },
    {
      id: 'usr_teacher_1',
      name: 'Prof. Nitin Shivale',
      email: 'nitin@jspm.edu',
      password: DEFAULT_HASHED_PASS,
      role: 'teacher',
      department: 'Computer Engineering',
      divisions: ['A'],
      title: 'Assistant Professor',
      lastHeartbeat: null,
      isOnline: false,
      createdAt: '2026-09-01T00:00:00Z'
    },
    {
      id: 'usr_teacher_2',
      name: 'Prof. Supriya Kharde',
      email: 'supriya@jspm.edu',
      password: DEFAULT_HASHED_PASS,
      role: 'teacher',
      department: 'Information Technology',
      divisions: ['A'],
      title: 'Associate Professor',
      lastHeartbeat: null,
      isOnline: false,
      createdAt: '2026-09-01T00:00:00Z'
    },
    {
      id: 'usr_admin_1',
      name: 'Dr. S. K. Patil',
      email: 'admin@jspm.edu',
      password: DEFAULT_HASHED_PASS,
      role: 'admin',
      department: 'Computer Engineering',
      title: 'Head of Department',
      lastHeartbeat: null,
      isOnline: false,
      createdAt: '2026-09-01T00:00:00Z'
    }
  ],
  departments: [
    { id: 'dept_1', name: 'Computer Engineering', code: 'CE', divisions: ['A', 'B', 'C'] },
    { id: 'dept_2', name: 'Information Technology', code: 'IT', divisions: ['A', 'B', 'C'] },
    { id: 'dept_3', name: 'Electronics Engineering', code: 'ENTC', divisions: ['A', 'B', 'C'] },
    { id: 'dept_4', name: 'Mechanical Engineering', code: 'ME', divisions: ['A', 'B', 'C'] },
    { id: 'dept_5', name: 'Civil Engineering', code: 'CIVIL', divisions: ['A', 'B', 'C'] }
  ],
  assignments: [
    {
      id: 'asg_1',
      title: 'Assignment 1: Binary Search Tree Implementation',
      subject: 'Data Structures & Algorithms',
      code: 'CS201',
      deadline: '2026-10-30',
      languages: ['cpp', 'java', 'python'],
      minQuizScore: 70,
      teacherId: 'usr_teacher_1',
      description: 'Implement a BST with insert, delete, search, and in-order traversal operations.',
      starterCode: {
        python: 'class TreeNode:\n    def __init__(self, val=0):\n        self.val = val\n        self.left = None\n        self.right = None\n\nclass BinarySearchTree:\n    def __init__(self):\n        self.root = None\n\n    def insert(self, val):\n        # TODO: Implement insert\n        pass\n\n    def search(self, val):\n        # TODO: Implement search\n        return False\n\n    def in_order(self):\n        # TODO: Return list of values\n        return []\n',
        cpp: '#include <iostream>\n#include <vector>\n\nstruct TreeNode {\n    int val;\n    TreeNode* left;\n    TreeNode* right;\n    TreeNode(int v) : val(v), left(nullptr), right(nullptr) {}\n};\n\nclass BinarySearchTree {\npublic:\n    TreeNode* root = nullptr;\n    void insert(int val);\n    bool search(int val);\n    std::vector<int> inOrder();\n};\n'
      }
    },
    {
      id: 'asg_2',
      title: 'Assignment 2: Dijkstra Shortest Path Algorithm',
      subject: 'Design & Analysis of Algorithms',
      code: 'CS301',
      deadline: '2026-11-15',
      languages: ['cpp', 'java', 'python'],
      minQuizScore: 70,
      teacherId: 'usr_teacher_1',
      description: 'Implement Dijkstra algorithm using adjacency list and priority queue (min-heap).',
      starterCode: {
        python: 'import heapq\n\ndef dijkstra(graph, start):\n    # TODO: Implement Dijkstra\n    # graph is dict: {node: [(neighbor, weight), ...]}\n    return {}\n',
        cpp: '#include <iostream>\n#include <vector>\n#include <queue>\n\n// TODO: Implement Dijkstra using priority_queue\n'
      }
    }
  ],
  submissions: [
    {
      id: 'sub_sample_1',
      assignmentId: 'asg_1',
      studentId: 'usr_student_1',
      studentName: 'Vansh Deshmukh',
      rollNo: 'CE2025-01',
      language: 'cpp',
      submittedAt: '2026-10-10T14:32:00Z',
      code: '#include <iostream>\nusing namespace std;\n\nstruct Node {\n    int data;\n    Node *left, *right;\n    Node(int v) : data(v), left(nullptr), right(nullptr) {}\n};\n\nNode* insert(Node* root, int val) {\n    if (!root) return new Node(val);\n    if (val < root->data) root->left = insert(root->left, val);\n    else root->right = insert(root->right, val);\n    return root;\n}\n\nvoid inorder(Node* root) {\n    if (!root) return;\n    inorder(root->left);\n    cout << root->data << " ";\n    inorder(root->right);\n}\n\nint main() {\n    Node* root = nullptr;\n    root = insert(root, 50);\n    insert(root, 30);\n    insert(root, 70);\n    inorder(root);\n    return 0;\n}',
      tier1Score: 12,
      tier1Verdict: 'clean',
      tier2Score: 88,
      tier2Verdict: 'authentic',
      quizScore: 85,
      quizPassed: true,
      githubStatus: 'committed',
      githubCommitSha: 'a1b2c3d4e5f6',
      status: 'completed',
      department: 'Computer Engineering',
      division: 'A'
    }
  ],
  quizPermissions: [],
  vivaSubmissions: [],
  settings: {
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    tier1ThresholdLow: 30,
    tier1ThresholdHigh: 70,
    defaultMinQuizScore: 70
  },
  subjects: [
    {
      id: 'sub_1',
      name: 'Data Structures & Algorithms',
      code: 'CS201',
      semester: 3,
      teacherId: 'usr_teacher_1',
      department: 'Computer Engineering'
    },
    {
      id: 'sub_2',
      name: 'Design & Analysis of Algorithms',
      code: 'CS301',
      semester: 5,
      teacherId: 'usr_teacher_1',
      department: 'Computer Engineering'
    }
  ],
  quizAccessRequests: [],
  announcements: [
    {
      id: 'ann_1',
      title: 'Welcome to AI Code Validation Platform 2.0',
      content: 'All students must complete their assignment validations before the deadline. Use the plagiarism checker and pass the AI viva to submit your work.',
      authorId: 'usr_admin_1',
      authorName: 'Dr. S. K. Patil',
      authorRole: 'admin',
      targetRoles: ['student', 'teacher'],
      createdAt: '2026-09-15T10:00:00Z',
      priority: 'normal'
    }
  ],
  activityLogs: [],
  notifications: []
};

class Database {
  constructor() {
    this.mongoConnected = false;
    this.init();
    this.initMongo();
  }

  init() {
    if (!fs.existsSync(DB_FILE)) {
      this.data = JSON.parse(JSON.stringify(defaultData));
      this.save();
    } else {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        this.data = JSON.parse(raw);
        let modified = false;

        if (!this.data.departments) {
          this.data.departments = JSON.parse(JSON.stringify(defaultData.departments));
          modified = true;
        }
        if (!this.data.quizPermissions) {
          this.data.quizPermissions = [];
          modified = true;
        }
        if (!this.data.vivaSubmissions) {
          this.data.vivaSubmissions = [];
          modified = true;
        }
        if (!this.data.subjects) {
          this.data.subjects = JSON.parse(JSON.stringify(defaultData.subjects));
          modified = true;
        }
        if (!this.data.quizAccessRequests) {
          this.data.quizAccessRequests = [];
          modified = true;
        }
        if (!this.data.announcements) {
          this.data.announcements = JSON.parse(JSON.stringify(defaultData.announcements));
          modified = true;
        }
        if (!this.data.activityLogs) {
          this.data.activityLogs = [];
          modified = true;
        }
        if (!this.data.notifications) {
          this.data.notifications = [];
          modified = true;
        }

        // Migrate users: rename 'dept' -> 'department', backfill missing fields
        (this.data.users || []).forEach(u => {
          if (u.dept && !u.department) {
            u.department = u.dept;
            delete u.dept;
            modified = true;
          }
          if (!u.department) { u.department = 'Computer Engineering'; modified = true; }
          if (u.lastHeartbeat === undefined) { u.lastHeartbeat = null; modified = true; }
          if (u.isOnline === undefined) { u.isOnline = false; modified = true; }
          if (!u.createdAt) { u.createdAt = '2026-09-01T00:00:00Z'; modified = true; }
          if (u.role === 'student' && !u.division) { u.division = 'A'; modified = true; }
          if (u.role === 'teacher' && !u.divisions) { u.divisions = ['A']; modified = true; }
        });

        if (modified) {
          this.save();
        }
      } catch (err) {
        console.error('Error reading database file, resetting to defaults:', err);
        this.data = JSON.parse(JSON.stringify(defaultData));
        this.save();
      }
    }
  }

  async initMongo() {
    const uri = process.env.MONGODB_URI;
    if (!uri) return;
    try {
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
        console.log('🍃 [MONGODB ATLAS] Connected to cluster0.bbwixkk.mongodb.net/code_validator');
      }
      this.mongoConnected = true;

      // Load collections from MongoDB Atlas into memory cache
      const [users, assignments, submissions, depts, subs, perms, vivas, reqs, anns, notifs, logs] = await Promise.all([
        User.find({}).lean(),
        Assignment.find({}).lean(),
        Submission.find({}).lean(),
        Department.find({}).lean(),
        Subject.find({}).lean(),
        QuizPermission.find({}).lean(),
        VivaSubmission.find({}).lean(),
        QuizAccessRequest.find({}).lean(),
        Announcement.find({}).lean(),
        Notification.find({}).lean(),
        ActivityLog.find({}).lean()
      ]);

      if (users && users.length > 0) this.data.users = users;
      if (assignments && assignments.length > 0) this.data.assignments = assignments;
      if (submissions && submissions.length > 0) this.data.submissions = submissions;
      if (depts && depts.length > 0) this.data.departments = depts;
      if (subs && subs.length > 0) this.data.subjects = subs;
      if (perms && perms.length > 0) this.data.quizPermissions = perms;
      if (vivas && vivas.length > 0) this.data.vivaSubmissions = vivas;
      if (reqs && reqs.length > 0) this.data.quizAccessRequests = reqs;
      if (anns && anns.length > 0) this.data.announcements = anns;
      if (notifs && notifs.length > 0) this.data.notifications = notifs;
      if (logs && logs.length > 0) this.data.activityLogs = logs;
      
      const settingDoc = await Setting.findOne({ key: 'global_settings' }).lean();
      if (settingDoc) {
        delete settingDoc._id;
        delete settingDoc.key;
        this.data.settings = { ...this.data.settings, ...settingDoc };
      }
    } catch (err) {
      console.warn('⚠️ [MONGODB NOTICE] MongoDB Atlas connection notice:', err.message);
      this.mongoConnected = false;
    }
  }

  persistToMongo(model, doc) {
    if (!doc || !doc.id) return;
    try {
      model.updateOne({ id: doc.id }, { $set: doc }, { upsert: true }).catch(() => {});
    } catch (e) {}
  }

  deleteFromMongo(model, id) {
    if (!id) return;
    try {
      model.deleteOne({ id }).catch(() => {});
    } catch (e) {}
  }

  save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (err) {
      console.error('Error saving database:', err);
    }
  }

  // --- Users ---
  getUsers(role) {
    if (role) return this.data.users.filter(u => u.role === role);
    return this.data.users;
  }

  findUserById(id) {
    return this.data.users.find(u => u.id === id);
  }

  findUserByEmail(email) {
    if (!email) return null;
    const clean = email.trim().toLowerCase();
    return this.data.users.find(u => u.email && u.email.trim().toLowerCase() === clean);
  }

  addUser(user) {
    if (user && user.email) {
      user.email = user.email.trim().toLowerCase();
    }
    this.data.users.push(user);
    this.save();
    this.persistToMongo(User, user);
    return user;
  }

  updateUser(id, fields) {
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    this.data.users[idx] = { ...this.data.users[idx], ...fields };
    this.save();
    this.persistToMongo(User, this.data.users[idx]);
    return this.data.users[idx];
  }

  deleteUser(id) {
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx === -1) return false;
    this.data.users.splice(idx, 1);
    this.save();
    this.deleteFromMongo(User, id);
    return true;
  }

  // --- User Presence ---
  updateHeartbeat(userId) {
    const user = this.data.users.find(u => u.id === userId);
    if (!user) return null;
    user.lastHeartbeat = new Date().toISOString();
    user.isOnline = true;
    this.save();
    this.persistToMongo(User, user);
    return user;
  }

  getOnlineUsers(role, timeoutMs = 120000) {
    const now = Date.now();
    return (this.data.users || []).filter(u => {
      if (role && u.role !== role) return false;
      if (!u.isOnline || !u.lastHeartbeat) return false;
      const lastActive = new Date(u.lastHeartbeat).getTime();
      return (now - lastActive) <= timeoutMs;
    });
  }

  markUserOffline(userId) {
    const user = this.data.users.find(u => u.id === userId);
    if (!user) return null;
    user.isOnline = false;
    this.save();
    this.persistToMongo(User, user);
    return user;
  }

  // --- Assignments ---
  getAssignments() {
    return this.data.assignments;
  }

  getAssignmentById(id) {
    return this.data.assignments.find(a => a.id === id);
  }

  addAssignment(asg) {
    this.data.assignments.push(asg);
    this.save();
    this.persistToMongo(Assignment, asg);
    return asg;
  }

  updateAssignment(id, fields) {
    const idx = this.data.assignments.findIndex(a => a.id === id);
    if (idx === -1) return null;
    this.data.assignments[idx] = { ...this.data.assignments[idx], ...fields };
    this.save();
    this.persistToMongo(Assignment, this.data.assignments[idx]);
    return this.data.assignments[idx];
  }

  deleteAssignment(id) {
    const idx = this.data.assignments.findIndex(a => a.id === id);
    if (idx === -1) return false;
    this.data.assignments.splice(idx, 1);
    this.save();
    this.deleteFromMongo(Assignment, id);
    return true;
  }

  // --- Submissions ---
  getSubmissions(filter = {}) {
    return this.data.submissions.filter(s => {
      if (filter.assignmentId && s.assignmentId !== filter.assignmentId) return false;
      if (filter.studentId && s.studentId !== filter.studentId) return false;
      return true;
    });
  }

  getSubmissionById(id) {
    return this.data.submissions.find(s => s.id === id);
  }

  saveSubmission(sub) {
    const idx = this.data.submissions.findIndex(s => s.id === sub.id);
    if (idx >= 0) {
      this.data.submissions[idx] = sub;
    } else {
      this.data.submissions.push(sub);
    }
    this.save();
    this.persistToMongo(Submission, sub);
    return sub;
  }

  // --- Settings ---
  getSettings() {
    return this.data.settings;
  }

  updateSettings(newSettings) {
    this.data.settings = { ...this.data.settings, ...newSettings };
    this.save();
    Setting.updateOne({ key: 'global_settings' }, { $set: { key: 'global_settings', ...this.data.settings } }, { upsert: true }).catch(() => {});
    return this.data.settings;
  }

  // --- Departments ---
  getDepartments() {
    return this.data.departments || [];
  }

  getDepartmentById(id) {
    return (this.data.departments || []).find(d => d.id === id);
  }

  addDepartment(dept) {
    if (!this.data.departments) this.data.departments = [];
    this.data.departments.push(dept);
    this.save();
    this.persistToMongo(Department, dept);
    return dept;
  }

  updateDepartment(id, fields) {
    const depts = this.data.departments || [];
    const idx = depts.findIndex(d => d.id === id);
    if (idx === -1) return null;
    depts[idx] = { ...depts[idx], ...fields };
    this.save();
    this.persistToMongo(Department, depts[idx]);
    return depts[idx];
  }

  deleteDepartment(id) {
    if (!this.data.departments) return false;
    const idx = this.data.departments.findIndex(d => d.id === id);
    if (idx === -1) return false;
    this.data.departments.splice(idx, 1);
    this.save();
    this.deleteFromMongo(Department, id);
    return true;
  }

  // --- Subjects ---
  getSubjects() {
    return this.data.subjects || [];
  }

  getSubjectById(id) {
    return (this.data.subjects || []).find(s => s.id === id);
  }

  getSubjectsByTeacher(teacherId) {
    return (this.data.subjects || []).filter(s => s.teacherId === teacherId);
  }

  addSubject(subject) {
    if (!this.data.subjects) this.data.subjects = [];
    this.data.subjects.push(subject);
    this.save();
    this.persistToMongo(Subject, subject);
    return subject;
  }

  updateSubject(id, fields) {
    const subjects = this.data.subjects || [];
    const idx = subjects.findIndex(s => s.id === id);
    if (idx === -1) return null;
    subjects[idx] = { ...subjects[idx], ...fields };
    this.save();
    this.persistToMongo(Subject, subjects[idx]);
    return subjects[idx];
  }

  deleteSubject(id) {
    if (!this.data.subjects) return false;
    const idx = this.data.subjects.findIndex(s => s.id === id);
    if (idx === -1) return false;
    this.data.subjects.splice(idx, 1);
    this.save();
    this.deleteFromMongo(Subject, id);
    return true;
  }

  // --- Quiz Access Requests ---
  getQuizAccessRequests(filter = {}) {
    return (this.data.quizAccessRequests || []).filter(r => {
      if (filter.studentId && r.studentId !== filter.studentId) return false;
      if (filter.teacherId && r.teacherId !== filter.teacherId) return false;
      if (filter.assignmentId && r.assignmentId !== filter.assignmentId) return false;
      if (filter.status && r.status !== filter.status) return false;
      return true;
    });
  }

  getQuizAccessRequestById(id) {
    return (this.data.quizAccessRequests || []).find(r => r.id === id);
  }

  addQuizAccessRequest(request) {
    if (!this.data.quizAccessRequests) this.data.quizAccessRequests = [];
    this.data.quizAccessRequests.push(request);
    this.save();
    this.persistToMongo(QuizAccessRequest, request);
    return request;
  }

  updateQuizAccessRequest(id, fields) {
    const requests = this.data.quizAccessRequests || [];
    const idx = requests.findIndex(r => r.id === id);
    if (idx === -1) return null;
    requests[idx] = { ...requests[idx], ...fields };
    this.save();
    this.persistToMongo(QuizAccessRequest, requests[idx]);
    return requests[idx];
  }

  // --- Quiz Permissions ---
  getQuizPermissions(filter = {}) {
    const perms = this.data.quizPermissions || [];
    return perms.filter(p => {
      if (filter.studentId && p.studentId !== filter.studentId) return false;
      if (filter.assignmentId && p.assignmentId !== filter.assignmentId) return false;
      if (filter.status && p.status !== filter.status) return false;
      return true;
    });
  }

  getQuizPermissionById(id) {
    return (this.data.quizPermissions || []).find(p => p.id === id);
  }

  addQuizPermission(perm) {
    if (!this.data.quizPermissions) this.data.quizPermissions = [];
    this.data.quizPermissions.push(perm);
    this.save();
    this.persistToMongo(QuizPermission, perm);
    return perm;
  }

  updateQuizPermission(id, fields) {
    const perms = this.data.quizPermissions || [];
    const idx = perms.findIndex(p => p.id === id);
    if (idx === -1) return null;
    perms[idx] = { ...perms[idx], ...fields };
    this.save();
    this.persistToMongo(QuizPermission, perms[idx]);
    return perms[idx];
  }

  getStudentQuizPermission(studentId, assignmentId) {
    const perms = this.data.quizPermissions || [];
    return perms.slice().reverse().find(p => p.studentId === studentId && p.assignmentId === assignmentId);
  }

  // --- Viva Submissions ---
  getVivaSubmissions(filter = {}) {
    const vivas = this.data.vivaSubmissions || [];
    return vivas.filter(v => {
      if (filter.studentId && v.studentId !== filter.studentId) return false;
      if (filter.assignmentId && v.assignmentId !== filter.assignmentId) return false;
      return true;
    });
  }

  getVivaSubmissionById(id) {
    return (this.data.vivaSubmissions || []).find(v => v.id === id);
  }

  addVivaSubmission(viva) {
    if (!this.data.vivaSubmissions) this.data.vivaSubmissions = [];
    this.data.vivaSubmissions.push(viva);
    this.save();
    this.persistToMongo(VivaSubmission, viva);
    return viva;
  }

  updateVivaSubmission(id, fields) {
    const vivas = this.data.vivaSubmissions || [];
    const idx = vivas.findIndex(v => v.id === id);
    if (idx === -1) return null;
    vivas[idx] = { ...vivas[idx], ...fields };
    this.save();
    this.persistToMongo(VivaSubmission, vivas[idx]);
    return vivas[idx];
  }

  // --- Announcements ---
  getAnnouncements(filter = {}) {
    const anns = this.data.announcements || [];
    return anns.filter(a => {
      if (filter.authorId && a.authorId !== filter.authorId) return false;
      if (filter.targetRole && !a.targetRoles.includes(filter.targetRole)) return false;
      return true;
    });
  }

  addAnnouncement(announcement) {
    if (!this.data.announcements) this.data.announcements = [];
    this.data.announcements.push(announcement);
    this.save();
    this.persistToMongo(Announcement, announcement);
    return announcement;
  }

  deleteAnnouncement(id) {
    if (!this.data.announcements) return false;
    const idx = this.data.announcements.findIndex(a => a.id === id);
    if (idx === -1) return false;
    this.data.announcements.splice(idx, 1);
    this.save();
    this.deleteFromMongo(Announcement, id);
    return true;
  }

  // --- Activity Logs ---
  addActivityLog(log) {
    if (!this.data.activityLogs) this.data.activityLogs = [];
    this.data.activityLogs.push(log);
    if (this.data.activityLogs.length > 500) {
      this.data.activityLogs = this.data.activityLogs.slice(-500);
    }
    this.save();
    this.persistToMongo(ActivityLog, log);
    return log;
  }

  getActivityLogs(limit = 50) {
    const logs = this.data.activityLogs || [];
    return logs.slice(-limit).reverse();
  }

  // --- Notifications ---
  getNotifications(userId) {
    return (this.data.notifications || []).filter(n => n.userId === userId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  addNotification(notification) {
    if (!this.data.notifications) this.data.notifications = [];
    this.data.notifications.push(notification);
    this.save();
    this.persistToMongo(Notification, notification);
    return notification;
  }

  markNotificationRead(id) {
    const notifs = this.data.notifications || [];
    const idx = notifs.findIndex(n => n.id === id);
    if (idx === -1) return null;
    notifs[idx].read = true;
    this.save();
    this.persistToMongo(Notification, notifs[idx]);
    return notifs[idx];
  }

  markAllNotificationsRead(userId) {
    const notifs = this.data.notifications || [];
    notifs.forEach(n => {
      if (n.userId === userId) {
        n.read = true;
        this.persistToMongo(Notification, n);
      }
    });
    this.save();
  }
}

export const db = new Database();

export {
  mongoose,
  User,
  Department,
  Subject,
  Assignment,
  Submission,
  QuizPermission,
  VivaSubmission,
  QuizAccessRequest,
  Announcement,
  Notification,
  ActivityLog,
  Setting
};
