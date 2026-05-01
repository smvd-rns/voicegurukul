'use client';

import { registerPushNotifications, setupForegroundMessageListener, setupNativePushListener } from '@/lib/utils/push-notifications';
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/config';
import { getUserData, onAuthStateChange } from '@/lib/supabase/auth';
import { User } from '@/types';
import { User as SupabaseUser } from '@supabase/supabase-js';

interface AuthContextType {
  user: SupabaseUser | null;
  userData: User | null;
  loading: boolean;
  refreshUserData: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  refreshUserData: async () => { },
  signOut: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Setup foreground push notification listener
  useEffect(() => {
    const unsubscribe = setupForegroundMessageListener();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Setup native push token listener
  useEffect(() => {
    if (userData) {
      const unsubscribe = setupNativePushListener(userData.id, userData.pushTokens || []);
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [userData]);


  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      return;
    }

    if (!supabase) {
      console.warn('Supabase not initialized. Auth features will not work.');
      setLoading(false);
      return;
    }

    let mounted = true;
    let subscriptionResult: ReturnType<typeof onAuthStateChange> | null = null;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return;

      if (error) {
        console.error('Error getting session:', error);
        setLoading(false);
        return;
      }

      setUser(session?.user || null);
      if (session?.user) {
        // Retry mechanism for initial load too
        let retryCount = 0;
        const maxRetries = 5;
        const retryInterval = 500;

        const fetchUserDataWithRetry = async () => {
          try {
            const data = await getUserData(session.user.id);
            if (!mounted) return;

            if (data) {
              setUserData(data);
              setLoading(false);

              // Register for push notifications once logged in
              registerPushNotifications(data.id, data.pushTokens || []);
            } else if (retryCount < maxRetries) {
              retryCount++;
              setTimeout(() => {
                if (mounted) {
                  fetchUserDataWithRetry();
                }
              }, retryInterval);
            } else {
              setUserData(null);
              setLoading(false);
            }
          } catch (error) {
            if (!mounted) return;
            console.error('Error getting user data:', error);
            if (retryCount < maxRetries) {
              retryCount++;
              setTimeout(() => {
                if (mounted) {
                  fetchUserDataWithRetry();
                }
              }, retryInterval);
            } else {
              setUserData(null);
              setLoading(false);
            }
          }
        };

        fetchUserDataWithRetry();
      } else {
        setUserData(null);
        setLoading(false);
      }
    });

    // Subscribe to auth changes
    try {
      subscriptionResult = onAuthStateChange(async (supabaseUser) => {
        if (!mounted) return;

        setUser(supabaseUser);
        if (supabaseUser) {
          // Retry mechanism to fetch userData if it's null (profile being created)
          let retryCount = 0;
          const maxRetries = 5; // Try for up to 2.5 seconds
          const retryInterval = 500; // 500ms between retries

          const fetchUserDataWithRetry = async () => {
            try {
              const userData = await getUserData(supabaseUser.id);
              if (!mounted) return;

              if (userData) {
                setUserData(userData);
                setLoading(false);

                // Register for push notifications once logged in
                registerPushNotifications(userData.id, userData.pushTokens || []);
              } else if (retryCount < maxRetries) {
                // User data not yet created, retry after a delay
                retryCount++;
                setTimeout(() => {
                  if (mounted) {
                    fetchUserDataWithRetry();
                  }
                }, retryInterval);
              } else {
                // Max retries reached, stop loading
                if (!mounted) return;
                setUserData(null);
                setLoading(false);
              }
            } catch (error) {
              if (!mounted) return;
              console.error('Error getting user data:', error);
              if (retryCount < maxRetries) {
                retryCount++;
                setTimeout(() => {
                  if (mounted) {
                    fetchUserDataWithRetry();
                  }
                }, retryInterval);
              } else {
                setUserData(null);
                setLoading(false);
              }
            }
          };

          fetchUserDataWithRetry();
        } else {
          setUserData(null);
          setLoading(false);
        }
      });
    } catch (error) {
      console.error('Error setting up auth state change listener:', error);
      setLoading(false);
    }

    return () => {
      mounted = false;
      if (subscriptionResult?.data?.subscription) {
        try {
          subscriptionResult.data.subscription.unsubscribe();
        } catch (error) {
          console.error('Error unsubscribing from auth changes:', error);
        }
      }
    };
  }, []);

  // Function to refresh user data manually
  const refreshUserData = async () => {
    if (user) {
      try {
        const data = await getUserData(user.id);
        if (data) {
          setUserData(data);
        }
      } catch (error) {
        console.error('Error refreshing user data:', error);
      }
    }
  };

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setUserData(null);
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, refreshUserData, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
