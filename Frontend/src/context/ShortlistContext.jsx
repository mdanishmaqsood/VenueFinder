import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useToast } from './ToastContext.jsx';
import { useAuth } from './AuthContext.jsx';
import {
  addToShortlist as apiAddToShortlist,
  getShortlist as apiGetShortlist,
  removeFromShortlist as apiRemoveFromShortlist,
} from '../services/api.js';

const ShortlistContext = createContext(null);

export function ShortlistProvider({ children }) {
  const [shortlist, setShortlist] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pendingIds, setPendingIds] = useState(() => new Set());
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();
  const { isAuthenticated } = useAuth();

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setShortlist([]);
      return;
    }
    setLoading(true);
    try {
      const venues = await apiGetShortlist();
      setShortlist(venues);
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        'Failed to load your shortlist.';
      toastError(msg);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, toastError]);

  useEffect(() => {
    if (isAuthenticated) {
      refresh();
    } else {
      setShortlist([]);
    }
  }, [isAuthenticated, refresh]);

  const isShortlisted = useCallback(
    (id) => shortlist.some((v) => v.id === id),
    [shortlist]
  );

  const isPending = useCallback(
    (id) => pendingIds.has(id),
    [pendingIds]
  );

  const markPending = useCallback((id, on) => {
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const add = useCallback(
    async (venue) => {
      if (shortlist.some((v) => v.id === venue.id)) return;
      // Optimistic
      setShortlist((prev) => [...prev, venue]);
      markPending(venue.id, true);
      try {
        await apiAddToShortlist(venue.id);
        toastSuccess(`${venue.name} added to shortlist`);
      } catch (err) {
        // Revert
        setShortlist((prev) => prev.filter((v) => v.id !== venue.id));
        const msg =
          err?.response?.data?.detail ||
          err?.message ||
          'Could not add to shortlist.';
        toastError(msg);
      } finally {
        markPending(venue.id, false);
      }
    },
    [markPending, shortlist, toastSuccess, toastError]
  );

  const remove = useCallback(
    async (id) => {
      const target = shortlist.find((v) => v.id === id);
      if (!target) return;
      // Optimistic
      setShortlist((prev) => prev.filter((v) => v.id !== id));
      markPending(id, true);
      try {
        await apiRemoveFromShortlist(id);
        toastInfo(`${target.name} removed from shortlist`);
      } catch (err) {
        // Revert
        setShortlist((prev) => [...prev, target]);
        const msg =
          err?.response?.data?.detail ||
          err?.message ||
          'Could not remove from shortlist.';
        toastError(msg);
      } finally {
        markPending(id, false);
      }
    },
    [markPending, shortlist, toastInfo, toastError]
  );

  const toggle = useCallback(
    (venue) => {
      if (isShortlisted(venue.id)) {
        return remove(venue.id);
      }
      return add(venue);
    },
    [add, isShortlisted, remove]
  );

  const clear = useCallback(async () => {
    if (!shortlist.length) return;
    const snapshot = shortlist;
    setShortlist([]);
    try {
      await Promise.all(
        snapshot.map((v) => apiRemoveFromShortlist(v.id).catch(() => null))
      );
      toastInfo('Shortlist cleared.');
    } catch {
      setShortlist(snapshot);
      toastError('Failed to clear shortlist.');
    }
  }, [shortlist, toastInfo, toastError]);

  const value = useMemo(
    () => ({
      shortlist,
      count: shortlist.length,
      loading,
      isShortlisted,
      isPending,
      add,
      remove,
      toggle,
      clear,
      refresh,
    }),
    [shortlist, loading, isShortlisted, isPending, add, remove, toggle, clear, refresh]
  );

  return (
    <ShortlistContext.Provider value={value}>{children}</ShortlistContext.Provider>
  );
}

export function useShortlist() {
  const ctx = useContext(ShortlistContext);
  if (!ctx) throw new Error('useShortlist must be used within a ShortlistProvider');
  return ctx;
}
