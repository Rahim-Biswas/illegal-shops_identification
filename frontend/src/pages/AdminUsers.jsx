/**
 * Admin User Management Page
 * - Lists all users with role/status badges
 * - Toggle active/inactive
 * - Delete users
 * - Create new admin credentials (modal)
 */
import { useState, useEffect } from 'react';
import { userApi } from '../services/api';
import { useAuthStore } from '../store/store';
import { formatDate, getRoleLabel, ROLE_LABELS } from '../utils/helpers';
import { toast } from 'react-toastify';
import {
  FiTrash2, FiLock, FiUnlock, FiLoader, FiPlus,
  FiUsers, FiUserCheck, FiX, FiEye, FiEyeOff, FiShield, FiEdit2
} from 'react-icons/fi';

// ============ Create Admin Modal ============
function CreateAdminModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    email: '',
    username: '',
    full_name: '',
    password: '',
    phone: '',
    organization: '',
    role: 'user',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.username || !form.password) {
      setError('Email, username, and password are required.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setIsLoading(true);
    try {
      await userApi.createUser(form);
      toast.success(`User account created: ${form.email}`);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create user account.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center">
              <FiShield size={18} className="text-purple-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Create User Account</h2>
              <p className="text-xs text-gray-500">Create a new account with a role and access level.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="admin@example.com"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Username *</label>
              <input
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                placeholder="admin_user"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              name="full_name"
              value={form.full_name}
              onChange={handleChange}
              placeholder="John Doe"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Password *</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Min. 8 characters"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm pr-10 focus:ring-2 focus:ring-purple-400 focus:border-transparent focus:outline-none"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="+91 98765 43210"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Organization</label>
              <input
                type="text"
                name="organization"
                value={form.organization}
                onChange={handleChange}
                placeholder="NDMA"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent focus:outline-none"
            >
              {Object.entries(ROLE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <><FiLoader size={14} className="animate-spin" /> Creating...</>
              ) : (
                <><FiUsers size={14} /> Create User</>
              )}
            </button>
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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // userId being actioned

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const response = await userApi.listUsers(0, 200);
      setUsers(response.data);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (userId, currentlyActive) => {
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <FiLoader className="animate-spin text-3xl text-blue-600" />
      </div>
    );
  }

  const activeUsers = users.filter((u) => u.is_active).length;
  const adminUsers = users.filter((u) => u.role === 'admin').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 text-sm mt-1">Manage accounts and admin credentials</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium transition-colors shadow"
        >
          <FiPlus size={16} />
          Create User Account
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-1">
            <FiUsers size={16} className="text-blue-500" />
            <span className="text-xs font-medium text-gray-500">Total Users</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{users.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-1">
            <FiUserCheck size={16} className="text-green-500" />
            <span className="text-xs font-medium text-gray-500">Active</span>
          </div>
          <p className="text-3xl font-bold text-green-600">{activeUsers}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-1">
            <FiShield size={16} className="text-purple-500" />
            <span className="text-xs font-medium text-gray-500">Admins</span>
          </div>
          <p className="text-3xl font-bold text-purple-600">{adminUsers}</p>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">All Accounts</h2>
        </div>

        {users.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <FiUsers size={36} className="mx-auto mb-3" />
            <p>No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Name / Username', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                          u.role === 'admin' ? 'bg-purple-500' : 'bg-blue-500'
                        }`}>
                          {(u.full_name || u.username || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{u.full_name || u.username}</p>
                          {u.organization && (
                            <p className="text-xs text-gray-400">{u.organization}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-600">{u.email}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        u.role === 'admin'
                          ? 'bg-purple-100 text-purple-700 border border-purple-200'
                          : 'bg-blue-100 text-blue-700 border border-blue-200'
                      }`}>
                        {u.role === 'admin' && <FiShield size={10} />}
                        {getRoleLabel(u.role)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        u.is_active
                          ? 'bg-green-100 text-green-700 border border-green-200'
                          : 'bg-gray-100 text-gray-500 border border-gray-200'
                      }`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-500 text-xs whitespace-nowrap">
                      {formatDate(u.created_at)}
                    </td>
                    <td className="px-5 py-4">
                      {u.id === currentUser?.id ? (
                        <span className="text-xs text-gray-400 italic">You</span>
                      ) : (
                        <div className="flex items-center gap-1">
                          {/* Toggle Active */}
                          <button
                            onClick={() => handleToggleActive(u.id, u.is_active)}
                            disabled={actionLoading === u.id}
                            className={`p-2 rounded-lg transition-colors ${
                              u.is_active
                                ? 'hover:bg-amber-50 text-amber-500 hover:text-amber-700'
                                : 'hover:bg-green-50 text-green-500 hover:text-green-700'
                            }`}
                            title={u.is_active ? 'Deactivate user' : 'Activate user'}
                          >
                            {actionLoading === u.id ? (
                              <FiLoader size={16} className="animate-spin" />
                            ) : u.is_active ? (
                              <FiLock size={16} />
                            ) : (
                              <FiUnlock size={16} />
                            )}
                          </button>
                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteUser(u.id, u.email)}
                            disabled={actionLoading === u.id}
                            className="p-2 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600 transition-colors"
                            title="Delete user"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Admin Modal */}
      {showCreateModal && (
        <CreateAdminModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={loadUsers}
        />
      )}
    </div>
  );
}
