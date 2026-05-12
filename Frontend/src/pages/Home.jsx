import { useCallback, useEffect, useState } from 'react';
import AISearch from '../components/ai/AISearch.jsx';
import FilterBar, { DEFAULT_FILTERS } from '../components/venue/FilterBar.jsx';
import VenueGrid from '../components/venue/VenueGrid.jsx';
import Sidebar from '../components/layout/Sidebar.jsx';
import Button from '../components/common/Button.jsx';
import useDebounce from '../hooks/useDebounce.js';
import { getVenues } from '../services/api.js';

export default function Home() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);

  // Debounced free-text query gives an instant-feeling search without
  // hammering the API on every keystroke.
  const debouncedQuery = useDebounce(filters.query, 350);

  const effectiveFilters = {
    ...appliedFilters,
    query: debouncedQuery,
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getVenues(effectiveFilters)
      .then((data) => {
        if (!cancelled) setVenues(data.venues);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFilters.city, appliedFilters.minCapacity, appliedFilters.maxPrice, debouncedQuery]);

  const handleSubmit = useCallback((next) => setAppliedFilters(next), []);
  const handleReset = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
  }, []);

  return (
    <div className="space-y-6 lg:space-y-8">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Discover venues
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Browse curated B2B venues for conferences, launches and workshops.
          </p>
        </div>
        <div className="text-xs text-slate-500">
          Showing <span className="font-medium text-slate-700 dark:text-slate-200">{venues.length}</span>{' '}
          venues
        </div>
      </header>

      <AISearch />

      <FilterBar
        filters={filters}
        onChange={setFilters}
        onSubmit={handleSubmit}
        onReset={handleReset}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <VenueGrid
          venues={venues}
          loading={loading}
          emptyAction={
            <Button variant="secondary" onClick={handleReset}>
              Clear filters
            </Button>
          }
        />
        <div className="hidden lg:block">
          <Sidebar />
        </div>
      </div>
    </div>
  );
}
