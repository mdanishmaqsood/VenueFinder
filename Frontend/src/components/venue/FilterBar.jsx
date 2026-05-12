import Button from '../common/Button.jsx';
import Input from '../common/Input.jsx';

export const DEFAULT_FILTERS = {
  city: '',
  minCapacity: '',
  maxCapacity: '',
  maxPrice: '',
};

export default function FilterBar({
  filters,
  onChange,
  onSubmit,
  onReset,
}) {
  const update = (key) => (e) => onChange({ ...filters, [key]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit?.(filters);
  };

  return (
    <form onSubmit={handleSubmit} className="card-surface p-5">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-end">
        <Input
          label="City"
          name="city"
          value={filters.city}
          onChange={update('city')}
          placeholder="e.g. Manchester"
        />
        <Input
          label="Min capacity"
          name="minCapacity"
          value={filters.minCapacity}
          onChange={update('minCapacity')}
          type="number"
          min="0"
          placeholder="e.g. 50"
        />
        <Input
          label="Max capacity"
          name="maxCapacity"
          value={filters.maxCapacity}
          onChange={update('maxCapacity')}
          type="number"
          min="0"
          placeholder="e.g. 500"
        />
        <Input
          label="Max price / day"
          name="maxPrice"
          value={filters.maxPrice}
          onChange={update('maxPrice')}
          type="number"
          min="0"
          placeholder="e.g. 4000"
        />
      </div>
      <div className="flex flex-wrap justify-end gap-2 mt-4">
        <Button variant="ghost" type="button" onClick={onReset}>
          Reset
        </Button>
        <Button type="submit">Search</Button>
      </div>
    </form>
  );
}
