/**
 * Complaints listing page
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { complaintApi } from '../services/api';
import { useComplaintsStore, useAuthStore } from '../store/store';
import { formatDate, getStatusColor, getSeverityColor } from '../utils/helpers';
import { toast } from 'react-toastify';
import { FiPlus, FiEye, FiEdit2, FiTrash2, FiFilter } from 'react-icons/fi';

const STATUSES = ['submitted', 'under_review', 'acknowledged', 'resolved', 'closed'];
const DISASTER_TYPES = ['Landslide', 'Flood', 'Earthquake', 'Fire', 'Storm', 'Other'];

export default function ComplaintsList() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { complaints, setComplaints, setLoading, setComplaintsError } = useComplaintsStore();
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({
    status: '',
    disasterType: '',
  });

  const pageSize = 10;

  useEffect(() => {
    loadComplaints();
  }, [page, filters]);

  const loadComplaints = async () => {
    setIsLoading(true);
    try {
      const response = await complaintApi.listComplaints(
        page * pageSize,
        pageSize,
        filters.status || undefined,
        filters.disasterType || undefined
      );
      setComplaints(response.data.items, response.data.total, page);
    } catch (error) {
      setComplaintsError(error.message);
      toast.error('Failed to load complaints');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (complaintId) => {
    if (window.confirm('Are you sure you want to delete this complaint?')) {
      try {
        await complaintApi.deleteComplaint(complaintId);
        toast.success('Complaint deleted successfully');
        loadComplaints();
      } catch (error) {
        toast.error('Failed to delete complaint');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Complaints</h1>
          <p className="text-gray-600 mt-1">Manage and track all your disaster reports</p>
        </div>
        <button
          onClick={() => navigate('/complaints/new')}
          className="btn-primary flex items-center"
        >
          <FiPlus size={20} className="mr-2" />
          New Complaint
        </button>
      </div>

      {/* Filters */}
      <div className="card space-y-4">
        <h3 className="font-semibold text-gray-900">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Status</label>
            <select
              value={filters.status}
              onChange={(e) => {
                setFilters({ ...filters, status: e.target.value });
                setPage(0);
              }}
              className="input-field"
            >
              <option value="">All Statuses</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.replace('_', ' ').toUpperCase()}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Disaster Type</label>
            <select
              value={filters.disasterType}
              onChange={(e) => {
                setFilters({ ...filters, disasterType: e.target.value });
                setPage(0);
              }}
              className="input-field"
            >
              <option value="">All Types</option>
              {DISASTER_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Complaints Table */}
      <div className="card">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin">Loading...</div>
          </div>
        ) : complaints.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No complaints found</p>
            <button
              onClick={() => navigate('/complaints/new')}
              className="btn-primary"
            >
              Create First Complaint
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200">
                <tr className="text-left text-sm font-semibold text-gray-600">
                  <th className="pb-3 px-4">Title</th>
                  <th className="pb-3 px-4">Type</th>
                  <th className="pb-3 px-4">Status</th>
                  <th className="pb-3 px-4">Severity</th>
                  <th className="pb-3 px-4">Location</th>
                  <th className="pb-3 px-4">Date</th>
                  <th className="pb-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map((complaint) => (
                  <tr
                    key={complaint.id}
                    className="border-b border-gray-200 hover:bg-gray-50 transition"
                  >
                    <td className="py-4 px-4 font-medium text-gray-900">
                      {complaint.title}
                    </td>
                    <td className="py-4 px-4 text-gray-600">{complaint.disaster_type}</td>
                    <td className="py-4 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(complaint.status)}`}>
                        {complaint.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      {complaint.severity ? (
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getSeverityColor(complaint.severity)}`}>
                          {complaint.severity}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-gray-600">
                      {complaint.location_name || 'N/A'}
                    </td>
                    <td className="py-4 px-4 text-gray-600 text-sm">
                      {formatDate(complaint.created_at)}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => navigate(`/complaints/${complaint.id}`)}
                          className="p-2 hover:bg-blue-50 rounded text-blue-600 transition"
                          title="View"
                        >
                          <FiEye size={18} />
                        </button>
                        <button
                          onClick={() => navigate(`/complaints/${complaint.id}/edit`)}
                          className="p-2 hover:bg-yellow-50 rounded text-yellow-600 transition"
                          title="Edit"
                        >
                          <FiEdit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(complaint.id)}
                          className="p-2 hover:bg-red-50 rounded text-red-600 transition"
                          title="Delete"
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {complaints.length > 0 && (
          <div className="border-t border-gray-200 mt-4 pt-4 flex items-center justify-between">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-gray-600">
              Page {page + 1}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
