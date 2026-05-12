export default function Input({
  label,
  hint,
  id,
  className = '',
  containerClassName = '',
  ...rest
}) {
  const inputId = id || rest.name;
  return (
    <div className={['flex flex-col gap-1.5', containerClassName].join(' ')}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-medium text-slate-600 dark:text-slate-300"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={['input-base', className].join(' ')}
        {...rest}
      />
      {hint && (
        <span className="text-xs text-slate-400 dark:text-slate-500">{hint}</span>
      )}
    </div>
  );
}
