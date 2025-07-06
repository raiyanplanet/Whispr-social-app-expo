import { Session, User } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { getCurrentSession, onAuthStateChange, supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session with error handling
    const initializeAuth = async () => {
      try {
        const session = await getCurrentSession();
        setSession(session);
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Error getting initial session:', error);
        // Don't crash the app, just set loading to false
        setSession(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes with error handling
    let subscription: any;
    try {
      const { data: { subscription: authSubscription } } = onAuthStateChange((event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      });
      subscription = authSubscription;
    } catch (error) {
      console.error('Error setting up auth state listener:', error);
      setLoading(false);
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const signOut = async () => {
    try {
      console.log('AuthContext: Starting sign out...');
      console.log('AuthContext: Current user:', user?.id);
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('AuthContext: Supabase sign out error:', error);
        throw error;
      }
      
      console.log('AuthContext: Sign out successful');
      // The auth state change listener will automatically update the state
    } catch (error) {
      console.error('AuthContext: Error signing out:', error);
      throw error;
    }
  };

  const value = {
    user,
    session,
    loading,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 