import { useToast } from '../../context/ToastContext.jsx';

const TONE_STYLES = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  error: 'border-red-200 bg-red-50 text-red-800',
  info: 'border-brand-200 bg-brand-50 text-brand-800',
};

export default function ToastViewport() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 w-[300px] max-w-[90vw]">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={[
            'card-surface border px-4 py-3 text-sm flex items-start gap-3 shadow-soft',
            TONE_STYLES[toast.tone] || TONE_STYLES.info,
          ].join(' ')}
        >
          <span className="flex-1 leading-5">{toast.message}</span>
          <button
            onClick={() => dismiss(toast.id)}
            className="text-slate-400 hover:text-slate-700"
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
