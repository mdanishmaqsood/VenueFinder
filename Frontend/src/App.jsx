import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './components/layout/Navbar.jsx';
import Home from './pages/Home.jsx';
import Shortlist from './pages/Shortlist.jsx';
import Login from './pages/Login.jsx';
import VenueDetail from './pages/VenueDetail.jsx';
import ProtectedRoute from './components/auth/ProtectedRoute.jsx';
import ToastViewport from './components/common/ToastViewport.jsx';
import { useAuth } from './context/AuthContext.jsx';

export default function App() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const isLoginRoute = location.pathname === '/';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {!isLoginRoute && <Navbar />}
      <main
        className={
          isLoginRoute ? '' : 'mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10'
        }
      >
        <Routes>
          <Route
            path="/"
            element={
              isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/venues/:id"
            element={
              <ProtectedRoute>
                <VenueDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/shortlist"
            element={
              <ProtectedRoute>
                <Shortlist />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <ToastViewport />
    </div>
  );
}
