import { Link, useLocation } from 'react-router-dom';
import { REFERENCES_TABS } from '../../constants/references';

export function ReferencesTabs() {
  const location = useLocation();

  return (
    <div className="border-b border-gray-200 mb-6">
      <nav className="-mb-px flex space-x-8" aria-label="Tabs">
        {REFERENCES_TABS.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 text-sm
                transition-colors duration-200
                ${
                  isActive
                    ? 'border-blue-600 text-blue-600 font-semibold'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 font-medium'
                }
              `}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
