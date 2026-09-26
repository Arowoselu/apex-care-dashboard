import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

const ROLE_HOME = {
  staff:      '/staff',
  management: '/management',
};

export default function LoginPage() {
  const navigate = useNavigate();
  const { session, role, loading } = useAuth();

  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [error,      setError]      = useState('');       
  const [submitting, setSubmitting] = useState(false);    

  useEffect(() => {
    if (!loading && session && role) {
      const destination = ROLE_HOME[role] ?? '/login';
      navigate(destination, { replace: true });
    }
  }, [session, role, loading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');       
    setSubmitting(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email:    email.trim(),
      password: password,
    });

    if (authError) {
      setError('Invalid email or password. Please try again.');
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
  };

  if (loading) return null;

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-form-section">

          <div className="login-brand">
            <h1 className="login-title">Apex Care Auto</h1>
            <p className="login-subtitle">Service Intelligence Portal</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="email" className="form-label">Email address</label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="you@apexcare.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">Password</label>
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={submitting}
              />
            </div>

            {error && (
              <div className="login-error" role="alert" aria-live="assertive">
                <span className="login-error-icon" aria-hidden="true">⚠️</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              className={`login-btn ${submitting ? 'login-btn--loading' : ''}`}
              disabled={submitting || !email || !password}
            >
              {submitting ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="login-footer" style={{ marginTop: "2rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            Access is restricted to authorised Apex Care staff only.
          </p>
        </div>
        
        <div className="login-graphic-section">
          <div className="login-graphic-overlay">
            <h2>Apex Care Auto</h2>
            <p>Service Intelligence Portal.<br/>Secure Staff Access.</p>
          </div>
        </div>
      </div>
    </div>
  );
}