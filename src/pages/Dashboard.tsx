
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout/Layout';
import { orderStore, allocationStore, paymentStore, itemStore, supplierStore } from '../store';

export function Dashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [ordersData, allocationsData, paymentsData, itemsData, suppliersData] = await Promise.all([
        orderStore.getAll(),
        allocationStore.getAll(),
        paymentStore.getAll(),
        itemStore.getAll(),
        supplierStore.getAll(),
      ]);
      setOrders(ordersData);
      setAllocations(allocationsData);
      setPayments(paymentsData);
      setItems(itemsData);
      setSuppliers(suppliersData);
      setLoading(false);
    };
    loadData();
  }, []);

  const stats = [
    {
      title: 'Заказы',
      count: orders.length,
      icon: '📦',
      gradient: 'from-blue-500 to-blue-600',
      link: '/orders',
    },
    {
      title: 'Распределение',
      count: allocations.length,
      icon: '🚚',
      gradient: 'from-green-500 to-green-600',
      link: '/distribution',
    },
    {
      title: 'Финансы',
      count: payments.length,
      icon: '💰',
      gradient: 'from-orange-500 to-orange-600',
      link: '/finance',
    },
    {
      title: 'Позиции',
      count: items.length,
      icon: '📦',
      gradient: 'from-purple-500 to-purple-600',
      link: '/references/items',
    },
    {
      title: 'Поставщики',
      count: suppliers.length,
      icon: '🏢',
      gradient: 'from-indigo-500 to-indigo-600',
      link: '/references/suppliers',
    },
  ];

  return (
    <Layout>
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Панель управления</h1>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Загрузка...</span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {stats.map((stat) => (
                <Link
                  key={stat.title}
                  to={stat.link}
                  className="transform transition-all duration-200 hover:scale-105 hover:shadow-xl"
                >
                  <div className={`bg-gradient-to-br ${stat.gradient} rounded-lg shadow-md p-6 text-white`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm opacity-90 mb-1">{stat.title}</p>
                        <p className="text-4xl font-bold">{stat.count}</p>
                      </div>
                      <div className="text-5xl opacity-80">{stat.icon}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="mt-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Быстрые действия</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Link
                  to="/orders/create"
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-100 p-3 rounded-lg">
                      <span className="text-3xl">➕</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Создать заказ</h3>
                      <p className="text-sm text-gray-600">Добавить новый заказ</p>
                    </div>
                  </div>
                </Link>

                <Link
                  to="/references/items"
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-purple-100 p-3 rounded-lg">
                      <span className="text-3xl">📦</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Справочники</h3>
                      <p className="text-sm text-gray-600">Управление позициями и поставщиками</p>
                    </div>
                  </div>
                </Link>

                <Link
                  to="/audit"
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-gray-100 p-3 rounded-lg">
                      <span className="text-3xl">📋</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Аудит</h3>
                      <p className="text-sm text-gray-600">Просмотр логов системы</p>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
