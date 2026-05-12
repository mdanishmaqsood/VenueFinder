import { createContext, useCallback, useContext, useRef, useState } from 'react';

const ToastContext = createContext(null);
const DEFAULT_DURATION = 3000;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const notify = useCallback(
    (message, options = {}) => {
      const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const toast = {
        id,
        message,
        tone: options.tone || 'info',
      };
      setToasts((prev) => [...prev, toast]);
      const duration = options.duration ?? DEFAULT_DURATION;
      if (duration > 0) {
        const t = setTimeout(() => dismiss(id), duration);
        timers.current.set(id, t);
      }
      return id;
    },
    [dismiss]
  );

  const value = {
    toasts,
    notify,
    dismiss,
    success: (msg, opts) => notify(msg, { ...opts, tone: 'success' }),
    error: (msg, opts) => notify(msg, { ...opts, tone: 'error' }),
    info: (msg, opts) => notify(msg, { ...opts, tone: 'info' }),
  };

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
