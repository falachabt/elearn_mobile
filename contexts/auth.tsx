import { createContext, useContext, useEffect, useState } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import axios from 'axios'
import { Accounts, tables, UserXp } from '@/types/type'
import { useRouter } from 'expo-router'
import useSWR, { mutate } from 'swr'

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
  const { data, error } = await supabase
    .from("accounts")
    .select("*, user_xp(*), user_streaks(*)")
    .eq("email", email)
    .single();
  
  if (error) throw error;
  return data as Account;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Use SWR for user data
  const { data: user, error, mutate: mutateUser } = useSWR<Account | null>(
    session?.user?.email ? session.user.email : null,
    fetcher,
    {
      refreshInterval: 0,
      revalidateOnFocus: false,
    }
  );
  


  const checkStreak = async () => {
    try {
      if (!user?.id) return;

      const { data, error } = await supabase
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

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setIsLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async(_event, session) => {
      setSession(session);
    })

    return () => subscription.unsubscribe()
  }, [])

  // Effect to check streak on app open/session change
  useEffect(() => {
    if (session && user?.id) {
      checkStreak();
    }
  }, [session, user?.id]);

  useEffect(() => {
    let subscription: any;

    if(user?.email) {
      // Subscribe to realtime changes
      subscription = supabase
        .channel('any_channel_name')
        .on('postgres_changes', 
          {
            event: '*',
            schema: 'public',
            table: 'accounts',
            filter: `email=eq.${user.email}`
          }, 
          () => {
            mutateUser()
          }
        )
        .on('postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_xp',
            filter: `userid=eq.${user?.id}`
          },
          () => {
            mutateUser()
          }
        )
        .on('postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_streaks',
            filter: `user_id=eq.${user?.id}`
          },
          () => {
            mutateUser()
          }
        )
        .subscribe()
    }

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription)
      }
    }
  }, [session, user?.id])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
  }

  const verifyOtp = async (email: string, token: string, password: string, type: string = "signup") => {
    try {
      const { error, data } = await supabase.auth.verifyOtp({ email, token, type: 'email' });

      if(type === "signup"){
        const { error: updateError } = await supabase.auth.updateUser({ 
          data: { role: "student", type: "student" }
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
      throw error;
    }
  }

  const signUp = async (email: string, password: string) => {
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
          throw new Error('email exists');
        }
        throw error;
      }

      const { error } = await supabase.auth.signInWithOtp({
        email
      })
      if (error) throw error;
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error;
    mutate(null);
  }

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
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}