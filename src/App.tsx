import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from './components/ui/Toast';
import { currentUserStore, initializeDefaultUser } from './store';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { AdminPage } from './pages/AdminPage';
import { AuditPage } from './pages/AuditPage';
import { OrdersListPage, CreateOrderPage, OrderDetailsPage } from './pages/orders';
import { DistributionListPage, DistributionPage } from './pages/distribution';
import { FinanceListPage, FinancePage } from './pages/finance';
import { ItemsPage, SuppliersPage } from './pages/references';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const currentUser = currentUserStore.get();
  return currentUser ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
  useEffect(() => {
    initializeDefaultUser();
  }, []);

  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <PrivateRoute>
              <OrdersListPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/orders/create"
          element={
            <PrivateRoute>
              <CreateOrderPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/orders/:orderId"
          element={
            <PrivateRoute>
              <OrderDetailsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/distribution"
          element={
            <PrivateRoute>
              <DistributionListPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/distribution/:orderId"
          element={
            <PrivateRoute>
              <DistributionPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/finance"
          element={
            <PrivateRoute>
              <FinanceListPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/finance/:orderId"
          element={
            <PrivateRoute>
              <FinancePage />
            </PrivateRoute>
          }
        />
        <Route
          path="/references"
          element={
            <PrivateRoute>
              <Navigate to="/references/items" replace />
            </PrivateRoute>
          }
        />
        <Route
          path="/references/items"
          element={
            <PrivateRoute>
              <ItemsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/references/suppliers"
          element={
            <PrivateRoute>
              <SuppliersPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <PrivateRoute>
              <AdminPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/audit"
          element={
            <PrivateRoute>
              <AuditPage />
            </PrivateRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
