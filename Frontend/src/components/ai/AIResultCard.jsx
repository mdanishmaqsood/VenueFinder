import VenueCard from '../venue/VenueCard.jsx';

export default function AIResultCard({ venue, rank }) {
  return (
    <VenueCard
      venue={venue}
      highlight={rank ? `AI pick #${rank}` : 'AI pick'}
    />
  );
}
