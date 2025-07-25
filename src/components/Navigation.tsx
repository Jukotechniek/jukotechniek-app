import { useAuth } from '@/contexts/AuthContext';
import {
  BarChart3,
  Clock,
  Briefcase,
  Building2,
  DollarSign,
  CheckCircle,
  CalendarDays,
  Users,
  FileText,
  Bot,
  Menu,
  BookOpen
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

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
    { id: 'hours', label: 'Werk Uren', icon: Clock },
    { id: 'projects', label: 'Projecten', icon: Briefcase },
    { id: 'magazine', label: 'Magazijn', icon: BookOpen },
    { id: 'schedule', label: 'Agenda', icon: CalendarDays },
    { id: 'customers', label: 'Klanten', icon: Building2 },
    { id: 'billing', label: 'Tarieven', icon: DollarSign },
    { id: 'verification', label: 'Uren Verificatie', icon: CheckCircle },
    { id: 'users', label: 'Gebruikersbeheer', icon: Users },
    { id: 'reports', label: 'Rapporten', icon: FileText },
    { id: 'chat_history', label: 'Chatgeschiedenis', icon: FileText },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'chatbot', label: 'AI Assistent', icon: Bot }
  ];

  const technicianTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'hours', label: 'Mijn Uren', icon: Clock },
    { id: 'projects', label: 'Mijn Projecten', icon: Briefcase },
    { id: 'magazine', label: 'Magazijn', icon: BookOpen },
    { id: 'schedule', label: 'Agenda', icon: CalendarDays },
    { id: 'users', label: 'Mijn Account', icon: Users },
    { id: 'chatbot', label: 'AI Assistent', icon: Bot }
  ];

  const opdrachtgeverTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'projects', label: 'Projecten', icon: Briefcase },
    { id: 'schedule', label: 'Agenda', icon: CalendarDays },
    { id: 'chatbot', label: 'AI Assistent', icon: Bot }
  ];

  const tabs = isAdmin ? adminTabs : isOpdrachtgever ? opdrachtgeverTabs : technicianTabs;
  const primaryTabIds = ['dashboard', 'chatbot', 'hours', 'projects', 'magazine', 'verification', 'schedule'];
  const visibleTabs = tabs.filter(t => primaryTabIds.includes(t.id));
  const dropdownTabs = tabs.filter(t => !primaryTabIds.includes(t.id));

  const mobileQuickButtons = [
    { id: 'hours', label: 'Uren', icon: Clock },
    { id: 'projects', label: 'Project', icon: Briefcase },
    { id: 'magazine', label: 'Magazijn', icon: BookOpen },
    { id: 'chatbot', label: 'Chatbot', icon: Bot }
  ];

  return (
    <nav className="bg-white text-gray-900 shadow-lg border-b">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-12">
          <div className="flex items-center">
            {/* Logo wrapper - altijd hoogte h-12 en items centreren */}
            <div className="flex items-center h-12">
              <div className="flex items-center h-12 w-[64px] justify-center">
                <img 
                  src="/logo_WEB.png" 
                  alt="JukoTechniek" 
                  className="object-contain h-10 w-auto"
                  style={{ maxHeight: 40, maxWidth: 120 }}
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    target.style.display = 'none';
                    const nextElement = target.nextElementSibling as HTMLElement;
                    if (nextElement) {
                      nextElement.style.display = 'block';
                    }
                  }}
                />
                {/* Eventueel fallback tekstlogo */}
                <h1 className="text-xl font-bold hidden">JukoTechniek</h1>
              </div>
              {/* Hier stond het rode streepje, deze is nu verwijderd */}
            </div>
            
            <div className="hidden md:flex space-x-1 ml-8">
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
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                    }
                  >
                    <Icon size={16} />
                    <span>{tab.label}</span>
                  </Button>
                );
              })}
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-gray-700 hover:text-gray-900 hover:bg-gray-100 hidden md:block ml-2">
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

          <div className="items-center space-x-4 hidden md:flex">
            <span className="text-sm text-gray-600">Welkom, {user?.fullName || user?.username}</span>
            <Button
              variant="outline"
              onClick={logout}
              className="
                bg-red-600 text-white border-2 border-red-600 px-4 py-2 rounded-lg font-medium
                transition-colors duration-200 hover:bg-white hover:text-red-600 hover:border-red-600
              "
            >
              Uitloggen
            </Button>
          </div>

          <div className="md:hidden flex items-center justify-end flex-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-gray-700 hover:text-gray-900 hover:bg-gray-100">
                  <Menu size={22} />
                  <span className="sr-only">Menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
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
                <DropdownMenuItem
                  onSelect={logout}
                  className="text-red-600 font-semibold border-t mt-2"
                >
                  Uitloggen
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {!isOpdrachtgever && (
          <div className="md:hidden flex justify-center space-x-1 pb-2 px-1">
            {mobileQuickButtons.map(button => {
              const Icon = button.icon;
              return (
                <Button
                  key={button.id}
                  variant={activeTab === button.id ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => onTabChange(button.id)}
                  className={
                    activeTab === button.id
                      ? 'bg-red-600 text-white hover:bg-red-700 text-xs px-2'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100 text-xs px-2'
                  }
                >
                  <Icon size={14} />
                  <span className="ml-1">{button.label}</span>
                </Button>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
