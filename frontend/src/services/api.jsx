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
  createUser: (data) => api.post('/users/create-user', data),
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
  createForm: (data) => api.post('/kobo/forms', data),
  updateForm: (assetUid, data) => api.patch(`/kobo/forms/${assetUid}`, data),
  deleteForm: (assetUid) => api.delete(`/kobo/forms/${assetUid}`),
  getFormDefinition: (assetUid) => api.get(`/kobo/forms/${assetUid}`),
  submitToForm: (assetUid, data) => api.post(`/kobo/forms/${assetUid}/submit`, data),
};

// ============= MinIO Street-Data APIs =============

export const minioApi = {
  /** Full recursive tree */
  listAllFolders: () => api.get('/minio/folders'),

  /** Subtree for a specific folder */
  listFolder: (folder) => api.get(`/minio/folders/${folder}`),

  /** Get GPS coordinates of all images in a specific folder */
  getFolderGps: (folder) => api.get(`/minio/folder-gps/${folder}`),

  /** Upload files (FormData with `files` field) into a folder path */
  uploadFiles: (folderPath, formData) =>
    api.post(`/minio/folders/${folderPath}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  /** Delete entire folder prefix OR single file key */
  deletePath: (path) => api.delete(`/minio/folders/${path}`),

  /** Create a virtual folder (places a .keep placeholder) */
  createFolder: (path) => api.post('/minio/create-folder', { path }),

  /**
   * Returns the URL to stream/preview a file through the FastAPI proxy.
   * Uses the same base URL as all other API calls.
   */
  getStreamUrl: (fullKey) => {
    const base = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api')
      .replace(/\/+$/, '');
    return `${base}/minio/stream/${fullKey}`;
  },
};

// ============= YOLO Detection APIs =============

export const yoloApi = {
  /** Service health / loaded model info */
  status: () => api.get('/yolo/status'),

  /**
   * Submit a detection job.
   * @param {string[]} fileKeys  – MinIO object keys
   * @param {number}   conf
   * @param {number}   iou
   */
  detect: (fileKeys, conf = 0.5, iou = 0.45) =>
    api.post('/yolo/detect', { file_keys: fileKeys, conf, iou }),

  /** Poll a running job */
  pollJob: (jobId) => api.get(`/yolo/result/${jobId}`),

  /** List all recent jobs */
  listJobs: () => api.get('/yolo/jobs'),

  /** Delete / clear a job */
  deleteJob: (jobId) => api.delete(`/yolo/jobs/${jobId}`),

  /**
   * Build the URL to stream an annotated result image.
   * @param {string} jobId
   * @param {string} filename – original filename of the result
   */
  getResultImageUrl: (jobId, filename) => {
    const base = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace(/\/+$/, '');
    return `${base}/yolo/stream-result/${jobId}/${filename}`;
  },
};

// ============= Custom Data File APIs =============

export const customDataApi = {
  uploadFile: (formData) =>
    api.post('/data-files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  listFiles: () => api.get('/data-files/list'),
  previewFile: (filename, limit = 20) =>
    api.get(`/data-files/preview/${encodeURIComponent(filename)}`, { params: { limit } }),
  deleteFile: (filename) => api.delete(`/minio/folders/custom-data/${encodeURIComponent(filename)}`),
  searchOcr: (ocrResults) => api.post('/data-files/search-ocr', { ocr_results: ocrResults }),
};

// ============= OCR APIs =============

export const ocrApi = {
  /** Run OCR on all images in a MinIO folder */
  runFolderOcr: (folderPath) =>
    api.post('/ocr/folder', { folder: folderPath }),
};

export default api;
