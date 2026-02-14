
import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout/Layout';
import { Button } from '../components/ui/Button';
import { showToast } from '../components/ui/Toast';
import { useAdminMode } from '../hooks/useAdminMode';
import { clearAllData, exportData, importData } from '../store';
import { orderStore, itemStore, supplierStore, allocationStore, paymentStore } from '../store';

export function AdminPage() {
  const { isAdminMode, toggleAdminMode } = useAdminMode();
  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState({
    orders: 0,
    items: 0,
    suppliers: 0,
    allocations: 0,
    payments: 0,
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [orders, items, suppliers, allocations, payments] = await Promise.all([
          orderStore.getAll(),
          itemStore.getAll(),
          supplierStore.getAll(),
          allocationStore.getAll(),
          paymentStore.getAll(),
        ]);
        setStats({
          orders: orders.length,
          items: items.length,
          suppliers: suppliers.length,
          allocations: allocations.length,
          payments: payments.length,
        });
      } catch (error) {
        showToast('error', 'Ошибка загрузки данных');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleClearData = () => {
    if (!confirm('Вы уверены, что хотите очистить все данные? Это действие необратимо!')) {
      return;
    }

    clearAllData();
    showToast('success', 'Все данные очищены');
    window.location.reload();
  };

  const handleExport = async () => {
    try {
      const data = await exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `logistics-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('success', 'Данные экспортированы');
    } catch (error) {
      showToast('error', 'Ошибка при экспорте данных');
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event: any) => {
        try {
          const result = await importData(event.target.result);
          if (result) {
            showToast('success', 'Данные импортированы');
            window.location.reload();
          } else {
            showToast('error', 'Ошибка импорта данных');
          }
        } catch (error) {
          showToast('error', 'Ошибка импорта данных');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <Layout>
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Администрирование</h1>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Загрузка...</span>
          </div>
        ) : (
          <>
            {/* Admin Mode Toggle */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold mb-2">Режим администратора</h2>
                  <p className="text-gray-600">
                    {isAdminMode
                      ? '🔓 Режим админа включен. Вы можете редактировать и удалять данные.'
                      : '🔒 Режим админа выключен. Редактирование и удаление заблокировано.'}
                  </p>
                </div>
                <button
                  onClick={toggleAdminMode}
                  className={`
                    relative inline-flex h-12 w-24 items-center rounded-full transition-colors
                    ${isAdminMode ? 'bg-red-500' : 'bg-gray-300'}
                  `}
                >
                  <span
                    className={`
                      inline-block h-10 w-10 transform rounded-full bg-white transition-transform
                      ${isAdminMode ? 'translate-x-12' : 'translate-x-1'}
                    `}
                  />
                </button>
              </div>
            </div>

            {/* System Stats */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Статистика системы</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600">{stats.orders}</p>
                  <p className="text-sm text-gray-600">Заказов</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">{stats.allocations}</p>
                  <p className="text-sm text-gray-600">Распределений</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-orange-600">{stats.payments}</p>
                  <p className="text-sm text-gray-600">Платежей</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-purple-600">{stats.items}</p>
                  <p className="text-sm text-gray-600">Позиций</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-indigo-600">{stats.suppliers}</p>
                  <p className="text-sm text-gray-600">Поставщиков</p>
                </div>
              </div>
            </div>

            {/* Data Management */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Управление данными</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button onClick={handleExport} variant="primary">
                  📥 Экспорт данных
                </Button>
                <Button onClick={handleImport} variant="success">
                  📤 Импорт данных
                </Button>
                <Button onClick={handleClearData} variant="danger">
                  🗑️ Очистить все данные
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
