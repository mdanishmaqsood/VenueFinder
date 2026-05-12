export default function Select({
  label,
  id,
  options = [],
  className = '',
  containerClassName = '',
  placeholder,
  ...rest
}) {
  const selectId = id || rest.name;
  return (
    <div className={['flex flex-col gap-1.5', containerClassName].join(' ')}>
      {label && (
        <label
          htmlFor={selectId}
          className="text-xs font-medium text-slate-600 dark:text-slate-300"
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={['input-base appearance-none pr-8', className].join(' ')}
        {...rest}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) =>
          typeof opt === 'string' ? (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ) : (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          )
        )}
      </select>
    </div>
  );
}
