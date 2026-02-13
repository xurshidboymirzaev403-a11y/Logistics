import type { Currency } from '../types';

// Format currency
export function formatCurrency(amount: number, currency: Currency): string {
  if (currency === 'USD') {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (currency === 'UZS') {
    return `${amount.toLocaleString('ru-RU')} UZS`;
  }
  return `${amount}`;
}

// Format number with thousands separator
export function formatNumberWithSeparator(value: number, decimals = 0): string {
  return value.toLocaleString('ru-RU', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
