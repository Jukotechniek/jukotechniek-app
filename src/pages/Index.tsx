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
import VacationRequests from '@/components/VacationRequests';
import WorkSchedulePage from '@/components/WorkSchedule';

const AppContent: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

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
      case 'vacation':
        return <VacationRequests />;
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

const Index: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default Index;
