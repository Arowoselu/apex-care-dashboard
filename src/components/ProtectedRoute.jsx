// ─────────────────────────────────────────────────────────────────────────────
// ProtectedRoute.jsx
// Route guard component that enforces authentication and role-based access.
//
// PRD Reference: §5 User Roles & Permissions, §10.1 Security
//
// Behaviour:
//   1. While auth is loading → shows a full-screen spinner (prevents flash of content)
//   2. If no session → redirects to /login
//   3. If session exists but user's role does NOT match allowedRole:
//      - "staff"      → redirected to /staff
//      - "management" → redirected to /management
//      - unknown role → redirected to /login (safety fallback)
//   4. If role matches allowedRole → renders the child page component
//
// Usage in App.jsx:
//   <Route path="/staff" element={<ProtectedRoute allowedRole="staff"><StaffPortal /></ProtectedRoute>} />
//   <Route path="/management" element={<ProtectedRoute allowedRole="management"><ManagementDashboard /></ProtectedRoute>} />
// ─────────────────────────────────────────────────────────────────────────────

import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Maps a role to its correct home route.
// Used to redirect users who land on the wrong route.
const ROLE_HOME = {
  staff:      '/staff',
  management: '/management',
};

export default function ProtectedRoute({ allowedRole, children }) {
  const { session, role, loading } = useAuth();

  // ── State 1: Auth is still resolving ─────────────────────────────────────
  // Show a centered spinner. Prevents an unauthenticated flash before the
  // session is confirmed from localStorage.
  if (loading) {
    return (
      <div style={styles.loadingWrapper}>
        <div style={styles.spinner} aria-label="Loading..." />
      </div>
    );
  }

  // ── State 2: No active session → send to login ────────────────────────────
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // ── State 3: Authenticated but wrong role → redirect to own home route ────
  // Example: a staff member manually navigating to /management is bounced back.
  if (role !== allowedRole) {
    const correctPath = ROLE_HOME[role] ?? '/login';
    return <Navigate to={correctPath} replace />;
  }

  // ── State 4: Correct role — render the protected page ────────────────────
  return children;
}

// ─── Inline styles ────────────────────────────────────────────────────────────
// Minimal inline styles for the loading state only.
// All other styles live in index.css / page-level CSS files.
const styles = {
  loadingWrapper: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    height:         '100vh',
    backgroundColor: '#0f172a',
  },
  spinner: {
    width:        '40px',
    height:       '40px',
    border:       '4px solid rgba(255,255,255,0.1)',
    borderTop:    '4px solid #3b82f6',
    borderRadius: '50%',
    animation:    'spin 0.8s linear infinite',
  },
};
