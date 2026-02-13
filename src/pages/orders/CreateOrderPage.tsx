import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout/Layout';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { showToast } from '../../components/ui/Toast';
import { orderStore, orderLineStore, itemStore, currentUserStore, auditLogStore } from '../../store';
import { toTons, formatNumber, TONS_IN_CONTAINER_DEFAULT, TONS_IN_CONTAINER_EXCEPTION } from '../../utils/helpers';
import type { Unit, Item } from '../../types';

interface ContainerItem {
  itemId: string;
  quantity: number;
  unit: Unit;
  quantityInTons: number;
}

interface Container {
  id: number;
  capacity: number; // 26 or 27
  items: ContainerItem[];
}

export function CreateOrderPage() {
  const navigate = useNavigate();
  const items = itemStore.getAll();
  const currentUser = currentUserStore.get();

  const [containers, setContainers] = useState<Container[]>([]);
  const [nextContainerId, setNextContainerId] = useState(1);

  // Add container
  const handleAddContainer = (capacity: number) => {
    const newContainer: Container = {
      id: nextContainerId,
      capacity,
      items: [],
    };
    setContainers([...containers, newContainer]);
    setNextContainerId(nextContainerId + 1);
    showToast('success', `Контейнер #${nextContainerId} (${capacity}т) добавлен`);
  };

  // Delete container
  const handleDeleteContainer = (containerId: number) => {
    const container = containers.find(c => c.id === containerId);
    if (!container) return;

    if (container.items.length > 0) {
      if (!window.confirm(`Контейнер #${containerId} содержит ${container.items.length} поз. Удалить?`)) {
        return;
      }
    }

    setContainers(containers.filter(c => c.id !== containerId));
    showToast('success', `Контейнер #${containerId} удалён`);
  };

  // Add item to container
  const handleAddItemToContainer = (
    containerId: number,
    itemId: string,
    quantity: number,
    unit: Unit
  ) => {
    const container = containers.find(c => c.id === containerId);
    if (!container) return;

    const quantityInTons = toTons(quantity, unit, container.capacity);
    const currentLoad = container.items.reduce((sum, item) => sum + item.quantityInTons, 0);
    const newLoad = currentLoad + quantityInTons;

    // Validation: check capacity
    if (newLoad > container.capacity) {
      showToast('error', `Перегруз! Осталось: ${formatNumber(container.capacity - currentLoad)} т`);
      return;
    }

    // Warning at 80%
    if (newLoad > container.capacity * 0.8 && currentLoad <= container.capacity * 0.8) {
      showToast('warning', `Внимание: заполнение превышает 80%`);
    }

    const newItem: ContainerItem = {
      itemId,
      quantity,
      unit,
      quantityInTons,
    };

    const updatedContainers = containers.map(c => {
      if (c.id === containerId) {
        return { ...c, items: [...c.items, newItem] };
      }
      return c;
    });

    setContainers(updatedContainers);
    showToast('success', 'Позиция добавлена в контейнер');
  };

  // Edit item in container
  const handleEditItemInContainer = (
    containerId: number,
    itemIndex: number,
    itemId: string,
    quantity: number,
    unit: Unit
  ) => {
    const container = containers.find(c => c.id === containerId);
    if (!container) return;

    const quantityInTons = toTons(quantity, unit, container.capacity);
    const currentLoad = container.items.reduce((sum, item, idx) => {
      if (idx === itemIndex) return sum; // Exclude the item being edited
      return sum + item.quantityInTons;
    }, 0);
    const newLoad = currentLoad + quantityInTons;

    // Validation: check capacity
    if (newLoad > container.capacity) {
      showToast('error', `Перегруз! Осталось: ${formatNumber(container.capacity - currentLoad)} т`);
      return;
    }

    const updatedContainers = containers.map(c => {
      if (c.id === containerId) {
        const updatedItems = [...c.items];
        updatedItems[itemIndex] = {
          itemId,
          quantity,
          unit,
          quantityInTons,
        };
        return { ...c, items: updatedItems };
      }
      return c;
    });

    setContainers(updatedContainers);
    showToast('success', 'Позиция обновлена');
  };

  // Delete item from container
  const handleDeleteItemFromContainer = (containerId: number, itemIndex: number) => {
    const updatedContainers = containers.map(c => {
      if (c.id === containerId) {
        return { ...c, items: c.items.filter((_, idx) => idx !== itemIndex) };
      }
      return c;
    });

    setContainers(updatedContainers);
    showToast('success', 'Позиция удалена');
  };

  // Save order
  const handleSave = () => {
    if (containers.length === 0) {
      showToast('warning', 'Добавьте хотя бы один контейнер');
      return;
    }

    // Check for empty containers
    const emptyContainers = containers.filter(c => c.items.length === 0);
    if (emptyContainers.length > 0) {
      showToast('error', `Нельзя сохранить заказ с пустыми контейнерами (Контейнер #${emptyContainers[0].id})`);
      return;
    }

    if (!currentUser) {
      showToast('error', 'Пользователь не авторизован');
      return;
    }

    // Create order
    const order = orderStore.create({
      orderNumber: orderStore.getNextOrderNumber(),
      createdAt: new Date().toISOString(),
      createdBy: currentUser.id,
      status: 'locked',
    });

    // Create order lines with container index
    containers.forEach((container, containerIdx) => {
      container.items.forEach(item => {
        orderLineStore.create({
          orderId: order.id,
          itemId: item.itemId,
          quantity: item.quantity,
          unit: item.unit,
          quantityInTons: item.quantityInTons,
          containerSize: container.capacity,
          containerIndex: containerIdx, // Add container index for grouping
        });
      });
    });

    // Log audit
    const totalItems = containers.reduce((sum, c) => sum + c.items.length, 0);
    auditLogStore.create({
      action: 'CREATE',
      entityType: 'Order',
      entityId: order.id,
      userId: currentUser.id,
      details: { 
        orderNumber: order.orderNumber, 
        containersCount: containers.length,
        linesCount: totalItems,
      },
    });

    showToast('success', `Заказ ${order.orderNumber} создан`);
    navigate(`/orders/${order.id}`);
  };

  // Calculate totals
  const totals = {
    totalContainers: containers.length,
    totalWeight: containers.reduce((sum, c) => 
      sum + c.items.reduce((itemSum, item) => itemSum + item.quantityInTons, 0), 0
    ),
    containers26t: containers.filter(c => c.capacity === 26).length,
    containers27t: containers.filter(c => c.capacity === 27).length,
    averageUtilization: containers.length > 0
      ? containers.reduce((sum, c) => {
          const load = c.items.reduce((itemSum, item) => itemSum + item.quantityInTons, 0);
          return sum + (load / c.capacity) * 100;
        }, 0) / containers.length
      : 0,
  };

  return (
    <Layout>
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Создание заказа</h1>
          <Button variant="secondary" onClick={() => navigate('/orders')}>
            ← Назад
          </Button>
        </div>

        {/* Add Container Buttons */}
        <div className="flex gap-4 mb-6">
          <Button
            onClick={() => handleAddContainer(TONS_IN_CONTAINER_DEFAULT)}
            className="flex-1 bg-blue-600 hover:bg-blue-700 shadow-lg transform hover:scale-105 transition-all duration-200"
          >
            ➕ Добавить контейнер 26т
          </Button>
          <Button
            onClick={() => handleAddContainer(TONS_IN_CONTAINER_EXCEPTION)}
            className="flex-1 bg-orange-500 hover:bg-orange-600 shadow-lg transform hover:scale-105 transition-all duration-200"
          >
            ⚠️ Добавить контейнер 27т
          </Button>
        </div>

        {/* Container Cards */}
        <div className="space-y-6 mb-6">
          {containers.map(container => (
            <ContainerCard
              key={container.id}
              container={container}
              items={items}
              onAddItem={handleAddItemToContainer}
              onEditItem={handleEditItemInContainer}
              onDeleteItem={handleDeleteItemFromContainer}
              onDeleteContainer={handleDeleteContainer}
            />
          ))}
        </div>

        {/* Empty State */}
        {containers.length === 0 && (
          <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
            <p className="text-2xl mb-2">📦</p>
            <p className="text-gray-600 mb-4">Нет контейнеров</p>
            <p className="text-sm text-gray-500">Добавьте контейнер, чтобы начать формирование заказа</p>
          </div>
        )}

        {/* Summary */}
        {containers.length > 0 && (
          <>
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-lg shadow-lg p-6 text-white mb-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="text-2xl">📊</span>
                Итого по заказу
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur-sm">
                  <p className="text-sm opacity-90 mb-1">Всего контейнеров</p>
                  <p className="text-2xl font-bold">{totals.totalContainers}</p>
                </div>
                <div className="bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur-sm">
                  <p className="text-sm opacity-90 mb-1">Общий вес</p>
                  <p className="text-2xl font-bold">{formatNumber(totals.totalWeight)} т</p>
                </div>
                <div className="bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur-sm">
                  <p className="text-sm opacity-90 mb-1">Контейнеры 26т</p>
                  <p className="text-2xl font-bold">{totals.containers26t} шт.</p>
                </div>
                <div className="bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur-sm">
                  <p className="text-sm opacity-90 mb-1">Контейнеры 27т</p>
                  <p className="text-2xl font-bold">{totals.containers27t} шт.</p>
                </div>
                <div className="bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur-sm">
                  <p className="text-sm opacity-90 mb-1">Средняя загрузка</p>
                  <p className="text-2xl font-bold">{formatNumber(totals.averageUtilization)}%</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                className="bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 shadow-lg"
              >
                ✅ Сохранить заказ
              </Button>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

// Container Card Component
interface ContainerCardProps {
  container: Container;
  items: Item[];
  onAddItem: (containerId: number, itemId: string, quantity: number, unit: Unit) => void;
  onEditItem: (containerId: number, itemIndex: number, itemId: string, quantity: number, unit: Unit) => void;
  onDeleteItem: (containerId: number, itemIndex: number) => void;
  onDeleteContainer: (containerId: number) => void;
}

function ContainerCard({
  container,
  items,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onDeleteContainer,
}: ContainerCardProps) {
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<Unit>('т');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const currentLoad = container.items.reduce((sum, item) => sum + item.quantityInTons, 0);
  const remaining = container.capacity - currentLoad;
  const percentage = (currentLoad / container.capacity) * 100;

  // Progress bar color
  const getProgressBarColor = () => {
    if (percentage > 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const handleAdd = () => {
    if (!selectedItemId || !quantity) {
      showToast('warning', 'Выберите позицию и введите количество');
      return;
    }

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      showToast('error', 'Введите корректное количество');
      return;
    }

    if (editingIndex !== null) {
      onEditItem(container.id, editingIndex, selectedItemId, qty, unit);
      setEditingIndex(null);
    } else {
      onAddItem(container.id, selectedItemId, qty, unit);
    }

    // Reset form
    setSelectedItemId('');
    setQuantity('');
    setUnit('т');
  };

  const handleEdit = (index: number) => {
    const item = container.items[index];
    setSelectedItemId(item.itemId);
    setQuantity(item.quantity.toString());
    setUnit(item.unit);
    setEditingIndex(index);
  };

  const handleCancelEdit = () => {
    setSelectedItemId('');
    setQuantity('');
    setUnit('т');
    setEditingIndex(null);
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden border-2 border-gray-200">
      {/* Header */}
      <div className={`p-4 flex justify-between items-center ${
        container.capacity === TONS_IN_CONTAINER_EXCEPTION
          ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white'
          : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
      }`}>
        <h3 className="text-xl font-bold flex items-center gap-2">
          📦 Контейнер #{container.id} ({container.capacity}т)
          {container.capacity === TONS_IN_CONTAINER_EXCEPTION && <span className="text-2xl">⚠️</span>}
        </h3>
        <button
          onClick={() => onDeleteContainer(container.id)}
          className="text-white hover:text-red-200 transition-colors text-2xl"
          title="Удалить контейнер"
        >
          🗑️
        </button>
      </div>

      {/* Progress Bar */}
      <div className="p-4 bg-gray-50">
        <div className="mb-2">
          <div className="h-6 bg-gray-200 rounded-full overflow-hidden">
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
            Загружено: {formatNumber(currentLoad)} т из {container.capacity} т ({formatNumber(percentage)}%)
          </span>
          <span className={`font-semibold ${remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
            Осталось: {formatNumber(remaining)} т
          </span>
        </div>
      </div>

      {/* Add Item Form */}
      <div className="p-4 bg-white border-t-2 border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5">
            <Select
              label="Позиция"
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              options={[
                { value: '', label: 'Выберите позицию' },
                ...items.map(item => ({ value: item.id, label: item.name })),
              ]}
            />
          </div>
          <div className="md:col-span-2">
            <Input
              label="Количество"
              type="number"
              step="0.001"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="md:col-span-2">
            <Select
              label="Единица"
              value={unit}
              onChange={(e) => setUnit(e.target.value as Unit)}
              options={[
                { value: 'т', label: 'т' },
                { value: 'кг', label: 'кг' },
              ]}
            />
          </div>
          <div className="md:col-span-3 flex items-end gap-2">
            <Button
              onClick={handleAdd}
              className={`flex-1 ${
                editingIndex !== null
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {editingIndex !== null ? '🔄 Обновить' : '➕ Добавить'}
            </Button>
            {editingIndex !== null && (
              <Button
                onClick={handleCancelEdit}
                variant="secondary"
                className="bg-gray-200 hover:bg-gray-300"
              >
                ✖️
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Items Table */}
      {container.items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 border-y border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Позиция</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Количество</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Единица</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">В тоннах</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {container.items.map((item, index) => {
                const itemData = itemStore.getById(item.itemId);
                return (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-900">{itemData?.name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{formatNumber(item.quantity)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.unit}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                      {formatNumber(item.quantityInTons)} т
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-3">
                        <button
                          onClick={() => handleEdit(index)}
                          className="text-blue-600 hover:text-blue-800 transition-colors text-lg"
                          title="Редактировать"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => onDeleteItem(container.id, index)}
                          className="text-red-600 hover:text-red-800 transition-colors text-lg"
                          title="Удалить"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {container.items.length === 0 && (
        <div className="p-6 text-center text-gray-500 border-t border-gray-200">
          <p className="text-sm">Контейнер пуст. Добавьте товары.</p>
        </div>
      )}
    </div>
  );
}
