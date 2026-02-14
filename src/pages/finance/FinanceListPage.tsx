import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout/Layout';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { orderStore } from '../../store';
import { showToast } from '../../components/ui/Toast';
import { getOrderStatusLabel, getOrderStatusColor, formatDateTime } from '../../utils/helpers';

export function FinanceListPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const allOrders = await orderStore.getAll();
        setOrders(allOrders.filter((o) => ['financial', 'completed'].includes(o.status)));
      } catch (error) {
        showToast('error', 'Ошибка загрузки данных');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

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

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Загрузка...</span>
          </div>
        ) : (
          <Table
            columns={columns}
            data={orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())}
            emptyMessage="Нет заказов в финансовой обработке"
          />
        )}
      </div>
    </Layout>
  );
}
