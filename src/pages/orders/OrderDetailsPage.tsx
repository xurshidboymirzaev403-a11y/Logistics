import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout/Layout';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { orderStore, orderLineStore, itemStore } from '../../store';
import { getOrderStatusLabel, getOrderStatusColor, formatDateTime, formatNumber } from '../../utils/helpers';
import type { Order, OrderLine } from '../../types';

export function OrderDetailsPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | undefined>();
  const [orderLines, setOrderLines] = useState<OrderLine[]>([]);

  useEffect(() => {
    if (orderId) {
      const foundOrder = orderStore.getById(orderId);
      setOrder(foundOrder);
      
      if (foundOrder) {
        setOrderLines(orderLineStore.getByOrderId(orderId));
      }
    }
  }, [orderId]);

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

        {/* Order Lines */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Позиции заказа</h2>
          <Table columns={columns} data={orderLines} emptyMessage="Нет позиций в заказе" />
        </div>

        {/* Totals */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-gray-700">Всего:</span>
            <span className="text-2xl font-bold text-blue-600">
              {formatNumber(totalTons)} т ({orderLines.length} поз.)
            </span>
          </div>
        </div>
      </div>
    </Layout>
  );
}
