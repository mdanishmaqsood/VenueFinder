import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useToast } from './ToastContext.jsx';

const ShortlistContext = createContext(null);

export function ShortlistProvider({ children }) {
  const [shortlist, setShortlist] = useState([]);
  const toast = useToast();

  const isShortlisted = useCallback(
    (id) => shortlist.some((v) => v.id === id),
    [shortlist]
  );

  const add = useCallback(
    (venue) => {
      setShortlist((prev) => {
        if (prev.some((v) => v.id === venue.id)) return prev;
        return [...prev, venue];
      });
      toast.success(`${venue.name} added to shortlist`);
    },
    [toast]
  );

  const remove = useCallback(
    (id) => {
      setShortlist((prev) => {
        const target = prev.find((v) => v.id === id);
        if (target) toast.info(`${target.name} removed from shortlist`);
        return prev.filter((v) => v.id !== id);
      });
    },
    [toast]
  );

  const toggle = useCallback(
    (venue) => {
      if (isShortlisted(venue.id)) {
        remove(venue.id);
      } else {
        add(venue);
      }
    },
    [add, isShortlisted, remove]
  );

  const clear = useCallback(() => setShortlist([]), []);

  const value = useMemo(
    () => ({
      shortlist,
      count: shortlist.length,
      isShortlisted,
      add,
      remove,
      toggle,
      clear,
    }),
    [shortlist, isShortlisted, add, remove, toggle, clear]
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
