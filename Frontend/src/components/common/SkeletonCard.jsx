export default function SkeletonCard() {
  return (
    <div className="card-surface overflow-hidden animate-pulse">
      <div className="h-44 bg-slate-200 dark:bg-slate-800" />
      <div className="p-5 space-y-3">
        <div className="h-4 w-2/3 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="h-3 w-1/3 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="flex gap-2 pt-2">
          <div className="h-5 w-14 bg-slate-200 dark:bg-slate-800 rounded-full" />
          <div className="h-5 w-12 bg-slate-200 dark:bg-slate-800 rounded-full" />
          <div className="h-5 w-16 bg-slate-200 dark:bg-slate-800 rounded-full" />
        </div>
        <div className="h-3 w-full bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="h-3 w-5/6 bg-slate-200 dark:bg-slate-800 rounded" />
      </div>
    </div>
  );
}
