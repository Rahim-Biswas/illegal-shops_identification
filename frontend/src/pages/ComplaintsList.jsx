/**
 * Shop violation reports listing page
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { complaintApi } from '../services/api';
import { useComplaintsStore, useAuthStore } from '../store/store';
import { formatDate, getStatusColor, getSeverityColor } from '../utils/helpers';
import { toast } from 'react-toastify';
import { FiPlus, FiEye, FiEdit2, FiTrash2, FiFilter } from 'react-icons/fi';

const STATUSES = ['submitted', 'under_review', 'acknowledged', 'resolved', 'closed'];
const SHOP_TYPES = ['Restaurant', 'Retail', 'Warehouse', 'Market Stall', 'Kiosk', 'Service Shop', 'Other'];

export default function ComplaintsList() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { complaints: reports, setComplaints, setLoading, setComplaintsError } = useComplaintsStore();
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({
    status: '',
    shopType: '',
  });

  const pageSize = 10;

  useEffect(() => {
    loadReports();
  }, [page, filters]);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const response = await complaintApi.listComplaints(
        page * pageSize,
        pageSize,
        filters.status || undefined,
        filters.shopType || undefined
      );
      setComplaints(response.data.items, response.data.total, page);
    } catch (error) {
      setComplaintsError(error.message);
      toast.error('Failed to load shop reports');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (reportId) => {
    if (window.confirm('Are you sure you want to delete this report?')) {
      try {
        await complaintApi.deleteComplaint(reportId);
        toast.success('Report deleted successfully');
        loadReports();
      } catch (error) {
        toast.error('Failed to delete report');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Shop Reports</h1>
          <p className="text-gray-600 mt-1">Manage and track all illegal shop detection reports</p>
        </div>
        <button
          onClick={() => navigate('/complaints/new')}
          className="btn-primary flex items-center"
        >
          <FiPlus size={20} className="mr-2" />
          New Report
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
            <label className="form-label">Violation Type</label>
            <select
              value={filters.shopType}
              onChange={(e) => {
                setFilters({ ...filters, shopType: e.target.value });
                setPage(0);
              }}
              className="input-field"
            >
              <option value="">All Types</option>
              {SHOP_TYPES.map((type) => (
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
            <p className="text-gray-500 mb-4">No reports found</p>
            <button
              onClick={() => navigate('/complaints/new')}
              className="btn-primary"
            >
              Create First Report
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200">
                <tr className="text-left text-sm font-semibold text-gray-600">
                  <th className="pb-3 px-4">Title</th>
                  <th className="pb-3 px-4">Shop Type</th>
                  <th className="pb-3 px-4">Status</th>
                  <th className="pb-3 px-4">Severity</th>
                  <th className="pb-3 px-4">Location</th>
                  <th className="pb-3 px-4">Date</th>
                  <th className="pb-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(reports || []).map((report) => (
                  <tr
                    key={report.id}
                    className="border-b border-gray-200 hover:bg-gray-50 transition"
                  >
                    <td className="py-4 px-4 font-medium text-gray-900">
                      {report.title}
                    </td>
                    <td className="py-4 px-4 text-gray-600">{report.disaster_type}</td>
                    <td className="py-4 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(report.status)}`}>
                        {report.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      {report.severity ? (
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getSeverityColor(report.severity)}`}>
                          {report.severity}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-gray-600">
                      {report.location_name || 'N/A'}
                    </td>
                    <td className="py-4 px-4 text-gray-600 text-sm">
                      {formatDate(report.created_at)}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => navigate(`/complaints/${report.id}`)}
                          className="p-2 hover:bg-blue-50 rounded text-blue-600 transition"
                          title="View"
                        >
                          <FiEye size={18} />
                        </button>
                        <button
                          onClick={() => navigate(`/complaints/${report.id}/edit`)}
                          className="p-2 hover:bg-yellow-50 rounded text-yellow-600 transition"
                          title="Edit"
                        >
                          <FiEdit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(report.id)}
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
