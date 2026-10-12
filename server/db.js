import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const defaultData = {
  users: [
    {
      id: 'usr_student_1',
      name: 'Vansh Deshmukh',
      email: 'vansh@jspm.edu',
      password: 'password123',
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
      password: 'password123',
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
      password: 'password123',
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
      email: 'nitin.shivale@jspm.edu',
      password: 'password123',
      role: 'teacher',
      department: 'Computer Engineering',
      title: 'Assistant Professor & Guide',
      divisions: ['A'],
      lastHeartbeat: null,
      isOnline: false,
      createdAt: '2026-09-01T00:00:00Z'
    },
    {
      id: 'usr_teacher_2',
      name: 'Prof. Anjali Mehta',
      email: 'anjali.mehta@jspm.edu',
      password: 'password123',
      role: 'teacher',
      department: 'Computer Engineering',
      title: 'Associate Professor',
      divisions: ['A'],
      lastHeartbeat: null,
      isOnline: false,
      createdAt: '2026-09-01T00:00:00Z'
    },
    {
      id: 'usr_admin_1',
      name: 'Dr. S. K. Patil',
      email: 'admin@jspm.edu',
      password: 'password123',
      role: 'admin',
      department: 'Computer Engineering',
      title: 'Head of Department & Administrator',
      lastHeartbeat: null,
      isOnline: false,
      createdAt: '2026-09-01T00:00:00Z'
    }
  ],
  assignments: [
    {
      id: 'asg_1',
      title: 'Binary Search Tree Operations',
      subject: 'Data Structures & Algorithms',
      code: 'CS301',
      deadline: '2026-10-15T23:59:59Z',
      languages: ['python', 'cpp', 'java'],
      minQuizScore: 70,
      teacherId: 'usr_teacher_1',
      description: 'Implement a Binary Search Tree (BST) supporting insert(val), search(val), and in_order_traversal(). Optimize for clean recursion and edge handling (empty tree, duplicates).',
      starterCode: {
        python: `class TreeNode:\n    def __init__(self, val=0):\n        self.val = val\n        self.left = None\n        self.right = None\n\nclass BinarySearchTree:\n    def __init__(self):\n        self.root = None\n\n    def insert(self, val):\n        # TODO: Implement insert\n        pass\n\n    def search(self, val):\n        # TODO: Implement search\n        return False\n\n    def in_order(self):\n        # TODO: Return list of values\n        return []\n`,
        cpp: `#include <iostream>\n#include <vector>\n\nstruct TreeNode {\n    int val;\n    TreeNode* left;\n    TreeNode* right;\n    TreeNode(int v) : val(v), left(nullptr), right(nullptr) {}\n};\n\nclass BinarySearchTree {\npublic:\n    TreeNode* root = nullptr;\n    void insert(int val);\n    bool search(int val);\n    std::vector<int> inOrder();\n};\n`
      }
    },
    {
      id: 'asg_2',
      title: 'Dijkstra Shortest Path Algorithm',
      subject: 'Advanced Algorithms',
      code: 'CS402',
      deadline: '2026-10-25T23:59:59Z',
      languages: ['python', 'cpp'],
      minQuizScore: 75,
      teacherId: 'usr_teacher_1',
      description: 'Implement Dijkstra\'s Single Source Shortest Path on a weighted directed graph using a Min-Heap / Priority Queue. Handle disconnected graphs gracefully.',
      starterCode: {
        python: `import heapq\n\ndef dijkstra(graph, start_node):\n    # graph is {u: [(v, weight), ...]}\n    # TODO: return shortest distances dict from start_node\n    distances = {start_node: 0}\n    return distances\n`
      }
    }
  ],
  submissions: [
    {
      id: 'sub_omkar_bst',
      assignmentId: 'asg_1',
      studentId: 'usr_student_3',
      studentName: 'Omkar Chede',
      rollNo: 'CE2025-03',
      department: 'Computer Engineering',
      division: 'A',
      language: 'python',
      submittedAt: '2026-09-18T14:30:00Z',
      code: `class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\nclass BinarySearchTree:\n    def __init__(self):\n        self.root = None\n\n    def insert(self, val):\n        if not self.root:\n            self.root = TreeNode(val)\n            return\n        curr = self.root\n        while True:\n            if val < curr.val:\n                if not curr.left:\n                    curr.left = TreeNode(val)\n                    break\n                curr = curr.left\n            elif val > curr.val:\n                if not curr.right:\n                    curr.right = TreeNode(val)\n                    break\n                curr = curr.right\n            else:\n                break\n\n    def search(self, val):\n        curr = self.root\n        while curr:\n            if curr.val == val:\n                return True\n            elif val < curr.val:\n                curr = curr.left\n            else:\n                curr = curr.right\n        return False\n\n    def in_order(self):\n        res = []\n        def traverse(node):\n            if not node: return\n            traverse(node.left)\n            res.append(node.val)\n            traverse(node.right)\n        traverse(self.root)\n        return res\n`,
      tier1Score: 12,
      tier1Verdict: 'Low Similarity (Unique)',
      tier2Score: 8,
      tier2Verdict: 'Original Independent Work',
      quizScore: 92,
      quizPassed: true,
      githubStatus: 'Committed & Pushed',
      githubCommitSha: 'a8b79e2c451d67',
      status: 'Approved'
    }
  ],
  departments: [
    { id: 'dept_1', name: 'Computer Engineering', code: 'CE', divisions: ['A', 'B', 'C'] },
    { id: 'dept_2', name: 'Information Technology', code: 'IT', divisions: ['A', 'B', 'C'] },
    { id: 'dept_3', name: 'Electronics Engineering', code: 'ENTC', divisions: ['A', 'B', 'C'] },
    { id: 'dept_4', name: 'Mechanical Engineering', code: 'ME', divisions: ['A', 'B', 'C'] },
    { id: 'dept_5', name: 'Civil Engineering', code: 'CIVIL', divisions: ['A', 'B', 'C'] }
  ],
  quizPermissions: [],
  vivaSubmissions: [],
  settings: {
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    tier1ThresholdLow: 35,
    tier1ThresholdHigh: 75,
    defaultMinQuizScore: 70
  },
  subjects: [
    {
      id: 'subj_1',
      name: 'Data Structures & Algorithms',
      code: 'CS301',
      semester: 5,
      teacherId: 'usr_teacher_1',
      department: 'Computer Engineering'
    },
    {
      id: 'subj_2',
      name: 'Advanced Algorithms',
      code: 'CS402',
      semester: 7,
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
    this.init();
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
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  addUser(user) {
    this.data.users.push(user);
    this.save();
    return user;
  }

  updateUser(id, fields) {
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    this.data.users[idx] = { ...this.data.users[idx], ...fields };
    this.save();
    return this.data.users[idx];
  }

  deleteUser(id) {
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx === -1) return false;
    this.data.users.splice(idx, 1);
    this.save();
    return true;
  }

  // --- User Presence ---
  updateHeartbeat(userId) {
    const user = this.data.users.find(u => u.id === userId);
    if (!user) return null;
    user.lastHeartbeat = new Date().toISOString();
    user.isOnline = true;
    this.save();
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
    return asg;
  }

  updateAssignment(id, fields) {
    const idx = this.data.assignments.findIndex(a => a.id === id);
    if (idx === -1) return null;
    this.data.assignments[idx] = { ...this.data.assignments[idx], ...fields };
    this.save();
    return this.data.assignments[idx];
  }

  deleteAssignment(id) {
    const idx = this.data.assignments.findIndex(a => a.id === id);
    if (idx === -1) return false;
    this.data.assignments.splice(idx, 1);
    this.save();
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
    return sub;
  }

  // --- Settings ---
  getSettings() {
    return this.data.settings;
  }

  updateSettings(newSettings) {
    this.data.settings = { ...this.data.settings, ...newSettings };
    this.save();
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
    return dept;
  }

  updateDepartment(id, fields) {
    const depts = this.data.departments || [];
    const idx = depts.findIndex(d => d.id === id);
    if (idx === -1) return null;
    depts[idx] = { ...depts[idx], ...fields };
    this.save();
    return depts[idx];
  }

  deleteDepartment(id) {
    if (!this.data.departments) return false;
    const idx = this.data.departments.findIndex(d => d.id === id);
    if (idx === -1) return false;
    this.data.departments.splice(idx, 1);
    this.save();
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
    return subject;
  }

  updateSubject(id, fields) {
    const subjects = this.data.subjects || [];
    const idx = subjects.findIndex(s => s.id === id);
    if (idx === -1) return null;
    subjects[idx] = { ...subjects[idx], ...fields };
    this.save();
    return subjects[idx];
  }

  deleteSubject(id) {
    if (!this.data.subjects) return false;
    const idx = this.data.subjects.findIndex(s => s.id === id);
    if (idx === -1) return false;
    this.data.subjects.splice(idx, 1);
    this.save();
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
    return request;
  }

  updateQuizAccessRequest(id, fields) {
    const requests = this.data.quizAccessRequests || [];
    const idx = requests.findIndex(r => r.id === id);
    if (idx === -1) return null;
    requests[idx] = { ...requests[idx], ...fields };
    this.save();
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
    return perm;
  }

  updateQuizPermission(id, fields) {
    const perms = this.data.quizPermissions || [];
    const idx = perms.findIndex(p => p.id === id);
    if (idx === -1) return null;
    perms[idx] = { ...perms[idx], ...fields };
    this.save();
    return perms[idx];
  }

  getStudentQuizPermission(studentId, assignmentId) {
    const perms = this.data.quizPermissions || [];
    // Return the most recent permission record for this student and assignment
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
    return viva;
  }

  updateVivaSubmission(id, fields) {
    const vivas = this.data.vivaSubmissions || [];
    const idx = vivas.findIndex(v => v.id === id);
    if (idx === -1) return null;
    vivas[idx] = { ...vivas[idx], ...fields };
    this.save();
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
    return announcement;
  }

  deleteAnnouncement(id) {
    if (!this.data.announcements) return false;
    const idx = this.data.announcements.findIndex(a => a.id === id);
    if (idx === -1) return false;
    this.data.announcements.splice(idx, 1);
    this.save();
    return true;
  }

  // --- Activity Logs ---
  addActivityLog(log) {
    if (!this.data.activityLogs) this.data.activityLogs = [];
    this.data.activityLogs.push(log);
    // Keep only last 500 logs
    if (this.data.activityLogs.length > 500) {
      this.data.activityLogs = this.data.activityLogs.slice(-500);
    }
    this.save();
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
    return notification;
  }

  markNotificationRead(id) {
    const notifs = this.data.notifications || [];
    const idx = notifs.findIndex(n => n.id === id);
    if (idx === -1) return null;
    notifs[idx].read = true;
    this.save();
    return notifs[idx];
  }

  markAllNotificationsRead(userId) {
    const notifs = this.data.notifications || [];
    notifs.forEach(n => {
      if (n.userId === userId) n.read = true;
    });
    this.save();
  }
}

export const db = new Database();
