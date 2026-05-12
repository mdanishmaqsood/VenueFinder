export default function EmptyState({
  icon = '📍',
  title = 'Nothing here yet',
  description,
  action,
  className = '',
}) {
  return (
    <div
      className={[
        'card-surface flex flex-col items-center text-center px-6 py-14',
        className,
      ].join(' ')}
    >
      <div className="text-4xl mb-3" aria-hidden="true">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
        {title}
      </h3>
      {description && (
        <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
