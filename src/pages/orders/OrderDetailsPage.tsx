import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout/Layout';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { orderStore, orderLineStore, allocationStore, paymentStore, auditLogStore, currentUserStore, adminModeStore, itemStore } from '../../store';
import { showToast } from '../../components/ui/Toast';
import { getOrderStatusLabel, getOrderStatusColor, formatDateTime, formatNumber, TONS_IN_CONTAINER_DEFAULT } from '../../utils/helpers';
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
  const isAdminMode = adminModeStore.get();

  useEffect(() => {
    if (orderId) {
      const foundOrder = orderStore.getById(orderId);
      setOrder(foundOrder);
      
      if (foundOrder) {
        setOrderLines(orderLineStore.getByOrderId(orderId));
      }
    }
  }, [orderId]);

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
      key: 'containerSize',
      label: 'Размер конт.',
      render: (value: number | undefined, row: OrderLine) => 
        row.unit === 'конт.' && value ? `${value}т` : '-',
    },
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
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {container.lines.map((line) => (
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
                            </tr>
                          ))}
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
      </div>
    </Layout>
  );
}
