/**
 * Login page — User / Admin tab switcher
 */
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/store';
import { toast } from 'react-toastify';
import { FiMail, FiLock, FiLoader, FiUser, FiShield } from 'react-icons/fi';

const TABS = [
  { id: 'user',  label: 'User Login',  icon: FiUser,   accent: 'blue'   },
  { id: 'admin', label: 'Admin Login', icon: FiShield, accent: 'indigo' },
];

export default function Login() {
  const navigate  = useNavigate();
  const { login, isLoading, error, clearError } = useAuthStore();

  const [activeTab, setActiveTab] = useState('user');
  const [formData, setFormData]   = useState({ email: '', password: '' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    clearError();
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    setFormData({ email: '', password: '' });
    clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    const result = await login(formData.email, formData.password);
    if (result.success) {
      const role = result.user?.role;

      // Tab / role mismatch guard
      if (activeTab === 'admin' && role !== 'admin') {
        toast.error('This account does not have admin privileges.');
        return;
      }
      if (activeTab === 'user' && role === 'admin') {
        toast.warn('Admin account detected — redirecting to Admin Dashboard.');
        navigate('/admin');
        return;
      }

      toast.success('Logged in successfully!');
      navigate(role === 'admin' ? '/admin' : '/complaints');
    } else {
      toast.error(result.message || 'Login failed');
    }
  };

  const isAdmin  = activeTab === 'admin';
  const accentRing = isAdmin ? 'focus:ring-indigo-400' : 'focus:ring-blue-400';
  const btnClass   = isAdmin
    ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
    : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 mb-3">
            <img
              src="/assets/images/logo.png"
              alt="GEO AI Complaint System Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">Complaint System</h1>
          <p className="text-blue-300 text-sm">Disaster Complaint Management System</p>
        </div>

        {/* Card */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl overflow-hidden">

          {/* ── Tabs ── */}
          <div className="flex border-b border-white/10">
            {TABS.map(({ id, label, icon: Icon }) => {
              const active = activeTab === id;
              const isAdminTab = id === 'admin';
              return (
                <button
                  key={id}
                  onClick={() => switchTab(id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-semibold transition-all duration-200 ${
                    active
                      ? isAdminTab
                        ? 'bg-indigo-600/30 text-white border-b-2 border-indigo-400'
                        : 'bg-blue-600/30 text-white border-b-2 border-blue-400'
                      : 'text-blue-300/60 hover:text-blue-200 hover:bg-white/5'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              );
            })}
          </div>

          {/* ── Form ── */}
          <form onSubmit={handleSubmit} className="p-8 space-y-5">

            {/* Context badge
            <div className={`flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg ${
              isAdmin
                ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-500/30'
                : 'bg-blue-500/20 text-blue-200 border border-blue-500/30'
            }`}>
              {isAdmin
                ? <><FiShield size={13}/> Sign in with your administrator credentials</>
                : <><FiUser size={13}/> Sign in to submit and track your complaints</>
              }
            </div> */}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-blue-200 mb-2">
                Email Address
              </label>
              <div className="relative">
                <FiMail className="absolute left-3 top-3.5 text-blue-300" size={18} />
                <input
                  type="email"
                  name="email"
                  id="login-email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full bg-white/10 border border-white/20 text-white placeholder-blue-300/50 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 ${accentRing} focus:border-transparent`}
                  placeholder={isAdmin ? 'admin@example.com' : 'your@email.com'}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-blue-200 mb-2">
                Password
              </label>
              <div className="relative">
                <FiLock className="absolute left-3 top-3.5 text-blue-300" size={18} />
                <input
                  type="password"
                  name="password"
                  id="login-password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full bg-white/10 border border-white/20 text-white placeholder-blue-300/50 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 ${accentRing} focus:border-transparent`}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/30 text-red-200 rounded-xl text-sm">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              id="login-submit"
              disabled={isLoading}
              className={`w-full ${btnClass} disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center shadow-lg`}
            >
              {isLoading ? (
                <>
                  <FiLoader className="animate-spin mr-2" size={18} />
                  Signing in…
                </>
              ) : (
                `Sign in as ${isAdmin ? 'Admin' : 'User'}`
              )}
            </button>

            {/* Register link — only on user tab */}
            {!isAdmin && (
              <div className="text-center">
                <p className="text-blue-200/70 text-sm">
                  Don't have an account?{' '}
                  <Link to="/register" className="text-blue-300 font-medium hover:text-white transition-colors">
                    Register here
                  </Link>
                </p>
              </div>
            )}
          </form>
        </div>

      </div>
    </div>
  );
}
