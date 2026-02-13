import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout/Layout';
import { Button } from '../../components/ui/Button';
import { orderStore } from '../../store';
import { Table } from '../../components/ui/Table';
import { getOrderStatusLabel, getOrderStatusColor, formatDateTime } from '../../utils/helpers';

export function OrdersListPage() {
  const navigate = useNavigate();
  const [orders] = useState(orderStore.getAll());

  const columns = [
    {
      key: 'orderNumber',
      label: 'Номер заказа',
      render: (value: string, row: any) => (
        <button
          onClick={() => navigate(`/orders/${row.id}`)}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          {value}
        </button>
      ),
    },
    {
      key: 'createdAt',
      label: 'Дата создания',
      render: (value: string) => formatDateTime(value),
    },
    {
      key: 'status',
      label: 'Статус',
      render: (value: string) => (
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getOrderStatusColor(value)}`}>
          {getOrderStatusLabel(value)}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Действия',
      width: '150px',
      render: (_: any, row: any) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => navigate(`/orders/${row.id}`)}
          >
            Открыть
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Layout>
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Заказы</h1>
          <Button onClick={() => navigate('/orders/create')}>
            + Создать заказ
          </Button>
        </div>

        <Table
          columns={columns}
          data={orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())}
          emptyMessage="Нет заказов. Создайте первый заказ."
        />
      </div>
    </Layout>
  );
}
