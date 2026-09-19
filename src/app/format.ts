/** Presentation-only conversion of integer pence for input fields. */
export function formatInputPounds(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  const absolute = Math.abs(amount);
  const wholePounds = Math.floor(absolute / 100);
  const pence = absolute % 100;
  return `${sign}${wholePounds}${
    pence === 0 ? '' : `.${String(pence).padStart(2, '0')}`
  }`;
}

/** Presentation-only currency formatting; domain values always remain pence. */
export function formatPounds(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    currency: 'GBP',
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
    style: 'currency',
  }).format(amount / 100);
}
