import SkeletonCard from '../common/SkeletonCard.jsx';
import EmptyState from '../common/EmptyState.jsx';
import VenueCard from './VenueCard.jsx';

export default function VenueGrid({
  venues = [],
  loading = false,
  skeletonCount = 6,
  emptyTitle = 'No venues match these filters',
  emptyDescription = 'Try widening your capacity range, removing the city filter, or clearing your search.',
  emptyAction,
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (!venues.length) {
    return (
      <EmptyState
        icon="🔎"
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
      {venues.map((v) => (
        <VenueCard key={v.id} venue={v} />
      ))}
    </div>
  );
}
