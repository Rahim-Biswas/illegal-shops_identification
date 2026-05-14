/**
 * API service for communication with the backend
 */
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ============= Authentication APIs =============

export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getCurrentUser: () => api.get('/auth/me'),
};

// ============= User APIs =============

export const userApi = {
  getProfile: () => api.get('/users/me'),
  updateProfile: (data) => api.put('/users/me', data),
  listUsers: (skip = 0, limit = 100) =>
    api.get('/users', { params: { skip, limit } }),
  getUser: (userId) => api.get(`/users/${userId}`),
  deleteUser: (userId) => api.delete(`/users/${userId}`),
  deactivateUser: (userId) => api.patch(`/users/${userId}/deactivate`),
  toggleUserActive: (userId) => api.patch(`/users/${userId}/toggle-active`),
  createAdmin: (data) => api.post('/users/create-admin', data),
};

// ============= Complaint APIs =============

export const complaintApi = {
  createComplaint: (data) => api.post('/complaints', data),
  listComplaints: (skip = 0, limit = 10, status = null, disasterType = null) =>
    api.get('/complaints', {
      params: { skip, limit, status, disaster_type: disasterType },
    }),
  getComplaint: (complaintId) => api.get(`/complaints/${complaintId}`),
  updateComplaint: (complaintId, data) =>
    api.put(`/complaints/${complaintId}`, data),
  deleteComplaint: (complaintId) => api.delete(`/complaints/${complaintId}`),
  getStatistics: () => api.get('/complaints/admin/statistics'),
  getMapData: () => api.get('/complaints/admin/map-data'),       // admin: all complaints
  getPublicMapData: () => api.get('/complaints/map-data'),        // all users: own complaints (admin = all)
  logDownload: (data) => api.post('/complaints/download-log', data),
  listDownloadLogs: () => api.get('/complaints/admin/download-logs'),
};

// ============= Comment APIs =============

export const commentApi = {
  addComment: (complaintId, data) =>
    api.post(`/complaints/${complaintId}/comments`, data),
  getComments: (complaintId) =>
    api.get(`/complaints/${complaintId}/comments`),
};

// ============= KoboToolbox APIs =============

export const koboApi = {
  getSubmissions: (limit = 100, offset = 0) =>
    api.get('/kobo/submissions', { params: { limit, offset } }),
  getSubmission: (id) => api.get(`/kobo/submissions/${id}`),
  syncSubmissions: () => api.post('/kobo/sync'),
  getForms: () => api.get('/kobo/forms'),
};

export default api;
