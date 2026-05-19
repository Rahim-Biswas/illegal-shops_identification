/**
 * KoboToolbox Data Management Page
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { koboApi } from '../services/api';
import api from '../services/api';
import { useAuthStore } from '../store/store';
import { toast } from 'react-toastify';
import {
  FiRefreshCw, FiTrash2, FiArrowLeft, FiDatabase, FiLoader,
  FiCheckCircle, FiClock, FiZap,
} from 'react-icons/fi';

export default function KoboAdmin() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [submissions, setSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);

  useEffect(() => {
    if (user?.role && !['admin', 'super_admin'].includes(user.role)) {
      navigate('/complaints');
      return;
    }
    if (user) {
      loadSubmissions();
      fetchSyncStatus();
    }
  }, [user]);

  // Poll sync status every 30s so the UI reflects auto-sync updates
  useEffect(() => {
    const interval = setInterval(fetchSyncStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchSyncStatus = async () => {
    try {
      const res = await api.get('/kobo/sync-status');
      setSyncStatus(res.data);
    } catch (_) {}
  };

  const loadSubmissions = async () => {
    setIsLoading(true);
    try {
      const response = await koboApi.getSubmissions(50);
      setSubmissions(response.data.results || []);
    } catch (error) {
      toast.error('Failed to load Kobo submissions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await koboApi.syncSubmissions();
      toast.success('Kobo data synced successfully');
      loadSubmissions(); // Refresh
    } catch (error) {
      toast.error('Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearData = async () => {
    if (!window.confirm('Are you sure you want to delete all Kobo-synced complaints from the database?')) {
      return;
    }
    try {
      const response = await api.delete('/kobo/data');
      toast.success('Kobo data cleared');
      loadSubmissions();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error clearing data');
    }
  };

  if (!user || !['admin', 'super_admin'].includes(user.role)) {
    return <div>Access denied</div>;
  }

  return (
    <div className="space-y-6">
      {/* Auto-Sync Status Banner */}
      <div className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-5 py-3">
        <FiZap size={18} className="text-green-600 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-green-800">
            Auto-Sync is Active — New submissions appear automatically every 2 minutes
          </p>
          {syncStatus?.last_sync_time ? (
            <p className="text-xs text-green-600 mt-0.5">
              <FiClock size={11} className="inline mr-1" />
              Last synced: {new Date(syncStatus.last_sync_time).toLocaleTimeString()} &nbsp;•&nbsp;
              {syncStatus.last_created} new record(s) imported
            </p>
          ) : (
            <p className="text-xs text-green-600 mt-0.5">Waiting for first auto-sync cycle…</p>
          )}
        </div>
        <FiCheckCircle size={20} className="text-green-500 flex-shrink-0" />
      </div>

      {/* Back Button */}
      <div>
        <button
          onClick={() => navigate('/data-house')}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <FiArrowLeft size={16} /> Back to Data House
        </button>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">KoboToolbox Sync</h1>
          <p className="text-gray-600 mt-1">Shop inspection data synchronization</p>
        </div>
      </div>

      {/* Actions */}
      <div className="card">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Data Management</h3>
        <div className="flex gap-4">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            {isSyncing ? <FiLoader className="animate-spin" size={16} /> : <FiRefreshCw size={16} />}
            Sync Data
          </button>
          <button
            onClick={handleClearData}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
          >
            <FiTrash2 size={16} />
            Clear Synced Data
          </button>
          <button
            onClick={loadSubmissions}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
          >
            <FiDatabase size={16} />
            Refresh List
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Sync pulls new shop inspection submissions from KoboToolbox. Clear removes all locally synced reports.
        </p>
      </div>

      {/* Submissions List */}
      <div className="card">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Recent Submissions ({submissions.length})
        </h3>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <FiLoader className="animate-spin text-2xl text-blue-600" />
          </div>
        ) : submissions.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No submissions found</p>
        ) : (
          <div className="space-y-4">
            {submissions.slice(0, 10).map((sub) => (
              <div key={sub.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                  <h4 className="font-semibold">{sub.inspector_name || sub.reporter_name || 'Anonymous'}</h4>
                  <p className="text-sm text-gray-600">
                    {sub.violation_type || sub.disaster_type || 'Unknown Violation'} • {sub.shop_name || 'Unknown Shop'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Zone: {sub.municipality_zone || 'N/A'} • {new Date(sub.submission_time).toLocaleDateString()}
                  </p>
                  {sub.latitude && sub.longitude && (
                    <p className="text-xs text-gray-500">
                      📍 {sub.latitude.toFixed(4)}, {sub.longitude.toFixed(4)}
                    </p>
                  )}
                </div>
                  <div className="text-right text-sm text-gray-500">
                    {new Date(sub.submission_time).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}