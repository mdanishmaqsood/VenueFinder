import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/common/Button.jsx';
import Input from '../components/common/Input.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const { error: toastError, info: toastInfo } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname || '/dashboard';

  const [form, setForm] = useState({ username: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (sessionStorage.getItem('vf_session_expired') === '1') {
      sessionStorage.removeItem('vf_session_expired');
      toastInfo('Your session has expired. Please sign in again.');
    }
  }, [toastInfo]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) {
      setError('Username and password are required.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await login(form);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const message =
        err?.response?.data?.non_field_errors?.[0] ||
        err?.response?.data?.detail ||
        err?.message ||
        'Login failed. Please check your credentials.';
      setError(message);
      toastError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <span className="h-12 w-12 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold text-lg">
            V
          </span>
          <h1 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Welcome back
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Sign in to your VenueFinder account.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4"
        >
          <Input
            label="Username"
            name="username"
            type="text"
            autoComplete="username"
            placeholder="Enter Username"
            value={form.username}
            onChange={handleChange}
            disabled={submitting}
            required
          />
          <Input
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={form.password}
            onChange={handleChange}
            disabled={submitting}
            required
          />
          
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <p className="text-xs text-slate-400 text-center mt-4">
          By signing in, you agree to our terms and privacy policy.
        </p>
      </div>
    </div>
  );
}
