import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { currentUserStore, adminModeStore } from '../../store';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const currentUser = currentUserStore.get();
  const isAdminMode = adminModeStore.get();

  const handleLogout = () => {
    currentUserStore.clear();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-gradient-to-r from-blue-700 to-indigo-700 shadow-lg z-30 lg:pl-64">
        <div className="h-full flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-white hidden lg:block">Logistics</h1>
          </div>
          <div className="flex items-center gap-4">
            {isAdminMode && (
              <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                🔓 РЕЖИМ АДМИНА
              </span>
            )}
            <div className="text-white text-sm">
              <span className="font-medium">{currentUser?.fullName}</span>
            </div>
            <button
              onClick={handleLogout}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg transition-all"
            >
              Выйти
            </button>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <Sidebar onLogout={handleLogout} />

      {/* Main Content */}
      <main className="pt-16 lg:pl-64 min-h-screen">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
