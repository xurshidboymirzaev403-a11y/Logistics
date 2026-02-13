import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { currentUserStore, adminModeStore } from '../../store';
import { REFERENCES_TABS } from '../../constants/references';

interface SidebarProps {
  onLogout: () => void;
}

export function Sidebar({ onLogout }: SidebarProps) {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isReferencesOpen, setIsReferencesOpen] = useState(false);
  const currentUser = currentUserStore.get();
  const isAdminMode = adminModeStore.get();

  const menuItems = [
    { path: '/dashboard', icon: '📊', label: 'Панель управления' },
    { path: '/orders', icon: '📦', label: 'Заказы' },
    { path: '/distribution', icon: '🚚', label: 'Распределение' },
    { path: '/finance', icon: '💰', label: 'Финансы' },
    { path: '/admin', icon: '🔧', label: 'Админ' },
    { path: '/audit', icon: '📋', label: 'Аудит' },
  ];

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  // Auto-expand References submenu when on a references page
  useEffect(() => {
    if (location.pathname.startsWith('/references')) {
      setIsReferencesOpen(true);
    }
  }, [location.pathname]);

  return (
    <>
      {/* Mobile menu button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isMobileMenuOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full bg-white shadow-lg z-40
          w-64 transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-blue-600">🚛 Logistics</h1>
            <p className="text-sm text-gray-600 mt-1">{currentUser?.fullName}</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 overflow-y-auto">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg mb-2
                  transition-colors duration-200
                  ${
                    isActive(item.path)
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                      : 'text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
            
            {/* References Section with Submenu */}
            <div className="mb-2">
              <button
                onClick={() => setIsReferencesOpen(!isReferencesOpen)}
                aria-label={`Справочники ${isReferencesOpen ? 'свернуть' : 'развернуть'}`}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg
                  transition-colors duration-200
                  ${
                    location.pathname.startsWith('/references')
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                      : 'text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                <span className="text-xl">📚</span>
                <span className="font-medium flex-1 text-left">Справочники</span>
                <span className={`transform transition-transform duration-200 ${isReferencesOpen ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>
              
              {/* Submenu */}
              {isReferencesOpen && (
                <div className="ml-6 mt-1">
                  {REFERENCES_TABS.map((subItem) => (
                    <Link
                      key={subItem.path}
                      to={subItem.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`
                        flex items-center gap-2 px-4 py-2 rounded-lg mb-1
                        transition-colors duration-200
                        ${
                          location.pathname === subItem.path
                            ? 'bg-blue-100 text-blue-700 font-medium'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                        }
                      `}
                    >
                      <span className="text-base">{subItem.icon}</span>
                      <span className="text-sm">{subItem.label}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </nav>

          {/* Admin mode indicator */}
          {isAdminMode && (
            <div className="p-4 border-t border-gray-200">
              <div className="bg-red-100 text-red-800 px-3 py-2 rounded-lg text-sm font-medium text-center">
                🔓 РЕЖИМ АДМИНА
              </div>
            </div>
          )}

          {/* Logout button */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
            >
              <span className="text-xl">🚪</span>
              <span className="font-medium">Выйти</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
