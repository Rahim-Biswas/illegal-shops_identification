/**
 * Main App component with routing
 * - Fixes AdminRoute hydration race condition
 * - Role-based redirect after login
 * - KoboToolbox data page route added
 */
import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { useAuthStore } from './store/store';
import Layout from './components/Layout';
import 'react-toastify/dist/ReactToastify.css';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import ComplaintsList from './pages/ComplaintsList';
import ComplaintForm from './pages/ComplaintForm';
import ComplaintDetail from './pages/ComplaintDetail';
import MapPage from './pages/MapPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import Profile from './pages/Profile';
import KoboDataPage from './pages/KoboDataPage';

// --- Protected Route: requires a valid token in the store ---
// Store is hydrated synchronously from localStorage, so this check
// is always correct even on a hard page refresh.
const ProtectedRoute = ({ children }) => {
  const { token } = useAuthStore();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// --- Admin Route: requires token + admin role ---
const AdminRoute = ({ children }) => {
  const { token, user } = useAuthStore();

  if (!token) return <Navigate to="/login" replace />;
  if (user && user.role !== 'admin') return <Navigate to="/complaints" replace />;

  return children;
};

export default function App() {
  const { initAuth } = useAuthStore();

  useEffect(() => {
    initAuth();
  }, []);

  return (
    <>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes — wrapped in Layout */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    {/* ---- User Routes ---- */}
                    <Route path="/complaints" element={<ComplaintsList />} />
                    <Route path="/complaints/new" element={<ComplaintForm />} />
                    <Route path="/complaints/:id" element={<ComplaintDetail />} />
                    <Route path="/complaints/:id/edit" element={<ComplaintForm />} />
                    <Route path="/profile" element={<Profile />} />

                    {/* ---- Admin-Only Routes ---- */}
                    <Route
                      path="/map"
                      element={
                        <ProtectedRoute>
                          <MapPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin"
                      element={
                        <AdminRoute>
                          <AdminDashboard />
                        </AdminRoute>
                      }
                    />
                    <Route
                      path="/admin/users"
                      element={
                        <AdminRoute>
                          <AdminUsers />
                        </AdminRoute>
                      }
                    />
                    <Route
                      path="/admin/kobo"
                      element={
                        <AdminRoute>
                          <KoboDataPage />
                        </AdminRoute>
                      }
                    />

                    {/* Default redirect based on nothing matched */}
                    <Route path="/" element={<Navigate to="/complaints" replace />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>

      <ToastContainer
        position="bottom-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
    </>
  );
}
