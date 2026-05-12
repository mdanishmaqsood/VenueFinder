import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useShortlist } from '../../context/ShortlistContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import Button from '../common/Button.jsx';

const navLinkClass = ({ isActive }) =>
  [
    'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
    isActive
      ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200'
      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
  ].join(' ');

export default function Navbar() {
  const { count } = useShortlist();
  const { logout } = useAuth();
  const { info } = useToast();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    info('You have been signed out.');
    navigate('/', { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-100 dark:bg-slate-950/80 dark:border-slate-800">
      <div className="mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2">
          <span className="h-8 w-8 rounded-lg bg-brand-600 text-white flex items-center justify-center font-bold">
            V
          </span>
          <span className="text-base font-semibold text-slate-900 dark:text-slate-100">
            VenueFinder
          </span>
        </Link>

        <nav className="hidden sm:flex items-center gap-1">
          <NavLink to="/dashboard" end className={navLinkClass}>
            Venues
          </NavLink>
          <NavLink to="/shortlist" className={navLinkClass}>
            <span className="inline-flex items-center gap-2">
              Shortlist
              {count > 0 && (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-brand-600 text-white text-[11px] font-semibold">
                  {count}
                </span>
              )}
            </span>
          </NavLink>
        </nav>

        <div className="flex items-center gap-3">
          <NavLink
            to="/shortlist"
            className="sm:hidden relative text-slate-600 hover:text-brand-600"
            aria-label="Shortlist"
          >
            ♥
            {count > 0 && (
              <span className="absolute -top-1 -right-2 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-brand-600 text-white text-[10px] font-semibold">
                {count}
              </span>
            )}
          </NavLink>

          <div className="flex items-center gap-2 pl-3 sm:border-l sm:border-slate-200 sm:dark:border-slate-800">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center text-xs font-semibold">
              AS
            </div>
            <div className="hidden sm:block leading-tight">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                Alex Stone
              </p>
              <p className="text-xs text-slate-500">Acme Events</p>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleLogout}
            aria-label="Log out"
          >
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
