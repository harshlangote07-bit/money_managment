import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

export default function AuthPage({ onAuthenticated, onBack }) {
  const location = useLocation();
  const [mode, setMode] = useState(
    location.pathname === '/verify-email'
      ? 'verify'
      : location.pathname === '/reset-password'
        ? 'reset'
        : 'login'
  );
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState(false);

  const token = new URLSearchParams(location.search).get('token');

  useEffect(() => {
    if (location.pathname === '/verify-email') {
      setMode('verify');
    } else if (location.pathname === '/reset-password') {
      setMode('reset');
    } else {
      setMode('login');
    }

    setError('');
    setNotice('');
  }, [location.pathname, location.search]);

  const verificationStarted = useRef(null);

  useEffect(() => {
    if (location.pathname !== '/verify-email') return;

    if (!token) {
      setError('The verification link is missing its token.');
      return;
    }

    // A verification token is single-use. Prevent duplicate requests in
    // React Strict Mode during development.
    if (verificationStarted.current === token) return;
    verificationStarted.current = token;

    async function verifyEmail() {
      setPending(true);
      setError('');

      try {
        const response = await fetch('/api/v1/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ token }),
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok || !result.success || !result.data?.user) {
          throw new Error(
            result.message || 'This verification link is invalid or expired.'
          );
        }

        // Notify any other open Foresight tab after the session cookie is set.
        window.localStorage.setItem(
          'foresight-auth-changed',
          String(Date.now())
        );

        // Log in immediately and navigate to the dashboard.
        onAuthenticated(result.data.user);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Email verification failed.'
        );
      } finally {
        setPending(false);
      }
    }

    verifyEmail();
  }, [location.pathname, token]);

  function changeMode(nextMode) {
    setMode(nextMode);
    setError('');
    setNotice('');
    setPassword('');
    setConfirmPassword('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setNotice('');

    if (mode === 'reset' && password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    setPending(true);

    const endpoint = {
      login: 'login',
      register: 'register',
      forgot: 'forgot-password',
      reset: 'reset-password',
    }[mode];

    const body = {
      ...(mode === 'register' ? { name: name.trim() } : {}),
      ...(mode === 'reset' ? { token } : {}),
      ...(mode === 'forgot' || mode === 'login' || mode === 'register'
        ? { email: email.trim() }
        : {}),
      ...(mode === 'login' || mode === 'register' || mode === 'reset'
        ? { password }
        : {}),
    };

    try {
      const response = await fetch(`/api/v1/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(body),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success) {
        const err = new Error(
          result.message || 'The request failed. Please try again.'
        );
        err.code = result.code;
        throw err;
      }

      if (mode === 'login') {
        onAuthenticated(result.data.user);
        return;
      }

      if (mode === 'register') {
        setNotice('Check your mail.');
        setMode('login');
        setPassword('');
      } else if (mode === 'forgot') {
        setNotice('Check your mail.');
      } else if (mode === 'reset') {
        setNotice(result.message);
        setMode('login');
        setPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to complete the request.');

      if (err.code === 'EMAIL_NOT_VERIFIED') {
        setNotice('You can request a new verification email below.');
      }
    } finally {
      setPending(false);
    }
  }

  async function resendVerification() {
    setError('');
    setNotice('');
    setPending(true);

    try {
      const response = await fetch('/api/v1/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email: email.trim() }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Could not request a verification email.');
      }

      setNotice(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not request a verification email.');
    } finally {
      setPending(false);
    }
  }

  const headings = {
    login: ['Welcome to Foresight.', 'Sign in to access your financial workspace.'],
    register: ['Create your account.', 'Start planning for your financial future.'],
    forgot: ['Forgot your password?', 'Request a secure link to reset your password.'],
    reset: ['Choose a new password.', 'Use a password you have not used here before.'],
    verify: ['Verify your email.', 'Confirm your email address to activate your account.'],
  };

  const [heading, description] = headings[mode] || headings.login;

  if (mode === 'verify') {
    return (
      <section className="login-page" style={pageStyle}>
        <div className="login-card" style={cardStyle}>
          <Brand onBack={onBack} />
          <h1 style={headingStyle}>{heading}</h1>
          <p style={descriptionStyle}>{description}</p>

          {pending && <p role="status">Verifying your email…</p>}
          {error && <p role="alert" style={errorStyle}>{error}</p>}
          {notice && <p role="status" style={noticeStyle}>{notice}</p>}

          {error && (
            <button
              type="button"
              className="button button-outline full-button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
            >
              Return to sign in
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="login-page" style={pageStyle}>
      <div className="login-card" style={cardStyle}>
        <Brand onBack={onBack} />
        <div className="eyebrow">
          <span className="eyebrow-dot" />
          PERSONAL FINANCIAL PLANNING
        </div>
        <h1 style={headingStyle}>{heading}</h1>
        <p style={descriptionStyle}>{description}</p>

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <label className="form-field">
              Full name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                minLength={2}
                maxLength={80}
                required
                disabled={pending}
              />
            </label>
          )}

          {mode !== 'reset' && (
            <label className="form-field">
              Email address
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                maxLength={254}
                placeholder="you@example.com"
                required
                disabled={pending}
              />
            </label>
          )}

          {(mode === 'login' || mode === 'register' || mode === 'reset') && (
            <label className="form-field">
              {mode === 'reset' ? 'New password' : 'Password'}
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={mode === 'login' ? undefined : 8}
                maxLength={72}
                placeholder={mode === 'login' ? 'Enter your password' : 'At least 8 characters'}
                required
                disabled={pending}
              />
            </label>
          )}

          {mode === 'reset' && (
            <label className="form-field">
              Confirm new password
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                maxLength={72}
                required
                disabled={pending}
              />
            </label>
          )}

          {error && <p role="alert" style={errorStyle}>{error}</p>}
          {notice && <p role="status" style={noticeStyle}>{notice}</p>}

          <button
            className="button button-primary full-button"
            type="submit"
            disabled={pending}
            style={{ marginTop: '18px', opacity: pending ? 0.7 : 1 }}
          >
            {pending
              ? 'Please wait…'
              : ({
                  login: 'Sign in',
                  register: 'Create account',
                  forgot: 'Send reset link',
                  reset: 'Reset password',
                }[mode])}
            {!pending && <span>→</span>}
          </button>
        </form>

        {mode === 'login' && error.toLowerCase().includes('verify') && (
          <button
            type="button"
            className="text-button"
            disabled={pending}
            onClick={resendVerification}
            style={{ marginTop: '14px' }}
          >
            Resend verification email
          </button>
        )}

        <div style={{ marginTop: '22px', textAlign: 'center', lineHeight: 2 }}>
          {mode === 'login' && (
            <>
              <button type="button" className="text-button" onClick={() => changeMode('forgot')}>
                Forgot password?
              </button>
              <p style={{ color: '#7a857b', fontSize: '0.88rem' }}>
                Don't have an account?{' '}
                <button type="button" className="text-button" onClick={() => changeMode('register')}>
                  Create account
                </button>
              </p>
            </>
          )}

          {mode === 'register' && (
            <p style={{ color: '#7a857b', fontSize: '0.88rem' }}>
              Already have an account?{' '}
              <button type="button" className="text-button" onClick={() => changeMode('login')}>
                Sign in
              </button>
            </p>
          )}

          {(mode === 'forgot' || mode === 'reset') && (
            <button type="button" className="text-button" onClick={() => changeMode('login')}>
              ← Back to sign in
            </button>
          )}

          <div>
            <button type="button" className="text-button" onClick={onBack}>
              ← Back to home
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Brand({ onBack }) {
  return (
    <button
      type="button"
      className="brand"
      onClick={onBack}
      aria-label="Foresight home"
      style={{ marginBottom: '36px' }}
    >
      <img
        src="/foresight-logo.png"
        alt="Foresight Logo"
        className="brand-logo"
        style={{ height: '30px', width: 'auto' }}
      />
      <span>foresight<span className="brand-dot">.</span></span>
    </button>
  );
}

const pageStyle = {
  minHeight: '100vh',
  display: 'grid',
  placeItems: 'center',
  padding: '32px 20px',
  background: 'linear-gradient(135deg, #f5f7f2 0%, #eef3eb 100%)',
};

const cardStyle = {
  width: '100%',
  maxWidth: '460px',
  padding: 'clamp(28px, 5vw, 48px)',
  background: '#fff',
  border: '1px solid #e3e9df',
  borderRadius: '24px',
  boxShadow: '0 24px 70px rgba(39, 66, 48, 0.10)',
};

const headingStyle = {
  fontSize: 'clamp(2rem, 6vw, 2.8rem)',
  lineHeight: 1.1,
  margin: '18px 0 14px',
  color: '#263b2d',
};

const descriptionStyle = {
  color: '#68756a',
  lineHeight: 1.7,
  marginBottom: '28px',
};

const errorStyle = {
  color: '#b42318',
  fontSize: '0.9rem',
  lineHeight: 1.5,
  margin: '12px 0',
};

const noticeStyle = {
  color: '#3f7048',
  fontSize: '0.9rem',
  lineHeight: 1.5,
  margin: '12px 0',
};
