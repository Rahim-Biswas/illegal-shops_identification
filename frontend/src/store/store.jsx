/**
 * Global state management using Zustand
 */
import { create } from 'zustand';
import { authApi } from '../services/api';

// Read stored credentials synchronously so state is correct on the very first render.
// This prevents ProtectedRoute from redirecting to /login on a page refresh.
const _storedToken = localStorage.getItem('access_token');
const _storedUser  = JSON.parse(localStorage.getItem('user') || 'null');

export const useAuthStore = create((set) => ({
  user:        _storedToken && _storedUser ? _storedUser : null,
  token:       _storedToken && _storedUser ? _storedToken : null,
  isHydrated:  true,   // always true now — hydration is synchronous
  isLoading:   false,
  error:       null,

  // Kept for backward compatibility — now a no-op since state is pre-hydrated.
  initAuth: () => {
    const token = localStorage.getItem('access_token');
    const user  = JSON.parse(localStorage.getItem('user') || 'null');
    if (token && user) {
      set({ user, token, isHydrated: true });
    } else {
      set({ user: null, token: null, isHydrated: true });
    }
  },

  // Login — returns { success: bool, user, message }
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.login({ email, password });
      const { access_token, user } = response.data;

      localStorage.setItem('access_token', access_token);
      localStorage.setItem('user', JSON.stringify(user));

      set({ user, token: access_token, isLoading: false });
      return { success: true, user };
    } catch (error) {
      const message = error.response?.data?.detail || 'Login failed';
      set({ error: message, isLoading: false });
      return { success: false, message };
    }
  },

  // Register
  register: async (userData) => {
    set({ isLoading: true, error: null });
    try {
      await authApi.register(userData);
      set({ isLoading: false });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.detail || 'Registration failed';
      set({ error: message, isLoading: false });
      return { success: false, message };
    }
  },

  // Logout
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    set({ user: null, token: null, error: null });
  },

  // Update user profile
  updateUserProfile: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },

  // Clear error
  clearError: () => set({ error: null }),
}));

// Complaints store
export const useComplaintsStore = create((set) => ({
  complaints: [],
  selectedComplaint: null,
  isLoading: false,
  error: null,
  totalComplaints: 0,
  currentPage: 0,
  pageSize: 10,

  setComplaintsError: (error) => set({ error }),
  clearError: () => set({ error: null }),
  setSelectedComplaint: (complaint) => set({ selectedComplaint: complaint }),
  setLoading: (isLoading) => set({ isLoading }),
  setComplaints: (complaints, total, page) =>
    set({ complaints, totalComplaints: total, currentPage: page }),
}));

// Admin store
export const useAdminStore = create((set) => ({
  statistics: null,
  mapData: [],
  isLoading: false,
  error: null,

  setStatistics: (statistics) => set({ statistics }),
  setMapData: (mapData) => set({ mapData }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
}));
