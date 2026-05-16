/**
 * Admin dashboard page
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { complaintApi, userApi } from '../services/api';
import { useAuthStore } from '../store/store';
import { toast } from 'react-toastify';
import {
  FiUsers, FiFileText, FiAlertTriangle, FiCheckCircle, FiLoader,
  FiDownload, FiCalendar, FiUser, FiRefreshCw,
} from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [statistics, setStatistics]     = useState(null);
  const [userStats, setUserStats]       = useState(null);
  const [downloadLogs, setDownloadLogs] = useState([]);
  const [isLoading, setIsLoading]       = useState(true);

  useEffect(() => {
    if (user?.role && !['admin', 'super_admin'].includes(user.role)) {
      navigate('/complaints');
      return;
    }
    if (user) loadDashboard();
  }, [user]);

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
    } catch (error) {
      toast.error('Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  if (!statistics || isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <FiLoader className="animate-spin text-3xl text-blue-600" />
      </div>
    );
  }

  const chartData = [
    { name: 'Submitted', value: statistics.submitted },
    { name: 'Under Review', value: statistics.under_review },
    { name: 'Acknowledged', value: statistics.acknowledged },
    { name: 'Resolved', value: statistics.resolved },
    { name: 'Closed', value: statistics.closed },
  ];

  const disasterData = Object.entries(statistics.by_disaster_type).map(
    ([name, value]) => ({ name, value })
  );

  const formatDateTime = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

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
              <p className="text-gray-600 text-sm">Total Complaints</p>
              <p className="text-3xl font-bold text-gray-900">
                {statistics.total_complaints}
              </p>
            </div>
            <FiFileText className="text-4xl text-blue-600 opacity-20" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-yellow-50 to-yellow-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Under Review</p>
              <p className="text-3xl font-bold text-gray-900">
                {statistics.under_review}
              </p>
            </div>
            <FiAlertTriangle className="text-4xl text-yellow-600 opacity-20" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-green-50 to-green-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Resolved</p>
              <p className="text-3xl font-bold text-gray-900">
                {statistics.resolved}
              </p>
            </div>
            <FiCheckCircle className="text-4xl text-green-600 opacity-20" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-purple-50 to-purple-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Users</p>
              <p className="text-3xl font-bold text-gray-900">
                {userStats?.length || 0}
              </p>
            </div>
            <FiUsers className="text-4xl text-purple-600 opacity-20" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="card">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Complaints by Status</h3>
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

        {/* Disaster Type Distribution */}
        <div className="card">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Complaints by Type</h3>
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
          <button
            onClick={() => navigate('/complaints')}
            className="btn-primary text-left"
          >
            <div className="font-semibold">View All Complaints</div>
            <div className="text-sm opacity-75">Manage all submitted complaints</div>
          </button>
          <button
            onClick={() => navigate('/admin/users')}
            className="btn-secondary text-left"
          >
            <div className="font-semibold">Manage Users</div>
            <div className="text-sm opacity-75">View and manage user accounts</div>
          </button>
          <button
            onClick={() => navigate('/map')}
            className="btn-success text-left"
          >
            <div className="font-semibold">View Map</div>
            <div className="text-sm opacity-75">Visualize complaints on map</div>
          </button>
          <button
            onClick={() => navigate('/admin/kobo')}
            className="btn-warning text-left"
          >
            <div className="font-semibold">Kobo Data</div>
            <div className="text-sm opacity-75">Manage KoboToolbox sync</div>
          </button>
        </div>
      </div>

      {/* ── Data Download Audit Log ── */}
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
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          u.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
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

