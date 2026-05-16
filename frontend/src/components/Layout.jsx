/**
 * Layout component with RBAC-aware navigation
 * - Header removed; user card now lives above Logout in the sidebar
 * - AI Lab button above user card opens a modal with link to https://aces.logicity.in/
 */
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FiMenu, FiX, FiLogOut, FiMap, FiFileText,
  FiSettings, FiUsers, FiDatabase, FiGrid,
  FiCalendar, FiLayers, FiBarChart2, FiHome, FiExternalLink, FiCpu,
} from 'react-icons/fi';
import { useAuthStore } from '../store/store';
import { getInitials, getRoleLabel } from '../utils/helpers';

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [aiLabOpen, setAiLabOpen]     = useState(false);
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { icon: FiHome,      label: 'Dashboard',        path: '/dashboard',    allowedRoles: ['super_admin','municipality_admin','supervisor','field_inspector','auditor','operator','admin','user'] },
    { icon: FiFileText,  label: 'Shop Reports',     path: '/complaints',   allowedRoles: ['super_admin','municipality_admin','supervisor','field_inspector','auditor','operator','admin','user'] },
    { icon: FiMap,       label: 'Map View',         path: '/map',          allowedRoles: ['super_admin','municipality_admin','supervisor','field_inspector','auditor','operator','admin','user'] },
    { icon: FiGrid,      label: 'Case Board',       path: '/tasks',        allowedRoles: ['super_admin','municipality_admin','supervisor','admin'] },
    { icon: FiCalendar,  label: 'Scheduling',       path: '/scheduling',   allowedRoles: ['super_admin','municipality_admin','supervisor','admin'] },
    { icon: FiBarChart2, label: 'Analytics',        path: '/reports',      allowedRoles: ['super_admin','municipality_admin','supervisor','auditor','operator','admin'] },
    { icon: FiDatabase,  label: 'Integrations',     path: '/integrations', allowedRoles: ['super_admin','municipality_admin','operator','admin'] },
    { icon: FiLayers,    label: 'Building Explorer',path: '/indoor-map',   allowedRoles: ['super_admin','municipality_admin','supervisor','field_inspector','admin'] },
    { icon: FiGrid,      label: 'Admin Panel',      path: '/admin',        allowedRoles: ['super_admin','admin'] },
    { icon: FiDatabase,  label: 'Kobo Data',        path: '/admin/kobo',   allowedRoles: ['super_admin','admin'] },
    { icon: FiUsers,     label: 'Manage Users',     path: '/admin/users',  allowedRoles: ['super_admin','admin'] },
    { icon: FiSettings,  label: 'Form Builder',     path: '/admin/forms',  allowedRoles: ['super_admin','admin'] },
  ].filter(item => item.allowedRoles.includes(user?.role));

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div className="flex h-screen bg-gray-50">

      {/* ======= Sidebar ======= */}
      <aside
        className={`${sidebarOpen ? 'w-60' : 'w-16'} bg-slate-900 text-white transition-all duration-300 ease-in-out flex flex-col shadow-xl`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-700">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
                <img src="/assets/images/logo.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <span className="font-bold text-sm text-white leading-tight">Ayn</span>
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
          }).reduce((acc, el, i, arr) => {
            acc.push(el);
            // Insert AI Lab button right after Map View (/map)
            if (navItems[i]?.path === '/map') {
              acc.push(
                <button
                  key="ai-lab"
                  onClick={() => setAiLabOpen(true)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 text-slate-400 hover:bg-slate-700 hover:text-white"
                  title={!sidebarOpen ? 'AI Lab' : undefined}
                >
                  <FiCpu size={18} className="flex-shrink-0" />
                  {sidebarOpen && <span className="truncate">AI Lab</span>}
                </button>
              );
            }
            return acc;
          }, [])}
        </nav>

        {/* Bottom section */}
        <div className="border-t border-slate-700 p-3 space-y-1">

          {/* User card */}
          <button
            onClick={() => navigate('/profile')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-700 transition-all duration-150 group"
            title={!sidebarOpen ? (user?.full_name || user?.username || 'Profile') : undefined}
          >
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

      {/* ======= Main Content ======= */}
      <main className="flex-1 overflow-auto bg-gray-50">
        <div className={location.pathname === '/map' ? 'h-full' : 'p-6'}>{children}</div>
      </main>

      {/* ======= AI Lab Modal ======= */}
      {aiLabOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)' }}
          onClick={() => setAiLabOpen(false)}
        >
          <div
            className="relative bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-sm mx-4 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Gradient stripe */}
            <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg,#6366f1,#a855f7)' }} />

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)' }}
                >
                  <FiCpu size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-base leading-tight">AI Lab</h3>
                  <p className="text-slate-400 text-xs">Illegal Shop Detection Platform</p>
                </div>
              </div>
              <button
                onClick={() => setAiLabOpen(false)}
                className="text-slate-500 hover:text-white transition-colors p-1"
              >
                <FiX size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 pb-3">
              <div className="flex items-start gap-3 bg-slate-800 rounded-xl p-4 border border-slate-700">
                <span className="text-2xl leading-none flex-shrink-0">🚧</span>
                <div>
                  <p className="text-white text-sm font-semibold mb-1">Under Development</p>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    AI Lab is currently under active development. It will feature advanced AI-powered
                    tools for illegal shop detection, pattern analysis, and automated violation scoring.
                    Stay tuned for updates!
                  </p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {['🔍 AI Detection', '📊 Pattern Analysis', '🗺️ Zone Mapping', '⚡ Auto Scoring'].map(f => (
                  <div key={f} className="bg-slate-800/60 rounded-lg px-3 py-2 text-xs text-slate-400 border border-slate-700/50">
                    {f}
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 pt-2 flex gap-3">
              <button
                onClick={() => setAiLabOpen(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-400 border border-slate-600 hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
              <a
                href="https://aces.logicity.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)' }}
                onClick={() => setAiLabOpen(false)}
              >
                <FiExternalLink size={13} /> Open AI Lab
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
