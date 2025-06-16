
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthState, LoginCredentials } from '@/types/auth';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for demo
const mockUsers: User[] = [
  {
    id: '1',
    username: 'admin',
    email: 'admin@jukotechniek.nl',
    role: 'admin',
    fullName: 'Admin User',
    createdAt: '2024-01-01'
  },
  {
    id: '2',
    username: 'tech1',
    email: 'jan@jukotechniek.nl',
    role: 'technician',
    fullName: 'Jan de Vries',
    createdAt: '2024-01-01'
  },
  {
    id: '3',
    username: 'tech2',
    email: 'pieter@jukotechniek.nl',
    role: 'technician',
    fullName: 'Pieter Jansen',
    createdAt: '2024-01-01'
  }
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    loading: true
  });

  useEffect(() => {
    // Check for stored auth on mount
    const storedAuth = localStorage.getItem('juko_auth');
    if (storedAuth) {
      const user = JSON.parse(storedAuth);
      setAuthState({
        user,
        isAuthenticated: true,
        loading: false
      });
    } else {
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    console.log('Login attempt for:', credentials.username);
    
    // Mock authentication
    const user = mockUsers.find(u => 
      u.username === credentials.username && 
      (credentials.password === 'admin123' || credentials.password === 'tech123')
    );

    if (user) {
      setAuthState({
        user,
        isAuthenticated: true,
        loading: false
      });
      localStorage.setItem('juko_auth', JSON.stringify(user));
      return true;
    }
    return false;
  };

  const logout = () => {
    setAuthState({
      user: null,
      isAuthenticated: false,
      loading: false
    });
    localStorage.removeItem('juko_auth');
  };

  return (
    <AuthContext.Provider value={{ ...authState, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
