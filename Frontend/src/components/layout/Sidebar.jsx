import { Link } from 'react-router-dom';
import { useShortlist } from '../../context/ShortlistContext.jsx';
import { formatPrice } from '../../utils/format.js';
import Button from '../common/Button.jsx';

export default function Sidebar() {
  const { shortlist, remove, count } = useShortlist();

  return (
    <aside className="card-surface p-5 sticky top-24">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Your shortlist
        </h2>
        <span className="text-xs font-medium text-slate-500">{count} saved</span>
      </div>

      {count === 0 ? (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          Shortlist venues by clicking the heart icon. They’ll appear here for quick
          comparison.
        </p>
      ) : (
        <ul className="mt-4 space-y-3 max-h-[420px] overflow-y-auto thin-scroll pr-1">
          {shortlist.map((venue) => (
            <li
              key={venue.id}
              className="flex gap-3 items-start border border-slate-100 dark:border-slate-800 rounded-xl p-2.5"
            >
              <img
                src={venue.image}
                alt={venue.name}
                loading="lazy"
                className="h-14 w-14 rounded-lg object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                  {venue.name}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {venue.city} · {formatPrice(venue.price_per_day)} / day
                </p>
                <button
                  onClick={() => remove(venue.id)}
                  className="mt-1 text-[11px] font-medium text-red-500 hover:text-red-600"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Link to="/shortlist" className="block mt-5">
        <Button
          variant="secondary"
          className="w-full"
          disabled={count === 0}
        >
          View full shortlist
        </Button>
      </Link>
    </aside>
  );
}
