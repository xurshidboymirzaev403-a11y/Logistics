import { v4 as uuidv4 } from 'uuid';
import type {
  User,
  Item,
  Supplier,
  Order,
  OrderLine,
  Allocation,
  PaymentOperation,
  AuditLog,
} from '../types';

// LocalStorage keys
const KEYS = {
  USERS: 'logistics_users',
  ITEMS: 'logistics_items',
  SUPPLIERS: 'logistics_suppliers',
  ORDERS: 'logistics_orders',
  ORDER_LINES: 'logistics_order_lines',
  ALLOCATIONS: 'logistics_allocations',
  PAYMENTS: 'logistics_payments',
  AUDIT_LOGS: 'logistics_audit_logs',
  CURRENT_USER: 'logistics_current_user',
  ADMIN_MODE: 'logistics_admin_mode',
};

// Helper to get data from localStorage
function getFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error);
    return defaultValue;
  }
}

// Helper to set data in localStorage
function setToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing ${key} to localStorage:`, error);
  }
}

// Initialize default user
export function initializeDefaultUser(): void {
  const users = getFromStorage<User[]>(KEYS.USERS, []);
  if (users.length === 0) {
    const defaultUser: User = {
      id: uuidv4(),
      username: 'admin',
      password: 'admin',
      role: 'admin',
      fullName: 'Администратор',
    };
    setToStorage(KEYS.USERS, [defaultUser]);
  }
}

// Users
export const userStore = {
  getAll: (): User[] => getFromStorage<User[]>(KEYS.USERS, []),
  getById: (id: string): User | undefined => {
    const users = getFromStorage<User[]>(KEYS.USERS, []);
    return users.find((u) => u.id === id);
  },
  getByUsername: (username: string): User | undefined => {
    const users = getFromStorage<User[]>(KEYS.USERS, []);
    return users.find((u) => u.username === username);
  },
  create: (user: Omit<User, 'id'>): User => {
    const users = getFromStorage<User[]>(KEYS.USERS, []);
    const newUser: User = { ...user, id: uuidv4() };
    setToStorage(KEYS.USERS, [...users, newUser]);
    return newUser;
  },
  update: (id: string, updates: Partial<User>): User | undefined => {
    const users = getFromStorage<User[]>(KEYS.USERS, []);
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) return undefined;
    users[index] = { ...users[index], ...updates };
    setToStorage(KEYS.USERS, users);
    return users[index];
  },
  delete: (id: string): boolean => {
    const users = getFromStorage<User[]>(KEYS.USERS, []);
    const filtered = users.filter((u) => u.id !== id);
    if (filtered.length === users.length) return false;
    setToStorage(KEYS.USERS, filtered);
    return true;
  },
};

// Items
export const itemStore = {
  getAll: (): Item[] => getFromStorage<Item[]>(KEYS.ITEMS, []),
  getById: (id: string): Item | undefined => {
    const items = getFromStorage<Item[]>(KEYS.ITEMS, []);
    return items.find((i) => i.id === id);
  },
  create: (item: Omit<Item, 'id'>): Item => {
    const items = getFromStorage<Item[]>(KEYS.ITEMS, []);
    const newItem: Item = { ...item, id: uuidv4() };
    setToStorage(KEYS.ITEMS, [...items, newItem]);
    return newItem;
  },
  update: (id: string, updates: Partial<Item>): Item | undefined => {
    const items = getFromStorage<Item[]>(KEYS.ITEMS, []);
    const index = items.findIndex((i) => i.id === id);
    if (index === -1) return undefined;
    items[index] = { ...items[index], ...updates };
    setToStorage(KEYS.ITEMS, items);
    return items[index];
  },
  delete: (id: string): boolean => {
    const items = getFromStorage<Item[]>(KEYS.ITEMS, []);
    const filtered = items.filter((i) => i.id !== id);
    if (filtered.length === items.length) return false;
    setToStorage(KEYS.ITEMS, filtered);
    return true;
  },
};

// Suppliers
export const supplierStore = {
  getAll: (): Supplier[] => getFromStorage<Supplier[]>(KEYS.SUPPLIERS, []),
  getById: (id: string): Supplier | undefined => {
    const suppliers = getFromStorage<Supplier[]>(KEYS.SUPPLIERS, []);
    return suppliers.find((s) => s.id === id);
  },
  create: (supplier: Omit<Supplier, 'id'>): Supplier => {
    const suppliers = getFromStorage<Supplier[]>(KEYS.SUPPLIERS, []);
    const newSupplier: Supplier = { ...supplier, id: uuidv4() };
    setToStorage(KEYS.SUPPLIERS, [...suppliers, newSupplier]);
    return newSupplier;
  },
  update: (id: string, updates: Partial<Supplier>): Supplier | undefined => {
    const suppliers = getFromStorage<Supplier[]>(KEYS.SUPPLIERS, []);
    const index = suppliers.findIndex((s) => s.id === id);
    if (index === -1) return undefined;
    suppliers[index] = { ...suppliers[index], ...updates };
    setToStorage(KEYS.SUPPLIERS, suppliers);
    return suppliers[index];
  },
  delete: (id: string): boolean => {
    const suppliers = getFromStorage<Supplier[]>(KEYS.SUPPLIERS, []);
    const filtered = suppliers.filter((s) => s.id !== id);
    if (filtered.length === suppliers.length) return false;
    setToStorage(KEYS.SUPPLIERS, filtered);
    return true;
  },
};

// Orders
export const orderStore = {
  getAll: (): Order[] => getFromStorage<Order[]>(KEYS.ORDERS, []),
  getById: (id: string): Order | undefined => {
    const orders = getFromStorage<Order[]>(KEYS.ORDERS, []);
    return orders.find((o) => o.id === id);
  },
  create: (order: Omit<Order, 'id'>): Order => {
    const orders = getFromStorage<Order[]>(KEYS.ORDERS, []);
    const newOrder: Order = { ...order, id: uuidv4() };
    setToStorage(KEYS.ORDERS, [...orders, newOrder]);
    return newOrder;
  },
  update: (id: string, updates: Partial<Order>): Order | undefined => {
    const orders = getFromStorage<Order[]>(KEYS.ORDERS, []);
    const index = orders.findIndex((o) => o.id === id);
    if (index === -1) return undefined;
    orders[index] = { ...orders[index], ...updates };
    setToStorage(KEYS.ORDERS, orders);
    return orders[index];
  },
  delete: (id: string): boolean => {
    const orders = getFromStorage<Order[]>(KEYS.ORDERS, []);
    const filtered = orders.filter((o) => o.id !== id);
    if (filtered.length === orders.length) return false;
    setToStorage(KEYS.ORDERS, filtered);
    return true;
  },
  getNextOrderNumber: (): string => {
    const orders = getFromStorage<Order[]>(KEYS.ORDERS, []);
    const maxNumber = orders.reduce((max, order) => {
      const match = order.orderNumber.match(/ORD-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 0);
    return `ORD-${String(maxNumber + 1).padStart(3, '0')}`;
  },
};

// OrderLines
export const orderLineStore = {
  getAll: (): OrderLine[] => getFromStorage<OrderLine[]>(KEYS.ORDER_LINES, []),
  getById: (id: string): OrderLine | undefined => {
    const lines = getFromStorage<OrderLine[]>(KEYS.ORDER_LINES, []);
    return lines.find((l) => l.id === id);
  },
  getByOrderId: (orderId: string): OrderLine[] => {
    const lines = getFromStorage<OrderLine[]>(KEYS.ORDER_LINES, []);
    return lines.filter((l) => l.orderId === orderId);
  },
  create: (line: Omit<OrderLine, 'id'>): OrderLine => {
    const lines = getFromStorage<OrderLine[]>(KEYS.ORDER_LINES, []);
    const newLine: OrderLine = { ...line, id: uuidv4() };
    setToStorage(KEYS.ORDER_LINES, [...lines, newLine]);
    return newLine;
  },
  update: (id: string, updates: Partial<OrderLine>): OrderLine | undefined => {
    const lines = getFromStorage<OrderLine[]>(KEYS.ORDER_LINES, []);
    const index = lines.findIndex((l) => l.id === id);
    if (index === -1) return undefined;
    lines[index] = { ...lines[index], ...updates };
    setToStorage(KEYS.ORDER_LINES, lines);
    return lines[index];
  },
  delete: (id: string): boolean => {
    const lines = getFromStorage<OrderLine[]>(KEYS.ORDER_LINES, []);
    const filtered = lines.filter((l) => l.id !== id);
    if (filtered.length === lines.length) return false;
    setToStorage(KEYS.ORDER_LINES, filtered);
    return true;
  },
  deleteByOrderId: (orderId: string): void => {
    const lines = getFromStorage<OrderLine[]>(KEYS.ORDER_LINES, []);
    const filtered = lines.filter((l) => l.orderId !== orderId);
    setToStorage(KEYS.ORDER_LINES, filtered);
  },
};

// Allocations
export const allocationStore = {
  getAll: (): Allocation[] => getFromStorage<Allocation[]>(KEYS.ALLOCATIONS, []),
  getById: (id: string): Allocation | undefined => {
    const allocations = getFromStorage<Allocation[]>(KEYS.ALLOCATIONS, []);
    return allocations.find((a) => a.id === id);
  },
  getByOrderId: (orderId: string): Allocation[] => {
    const allocations = getFromStorage<Allocation[]>(KEYS.ALLOCATIONS, []);
    return allocations.filter((a) => a.orderId === orderId);
  },
  getByOrderLineId: (orderLineId: string): Allocation[] => {
    const allocations = getFromStorage<Allocation[]>(KEYS.ALLOCATIONS, []);
    return allocations.filter((a) => a.orderLineId === orderLineId);
  },
  create: (allocation: Omit<Allocation, 'id'>): Allocation => {
    const allocations = getFromStorage<Allocation[]>(KEYS.ALLOCATIONS, []);
    const newAllocation: Allocation = { ...allocation, id: uuidv4() };
    setToStorage(KEYS.ALLOCATIONS, [...allocations, newAllocation]);
    return newAllocation;
  },
  update: (id: string, updates: Partial<Allocation>): Allocation | undefined => {
    const allocations = getFromStorage<Allocation[]>(KEYS.ALLOCATIONS, []);
    const index = allocations.findIndex((a) => a.id === id);
    if (index === -1) return undefined;
    allocations[index] = { ...allocations[index], ...updates };
    setToStorage(KEYS.ALLOCATIONS, allocations);
    return allocations[index];
  },
  delete: (id: string): boolean => {
    const allocations = getFromStorage<Allocation[]>(KEYS.ALLOCATIONS, []);
    const filtered = allocations.filter((a) => a.id !== id);
    if (filtered.length === allocations.length) return false;
    setToStorage(KEYS.ALLOCATIONS, filtered);
    return true;
  },
};

// Payments
export const paymentStore = {
  getAll: (): PaymentOperation[] => getFromStorage<PaymentOperation[]>(KEYS.PAYMENTS, []),
  getById: (id: string): PaymentOperation | undefined => {
    const payments = getFromStorage<PaymentOperation[]>(KEYS.PAYMENTS, []);
    return payments.find((p) => p.id === id);
  },
  getByOrderId: (orderId: string): PaymentOperation[] => {
    const payments = getFromStorage<PaymentOperation[]>(KEYS.PAYMENTS, []);
    return payments.filter((p) => p.orderId === orderId);
  },
  getBySupplierId: (supplierId: string): PaymentOperation[] => {
    const payments = getFromStorage<PaymentOperation[]>(KEYS.PAYMENTS, []);
    return payments.filter((p) => p.supplierId === supplierId);
  },
  create: (payment: Omit<PaymentOperation, 'id'>): PaymentOperation => {
    const payments = getFromStorage<PaymentOperation[]>(KEYS.PAYMENTS, []);
    const newPayment: PaymentOperation = { ...payment, id: uuidv4() };
    setToStorage(KEYS.PAYMENTS, [...payments, newPayment]);
    return newPayment;
  },
  update: (id: string, updates: Partial<PaymentOperation>): PaymentOperation | undefined => {
    const payments = getFromStorage<PaymentOperation[]>(KEYS.PAYMENTS, []);
    const index = payments.findIndex((p) => p.id === id);
    if (index === -1) return undefined;
    payments[index] = { ...payments[index], ...updates };
    setToStorage(KEYS.PAYMENTS, payments);
    return payments[index];
  },
  delete: (id: string): boolean => {
    const payments = getFromStorage<PaymentOperation[]>(KEYS.PAYMENTS, []);
    const filtered = payments.filter((p) => p.id !== id);
    if (filtered.length === payments.length) return false;
    setToStorage(KEYS.PAYMENTS, filtered);
    return true;
  },
};

// AuditLogs
export const auditLogStore = {
  getAll: (): AuditLog[] => getFromStorage<AuditLog[]>(KEYS.AUDIT_LOGS, []),
  create: (log: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog => {
    const logs = getFromStorage<AuditLog[]>(KEYS.AUDIT_LOGS, []);
    const newLog: AuditLog = {
      ...log,
      id: uuidv4(),
      timestamp: new Date().toISOString(),
    };
    setToStorage(KEYS.AUDIT_LOGS, [...logs, newLog]);
    return newLog;
  },
  clear: (): void => {
    setToStorage(KEYS.AUDIT_LOGS, []);
  },
};

// Current User
export const currentUserStore = {
  get: (): User | null => getFromStorage<User | null>(KEYS.CURRENT_USER, null),
  set: (user: User | null): void => setToStorage(KEYS.CURRENT_USER, user),
  clear: (): void => localStorage.removeItem(KEYS.CURRENT_USER),
};

// Admin Mode
export const adminModeStore = {
  get: (): boolean => getFromStorage<boolean>(KEYS.ADMIN_MODE, false),
  set: (enabled: boolean): void => setToStorage(KEYS.ADMIN_MODE, enabled),
  reset: (): void => setToStorage(KEYS.ADMIN_MODE, false),
};

// Clear all data
export function clearAllData(): void {
  Object.values(KEYS).forEach((key) => {
    if (key !== KEYS.CURRENT_USER && key !== KEYS.USERS) {
      localStorage.removeItem(key);
    }
  });
  initializeDefaultUser();
}

// Export all data
export function exportData(): string {
  const data: Record<string, any> = {};
  Object.entries(KEYS).forEach(([name, key]) => {
    if (key !== KEYS.CURRENT_USER && key !== KEYS.ADMIN_MODE) {
      data[name] = getFromStorage(key, null);
    }
  });
  return JSON.stringify(data, null, 2);
}

// Import data
export function importData(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString);
    Object.entries(data).forEach(([name, value]) => {
      const key = (KEYS as any)[name];
      if (key && key !== KEYS.CURRENT_USER && key !== KEYS.ADMIN_MODE) {
        setToStorage(key, value);
      }
    });
    return true;
  } catch (error) {
    console.error('Error importing data:', error);
    return false;
  }
}
