// ─────────────────────────────────────────────────────────────────────────────
// App.jsx
// Root routing configuration for the Apex Care Feedback Engine.
//
// PRD Reference: §5 User Roles & Permissions, §7/§8/§9 Phase routing
//
// Route map:
//   /             → Redirects to /login
//   /login        → LoginPage (public — unauthenticated only)
//   /staff        → StaffPortal (protected — role: "staff")
//   /management   → ManagementDashboard (protected — role: "management")
//   *             → Redirects to /login (404 fallback)
//
// All role enforcement is handled inside <ProtectedRoute>.
// AuthContext provides session + role state via Supabase.
// ─────────────────────────────────────────────────────────────────────────────

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import StaffPortal from './pages/StaffPortal';
import ManagementDashboard from './pages/ManagementDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>

          {/* ── Public root → redirect to login ── */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* ── Login page (public) ── */}
          <Route path="/login" element={<LoginPage />} />

          {/* ── Staff Portal (protected: role = "staff") ── */}
          <Route
            path="/staff"
            element={
              <ProtectedRoute allowedRole="staff">
                <StaffPortal />
              </ProtectedRoute>
            }
          />

          {/* ── Management Dashboard (protected: role = "management") ── */}
          <Route
            path="/management"
            element={
              <ProtectedRoute allowedRole="management">
                <ManagementDashboard />
              </ProtectedRoute>
            }
          />

          {/* ── 404 fallback → redirect to login ── */}
          <Route path="*" element={<Navigate to="/login" replace />} />

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
