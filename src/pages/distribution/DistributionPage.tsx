import { v4 as uuidv4 } from 'uuid';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout/Layout';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
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
  formatTonsWithContainers,
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
  
  const suppliers = supplierStore.getAll();
  const currentUser = currentUserStore.get();

  // Multi-replacement modal state
  interface ReplacementLine {
    id: string;
    itemId: string;
    quantityInTons: string;
  }
  
  const [isMultiReplaceModalOpen, setIsMultiReplaceModalOpen] = useState(false);
  const [selectedLine, setSelectedLine] = useState<OrderLine | null>(null);
  const [multiReplaceForm, setMultiReplaceForm] = useState<ReplacementLine[]>([]);

  useEffect(() => {
    if (orderId) {
      const foundOrder = orderStore.getById(orderId);
      setOrder(foundOrder);
      
      if (foundOrder) {
        setOrderLines(orderLineStore.getByOrderId(orderId));
        setAllocations(allocationStore.getByOrderId(orderId));
      }
    }
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

  const handleAddAllocation = (orderLineId: string) => {
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

    const allocation = allocationStore.create({
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

    auditLogStore.create({
      action: 'CREATE',
      entityType: 'Allocation',
      entityId: allocation.id,
      userId: currentUser?.id || '',
      details: { orderNumber: order?.orderNumber, itemId: orderLine.itemId },
    });

    setAllocations(allocationStore.getByOrderId(orderId!));
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
  };

  const handleDeleteAllocation = (allocationId: string) => {
    if (!confirm('Удалить распределение?')) return;
    
    allocationStore.delete(allocationId);
    setAllocations(allocationStore.getByOrderId(orderId!));
    showToast('success', 'Распределение удалено');
  };

  const handleCompleteDistribution = () => {
    if (!order) return;
    const currentUser = currentUserStore.get();

    // Check all lines are fully distributed
    const allFullyDistributed = orderLines.every(line => {
      const lineAllocations = allocations.filter(a => a.orderLineId === line.id);
      const { isValid, remainder } = validateDistribution(line, lineAllocations);
      return isValid && Math.abs(remainder) < 0.001;
    });

    if (!allFullyDistributed) {
      // Show warning for partial distribution
      if (!confirm('⚠️ Не все позиции распределены. Продолжить?')) {
        return;
      }
    }

    orderStore.update(order.id, { status: 'financial' });
    auditLogStore.create({
      action: 'UPDATE',
      entityType: 'Order',
      entityId: order.id,
      userId: currentUser?.id || '',
      details: { 
        status: 'financial', 
        orderNumber: order?.orderNumber,
        fullyDistributed: allFullyDistributed,
      },
    });
    
    showToast('success', 'Заказ переведен в финансы');
    navigate('/finance');
  };

  // Multi-replacement handlers for distribution page
  const handleOpenMultiReplace = (line: OrderLine) => {
    const lineAllocations = allocations.filter(a => a.orderLineId === line.id);
    
    if (lineAllocations.length > 0) {
      if (!confirm('⚠️ У этой позиции есть распределения. При замене они будут удалены. Продолжить?')) {
        return;
      }
    }

    setSelectedLine(line);
    setMultiReplaceForm([{
      id: uuidv4(),
      itemId: '',
      quantityInTons: '',
    }]);
    setIsMultiReplaceModalOpen(true);
  };

  const handleAddReplacementLine = () => {
    setMultiReplaceForm([
      ...multiReplaceForm,
      {
        id: uuidv4(),
        itemId: '',
        quantityInTons: '',
      }
    ]);
  };

  const handleRemoveReplacementLine = (id: string) => {
    if (multiReplaceForm.length === 1) {
      showToast('warning', 'Должна быть хотя бы одна позиция замены');
      return;
    }
    setMultiReplaceForm(multiReplaceForm.filter(line => line.id !== id));
  };

  const handleUpdateReplacementLine = (id: string, field: 'itemId' | 'quantityInTons', value: string) => {
    setMultiReplaceForm(multiReplaceForm.map(line => 
      line.id === id ? { ...line, [field]: value } : line
    ));
  };

  const handleSaveMultiReplace = () => {
    if (!selectedLine || !order) return;

    // Validate all lines have item selected
    const hasEmptyItem = multiReplaceForm.some(line => !line.itemId);
    if (hasEmptyItem) {
      showToast('error', 'Выберите позицию для всех строк');
      return;
    }

    // Validate all lines have valid quantities
    const parsedLines = multiReplaceForm.map(line => ({
      ...line,
      quantityInTonsParsed: parseFloat(line.quantityInTons),
    }));

    const hasInvalidQuantity = parsedLines.some(line => 
      isNaN(line.quantityInTonsParsed) || line.quantityInTonsParsed <= 0
    );
    if (hasInvalidQuantity) {
      showToast('error', 'Введите корректное количество для всех позиций');
      return;
    }

    // Calculate total
    const totalNewQuantity = parsedLines.reduce((sum, line) => sum + line.quantityInTonsParsed, 0);

    // Validate total doesn't exceed original
    if (totalNewQuantity > selectedLine.quantityInTons + 0.001) {
      showToast('error', `Общее количество (${formatNumber(totalNewQuantity)} т) превышает исходное (${formatNumber(selectedLine.quantityInTons)} т)`);
      return;
    }

    const oldItem = itemStore.getById(selectedLine.itemId);
    const remainder = selectedLine.quantityInTons - totalNewQuantity;

    // Delete all allocations for this line
    const lineAllocations = allocations.filter(a => a.orderLineId === selectedLine.id);
    lineAllocations.forEach(alloc => allocationStore.delete(alloc.id));

    // If single replacement with same tonnage - simple update
    if (parsedLines.length === 1 && Math.abs(totalNewQuantity - selectedLine.quantityInTons) < 0.001) {
      const newItem = itemStore.getById(parsedLines[0].itemId);
      
      orderLineStore.update(selectedLine.id, {
        itemId: parsedLines[0].itemId,
      });

      auditLogStore.create({
        action: 'REPLACE',
        entityType: 'OrderLine',
        entityId: selectedLine.id,
        userId: currentUser?.id || '',
        details: {
          orderNumber: order.orderNumber,
          oldItem: oldItem?.name,
          newItem: newItem?.name,
          quantity: totalNewQuantity,
          context: 'distribution',
        },
      });

      showToast('success', 'Позиция заменена');
    } else {
      // Multi-line or partial replacement
      
      // If there's a remainder, update the original line with reduced quantity
      if (remainder > 0.001) {
        orderLineStore.update(selectedLine.id, {
          quantity: remainder,
          quantityInTons: remainder,
        });
      } else {
        // No remainder - delete the original line
        orderLineStore.delete(selectedLine.id);
      }

      // Create new lines for each replacement
      parsedLines.forEach(line => {
        orderLineStore.create({
          orderId: order.id,
          itemId: line.itemId,
          quantity: line.quantityInTonsParsed,
          unit: 'т',
          quantityInTons: line.quantityInTonsParsed,
          containerSize: TONS_IN_CONTAINER_DEFAULT,
        });
      });

      const newItemNames = parsedLines.map(line => {
        const item = itemStore.getById(line.itemId);
        return `${item?.name} (${formatNumber(line.quantityInTonsParsed)} т)`;
      }).join(', ');

      auditLogStore.create({
        action: 'REPLACE_MULTI',
        entityType: 'OrderLine',
        entityId: selectedLine.id,
        userId: currentUser?.id || '',
        details: {
          orderNumber: order.orderNumber,
          oldItem: oldItem?.name,
          oldQuantity: selectedLine.quantityInTons,
          newItems: newItemNames,
          totalNewQuantity,
          remainder,
          context: 'distribution',
        },
      });

      showToast('success', parsedLines.length > 1 ? 'Позиция заменена на несколько' : 'Позиция частично заменена');
    }

    setOrderLines(orderLineStore.getByOrderId(orderId!));
    setAllocations(allocationStore.getByOrderId(orderId!));
    setIsMultiReplaceModalOpen(false);
  };

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

  return (
    <Layout>
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Распределение заказа {order.orderNumber}</h1>
          <div className="flex gap-2">
            <Button
              onClick={handleCompleteDistribution}
              disabled={order.status !== 'locked'}
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
          const item = itemStore.getById(line.itemId);
          const lineAllocations = allocations.filter(a => a.orderLineId === line.id);
          const { allocated, remainder } = validateDistribution(line, lineAllocations);
          const isFullyDistributed = Math.abs(remainder) < 0.001;

          return (
            <div key={line.id} className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h2 className="text-xl font-semibold">{item?.name}</h2>
                  <p className="text-gray-600">
                    Заказано: {formatTonsWithContainers(line.quantityInTons)}
                  </p>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Распределено</p>
                    <p className={`text-2xl font-bold ${isFullyDistributed ? 'text-green-600' : 'text-orange-600'}`}>
                      {formatTonsWithContainers(allocated)}
                    </p>
                    <p className="text-sm text-gray-600">
                      Остаток: {formatTonsWithContainers(Math.max(0, remainder))}
                    </p>
                  </div>
                  {order?.status === 'locked' && (
                    <Button
                      size="sm"
                      variant="warning"
                      onClick={() => handleOpenMultiReplace(line)}
                      title="Заменить/Разбить позицию"
                    >
                      🔄 Заменить
                    </Button>
                  )}
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
                        const supplier = supplierStore.getById(alloc.supplierId);
                        return (
                          <tr key={alloc.id}>
                            <td className="px-3 py-2">{supplier?.name}</td>
                            <td className="px-3 py-2">
                              {formatNumber(alloc.quantity)} {alloc.unit} ({formatTonsWithContainers(alloc.quantityInTons)})
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
                  const supplier = supplierStore.getById(supplierId);
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

        {/* Multi-Replacement Modal */}
        <Modal
          isOpen={isMultiReplaceModalOpen}
          onClose={() => setIsMultiReplaceModalOpen(false)}
          title="Гибкая замена позиции"
          icon="🔄"
          size="xl"
        >
          <div className="space-y-4">
            {/* Current position info */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Текущая позиция</p>
              <p className="font-semibold text-lg">{selectedLine && itemStore.getById(selectedLine.itemId)?.name}</p>
              <p className="text-sm text-gray-600 mt-2">
                Исходный тоннаж: <span className="font-semibold">{selectedLine && formatTonsWithContainers(selectedLine.quantityInTons)}</span>
              </p>
            </div>

            {/* Progress bar showing distributed tonnage */}
            {selectedLine && (() => {
              const totalDistributed = multiReplaceForm.reduce((sum, line) => {
                const qty = parseFloat(line.quantityInTons);
                return sum + (isNaN(qty) ? 0 : qty);
              }, 0);
              const percentage = (totalDistributed / selectedLine.quantityInTons) * 100;
              const remainder = selectedLine.quantityInTons - totalDistributed;

              const getProgressColor = () => {
                if (percentage > 100) return 'bg-red-500';
                if (percentage >= 100) return 'bg-green-500';
                if (percentage > 0) return 'bg-blue-500';
                return 'bg-gray-300';
              };

              return (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Распределено</span>
                    <span className={`text-sm font-semibold ${percentage > 100 ? 'text-red-600' : 'text-blue-600'}`}>
                      {formatTonsWithContainers(totalDistributed)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-5 overflow-hidden mb-2">
                    <div
                      className={`h-full ${getProgressColor()} transition-all duration-300 flex items-center justify-center text-xs font-bold text-white`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    >
                      {percentage > 5 && `${formatNumber(percentage)}%`}
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      Остаток: <span className={`font-semibold ${remainder < -0.001 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatTonsWithContainers(Math.max(0, remainder))}
                      </span>
                    </span>
                    {remainder < -0.001 && (
                      <span className="text-red-600 font-semibold">
                        ⚠️ Превышение на {formatTonsWithContainers(Math.abs(remainder))}
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Replacement lines */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">Новые позиции:</p>
              
              {multiReplaceForm.map((line, index) => {
                const usedItemIds = multiReplaceForm.filter(l => l.id !== line.id).map(l => l.itemId);
                const containers = line.quantityInTons ? parseFloat(line.quantityInTons) / 28 : 0;
                
                return (
                  <div key={line.id} className="flex gap-2 items-end bg-white p-3 rounded-lg border border-gray-200">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Позиция #{index + 1}
                      </label>
                      <Select
                        value={line.itemId}
                        onChange={(e) => handleUpdateReplacementLine(line.id, 'itemId', e.target.value)}
                        options={[
                          { value: '', label: 'Выберите позицию' },
                          ...itemStore.getAll()
                            .filter(item => item.id !== selectedLine?.itemId && !usedItemIds.includes(item.id))
                            .map(item => ({ value: item.id, label: item.name })),
                        ]}
                      />
                    </div>
                    
                    <div className="w-32">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Тонны
                      </label>
                      <Input
                        type="number"
                        step="0.001"
                        value={line.quantityInTons}
                        onChange={(e) => handleUpdateReplacementLine(line.id, 'quantityInTons', e.target.value)}
                        placeholder="0.000"
                      />
                    </div>

                    <div className="w-28">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Контейнеры
                      </label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-600">
                        {!isNaN(containers) && containers > 0 ? formatNumber(containers) : '—'}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleRemoveReplacementLine(line.id)}
                      disabled={multiReplaceForm.length === 1}
                      className="mb-[2px]"
                    >
                      ❌
                    </Button>
                  </div>
                );
              })}
            </div>

            {/* Add line button */}
            <Button
              variant="secondary"
              onClick={handleAddReplacementLine}
              className="w-full"
            >
              + Добавить позицию
            </Button>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="secondary" onClick={() => setIsMultiReplaceModalOpen(false)}>
                Отмена
              </Button>
              <Button variant="success" onClick={handleSaveMultiReplace}>
                ✅ Заменить
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
}
