import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout/Layout';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Table } from '../../components/ui/Table';
import { orderStore, orderLineStore, allocationStore, paymentStore, auditLogStore, currentUserStore, adminModeStore, itemStore } from '../../store';
import { showToast } from '../../components/ui/Toast';
import { getOrderStatusLabel, getOrderStatusColor, formatDateTime, formatNumber, TONS_IN_CONTAINER_DEFAULT, validateDistribution } from '../../utils/helpers';
import type { Order, OrderLine } from '../../types';

interface GroupedContainer {
  index: number;
  capacity: number;
  lines: OrderLine[];
}

export function OrderDetailsPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | undefined>();
  const [orderLines, setOrderLines] = useState<OrderLine[]>([]);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const isAdminMode = adminModeStore.get();

  // Modal states for editing order lines
  const [isEditQuantityModalOpen, setIsEditQuantityModalOpen] = useState(false);
  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false);
  const [isAddPositionModalOpen, setIsAddPositionModalOpen] = useState(false);
  const [selectedLine, setSelectedLine] = useState<OrderLine | null>(null);
  
  // Edit quantity form
  const [editQuantityForm, setEditQuantityForm] = useState({
    quantityInTons: '',
  });

  // Replace position form
  const [replaceForm, setReplaceForm] = useState({
    newItemId: '',
    quantityInTons: '',
  });

  // Add position form
  const [addPositionForm, setAddPositionForm] = useState({
    itemId: '',
    quantityInTons: '',
  });

  useEffect(() => {
    if (orderId) {
      const foundOrder = orderStore.getById(orderId);
      setOrder(foundOrder);
      
      if (foundOrder) {
        setOrderLines(orderLineStore.getByOrderId(orderId));
        setEditedName(foundOrder.name || '');
      }
    }
  }, [orderId]);

  // Calculate distribution status for each line
  const lineDistributionStatus = useMemo(() => {
    if (!orderId) return new Map();

    const allocations = allocationStore.getByOrderId(orderId);
    const statusMap = new Map();

    orderLines.forEach(line => {
      const lineAllocations = allocations.filter(a => a.orderLineId === line.id);
      const { allocated } = validateDistribution(line, lineAllocations);
      const percentage = line.quantityInTons > 0 ? (allocated / line.quantityInTons) * 100 : 0;
      
      statusMap.set(line.id, {
        allocated,
        percentage,
        isFullyDistributed: percentage >= 99.9,
      });
    });

    return statusMap;
  }, [orderId, orderLines]);

  const handleDelete = () => {
    if (!order) return;

    const currentUser = currentUserStore.get();
    const isAdminModeActive = adminModeStore.get();

    if (!isAdminModeActive) {
      showToast('error', 'Включите режим администратора для удаления');
      return;
    }

    if (!confirm(`Удалить заказ "${order.orderNumber}"?`)) {
      return;
    }

    // Cascade delete: delete all related data
    // 1. Delete all order lines
    orderLineStore.deleteByOrderId(order.id);

    // 2. Delete all allocations
    const allocations = allocationStore.getByOrderId(order.id);
    allocations.forEach(allocation => allocationStore.delete(allocation.id));

    // 3. Delete all payments
    const payments = paymentStore.getByOrderId(order.id);
    payments.forEach(payment => paymentStore.delete(payment.id));

    // 4. Delete the order itself
    orderStore.delete(order.id);

    // 5. Create audit log
    auditLogStore.create({
      action: 'DELETE',
      entityType: 'Order',
      entityId: order.id,
      userId: currentUser?.id || '',
      details: { orderNumber: order.orderNumber },
    });

    showToast('success', 'Заказ удален');
    navigate('/orders');
  };

  const handleSaveName = () => {
    if (!order) return;

    const currentUser = currentUserStore.get();
    const trimmedName = editedName.trim();

    orderStore.update(order.id, { name: trimmedName || undefined });
    
    auditLogStore.create({
      action: 'UPDATE',
      entityType: 'Order',
      entityId: order.id,
      userId: currentUser?.id || '',
      details: { 
        orderNumber: order.orderNumber,
        field: 'name',
        oldValue: order.name,
        newValue: trimmedName || undefined,
      },
    });

    setOrder({ ...order, name: trimmedName || undefined });
    setIsEditingName(false);
    showToast('success', 'Название обновлено');
  };

  const handleCancelEditName = () => {
    setEditedName(order?.name || '');
    setIsEditingName(false);
  };

  // Edit quantity handlers
  const handleOpenEditQuantity = (line: OrderLine) => {
    setSelectedLine(line);
    setEditQuantityForm({
      quantityInTons: formatNumber(line.quantityInTons),
    });
    setIsEditQuantityModalOpen(true);
  };

  const handleSaveEditQuantity = () => {
    if (!selectedLine || !order) return;

    const newQuantityInTons = parseFloat(editQuantityForm.quantityInTons);
    if (isNaN(newQuantityInTons) || newQuantityInTons <= 0) {
      showToast('error', 'Введите корректное количество');
      return;
    }

    const currentUser = currentUserStore.get();

    // Update the order line
    orderLineStore.update(selectedLine.id, {
      quantity: newQuantityInTons,
      quantityInTons: newQuantityInTons,
    });

    auditLogStore.create({
      action: 'UPDATE',
      entityType: 'OrderLine',
      entityId: selectedLine.id,
      userId: currentUser?.id || '',
      details: {
        orderNumber: order.orderNumber,
        oldQuantity: selectedLine.quantityInTons,
        newQuantity: newQuantityInTons,
      },
    });

    setOrderLines(orderLineStore.getByOrderId(orderId!));
    setIsEditQuantityModalOpen(false);
    showToast('success', 'Количество обновлено');
  };

  // Delete line handlers
  const handleDeleteLine = (line: OrderLine) => {
    if (!order) return;

    const currentUser = currentUserStore.get();
    const item = itemStore.getById(line.itemId);

    if (!confirm(`Удалить позицию "${item?.name}"?`)) {
      return;
    }

    // Check if this is the last line
    if (orderLines.length === 1) {
      if (confirm('Это последняя позиция. Удалить заказ целиком?')) {
        handleDelete();
        return;
      } else {
        return;
      }
    }

    orderLineStore.delete(line.id);

    auditLogStore.create({
      action: 'DELETE',
      entityType: 'OrderLine',
      entityId: line.id,
      userId: currentUser?.id || '',
      details: {
        orderNumber: order.orderNumber,
        itemName: item?.name,
        quantity: line.quantityInTons,
      },
    });

    setOrderLines(orderLineStore.getByOrderId(orderId!));
    showToast('success', 'Позиция удалена');
  };

  // Replace position handlers
  const handleOpenReplace = (line: OrderLine) => {
    setSelectedLine(line);
    setReplaceForm({
      newItemId: '',
      quantityInTons: formatNumber(line.quantityInTons),
    });
    setIsReplaceModalOpen(true);
  };

  const handleSaveReplace = () => {
    if (!selectedLine || !order) return;

    const currentUser = currentUserStore.get();
    const newQuantityInTons = parseFloat(replaceForm.quantityInTons);

    if (!replaceForm.newItemId) {
      showToast('error', 'Выберите новую позицию');
      return;
    }

    if (isNaN(newQuantityInTons) || newQuantityInTons <= 0) {
      showToast('error', 'Введите корректное количество');
      return;
    }

    if (newQuantityInTons > selectedLine.quantityInTons) {
      showToast('error', 'Количество не может превышать исходное');
      return;
    }

    const oldItem = itemStore.getById(selectedLine.itemId);
    const newItem = itemStore.getById(replaceForm.newItemId);

    if (newQuantityInTons === selectedLine.quantityInTons) {
      // Full replacement - just update the itemId
      orderLineStore.update(selectedLine.id, {
        itemId: replaceForm.newItemId,
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
          quantity: newQuantityInTons,
        },
      });

      showToast('success', 'Позиция заменена');
    } else {
      // Partial replacement - update current line and create new one
      const remainder = selectedLine.quantityInTons - newQuantityInTons;

      // Update existing line with reduced quantity
      orderLineStore.update(selectedLine.id, {
        quantity: remainder,
        quantityInTons: remainder,
      });

      // Create new line with new item
      orderLineStore.create({
        orderId: order.id,
        itemId: replaceForm.newItemId,
        quantity: newQuantityInTons,
        unit: 'т',
        quantityInTons: newQuantityInTons,
        containerSize: TONS_IN_CONTAINER_DEFAULT,
      });

      auditLogStore.create({
        action: 'REPLACE_PARTIAL',
        entityType: 'OrderLine',
        entityId: selectedLine.id,
        userId: currentUser?.id || '',
        details: {
          orderNumber: order.orderNumber,
          oldItem: oldItem?.name,
          newItem: newItem?.name,
          replacedQuantity: newQuantityInTons,
          remainingQuantity: remainder,
        },
      });

      showToast('success', 'Позиция частично заменена');
    }

    setOrderLines(orderLineStore.getByOrderId(orderId!));
    setIsReplaceModalOpen(false);
  };

  // Add position handlers
  const handleOpenAddPosition = () => {
    setAddPositionForm({
      itemId: '',
      quantityInTons: '',
    });
    setIsAddPositionModalOpen(true);
  };

  const handleSaveAddPosition = () => {
    if (!order) return;

    const currentUser = currentUserStore.get();
    const quantityInTons = parseFloat(addPositionForm.quantityInTons);

    if (!addPositionForm.itemId) {
      showToast('error', 'Выберите позицию');
      return;
    }

    if (isNaN(quantityInTons) || quantityInTons <= 0) {
      showToast('error', 'Введите корректное количество');
      return;
    }

    const item = itemStore.getById(addPositionForm.itemId);

    orderLineStore.create({
      orderId: order.id,
      itemId: addPositionForm.itemId,
      quantity: quantityInTons,
      unit: 'т',
      quantityInTons: quantityInTons,
      containerSize: TONS_IN_CONTAINER_DEFAULT,
    });

    auditLogStore.create({
      action: 'ADD',
      entityType: 'OrderLine',
      entityId: order.id,
      userId: currentUser?.id || '',
      details: {
        orderNumber: order.orderNumber,
        itemName: item?.name,
        quantity: quantityInTons,
      },
    });

    setOrderLines(orderLineStore.getByOrderId(orderId!));
    setIsAddPositionModalOpen(false);
    showToast('success', 'Позиция добавлена');
  };

  // Group order lines by container
  const groupedContainers: GroupedContainer[] = [];
  const hasContainerIndexes = orderLines.some(line => line.containerIndex !== undefined);

  if (hasContainerIndexes) {
    // New container-based orders
    const containerMap = new Map<number, OrderLine[]>();
    
    orderLines.forEach(line => {
      const index = line.containerIndex ?? 0;
      if (!containerMap.has(index)) {
        containerMap.set(index, []);
      }
      containerMap.get(index)!.push(line);
    });

    containerMap.forEach((lines, index) => {
      const capacity = lines[0]?.containerSize || TONS_IN_CONTAINER_DEFAULT;
      groupedContainers.push({ index, capacity, lines });
    });

    groupedContainers.sort((a, b) => a.index - b.index);
  }

  if (!order) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600">Заказ не найден</p>
          <Button className="mt-4" onClick={() => navigate('/orders')}>
            ← Вернуться к списку
          </Button>
        </div>
      </Layout>
    );
  }

  const columns = [
    {
      key: 'itemId',
      label: 'Позиция',
      render: (value: string) => itemStore.getById(value)?.name || '-',
    },
    {
      key: 'quantity',
      label: 'Количество',
      render: (value: number, row: OrderLine) => `${formatNumber(value)} ${row.unit}`,
    },
    {
      key: 'quantityInTons',
      label: 'В тоннах',
      render: (value: number) => `${formatNumber(value)} т`,
    },
    {
      key: 'distribution',
      label: 'Распределение',
      render: (_: any, row: OrderLine) => {
        const status = lineDistributionStatus.get(row.id);
        if (!status) return '-';

        const getProgressColor = () => {
          if (status.percentage >= 99.9) return 'bg-green-500';
          if (status.percentage > 0) return 'bg-yellow-500';
          return 'bg-red-500';
        };

        const getTextColor = () => {
          if (status.percentage >= 99.9) return 'text-green-600';
          if (status.percentage > 0) return 'text-yellow-600';
          return 'text-red-600';
        };

        return (
          <div className="space-y-1">
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className={`h-full ${getProgressColor()} transition-all duration-500 flex items-center justify-center text-xs font-bold text-white`}
                style={{ width: `${Math.min(status.percentage, 100)}%` }}
              >
                {status.percentage > 10 && `${status.percentage.toFixed(0)}%`}
              </div>
            </div>
            <div className={`text-xs ${getTextColor()} font-semibold`}>
              {formatNumber(status.allocated)} т из {formatNumber(row.quantityInTons)} т
            </div>
          </div>
        );
      },
    },
    {
      key: 'containerSize',
      label: 'Размер конт.',
      render: (value: number | undefined, row: OrderLine) => 
        row.unit === 'конт.' && value ? `${value}т` : '-',
    },
    ...(order?.status === 'locked' ? [{
      key: 'actions',
      label: 'Действия',
      render: (_: any, row: OrderLine) => (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => handleOpenEditQuantity(row)}
            className="text-blue-600 hover:text-blue-800 transition-colors text-lg"
            title="Редактировать количество"
          >
            ✏️
          </button>
          <button
            onClick={() => handleOpenReplace(row)}
            className="text-green-600 hover:text-green-800 transition-colors text-lg"
            title="Заменить позицию"
          >
            🔄
          </button>
          <button
            onClick={() => handleDeleteLine(row)}
            className="text-red-600 hover:text-red-800 transition-colors text-lg"
            title="Удалить позицию"
          >
            🗑️
          </button>
        </div>
      ),
    }] : []),
  ];

  const totalTons = orderLines.reduce((sum, line) => sum + line.quantityInTons, 0);
  
  // Calculate container counts once
  const containerCounts = hasContainerIndexes ? {
    count26t: groupedContainers.filter(c => c.capacity === 26).length,
    count27t: groupedContainers.filter(c => c.capacity === 27).length,
  } : { count26t: 0, count27t: 0 };

  return (
    <Layout>
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Заказ {order.orderNumber}</h1>
          <div className="flex gap-2">
            {order.status === 'locked' && (
              <Button onClick={() => navigate(`/distribution/${order.id}`)}>
                Распределить
              </Button>
            )}
            {isAdminMode && (
              <Button variant="danger" onClick={handleDelete}>
                🗑️ Удалить заказ
              </Button>
            )}
            <Button variant="secondary" onClick={() => navigate('/orders')}>
              ← Назад
            </Button>
          </div>
        </div>

        {/* Order Info */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 gap-4">
            {/* Order Name/Number Section */}
            <div className="border-b pb-4">
              <p className="text-sm text-gray-600 mb-2">Название заказа</p>
              {isEditingName ? (
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Input
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      placeholder={order.orderNumber}
                      autoFocus
                    />
                  </div>
                  <Button size="sm" onClick={handleSaveName}>
                    ✅ Сохранить
                  </Button>
                  <Button size="sm" variant="secondary" onClick={handleCancelEditName}>
                    ✖️ Отмена
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <p className="text-lg font-semibold">
                    {order.name || order.orderNumber}
                  </p>
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="text-blue-600 hover:text-blue-800 transition-colors text-lg"
                    title="Редактировать название"
                  >
                    ✏️
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Номер заказа</p>
                <p className="text-lg font-semibold">{order.orderNumber}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Дата создания</p>
                <p className="text-lg font-semibold">{formatDateTime(order.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Статус</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getOrderStatusColor(order.status)}`}>
                  {getOrderStatusLabel(order.status)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Order Lines - Container View or Flat View */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Позиции заказа</h2>
          
          {hasContainerIndexes ? (
            // Container-based view
            <div className="space-y-4">
              {groupedContainers.map((container) => {
                const currentLoad = container.lines.reduce((sum, line) => sum + line.quantityInTons, 0);
                const percentage = (currentLoad / container.capacity) * 100;
                const getProgressBarColor = () => {
                  if (percentage > 100) return 'bg-red-500';
                  if (percentage >= 80) return 'bg-yellow-500';
                  return 'bg-green-500';
                };

                return (
                  <div key={container.index} className="bg-white rounded-lg shadow-md overflow-hidden border-2 border-gray-200">
                    {/* Container Header */}
                    <div className="p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                      <h3 className="text-lg font-bold flex items-center gap-2">
                        📦 Контейнер #{container.index + 1} ({container.capacity}т)
                      </h3>
                    </div>

                    {/* Progress Bar */}
                    <div className="p-4 bg-gray-50">
                      <div className="mb-2">
                        <div className="h-5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getProgressBarColor()} transition-all duration-500 ease-out flex items-center justify-center text-xs font-bold text-white`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          >
                            {percentage > 5 && `${formatNumber(percentage)}%`}
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="font-semibold text-gray-700">
                          Загружено: {formatNumber(currentLoad)} т из {container.capacity} т
                        </span>
                        <span className={`font-semibold ${
                          currentLoad > container.capacity ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {formatNumber(percentage)}%
                        </span>
                      </div>
                    </div>

                    {/* Container Items */}
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-100 border-y border-gray-200">
                          <tr>
                            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Позиция</th>
                            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Количество</th>
                            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Единица</th>
                            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">В тоннах</th>
                            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Распределение</th>
                            {order.status === 'locked' && (
                              <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">Действия</th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {container.lines.map((line) => {
                            const distStatus = lineDistributionStatus.get(line.id);
                            const getDistProgressColor = () => {
                              if (!distStatus) return 'bg-gray-300';
                              if (distStatus.percentage >= 99.9) return 'bg-green-500';
                              if (distStatus.percentage > 0) return 'bg-yellow-500';
                              return 'bg-red-500';
                            };
                            const getDistTextColor = () => {
                              if (!distStatus) return 'text-gray-600';
                              if (distStatus.percentage >= 99.9) return 'text-green-600';
                              if (distStatus.percentage > 0) return 'text-yellow-600';
                              return 'text-red-600';
                            };

                            return (
                            <tr key={line.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-2 text-sm text-gray-900">
                                {itemStore.getById(line.itemId)?.name || '-'}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900">
                                {formatNumber(line.quantity)}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900">{line.unit}</td>
                              <td className="px-4 py-2 text-sm font-semibold text-gray-900">
                                {formatNumber(line.quantityInTons)} т
                              </td>
                              <td className="px-4 py-2">
                                {distStatus ? (
                                  <div className="space-y-1">
                                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                      <div
                                        className={`h-full ${getDistProgressColor()} transition-all duration-500`}
                                        style={{ width: `${Math.min(distStatus.percentage, 100)}%` }}
                                      />
                                    </div>
                                    <div className={`text-xs ${getDistTextColor()} font-semibold`}>
                                      {formatNumber(distStatus.allocated)} т / {formatNumber(line.quantityInTons)} т
                                    </div>
                                  </div>
                                ) : '-'}
                              </td>
                              {order.status === 'locked' && (
                                <td className="px-4 py-2 text-center">
                                  <div className="flex justify-center gap-2">
                                    <button
                                      onClick={() => handleOpenEditQuantity(line)}
                                      className="text-blue-600 hover:text-blue-800 transition-colors text-lg"
                                      title="Редактировать количество"
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      onClick={() => handleOpenReplace(line)}
                                      className="text-green-600 hover:text-green-800 transition-colors text-lg"
                                      title="Заменить позицию"
                                    >
                                      🔄
                                    </button>
                                    <button
                                      onClick={() => handleDeleteLine(line)}
                                      className="text-red-600 hover:text-red-800 transition-colors text-lg"
                                      title="Удалить позицию"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Flat view for backward compatibility
            <Table columns={columns} data={orderLines} emptyMessage="Нет позиций в заказе" />
          )}
        </div>

        {/* Totals */}
        {hasContainerIndexes ? (
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-lg shadow-lg p-6 text-white">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="text-2xl">📊</span>
              Итого по заказу
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur-sm">
                <p className="text-sm opacity-90 mb-1">Всего контейнеров</p>
                <p className="text-2xl font-bold">{groupedContainers.length}</p>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur-sm">
                <p className="text-sm opacity-90 mb-1">Общий вес</p>
                <p className="text-2xl font-bold">{formatNumber(totalTons)} т</p>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur-sm">
                <p className="text-sm opacity-90 mb-1">Контейнеры 26т</p>
                <p className="text-2xl font-bold">{containerCounts.count26t} шт.</p>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur-sm">
                <p className="text-sm opacity-90 mb-1">Контейнеры 27т</p>
                <p className="text-2xl font-bold">{containerCounts.count27t} шт.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-700">Всего:</span>
              <span className="text-2xl font-bold text-blue-600">
                {formatNumber(totalTons)} т ({orderLines.length} поз.)
              </span>
            </div>
          </div>
        )}

        {/* Add Position Button */}
        {order.status === 'locked' && (
          <div className="mt-6 flex justify-center">
            <Button onClick={handleOpenAddPosition}>
              ➕ Добавить позицию
            </Button>
          </div>
        )}

        {/* Edit Quantity Modal */}
        <Modal
          isOpen={isEditQuantityModalOpen}
          onClose={() => setIsEditQuantityModalOpen(false)}
          title="Редактирование количества"
          icon="✏️"
        >
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Текущая позиция</p>
              <p className="font-semibold">{selectedLine && itemStore.getById(selectedLine.itemId)?.name}</p>
              <p className="text-sm text-gray-600 mt-2">
                Текущее количество: {selectedLine && formatNumber(selectedLine.quantityInTons)} т
              </p>
            </div>

            <Input
              label="Новое количество (тонны) *"
              type="number"
              step="0.001"
              value={editQuantityForm.quantityInTons}
              onChange={(e) => setEditQuantityForm({ quantityInTons: e.target.value })}
              placeholder="0.000"
              autoFocus
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="secondary" onClick={() => setIsEditQuantityModalOpen(false)}>
                Отмена
              </Button>
              <Button onClick={handleSaveEditQuantity}>
                ✅ Сохранить
              </Button>
            </div>
          </div>
        </Modal>

        {/* Replace Position Modal */}
        <Modal
          isOpen={isReplaceModalOpen}
          onClose={() => setIsReplaceModalOpen(false)}
          title="Замена позиции"
          icon="🔄"
          size="lg"
        >
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Текущая позиция</p>
              <p className="font-semibold">{selectedLine && itemStore.getById(selectedLine.itemId)?.name}</p>
              <p className="text-sm text-gray-600 mt-2">
                Количество: {selectedLine && formatNumber(selectedLine.quantityInTons)} т
              </p>
            </div>

            <Select
              label="Новая позиция *"
              value={replaceForm.newItemId}
              onChange={(e) => setReplaceForm({ ...replaceForm, newItemId: e.target.value })}
              options={[
                { value: '', label: 'Выберите позицию' },
                ...itemStore.getAll()
                  .filter(item => item.id !== selectedLine?.itemId)
                  .map(item => ({ value: item.id, label: item.name })),
              ]}
            />

            <Input
              label="Количество для замены (тонны) *"
              type="number"
              step="0.001"
              value={replaceForm.quantityInTons}
              onChange={(e) => setReplaceForm({ ...replaceForm, quantityInTons: e.target.value })}
              placeholder="0.000"
            />

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                💡 <strong>Подсказка:</strong> Если количество меньше исходного, остаток останется как текущая позиция.
              </p>
              {selectedLine && replaceForm.quantityInTons && parseFloat(replaceForm.quantityInTons) < selectedLine.quantityInTons && (
                <p className="text-sm text-blue-800 mt-2">
                  Остаток: {formatNumber(selectedLine.quantityInTons - parseFloat(replaceForm.quantityInTons))} т
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="secondary" onClick={() => setIsReplaceModalOpen(false)}>
                Отмена
              </Button>
              <Button variant="success" onClick={handleSaveReplace}>
                🔄 Заменить
              </Button>
            </div>
          </div>
        </Modal>

        {/* Add Position Modal */}
        <Modal
          isOpen={isAddPositionModalOpen}
          onClose={() => setIsAddPositionModalOpen(false)}
          title="Добавление позиции"
          icon="➕"
        >
          <div className="space-y-4">
            <Select
              label="Позиция *"
              value={addPositionForm.itemId}
              onChange={(e) => setAddPositionForm({ ...addPositionForm, itemId: e.target.value })}
              options={[
                { value: '', label: 'Выберите позицию' },
                ...itemStore.getAll().map(item => ({ value: item.id, label: item.name })),
              ]}
            />

            <Input
              label="Количество (тонны) *"
              type="number"
              step="0.001"
              value={addPositionForm.quantityInTons}
              onChange={(e) => setAddPositionForm({ ...addPositionForm, quantityInTons: e.target.value })}
              placeholder="0.000"
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="secondary" onClick={() => setIsAddPositionModalOpen(false)}>
                Отмена
              </Button>
              <Button onClick={handleSaveAddPosition}>
                ➕ Добавить
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
}
