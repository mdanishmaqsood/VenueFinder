import { useState } from 'react';
import Button from '../common/Button.jsx';
import Spinner from '../common/Spinner.jsx';
import AIResultCard from './AIResultCard.jsx';
import useAISearch from '../../hooks/useAISearch.js';



export default function AISearch() {
  const [prompt, setPrompt] = useState('');
  const { status, result, error, isLoading, search, reset } = useAISearch();

  const handleSubmit = (e) => {
    e.preventDefault();
    search(prompt);
  };

  return (
    <section className="card-surface p-6 lg:p-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 items-center rounded-full bg-brand-50 px-2 text-[11px] font-semibold uppercase tracking-wide text-brand-700">
              AI
            </span>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Describe your event we’ll find the venue
            </h2>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Free-form prompt search. We’ll combine location, capacity, and amenities
            to recommend the best matches.
          </p>
        </div>
        {(result || error) && (
          <Button variant="ghost" size="sm" onClick={reset}>
            Clear
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-5">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          placeholder="e.g. Modern venue in central London for a 50-person product launch with good AV"
          className="input-base resize-none"
          disabled={isLoading}
        />

        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs text-slate-500 min-h-[20px]">
            {status === 'submitting' && 'Submitting prompt…'}
            {status === 'polling' && 'Analyzing your brief — polling for results…'}
            {status === 'success' && 'Recommendations ready.'}
          </div>
          <Button
            type="submit"
            disabled={isLoading || !prompt.trim()}
            leftIcon={isLoading ? <Spinner size="sm" className="border-white/40 border-t-white" /> : null}
          >
            {isLoading ? 'Searching…' : 'Search with AI'}
          </Button>
        </div>
      </form>

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {result?.status === 'completed' && (
        <div className="mt-6">
          <div className="rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-3 text-sm text-brand-800">
            {result.explanation}
          </div>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-5">
            {result.venues.map((venue, i) => (
              <AIResultCard key={venue.id} venue={venue} rank={i + 1} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
