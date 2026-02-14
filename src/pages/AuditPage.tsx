import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout/Layout';
import { Table } from '../components/ui/Table';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { showToast } from '../components/ui/Toast';
import { auditLogStore, userStore } from '../store';
import { formatDateTime } from '../utils/helpers';

export function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterAction, setFilterAction] = useState('');
  const [filterEntityType, setFilterEntityType] = useState('');
  const [filterUserId, setFilterUserId] = useState('');
  const [filterDate, setFilterDate] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [auditLogs, allUsers] = await Promise.all([
          auditLogStore.getAll(),
          userStore.getAll()
        ]);
        setLogs(auditLogs);
        setUsers(allUsers);
      } catch (error) {
        showToast('error', 'Ошибка загрузки данных');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (filterAction && log.action !== filterAction) return false;
    if (filterEntityType && log.entityType !== filterEntityType) return false;
    if (filterUserId && log.userId !== filterUserId) return false;
    if (filterDate && !log.timestamp.startsWith(filterDate)) return false;
    return true;
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const columns = [
    {
      key: 'timestamp',
      label: 'Дата/Время',
      width: '180px',
      render: (value: string) => formatDateTime(value),
    },
    {
      key: 'userId',
      label: 'Пользователь',
      render: (value: string) => {
        const user = users.find(u => u.id === value);
        return user?.fullName || 'Неизвестен';
      },
    },
    {
      key: 'action',
      label: 'Действие',
      width: '120px',
      render: (value: string) => {
        const labels: Record<string, string> = {
          CREATE: 'Создание',
          UPDATE: 'Изменение',
          DELETE: 'Удаление',
        };
        return labels[value] || value;
      },
    },
    {
      key: 'entityType',
      label: 'Тип',
      width: '150px',
    },
    {
      key: 'entityId',
      label: 'ID',
      width: '100px',
      render: (value: string) => value.substring(0, 8) + '...',
    },
    {
      key: 'details',
      label: 'Детали',
      render: (value: any) => value ? JSON.stringify(value) : '-',
    },
  ];

  const actionOptions = [
    { value: '', label: 'Все действия' },
    { value: 'CREATE', label: 'Создание' },
    { value: 'UPDATE', label: 'Изменение' },
    { value: 'DELETE', label: 'Удаление' },
  ];

  const entityTypeOptions = [
    { value: '', label: 'Все типы' },
    { value: 'Order', label: 'Заказы' },
    { value: 'Item', label: 'Позиции' },
    { value: 'Supplier', label: 'Поставщики' },
    { value: 'Allocation', label: 'Распределения' },
    { value: 'Payment', label: 'Платежи' },
  ];

  const userOptions = [
    { value: '', label: 'Все пользователи' },
    ...users.map(user => ({ value: user.id, label: user.fullName })),
  ];

  return (
    <Layout>
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Аудит</h1>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Загрузка...</span>
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Фильтры</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Input
                  label="Дата"
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                />
                <Select
                  label="Пользователь"
                  value={filterUserId}
                  onChange={(e) => setFilterUserId(e.target.value)}
                  options={userOptions}
                />
                <Select
                  label="Действие"
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
                  options={actionOptions}
                />
                <Select
                  label="Тип сущности"
                  value={filterEntityType}
                  onChange={(e) => setFilterEntityType(e.target.value)}
                  options={entityTypeOptions}
                />
              </div>
            </div>

            {/* Logs Table */}
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Показано записей: {filteredLogs.length} из {logs.length}
              </p>
            </div>
            <Table
              columns={columns}
              data={filteredLogs}
              emptyMessage="Нет записей в журнале аудита"
            />
          </>
        )}
      </div>
    </Layout>
  );
}
