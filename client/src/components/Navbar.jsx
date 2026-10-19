import React, { useState, useEffect, useRef } from 'react';
import { 
  GraduationCap, 
  UserCheck, 
  ShieldAlert,
  LogOut,
  Sparkles,
  BookOpen,
  Sun,
  Moon,
  BarChart3,
  Pencil,
  Settings,
  Bell,
  CheckCircle2,
  XCircle,
  Check,
  Inbox,
  Clock
} from 'lucide-react';

export default function Navbar({ 
  currentUser, 
  onLogout,
  onOpenSettings,
  onOpenProfile,
  isDark,
  onToggleTheme,
  systemStatus
}) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isLoadingNotifs, setIsLoadingNotifs] = useState(false);
  const notifRef = useRef(null);

  const fetchNotifications = async () => {
    if (!currentUser?.id) return;
    try {
      const token = localStorage.getItem('ai_validate_token');
      const res = await fetch(`/api/notifications/${currentUser.id}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setNotifications(data);
          setUnreadCount(data.filter((n) => !n.isRead && !n.read).length);
        } else if (data && typeof data === 'object') {
          const list = Array.isArray(data.notifications) ? data.notifications : [];
          setNotifications(list);
          const count = typeof data.unreadCount === 'number'
            ? data.unreadCount
            : list.filter((n) => !n.isRead && !n.read).length;
          setUnreadCount(count);
        }
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [currentUser?.id]);

  // Close notifications on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsNotifOpen(false);
      }
    }
    if (isNotifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNotifOpen]);

  const toggleNotifications = () => {
    if (!isNotifOpen) {
      fetchNotifications();
    }
    setIsNotifOpen(prev => !prev);
  };

  const markAsRead = async (notifId) => {
    try {
      const token = localStorage.getItem('ai_validate_token');
      await fetch(`/api/notifications/${notifId}/read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const markAllAsRead = async () => {
    if (!currentUser?.id) return;
    try {
      const token = localStorage.getItem('ai_validate_token');
      await fetch(`/api/notifications/read-all/${currentUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications read:', err);
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return {
          icon: <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />,
          label: 'Admin (HOD)',
          style: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
        };
      case 'teacher':
        return {
          icon: <UserCheck className="w-3.5 h-3.5 text-indigo-500" />,
          label: 'Faculty',
          style: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800'
        };
      default:
        return {
          icon: <GraduationCap className="w-3.5 h-3.5 text-blue-500" />,
          label: 'Student',
          style: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800'
        };
    }
  };

  const getInitials = (name) =>
    (name || 'U')
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const roleInfo = getRoleBadge(currentUser?.role) || {
    icon: <GraduationCap className="w-3.5 h-3.5 text-blue-500" />,
    label: 'Student',
    style: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800'
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & College Title */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5 sm:space-x-2 truncate">
                <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white tracking-tight truncate">
                  JSPM BSIOTR
                </span>
                <span className="hidden min-[480px]:inline-block text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800 shrink-0">
                  AI Code Validator
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block truncate">
                Dept. of Computer Engineering • AY 2025-26
              </p>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
            
            {/* System Status — hide on small mobile */}
            {systemStatus && (
              <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <span className={`w-2 h-2 rounded-full ${systemStatus.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                  {systemStatus.status === 'online' ? 'Online' : 'Offline'}
                </span>
              </div>
            )}

            {/* Notification Bell with Dropdown Popover */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={toggleNotifications}
                className={`p-2 rounded-xl transition-all relative card-float ${
                  isNotifOpen 
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' 
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}
                title="Notifications"
                aria-label="View notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-extrabold text-white bg-rose-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popover Drawer */}
              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* Header */}
                  <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                        Notifications
                      </span>
                      {unreadCount > 0 && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        Mark all read
                      </button>
                    )}
                  </div>

                  {/* Notification List */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/50">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 dark:text-slate-500">
                        <Inbox className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-xs font-semibold">No notifications yet</p>
                        <p className="text-[11px] mt-0.5">You're all caught up!</p>
                      </div>
                    ) : (
                      notifications.map((notif) => {
                        const isRead = notif.read || notif.isRead;
                        return (
                          <div
                            key={notif.id}
                            onClick={() => !isRead && markAsRead(notif.id)}
                            className={`p-3.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-700/40 cursor-pointer flex items-start space-x-3 ${
                              !isRead ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                            }`}
                          >
                            <div className="mt-0.5 shrink-0">
                              {notif.type === 'quiz_approved' ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              ) : notif.type === 'quiz_rejected' ? (
                                <XCircle className="w-4 h-4 text-rose-500" />
                              ) : (
                                <Bell className="w-4 h-4 text-indigo-500" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <p className={`text-xs font-bold truncate ${!isRead ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                                  {notif.title || 'Notification'}
                                </p>
                                {!isRead && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 shrink-0" />
                                )}
                              </div>
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                                {notif.message}
                              </p>
                              {notif.createdAt && (
                                <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1 font-mono">
                                  <Clock className="w-2.5 h-2.5" />
                                  {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Settings Button */}
            <button
              onClick={onOpenSettings}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-slate-600 dark:text-slate-400"
              title="Platform Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Theme Toggle Button (Light / Dark) */}
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition card-float"
              title={isDark ? "Switch to Light Theme" : "Switch to Dark Theme"}
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600" />
              )}
            </button>

            {/* Clickable User Profile Pill */}
            <button
              onClick={onOpenProfile}
              className="group flex items-center space-x-1.5 sm:space-x-2.5 p-1 sm:px-3 sm:py-1.5 rounded-xl bg-slate-50 hover:bg-indigo-50 dark:bg-slate-800/80 dark:hover:bg-indigo-950/40 border border-slate-200 hover:border-indigo-300 dark:border-slate-700/80 dark:hover:border-indigo-700 card-float transition-all shrink-0"
              title="Edit Profile"
            >
              {/* Avatar: photo or initials */}
              <div className="relative shrink-0">
                {currentUser?.photoUrl ? (
                  <img
                    src={`${currentUser.photoUrl}?t=${Date.now()}`}
                    alt="avatar"
                    className="w-7 h-7 rounded-full object-cover border-2 border-indigo-200 dark:border-indigo-700"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900 border-2 border-indigo-200 dark:border-indigo-700 flex items-center justify-center">
                    <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-300">
                      {getInitials(currentUser?.name)}
                    </span>
                  </div>
                )}
                {/* Online status indicator */}
                {currentUser?.isOnline && (
                  <span
                    className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full shadow-xs"
                    title="Online"
                  />
                )}
                {/* Edit pencil badge on hover */}
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-indigo-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                  <Pencil className="w-2 h-2" />
                </div>
              </div>

              <div className="text-right hidden sm:block">
                <div className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate max-w-[100px]">{currentUser?.name}</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate max-w-[100px]">
                  {currentUser?.rollNo || currentUser?.department}
                </div>
              </div>
              <span className={`hidden sm:flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg border ${roleInfo.style}`}>
                {roleInfo.icon}
                <span>{roleInfo.label}</span>
              </span>
            </button>

            {/* Logout Button — compact icon on mobile, full text on sm+ */}
            <button
              onClick={onLogout}
              className="flex items-center space-x-1 p-2 sm:px-3 sm:py-1.5 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60 text-xs font-semibold transition card-float shrink-0"
              title="Log Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Log Out</span>
            </button>

          </div>
        </div>
      </div>
    </header>
  );
}
