// ─────────────────────────────────────────────────────────────────────────────
// AuthContext.jsx
// Global authentication state provider for the entire application.
//
// PRD Reference: §5 User Roles & Permissions, §4 Tech Stack (Supabase)
//
// What this does:
//   - Listens to Supabase auth state changes (login, logout, token refresh)
//   - Exposes: session, user, role, and loading state to all child components
//   - Role is read from Supabase user_metadata.role
//     (set when users are created in the Supabase dashboard)
//
// Role values per PRD §5:
//   - "staff"      → Front Desk Staff (Phase 1 portal only)
//   - "management" → Management Team  (Phase 2 + 3 dashboard)
//
// Usage:
//   import { useAuth } from '../context/AuthContext';
//   const { user, role, session, loading } = useAuth();
// ─────────────────────────────────────────────────────────────────────────────

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// Create the context object
const AuthContext = createContext(null);

// ─── AuthProvider ─────────────────────────────────────────────────────────────
// Wrap the entire app in this provider (see main.jsx).
// All children can then call useAuth() to read auth state.
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);   // Full Supabase session object
  const [user, setUser]       = useState(null);   // Supabase user object
  const [role, setRole]       = useState(null);   // "staff" | "management" | null
  const [loading, setLoading] = useState(true);   // true while auth state is resolving

  useEffect(() => {
    // ── Step 1: Get the current session on first render ──────────────────────
    // This handles page refreshes — Supabase persists the session in localStorage.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      // Role is stored in user_metadata by Supabase admin when creating the user
      setRole(session?.user?.user_metadata?.role ?? null);
      setLoading(false);
    });

    // ── Step 2: Subscribe to auth state changes ───────────────────────────────
    // Fires on: login, logout, token refresh, password change.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setRole(session?.user?.user_metadata?.role ?? null);
        setLoading(false);
      }
    );

    // ── Cleanup: unsubscribe when the provider unmounts ───────────────────────
    return () => subscription.unsubscribe();
  }, []);

  // Expose a signOut helper so any component can log out cleanly
  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = { session, user, role, loading, signOut };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── useAuth hook ─────────────────────────────────────────────────────────────
// Convenience hook. Throws a clear error if used outside AuthProvider.
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('[useAuth] must be used inside an <AuthProvider>. Check main.jsx.');
  }
  return context;
}
