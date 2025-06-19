
import React, { useState } from 'react';
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
import TravelExpenseManagement from '@/components/TravelExpenseManagement';

const AppContent = () => {
  const { isAuthenticated, loading, user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  console.log('AppContent render - loading:', loading, 'isAuthenticated:', isAuthenticated, 'user:', user?.id);

  // Force timeout after 3 seconds of loading
  React.useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        console.log('Loading timeout - forcing to show login');
        // This will force a re-render and should break the loading loop
        window.location.reload();
      }, 3000);
      
      return () => clearTimeout(timeout);
    }
  }, [loading]);

  if (loading) {
    console.log('Showing loading screen');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading JukoTechniek...</p>
          <p className="text-xs text-gray-400 mt-2">If this takes too long, please refresh the page</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('Showing login form');
    return <LoginForm />;
  }

  console.log('Showing authenticated app with activeTab:', activeTab);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'hours':
        return <WorkHours />;
      case 'projects':
        return <Projects />;
      case 'customers':
        return <CustomerManagement />;
      case 'billing':
        return <Billing />;
      case 'travel':
        return <TravelExpenseManagement />;
      case 'verification':
        return <HourComparison />;
      case 'users':
        return <UserManagement />;
      case 'reports':
        return <Reports />;
      case 'chatbot':
        return <AIChatbot />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
      {renderContent()}
    </div>
  );
};

const Index = () => {
  console.log('Index component render');
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default Index;
