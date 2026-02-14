import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout/Layout';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { showToast } from '../../components/ui/Toast';
import { 
  orderStore, 
  orderLineStore, 
  itemStore, 
  supplierStore, 
  allocationStore,
  currentUserStore,
  auditLogStore 
} from '../../store';
import { 
  toTons, 
  formatNumber, 
  validateDistribution, 
  TONS_IN_CONTAINER_DEFAULT
} from '../../utils/helpers';
import { formatCurrency } from '../../utils/format';
import type { Order, OrderLine, Allocation, Unit, Currency } from '../../types';

export function DistributionPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | undefined>();
  const [orderLines, setOrderLines] = useState<OrderLine[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  const currentUser = currentUserStore.get();

  useEffect(() => {
    const loadData = async () => {
      if (orderId) {
        try {
          setLoading(true);
          const foundOrder = await orderStore.getById(orderId);
          setOrder(foundOrder);
          
          if (foundOrder) {
            const [lines, allocs, supps, itms] = await Promise.all([
              orderLineStore.getByOrderId(orderId),
              allocationStore.getByOrderId(orderId),
              supplierStore.getAll(),
              itemStore.getAll()
            ]);
            setOrderLines(lines);
            setAllocations(allocs);
            setSuppliers(supps);
            setItems(itms);
          }
        } catch (error) {
          showToast('error', 'Ошибка загрузки данных');
        } finally {
          setLoading(false);
        }
      }
    };
    loadData();
  }, [orderId]);

  const [newAllocation, setNewAllocation] = useState<{
    orderLineId: string;
    supplierId: string;
    quantity: string;
    unit: Unit;
    pricePerTon: string;
    currency: Currency;
    containerSize: number;
  }>({
    orderLineId: '',
    supplierId: '',
    quantity: '',
    unit: 'т',
    pricePerTon: '',
    currency: 'USD',
    containerSize: TONS_IN_CONTAINER_DEFAULT,
  });

  const handleAddAllocation = async (orderLineId: string) => {
    if (!newAllocation.supplierId || !newAllocation.quantity || !newAllocation.pricePerTon) {
      showToast('warning', 'Заполните все поля');
      return;
    }

    const qty = parseFloat(newAllocation.quantity);
    const price = parseFloat(newAllocation.pricePerTon);

    if (isNaN(qty) || qty <= 0 || isNaN(price) || price < 0) {
      showToast('error', 'Некорректные значения');
      return;
    }

    const orderLine = orderLines.find(l => l.id === orderLineId);
    if (!orderLine) return;

    const quantityInTons = toTons(qty, newAllocation.unit, newAllocation.containerSize);
    
    // Check if can allocate
    const lineAllocations = allocations.filter(a => a.orderLineId === orderLineId);
    const { allocated } = validateDistribution(orderLine, lineAllocations);
    
    if (allocated + quantityInTons > orderLine.quantityInTons + 0.001) {
      showToast('error', 'Превышено количество для распределения');
      return;
    }

    const totalSum = quantityInTons * price;

    try {
      const allocation = await allocationStore.create({
        orderId: order!.id,
        orderLineId,
        supplierId: newAllocation.supplierId,
        itemId: orderLine.itemId,
        quantity: qty,
        unit: newAllocation.unit,
        quantityInTons,
        pricePerTon: price,
        totalSum,
        currency: newAllocation.currency,
        containerSize: newAllocation.unit === 'конт.' ? newAllocation.containerSize : undefined,
      });

      await auditLogStore.create({
        action: 'CREATE',
        entityType: 'Allocation',
        entityId: allocation.id,
        userId: currentUser?.id || '',
        details: { orderNumber: order?.orderNumber, itemId: orderLine.itemId },
      });

      setAllocations(await allocationStore.getByOrderId(orderId!));
      setNewAllocation({
        orderLineId: '',
        supplierId: '',
        quantity: '',
        unit: 'т',
        pricePerTon: '',
        currency: 'USD',
        containerSize: TONS_IN_CONTAINER_DEFAULT,
      });
      showToast('success', 'Распределение добавлено');
    } catch (error) {
      showToast('error', 'Ошибка при добавлении распределения');
    }
  };

  const handleDeleteAllocation = async (allocationId: string) => {
    if (!confirm('Удалить распределение?')) return;
    
    try {
      await allocationStore.delete(allocationId);
      setAllocations(await allocationStore.getByOrderId(orderId!));
      showToast('success', 'Распределение удалено');
    } catch (error) {
      showToast('error', 'Ошибка при удалении распределения');
    }
  };

  const handleCompleteDistribution = async () => {
    // Check all lines are fully distributed
    for (const line of orderLines) {
      const lineAllocations = allocations.filter(a => a.orderLineId === line.id);
      const { isValid, remainder } = validateDistribution(line, lineAllocations);
      
      if (!isValid || Math.abs(remainder) >= 0.001) {
        showToast('error', 'Не все позиции полностью распределены');
        return;
      }
    }

    try {
      await orderStore.update(order!.id, { status: 'financial' });
      await auditLogStore.create({
        action: 'UPDATE',
        entityType: 'Order',
        entityId: order!.id,
        userId: currentUser?.id || '',
        details: { status: 'financial', orderNumber: order?.orderNumber },
      });
      
      showToast('success', 'Заказ переведен в финансы');
      navigate('/finance');
    } catch (error) {
      showToast('error', 'Ошибка при переводе заказа в финансы');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Загрузка...</span>
        </div>
      </Layout>
    );
  }

  if (!order) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600">Заказ не найден</p>
          <Button className="mt-4" onClick={() => navigate('/distribution')}>
            ← Назад
          </Button>
        </div>
      </Layout>
    );
  }

  const allFullyDistributed = orderLines.every(line => {
    const lineAllocations = allocations.filter(a => a.orderLineId === line.id);
    const { isValid, remainder } = validateDistribution(line, lineAllocations);
    return isValid && Math.abs(remainder) < 0.001;
  });

  return (
    <Layout>
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Распределение заказа {order.orderNumber}</h1>
          <div className="flex gap-2">
            <Button
              onClick={handleCompleteDistribution}
              disabled={!allFullyDistributed || order.status !== 'locked'}
              variant="success"
            >
              Перейти в финансы
            </Button>
            <Button variant="secondary" onClick={() => navigate('/distribution')}>
              ← Назад
            </Button>
          </div>
        </div>

        {/* Order Lines */}
        {orderLines.map((line) => {
          const item = items.find(i => i.id === line.itemId);
          const lineAllocations = allocations.filter(a => a.orderLineId === line.id);
          const { allocated, remainder } = validateDistribution(line, lineAllocations);
          const isFullyDistributed = Math.abs(remainder) < 0.001;

          return (
            <div key={line.id} className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-semibold">{item?.name}</h2>
                  <p className="text-gray-600">
                    Заказано: {formatNumber(line.quantityInTons)} т
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Распределено</p>
                  <p className={`text-2xl font-bold ${isFullyDistributed ? 'text-green-600' : 'text-orange-600'}`}>
                    {formatNumber(allocated)} т
                  </p>
                  <p className="text-sm text-gray-600">
                    Остаток: {formatNumber(Math.max(0, remainder))} т
                  </p>
                </div>
              </div>

              {/* Existing Allocations */}
              {lineAllocations.length > 0 && (
                <div className="mb-4">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Поставщик</th>
                        <th className="px-3 py-2 text-left">Количество</th>
                        <th className="px-3 py-2 text-left">Цена/тонну</th>
                        <th className="px-3 py-2 text-left">Сумма</th>
                        <th className="px-3 py-2 text-center w-20">Действия</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {lineAllocations.map((alloc) => {
                        const supplier = suppliers.find(s => s.id === alloc.supplierId);
                        return (
                          <tr key={alloc.id}>
                            <td className="px-3 py-2">{supplier?.name}</td>
                            <td className="px-3 py-2">
                              {formatNumber(alloc.quantity)} {alloc.unit} ({formatNumber(alloc.quantityInTons)} т)
                            </td>
                            <td className="px-3 py-2">
                              {formatCurrency(alloc.pricePerTon, alloc.currency)}/т
                            </td>
                            <td className="px-3 py-2 font-semibold">
                              {formatCurrency(alloc.totalSum, alloc.currency)}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button
                                onClick={() => handleDeleteAllocation(alloc.id)}
                                className="text-red-600 hover:text-red-800"
                                title="Удалить"
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Add Allocation Form */}
              {!isFullyDistributed && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">+ Добавить поставщика</p>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                    <div className="md:col-span-3">
                      <Select
                        value={newAllocation.orderLineId === line.id ? newAllocation.supplierId : ''}
                        onChange={(e) => setNewAllocation({ ...newAllocation, orderLineId: line.id, supplierId: e.target.value })}
                        options={[
                          { value: '', label: 'Выберите поставщика' },
                          ...suppliers.map(s => ({ value: s.id, label: s.name })),
                        ]}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Input
                        type="number"
                        step="0.001"
                        placeholder="Кол-во"
                        value={newAllocation.orderLineId === line.id ? newAllocation.quantity : ''}
                        onChange={(e) => setNewAllocation({ ...newAllocation, orderLineId: line.id, quantity: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Select
                        value={newAllocation.orderLineId === line.id ? newAllocation.unit : 'т'}
                        onChange={(e) => setNewAllocation({ ...newAllocation, orderLineId: line.id, unit: e.target.value as Unit })}
                        options={[
                          { value: 'т', label: 'т' },
                          { value: 'кг', label: 'кг' },
                          { value: 'конт.', label: 'конт.' },
                        ]}
                      />
                    </div>
                    {newAllocation.orderLineId === line.id && newAllocation.unit === 'конт.' && (
                      <div className="md:col-span-1">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => setNewAllocation({ ...newAllocation, containerSize: TONS_IN_CONTAINER_DEFAULT })}
                            className="flex-1 px-2 py-2 rounded text-xs bg-blue-600 text-white"
                          >
                            28т
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="md:col-span-2">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Цена/тонну"
                        value={newAllocation.orderLineId === line.id ? newAllocation.pricePerTon : ''}
                        onChange={(e) => setNewAllocation({ ...newAllocation, orderLineId: line.id, pricePerTon: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-1">
                      <Select
                        value={newAllocation.orderLineId === line.id ? newAllocation.currency : 'USD'}
                        onChange={(e) => setNewAllocation({ ...newAllocation, orderLineId: line.id, currency: e.target.value as Currency })}
                        options={[
                          { value: 'USD', label: 'USD' },
                          { value: 'UZS', label: 'UZS' },
                        ]}
                      />
                    </div>
                    <div className="md:col-span-1">
                      <Button
                        size="sm"
                        onClick={() => handleAddAllocation(line.id)}
                        className="w-full"
                      >
                        +
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Summary by Supplier */}
        {allocations.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Итого по поставщикам</h2>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Поставщик</th>
                  <th className="px-4 py-2 text-right">USD</th>
                  <th className="px-4 py-2 text-right">UZS</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {Object.entries(
                  allocations.reduce((acc, alloc) => {
                    if (!acc[alloc.supplierId]) {
                      acc[alloc.supplierId] = { USD: 0, UZS: 0 };
                    }
                    acc[alloc.supplierId][alloc.currency] += alloc.totalSum;
                    return acc;
                  }, {} as Record<string, { USD: number; UZS: number }>)
                ).map(([supplierId, sums]) => {
                  const supplier = suppliers.find(s => s.id === supplierId);
                  return (
                    <tr key={supplierId}>
                      <td className="px-4 py-2 font-medium">{supplier?.name}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(sums.USD, 'USD')}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(sums.UZS, 'UZS')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
