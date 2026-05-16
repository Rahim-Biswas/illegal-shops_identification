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
  FiRefreshCw, FiTrash2, FiDownload, FiArrowLeft, FiDatabase, FiLoader,
} from 'react-icons/fi';

export default function KoboAdmin() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [submissions, setSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (user?.role && !['admin', 'super_admin'].includes(user.role)) {
      navigate('/complaints');
      return;
    }
    if (user) loadSubmissions();
  }, [user]);

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
          >
            <FiArrowLeft size={20} />
            Back to Admin
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">KoboToolbox Data</h1>
            <p className="text-gray-600 mt-1">Manage data synchronization</p>
          </div>
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
          Sync pulls new submissions from KoboToolbox. Clear removes all locally synced complaints.
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
                    <h4 className="font-semibold">{sub.reporter_name || 'Anonymous'}</h4>
                    <p className="text-sm text-gray-600">
                      {sub.disaster_type} • {new Date(sub.incident_date).toLocaleDateString()}
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