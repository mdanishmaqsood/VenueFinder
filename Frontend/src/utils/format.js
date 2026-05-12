export function formatPrice(value, currency = 'GBP') {
  if (value == null || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCapacity(value) {
  if (value == null) return '—';
  return `${value} guests`;
}
