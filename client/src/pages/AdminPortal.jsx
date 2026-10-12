import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Building2,
  Search,
  Filter,
  Plus,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  BookOpen,
  FileCode,
  Award,
  ShieldCheck,
  Eye,
  Mail,
  UserPlus,
  X,
  AlertCircle,
  Layers,
  Activity,
  Hash,
  Calendar,
  Sparkles,
  GitCommit
} from 'lucide-react';

export default function AdminPortal({ currentUser }) {
  // Navigation Tabs: 'overview' | 'teachers' | 'students' | 'departments'
  const [activeTab, setActiveTab] = useState('overview');

  // Global loading and error states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Data states
  const [overviewData, setOverviewData] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);

  // Overview Tab State
  const [expandedDeptCards, setExpandedDeptCards] = useState({ dept_1: true, 'Computer Engineering': true });

  // Teacher Management State
  const [teacherSearch, setTeacherSearch] = useState('');
  const [teacherDeptFilter, setTeacherDeptFilter] = useState('all');
  const [teacherStatusFilter, setTeacherStatusFilter] = useState('all');
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [isAddTeacherOpen, setIsAddTeacherOpen] = useState(false);
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherEmail, setNewTeacherEmail] = useState('');
  const [newTeacherTitle, setNewTeacherTitle] = useState('Assistant Professor');
  const [newTeacherDept, setNewTeacherDept] = useState('');
  const [newTeacherDivisions, setNewTeacherDivisions] = useState(['A']);
  const [newTeacherPassword, setNewTeacherPassword] = useState('password123');
  const [teacherFormSubmitting, setTeacherFormSubmitting] = useState(false);

  // Student Management State
  const [studentSearch, setStudentSearch] = useState('');
  const [studentDeptFilter, setStudentDeptFilter] = useState('all');
  const [studentDivFilter, setStudentDivFilter] = useState('all');
  const [studentStatusFilter, setStudentStatusFilter] = useState('all');
  const [studentPage, setStudentPage] = useState(1);
  const [studentsPerPage] = useState(15);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [expandedStudentDepts, setExpandedStudentDepts] = useState({});
  const [expandedStudentDivs, setExpandedStudentDivs] = useState({});
  const [studentViewMode, setStudentViewMode] = useState('table'); // 'table' | 'hierarchy'

  // Department Management State
  const [isAddDeptOpen, setIsAddDeptOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptDivisions, setDeptDivisions] = useState(['A', 'B', 'C']);
  const [deptFormSubmitting, setDeptFormSubmitting] = useState(false);

  // Delete Confirmation Modal State
  const [deleteConfirm, setDeleteConfirm] = useState({
    isOpen: false,
    type: null, // 'teacher' | 'student' | 'department'
    id: null,
    name: '',
    loading: false
  });

  // Helper for auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem('ai_validate_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  // ----------------------------------------------------
  // DATA FETCHING
  // ----------------------------------------------------

  const fetchOverview = async () => {
    try {
      const res = await fetch('/api/admin/overview', { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(`Overview fetch failed (${res.status})`);
      const data = await res.json();
      setOverviewData(data);
      if (data.departments && departments.length === 0) {
        setDepartments(data.departments);
      }
      return data;
    } catch (err) {
      console.error('Error fetching overview:', err);
      throw err;
    }
  };

  const fetchTeachers = async () => {
    try {
      const res = await fetch('/api/admin/teachers', { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(`Teachers fetch failed (${res.status})`);
      const data = await res.json();
      setTeachers(Array.isArray(data) ? data : []);
      return data;
    } catch (err) {
      console.error('Error fetching teachers:', err);
      throw err;
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await fetch('/api/admin/students', { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(`Students fetch failed (${res.status})`);
      const data = await res.json();
      setStudents(Array.isArray(data) ? data : []);
      return data;
    } catch (err) {
      console.error('Error fetching students:', err);
      throw err;
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/admin/departments', { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(`Departments fetch failed (${res.status})`);
      const data = await res.json();
      setDepartments(Array.isArray(data) ? data : []);
      return data;
    } catch (err) {
      console.error('Error fetching departments:', err);
      // Fallback if not configured
      return [];
    }
  };

  const fetchSubmissionsAndAssignments = async () => {
    try {
      const [asgRes, subRes] = await Promise.all([
        fetch('/api/assignments', { headers: getAuthHeaders() }),
        fetch('/api/submissions', { headers: getAuthHeaders() })
      ]);
      if (asgRes.ok) {
        const asgData = await asgRes.json();
        setAssignments(Array.isArray(asgData) ? asgData : []);
      }
      if (subRes.ok) {
        const subData = await subRes.json();
        setSubmissions(Array.isArray(subData) ? subData : []);
      }
    } catch (err) {
      console.warn('Error fetching supplemental asg/subs:', err);
    }
  };

  const loadAllData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      await Promise.allSettled([
        fetchOverview(),
        fetchTeachers(),
        fetchStudents(),
        fetchDepartments(),
        fetchSubmissionsAndAssignments()
      ]);
    } catch (err) {
      setError(err.message || 'Failed to load admin data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // When changing tabs, softly revalidate tab data
  useEffect(() => {
    if (activeTab === 'overview') fetchOverview();
    if (activeTab === 'teachers') fetchTeachers();
    if (activeTab === 'students') fetchStudents();
    if (activeTab === 'departments') fetchDepartments();
  }, [activeTab]);

  // Set default department for new teacher form once departments load
  useEffect(() => {
    if (departments.length > 0 && !newTeacherDept) {
      setNewTeacherDept(departments[0].name || departments[0].code || 'Computer Engineering');
    }
  }, [departments]);

  // ----------------------------------------------------
  // COMPUTED STATS & OVERVIEW DERIVATIONS
  // ----------------------------------------------------

  // Calculate user presence counts directly from live arrays or overview response
  const stats = useMemo(() => {
    const totalStuds = overviewData?.totalStudents ?? students.length;
    const totalFaculty = overviewData?.totalTeachers ?? teachers.length;
    const totalAsgs = overviewData?.totalAssignments ?? assignments.length;
    const totalSubs = overviewData?.totalSubmissions ?? submissions.length;

    // Online counts
    const onlineStuds = overviewData?.onlineStudentsCount ?? students.filter(s => s.isOnline).length;
    const onlineFaculty = overviewData?.onlineTeachersCount ?? teachers.filter(t => t.isOnline).length;

    return {
      totalStudents: totalStuds,
      totalTeachers: totalFaculty,
      totalAssignments: totalAsgs,
      totalSubmissions: totalSubs,
      onlineStudents: onlineStuds,
      onlineTeachers: onlineFaculty,
      passRate: overviewData?.passRate ?? 0
    };
  }, [overviewData, students, teachers, assignments, submissions]);

  // Department list unified from overviewData.departments or departments state
  const departmentList = useMemo(() => {
    if (departments && departments.length > 0) return departments;
    if (overviewData?.departments && overviewData.departments.length > 0) return overviewData.departments;
    // Default fallback
    return [
      { id: 'dept_1', name: 'Computer Engineering', code: 'CE', divisions: ['A', 'B', 'C'] },
      { id: 'dept_2', name: 'Information Technology', code: 'IT', divisions: ['A', 'B'] },
      { id: 'dept_3', name: 'Electronics Engineering', code: 'ENTC', divisions: ['A', 'B'] }
    ];
  }, [departments, overviewData]);

  // Compute department & division metrics dynamically
  const departmentMetrics = useMemo(() => {
    return departmentList.map(dept => {
      const deptName = dept.name || '';
      const deptCode = dept.code || '';

      const deptStudents = students.filter(
        s => s.department === deptName || s.department === deptCode ||
             (s.department && deptName && s.department.toLowerCase().includes(deptName.toLowerCase())) ||
             (deptName && s.department && deptName.toLowerCase().includes(s.department.toLowerCase()))
      );

      const allTeachersList = teachers.length > 0 ? teachers : (overviewData?.teachers || []);
      const deptTeachers = allTeachersList.filter(
        t => t.department === deptName || t.department === deptCode ||
             (t.department && deptName && t.department.toLowerCase().includes(deptName.toLowerCase())) ||
             (deptName && t.department && deptName.toLowerCase().includes(t.department.toLowerCase()))
      );

      const deptTeachersWithWorkload = deptTeachers.map(t => {
        const teacherAsgs = assignments.filter(a => a.teacherId === t.id);
        const asgIds = new Set(teacherAsgs.map(a => a.id));
        const teacherSubs = submissions.filter(s => asgIds.has(s.assignmentId));
        return {
          ...t,
          assignmentCount: teacherAsgs.length,
          submissionCount: teacherSubs.length
        };
      });

      const deptAssignments = assignments.filter(
        a => (a.subject && a.subject.toLowerCase().includes(deptCode.toLowerCase())) ||
             deptTeachersWithWorkload.some(t => t.id === a.teacherId)
      );

      const rawDivs = Array.isArray(dept.divisions) && dept.divisions.length > 0
        ? dept.divisions
        : ['A', 'B', 'C'];
      const divs = rawDivs.map(div => {
        const divName = typeof div === 'string' ? div : (div?.division || 'A');
        const divStudents = deptStudents.filter(s => (s.division || 'A') === divName);
        const divOnline = divStudents.filter(s => s.isOnline).length;
        const divOffline = divStudents.length - divOnline;
        return {
          division: divName,
          registered: divStudents.length,
          online: divOnline,
          offline: divOffline,
          students: divStudents
        };
      });

      const totalOnline = deptStudents.filter(s => s.isOnline).length;
      const totalOffline = deptStudents.length - totalOnline;

      return {
        ...dept,
        totalStudents: deptStudents.length,
        onlineStudents: totalOnline,
        offlineStudents: totalOffline,
        teacherCount: deptTeachersWithWorkload.length,
        assignmentCount: deptAssignments.length,
        divisionsList: divs,
        students: deptStudents,
        teachers: deptTeachersWithWorkload
      };
    });
  }, [departmentList, students, teachers, assignments, overviewData, submissions]);

  // Teacher workload list (unified from overview or calculated)
  const teacherWorkload = useMemo(() => {
    if (overviewData?.teacherWorkload && overviewData.teacherWorkload.length > 0) {
      return overviewData.teacherWorkload;
    }
    return teachers.map(t => {
      const teacherAsgs = assignments.filter(a => a.teacherId === t.id);
      const asgIds = new Set(teacherAsgs.map(a => a.id));
      const teacherSubs = submissions.filter(s => asgIds.has(s.assignmentId));
      return {
        teacherId: t.id,
        name: t.name,
        email: t.email,
        department: t.department || 'Computer Engineering',
        assignmentCount: teacherAsgs.length,
        submissionCount: teacherSubs.length,
        isOnline: Boolean(t.isOnline)
      };
    });
  }, [overviewData, teachers, assignments, submissions]);

  // Recent submissions
  const recentSubmissions = useMemo(() => {
    if (overviewData?.recentSubmissions && overviewData.recentSubmissions.length > 0) {
      return overviewData.recentSubmissions;
    }
    return submissions.slice(-10).reverse();
  }, [overviewData, submissions]);

  // ----------------------------------------------------
  // FILTERED TEACHERS & STUDENTS
  // ----------------------------------------------------

  const filteredTeachers = useMemo(() => {
    return teachers.filter(t => {
      const q = teacherSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        t.name?.toLowerCase().includes(q) ||
        t.email?.toLowerCase().includes(q) ||
        t.title?.toLowerCase().includes(q);

      const matchesDept =
        teacherDeptFilter === 'all' ||
        t.department === teacherDeptFilter;

      const matchesStatus =
        teacherStatusFilter === 'all' ||
        (teacherStatusFilter === 'online' && t.isOnline) ||
        (teacherStatusFilter === 'offline' && !t.isOnline);

      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [teachers, teacherSearch, teacherDeptFilter, teacherStatusFilter]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const q = studentSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.name?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.rollNo?.toLowerCase().includes(q);

      const matchesDept =
        studentDeptFilter === 'all' ||
        s.department === studentDeptFilter;

      const matchesDiv =
        studentDivFilter === 'all' ||
        (s.division || 'A') === studentDivFilter;

      const matchesStatus =
        studentStatusFilter === 'all' ||
        (studentStatusFilter === 'online' && s.isOnline) ||
        (studentStatusFilter === 'offline' && !s.isOnline);

      return matchesSearch && matchesDept && matchesDiv && matchesStatus;
    });
  }, [students, studentSearch, studentDeptFilter, studentDivFilter, studentStatusFilter]);

  // Pagination for Students
  const totalStudentPages = Math.ceil(filteredStudents.length / studentsPerPage) || 1;
  const paginatedStudents = useMemo(() => {
    const startIndex = (studentPage - 1) * studentsPerPage;
    return filteredStudents.slice(startIndex, startIndex + studentsPerPage);
  }, [filteredStudents, studentPage, studentsPerPage]);

  // Reset student page when filters change
  useEffect(() => {
    setStudentPage(1);
  }, [studentSearch, studentDeptFilter, studentDivFilter, studentStatusFilter]);

  // ----------------------------------------------------
  // HANDLERS: TEACHER MANAGEMENT
  // ----------------------------------------------------

  const handleAddTeacher = async (e) => {
    e.preventDefault();
    if (!newTeacherName.trim() || !newTeacherEmail.trim()) {
      alert('Please provide teacher name and official email.');
      return;
    }
    setTeacherFormSubmitting(true);
    try {
      const res = await fetch('/api/admin/teachers', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: newTeacherName.trim(),
          email: newTeacherEmail.trim().toLowerCase(),
          title: newTeacherTitle,
          department: newTeacherDept,
          divisions: newTeacherDivisions,
          password: newTeacherPassword || 'password123'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add teacher');

      setIsAddTeacherOpen(false);
      setNewTeacherName('');
      setNewTeacherEmail('');
      setNewTeacherDivisions(['A']);
      setNewTeacherPassword('password123');
      await fetchTeachers();
      await fetchOverview();
    } catch (err) {
      alert(err.message || 'Error adding teacher');
    } finally {
      setTeacherFormSubmitting(false);
    }
  };

  const handleDeleteTeacherClick = (teacher) => {
    setDeleteConfirm({
      isOpen: true,
      type: 'teacher',
      id: teacher.id,
      name: teacher.name,
      loading: false
    });
  };

  // ----------------------------------------------------
  // HANDLERS: STUDENT MANAGEMENT
  // ----------------------------------------------------

  const handleDeleteStudentClick = (student) => {
    setDeleteConfirm({
      isOpen: true,
      type: 'student',
      id: student.id,
      name: `${student.name} (${student.rollNo || student.email})`,
      loading: false
    });
  };

  // ----------------------------------------------------
  // HANDLERS: DEPARTMENT MANAGEMENT
  // ----------------------------------------------------

  const handleOpenAddDept = () => {
    setEditingDept(null);
    setDeptName('');
    setDeptCode('');
    setDeptDivisions(['A', 'B', 'C']);
    setIsAddDeptOpen(true);
  };

  const handleOpenEditDept = (dept) => {
    setEditingDept(dept);
    setDeptName(dept.name || '');
    setDeptCode(dept.code || '');
    setDeptDivisions(dept.divisions && dept.divisions.length > 0 ? [...dept.divisions] : ['A', 'B']);
    setIsAddDeptOpen(true);
  };

  const handleSaveDepartment = async (e) => {
    e.preventDefault();
    if (!deptName.trim()) {
      alert('Department name is required');
      return;
    }
    setDeptFormSubmitting(true);
    try {
      const url = editingDept
        ? `/api/admin/departments/${editingDept.id}`
        : '/api/admin/departments';
      const method = editingDept ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: deptName.trim(),
          code: deptCode.trim().toUpperCase() || deptName.trim().substring(0, 4).toUpperCase(),
          divisions: deptDivisions
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save department');

      setIsAddDeptOpen(false);
      setEditingDept(null);
      await fetchDepartments();
      await fetchOverview();
    } catch (err) {
      alert(err.message || 'Error saving department');
    } finally {
      setDeptFormSubmitting(false);
    }
  };

  const handleDeleteDeptClick = (dept) => {
    setDeleteConfirm({
      isOpen: true,
      type: 'department',
      id: dept.id,
      name: dept.name,
      loading: false
    });
  };

  // Unified confirm delete execution
  const executeConfirmDelete = async () => {
    setDeleteConfirm(prev => ({ ...prev, loading: true }));
    try {
      let endpoint = '';
      if (deleteConfirm.type === 'teacher') {
        endpoint = `/api/admin/teachers/${deleteConfirm.id}`;
      } else if (deleteConfirm.type === 'student') {
        endpoint = `/api/admin/students/${deleteConfirm.id}`;
      } else if (deleteConfirm.type === 'department') {
        endpoint = `/api/admin/departments/${deleteConfirm.id}`;
      }

      const res = await fetch(endpoint, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete operation failed');

      setDeleteConfirm({ isOpen: false, type: null, id: null, name: '', loading: false });

      // Refresh appropriate views
      if (deleteConfirm.type === 'teacher') {
        if (selectedTeacher?.id === deleteConfirm.id) setSelectedTeacher(null);
        await fetchTeachers();
      } else if (deleteConfirm.type === 'student') {
        if (selectedStudent?.id === deleteConfirm.id) setSelectedStudent(null);
        await fetchStudents();
      } else if (deleteConfirm.type === 'department') {
        await fetchDepartments();
      }
      await fetchOverview();
    } catch (err) {
      alert(err.message || 'Error deleting item');
      setDeleteConfirm(prev => ({ ...prev, loading: false }));
    }
  };

  // ----------------------------------------------------
  // RENDER HELPERS
  // ----------------------------------------------------

  const renderStatusBadge = (isOnline) => {
    if (isOnline) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Online
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
        <span className="w-2 h-2 rounded-full bg-slate-400"></span>
        Offline
      </span>
    );
  };

  // Toggle department card collapse in Overview
  const toggleDeptCard = (deptId) => {
    setExpandedDeptCards(prev => ({ ...prev, [deptId]: !prev[deptId] }));
  };

  // Toggle department collapse in Student hierarchy view
  const toggleStudentDept = (deptName) => {
    setExpandedStudentDepts(prev => ({ ...prev, [deptName]: !prev[deptName] }));
  };

  const toggleStudentDiv = (divKey) => {
    setExpandedStudentDivs(prev => ({ ...prev, [divKey]: !prev[divKey] }));
  };

  // ----------------------------------------------------
  // MAIN RETURN
  // ----------------------------------------------------

  return (
    <div className="space-y-6 font-['Plus_Jakarta_Sans',sans-serif] text-slate-900 dark:text-slate-100 pb-12">
      
      {/* 1. ADMIN HEADER CARD */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs card-float transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Administrative Control Panel
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500">•</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Academic Administration & Audit
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Institutional Governance Portal
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Logged in as <strong className="text-slate-800 dark:text-slate-200">{currentUser?.name || 'Administrator'}</strong>
              {currentUser?.title ? ` (${currentUser.title})` : ' (Head of Department)'} • {currentUser?.department || 'Computer Engineering'}
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <button
              onClick={() => loadAllData(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition disabled:opacity-50 card-float"
              title="Refresh all administrative metrics"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>

            {activeTab === 'teachers' && (
              <button
                onClick={() => setIsAddTeacherOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition card-float"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Add Teacher</span>
              </button>
            )}

            {activeTab === 'departments' && (
              <button
                onClick={handleOpenAddDept}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition card-float"
              >
                <Plus className="w-4 h-4" />
                <span>+ New Department</span>
              </button>
            )}
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex items-center gap-2 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('teachers')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'teachers'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Teacher Management</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeTab === 'teachers' ? 'bg-indigo-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}>
              {teachers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('students')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'students'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Student Management</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeTab === 'students' ? 'bg-indigo-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}>
              {students.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('departments')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'departments'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Departments</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeTab === 'departments' ? 'bg-indigo-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}>
              {departmentList.length}
            </span>
          </button>
        </div>
      </div>

      {/* ERROR ALERT BANNER */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs text-red-800 dark:text-red-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            <span><strong>System Warning:</strong> {error}</span>
          </div>
          <button
            onClick={() => loadAllData(true)}
            className="px-3 py-1 bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800 rounded-lg font-bold text-red-900 dark:text-red-100 transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* INITIAL LOADING STATE */}
      {loading && !overviewData && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-16 text-center space-y-4">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Loading Administrative Telemetry...</h3>
            <p className="text-xs text-slate-400 mt-1">Synchronizing live faculty, student directories, and validation statistics</p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: DASHBOARD OVERVIEW                                                 */}
      {/* ========================================================================= */}
      {!loading && activeTab === 'overview' && (
        <div className="space-y-6">

          {/* 6 TOP SUMMARY CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            
            {/* 1. Total Students */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs card-float transition">
              <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Students</span>
                <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {stats.totalStudents}
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                Registered learners
              </p>
            </div>

            {/* 2. Total Teachers */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs card-float transition">
              <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Faculty</span>
                <Users className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {stats.totalTeachers}
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                Authorized professors
              </p>
            </div>

            {/* 3. Total Assignments */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs card-float transition">
              <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Assignments</span>
                <BookOpen className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {stats.totalAssignments}
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                Active coding tasks
              </p>
            </div>

            {/* 4. Total Submissions */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs card-float transition">
              <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Submissions</span>
                <FileCode className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {stats.totalSubmissions}
              </div>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                {stats.passRate}% pass rate
              </p>
            </div>

            {/* 5. Online Students */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs card-float transition">
              <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Live Students</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {stats.onlineStudents}
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                Active in last 2 mins
              </p>
            </div>

            {/* 6. Online Teachers */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs card-float transition">
              <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Live Faculty</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {stats.onlineTeachers}
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                Teachers connected
              </p>
            </div>

          </div>

          {/* DEPARTMENT-WISE EXPANDABLE SECTIONS */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs card-float transition">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Department Breakdown & Division Telemetry
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Click any department card to inspect Division A, B, and C real-time attendance and workload
                </p>
              </div>
              <span className="text-xs font-bold text-slate-400">
                {departmentMetrics.length} Departments
              </span>
            </div>

            <div className="space-y-3">
              {departmentMetrics.map((dept) => {
                const deptKey = dept.id || dept.code || dept.name;
                const isExpanded = Boolean(expandedDeptCards[deptKey] || expandedDeptCards[dept.id] || expandedDeptCards[dept.name]);
                return (
                  <div
                    key={deptKey}
                    className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden transition"
                  >
                    {/* Header Row */}
                    <div
                      onClick={() => toggleDeptCard(deptKey)}
                      className="p-4 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100/60 dark:hover:bg-slate-800/80 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-xs border border-indigo-100 dark:border-indigo-800">
                          {dept.code || dept.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            {dept.name}
                            <span className="text-[10px] font-mono text-slate-400">({dept.code})</span>
                          </h3>
                          <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            <span>{dept.totalStudents} Students</span>
                            <span>•</span>
                            <span>{dept.teacherCount} Faculty</span>
                            <span>•</span>
                            <span>{dept.assignmentCount} Assignments</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 self-end sm:self-auto">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            {dept.onlineStudents} Online
                          </span>
                          <span className="text-slate-300 dark:text-slate-700">|</span>
                          <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 text-[11px]">
                            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                            {dept.offlineStudents} Offline
                          </span>
                        </div>

                        <div className="w-6 h-6 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center text-slate-400">
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Department Content */}
                    {isExpanded && (
                      <div className="p-5 bg-white dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 space-y-5">
                        
                        {/* 1. ASSIGNED FACULTY / TEACHERS IN THIS DEPARTMENT */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                              <Users className="w-4 h-4 text-indigo-600" />
                              Assigned Faculty ({dept.teachers.length})
                            </h4>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setTeacherDeptFilter(dept.name);
                                setActiveTab('teachers');
                              }}
                              className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1"
                            >
                              <span>Manage in Directory</span>
                              <span>→</span>
                            </button>
                          </div>

                          {dept.teachers.length === 0 ? (
                            <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                              No faculty currently assigned to {dept.name}.
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {dept.teachers.map((teacher) => (
                                <div
                                  key={teacher.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTeacher(teacher);
                                  }}
                                  className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/50 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-xs transition cursor-pointer flex items-center justify-between gap-3 group"
                                  title="Click to inspect teacher dossier"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-extrabold text-xs shrink-0 border border-indigo-200 dark:border-indigo-800">
                                      {teacher.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                      <div className="font-extrabold text-xs text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition flex items-center gap-1.5">
                                        <span>{teacher.name}</span>
                                      </div>
                                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                        {teacher.title || 'Assistant Professor'}
                                      </div>
                                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                        {teacher.email}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                                    {renderStatusBadge(teacher.isOnline)}
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                      <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900">
                                        {teacher.assignmentCount || 0} Tasks
                                      </span>
                                      <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900">
                                        {teacher.submissionCount || 0} Subs
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* 2. DIVISION BREAKDOWN */}
                        <div className="space-y-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Division Cohorts & Telemetry
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {dept.divisionsList.map((div) => (
                              <div
                                key={div.division}
                                className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-extrabold text-xs text-indigo-700 dark:text-indigo-400">
                                    Division {div.division}
                                  </span>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
                                    {div.registered} Registered
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-center pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                                  <div className="p-1.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30">
                                    <div className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                                      {div.online}
                                    </div>
                                    <div className="text-[9px] uppercase font-bold text-emerald-700 dark:text-emerald-400">
                                      Online
                                    </div>
                                  </div>
                                  <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/60">
                                    <div className="text-xs font-black text-slate-600 dark:text-slate-300">
                                      {div.offline}
                                    </div>
                                    <div className="text-[9px] uppercase font-bold text-slate-500">
                                      Offline
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* TEACHER WORKLOAD SUMMARY TABLE */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden card-float transition">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-sky-600" />
                  Faculty Workload & Validation Activity Matrix
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Summary of assignments authored and student submissions processed per professor
                </p>
              </div>
              <span className="text-xs text-slate-500 font-semibold">
                {teacherWorkload.length} Faculty Members
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Teacher Name</th>
                    <th className="px-6 py-3.5">Department</th>
                    <th className="px-6 py-3.5 text-center">Assignments Created</th>
                    <th className="px-6 py-3.5 text-center">Submissions Received</th>
                    <th className="px-6 py-3.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {teacherWorkload.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-slate-400">
                        No faculty workload data recorded yet.
                      </td>
                    </tr>
                  ) : (
                    teacherWorkload.map((t, idx) => (
                      <tr key={t.teacherId || idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                        <td className="px-6 py-3.5">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {t.name}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {t.email}
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-100 dark:border-indigo-800 text-[11px]">
                            {t.department}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold">
                            {t.assignmentCount}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold">
                            {t.submissionCount}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          {renderStatusBadge(t.isOnline)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* RECENT SUBMISSIONS LIST */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden card-float transition">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-emerald-600" />
                  Recent Validation & Viva Submissions
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Latest evaluated code submissions across all departments
                </p>
              </div>
              <span className="text-xs text-slate-500 font-semibold">
                Showing {recentSubmissions.length} records
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Student</th>
                    <th className="px-6 py-3.5">Assignment</th>
                    <th className="px-6 py-3.5">Plagiarism (Tier 1)</th>
                    <th className="px-6 py-3.5">Quiz / Viva</th>
                    <th className="px-6 py-3.5">Date</th>
                    <th className="px-6 py-3.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {recentSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-slate-400">
                        No recent submissions found.
                      </td>
                    </tr>
                  ) : (
                    recentSubmissions.map((sub, idx) => (
                      <tr key={sub.id || idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                        <td className="px-6 py-3.5">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {sub.studentName}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {sub.rollNo || 'N/A'} • {sub.department || 'CE'}
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {sub.assignmentTitle}
                          </div>
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                            {sub.language || 'code'}
                          </span>
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-md font-black text-xs ${
                              sub.tier1Score < 35
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                : sub.tier1Score < 75
                                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                                : 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300'
                            }`}>
                              {sub.tier1Score ?? 0}%
                            </span>
                            <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                              {sub.tier1Verdict || 'Clean'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          <span className={`font-black text-xs ${
                            sub.quizPassed || (sub.quizScore ?? 0) >= 70
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-amber-600 dark:text-amber-400'
                          }`}>
                            {sub.quizScore !== undefined ? `${sub.quizScore}%` : 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-slate-400 text-[11px] whitespace-nowrap">
                          {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : 'Recent'}
                        </td>
                        <td className="px-6 py-3.5 text-right whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
                            {sub.status || 'Approved'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TEACHER MANAGEMENT                                                 */}
      {/* ========================================================================= */}
      {!loading && activeTab === 'teachers' && (
        <div className="space-y-6">

          {/* Filters & Search Toolbar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs card-float flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search teacher by name, email, title..."
                value={teacherSearch}
                onChange={(e) => setTeacherSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:border-indigo-600 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              {/* Department Filter */}
              <div className="flex items-center gap-1.5 text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={teacherDeptFilter}
                  onChange={(e) => setTeacherDeptFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:border-indigo-600 text-slate-900 dark:text-white"
                >
                  <option value="all">All Departments</option>
                  {departmentList.map(d => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <select
                value={teacherStatusFilter}
                onChange={(e) => setTeacherStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:border-indigo-600 text-slate-900 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="online">Online Only</option>
                <option value="offline">Offline Only</option>
              </select>

              <button
                onClick={() => setIsAddTeacherOpen(true)}
                className="flex items-center gap-1 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs whitespace-nowrap ml-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Teacher</span>
              </button>
            </div>
          </div>

          {/* Teacher Directory Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden card-float transition">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Faculty Members & Course Instructors
              </h3>
              <span className="text-xs text-slate-500 font-semibold">
                Showing {filteredTeachers.length} of {teachers.length} Faculty
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Name</th>
                    <th className="px-6 py-3.5">Designation</th>
                    <th className="px-6 py-3.5">Official Email</th>
                    <th className="px-6 py-3.5">Department</th>
                    <th className="px-6 py-3.5">Divisions</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {filteredTeachers.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="font-bold">No teachers match your search or filter.</p>
                        <p className="text-[11px] mt-0.5">Try adjusting your filters or click "+ New Teacher" to add faculty.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredTeachers.map((t) => (
                      <tr
                        key={t.id}
                        onClick={() => setSelectedTeacher(t)}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 cursor-pointer transition"
                      >
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            {t.name}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-100 dark:border-indigo-800 text-[11px]">
                            {t.title || 'Assistant Professor'}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-300">
                          {t.email}
                        </td>
                        <td className="px-6 py-4">
                          {t.department || 'Computer Engineering'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            {Array.isArray(t.divisions) && t.divisions.length > 0 ? (
                              t.divisions.map(div => (
                                <span key={div} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                                  Div {div}
                                </span>
                              ))
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-400">
                                Div A
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {renderStatusBadge(t.isOnline)}
                        </td>
                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedTeacher(t)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                              title="View teacher details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteTeacherClick(t)}
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                              title="Remove teacher"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: STUDENT MANAGEMENT                                                 */}
      {/* ========================================================================= */}
      {!loading && activeTab === 'students' && (
        <div className="space-y-6">

          {/* Student Controls & Filters */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs card-float flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search student by name, roll no, email..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:border-indigo-600 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              {/* Department Filter */}
              <select
                value={studentDeptFilter}
                onChange={(e) => setStudentDeptFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:border-indigo-600 text-slate-900 dark:text-white"
              >
                <option value="all">All Departments</option>
                {departmentList.map(d => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>

              {/* Division Filter */}
              <select
                value={studentDivFilter}
                onChange={(e) => setStudentDivFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:border-indigo-600 text-slate-900 dark:text-white"
              >
                <option value="all">All Divisions</option>
                <option value="A">Division A</option>
                <option value="B">Division B</option>
                <option value="C">Division C</option>
              </select>

              {/* Status Filter */}
              <select
                value={studentStatusFilter}
                onChange={(e) => setStudentStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:border-indigo-600 text-slate-900 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="online">Online Only</option>
                <option value="offline">Offline Only</option>
              </select>

              {/* View Switcher (Table vs Hierarchy) */}
              <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-800 ml-auto">
                <button
                  onClick={() => setStudentViewMode('table')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    studentViewMode === 'table'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Table
                </button>
                <button
                  onClick={() => setStudentViewMode('hierarchy')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    studentViewMode === 'hierarchy'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Hierarchy
                </button>
              </div>
            </div>
          </div>

          {/* VIEW MODE 1: HIERARCHY ACCORDION */}
          {studentViewMode === 'hierarchy' ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs card-float space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  Department Hierarchy Tree
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Expand departments and divisions to view cohort rosters
                </p>
              </div>

              <div className="space-y-3">
                {departmentMetrics.map((dept) => {
                  const isDeptExpanded = Boolean(expandedStudentDepts[dept.name]);
                  return (
                    <div key={dept.id} className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                      <div
                        onClick={() => toggleStudentDept(dept.name)}
                        className="p-4 bg-slate-50/80 dark:bg-slate-800/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 cursor-pointer flex items-center justify-between transition"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-black text-xs flex items-center justify-center">
                            {dept.code}
                          </span>
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {dept.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-3 text-xs font-semibold">
                            <span>Total: <strong className="text-slate-900 dark:text-white">{dept.totalStudents}</strong></span>
                            <span className="text-emerald-600 dark:text-emerald-400">Online: <strong>{dept.onlineStudents}</strong></span>
                            <span className="text-slate-400">Offline: <strong>{dept.offlineStudents}</strong></span>
                          </div>
                          {isDeptExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                        </div>
                      </div>

                      {isDeptExpanded && (
                        <div className="p-4 bg-white dark:bg-slate-900 space-y-3 border-t border-slate-200 dark:border-slate-800">
                          {dept.divisionsList.map((div) => {
                            const divKey = `${dept.name}_${div.division}`;
                            const isDivExpanded = Boolean(expandedStudentDivs[divKey]);
                            return (
                              <div key={div.division} className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
                                <div
                                  onClick={() => toggleStudentDiv(divKey)}
                                  className="p-3 bg-slate-50/50 dark:bg-slate-800/20 hover:bg-slate-100/40 cursor-pointer flex items-center justify-between text-xs transition"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-extrabold text-indigo-700 dark:text-indigo-400">
                                      Division {div.division}
                                    </span>
                                    <span className="text-slate-400 text-[11px]">
                                      ({div.registered} Students)
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-3">
                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                                      {div.online} Online
                                    </span>
                                    <span className="text-slate-400 text-[11px]">
                                      {div.offline} Offline
                                    </span>
                                    {isDivExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                                  </div>
                                </div>

                                {isDivExpanded && (
                                  <div className="p-3 bg-white dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800">
                                    {div.students.length === 0 ? (
                                      <p className="text-xs text-slate-400 italic py-2 text-center">No students currently registered in Division {div.division}.</p>
                                    ) : (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                        {div.students.map((st) => (
                                          <div
                                            key={st.id}
                                            onClick={() => setSelectedStudent(st)}
                                            className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-indigo-400 cursor-pointer flex items-center justify-between text-xs transition bg-slate-50/30 dark:bg-slate-900"
                                          >
                                            <div>
                                              <div className="font-bold text-slate-900 dark:text-white truncate max-w-[140px]">
                                                {st.name}
                                              </div>
                                              <div className="text-[10px] text-slate-400 font-mono">
                                                {st.rollNo || 'No Roll No'}
                                              </div>
                                            </div>
                                            {renderStatusBadge(st.isOnline)}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* VIEW MODE 2: PAGINATED STUDENT TABLE */
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden card-float transition">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Registered Students Roster
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Showing {(studentPage - 1) * studentsPerPage + 1} to {Math.min(studentPage * studentsPerPage, filteredStudents.length)} of {filteredStudents.length} entries
                  </p>
                </div>
                <span className="text-xs text-slate-500 font-semibold">
                  Page {studentPage} of {totalStudentPages}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="px-6 py-3.5">Student Name</th>
                      <th className="px-6 py-3.5">Roll No</th>
                      <th className="px-6 py-3.5">Email</th>
                      <th className="px-6 py-3.5">Department</th>
                      <th className="px-6 py-3.5">Division</th>
                      <th className="px-6 py-3.5 text-center">Submissions</th>
                      <th className="px-6 py-3.5 text-center">Quizzes</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {paginatedStudents.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="px-6 py-12 text-center text-slate-400">
                          <GraduationCap className="w-8 h-8 mx-auto mb-2 opacity-40" />
                          <p className="font-bold">No students found matching current criteria.</p>
                          <p className="text-[11px] mt-0.5">Try widening search terms or clearing division filters.</p>
                        </td>
                      </tr>
                    ) : (
                      paginatedStudents.map((st) => {
                        const studentSubs = submissions.filter(s => s.studentId === st.id);
                        const passedQuizzes = studentSubs.filter(s => s.quizPassed).length;

                        return (
                          <tr
                            key={st.id}
                            onClick={() => setSelectedStudent(st)}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 cursor-pointer transition"
                          >
                            <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                              {st.name}
                            </td>
                            <td className="px-6 py-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                              {st.rollNo || 'N/A'}
                            </td>
                            <td className="px-6 py-4 font-mono text-slate-500 dark:text-slate-400">
                              {st.email}
                            </td>
                            <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                              {st.department || 'Computer Engineering'}
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-bold text-[11px]">
                                Div {st.division || 'A'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-bold text-xs">
                                {studentSubs.length}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold text-xs border border-emerald-100 dark:border-emerald-800">
                                {passedQuizzes} Passed
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {renderStatusBadge(st.isOnline)}
                            </td>
                            <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setSelectedStudent(st)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                  title="View details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteStudentClick(st)}
                                  className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                                  title="Remove student"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION CONTROLS */}
              {totalStudentPages > 1 && (
                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="text-xs text-slate-400">
                    Showing Page {studentPage} of {totalStudentPages}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setStudentPage(p => Math.max(1, p - 1))}
                      disabled={studentPage === 1}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    {Array.from({ length: totalStudentPages }, (_, i) => i + 1).map(p => {
                      if (
                        p === 1 ||
                        p === totalStudentPages ||
                        (p >= studentPage - 1 && p <= studentPage + 1)
                      ) {
                        return (
                          <button
                            key={p}
                            onClick={() => setStudentPage(p)}
                            className={`w-8 h-8 rounded-xl text-xs font-bold transition ${
                              studentPage === p
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                          >
                            {p}
                          </button>
                        );
                      }
                      if (p === 2 || p === totalStudentPages - 1) {
                        return <span key={p} className="text-slate-400 px-1 text-xs">...</span>;
                      }
                      return null;
                    })}

                    <button
                      onClick={() => setStudentPage(p => Math.min(totalStudentPages, p + 1))}
                      disabled={studentPage === totalStudentPages}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: DEPARTMENTS                                                        */}
      {/* ========================================================================= */}
      {!loading && activeTab === 'departments' && (
        <div className="space-y-6">

          {/* Department Header & Add Action */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs card-float flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                Department & Academic Divisions Configuration
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Configure departments, short codes, and assigned student division sections (A/B/C/D)
              </p>
            </div>

            <button
              onClick={handleOpenAddDept}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition card-float self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Department</span>
            </button>
          </div>

          {/* Department Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {departmentMetrics.map((dept) => (
              <div
                key={dept.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs card-float transition space-y-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-black text-xs border border-indigo-100 dark:border-indigo-800">
                      {dept.code || 'DEPT'}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditDept(dept)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Edit Department"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteDeptClick(dept)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                        title="Delete Department"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    {dept.name}
                  </h3>

                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-2">
                    <span>{dept.totalStudents} Students</span>
                    <span>•</span>
                    <span>{dept.teacherCount} Faculty</span>
                  </div>

                  {/* Divisions Section */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                      Active Divisions
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(dept.divisions && dept.divisions.length > 0 ? dept.divisions : ['A', 'B']).map((div) => {
                        const divName = typeof div === 'string' ? div : (div?.division || 'A');
                        return (
                          <span
                            key={divName}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300"
                          >
                            Division {divName}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span>Attendance:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {dept.onlineStudents} Online now
                  </span>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD TEACHER                                                      */}
      {/* ========================================================================= */}
      {isAddTeacherOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h4 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-indigo-600" />
                  Add Authorized Faculty Member
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Register a professor or lab instructor with portal privileges
                </p>
              </div>
              <button
                onClick={() => setIsAddTeacherOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTeacher} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Teacher Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Prof. Priya Kulkarni"
                  value={newTeacherName}
                  onChange={(e) => setNewTeacherName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-600 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Official Institutional Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="priya.kulkarni@jspm.edu"
                  value={newTeacherEmail}
                  onChange={(e) => setNewTeacherEmail(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-600 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Designation / Title
                  </label>
                  <select
                    value={newTeacherTitle}
                    onChange={(e) => setNewTeacherTitle(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-600 text-slate-900 dark:text-white"
                  >
                    <option value="Assistant Professor">Assistant Professor</option>
                    <option value="Associate Professor">Associate Professor</option>
                    <option value="Professor">Professor</option>
                    <option value="Head of Department">Head of Department</option>
                    <option value="Project Guide & Lab Incharge">Project Guide & Lab Incharge</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Department
                  </label>
                  <select
                    value={newTeacherDept}
                    onChange={(e) => setNewTeacherDept(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-600 text-slate-900 dark:text-white"
                  >
                    {departmentList.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Division Multi-Select Toggles */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Assigned Divisions
                </label>
                <div className="flex items-center gap-2">
                  {['A', 'B', 'C', 'D'].map(div => {
                    const isChecked = newTeacherDivisions.includes(div);
                    return (
                      <button
                        type="button"
                        key={div}
                        onClick={() => {
                          if (isChecked) {
                            if (newTeacherDivisions.length > 1) {
                              setNewTeacherDivisions(newTeacherDivisions.filter(d => d !== div));
                            }
                          } else {
                            setNewTeacherDivisions([...newTeacherDivisions, div]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg border font-bold text-xs transition ${
                          isChecked
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        Div {div}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Initial Access Password
                </label>
                <input
                  type="text"
                  value={newTeacherPassword}
                  onChange={(e) => setNewTeacherPassword(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-600 font-mono text-slate-900 dark:text-white"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  The faculty member can update their password after logging in.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddTeacherOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={teacherFormSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition shadow-xs disabled:opacity-50"
                >
                  {teacherFormSubmitting ? 'Registering...' : 'Save Faculty'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: TEACHER DETAIL VIEW                                              */}
      {/* ========================================================================= */}
      {selectedTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-xl w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-black text-sm flex items-center justify-center border border-indigo-100 dark:border-indigo-800">
                  {selectedTeacher.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                    {selectedTeacher.name}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {selectedTeacher.title || 'Faculty Member'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTeacher(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Official Email</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedTeacher.email}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Department</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{selectedTeacher.department || 'Computer Engineering'}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Divisions Assigned</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {Array.isArray(selectedTeacher.divisions) ? selectedTeacher.divisions.join(', ') : 'A'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Current Status</span>
                {renderStatusBadge(selectedTeacher.isOnline)}
              </div>
            </div>

            {/* Assignments authored by this teacher */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Assignments Authored
              </span>
              <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                {assignments.filter(a => a.teacherId === selectedTeacher.id).length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">No assignments currently authored by this faculty member.</p>
                ) : (
                  assignments.filter(a => a.teacherId === selectedTeacher.id).map(asg => (
                    <div
                      key={asg.id}
                      className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white block">{asg.title}</span>
                        <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400">{asg.code}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-semibold">
                        Passing: {asg.minQuizScore}%
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  setSelectedTeacher(null);
                  handleDeleteTeacherClick(selectedTeacher);
                }}
                className="px-3.5 py-2 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 font-bold text-xs flex items-center gap-1.5 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Teacher</span>
              </button>

              <button
                onClick={() => setSelectedTeacher(null)}
                className="px-5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: STUDENT DETAIL & SUBMISSION INSPECTOR                            */}
      {/* ========================================================================= */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-black text-sm flex items-center justify-center border border-indigo-100 dark:border-indigo-800">
                  {selectedStudent.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                    {selectedStudent.name}
                  </h4>
                  <p className="text-xs text-slate-500 font-mono">
                    Roll: {selectedStudent.rollNo || 'N/A'} • Div {selectedStudent.division || 'A'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Email</span>
                <span className="font-mono text-slate-800 dark:text-slate-200 truncate block">{selectedStudent.email}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Department</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{selectedStudent.department || 'CE'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Division</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">Div {selectedStudent.division || 'A'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Status</span>
                {renderStatusBadge(selectedStudent.isOnline)}
              </div>
            </div>

            {/* Submissions & Quizzes Attempted by Student */}
            <div>
              <h5 className="font-extrabold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2.5 flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-indigo-600" />
                Validated Submissions & Quiz Record
              </h5>

              {submissions.filter(s => s.studentId === selectedStudent.id).length === 0 ? (
                <div className="p-8 border border-slate-100 dark:border-slate-800 rounded-2xl text-center text-slate-400 text-xs">
                  No validated assignments recorded for this student yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {submissions.filter(s => s.studentId === selectedStudent.id).map(sub => (
                    <div
                      key={sub.id}
                      className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white block">
                            {sub.assignmentTitle}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : 'N/A'}
                          </span>
                        </div>

                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          sub.quizPassed
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                        }`}>
                          {sub.quizPassed ? 'Quiz Passed & Certified' : 'Quiz Pending'}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-[11px] pt-1">
                        <div>
                          <span className="text-slate-400">Plagiarism Score:</span>{' '}
                          <strong className={sub.tier1Score < 35 ? 'text-emerald-600' : 'text-amber-600'}>
                            {sub.tier1Score ?? 0}%
                          </strong>
                        </div>
                        <div>
                          <span className="text-slate-400">Quiz Viva Score:</span>{' '}
                          <strong className="text-indigo-600 dark:text-indigo-400">
                            {sub.quizScore !== undefined ? `${sub.quizScore}%` : 'N/A'}
                          </strong>
                        </div>
                        <div>
                          <span className="text-slate-400">GitHub Commit:</span>{' '}
                          <strong className="font-mono text-slate-700 dark:text-slate-300 truncate block">
                            {sub.githubCommitSha ? sub.githubCommitSha.substring(0, 7) : 'Verified'}
                          </strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  setSelectedStudent(null);
                  handleDeleteStudentClick(selectedStudent);
                }}
                className="px-3.5 py-2 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 font-bold text-xs flex items-center gap-1.5 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Student Account</span>
              </button>

              <button
                onClick={() => setSelectedStudent(null)}
                className="px-5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: ADD / EDIT DEPARTMENT                                            */}
      {/* ========================================================================= */}
      {isAddDeptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                {editingDept ? 'Edit Academic Department' : 'Create New Department'}
              </h4>
              <button
                onClick={() => setIsAddDeptOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDepartment} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Department Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Artificial Intelligence & Data Science"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-600 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Short Code (e.g. AI-DS, CE, ENTC)
                </label>
                <input
                  type="text"
                  placeholder="e.g. AI-DS"
                  value={deptCode}
                  onChange={(e) => setDeptCode(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-600 uppercase font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Divisions in this Department
                </label>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {deptDivisions.map(div => (
                    <span
                      key={div}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-bold flex items-center gap-1.5"
                    >
                      Div {div}
                      {deptDivisions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setDeptDivisions(deptDivisions.filter(d => d !== div))}
                          className="hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  {['A', 'B', 'C', 'D', 'E'].map(candidate => (
                    <button
                      key={candidate}
                      type="button"
                      disabled={deptDivisions.includes(candidate)}
                      onClick={() => setDeptDivisions([...deptDivisions, candidate])}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-500 disabled:opacity-30 font-bold text-[11px]"
                    >
                      + {candidate}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddDeptOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deptFormSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition shadow-xs disabled:opacity-50"
                >
                  {deptFormSubmitting ? 'Saving...' : editingDept ? 'Save Changes' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: DELETE CONFIRMATION DIALOG                                       */}
      {/* ========================================================================= */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/60 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Confirm Deletion
                </h4>
                <p className="text-xs text-slate-500">
                  This action cannot be undone
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to permanently remove <strong>{deleteConfirm.name}</strong> from the institutional directory?
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={deleteConfirm.loading}
                onClick={() => setDeleteConfirm({ isOpen: false, type: null, id: null, name: '', loading: false })}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteConfirm.loading}
                onClick={executeConfirmDelete}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                {deleteConfirm.loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Delete Permanently</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
