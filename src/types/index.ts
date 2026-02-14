// User types
export interface User {
  id: string;
  username: string;
  password: string;
  role: 'admin' | 'logist' | 'finance';
  fullName: string;
}

// Item types
export interface Item {
  id: string;
  name: string;
  unit: 'т' | 'кг' | 'конт.';
  category?: string;
  description?: string;
}

// Supplier types
export interface Supplier {
  id: string;
  name: string;
  contacts?: string;
  notes?: string;
}

// Order types
export type OrderStatus = 'draft' | 'locked' | 'distributed' | 'financial' | 'completed';

export interface Order {
  id: string;
  orderNumber: string;
  name?: string;
  createdAt: string;
  createdBy: string;
  status: OrderStatus;
  containerTonnage?: number;
}

// OrderLine types
export type Unit = 'т' | 'кг' | 'конт.';

export interface OrderLine {
  id: string;
  orderId: string;
  itemId: string;
  quantity: number;
  unit: Unit;
  quantityInTons: number;
  containerSize?: number;
  containerIndex?: number; // Index of container within the order (for container-based loading)
}

// Allocation types
export type Currency = 'USD' | 'UZS';

export interface Allocation {
  id: string;
  orderId: string;
  orderLineId: string;
  supplierId: string;
  itemId: string;
  quantity: number;
  unit: Unit;
  quantityInTons: number;
  pricePerTon: number;
  totalSum: number;
  currency: Currency;
  containerSize?: number;
}

// PaymentOperation types
export type PaymentType = 'PREPAYMENT' | 'PAYOFF';

export interface PaymentOperation {
  id: string;
  allocationId?: string;
  orderId: string;
  supplierId: string;
  type: PaymentType;
  amount: number;
  currency: Currency;
  date: string;
  createdAt: string;
  createdBy: string;
  comment?: string;
}

// AuditLog types
export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  timestamp: string;
  details?: any;
}

// Toast notification types
export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}
