import React from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import {
  BarChart3,
  Clock,
  Briefcase,
  Building2,
  DollarSign,
  CheckCircle,
  CalendarDays,
  Sun,
  Users,
  FileText,
  Bot,
  Menu
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from '@/components/ui/dropdown-menu';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange }) => {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isOpdrachtgever = user?.role === 'opdrachtgever';

  const adminTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'hours', label: 'Work Hours', icon: Clock },
    { id: 'projects', label: 'Projects', icon: Briefcase },
    { id: 'schedule', label: 'Schedule', icon: CalendarDays },
    { id: 'customers', label: 'Customers', icon: Building2 },
    { id: 'billing', label: 'Billing', icon: DollarSign },
    { id: 'verification', label: 'Hour Verification', icon: CheckCircle },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'chatbot', label: 'AI Assistant', icon: Bot }
  ];

  const technicianTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'hours', label: 'My Hours', icon: Clock },
    { id: 'projects', label: 'My Projects', icon: Briefcase },
    { id: 'chatbot', label: 'AI Assistant', icon: Bot }
  ];

  const opdrachtgeverTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'projects', label: 'Projects', icon: Briefcase },
    { id: 'schedule', label: 'Schedule', icon: CalendarDays },
    { id: 'chatbot', label: 'AI Assistant', icon: Bot }
  ];

  const tabs = isAdmin ? adminTabs : isOpdrachtgever ? opdrachtgeverTabs : technicianTabs;
  const primaryTabIds = ['dashboard', 'chatbot', 'hours', 'billing', 'verification', 'schedule'];
  const visibleTabs = tabs.filter(t => primaryTabIds.includes(t.id));
  const dropdownTabs = tabs.filter(t => !primaryTabIds.includes(t.id));

  return (
    <nav className="bg-black text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-12">
          <div className="flex items-center space-x-8">
            <div className="flex items-center">
              <h1 className="text-xl font-bold">JukoTechniek</h1>
              <div className="w-1 h-6 bg-red-600 ml-2"></div>
            </div>

            <div className="hidden md:flex space-x-1">
              {visibleTabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <Button
                    key={tab.id}
                    variant={activeTab === tab.id ? 'secondary' : 'ghost'}
                    onClick={() => onTabChange(tab.id)}
                    className={
                      activeTab === tab.id
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'text-gray-300 hover:text-white hover:bg-gray-800'
                    }
                  >
                    <Icon size={16} />
                    <span>{tab.label}</span>
                  </Button>
                );
              })}
            </div>

            {/* Mobile menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-gray-300 hover:text-white md:hidden">
                  <Menu size={16} />
                  <span className="sr-only">Menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="md:hidden">
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <DropdownMenuItem
                      key={tab.id}
                      onSelect={() => onTabChange(tab.id)}
                      className={activeTab === tab.id ? 'font-semibold text-red-600' : ''}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      {tab.label}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Desktop dropdown for secondary tabs */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-gray-300 hover:text-white hidden md:block">
                  <Menu size={16} />
                  <span className="sr-only">Menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="hidden md:block">
                {dropdownTabs.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <DropdownMenuItem
                      key={tab.id}
                      onSelect={() => onTabChange(tab.id)}
                      className={activeTab === tab.id ? 'font-semibold text-red-600' : ''}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      {tab.label}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-300">Welcome, {user?.fullName}</span>
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
