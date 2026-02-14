import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout/Layout';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { showToast } from '../../components/ui/Toast';
import { orderStore, orderLineStore, itemStore, currentUserStore, auditLogStore } from '../../store';
import { formatNumber, formatTonsWithContainers } from '../../utils/helpers';

interface CartItem {
  itemId: string;
  tons: number;
  containers: number;
}

export function CreateOrderPage() {
  const navigate = useNavigate();
  const items = itemStore.getAll();
  const currentUser = currentUserStore.get();

  const [cart, setCart] = useState<CartItem[]>([]);

  // Form state
  const [orderName, setOrderName] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [tons, setTons] = useState('');
  const [containers, setContainers] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Handle tons input change
  const handleTonsChange = (value: string) => {
    setTons(value);
    
    const tonsValue = parseFloat(value);
    if (!isNaN(tonsValue) && tonsValue >= 0) {
      const containersValue = tonsValue / 28;
      setContainers(formatNumber(containersValue));
    } else {
      setContainers('');
    }
  };

  // Handle containers input change
  const handleContainersChange = (value: string) => {
    setContainers(value);
    
    const containersValue = parseFloat(value);
    if (!isNaN(containersValue) && containersValue >= 0) {
      const tonsValue = containersValue * 28;
      setTons(formatNumber(tonsValue));
    } else {
      setTons('');
    }
  };

  // Add item to cart
  const handleAddItem = () => {
    if (!selectedItemId) {
      showToast('warning', 'Выберите позицию');
      return;
    }

    const tonsValue = parseFloat(tons);
    const containersValue = parseFloat(containers);

    if (isNaN(tonsValue) || tonsValue <= 0) {
      showToast('error', 'Введите корректное количество в тоннах');
      return;
    }

    if (isNaN(containersValue) || containersValue <= 0) {
      showToast('error', 'Введите корректное количество в контейнерах');
      return;
    }

    const newItem: CartItem = {
      itemId: selectedItemId,
      tons: tonsValue,
      containers: containersValue,
    };

    if (editingIndex !== null) {
      const updatedCart = [...cart];
      updatedCart[editingIndex] = newItem;
      setCart(updatedCart);
      showToast('success', 'Позиция обновлена');
      setEditingIndex(null);
    } else {
      setCart([...cart, newItem]);
      showToast('success', 'Позиция добавлена в корзину');
    }

    // Reset form
    setSelectedItemId('');
    setTons('');
    setContainers('');
  };

  // Edit item in cart
  const handleEditItem = (index: number) => {
    const item = cart[index];
    setSelectedItemId(item.itemId);
    setTons(formatNumber(item.tons));
    setContainers(formatNumber(item.containers));
    setEditingIndex(index);
  };

  // Delete item from cart
  const handleDeleteItem = (index: number) => {
    setCart(cart.filter((_, idx) => idx !== index));
    showToast('success', 'Позиция удалена');
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setSelectedItemId('');
    setTons('');
    setContainers('');
    setEditingIndex(null);
  };

  // Save order
  const handleSave = () => {
    if (cart.length === 0) {
      showToast('warning', 'Добавьте хотя бы одну позицию в корзину');
      return;
    }

    if (!currentUser) {
      showToast('error', 'Пользователь не авторизован');
      return;
    }

    // Create order
    const order = orderStore.create({
      orderNumber: orderStore.getNextOrderNumber(),
      name: orderName.trim() || undefined,
      createdAt: new Date().toISOString(),
      createdBy: currentUser.id,
      status: 'locked',
    });

    // Create order lines
    cart.forEach(item => {
      orderLineStore.create({
        orderId: order.id,
        itemId: item.itemId,
        quantity: item.tons, // Save tons as quantity
        unit: 'т', // Always save as tons for backward compatibility
        quantityInTons: item.tons,
        containerSize: 28,
      });
    });

    // Log audit
    auditLogStore.create({
      action: 'CREATE',
      entityType: 'Order',
      entityId: order.id,
      userId: currentUser.id,
      details: { 
        orderNumber: order.orderNumber, 
        linesCount: cart.length,
        totalTons: totals.totalTons,
        totalContainers: totals.totalContainers,
      },
    });

    showToast('success', `Заказ ${order.orderNumber} создан`);
    navigate(`/orders/${order.id}`);
  };

  // Calculate totals
  const totals = {
    totalTons: cart.reduce((sum, item) => sum + item.tons, 0),
    totalContainers: cart.reduce((sum, item) => sum + item.containers, 0),
    totalItems: cart.length,
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

        {/* Order Name Input */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 border-2 border-gray-200">
          <Input
            label="Название заказа (необязательно)"
            type="text"
            value={orderName}
            onChange={(e) => setOrderName(e.target.value)}
            placeholder="Например: Поставка продукции для клиента X"
          />
        </div>

        {/* Add Item Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 border-2 border-gray-200">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="text-2xl">➕</span>
            {editingIndex !== null ? 'Редактирование позиции' : 'Добавление позиции'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            {/* Position Select */}
            <div className="md:col-span-4">
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

            {/* Tons Input */}
            <div className="md:col-span-3">
              <Input
                label="Тонны"
                type="number"
                step="0.001"
                value={tons}
                onChange={(e) => handleTonsChange(e.target.value)}
                placeholder="0"
              />
            </div>

            {/* Containers Input */}
            <div className="md:col-span-3">
              <Input
                label="Контейнеры"
                type="number"
                step="0.001"
                value={containers}
                onChange={(e) => handleContainersChange(e.target.value)}
                placeholder="0"
              />
            </div>

            {/* Action Buttons */}
            <div className="md:col-span-2 flex gap-2">
              <Button
                onClick={handleAddItem}
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

        {/* Cart Table */}
        {cart.length > 0 && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6 border-2 border-gray-200">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4 text-white">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <span className="text-2xl">🛒</span>
                Корзина ({cart.length} поз.)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Позиция</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Тонны</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Контейнеры</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {cart.map((item, index) => {
                    const itemData = itemStore.getById(item.itemId);
                    return (
                      <tr key={index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-900">{itemData?.name || '-'}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                          {formatTonsWithContainers(item.tons)}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                          {formatNumber(item.containers)} конт.
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center gap-3">
                            <button
                              onClick={() => handleEditItem(index)}
                              className="text-blue-600 hover:text-blue-800 transition-colors text-lg"
                              title="Редактировать"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDeleteItem(index)}
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
          </div>
        )}

        {/* Empty State */}
        {cart.length === 0 && (
          <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center mb-6">
            <p className="text-2xl mb-2">🛒</p>
            <p className="text-gray-600 mb-4">Корзина пуста</p>
            <p className="text-sm text-gray-500">Добавьте позиции в корзину, чтобы создать заказ</p>
          </div>
        )}

        {/* Summary */}
        {cart.length > 0 && (
          <>
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-lg shadow-lg p-6 text-white mb-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="text-2xl">📊</span>
                Итого по заказу
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur-sm">
                  <p className="text-sm opacity-90 mb-1">Общий вес</p>
                  <p className="text-2xl font-bold">{formatNumber(totals.totalTons)} т</p>
                </div>
                <div className="bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur-sm">
                  <p className="text-sm opacity-90 mb-1">Контейнеры</p>
                  <p className="text-2xl font-bold">{formatNumber(totals.totalContainers)} конт.</p>
                </div>
                <div className="bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur-sm">
                  <p className="text-sm opacity-90 mb-1">Позиций</p>
                  <p className="text-2xl font-bold">{totals.totalItems} шт.</p>
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
