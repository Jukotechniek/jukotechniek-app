
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
    let isMounted = true;

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          if (isMounted) {
            setAuthState({
              user: null,
              isAuthenticated: false,
              loading: false
            });
          }
          return;
        }

        if (session?.user && isMounted) {
          await handleSession(session);
        } else if (isMounted) {
          setAuthState({
            user: null,
            isAuthenticated: false,
            loading: false
          });
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (isMounted) {
          setAuthState({
            user: null,
            isAuthenticated: false,
            loading: false
          });
        }
      }
    };

    const handleSession = async (session: Session | null) => {
      if (!isMounted) return;

      if (session?.user) {
        try {
          // Fetch user profile from our profiles table
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (error) {
            console.error('Error fetching profile:', error);
            if (isMounted) {
              setAuthState({
                user: null,
                isAuthenticated: false,
                loading: false
              });
            }
            return;
          }

          if (profile && isMounted) {
            const user: User = {
              id: profile.id,
              username: profile.username || session.user.email || '',
              email: session.user.email || '',
              role: (profile.role === 'admin' || profile.role === 'technician') ? profile.role : 'technician',
              fullName: profile.full_name || '',
              createdAt: profile.created_at
            };

            setAuthState({
              user,
              isAuthenticated: true,
              loading: false
            });
          } else if (isMounted) {
            setAuthState({
              user: null,
              isAuthenticated: false,
              loading: false
            });
          }
        } catch (error) {
          console.error('Profile fetch error:', error);
          if (isMounted) {
            setAuthState({
              user: null,
              isAuthenticated: false,
              loading: false
            });
          }
        }
      } else if (isMounted) {
        setAuthState({
          user: null,
          isAuthenticated: false,
          loading: false
        });
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session);
        await handleSession(session);
      }
    );

    // Get initial session
    getInitialSession();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    console.log('Login attempt for:', credentials.username);
    
    try {
      // Try to sign in with email/password first
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
