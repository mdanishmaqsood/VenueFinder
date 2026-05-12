import { useCallback, useEffect, useRef, useState } from 'react';
import { aiSearch, getSearchResults } from '../services/api.js';

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 30000;

// Encapsulates the POST-then-poll lifecycle for the AI search flow.
// Handles its own cleanup on unmount or when a new search is triggered.
export default function useAISearch() {
  const [status, setStatus] = useState('idle'); // idle | submitting | polling | success | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const pollTimerRef = useRef(null);
  const timeoutTimerRef = useRef(null);
  const activeJobRef = useRef(null);

  const clearTimers = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const reset = useCallback(() => {
    clearTimers();
    activeJobRef.current = null;
    setStatus('idle');
    setResult(null);
    setError(null);
  }, [clearTimers]);

  const search = useCallback(
    async (prompt) => {
      if (!prompt || !prompt.trim()) {
        setError('Please describe the event you’re planning.');
        setStatus('error');
        return;
      }

      clearTimers();
      setError(null);
      setResult(null);
      setStatus('submitting');

      let jobId;
      try {
        const submission = await aiSearch({ prompt });
        jobId = submission.job_id;
        activeJobRef.current = jobId;
      } catch (err) {
        setError('We couldn’t reach the AI search service. Please try again.');
        setStatus('error');
        return;
      }

      setStatus('polling');

      const tick = async () => {
        if (activeJobRef.current !== jobId) return;
        try {
          const data = await getSearchResults(jobId);
          if (activeJobRef.current !== jobId) return;
          if (data.status === 'completed') {
            clearTimers();
            setResult(data);
            setStatus('success');
          } else if (data.status === 'error') {
            clearTimers();
            setError(data.error || 'AI search failed.');
            setStatus('error');
          }
          // pending → keep polling
        } catch (err) {
          clearTimers();
          setError('Lost connection while waiting for results.');
          setStatus('error');
        }
      };

      // First poll immediately so the user sees movement, then on interval.
      tick();
      pollTimerRef.current = setInterval(tick, POLL_INTERVAL_MS);
      timeoutTimerRef.current = setTimeout(() => {
        if (activeJobRef.current === jobId) {
          clearTimers();
          setError('AI search timed out. Please try a more specific prompt.');
          setStatus('error');
        }
      }, POLL_TIMEOUT_MS);
    },
    [clearTimers]
  );

  return {
    status,
    result,
    error,
    isLoading: status === 'submitting' || status === 'polling',
    search,
    reset,
  };
}
