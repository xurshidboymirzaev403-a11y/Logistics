import { useState, useEffect } from 'react';
import { Layout } from '../../components/Layout/Layout';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Table } from '../../components/ui/Table';
import { showToast } from '../../components/ui/Toast';
import { ReferencesTabs } from '../../components/references/ReferencesTabs';
import { supplierStore, auditLogStore, currentUserStore, adminModeStore } from '../../store';
import type { Supplier } from '../../types';

export function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    contacts: '',
    notes: '',
  });

  const isAdminMode = adminModeStore.get();
  const currentUser = currentUserStore.get();

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setSuppliers(await supplierStore.getAll());
      } catch (error) {
        showToast('error', 'Ошибка загрузки данных');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleOpenModal = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({
        name: supplier.name,
        contacts: supplier.contacts || '',
        notes: supplier.notes || '',
      });
    } else {
      setEditingSupplier(null);
      setFormData({
        name: '',
        contacts: '',
        notes: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSupplier(null);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showToast('warning', 'Введите название поставщика');
      return;
    }

    try {
      if (editingSupplier) {
        if (!isAdminMode) {
          showToast('error', 'Включите режим администратора для редактирования');
          return;
        }
        await supplierStore.update(editingSupplier.id, formData);
        await auditLogStore.create({
          action: 'UPDATE',
          entityType: 'Supplier',
          entityId: editingSupplier.id,
          userId: currentUser?.id || '',
          details: formData,
        });
        showToast('success', 'Поставщик обновлен');
      } else {
        const newSupplier = await supplierStore.create(formData);
        await auditLogStore.create({
          action: 'CREATE',
          entityType: 'Supplier',
          entityId: newSupplier.id,
          userId: currentUser?.id || '',
          details: formData,
        });
        showToast('success', 'Поставщик создан');
      }

      setSuppliers(await supplierStore.getAll());
      handleCloseModal();
    } catch (error) {
      showToast('error', 'Ошибка при сохранении поставщика');
    }
  };

  const handleDelete = async (supplier: Supplier) => {
    if (!isAdminMode) {
      showToast('error', 'Включите режим администратора для удаления');
      return;
    }

    if (!confirm(`Удалить поставщика "${supplier.name}"?`)) {
      return;
    }

    try {
      await supplierStore.delete(supplier.id);
      await auditLogStore.create({
        action: 'DELETE',
        entityType: 'Supplier',
        entityId: supplier.id,
        userId: currentUser?.id || '',
        details: { name: supplier.name },
      });
      setSuppliers(await supplierStore.getAll());
      showToast('success', 'Поставщик удален');
    } catch (error) {
      showToast('error', 'Ошибка при удалении поставщика');
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Название',
    },
    {
      key: 'contacts',
      label: 'Контакты',
      render: (value: string | undefined) => value || '-',
    },
    {
      key: 'notes',
      label: 'Примечание',
      render: (value: string | undefined) => value || '-',
    },
    {
      key: 'actions',
      label: 'Действия',
      width: '150px',
      render: (_: any, row: Supplier) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleOpenModal(row)}
            className={`text-blue-600 hover:text-blue-800 ${!isAdminMode ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={!isAdminMode ? 'Включите режим администратора' : 'Редактировать'}
            disabled={!isAdminMode}
          >
            ✏️
          </button>
          <button
            onClick={() => handleDelete(row)}
            className={`text-red-600 hover:text-red-800 ${!isAdminMode ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={!isAdminMode ? 'Включите режим администратора' : 'Удалить'}
            disabled={!isAdminMode}
          >
            🗑️
          </button>
          {!isAdminMode && <span className="text-gray-400">🔒</span>}
        </div>
      ),
    },
  ];

  return (
    <Layout>
      <div>
        <ReferencesTabs />
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Поставщики</h1>
          <Button onClick={() => handleOpenModal()}>
            + Добавить поставщика
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Загрузка...</span>
          </div>
        ) : (
          <Table columns={columns} data={suppliers} emptyMessage="Нет поставщиков. Добавьте первого поставщика." />
        )}

        {/* Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title={editingSupplier ? 'Редактировать поставщика' : 'Добавить поставщика'}
          icon="🏢"
        >
          <div className="space-y-4">
            <Input
              label="Название *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Введите название"
              autoFocus
            />

            <Input
              label="Контакты"
              value={formData.contacts}
              onChange={(e) => setFormData({ ...formData, contacts: e.target.value })}
              placeholder="Телефон, email и т.д. (необязательно)"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Примечание
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Введите примечание (необязательно)"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="secondary" onClick={handleCloseModal}>
                Отмена
              </Button>
              <Button onClick={handleSave}>
                {editingSupplier ? 'Сохранить' : 'Добавить'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
}
