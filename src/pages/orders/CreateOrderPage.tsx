import React, { useState } from 'react';
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
      containerSize: unit === 'конт.' ? containerSize : undefined,
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

  const getItemDisplay = (qty: number, unit: Unit, qtyInTons: number, containerSize?: number) => {
    const containers = toContainers(qtyInTons, containerSize || TONS_IN_CONTAINER_DEFAULT);
    
    if (unit === 'т') {
      return `${formatNumber(qty)} т (${formatNumber(containers)} конт.)`;
    } else if (unit === 'кг') {
      return `${formatNumber(qty)} кг (${formatNumber(qtyInTons)} т / ${formatNumber(containers)} конт.)`;
    } else {
      return `${formatNumber(qty)} конт. (${formatNumber(qtyInTons)} т)`;
    }
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
      render: (_: any, row: CartItem) => getItemDisplay(row.quantity, row.unit, row.quantityInTons, row.containerSize),
    },
    {
      key: 'quantityInTons',
      label: 'В тоннах',
      render: (value: number) => `${formatNumber(value)} т`,
    },
    {
      key: 'actions',
      label: 'Действия',
      width: '150px',
      render: (_: any, row: CartItem, index: number) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleEdit(index)}
            className="text-blue-600 hover:text-blue-800"
            title="Редактировать"
          >
            ✏️
          </button>
          <button
            onClick={() => handleDelete(index)}
            className="text-red-600 hover:text-red-800"
            title="Удалить"
          >
            🗑️
          </button>
        </div>
      ),
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
                  { value: 'конт.', label: 'конт.' },
                ]}
              />
            </div>

            {unit === 'конт.' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Размер контейнера
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setContainerSize(TONS_IN_CONTAINER_DEFAULT)}
                    className={`flex-1 px-3 py-2 rounded-lg border ${
                      containerSize === TONS_IN_CONTAINER_DEFAULT
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    26т
                  </button>
                  <button
                    type="button"
                    onClick={() => setContainerSize(TONS_IN_CONTAINER_EXCEPTION)}
                    className={`flex-1 px-3 py-2 rounded-lg border ${
                      containerSize === TONS_IN_CONTAINER_EXCEPTION
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    27т
                  </button>
                </div>
              </div>
            )}
            
            <div className="md:col-span-2 flex items-end">
              <Button onClick={handleAddToCart} className="w-full">
                {editingIndex !== null ? 'Обновить' : 'Добавить'}
              </Button>
            </div>
          </div>
        </div>

        {/* Cart */}
        {cart.length > 0 && (
          <>
            <div className="mb-4">
              <h2 className="text-xl font-semibold">Корзина ({cart.length} поз.)</h2>
            </div>
            
            <Table columns={columns} data={cart.map((item, index) => ({ ...item, index }))} />

            <div className="mt-6 flex justify-end gap-4">
              <Button variant="secondary" onClick={() => setCart([])}>
                Очистить корзину
              </Button>
              <Button onClick={handleSave}>
                Сохранить заказ
              </Button>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
