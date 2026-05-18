/**
 * Dashboard — role-aware
 * - Admins (admin / super_admin): live data from API — stats, charts, audit log, user table
 * - All other roles: demo-data cards, charts, and quick-action shortcuts
 */
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/store';
import { getRoleLabel } from '../utils/helpers';
import { complaintApi, userApi } from '../services/api';
import { toast } from 'react-toastify';
import {
  DEMO_DASHBOARD_CARDS,
  DEMO_VIOLATION_DISTRICT,
  DEMO_COMPLIANCE_TREND,
  DEMO_DETECTION_CONFIDENCE,
  DEMO_TASKS,
} from '../data/demoData';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell,
} from 'recharts';
import {
  FiUsers, FiFileText, FiAlertTriangle, FiCheckCircle, FiLoader,
  FiDownload, FiCalendar, FiRefreshCw,
} from 'react-icons/fi';

const COLORS = ['#2563eb', '#f59e0b', '#10b981', '#ef4444'];

// ─── Admin live-data view ─────────────────────────────────────────────────────

function AdminView({ navigate }) {
  const [statistics, setStatistics]     = useState(null);
  const [userStats, setUserStats]       = useState(null);
  const [downloadLogs, setDownloadLogs] = useState([]);
  const [isLoading, setIsLoading]       = useState(true);

  const loadDashboard = async () => {
    setIsLoading(true);
    try {
      const [statsRes, usersRes, logsRes] = await Promise.all([
        complaintApi.getStatistics(),
        userApi.listUsers(0, 100),
        complaintApi.listDownloadLogs(),
      ]);
      setStatistics(statsRes.data);
      setUserStats(usersRes.data);
      setDownloadLogs(logsRes.data || []);
    } catch {
      toast.error('Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadDashboard(); }, []);

  const formatDateTime = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  if (isLoading || !statistics) {
    return (
      <div className="flex justify-center items-center h-96">
        <FiLoader className="animate-spin text-3xl text-blue-600" />
      </div>
    );
  }

  const chartData = [
    { name: 'Submitted',    value: statistics.submitted },
    { name: 'Under Review', value: statistics.under_review },
    { name: 'Acknowledged', value: statistics.acknowledged },
    { name: 'Resolved',     value: statistics.resolved },
    { name: 'Closed',       value: statistics.closed },
  ];

  const disasterData = Object.entries(statistics.by_disaster_type).map(
    ([name, value]) => ({ name, value })
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">System overview and management</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/admin/forms')}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <FiFileText size={16} />
            Form Builder
          </button>
          <button
            onClick={loadDashboard}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <FiRefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Key Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Reports</p>
              <p className="text-3xl font-bold text-gray-900">{statistics.total_complaints}</p>
            </div>
            <FiFileText className="text-4xl text-blue-600 opacity-20" />
          </div>
        </div>
        <div className="card bg-gradient-to-br from-yellow-50 to-yellow-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Under Review</p>
              <p className="text-3xl font-bold text-gray-900">{statistics.under_review}</p>
            </div>
            <FiAlertTriangle className="text-4xl text-yellow-600 opacity-20" />
          </div>
        </div>
        <div className="card bg-gradient-to-br from-green-50 to-green-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Resolved</p>
              <p className="text-3xl font-bold text-gray-900">{statistics.resolved}</p>
            </div>
            <FiCheckCircle className="text-4xl text-green-600 opacity-20" />
          </div>
        </div>
        <div className="card bg-gradient-to-br from-purple-50 to-purple-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Users</p>
              <p className="text-3xl font-bold text-gray-900">{userStats?.length || 0}</p>
            </div>
            <FiUsers className="text-4xl text-purple-600 opacity-20" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Reports by Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Reports by Shop Type</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={disasterData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button onClick={() => navigate('/complaints')} className="btn-primary text-left">
            <div className="font-semibold">View All Reports</div>
            <div className="text-sm opacity-75">Manage all submitted shop reports</div>
          </button>
          <button onClick={() => navigate('/admin/users')} className="btn-secondary text-left">
            <div className="font-semibold">Manage Users</div>
            <div className="text-sm opacity-75">View and manage user accounts</div>
          </button>
          <button onClick={() => navigate('/map')} className="btn-success text-left">
            <div className="font-semibold">View Map</div>
            <div className="text-sm opacity-75">Visualize shop violations on map</div>
          </button>
          <button onClick={() => navigate('/admin/kobo')} className="btn-warning text-left">
            <div className="font-semibold">Kobo Data</div>
            <div className="text-sm opacity-75">Manage KoboToolbox sync</div>
          </button>
        </div>
      </div>

      {/* Data Download Audit Log */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FiDownload size={18} className="text-blue-600" />
            <h3 className="text-lg font-bold text-gray-900">Data Download Audit Log</h3>
          </div>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">
            {downloadLogs.length} total downloads
          </span>
        </div>
        {downloadLogs.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <FiDownload size={32} className="mx-auto mb-2 text-gray-200" />
            <p className="text-sm">No downloads recorded yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  {['User', 'Full Name', 'Organization', 'Purpose', 'Records', 'Downloaded At'].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {downloadLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center">
                          {(log.user?.username || '?')[0].toUpperCase()}
                        </div>
                        <span className="text-gray-700 text-xs">{log.user?.email || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{log.full_name}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{log.organization || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                        {log.purpose}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-semibold text-gray-800">{log.record_count}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <FiCalendar size={11} />
                        {formatDateTime(log.downloaded_at)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Users */}
      {userStats && userStats.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Users</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200">
                <tr className="text-gray-600">
                  <th className="text-left pb-3 px-4">Name</th>
                  <th className="text-left pb-3 px-4">Email</th>
                  <th className="text-left pb-3 px-4">Role</th>
                  <th className="text-left pb-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {userStats.slice(0, 5).map((u) => (
                  <tr key={u.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-4">{u.full_name || u.username}</td>
                    <td className="py-3 px-4">{u.email}</td>
                    <td className="py-3 px-4 capitalize">{u.role}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        u.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Non-admin demo view ──────────────────────────────────────────────────────

function UserView({ roleLabel, navigate }) {
  const actionCards = useMemo(() => [
    { label: 'Open GIS Map',       path: '/map',        style: 'bg-blue-600' },
    { label: 'Case Board',         path: '/tasks',      style: 'bg-slate-600' },
    { label: 'Reports Library',    path: '/reports',    style: 'bg-emerald-600' },
    { label: 'Inspector Schedule', path: '/scheduling', style: 'bg-violet-600' },
  ], []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{roleLabel} Dashboard</h1>
          <p className="text-gray-500 mt-2 max-w-2xl">
            Real-time operational insights, violation summaries, and live workflow status for the GeoAI enforcement platform.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 w-full sm:w-auto">
          {DEMO_DASHBOARD_CARDS.map((item) => (
            <div key={item.title} className={`rounded-3xl p-4 shadow-sm border border-gray-100 bg-gradient-to-br ${item.color}`}>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{item.title}</p>
              <p className="mt-3 text-3xl font-bold text-slate-900">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="card col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Violation trend by district</h2>
              <p className="text-sm text-gray-500">Latest hotspots and inspection priority zones.</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={DEMO_VIOLATION_DISTRICT} margin={{ top: 12, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#2563eb" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Detection confidence</h2>
            <p className="text-sm text-gray-500">AI inference distribution for the latest dataset.</p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={DEMO_DETECTION_CONFIDENCE} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={90} innerRadius={42} paddingAngle={4}>
                  {DEMO_DETECTION_CONFIDENCE.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Compliance trend</h2>
              <p className="text-sm text-gray-500">Weekly score cadence for inspected districts.</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={DEMO_COMPLIANCE_TREND} margin={{ top: 12, right: 16, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis domain={[60, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={3} dot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Live task queue</h2>
              <p className="text-sm text-gray-500">Open assignments from today&apos;s enforcement pipeline.</p>
            </div>
            <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              {DEMO_TASKS.length} items
            </span>
          </div>
          <div className="space-y-3">
            {DEMO_TASKS.slice(0, 4).map((task) => (
              <div key={task.id} className="rounded-3xl border border-slate-200 p-4 bg-slate-50">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-gray-900">{task.title}</p>
                  <span className="text-xs uppercase tracking-[0.15em] text-slate-500">{task.priority}</span>
                </div>
                <p className="text-sm text-slate-500">{task.district} · {task.assignment}</p>
                <p className="text-sm text-slate-500 mt-2">Due {task.due}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {actionCards.map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(item.path)}
            className={`${item.style} rounded-3xl p-4 text-white shadow-lg hover:opacity-95 transition-opacity`}
          >
            <p className="text-sm opacity-90">{item.label}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const role = user?.role || 'user';
  const isAdmin = ['admin', 'super_admin'].includes(role);

  if (isAdmin) return <AdminView navigate={navigate} />;
  return <UserView roleLabel={getRoleLabel(role)} navigate={navigate} />;
}
