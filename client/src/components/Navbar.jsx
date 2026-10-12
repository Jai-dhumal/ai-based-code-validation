import React, { useState, useEffect } from 'react';
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
  Bell
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

  useEffect(() => {
    if (!currentUser?.id) return;

    const fetchNotifications = async () => {
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
          if (typeof data.unreadCount === 'number') {
            setUnreadCount(data.unreadCount);
          } else if (Array.isArray(data)) {
            const count = data.filter((n) => !n.isRead && !n.read).length;
            setUnreadCount(count);
          } else if (data && typeof data === 'object' && Array.isArray(data.notifications)) {
            const count = data.notifications.filter((n) => !n.isRead && !n.read).length;
            setUnreadCount(count);
          }
        }
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
      }
    };

    fetchNotifications();
  }, [currentUser?.id]);

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
          label: 'Faculty / Teacher',
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

  const roleInfo = getRoleBadge(currentUser?.role);

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & College Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 animate-float">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-base text-slate-900 dark:text-white tracking-tight">
                  JSPM BSIOTR
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800">
                  AI Code Validator
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                Dept. of Computer Engineering • AY 2025-26
              </p>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center space-x-1.5 sm:space-x-3">
            
            {/* System Status — hide on xs, show from sm */}
            {systemStatus && (
              <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <span className={`w-2 h-2 rounded-full ${systemStatus.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                  {systemStatus.status === 'online' ? 'System Online' : 'Offline'}
                </span>
              </div>
            )}

            {/* Notification Bell */}
            <div className="relative">
              <button
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-all relative card-float"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-extrabold text-white bg-rose-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            </div>

            {/* Settings Button */}
            <button
              onClick={onOpenSettings}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              title="Platform Settings"
            >
              <Settings className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            </button>

            {/* Theme Toggle Button (Light / Dark) */}
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition card-float"
              title={isDark ? "Switch to Light Theme" : "Switch to Dark Theme"}
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400 animate-spin-slow" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600" />
              )}
            </button>

            {/* Clickable User Profile Pill */}
            <button
              onClick={onOpenProfile}
              className="group flex items-center space-x-2.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-indigo-50 dark:bg-slate-800/80 dark:hover:bg-indigo-950/40 border border-slate-200 hover:border-indigo-300 dark:border-slate-700/80 dark:hover:border-indigo-700 card-float transition-all"
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
                <div className="font-bold text-xs text-slate-800 dark:text-slate-200">{currentUser?.name}</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  {currentUser?.rollNo || currentUser?.department}
                </div>
              </div>
              <span className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg border ${roleInfo.style}`}>
                {roleInfo.icon}
                <span className="hidden sm:inline">{roleInfo.label}</span>
              </span>
            </button>

            {/* Logout Button */}
            <button
              onClick={onLogout}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60 text-xs font-semibold transition card-float"
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
