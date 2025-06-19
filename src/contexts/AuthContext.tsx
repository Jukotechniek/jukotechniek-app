
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthState, LoginCredentials } from '@/types/auth';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => void;
  signUp: (credentials: LoginCredentials & { email: string; fullName: string }) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    loading: true
  });

  useEffect(() => {
    console.log('AuthProvider: Initializing auth');
    
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          if (mounted) {
            setAuthState({
              user: null,
              isAuthenticated: false,
              loading: false
            });
          }
          return;
        }

        console.log('Initial session:', session?.user?.id || 'No session');
        
        if (mounted) {
          await handleAuthChange(session);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setAuthState({
            user: null,
            isAuthenticated: false,
            loading: false
          });
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id || 'No session');
        if (mounted) {
          await handleAuthChange(session);
        }
      }
    );

    // Initialize auth
    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleAuthChange = async (session: Session | null) => {
    if (!session?.user) {
      console.log('No session, setting unauthenticated state');
      setAuthState({
        user: null,
        isAuthenticated: false,
        loading: false
      });
      return;
    }

    try {
      console.log('Fetching profile for user:', session.user.id);
      
      // Fetch user profile with timeout
      const { data: profile, error } = await Promise.race([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 5000)
        )
      ]) as any;

      if (error) {
        console.error('Error fetching profile:', error);
        // Still authenticate with basic user data
        const basicUser: User = {
          id: session.user.id,
          username: session.user.email || '',
          email: session.user.email || '',
          role: 'technician',
          fullName: session.user.email || '',
          createdAt: new Date().toISOString()
        };

        setAuthState({
          user: basicUser,
          isAuthenticated: true,
          loading: false
        });
        return;
      }

      const user: User = {
        id: profile.id,
        username: profile.username || session.user.email || '',
        email: session.user.email || '',
        role: (profile.role === 'admin' || profile.role === 'technician') ? profile.role : 'technician',
        fullName: profile.full_name || '',
        createdAt: profile.created_at
      };

      console.log('Setting authenticated user:', user.id, user.role);
      setAuthState({
        user,
        isAuthenticated: true,
        loading: false
      });
    } catch (error) {
      console.error('Profile fetch error:', error);
      // Fallback to basic authentication
      const basicUser: User = {
        id: session.user.id,
        username: session.user.email || '',
        email: session.user.email || '',
        role: 'technician',
        fullName: session.user.email || '',
        createdAt: new Date().toISOString()
      };

      setAuthState({
        user: basicUser,
        isAuthenticated: true,
        loading: false
      });
    }
  };

  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    console.log('Login attempt for:', credentials.username);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.username.includes('@') ? credentials.username : `${credentials.username}@jukotechniek.nl`,
        password: credentials.password
      });

      if (error) {
        console.error('Login error:', error);
        return false;
      }

      return !!data.user;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const signUp = async (credentials: LoginCredentials & { email: string; fullName: string }): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          data: {
            username: credentials.username,
            full_name: credentials.fullName,
            role: 'technician'
          },
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        console.error('Signup error:', error);
        return false;
      }

      return !!data.user;
    } catch (error) {
      console.error('Signup error:', error);
      return false;
    }
  };

  const logout = async () => {
    console.log('Logging out user');
    await supabase.auth.signOut();
  };

  console.log('AuthProvider render - loading:', authState.loading, 'isAuthenticated:', authState.isAuthenticated);

  return (
    <AuthContext.Provider value={{ ...authState, login, logout, signUp }}>
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
