import type { Unit, OrderLine, Allocation, Currency } from '../types';

// Constants
export const TONS_IN_CONTAINER_DEFAULT = 26;
export const TONS_IN_CONTAINER_EXCEPTION = 27;
export const KG_IN_TON = 1000;

// Convert any unit to tons
export function toTons(quantity: number, unit: Unit, containerSize = TONS_IN_CONTAINER_DEFAULT): number {
  if (unit === 'т') return quantity;
  if (unit === 'кг') return quantity / KG_IN_TON;
  if (unit === 'конт.') return quantity * containerSize;
  return 0;
}

// Convert tons to containers
export function toContainers(tons: number, containerSize = TONS_IN_CONTAINER_DEFAULT): number {
  return tons / containerSize;
}

// Convert tons to kg
export function toKg(tons: number): number {
  return tons * KG_IN_TON;
}

// Format number (remove trailing zeros)
export function formatNumber(value: number): string {
  return parseFloat(value.toFixed(3)).toString();
}

// Validate distribution - check if all order lines are fully distributed
export function validateDistribution(orderLine: OrderLine, allocations: Allocation[]): {
  isValid: boolean;
  remainder: number;
  allocated: number;
} {
  const ordered = orderLine.quantityInTons;
  const allocated = allocations
    .filter((a) => a.orderLineId === orderLine.id)
    .reduce((sum, a) => sum + a.quantityInTons, 0);
  const remainder = ordered - allocated;
  
  return {
    isValid: Math.abs(remainder) < 0.001 && allocated <= ordered,
    remainder,
    allocated,
  };
}

// Check if order line can accept more allocation
export function canAllocateMore(orderLine: OrderLine, allocations: Allocation[], additionalTons: number): boolean {
  const { allocated } = validateDistribution(orderLine, allocations);
  return (allocated + additionalTons) <= (orderLine.quantityInTons + 0.001);
}

// Get order status label
export function getOrderStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Черновик',
    locked: 'Заблокирован',
    distributed: 'Распределён',
    financial: 'В финансах',
    completed: 'Завершён',
  };
  return labels[status] || status;
}

// Get order status color
export function getOrderStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    locked: 'bg-blue-100 text-blue-800',
    distributed: 'bg-yellow-100 text-yellow-800',
    financial: 'bg-orange-100 text-orange-800',
    completed: 'bg-green-100 text-green-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

// Get payment type label
export function getPaymentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    PREPAYMENT: 'Предоплата',
    PAYOFF: 'Погашение',
  };
  return labels[type] || type;
}

// Calculate total sum for allocation
export function calculateAllocationSum(quantityInTons: number, pricePerTon: number): number {
  return quantityInTons * pricePerTon;
}

// Get payment status for supplier
export function getPaymentStatus(totalSum: number, paid: number): {
  status: 'unpaid' | 'partial' | 'paid';
  label: string;
  color: string;
} {
  if (paid === 0) {
    return {
      status: 'unpaid',
      label: 'Не оплачено',
      color: 'bg-red-100 text-red-800',
    };
  }
  if (paid < totalSum) {
    return {
      status: 'partial',
      label: 'Частично оплачено',
      color: 'bg-yellow-100 text-yellow-800',
    };
  }
  return {
    status: 'paid',
    label: 'Оплачено',
    color: 'bg-green-100 text-green-800',
  };
}

// Format date
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

// Format datetime
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Get today's date in YYYY-MM-DD format
export function getTodayDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
