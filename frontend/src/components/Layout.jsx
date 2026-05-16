/**
 * Layout component with RBAC-aware navigation
 * - Header removed; user card now lives above Logout in the sidebar
 * - "My Profile" nav item removed (Profile Settings in user card does the same)
 */
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FiMenu, FiX, FiLogOut, FiMap, FiFileText,
  FiSettings, FiUsers, FiDatabase, FiPlusCircle, FiGrid, FiChevronRight,
  FiCalendar, FiLayers, FiBarChart2, FiShield, FiHome,
} from 'react-icons/fi';
import { useAuthStore } from '../store/store';
import { getInitials, getRoleLabel } from '../utils/helpers';

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdmin = ['admin', 'super_admin'].includes(user?.role);

  // Navigation items — role-aware RBAC navigation
  const navItems = [
    { icon: FiHome,        label: 'Dashboard',      path: '/dashboard',   allowedRoles: ['super_admin', 'municipality_admin', 'supervisor', 'field_inspector', 'auditor', 'operator', 'admin', 'user'] },
    { icon: FiFileText,    label: 'Shop Reports',   path: '/complaints',  allowedRoles: ['super_admin', 'municipality_admin', 'supervisor', 'field_inspector', 'auditor', 'operator', 'admin', 'user'] },
    { icon: FiMap,         label: 'Map View',       path: '/map',         allowedRoles: ['super_admin', 'municipality_admin', 'supervisor', 'field_inspector', 'auditor', 'operator', 'admin', 'user'] },
    { icon: FiGrid,        label: 'Case Board',     path: '/tasks',       allowedRoles: ['super_admin', 'municipality_admin', 'supervisor', 'admin'] },
    { icon: FiCalendar,    label: 'Scheduling',     path: '/scheduling',  allowedRoles: ['super_admin', 'municipality_admin', 'supervisor', 'admin'] },
    { icon: FiBarChart2,   label: 'Analytics',      path: '/reports',     allowedRoles: ['super_admin', 'municipality_admin', 'supervisor', 'auditor', 'operator', 'admin'] },
    { icon: FiDatabase,    label: 'Integrations',   path: '/integrations', allowedRoles: ['super_admin', 'municipality_admin', 'operator', 'admin'] },
    { icon: FiLayers,      label: 'Building Explorer', path: '/indoor-map',  allowedRoles: ['super_admin', 'municipality_admin', 'supervisor', 'field_inspector', 'admin'] },
    // ── Admin-only section ──
    { icon: FiGrid,        label: 'Admin Panel',    path: '/admin',       allowedRoles: ['super_admin', 'admin'] },
    { icon: FiDatabase,    label: 'Kobo Data',      path: '/admin/kobo',  allowedRoles: ['super_admin', 'admin'] },
    { icon: FiUsers,       label: 'Manage Users',   path: '/admin/users', allowedRoles: ['super_admin', 'admin'] },
    { icon: FiSettings,    label: 'Form Builder',   path: '/admin/forms', allowedRoles: ['super_admin', 'admin'] },
  ].filter((item) => item.allowedRoles.includes(user?.role));

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div className="flex h-screen bg-gray-50">

      {/* ======= Sidebar ======= */}
      <aside
        className={`${
          sidebarOpen ? 'w-60' : 'w-16'
        } bg-slate-900 text-white transition-all duration-300 ease-in-out flex flex-col shadow-xl`}
      >
        {/* Sidebar Header — logo + collapse toggle */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-700">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
                <img
                  src="/assets/images/logo.png"
                  alt="Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="font-bold text-sm text-white leading-tight">ShopGuard AI</span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors flex-shrink-0"
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? <FiX size={18} /> : <FiMenu size={18} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 mt-3 px-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 ${
                  active
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
                title={!sidebarOpen ? item.label : undefined}
              >
                <item.icon size={18} className="flex-shrink-0" />
                {sidebarOpen && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* ── User card + Logout at bottom ── */}
        <div className="border-t border-slate-700 p-3 space-y-1">

          {/* User card — clickable → Profile Settings */}
          <button
            onClick={() => navigate('/profile')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-700 transition-all duration-150 group"
            title={!sidebarOpen ? (user?.full_name || user?.username || 'Profile') : undefined}
          >
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow">
              {getInitials(user?.full_name || user?.email || 'U')}
            </div>

            {sidebarOpen && (
              <>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-white truncate leading-tight">
                    {user?.full_name || user?.username || 'User'}
                  </p>
                  <p className="text-xs capitalize truncate text-slate-400">
                    {getRoleLabel(user?.role)}
                  </p>
                </div>
                <FiSettings size={14} className="text-slate-500 group-hover:text-slate-300 flex-shrink-0 transition-colors" />
              </>
            )}
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-150"
            title={!sidebarOpen ? 'Logout' : undefined}
          >
            <FiLogOut size={18} className="flex-shrink-0" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* ======= Main Content (no header) ======= */}
      <main className="flex-1 overflow-auto bg-gray-50">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
