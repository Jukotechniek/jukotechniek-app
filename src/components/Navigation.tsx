
import React from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange }) => {
  const { user, logout } = useAuth();

  const adminTabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'hours', label: 'Work Hours' },
    { id: 'projects', label: 'Projects' },
    { id: 'billing', label: 'Billing' },
    { id: 'verification', label: 'Hour Verification' },
    { id: 'users', label: 'User Management' },
    { id: 'reports', label: 'Reports' },
    { id: 'chatbot', label: 'AI Assistant' }
  ];

  const technicianTabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'hours', label: 'My Hours' },
    { id: 'projects', label: 'My Projects' },
    { id: 'chatbot', label: 'AI Assistant' }
  ];

  const tabs = user?.role === 'admin' ? adminTabs : technicianTabs;

  return (
    <nav className="bg-black text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <div className="flex items-center">
              <h1 className="text-xl font-bold">JukoTechniek</h1>
              <div className="w-1 h-6 bg-red-600 ml-2"></div>
            </div>
            <div className="flex space-x-1">
              {tabs.map((tab) => (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? 'secondary' : 'ghost'}
                  onClick={() => onTabChange(tab.id)}
                  className={`${
                    activeTab === tab.id 
                      ? 'bg-red-600 text-white hover:bg-red-700' 
                      : 'text-gray-300 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  {tab.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-300">
              Welcome, {user?.fullName}
            </span>
            <Button
              variant="outline"
              onClick={logout}
              className="border-gray-600 text-gray-300 hover:bg-red-600 hover:text-white hover:border-red-600"
            >
              Logout
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
