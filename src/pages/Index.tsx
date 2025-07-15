import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import LoginForm from '@/components/LoginForm';
import Navigation from '@/components/Navigation';
import Dashboard from '@/components/Dashboard';
import WorkHours from '@/components/WorkHours';
import Projects from '@/components/Projects';
import CustomerManagement from '@/components/CustomerManagement';
import Billing from '@/components/Billing';
import HourComparison from '@/components/HourComparison';
import UserManagement from '@/components/UserManagement';
import Reports from '@/components/Reports';
import AIChatbot from '@/components/AIChatbot';
import WorkSchedulePage from '@/components/WorkSchedule';
import Magazine from '@/components/Magazine';
import Analytics from '@/components/Analytics';

const AppContent: React.FC = () => {
  const { isAuthenticated, loading, user } = useAuth();
  
  // Initialize activeTab from localStorage or default based on role
  const getInitialTab = () => {
    const savedTab = localStorage.getItem('activeTab');
    if (savedTab && user) {
      // Validate saved tab is allowed for current user role
      const allowedTabs = user.role === 'admin' 
        ? ['dashboard', 'hours', 'projects', 'magazine', 'schedule', 'customers', 'billing', 'verification', 'users', 'reports', 'chatbot', 'analytics']
        : user.role === 'opdrachtgever'
        ? ['dashboard', 'projects', 'schedule', 'chatbot']
        : ['dashboard', 'hours', 'projects', 'magazine', 'schedule', 'users', 'chatbot'];
      
      if (allowedTabs.includes(savedTab)) {
        return savedTab;
      }
    }
    return user?.role === 'admin' ? 'magazine' : 'dashboard';
  };
  
  const [activeTab, setActiveTab] = useState(getInitialTab());

  // Save activeTab to localStorage when it changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    localStorage.setItem('activeTab', tab);
  };

  // Set default tab based on user role when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const initialTab = getInitialTab();
      setActiveTab(initialTab);
    }
  }, [isAuthenticated, user]);

  // Fullscreen aan bij login, uit bij uitloggen
  useEffect(() => {
    let listener: (() => void) | null = null;

    if (isAuthenticated) {
      listener = () => {
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      };
      document.addEventListener('click', listener, { once: true });
    } else {
      // Bij uitloggen: exit fullscreen als het aan staat
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }

    return () => {
      if (listener) document.removeEventListener('click', listener);
    };
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading JukoTechniek...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'hours':
        return <WorkHours />;
      case 'projects':
        return <Projects />;
      case 'schedule':
        return <WorkSchedulePage />;
      case 'customers':
        return <CustomerManagement />;
      case 'billing':
        return <Billing />;
      case 'verification':
        return <HourComparison />;
      case 'users':
        return <UserManagement />;
      case 'reports':
        return <Reports />;
      case 'magazine':
        return <Magazine />;
      case 'chatbot':
        return <AIChatbot />;
      case 'analytics':
        return <Analytics />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation activeTab={activeTab} onTabChange={handleTabChange} />
      {renderContent()}
    </div>
  );
};

const Index: React.FC = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);

export default Index;
