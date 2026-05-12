import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Badge from '../components/common/Badge.jsx';
import Button from '../components/common/Button.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import Spinner from '../components/common/Spinner.jsx';
import { getVenueById } from '../services/api.js';
import { useShortlist } from '../context/ShortlistContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatCapacity, formatPrice } from '../utils/format.js';

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function VenueDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isShortlisted, toggle } = useShortlist();
  const { error: toastError } = useToast();

  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getVenueById(id)
      .then((data) => {
        if (!cancelled) setVenue(data);
      })
      .catch((err) => {
        if (cancelled) return;
        const msg =
          err?.response?.data?.detail ||
          err?.message ||
          'Failed to load venue.';
        setError(msg);
        toastError(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // toastError omitted intentionally — would re-fire on every toast
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !venue) {
    return (
      <EmptyState
        icon="⚠️"
        title="Couldn't load this venue"
        description={error || 'Venue not found.'}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigate(-1)}>
              Go back
            </Button>
            <Link to="/dashboard">
              <Button>Back to venues</Button>
            </Link>
          </div>
        }
      />
    );
  }

  const shortlisted = isShortlisted(venue.id);

  return (
    <div className="space-y-8">
      <nav className="text-sm text-slate-500 flex items-center gap-2">
        <Link to="/dashboard" className="hover:text-brand-600">
          Venues
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-slate-700 dark:text-slate-300 truncate">
          {venue.name}
        </span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-8">
        <div className="space-y-6">
          <div className="card-surface overflow-hidden">
            {venue.image ? (
              <img
                src={venue.image}
                alt={venue.name}
                className="w-full h-72 sm:h-96 object-cover"
              />
            ) : (
              <div className="w-full h-72 sm:h-96 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                No image available
              </div>
            )}
          </div>

          <header>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">
                  {venue.name}
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  <span aria-hidden="true">📍</span> {venue.city}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={shortlisted ? 'secondary' : 'primary'}
                  onClick={() => toggle(venue)}
                >
                  {shortlisted ? '♥ Shortlisted' : '♡ Add to shortlist'}
                </Button>
              </div>
            </div>
          </header>

          <section className="card-surface p-6">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
              About this venue
            </h2>
            <p className="mt-3 text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {venue.description || 'No description provided.'}
            </p>
          </section>

          <section className="card-surface p-6">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
              Amenities
            </h2>
            {venue.amenities?.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {venue.amenities.map((a) => (
                  <Badge key={a}>{a}</Badge>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">
                No amenities listed.
              </p>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <div className="card-surface p-6 sticky top-24">
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-3xl font-semibold text-slate-900 dark:text-slate-100">
                  {formatPrice(venue.price_per_day)}
                </p>
                <p className="text-xs text-slate-500">per day</p>
              </div>
              <Badge tone="brand">Available</Badge>
            </div>

            <dl className="mt-6 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Capacity</dt>
                <dd className="text-slate-800 dark:text-slate-100 font-medium">
                  {formatCapacity(venue.capacity)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">City</dt>
                <dd className="text-slate-800 dark:text-slate-100 font-medium">
                  {venue.city}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Listed</dt>
                <dd className="text-slate-800 dark:text-slate-100 font-medium">
                  {formatDate(venue.created_at)}
                </dd>
              </div>
            </dl>

            <div className="mt-6 space-y-2">
             
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => navigate(-1)}
              >
                Back to results
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
