import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Camera,
  Save,
  User,
  Mail,
  BadgeCheck,
  GraduationCap,
  UserCheck,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function ProfileModal({ isOpen, onClose, currentUser, onProfileUpdate }) {
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [department, setDepartment] = useState('');
  const [title, setTitle] = useState('');
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success'|'error', message }
  const fileInputRef = useRef(null);

  // Sync form fields whenever modal opens or user changes
  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setRollNo(currentUser.rollNo || '');
      setDepartment(currentUser.department || '');
      setTitle(currentUser.title || '');
      setPhotoPreview(currentUser.photoUrl ? `${currentUser.photoUrl}?t=${Date.now()}` : null);
      setPhotoFile(null);
      setStatus(null);
    }
  }, [currentUser, isOpen]);

  if (!isOpen || !currentUser) return null;

  const getRoleInfo = (role) => {
    switch (role) {
      case 'admin':
        return { icon: <ShieldAlert className="w-4 h-4 text-amber-500" />, label: 'Admin (HOD)', color: 'text-amber-600 dark:text-amber-400' };
      case 'teacher':
        return { icon: <UserCheck className="w-4 h-4 text-indigo-500" />, label: 'Faculty / Teacher', color: 'text-indigo-600 dark:text-indigo-400' };
      default:
        return { icon: <GraduationCap className="w-4 h-4 text-blue-500" />, label: 'Student', color: 'text-blue-600 dark:text-blue-400' };
    }
  };

  const roleInfo = getRoleInfo(currentUser.role);

  const getInitials = (n) =>
    (n || 'U')
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const token = localStorage.getItem('ai_validate_token');
      const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

      // 1. Upload photo if a new one was chosen
      let updatedPhotoUrl = currentUser.photoUrl || null;
      if (photoFile) {
        const formData = new FormData();
        formData.append('photo', photoFile);
        const photoRes = await fetch(`/api/profile/photo/${currentUser.id}`, {
          method: 'POST',
          headers: { ...authHeaders },
          body: formData
        });
        if (!photoRes.ok) {
          const errData = await photoRes.json().catch(() => ({}));
          throw new Error(errData.error || 'Photo upload failed');
        }
        const photoData = await photoRes.json();
        updatedPhotoUrl = photoData.photoUrl;
      }

      // 2. Update profile text fields
      const updateRes = await fetch('/api/profile/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          userId: currentUser.id,
          name: name.trim(),
          rollNo: rollNo.trim(),
          department: department.trim(),
          title: title.trim()
        })
      });
      if (!updateRes.ok) {
        const errData = await updateRes.json().catch(() => ({}));
        throw new Error(errData.error || 'Profile update failed');
      }
      const updateData = await updateRes.json();

      // 3. Notify parent with merged user data
      const mergedUser = { ...updateData.user, photoUrl: updatedPhotoUrl };
      onProfileUpdate(mergedUser);
      setStatus({ type: 'success', message: 'Profile updated successfully!' });

      setTimeout(() => {
        setStatus(null);
        onClose();
      }, 1200);
    } catch (err) {
      setStatus({ type: 'error', message: err.message || 'Something went wrong' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-fade-in">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Edit Profile</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative group">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover border-4 border-indigo-200 dark:border-indigo-800 shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-indigo-100 dark:bg-indigo-950 border-4 border-indigo-200 dark:border-indigo-800 flex items-center justify-center shadow-lg">
                  <span className="text-2xl font-black text-indigo-600 dark:text-indigo-300">
                    {getInitials(name)}
                  </span>
                </div>
              )}
              {/* Upload overlay */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                title="Change photo"
              >
                <Camera className="w-6 h-6 text-white" />
              </button>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1"
            >
              <Camera className="w-3.5 h-3.5" />
              Change Photo
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>

          {/* Role badge (read-only) */}
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            {roleInfo.icon}
            <span className={`text-xs font-bold ${roleInfo.color}`}>{roleInfo.label}</span>
            <BadgeCheck className="w-3.5 h-3.5 text-slate-400 ml-auto" />
          </div>

          {/* Email (read-only) */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Mail className="w-3 h-3" /> Email
            </label>
            <div className="px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400 font-mono">
              {currentUser.email}
            </div>
          </div>

          {/* Name */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition"
              placeholder="Your full name"
            />
          </div>

          {/* Roll No — Students only */}
          {currentUser.role === 'student' && (
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                Roll Number
              </label>
              <input
                type="text"
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition font-mono"
                placeholder="e.g. CE2025-01"
              />
            </div>
          )}

          {/* Department */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
              Department
            </label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition"
              placeholder="e.g. Computer Engineering"
            />
          </div>

          {/* Title — Teachers / Admins only */}
          {(currentUser.role === 'teacher' || currentUser.role === 'admin') && (
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                Designation / Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition"
                placeholder="e.g. Assistant Professor"
              />
            </div>
          )}

          {/* Status message */}
          {status && (
            <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold ${
              status.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
            }`}>
              {status.type === 'success'
                ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                : <AlertCircle className="w-4 h-4 shrink-0" />}
              {status.message}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-bold flex items-center justify-center gap-2 transition shadow-md shadow-indigo-500/20"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
            ) : (
              <><Save className="w-4 h-4" /> Save Changes</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
