/** Presentation-only currency formatting. Amounts are supplied in integer pence. */
export function formatPounds(amountPence: number): string {
  return new Intl.NumberFormat('en-GB', {
    currency: 'GBP',
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
    style: 'currency',
  }).format(amountPence / 100);
}

export function formatAbsolutePounds(amountPence: number): string {
  return formatPounds(Math.abs(amountPence));
}

/** Changes are signed so a comparison table never relies on column context alone. */
export function formatDeltaPounds(amountPence: number): string {
  const formatted = formatPounds(amountPence);
  return amountPence > 0 ? `+${formatted}` : formatted;
}
