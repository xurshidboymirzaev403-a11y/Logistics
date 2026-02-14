import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout/Layout';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { orderStore, orderLineStore, allocationStore } from '../../store';
import { getOrderStatusLabel, getOrderStatusColor, formatDateTime, validateDistribution } from '../../utils/helpers';

export function FinanceListPage() {
  const navigate = useNavigate();
  const [orders] = useState(
    orderStore.getAll().filter((o) => ['financial', 'completed'].includes(o.status))
  );

  // Calculate distribution status for each order
  const ordersWithDistributionStatus = useMemo(() => {
    return orders.map(order => {
      const lines = orderLineStore.getByOrderId(order.id);
      const allocations = allocationStore.getByOrderId(order.id);
      
      let totalOrdered = 0;
      let totalAllocated = 0;
      
      lines.forEach(line => {
        totalOrdered += line.quantityInTons;
        const lineAllocations = allocations.filter(a => a.orderLineId === line.id);
        const { allocated } = validateDistribution(line, lineAllocations);
        totalAllocated += allocated;
      });

      const isPartiallyDistributed = totalAllocated < totalOrdered && totalAllocated > 0;
      const distributionPercentage = totalOrdered > 0 ? (totalAllocated / totalOrdered) * 100 : 0;

      return {
        ...order,
        isPartiallyDistributed,
        distributionPercentage,
      };
    });
  }, [orders]);

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
      render: (value: string, row: any) => (
        <div className="flex flex-col gap-1">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getOrderStatusColor(value)}`}>
            {getOrderStatusLabel(value)}
          </span>
          {row.isPartiallyDistributed && (
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
              ⚠️ Частично распределён ({row.distributionPercentage.toFixed(0)}%)
            </span>
          )}
        </div>
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
          data={ordersWithDistributionStatus.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())}
          emptyMessage="Нет заказов в финансовой обработке"
        />
      </div>
    </Layout>
  );
}
