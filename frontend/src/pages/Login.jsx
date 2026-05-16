/**
 * Modern Login UI — User / Admin
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/store';
import { toast } from 'react-toastify';

import {
  FiMail,
  FiLock,
  FiLoader,
} from 'react-icons/fi';

export default function Login() {
  const navigate = useNavigate();

  const {
    login,
    isLoading,
    error,
    clearError,
  } = useAuthStore();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

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
      toast.success('Logged in successfully!');

      navigate(
        role === 'user' ? '/complaints' : '/dashboard'
      );
    } else {
      toast.error(result.message || 'Login failed');
    }
  };

  const accentRing = 'focus:ring-cyan-400';
  const buttonClass = 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-600/40';

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">

      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center scale-110"
        style={{
          backgroundImage:
            "url('/assets/images/Login_background.jpg')",
        }}
      />

      {/* Dark Overlay + Blur */}
      <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm" />

      {/* Top Right Logo */}
      <div className="absolute top-6 right-6 z-20">
        <img
          src="/assets/images/logo.png"
          alt="Main Logo"
          className="w-24 md:w-28 object-contain drop-shadow-2xl"
        />
      </div>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-md px-4">

        {/* Header */}
        <div className="text-center mb-8">

          {/* Secondary Logo */}
          <div className="flex justify-center mb-5">
            <div className="">
              <img
                src="/assets/images/logo_1.png"
                alt="Secondary Logo"
                className="w-24 h-24 object-contain"
              />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-4xl font-extrabold text-white tracking-wide mb-4">
            Ayn
          </h1>

          {/* Subtitle */}
          <p className="text-slate-200 text-sm leading-relaxed max-w-sm mx-auto">
            Municipality GeoAI Enforcement Platform
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white/10 border border-white/20 backdrop-blur-xl rounded-md shadow-2xl overflow-hidden">

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="p-8 space-y-6"
          >

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Email Address
              </label>

              <div className="relative">
                <FiMail
                  className="absolute left-4 top-3.5 text-slate-300"
                  size={18}
                />

                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder={
                    'your@email.com'
                  }
                  autoComplete="email"
                  className={`w-full bg-white/10 border border-white/20 text-white placeholder-slate-400 rounded-md pl-12 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 ${accentRing} focus:border-transparent transition-all`}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Password
              </label>

              <div className="relative">
                <FiLock
                  className="absolute left-4 top-3.5 text-slate-300"
                  size={18}
                />

                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={`w-full bg-white/10 border border-white/20 text-white placeholder-slate-400 rounded-md pl-12 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 ${accentRing} focus:border-transparent transition-all`}
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-500/20 border border-red-400/30 text-red-200 text-sm rounded-md px-4 py-3">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full ${buttonClass} text-white font-semibold py-3.5 rounded-md transition-all duration-300 shadow-xl flex items-center justify-center`}
            >
              {isLoading ? (
                <>
                  <FiLoader
                    className="animate-spin mr-2"
                    size={18}
                  />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>

            <div className="text-center pt-1">
              <p className="text-slate-300 text-sm">
                Don't have an account?{' '}
                <Link
                  to="/register"
                  className="text-cyan-300 hover:text-white font-medium transition-colors"
                >
                  Register here
                </Link>
              </p>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}