import Badge from '../common/Badge.jsx';
import Button from '../common/Button.jsx';
import { useShortlist } from '../../context/ShortlistContext.jsx';
import { formatCapacity, formatPrice } from '../../utils/format.js';

const MAX_VISIBLE_AMENITIES = 4;

export default function VenueCard({ venue, highlight }) {
  const { isShortlisted, toggle } = useShortlist();
  const shortlisted = isShortlisted(venue.id);

  const visibleAmenities = venue.amenities?.slice(0, MAX_VISIBLE_AMENITIES) || [];
  const extraCount = (venue.amenities?.length || 0) - visibleAmenities.length;

  return (
    <article className="card-surface group overflow-hidden flex flex-col">
      <div className="relative">
        <img
          src={venue.image}
          alt={venue.name}
          loading="lazy"
          className="h-48 w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <button
          type="button"
          onClick={() => toggle(venue)}
          aria-pressed={shortlisted}
          aria-label={shortlisted ? 'Remove from shortlist' : 'Add to shortlist'}
          className={[
            'absolute top-3 right-3 h-9 w-9 rounded-full flex items-center justify-center backdrop-blur transition',
            shortlisted
              ? 'bg-red-500 text-white shadow-soft'
              : 'bg-white/90 text-slate-500 hover:text-red-500',
          ].join(' ')}
        >
          <span aria-hidden="true" className="text-base leading-none">
            {shortlisted ? '♥' : '♡'}
          </span>
        </button>

        {highlight && (
          <div className="absolute top-3 left-3">
            <Badge tone="brand">{highlight}</Badge>
          </div>
        )}
      </div>

      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
              {venue.name}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{venue.city}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {formatPrice(venue.price_per_day)}
            </p>
            <p className="text-[11px] text-slate-500">per day</p>
          </div>
        </div>

        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
          {venue.description}
        </p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          <Badge>{formatCapacity(venue.capacity)}</Badge>
          {visibleAmenities.map((a) => (
            <Badge key={a}>{a}</Badge>
          ))}
          {extraCount > 0 && <Badge tone="brand">+{extraCount}</Badge>}
        </div>

        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-500">Available next 30 days</span>
          <Button
            size="sm"
            variant={shortlisted ? 'secondary' : 'primary'}
            onClick={() => toggle(venue)}
          >
            {shortlisted ? 'Shortlisted' : 'Shortlist'}
          </Button>
        </div>
      </div>
    </article>
  );
}
