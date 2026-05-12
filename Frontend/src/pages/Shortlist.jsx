import { Link } from 'react-router-dom';
import Button from '../components/common/Button.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import VenueGrid from '../components/venue/VenueGrid.jsx';
import { useShortlist } from '../context/ShortlistContext.jsx';

export default function Shortlist() {
  const { shortlist, count, clear, loading } = useShortlist();

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Your shortlist
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {count > 0
              ? `You’ve saved ${count} venue${count === 1 ? '' : 's'} for comparison.`
              : 'Save venues you’re considering — they’ll show up here.'}
          </p>
        </div>
        {count > 0 && (
          <div className="flex gap-2">
            <Button variant="ghost" onClick={clear}>
              Clear all
            </Button>
            <Link to="/dashboard">
              <Button variant="secondary">Browse more</Button>
            </Link>
          </div>
        )}
      </header>

      {loading ? (
        <VenueGrid loading />
      ) : count === 0 ? (
        <EmptyState
          icon="♡"
          title="No venues shortlisted yet"
          description="Find venues you love on the main listing and hit the heart icon to save them here."
          action={
            <Link to="/dashboard">
              <Button>Explore venues</Button>
            </Link>
          }
        />
      ) : (
        <VenueGrid venues={shortlist} />
      )}
    </div>
  );
}
