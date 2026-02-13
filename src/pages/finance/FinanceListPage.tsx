import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout/Layout';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { orderStore } from '../../store';
import { getOrderStatusLabel, getOrderStatusColor, formatDateTime } from '../../utils/helpers';

export function FinanceListPage() {
  const navigate = useNavigate();
  const [orders] = useState(
    orderStore.getAll().filter((o) => ['financial', 'completed'].includes(o.status))
  );

  const columns = [
    {
      key: 'orderNumber',
      label: 'Номер заказа',
      render: (value: string, row: any) => (
        <button
          onClick={() => navigate(`/finance/${row.id}`)}
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
        <Button
          size="sm"
          onClick={() => navigate(`/finance/${row.id}`)}
        >
          Открыть
        </Button>
      ),
    },
  ];

  return (
    <Layout>
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Финансы</h1>

        <Table
          columns={columns}
          data={orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())}
          emptyMessage="Нет заказов в финансовой обработке"
        />
      </div>
    </Layout>
  );
}
