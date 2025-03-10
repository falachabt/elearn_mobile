import { createContext, useContext, useEffect, useState } from 'react'
import { RealtimeChannel, Session} from '@supabase/supabase-js'
import {supabase} from '@/lib/supabase'
import axios from 'axios'
import {Accounts, tables, UserXp} from '@/types/type'
import useSWR from 'swr'

interface UserStreak {
  id: string
  user_id: string
  current_streak: number
  max_streak: number
  last_updated: string
  next_deadline: string
}

interface Account extends Accounts {
  user_xp: UserXp
  user_streaks: UserStreak
  image: { url: string }
}

type AuthContextType = {
  session: Session | null
  user: Account | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  verifyOtp: (email: string, token: string, password: string, type?: string) => Promise<void>
  mutateUser: () => Promise<Account | null | undefined>
  checkStreak: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// SWR fetcher function
const fetcher = async (email: string) => {
  const {data, error} = await supabase
      .from("accounts")
      .select("*, user_xp(*), user_streaks(*)")
      .eq("email", email)
      .single();

  if (error) throw error;
  return data as Account;
}

export function AuthProvider({children}: { children: React.ReactNode }) {
  // Step 1: Auth state management
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Step 2: User data fetching with SWR
  const {data: user, error, mutate: mutateUser} = useSWR<Account | null>(
      session?.user?.email ? session.user.email : null,
      fetcher,
      {
        refreshInterval: 0,
        revalidateOnFocus: false,
        dedupingInterval: 2000,
        // No loading callbacks to avoid state conflicts
      }
  );

  // Step 3: User streak check function
  const checkStreak = async () => {
    try {
      if (!user?.id) return;

      const {data, error} = await supabase
          .rpc('check_and_update_streak', {
            p_user_id: user.id
          });

      if (error) throw error;

      // Revalidate user data to get updated streak
      await mutateUser();

      return data;
    } catch (error) {
      console.error('Error checking streak:', error);
    }
  };

  // Step 4: Initialize and listen for session changes
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({data: {session}}) => {
      setSession(session);
    });

    // Listen for auth changes
    const {data: {subscription}} = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Step 5: Carefully manage loading state based on auth and data fetch status
  useEffect(() => {
    if (session === null) {
      // We don't know session status yet - loading
      setIsLoading(true);
    } else if (!session) {
      // Definitely logged out - not loading
      setIsLoading(false);
    } else if (session && user !== undefined) {
      // We have session AND we finished the user data fetch (even if user is null)
      setIsLoading(false);
    } else {
      // We have session but still waiting for user data
      setIsLoading(true);
    }
  }, [session, user]);

  // Step 6: Check streak when user data becomes available
  useEffect(() => {
    if (session && user?.id) {
      checkStreak();
    }
  }, [user?.id]);

  // Step 7: Setup real-time database subscriptions
  useEffect(() => {
    let subscription: RealtimeChannel;

    if(user?.id && user?.email) {
      // Create a single subscription with a stable channel name
      subscription = supabase
          .channel(`user_${user.id}_updates`)
          .on('postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'accounts',
                filter: `email=eq.${user.email}`
              },
              () => {
                // Just mutate data, don't set loading state
                mutateUser();
              }
          )
          .on('postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'user_xp',
                filter: `userid=eq.${user.id}`
              },
              () => {
                mutateUser();
              }
          )
          .on('postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'user_streaks',
                filter: `user_id=eq.${user.id}`
              },
              () => {
                mutateUser();
              }
          )
          .subscribe();
    }

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [user?.id]); // Only depend on stable ID

  // Step 8: Auth methods
  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      // Session change will update loading state
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const verifyOtp = async (email: string, token: string, password: string, type: string = "signup") => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });

      if(type === "signup"){
        const { error: updateError } = await supabase.auth.updateUser({
          data: { role: "student", type: "student" , roles: ["student"] }
        });
        if(updateError) throw updateError;
      }

      if (error) throw error;

      const { data: { session } } = await supabase.auth.getSession();

      if (session?.access_token) {
        await axios.post('https://elearn.ezadrive.com/api/mobile/auth/createAccount',
            { email },
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
              }
            }
        );
      }

    } catch (error) {
      console.error('Error verifying OTP:', error);
      setIsLoading(false);
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      try {
        await axios.post('https://elearn.ezadrive.com/api/mobile/auth/create',
            {
              email,
              password
            },
            {
              headers: {
                'Content-Type': 'application/json'
              }
            }
        );
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.data?.error === "Email already exists in the system") {
          setIsLoading(false);
          throw new Error('email exists');
        }
      }

      const { error } = await supabase.auth.signInWithOtp({
        email
      });
      if (error) {
        setIsLoading(false);
        throw error;
      }
    } catch (error) {
      console.error('Error signing up:', error);
      setIsLoading(false);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      throw error;
    }
  };

  // Step 9: Provide auth context
  const value = {
    user: user || null,
    session,
    isLoading,
    signIn,
    signOut,
    signUp,
    verifyOtp,
    mutateUser,
    checkStreak
  };

  return (
      <AuthContext.Provider value={value}>
        {children}
      </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}