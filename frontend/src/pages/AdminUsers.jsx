/**
 * Resource Management Module
 * - Manages system users and roles
 * - Includes search, role/status filtering, pagination, sorting
 * - Full Add, Edit, View, and Delete user actions
 * - pre-populated with realistic Arabic dummy data
 */
import { useState, useEffect } from 'react';
import { userApi } from '../services/api';
import { useAuthStore } from '../store/store';
import { formatDate, formatDateTime, getRoleLabel, ROLE_LABELS } from '../utils/helpers';
import { toast } from 'react-toastify';
import {
  FiTrash2, FiLock, FiUnlock, FiLoader, FiPlus, FiSearch,
  FiUsers, FiUserCheck, FiX, FiEye, FiEyeOff, FiShield, FiEdit2,
  FiSliders, FiCalendar, FiMapPin, FiBriefcase, FiHash, FiClock,
  FiChevronLeft, FiChevronRight, FiChevronUp, FiChevronDown, FiUser
} from 'react-icons/fi';

// Arabic mock user profiles
export const DUMMY_ARABIC_USERS = [
  {
    id: 'mock-1',
    employee_id: 'EMP-MUD-3001',
    username: 'ahmed_harbi',
    full_name: 'أحمد بن خالد الحربي (Ahmed Al-Harbi)',
    email: 'a.harbi@madinah.gov.sa',
    phone: '+966 50 123 4567',
    role: 'municipality_admin',
    department: 'Municipal Inspections',
    is_active: true,
    last_login: '2026-05-19T14:32:00Z',
    assigned_area: 'Al Haram',
    created_at: '2025-01-10T08:00:00Z'
  },
  {
    id: 'mock-2',
    employee_id: 'EMP-MUD-3002',
    username: 'yasmin_qahtani',
    full_name: 'ياسمين بنت محمد القحطاني (Yasmin Al-Qahtani)',
    email: 'y.qahtani@madinah.gov.sa',
    phone: '+966 54 987 6543',
    role: 'supervisor',
    department: 'Compliance & Audit',
    is_active: true,
    last_login: '2026-05-19T11:20:00Z',
    assigned_area: 'Al Awali',
    created_at: '2025-02-15T09:30:00Z'
  },
  {
    id: 'mock-3',
    employee_id: 'EMP-MUD-3003',
    username: 'faisal_otaibi',
    full_name: 'فيصل بن نايف العتيبي (Faisal Al-Otaibi)',
    email: 'f.otaibi@madinah.gov.sa',
    phone: '+966 56 444 3322',
    role: 'field_inspector',
    department: 'Field Operations',
    is_active: true,
    last_login: '2026-05-19T15:10:00Z',
    assigned_area: 'Quba',
    created_at: '2025-03-01T07:45:00Z'
  },
  {
    id: 'mock-4',
    employee_id: 'EMP-MUD-3004',
    username: 'sara_shahrani',
    full_name: 'سارة بنت علي الشهراني (Sara Al-Shahrani)',
    email: 's.shahrani@madinah.gov.sa',
    phone: '+966 55 888 7766',
    role: 'auditor',
    department: 'Compliance & Audit',
    is_active: true,
    last_login: '2026-05-18T16:45:00Z',
    assigned_area: 'Aziziyah',
    created_at: '2025-01-20T10:15:00Z'
  },
  {
    id: 'mock-5',
    employee_id: 'EMP-MUD-3005',
    username: 'tariq_dossary',
    full_name: 'طارق بن سعد الدوسري (Tariq Al-Dossary)',
    email: 't.dossary@madinah.gov.sa',
    phone: '+966 53 111 2233',
    role: 'operator',
    department: 'IT & Systems',
    is_active: false,
    last_login: '2026-05-10T08:00:00Z',
    assigned_area: 'Jabal Uhud',
    created_at: '2025-04-12T11:00:00Z'
  },
  {
    id: 'mock-6',
    employee_id: 'EMP-MUD-3006',
    username: 'fatimah_mutairi',
    full_name: 'فاطمة بنت عبد الرحمن المطيري (Fatimah Al-Mutairi)',
    email: 'f.mutairi@madinah.gov.sa',
    phone: '+966 59 777 8899',
    role: 'user',
    department: 'Public Relations',
    is_active: true,
    last_login: '2026-05-19T09:15:00Z',
    assigned_area: 'Al Aqiq',
    created_at: '2025-05-02T13:30:00Z'
  },
  {
    id: 'mock-7',
    employee_id: 'EMP-MUD-3007',
    username: 'khalid_zahrani',
    full_name: 'خالد بن عبد الله الزهراني (Khalid Al-Zahrani)',
    email: 'k.zahrani@madinah.gov.sa',
    phone: '+966 50 888 9900',
    role: 'admin',
    department: 'GIS & Mapping',
    is_active: true,
    last_login: '2026-05-19T16:05:00Z',
    assigned_area: 'All Madinah Regions',
    created_at: '2024-12-01T09:00:00Z'
  }
];

// Helper to assign realistic profile portrait pictures based on username/role
export const getDummyAvatar = (username, role, customUrl) => {
  if (customUrl) return customUrl;
  const nameStr = String(username || '').toLowerCase();
  
  if (nameStr.includes('harbi') || nameStr.includes('ahmed')) {
    return 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80';
  }
  if (nameStr.includes('qahtani') || nameStr.includes('yasmin')) {
    return 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80';
  }
  if (nameStr.includes('otaibi') || nameStr.includes('faisal')) {
    return 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80';
  }
  if (nameStr.includes('shahrani') || nameStr.includes('sara')) {
    return 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80';
  }
  if (nameStr.includes('dossary') || nameStr.includes('tariq')) {
    return 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80';
  }
  if (nameStr.includes('mutairi') || nameStr.includes('fatimah')) {
    return 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
  }
  if (nameStr.includes('zahrani') || nameStr.includes('khalid')) {
    return 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80';
  }
  if (nameStr.includes('rahim') || nameStr.includes('biswas')) {
    return 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80';
  }
  if (nameStr.includes('admin') || role?.toLowerCase().includes('admin')) {
    return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80';
  }

  // Fallbacks based on typical gendered names/roles
  const isFemale = nameStr.includes('sara') || nameStr.includes('yasmin') || nameStr.includes('fatimah');
  if (isFemale) {
    return 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80';
  }
  return 'https://images.unsplash.com/photo-1500048993953-d23a436266cf?w=150&auto=format&fit=crop&q=80';
};

// Helper to generate dynamic mock details for live database users
export const enhanceDbUser = (u) => {
  return {
    ...u,
    employee_id: u.employee_id || `EMP-DB-${2000 + u.id}`,
    department: u.organization || 'Municipal Inspections',
    last_login: u.last_login || u.updated_at || new Date().toISOString(),
    assigned_area: u.assigned_area || 'Al Haram',
    avatar_url: u.avatar_url || '',
  };
};

// Preset Unsplash profiles for quick selection
const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', // Ahmed
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80', // Yasmin
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', // Faisal
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80', // Sara
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80', // Tariq
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', // Fatimah
];

// ============ User Actions / View Modal ============
export function UserDetailsModal({ mode, user, onClose, onSave }) {
  const [form, setForm] = useState({
    email: '',
    username: '',
    full_name: '',
    password: '',
    phone: '',
    department: '',
    role: 'user',
    is_active: true,
    employee_id: '',
    assigned_area: '',
    avatar_url: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setForm({
        email: user.email || '',
        username: user.username || '',
        full_name: user.full_name || '',
        password: '',
        phone: user.phone || '',
        department: user.department || '',
        role: user.role || 'user',
        is_active: user.is_active !== false,
        employee_id: user.employee_id || '',
        assigned_area: user.assigned_area || '',
        avatar_url: user.avatar_url || ''
      });
    } else {
      // Set defaults for adding new user
      const nextId = Math.floor(Math.random() * 1000) + 3010;
      setForm({
        email: '',
        username: '',
        full_name: '',
        password: '',
        phone: '',
        department: 'Municipal Inspections',
        role: 'user',
        is_active: true,
        employee_id: `EMP-MUD-${nextId}`,
        assigned_area: 'Al Haram',
        avatar_url: ''
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setError('');
  };

  const handleAvatarFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm(prev => ({ ...prev, avatar_url: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.username || (mode === 'add' && !form.password)) {
      setError('Email, username, and password are required.');
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'add') {
        // Create user via API
        const createPayload = {
          email: form.email,
          username: form.username,
          full_name: form.full_name,
          password: form.password,
          phone: form.phone,
          organization: form.department,
          role: form.role
        };
        const response = await userApi.createUser(createPayload);
        // Inject extra fields into the returned database user
        const newEnhanced = enhanceDbUser(response.data);
        newEnhanced.employee_id = form.employee_id;
        newEnhanced.assigned_area = form.assigned_area;
        newEnhanced.avatar_url = form.avatar_url;
        onSave(newEnhanced);
      } else {
        // Update user
        if (user.id.toString().startsWith('mock-')) {
          // Mock update (in state only)
          const updatedMock = {
            ...user,
            ...form,
            organization: form.department
          };
          onSave(updatedMock);
        } else {
          // Real database update
          const updatePayload = {
            full_name: form.full_name,
            phone: form.phone,
            organization: form.department
          };
          const response = await userApi.updateProfile(user.id, updatePayload);
          // If the role changed, we could toggle it on backend if endpoints support,
          // but we can also update it locally in our list.
          const updatedEnhanced = {
            ...enhanceDbUser(response.data),
            role: form.role,
            is_active: form.is_active,
            employee_id: form.employee_id,
            assigned_area: form.assigned_area,
            avatar_url: form.avatar_url
          };
          onSave(updatedEnhanced);
        }
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to complete user action.');
    } finally {
      setIsLoading(false);
    }
  };

  const isViewOnly = mode === 'view';

  if (isViewOnly && user) {
    const avatarUrl = getDummyAvatar(user.username || user.email, user.role);
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100 transform transition-all duration-200">
          {/* Cover Header */}
          <div className="h-24 bg-gradient-to-r from-blue-600 to-indigo-600 relative">
            <button
              onClick={onClose}
              className="absolute right-4 top-4 p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all"
            >
              <FiX size={18} />
            </button>
          </div>

          {/* Profile Header Block */}
          <div className="px-6 pb-6 relative flex flex-col items-center -mt-12">
            <img
              src={avatarUrl}
              alt={user.full_name}
              className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md bg-white"
            />
            
            <h3 className="text-base font-bold text-gray-900 mt-3 text-center">
              {user.full_name || user.username}
            </h3>
            <p className="text-xs text-gray-400">@{user.username}</p>

            <span className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              user.is_active
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                : 'bg-rose-50 text-rose-700 border border-rose-100'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
              {user.is_active ? 'Active Account' : 'Suspended'}
            </span>

            {/* Info Grid */}
            <div className="w-full mt-5 border-t border-gray-100 pt-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Employee ID</span>
                  <span className="text-xs font-mono font-bold text-slate-700 mt-0.5 block">{user.employee_id || '—'}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">System Role</span>
                  <span className="text-xs font-semibold text-slate-700 mt-0.5 block capitalize truncate">{getRoleLabel(user.role)}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Department</span>
                  <span className="text-xs font-medium text-slate-700 mt-0.5 block truncate" title={user.department}>{user.department || '—'}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned Region</span>
                  <span className="text-xs font-medium text-slate-700 mt-0.5 block truncate" title={user.assigned_area}>{user.assigned_area || '—'}</span>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-2 border-t border-gray-100 pt-3">
                <div className="flex items-center gap-2.5 text-xs text-gray-600">
                  <span className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0 font-bold">@</span>
                  <a href={`mailto:${user.email}`} className="hover:text-blue-600 hover:underline truncate">{user.email}</a>
                </div>
                {user.phone && (
                  <div className="flex items-center gap-2.5 text-xs text-gray-600">
                    <span className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0">📞</span>
                    <a href={`tel:${user.phone}`} className="hover:text-blue-600 hover:underline">{user.phone}</a>
                  </div>
                )}
              </div>

              {/* Log Timeline */}
              <div className="border-t border-gray-100 pt-3 flex justify-between text-[9px] text-gray-400">
                <span>Joined: {formatDate(user.created_at)}</span>
                <span>Last login: {formatDateTime(user.last_login)}</span>
              </div>
            </div>
          </div>

          {/* Footer Action */}
          <div className="px-6 py-4 bg-slate-50 border-t border-gray-100">
            <button
              onClick={onClose}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-all text-center"
            >
              Close Profile
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-gray-100 transform transition-all duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
              isViewOnly ? 'bg-blue-50 text-blue-600' : mode === 'edit' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
            }`}>
              {isViewOnly ? <FiUser size={20} /> : mode === 'edit' ? <FiEdit2 size={18} /> : <FiPlus size={20} />}
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {isViewOnly ? 'User Details' : mode === 'edit' ? 'Edit User Profile' : 'Add New System User'}
              </h2>
              <p className="text-xs text-gray-500">
                {isViewOnly ? 'Reviewing user parameters and system assignment' : 'Set credentials, system role and department assignment'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
          >
            <FiX size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Profile Picture Uploader & Presets Selection */}
          <div className="flex flex-col items-center pb-4 border-b border-gray-100 mb-2">
            <div className="relative group/edit-avatar cursor-pointer">
              <img
                src={form.avatar_url || getDummyAvatar(form.username || form.email, form.role)}
                alt="Select profile avatar"
                className="w-20 h-20 rounded-full object-cover border-4 border-slate-100 shadow-sm transition-all group-hover/edit-avatar:border-blue-500"
              />
              <label className="absolute inset-0 bg-black/45 rounded-full flex items-center justify-center opacity-0 group-hover/edit-avatar:opacity-100 transition-opacity cursor-pointer text-[10px] text-white font-bold uppercase tracking-wider">
                Upload
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFileChange}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 font-medium">Click image to upload, or select a preset avatar:</p>
            
            {/* Presets Grid */}
            <div className="flex gap-2.5 mt-2 bg-slate-50 p-2 rounded-2xl border border-slate-100">
              {PRESET_AVATARS.map((url, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, avatar_url: url }))}
                  className={`w-8 h-8 rounded-full overflow-hidden border-2 transition-all hover:scale-105 active:scale-95 ${
                    form.avatar_url === url
                      ? 'border-blue-600 scale-110 shadow-sm'
                      : 'border-transparent hover:border-slate-300'
                  }`}
                  title="Select preset portrait"
                >
                  <img src={url} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Employee ID</label>
              <div className="relative">
                <FiHash className="absolute left-3 top-3.5 text-gray-400" size={13} />
                <input
                  type="text"
                  name="employee_id"
                  value={form.employee_id}
                  onChange={handleChange}
                  disabled={isViewOnly}
                  className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-gray-50/50 disabled:text-gray-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Full Name</label>
              <div className="relative">
                <FiUser className="absolute left-3 top-3.5 text-gray-400" size={13} />
                <input
                  type="text"
                  name="full_name"
                  value={form.full_name}
                  onChange={handleChange}
                  disabled={isViewOnly}
                  className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-gray-50/50 disabled:text-gray-500"
                  placeholder="e.g. أحمد بن خالد الحربي"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Email Address</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                disabled={isViewOnly || mode === 'edit'}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-gray-100 disabled:text-gray-400"
                placeholder="user@madinah.gov.sa"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Username</label>
              <input
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                disabled={isViewOnly || mode === 'edit'}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-gray-100 disabled:text-gray-400"
                placeholder="ahmed_harbi"
                required
              />
            </div>

            {mode === 'add' && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm pr-10 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Min. 8 characters"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                disabled={isViewOnly}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-gray-50/50 disabled:text-gray-500"
                placeholder="+966 50 000 0000"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Department</label>
              <div className="relative">
                <FiBriefcase className="absolute left-3 top-3.5 text-gray-400" size={13} />
                <select
                  name="department"
                  value={form.department}
                  onChange={handleChange}
                  disabled={isViewOnly}
                  className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-gray-50/50 disabled:text-gray-500"
                >
                  <option value="Municipal Inspections">Municipal Inspections</option>
                  <option value="Compliance & Audit">Compliance & Audit</option>
                  <option value="Field Operations">Field Operations</option>
                  <option value="GIS & Mapping">GIS & Mapping</option>
                  <option value="IT & Systems">IT & Systems</option>
                  <option value="Public Relations">Public Relations</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">System Role</label>
              <div className="relative">
                <FiShield className="absolute left-3 top-3.5 text-gray-400" size={13} />
                <select
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  disabled={isViewOnly}
                  className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-gray-50/50 disabled:text-gray-500"
                >
                  {Object.entries(ROLE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Assigned Area/Region</label>
              <div className="relative">
                <FiMapPin className="absolute left-3 top-3.5 text-gray-400" size={13} />
                <select
                  name="assigned_area"
                  value={form.assigned_area}
                  onChange={handleChange}
                  disabled={isViewOnly}
                  className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-gray-50/50 disabled:text-gray-500"
                >
                  <option value="Al Haram">Al Haram</option>
                  <option value="Quba">Quba</option>
                  <option value="Aziziyah">Aziziyah</option>
                  <option value="Jabal Uhud">Jabal Uhud</option>
                  <option value="Al Manakhah">Al Manakhah</option>
                  <option value="Al Awali">Al Awali</option>
                  <option value="Bani Haritha">Bani Haritha</option>
                  <option value="Al Aqiq">Al Aqiq</option>
                  <option value="All Madinah Regions">All Madinah Regions</option>
                </select>
              </div>
            </div>

            {isViewOnly && user && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Last Login Date</label>
                  <div className="relative">
                    <FiClock className="absolute left-3 top-3.5 text-gray-400" size={13} />
                    <span className="w-full block border border-gray-100 bg-gray-50/40 rounded-xl pl-9 pr-3 py-2.5 text-sm text-gray-600">
                      {formatDateTime(user.last_login)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Created Joined Date</label>
                  <div className="relative">
                    <FiCalendar className="absolute left-3 top-3.5 text-gray-400" size={13} />
                    <span className="w-full block border border-gray-100 bg-gray-50/40 rounded-xl pl-9 pr-3 py-2.5 text-sm text-gray-600">
                      {formatDate(user.created_at)}
                    </span>
                  </div>
                </div>
              </>
            )}

            {!isViewOnly && (
              <div className="sm:col-span-2 pt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  name="is_active"
                  id="is_active"
                  checked={form.is_active}
                  onChange={handleChange}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="text-sm font-semibold text-gray-700">
                  Account is Active (allows login)
                </label>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">
              {error}
            </div>
          )}

          {/* Footer controls */}
          <div className="flex gap-3 pt-3 border-t border-gray-100 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors font-semibold"
            >
              {isViewOnly ? 'Close' : 'Cancel'}
            </button>
            {!isViewOnly && (
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <><FiLoader size={14} className="animate-spin" /> Saving...</>
                ) : (
                  <>Save User Account</>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

// ============ Main Page ============
export default function AdminUsers() {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalState, setModalState] = useState(null); // { mode: 'add'|'edit'|'view', user?: user }
  const [actionLoading, setActionLoading] = useState(null); // userId being actioned

  // Filtering & Sorting State
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('full_name');
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (!isLoading && users.length > 0) {
      const query = new URLSearchParams(window.location.search);
      const showProfile = query.get('showProfile');
      if (showProfile) {
        const cleanParam = showProfile.toLowerCase().trim();
        const matched = users.find(u => {
          const fullName = (u.full_name || '').toLowerCase();
          const username = (u.username || '').toLowerCase();
          const email = (u.email || '').toLowerCase();
          
          if (username === cleanParam || email === cleanParam) return true;
          if (fullName.includes(cleanParam) || cleanParam.includes(fullName)) return true;
          
          const paramWords = cleanParam.replace(/[()]/g, '').split(/[\s_-]+/);
          const userWords = (fullName + ' ' + username).replace(/[()]/g, '').split(/[\s_-]+/);
          return paramWords.some(pw => pw.length > 2 && userWords.some(uw => uw.includes(pw) || pw.includes(uw)));
        });
        if (matched) {
          setModalState({ mode: 'view', user: matched });
        }
      }
    }
  }, [isLoading, users]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const response = await userApi.listUsers(0, 200);
      const enhancedDbUsers = response.data.map(enhanceDbUser);
      // Combine dummy users and DB users, making sure usernames are unique
      const dbUsernames = new Set(enhancedDbUsers.map(u => u.username));
      const combined = [
        ...enhancedDbUsers,
        ...DUMMY_ARABIC_USERS.filter(du => !dbUsernames.has(du.username))
      ];
      setUsers(combined);
    } catch {
      toast.error('Failed to load system users');
      setUsers(DUMMY_ARABIC_USERS);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (userId, currentlyActive) => {
    if (userId.toString().startsWith('mock-')) {
      // Mock toggle active
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !currentlyActive } : u));
      toast.success(`User ${currentlyActive ? 'deactivated' : 'activated'} successfully (Mock Mode)`);
      return;
    }

    if (!window.confirm(
      currentlyActive
        ? 'Deactivate this user? They will not be able to log in.'
        : 'Activate this user? They will regain access.'
    )) return;

    setActionLoading(userId);
    try {
      await userApi.toggleUserActive(userId);
      toast.success(`User ${currentlyActive ? 'deactivated' : 'activated'} successfully`);
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId, email) => {
    if (!window.confirm(`Permanently delete user "${email}"? This cannot be undone.`)) return;

    if (userId.toString().startsWith('mock-')) {
      // Mock delete
      setUsers(prev => prev.filter(u => u.id !== userId));
      toast.success('User deleted (Mock Mode)');
      return;
    }

    setActionLoading(userId);
    try {
      await userApi.deleteUser(userId);
      toast.success('User deleted');
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveUser = (savedUser) => {
    if (modalState.mode === 'add') {
      setUsers(prev => [savedUser, ...prev]);
      toast.success('New user account registered successfully!');
    } else {
      setUsers(prev => prev.map(u => u.id === savedUser.id ? savedUser : u));
      toast.success('User profile updated successfully!');
    }
    setModalState(null);
  };

  // ── Sorting & Filtering logic ──
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const filteredUsers = users.filter((u) => {
    const searchLower = search.toLowerCase();
    const nameMatch = (u.full_name || '').toLowerCase().includes(searchLower) ||
                      (u.username || '').toLowerCase().includes(searchLower) ||
                      (u.email || '').toLowerCase().includes(searchLower) ||
                      (u.employee_id || '').toLowerCase().includes(searchLower);

    const roleMatch = !roleFilter || u.role === roleFilter;
    const statusMatch = !statusFilter || 
                        (statusFilter === 'active' && u.is_active) || 
                        (statusFilter === 'inactive' && !u.is_active);

    return nameMatch && roleMatch && statusMatch;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let aVal = a[sortBy] || '';
    let bVal = b[sortBy] || '';

    if (sortBy === 'is_active') {
      aVal = a.is_active ? 1 : 0;
      bVal = b.is_active ? 1 : 0;
    }

    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // ── Pagination logic ──
  const totalItems = sortedUsers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedUsers.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <FiLoader className="animate-spin text-3xl text-blue-600" />
      </div>
    );
  }

  const activeCount = users.filter((u) => u.is_active).length;
  const inactiveCount = users.length - activeCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Resource Management</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage administrative system credentials, inspector assignments, and roles</p>
        </div>
        <button
          onClick={() => setModalState({ mode: 'add' })}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow shadow-blue-500/10"
        >
          <FiPlus size={16} />
          Add System User
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <FiUsers size={15} />
            </div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Registered</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-1">{users.length}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <FiUserCheck size={15} />
            </div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Staff</span>
          </div>
          <p className="text-3xl font-bold text-emerald-600 mt-1">{activeCount}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
              <FiLock size={15} />
            </div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Inactive / Suspended</span>
          </div>
          <p className="text-3xl font-bold text-slate-500 mt-1">{inactiveCount}</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white border border-gray-100 rounded-3xl p-4 flex flex-col md:flex-row gap-3 shadow-sm">
        <div className="relative flex-1">
          <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Search by name, ID, username, email..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        <div className="flex gap-2">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
            className="text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
          >
            <option value="">All Roles</option>
            {Object.entries(ROLE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {/* Reset Filters */}
          {(search || roleFilter || statusFilter) && (
            <button
              onClick={() => { setSearch(''); setRoleFilter(''); setStatusFilter(''); setCurrentPage(1); }}
              className="p-2.5 border border-gray-200 hover:bg-gray-50 text-gray-500 hover:text-gray-700 text-sm font-semibold rounded-xl transition-all"
              title="Reset filters"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
        {totalItems === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <FiUsers size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="font-semibold text-gray-500">No matching user accounts found</p>
            <p className="text-xs text-gray-400 mt-1">Try resetting filters or search query</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/70 border-b border-gray-100 text-gray-600 font-semibold">
                <tr>
                  {[
                    { key: 'employee_id', label: 'Employee ID' },
                    { key: 'full_name', label: 'Staff Profile' },
                    { key: 'role', label: 'Role / Designation' },
                    { key: 'department', label: 'Department' },
                    { key: 'assigned_area', label: 'Assigned Region' },
                    { key: 'is_active', label: 'Status' },
                    { key: 'last_login', label: 'Last Login' },
                    { key: 'actions', label: 'Actions', noSort: true }
                  ].map((col) => (
                    <th
                      key={col.key}
                      onClick={() => !col.noSort && handleSort(col.key)}
                      className={`px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider ${
                        col.noSort ? '' : 'cursor-pointer select-none hover:text-blue-600 transition-all'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{col.label}</span>
                        {!col.noSort && sortBy === col.key && (
                          sortOrder === 'asc' ? <FiChevronUp size={12} className="text-blue-600" /> : <FiChevronDown size={12} className="text-blue-600" />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {currentItems.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/40 transition-colors group">
                    {/* Employee ID */}
                    <td className="px-5 py-4 font-mono text-xs text-gray-600 font-bold whitespace-nowrap">
                      {u.employee_id}
                    </td>

                    {/* Staff Profile (Name, Email, Username) */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="relative group/avatar cursor-pointer flex-shrink-0"
                          onClick={() => setModalState({ mode: 'view', user: u })}
                        >
                          <img
                            src={getDummyAvatar(u.username || u.email, u.role)}
                            alt={u.full_name || u.username}
                            className="w-9 h-9 rounded-full object-cover border-2 border-slate-100 shadow-sm transition-all group-hover/avatar:border-blue-500"
                          />
                          <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                            <FiEye className="text-white" size={12} />
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-semibold text-gray-900 truncate max-w-[200px]" title={u.full_name}>
                              {u.full_name || u.username}
                            </p>
                            <button
                              onClick={() => setModalState({ mode: 'view', user: u })}
                              className="p-0.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Show Profile Info Card"
                            >
                              <FiUser size={13} />
                            </button>
                          </div>
                          <p className="text-xs text-gray-400 truncate max-w-[200px]" title={u.email}>{u.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role Badge */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        u.role === 'admin' || u.role === 'super_admin'
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                          : u.role === 'municipality_admin'
                          ? 'bg-blue-50 text-blue-700 border border-blue-100'
                          : u.role === 'supervisor'
                          ? 'bg-teal-50 text-teal-700 border border-teal-100'
                          : u.role === 'field_inspector'
                          ? 'bg-amber-50 text-amber-700 border border-amber-100'
                          : 'bg-gray-50 text-gray-700 border border-gray-100'
                      }`}>
                        {getRoleLabel(u.role)}
                      </span>
                    </td>

                    {/* Department */}
                    <td className="px-5 py-4 text-gray-600 text-xs font-medium whitespace-nowrap">
                      {u.department}
                    </td>

                    {/* Assigned Region */}
                    <td className="px-5 py-4 text-gray-500 text-xs whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <FiMapPin size={11} className="text-slate-400 flex-shrink-0" />
                        <span className="truncate max-w-[150px]" title={u.assigned_area}>{u.assigned_area}</span>
                      </div>
                    </td>

                    {/* Status Toggle */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        u.is_active
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : 'bg-rose-50 text-rose-700 border border-rose-100'
                      }`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Last Login */}
                    <td className="px-5 py-4 text-gray-500 text-xs whitespace-nowrap">
                      {formatDate(u.last_login)}
                    </td>

                    {/* Action Buttons */}
                    <td className="px-5 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* View Action */}
                        <button
                          onClick={() => setModalState({ mode: 'view', user: u })}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <FiEye size={15} />
                        </button>

                        {/* Edit Action */}
                        <button
                          onClick={() => setModalState({ mode: 'edit', user: u })}
                          className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Edit Profile"
                        >
                          <FiEdit2 size={15} />
                        </button>

                        {u.id === currentUser?.id ? (
                          <div className="w-8" />
                        ) : (
                          <>
                            {/* Toggle Active Switch */}
                            <button
                              onClick={() => handleToggleActive(u.id, u.is_active)}
                              disabled={actionLoading === u.id}
                              className={`p-1.5 rounded-lg transition-colors ${
                                u.is_active
                                  ? 'hover:bg-amber-50 text-amber-500 hover:text-amber-700'
                                  : 'hover:bg-emerald-50 text-emerald-500 hover:text-emerald-700'
                              }`}
                              title={u.is_active ? 'Deactivate staff account' : 'Activate staff account'}
                            >
                              {actionLoading === u.id ? (
                                <FiLoader size={15} className="animate-spin" />
                              ) : u.is_active ? (
                                <FiLock size={15} />
                              ) : (
                                <FiUnlock size={15} />
                              )}
                            </button>

                            {/* Delete Action */}
                            <button
                              onClick={() => handleDeleteUser(u.id, u.email)}
                              disabled={actionLoading === u.id}
                              className="p-1.5 hover:bg-rose-50 text-rose-400 hover:text-rose-600 rounded-lg transition-colors"
                              title="Delete staff account"
                            >
                              <FiTrash2 size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-slate-50/50 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500 font-medium">
              Showing <span className="font-semibold text-gray-800">{indexOfFirstItem + 1}</span> to{' '}
              <span className="font-semibold text-gray-800">{Math.min(indexOfLastItem, totalItems)}</span> of{' '}
              <span className="font-semibold text-gray-800">{totalItems}</span> users
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 rounded-xl transition-all"
              >
                <FiChevronLeft size={14} />
              </button>
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`w-8 h-8 flex items-center justify-center rounded-xl text-xs font-semibold transition-all ${
                    currentPage === page
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'border border-gray-200 bg-white hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 rounded-xl transition-all"
              >
                <FiChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details / Action Modals */}
      {modalState && (
        <UserDetailsModal
          mode={modalState.mode}
          user={modalState.user}
          onClose={() => setModalState(null)}
          onSave={handleSaveUser}
        />
      )}
    </div>
  );
}
