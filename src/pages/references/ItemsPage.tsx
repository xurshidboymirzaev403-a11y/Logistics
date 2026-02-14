import { useState, useEffect } from 'react';
import { Layout } from '../../components/Layout/Layout';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Table } from '../../components/ui/Table';
import { showToast } from '../../components/ui/Toast';
import { ReferencesTabs } from '../../components/references/ReferencesTabs';
import { itemStore, auditLogStore, currentUserStore, adminModeStore } from '../../store';
import type { Item, Unit } from '../../types';

export function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    unit: 'т' as Unit,
    category: '',
    description: '',
  });

  const isAdminMode = adminModeStore.get();
  const currentUser = currentUserStore.get();

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setItems(await itemStore.getAll());
      } catch (error) {
        showToast('error', 'Ошибка загрузки данных');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleOpenModal = (item?: Item) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        unit: item.unit,
        category: item.category || '',
        description: item.description || '',
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        unit: 'т',
        category: '',
        description: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showToast('warning', 'Введите название позиции');
      return;
    }

    try {
      if (editingItem) {
        if (!isAdminMode) {
          showToast('error', 'Включите режим администратора для редактирования');
          return;
        }
        await itemStore.update(editingItem.id, formData);
        await auditLogStore.create({
          action: 'UPDATE',
          entityType: 'Item',
          entityId: editingItem.id,
          userId: currentUser?.id || '',
          details: formData,
        });
        showToast('success', 'Позиция обновлена');
      } else {
        const newItem = await itemStore.create(formData);
        await auditLogStore.create({
          action: 'CREATE',
          entityType: 'Item',
          entityId: newItem.id,
          userId: currentUser?.id || '',
          details: formData,
        });
        showToast('success', 'Позиция создана');
      }

      setItems(await itemStore.getAll());
      handleCloseModal();
    } catch (error) {
      showToast('error', 'Ошибка при сохранении позиции');
    }
  };

  const handleDelete = async (item: Item) => {
    if (!isAdminMode) {
      showToast('error', 'Включите режим администратора для удаления');
      return;
    }

    if (!confirm(`Удалить позицию "${item.name}"?`)) {
      return;
    }

    try {
      await itemStore.delete(item.id);
      await auditLogStore.create({
        action: 'DELETE',
        entityType: 'Item',
        entityId: item.id,
        userId: currentUser?.id || '',
        details: { name: item.name },
      });
      setItems(await itemStore.getAll());
      showToast('success', 'Позиция удалена');
    } catch (error) {
      showToast('error', 'Ошибка при удалении позиции');
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Название',
    },
    {
      key: 'unit',
      label: 'Единица',
      width: '100px',
    },
    {
      key: 'category',
      label: 'Категория',
      render: (value: string | undefined) => value || '-',
    },
    {
      key: 'description',
      label: 'Описание',
      render: (value: string | undefined) => value || '-',
    },
    {
      key: 'actions',
      label: 'Действия',
      width: '150px',
      render: (_: any, row: Item) => (
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
          <h1 className="text-3xl font-bold text-gray-900">Позиции (Номенклатура)</h1>
          <Button onClick={() => handleOpenModal()}>
            + Добавить позицию
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Загрузка...</span>
          </div>
        ) : (
          <Table columns={columns} data={items} emptyMessage="Нет позиций. Добавьте первую позицию." />
        )}

        {/* Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title={editingItem ? 'Редактировать позицию' : 'Добавить позицию'}
          icon="📦"
        >
          <div className="space-y-4">
            <Input
              label="Название *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Введите название"
              autoFocus
            />

            <Select
              label="Единица измерения *"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value as Unit })}
              options={[
                { value: 'т', label: 'т (тонны)' },
                { value: 'кг', label: 'кг (килограммы)' },
                { value: 'конт.', label: 'конт. (контейнеры)' },
              ]}
            />

            <Input
              label="Категория"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="Введите категорию (необязательно)"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Описание
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Введите описание (необязательно)"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="secondary" onClick={handleCloseModal}>
                Отмена
              </Button>
              <Button onClick={handleSave}>
                {editingItem ? 'Сохранить' : 'Добавить'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
}
