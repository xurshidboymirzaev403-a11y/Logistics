import { supabase } from '../lib/supabase';
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

// LocalStorage keys (only for currentUser and adminMode)
const KEYS = {
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

// Helper functions for converting between camelCase and snake_case
function toSnakeCase(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key in obj) {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    result[snakeKey] = obj[key];
  }
  return result;
}

function toCamelCase(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = obj[key];
  }
  return result;
}

// Initialize default user
export async function initializeDefaultUser(): Promise<void> {
  const { data } = await supabase.from('users').select('*');
  if (!data || data.length === 0) {
    await supabase.from('users').insert({
      username: 'admin',
      password: 'admin',
      role: 'admin',
      full_name: 'Администратор',
    });
  }
}

// Users
export const userStore = {
  getAll: async (): Promise<User[]> => {
    const { data, error } = await supabase.from('users').select('*');
    if (error) {
      console.error(error);
      return [];
    }
    return (data || []).map(row => toCamelCase(row) as User);
  },
  getById: async (id: string): Promise<User | undefined> => {
    const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
    if (error) return undefined;
    return toCamelCase(data) as User;
  },
  getByUsername: async (username: string): Promise<User | undefined> => {
    const { data, error } = await supabase.from('users').select('*').eq('username', username).single();
    if (error) return undefined;
    return toCamelCase(data) as User;
  },
  create: async (user: Omit<User, 'id'>): Promise<User> => {
    const snakeUser = toSnakeCase(user);
    const { data, error } = await supabase.from('users').insert(snakeUser).select().single();
    if (error) throw error;
    return toCamelCase(data) as User;
  },
  update: async (id: string, updates: Partial<User>): Promise<User | undefined> => {
    const snakeUpdates = toSnakeCase(updates);
    const { data, error } = await supabase.from('users').update(snakeUpdates).eq('id', id).select().single();
    if (error) return undefined;
    return toCamelCase(data) as User;
  },
  delete: async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('users').delete().eq('id', id);
    return !error;
  },
};

// Items
export const itemStore = {
  getAll: async (): Promise<Item[]> => {
    const { data, error } = await supabase.from('items').select('*');
    if (error) {
      console.error(error);
      return [];
    }
    return (data || []).map(row => toCamelCase(row) as Item);
  },
  getById: async (id: string): Promise<Item | undefined> => {
    const { data, error } = await supabase.from('items').select('*').eq('id', id).single();
    if (error) return undefined;
    return toCamelCase(data) as Item;
  },
  create: async (item: Omit<Item, 'id'>): Promise<Item> => {
    const snakeItem = toSnakeCase(item);
    const { data, error } = await supabase.from('items').insert(snakeItem).select().single();
    if (error) throw error;
    return toCamelCase(data) as Item;
  },
  update: async (id: string, updates: Partial<Item>): Promise<Item | undefined> => {
    const snakeUpdates = toSnakeCase(updates);
    const { data, error } = await supabase.from('items').update(snakeUpdates).eq('id', id).select().single();
    if (error) return undefined;
    return toCamelCase(data) as Item;
  },
  delete: async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('items').delete().eq('id', id);
    return !error;
  },
};

// Suppliers
export const supplierStore = {
  getAll: async (): Promise<Supplier[]> => {
    const { data, error } = await supabase.from('suppliers').select('*');
    if (error) {
      console.error(error);
      return [];
    }
    return (data || []).map(row => toCamelCase(row) as Supplier);
  },
  getById: async (id: string): Promise<Supplier | undefined> => {
    const { data, error } = await supabase.from('suppliers').select('*').eq('id', id).single();
    if (error) return undefined;
    return toCamelCase(data) as Supplier;
  },
  create: async (supplier: Omit<Supplier, 'id'>): Promise<Supplier> => {
    const snakeSupplier = toSnakeCase(supplier);
    const { data, error } = await supabase.from('suppliers').insert(snakeSupplier).select().single();
    if (error) throw error;
    return toCamelCase(data) as Supplier;
  },
  update: async (id: string, updates: Partial<Supplier>): Promise<Supplier | undefined> => {
    const snakeUpdates = toSnakeCase(updates);
    const { data, error } = await supabase.from('suppliers').update(snakeUpdates).eq('id', id).select().single();
    if (error) return undefined;
    return toCamelCase(data) as Supplier;
  },
  delete: async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('suppliers').delete().eq('id', id);
    return !error;
  },
};

// Orders
export const orderStore = {
  getAll: async (): Promise<Order[]> => {
    const { data, error } = await supabase.from('orders').select('*');
    if (error) {
      console.error(error);
      return [];
    }
    return (data || []).map(row => toCamelCase(row) as Order);
  },
  getById: async (id: string): Promise<Order | undefined> => {
    const { data, error } = await supabase.from('orders').select('*').eq('id', id).single();
    if (error) return undefined;
    return toCamelCase(data) as Order;
  },
  create: async (order: Omit<Order, 'id'>): Promise<Order> => {
    const snakeOrder = toSnakeCase(order);
    const { data, error } = await supabase.from('orders').insert(snakeOrder).select().single();
    if (error) throw error;
    return toCamelCase(data) as Order;
  },
  update: async (id: string, updates: Partial<Order>): Promise<Order | undefined> => {
    const snakeUpdates = toSnakeCase(updates);
    const { data, error } = await supabase.from('orders').update(snakeUpdates).eq('id', id).select().single();
    if (error) return undefined;
    return toCamelCase(data) as Order;
  },
  delete: async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('orders').delete().eq('id', id);
    return !error;
  },
  getNextOrderNumber: async (): Promise<string> => {
    const { data } = await supabase.from('orders').select('order_number');
    const orders = data || [];
    const maxNumber = orders.reduce((max: number, order: any) => {
      const match = order.order_number?.match(/ORD-(\d+)/);
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
  getAll: async (): Promise<OrderLine[]> => {
    const { data, error } = await supabase.from('order_lines').select('*');
    if (error) {
      console.error(error);
      return [];
    }
    return (data || []).map(row => toCamelCase(row) as OrderLine);
  },
  getById: async (id: string): Promise<OrderLine | undefined> => {
    const { data, error } = await supabase.from('order_lines').select('*').eq('id', id).single();
    if (error) return undefined;
    return toCamelCase(data) as OrderLine;
  },
  getByOrderId: async (orderId: string): Promise<OrderLine[]> => {
    const { data, error } = await supabase.from('order_lines').select('*').eq('order_id', orderId);
    if (error) {
      console.error(error);
      return [];
    }
    return (data || []).map(row => toCamelCase(row) as OrderLine);
  },
  create: async (line: Omit<OrderLine, 'id'>): Promise<OrderLine> => {
    const snakeLine = toSnakeCase(line);
    const { data, error } = await supabase.from('order_lines').insert(snakeLine).select().single();
    if (error) throw error;
    return toCamelCase(data) as OrderLine;
  },
  update: async (id: string, updates: Partial<OrderLine>): Promise<OrderLine | undefined> => {
    const snakeUpdates = toSnakeCase(updates);
    const { data, error } = await supabase.from('order_lines').update(snakeUpdates).eq('id', id).select().single();
    if (error) return undefined;
    return toCamelCase(data) as OrderLine;
  },
  delete: async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('order_lines').delete().eq('id', id);
    return !error;
  },
  deleteByOrderId: async (orderId: string): Promise<void> => {
    await supabase.from('order_lines').delete().eq('order_id', orderId);
  },
};

// Allocations
export const allocationStore = {
  getAll: async (): Promise<Allocation[]> => {
    const { data, error } = await supabase.from('allocations').select('*');
    if (error) {
      console.error(error);
      return [];
    }
    return (data || []).map(row => toCamelCase(row) as Allocation);
  },
  getById: async (id: string): Promise<Allocation | undefined> => {
    const { data, error } = await supabase.from('allocations').select('*').eq('id', id).single();
    if (error) return undefined;
    return toCamelCase(data) as Allocation;
  },
  getByOrderId: async (orderId: string): Promise<Allocation[]> => {
    const { data, error } = await supabase.from('allocations').select('*').eq('order_id', orderId);
    if (error) {
      console.error(error);
      return [];
    }
    return (data || []).map(row => toCamelCase(row) as Allocation);
  },
  getByOrderLineId: async (orderLineId: string): Promise<Allocation[]> => {
    const { data, error } = await supabase.from('allocations').select('*').eq('order_line_id', orderLineId);
    if (error) {
      console.error(error);
      return [];
    }
    return (data || []).map(row => toCamelCase(row) as Allocation);
  },
  create: async (allocation: Omit<Allocation, 'id'>): Promise<Allocation> => {
    const snakeAllocation = toSnakeCase(allocation);
    const { data, error } = await supabase.from('allocations').insert(snakeAllocation).select().single();
    if (error) throw error;
    return toCamelCase(data) as Allocation;
  },
  update: async (id: string, updates: Partial<Allocation>): Promise<Allocation | undefined> => {
    const snakeUpdates = toSnakeCase(updates);
    const { data, error } = await supabase.from('allocations').update(snakeUpdates).eq('id', id).select().single();
    if (error) return undefined;
    return toCamelCase(data) as Allocation;
  },
  delete: async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('allocations').delete().eq('id', id);
    return !error;
  },
};

// Payments
export const paymentStore = {
  getAll: async (): Promise<PaymentOperation[]> => {
    const { data, error } = await supabase.from('payments').select('*');
    if (error) {
      console.error(error);
      return [];
    }
    return (data || []).map(row => toCamelCase(row) as PaymentOperation);
  },
  getById: async (id: string): Promise<PaymentOperation | undefined> => {
    const { data, error } = await supabase.from('payments').select('*').eq('id', id).single();
    if (error) return undefined;
    return toCamelCase(data) as PaymentOperation;
  },
  getByOrderId: async (orderId: string): Promise<PaymentOperation[]> => {
    const { data, error } = await supabase.from('payments').select('*').eq('order_id', orderId);
    if (error) {
      console.error(error);
      return [];
    }
    return (data || []).map(row => toCamelCase(row) as PaymentOperation);
  },
  getBySupplierId: async (supplierId: string): Promise<PaymentOperation[]> => {
    const { data, error } = await supabase.from('payments').select('*').eq('supplier_id', supplierId);
    if (error) {
      console.error(error);
      return [];
    }
    return (data || []).map(row => toCamelCase(row) as PaymentOperation);
  },
  create: async (payment: Omit<PaymentOperation, 'id'>): Promise<PaymentOperation> => {
    const snakePayment = toSnakeCase(payment);
    const { data, error } = await supabase.from('payments').insert(snakePayment).select().single();
    if (error) throw error;
    return toCamelCase(data) as PaymentOperation;
  },
  update: async (id: string, updates: Partial<PaymentOperation>): Promise<PaymentOperation | undefined> => {
    const snakeUpdates = toSnakeCase(updates);
    const { data, error } = await supabase.from('payments').update(snakeUpdates).eq('id', id).select().single();
    if (error) return undefined;
    return toCamelCase(data) as PaymentOperation;
  },
  delete: async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('payments').delete().eq('id', id);
    return !error;
  },
};

// AuditLogs
export const auditLogStore = {
  getAll: async (): Promise<AuditLog[]> => {
    const { data, error } = await supabase.from('audit_logs').select('*');
    if (error) {
      console.error(error);
      return [];
    }
    return (data || []).map(row => toCamelCase(row) as AuditLog);
  },
  create: async (log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog> => {
    const snakeLog = toSnakeCase({
      ...log,
      timestamp: new Date().toISOString(),
    });
    const { data, error } = await supabase.from('audit_logs').insert(snakeLog).select().single();
    if (error) throw error;
    return toCamelCase(data) as AuditLog;
  },
  clear: async (): Promise<void> => {
    await supabase.from('audit_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
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
export async function clearAllData(): Promise<void> {
  await supabase.from('items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('suppliers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('allocations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('payments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('order_lines').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('audit_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await initializeDefaultUser();
}

// Export all data
export async function exportData(): Promise<string> {
  const data: Record<string, any> = {};
  
  const [users, items, suppliers, orders, orderLines, allocations, payments, auditLogs] = await Promise.all([
    userStore.getAll(),
    itemStore.getAll(),
    supplierStore.getAll(),
    orderStore.getAll(),
    orderLineStore.getAll(),
    allocationStore.getAll(),
    paymentStore.getAll(),
    auditLogStore.getAll(),
  ]);

  data.USERS = users;
  data.ITEMS = items;
  data.SUPPLIERS = suppliers;
  data.ORDERS = orders;
  data.ORDER_LINES = orderLines;
  data.ALLOCATIONS = allocations;
  data.PAYMENTS = payments;
  data.AUDIT_LOGS = auditLogs;
  
  return JSON.stringify(data, null, 2);
}

// Import data
export async function importData(jsonString: string): Promise<boolean> {
  try {
    const data = JSON.parse(jsonString);
    
    // Clear existing data first
    await clearAllData();
    
    // Import in correct order (respecting foreign keys)
    if (data.USERS && data.USERS.length > 0) {
      for (const user of data.USERS) {
        await supabase.from('users').insert(toSnakeCase(user));
      }
    }
    
    if (data.ITEMS && data.ITEMS.length > 0) {
      for (const item of data.ITEMS) {
        await supabase.from('items').insert(toSnakeCase(item));
      }
    }
    
    if (data.SUPPLIERS && data.SUPPLIERS.length > 0) {
      for (const supplier of data.SUPPLIERS) {
        await supabase.from('suppliers').insert(toSnakeCase(supplier));
      }
    }
    
    if (data.ORDERS && data.ORDERS.length > 0) {
      for (const order of data.ORDERS) {
        await supabase.from('orders').insert(toSnakeCase(order));
      }
    }
    
    if (data.ORDER_LINES && data.ORDER_LINES.length > 0) {
      for (const line of data.ORDER_LINES) {
        await supabase.from('order_lines').insert(toSnakeCase(line));
      }
    }
    
    if (data.ALLOCATIONS && data.ALLOCATIONS.length > 0) {
      for (const allocation of data.ALLOCATIONS) {
        await supabase.from('allocations').insert(toSnakeCase(allocation));
      }
    }
    
    if (data.PAYMENTS && data.PAYMENTS.length > 0) {
      for (const payment of data.PAYMENTS) {
        await supabase.from('payments').insert(toSnakeCase(payment));
      }
    }
    
    if (data.AUDIT_LOGS && data.AUDIT_LOGS.length > 0) {
      for (const log of data.AUDIT_LOGS) {
        await supabase.from('audit_logs').insert(toSnakeCase(log));
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error importing data:', error);
    return false;
  }
}
