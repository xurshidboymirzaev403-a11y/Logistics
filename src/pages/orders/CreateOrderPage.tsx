import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout/Layout';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { showToast } from '../../components/ui/Toast';
import { orderStore, orderLineStore, itemStore, currentUserStore, auditLogStore } from '../../store';
import { toTons, toContainers, formatNumber, TONS_IN_CONTAINER_DEFAULT, TONS_IN_CONTAINER_EXCEPTION } from '../../utils/helpers';
import type { Unit, OrderLine as OrderLineType } from '../../types';

interface CartItem extends Omit<OrderLineType, 'id' | 'orderId'> {}

export function CreateOrderPage() {
  const navigate = useNavigate();
  const items = itemStore.getAll();
  const currentUser = currentUserStore.get();

  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<Unit>('т');
  const [containerSize, setContainerSize] = useState(TONS_IN_CONTAINER_DEFAULT);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleAddToCart = () => {
    if (!selectedItemId || !quantity) {
      showToast('warning', 'Выберите позицию и введите количество');
      return;
    }

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      showToast('error', 'Введите корректное количество');
      return;
    }

    const item = itemStore.getById(selectedItemId);
    if (!item) return;

    const quantityInTons = toTons(qty, unit, containerSize);
    
    const newItem: CartItem = {
      itemId: selectedItemId,
      quantity: qty,
      unit,
      quantityInTons,
      containerSize,
    };

    if (editingIndex !== null) {
      const newCart = [...cart];
      newCart[editingIndex] = newItem;
      setCart(newCart);
      setEditingIndex(null);
      showToast('success', 'Позиция обновлена');
    } else {
      // Check if item already exists in cart
      const existingIndex = cart.findIndex(c => c.itemId === selectedItemId);
      if (existingIndex >= 0) {
        const newCart = [...cart];
        newCart[existingIndex].quantity += qty;
        newCart[existingIndex].quantityInTons += quantityInTons;
        setCart(newCart);
        showToast('success', 'Количество увеличено');
      } else {
        setCart([...cart, newItem]);
        showToast('success', 'Позиция добавлена в корзину');
      }
    }

    // Reset form
    setSelectedItemId('');
    setQuantity('');
    setUnit('т');
    setContainerSize(TONS_IN_CONTAINER_DEFAULT);
  };

  const handleEdit = (index: number) => {
    const item = cart[index];
    setSelectedItemId(item.itemId);
    setQuantity(item.quantity.toString());
    setUnit(item.unit);
    setContainerSize(item.containerSize || TONS_IN_CONTAINER_DEFAULT);
    setEditingIndex(index);
  };

  const handleDelete = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
    showToast('success', 'Позиция удалена');
  };

  const handleSave = () => {
    if (cart.length === 0) {
      showToast('warning', 'Добавьте хотя бы одну позицию');
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

    // Create order lines
    cart.forEach(item => {
      orderLineStore.create({
        orderId: order.id,
        ...item,
      });
    });

    // Log audit
    auditLogStore.create({
      action: 'CREATE',
      entityType: 'Order',
      entityId: order.id,
      userId: currentUser.id,
      details: { orderNumber: order.orderNumber, linesCount: cart.length },
    });

    showToast('success', `Заказ ${order.orderNumber} создан`);
    navigate(`/orders/${order.id}`);
  };

  // Calculate conversion preview
  const getConversionPreview = () => {
    if (!quantity || isNaN(parseFloat(quantity))) return null;
    
    const qty = parseFloat(quantity);
    const tons = toTons(qty, unit, containerSize);
    const containers = toContainers(tons, containerSize);
    
    if (unit === 'т') {
      return `= ${formatNumber(containers)} конт.`;
    } else if (unit === 'кг') {
      return `= ${formatNumber(tons)} т / ${formatNumber(containers)} конт.`;
    } else {
      return `= ${formatNumber(tons)} т`;
    }
  };

  // Calculate cart totals
  const cartTotals = {
    totalTons: cart.reduce((sum, item) => sum + item.quantityInTons, 0),
    totalContainers: cart.reduce((sum, item) => {
      const containers = toContainers(item.quantityInTons, item.containerSize || TONS_IN_CONTAINER_DEFAULT);
      return sum + containers;
    }, 0),
    itemCount: cart.length,
  };

  const columns = [
    {
      key: 'itemId',
      label: 'Позиция',
      render: (value: string) => itemStore.getById(value)?.name || '-',
    },
    {
      key: 'quantity',
      label: 'Количество',
      render: (_: any, row: CartItem) => `${formatNumber(row.quantity)} ${row.unit}`,
    },
    {
      key: 'unit',
      label: 'Единица',
      render: (_: any, row: CartItem) => row.unit,
    },
    {
      key: 'quantityInTons',
      label: 'В тоннах',
      render: (value: number) => `${formatNumber(value)} т`,
    },
    {
      key: 'containers',
      label: 'Контейнеры',
      render: (_: any, row: CartItem) => {
        const containers = toContainers(row.quantityInTons, row.containerSize || TONS_IN_CONTAINER_DEFAULT);
        return `${formatNumber(containers)} конт.`;
      },
    },
    {
      key: 'containerSize',
      label: 'Размер конт.',
      render: (_: any, row: CartItem) => {
        const size = row.containerSize || TONS_IN_CONTAINER_DEFAULT;
        if (size === TONS_IN_CONTAINER_EXCEPTION) {
          return (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 rounded-md text-sm font-medium">
              ⚠️ {size}т
            </span>
          );
        }
        return (
          <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm font-medium">
            {size}т
          </span>
        );
      },
    },
    {
      key: 'actions',
      label: 'Действия',
      width: '150px',
      render: (_: any, item: CartItem) => {
        const index = cart.indexOf(item);
        return (
        <div className="flex gap-2">
          <button
            onClick={() => handleEdit(index)}
            className="text-blue-600 hover:text-blue-800 transition-colors"
            title="Редактировать"
          >
            ✏️
          </button>
          <button
            onClick={() => handleDelete(index)}
            className="text-red-600 hover:text-red-800 transition-colors"
            title="Удалить"
          >
            🗑️
          </button>
        </div>
        );
      },
    },
  ];

  return (
    <Layout>
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Создание заказа</h1>
          <Button variant="secondary" onClick={() => navigate('/orders')}>
            ← Назад
          </Button>
        </div>

        {/* Add Item Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Добавить позицию</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-4">
              <Select
                label="📦 Позиция"
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
                label="🔢 Количество"
                type="number"
                step="0.001"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
              />
            </div>
            
            <div className="md:col-span-2">
              <Select
                label="📏 Единица"
                value={unit}
                onChange={(e) => setUnit(e.target.value as Unit)}
                options={[
                  { value: 'т', label: 'т' },
                  { value: 'кг', label: 'кг' },
                  { value: 'конт.', label: 'конт.' },
                ]}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                🚚 Размер контейнера
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setContainerSize(TONS_IN_CONTAINER_DEFAULT)}
                  className={`flex-1 px-3 py-2 rounded-lg border transition-all duration-200 ${
                    containerSize === TONS_IN_CONTAINER_DEFAULT
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-105'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  26т
                </button>
                <button
                  type="button"
                  onClick={() => setContainerSize(TONS_IN_CONTAINER_EXCEPTION)}
                  className={`flex-1 px-3 py-2 rounded-lg border transition-all duration-200 ${
                    containerSize === TONS_IN_CONTAINER_EXCEPTION
                      ? 'bg-orange-500 text-white border-orange-500 shadow-md transform scale-105'
                      : 'bg-orange-50 text-orange-700 border-orange-300 hover:bg-orange-100'
                  }`}
                >
                  27т
                </button>
              </div>
            </div>
            
            <div className="md:col-span-2 flex items-end">
              <Button 
                onClick={handleAddToCart} 
                className={`w-full transition-all duration-200 ${
                  editingIndex !== null 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {editingIndex !== null ? '🔄 Обновить' : '➕ Добавить'}
              </Button>
            </div>
          </div>

          {/* Conversion Preview */}
          {quantity && !isNaN(parseFloat(quantity)) && (
            <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📊</span>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Предпросмотр пересчёта</p>
                  <p className="text-lg font-semibold text-blue-900">{getConversionPreview()}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Cart */}
        {cart.length > 0 && (
          <>
            <div className="mb-4">
              <h2 className="text-xl font-semibold">Корзина ({cart.length} поз.)</h2>
            </div>
            
            <Table columns={columns} data={cart} />

            {/* Cart Summary */}
            <div className="mt-6 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-lg shadow-lg p-6 text-white">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="text-2xl">📈</span>
                Итого по корзине
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur-sm">
                  <p className="text-sm opacity-90 mb-1">Общий вес</p>
                  <p className="text-3xl font-bold">{formatNumber(cartTotals.totalTons)} т</p>
                </div>
                <div className="bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur-sm">
                  <p className="text-sm opacity-90 mb-1">Контейнеры</p>
                  <p className="text-3xl font-bold">{formatNumber(cartTotals.totalContainers)} конт.</p>
                </div>
                <div className="bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur-sm">
                  <p className="text-sm opacity-90 mb-1">Позиций</p>
                  <p className="text-3xl font-bold">{cartTotals.itemCount}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-4">
              <Button 
                variant="secondary" 
                onClick={() => setCart([])}
                className="bg-red-100 text-red-700 hover:bg-red-200 border-red-300"
              >
                🗑️ Очистить корзину
              </Button>
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
