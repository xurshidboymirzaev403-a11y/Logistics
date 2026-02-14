import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout/Layout';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { showToast } from '../../components/ui/Toast';
import {
  orderStore,
  orderLineStore,
  allocationStore,
  supplierStore,
  paymentStore,
  currentUserStore,
  auditLogStore,
  itemStore,
} from '../../store';
import { getTodayDate, formatDateTime, getPaymentTypeLabel, validateDistribution, formatNumber } from '../../utils/helpers';
import { formatCurrency } from '../../utils/format';
import type { Order, Allocation, PaymentOperation, Currency } from '../../types';

export function FinancePage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | undefined>();
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [payments, setPayments] = useState<PaymentOperation[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isPercentageModalOpen, setIsPercentageModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    supplierId: '',
    type: 'PREPAYMENT' as 'PREPAYMENT' | 'PAYOFF',
    amount: '',
    currency: 'USD' as Currency,
    date: getTodayDate(),
    comment: '',
  });
  const [percentageForm, setPercentageForm] = useState({
    supplierId: '',
    currency: 'USD' as Currency,
    percentage: '',
    calculationBase: 'remaining' as 'remaining' | 'total',
    totalAmount: 0,
    remainingAmount: 0,
    date: getTodayDate(),
    comment: '',
  });

  const currentUser = currentUserStore.get();

  useEffect(() => {
    if (orderId) {
      const foundOrder = orderStore.getById(orderId);
      setOrder(foundOrder);

      if (foundOrder) {
        setAllocations(allocationStore.getByOrderId(orderId));
        setPayments(paymentStore.getByOrderId(orderId));
      }
    }
  }, [orderId]);

  // Calculate undistributed items
  const undistributedInfo = useMemo(() => {
    if (!orderId) return null;

    const orderLines = orderLineStore.getByOrderId(orderId);
    const allocations = allocationStore.getByOrderId(orderId);

    let totalOrdered = 0;
    let totalAllocated = 0;
    const undistributedLines: Array<{ itemName: string; ordered: number; allocated: number; remaining: number }> = [];

    orderLines.forEach(line => {
      const item = itemStore.getById(line.itemId);
      totalOrdered += line.quantityInTons;
      
      const lineAllocations = allocations.filter(a => a.orderLineId === line.id);
      const { allocated } = validateDistribution(line, lineAllocations);
      totalAllocated += allocated;

      const remaining = line.quantityInTons - allocated;
      if (remaining > 0.001) {
        undistributedLines.push({
          itemName: item?.name || 'Unknown',
          ordered: line.quantityInTons,
          allocated,
          remaining,
        });
      }
    });

    const totalRemaining = totalOrdered - totalAllocated;
    const percentage = totalOrdered > 0 ? ((totalOrdered - totalRemaining) / totalOrdered) * 100 : 0;

    return {
      totalOrdered,
      totalAllocated,
      totalRemaining,
      percentage,
      hasUndistributed: totalRemaining > 0.001,
      undistributedLines,
    };
  }, [orderId]);

  const handleOpenPaymentModal = (supplierId: string, type: 'PREPAYMENT' | 'PAYOFF', currency: Currency, defaultAmount?: number) => {
    setPaymentForm({
      supplierId,
      type,
      amount: defaultAmount ? defaultAmount.toString() : '',
      currency,
      date: getTodayDate(),
      comment: '',
    });
    setIsPaymentModalOpen(true);
  };

  const handleClosePaymentModal = () => {
    setIsPaymentModalOpen(false);
  };

  const handleOpenPercentageModal = (supplierId: string, currency: Currency, totalAmount: number, remainingAmount: number) => {
    setPercentageForm({
      supplierId,
      currency,
      percentage: '',
      calculationBase: 'remaining',
      totalAmount,
      remainingAmount,
      date: getTodayDate(),
      comment: '',
    });
    setIsPercentageModalOpen(true);
  };

  const handleClosePercentageModal = () => {
    setIsPercentageModalOpen(false);
  };

  const calculatePercentageAmount = () => {
    const percentage = parseFloat(percentageForm.percentage);
    if (isNaN(percentage) || percentage < 0.01) return 0;

    const baseAmount = percentageForm.calculationBase === 'remaining' 
      ? percentageForm.remainingAmount 
      : percentageForm.totalAmount;

    const calculatedAmount = (baseAmount * percentage) / 100;

    // Cap at remaining amount
    return Math.min(calculatedAmount, percentageForm.remainingAmount);
  };

  const handleQuickPercentage = (percentage: number) => {
    setPercentageForm({
      ...percentageForm,
      percentage: percentage.toString(),
    });
  };

  const handleSavePercentagePayment = () => {
    const percentage = parseFloat(percentageForm.percentage);
    
    if (isNaN(percentage) || percentage < 0.01 || percentage > 100) {
      showToast('warning', 'Введите процент от 0.01 до 100');
      return;
    }

    const amount = calculatePercentageAmount();
    
    if (amount <= 0) {
      showToast('warning', 'Введите корректный процент');
      return;
    }

    const baseLabel = percentageForm.calculationBase === 'remaining' ? 'остатка' : 'общей суммы';
    const autoComment = percentageForm.comment || 
      `Оплата ${percentage}% от ${baseLabel} (${formatCurrency(amount, percentageForm.currency)})`;

    const payment = paymentStore.create({
      orderId: order!.id,
      supplierId: percentageForm.supplierId,
      type: 'PREPAYMENT',
      amount: amount,
      currency: percentageForm.currency,
      date: percentageForm.date,
      createdAt: new Date().toISOString(),
      createdBy: currentUser?.id || '',
      comment: autoComment,
    });

    auditLogStore.create({
      action: 'CREATE',
      entityType: 'Payment',
      entityId: payment.id,
      userId: currentUser?.id || '',
      details: { orderNumber: order?.orderNumber, type: 'PREPAYMENT', amount: amount, percentage: percentage },
    });

    setPayments(paymentStore.getByOrderId(orderId!));
    showToast('success', 'Платеж добавлен');
    handleClosePercentageModal();
  };

  const handleSavePayment = () => {
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      showToast('warning', 'Введите корректную сумму');
      return;
    }

    const payment = paymentStore.create({
      orderId: order!.id,
      supplierId: paymentForm.supplierId,
      type: paymentForm.type,
      amount: parseFloat(paymentForm.amount),
      currency: paymentForm.currency,
      date: paymentForm.date,
      createdAt: new Date().toISOString(),
      createdBy: currentUser?.id || '',
      comment: paymentForm.comment,
    });

    auditLogStore.create({
      action: 'CREATE',
      entityType: 'Payment',
      entityId: payment.id,
      userId: currentUser?.id || '',
      details: { orderNumber: order?.orderNumber, type: paymentForm.type, amount: paymentForm.amount },
    });

    setPayments(paymentStore.getByOrderId(orderId!));
    showToast('success', 'Платеж добавлен');
    handleClosePaymentModal();
  };

  if (!order) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600">Заказ не найден</p>
          <Button className="mt-4" onClick={() => navigate('/finance')}>
            ← Назад
          </Button>
        </div>
      </Layout>
    );
  }

  // Group allocations by supplier and currency
  const supplierGroups = allocations.reduce((acc, alloc) => {
    const key = `${alloc.supplierId}_${alloc.currency}`;
    if (!acc[key]) {
      acc[key] = {
        supplierId: alloc.supplierId,
        currency: alloc.currency,
        allocations: [],
        total: 0,
      };
    }
    acc[key].allocations.push(alloc);
    acc[key].total += alloc.totalSum;
    return acc;
  }, {} as Record<string, { supplierId: string; currency: Currency; allocations: Allocation[]; total: number }>);

  return (
    <Layout>
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Финансы заказа {order.orderNumber}</h1>
          <Button variant="secondary" onClick={() => navigate('/finance')}>
            ← Назад
          </Button>
        </div>

        {/* Undistributed Items Warning */}
        {undistributedInfo?.hasUndistributed && (
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-3 mb-4">
              <span className="text-3xl">⚠️</span>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-yellow-900 mb-2">
                  Не распределено: {formatNumber(undistributedInfo.totalRemaining)} т из {formatNumber(undistributedInfo.totalOrdered)} т ({formatNumber(100 - undistributedInfo.percentage)}%)
                </h3>
                <p className="text-sm text-yellow-800 mb-3">
                  Распределено только {formatNumber(undistributedInfo.percentage)}% от заказа
                </p>

                {undistributedInfo.undistributedLines.length > 0 && (
                  <div className="bg-white rounded-lg p-4 border border-yellow-200">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Нераспределённые позиции:</p>
                    <div className="space-y-2">
                      {undistributedInfo.undistributedLines.map((line, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span className="text-gray-900">{line.itemName}</span>
                          <span className="text-red-600 font-semibold">
                            Остаток: {formatNumber(line.remaining)} т (из {formatNumber(line.ordered)} т)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Suppliers */}
        {Object.values(supplierGroups).map((group) => {
          const supplier = supplierStore.getById(group.supplierId);
          const supplierPayments = payments.filter(
            (p) => p.supplierId === group.supplierId && p.currency === group.currency
          );
          const paid = supplierPayments.reduce((sum, p) => sum + p.amount, 0);
          const remaining = group.total - paid;

          const getStatus = () => {
            if (paid === 0) return { label: 'Не оплачено', color: 'bg-red-100 text-red-800' };
            if (paid < group.total) return { label: 'Частично оплачено', color: 'bg-yellow-100 text-yellow-800' };
            return { label: 'Оплачено', color: 'bg-green-100 text-green-800' };
          };

          const status = getStatus();

          return (
            <div key={`${group.supplierId}_${group.currency}`} className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-semibold">{supplier?.name}</h2>
                  <p className="text-sm text-gray-600">Валюта: {group.currency}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>
                  {status.label}
                </span>
              </div>

              {/* Allocations Table */}
              <div className="mb-4">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Позиция</th>
                      <th className="px-3 py-2 text-right">Количество (т)</th>
                      <th className="px-3 py-2 text-right">Цена/тонну</th>
                      <th className="px-3 py-2 text-right">Сумма</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {group.allocations.map((alloc) => (
                      <tr key={alloc.id}>
                        <td className="px-3 py-2">{alloc.itemId}</td>
                        <td className="px-3 py-2 text-right">{alloc.quantityInTons.toFixed(3)}</td>
                        <td className="px-3 py-2 text-right">
                          {formatCurrency(alloc.pricePerTon, alloc.currency)}
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          {formatCurrency(alloc.totalSum, alloc.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 font-semibold">
                    <tr>
                      <td colSpan={3} className="px-3 py-2 text-right">
                        Итого:
                      </td>
                      <td className="px-3 py-2 text-right text-lg">
                        {formatCurrency(group.total, group.currency)}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="px-3 py-2 text-right">
                        Оплачено:
                      </td>
                      <td className="px-3 py-2 text-right text-green-600">
                        {formatCurrency(paid, group.currency)}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="px-3 py-2 text-right">
                        Остаток:
                      </td>
                      <td className="px-3 py-2 text-right text-red-600">
                        {formatCurrency(remaining, group.currency)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Payment Buttons */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handleOpenPaymentModal(group.supplierId, 'PREPAYMENT', group.currency)}
                >
                  Предоплата
                </Button>
                <Button
                  size="sm"
                  variant="success"
                  onClick={() => handleOpenPaymentModal(group.supplierId, 'PAYOFF', group.currency, remaining)}
                  disabled={remaining <= 0}
                >
                  Погасить
                </Button>
                <Button
                  size="sm"
                  variant="warning"
                  onClick={() => handleOpenPercentageModal(group.supplierId, group.currency, group.total, remaining)}
                  disabled={remaining <= 0}
                >
                  📊 Оплатить %
                </Button>
              </div>
            </div>
          );
        })}

        {/* Payment History */}
        {payments.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">История операций</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Дата</th>
                    <th className="px-3 py-2 text-left">Тип</th>
                    <th className="px-3 py-2 text-left">Поставщик</th>
                    <th className="px-3 py-2 text-right">Сумма</th>
                    <th className="px-3 py-2 text-left">Комментарий</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {payments
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((payment) => {
                      const supplier = supplierStore.getById(payment.supplierId);
                      return (
                        <tr key={payment.id}>
                          <td className="px-3 py-2">{formatDateTime(payment.date)}</td>
                          <td className="px-3 py-2">{getPaymentTypeLabel(payment.type)}</td>
                          <td className="px-3 py-2">{supplier?.name}</td>
                          <td className="px-3 py-2 text-right font-medium">
                            {formatCurrency(payment.amount, payment.currency)}
                          </td>
                          <td className="px-3 py-2">{payment.comment || '-'}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Payment Modal */}
        <Modal
          isOpen={isPaymentModalOpen}
          onClose={handleClosePaymentModal}
          title={paymentForm.type === 'PREPAYMENT' ? 'Предоплата' : 'Погашение'}
          icon="💰"
        >
          <div className="space-y-4">
            <Input
              label="Сумма *"
              type="number"
              step="0.01"
              value={paymentForm.amount}
              onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
              placeholder="0.00"
              autoFocus
            />

            <Input
              label="Дата *"
              type="date"
              value={paymentForm.date}
              onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Комментарий</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                value={paymentForm.comment}
                onChange={(e) => setPaymentForm({ ...paymentForm, comment: e.target.value })}
                placeholder="Необязательно"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="secondary" onClick={handleClosePaymentModal}>
                Отмена
              </Button>
              <Button onClick={handleSavePayment}>Сохранить</Button>
            </div>
          </div>
        </Modal>

        {/* Percentage Payment Modal */}
        <Modal
          isOpen={isPercentageModalOpen}
          onClose={handleClosePercentageModal}
          title="Оплата по процентам"
          icon="📊"
          size="lg"
        >
          <div className="space-y-4">
            {/* Quick percentage buttons */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Быстрый выбор:</label>
              <div className="flex flex-wrap gap-2">
                {[10, 20, 25, 30, 50, 70, 100].map((percent) => (
                  <button
                    key={percent}
                    type="button"
                    onClick={() => handleQuickPercentage(percent)}
                    className={`
                      px-4 py-2 rounded-full text-sm font-medium transition-all
                      ${percentageForm.percentage === percent.toString()
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                    `}
                  >
                    {percent}%
                  </button>
                ))}
              </div>
            </div>

            {/* Percentage input */}
            <Input
              label="Процент (%) *"
              type="number"
              step="0.01"
              min="0.01"
              max="100"
              value={percentageForm.percentage}
              onChange={(e) => setPercentageForm({ ...percentageForm, percentage: e.target.value })}
              placeholder="0.00"
              autoFocus
            />

            {/* Calculation base radio buttons */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Считать от:</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="calculationBase"
                    value="remaining"
                    checked={percentageForm.calculationBase === 'remaining'}
                    onChange={(e) => setPercentageForm({ ...percentageForm, calculationBase: e.target.value as 'remaining' | 'total' })}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    От остатка ({formatCurrency(percentageForm.remainingAmount, percentageForm.currency)})
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="calculationBase"
                    value="total"
                    checked={percentageForm.calculationBase === 'total'}
                    onChange={(e) => setPercentageForm({ ...percentageForm, calculationBase: e.target.value as 'remaining' | 'total' })}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    От общей суммы ({formatCurrency(percentageForm.totalAmount, percentageForm.currency)})
                  </span>
                </label>
              </div>
            </div>

            {/* Amount preview */}
            {percentageForm.percentage && parseFloat(percentageForm.percentage) > 0 && (() => {
              const calculatedAmount = calculatePercentageAmount();
              return (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">📊</span>
                    <div className="text-sm text-gray-600">
                      {percentageForm.percentage}% от{' '}
                      {formatCurrency(
                        percentageForm.calculationBase === 'remaining' 
                          ? percentageForm.remainingAmount 
                          : percentageForm.totalAmount,
                        percentageForm.currency
                      )}{' '}
                      ={' '}
                      <span className="font-bold text-lg text-blue-700">
                        {formatCurrency(calculatedAmount, percentageForm.currency)}
                      </span>
                    </div>
                  </div>
                  {calculatedAmount > percentageForm.remainingAmount && (
                    <p className="mt-2 text-sm text-red-600">
                      ⚠️ Сумма превышает остаток и будет ограничена до{' '}
                      {formatCurrency(percentageForm.remainingAmount, percentageForm.currency)}
                    </p>
                  )}
                </div>
              );
            })()}

            {/* Date */}
            <Input
              label="Дата *"
              type="date"
              value={percentageForm.date}
              onChange={(e) => setPercentageForm({ ...percentageForm, date: e.target.value })}
            />

            {/* Comment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Комментарий</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                value={percentageForm.comment}
                onChange={(e) => setPercentageForm({ ...percentageForm, comment: e.target.value })}
                placeholder={`Оплата ${percentageForm.percentage || 'X'}% от ${percentageForm.calculationBase === 'remaining' ? 'остатка' : 'общей суммы'}`}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="secondary" onClick={handleClosePercentageModal}>
                Отмена
              </Button>
              <Button variant="success" onClick={handleSavePercentagePayment}>
                💰 Оплатить
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
}
