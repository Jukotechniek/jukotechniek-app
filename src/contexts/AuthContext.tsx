
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User, AuthState, LoginCredentials } from '@/types/auth';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => void;
  signUp: (credentials: LoginCredentials & { username: string; fullName: string }) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    loading: true
  });
  
  const authStateRef = useRef(authState);
  const initializingRef = useRef(false);

  // Update ref when state changes
  useEffect(() => {
    authStateRef.current = authState;
  }, [authState]);

  const handleAuthChange = async (event: string, session: Session | null) => {
    console.log('Auth state changed:', event, session?.user?.id);
    
    // Prevent multiple simultaneous auth changes
    if (initializingRef.current && event !== 'INITIAL_SESSION') {
      console.log('Auth change blocked - already initializing');
      return;
    }

    try {
      initializingRef.current = true;

      if (session?.user) {
        // Quick authentication with basic user data
        const basicUser: User = {
          id: session.user.id,
          username: session.user.email || '',
          email: session.user.email || '',
          role: 'technician', // Default role
          fullName: session.user.user_metadata?.full_name || session.user.email || '',
          createdAt: session.user.created_at || new Date().toISOString()
        };

        // Set authenticated state immediately
        setAuthState({
          user: basicUser,
          isAuthenticated: true,
          loading: false
        });

        // Fetch complete profile in background
        setTimeout(async () => {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (profile && authStateRef.current.isAuthenticated) {
              const completeUser: User = {
                id: profile.id,
                username: profile.username || session.user.email || '',
                email: session.user.email || '',
                role: (profile.role === 'admin' || profile.role === 'technician' || profile.role === 'opdrachtgever') ? profile.role : 'technician',
                fullName: profile.full_name || session.user.user_metadata?.full_name || session.user.email || '',
                createdAt: profile.created_at || session.user.created_at || new Date().toISOString()
              };

              // Only update if still authenticated
              setAuthState(prev => prev.isAuthenticated ? {
                ...prev,
                user: completeUser
              } : prev);
            }
          } catch (error) {
            console.error('Error fetching profile in background:', error);
          }
        }, 100);

      } else {
        setAuthState({
          user: null,
          isAuthenticated: false,
          loading: false
        });
      }
    } catch (error) {
      console.error('Error in handleAuthChange:', error);
      setAuthState({
        user: null,
        isAuthenticated: false,
        loading: false
      });
    } finally {
      initializingRef.current = false;
    }
  };

  useEffect(() => {
    console.log('AuthProvider: Initializing auth');
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session?.user?.id);
      if (session) {
        handleAuthChange('INITIAL_SESSION', session);
      } else {
        setAuthState({
          user: null,
          isAuthenticated: false,
          loading: false
        });
      }
    });

    return () => {
      console.log('AuthProvider: Cleaning up subscription');
      subscription.unsubscribe();
    };
  }, []);

  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    console.log('Login attempt for:', credentials.email);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      });

      if (error) {
        console.error('Login error:', error);
        return false;
      }

      console.log('Login successful for:', data.user?.id);
      return !!data.user;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const signUp = async (credentials: LoginCredentials & { username: string; fullName: string }): Promise<boolean> => {
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
    console.log('Logging out...');
    await supabase.auth.signOut();
    setAuthState({
      user: null,
      isAuthenticated: false,
      loading: false
    });
  };

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
