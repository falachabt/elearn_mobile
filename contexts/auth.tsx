// src/contexts/auth.tsx
import { createContext, useContext, useEffect, useState } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import axios from 'axios'
import { Accounts, tables } from '@/types/type'
import { useRouter } from 'expo-router'

type AuthContextType = {
  session: Session | null
  user: Accounts | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  verifyOtp: (email: string, token: string, password: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user , setUser]=useState<Accounts | null>(null)
  const [isLoading, setIsLoading] = useState(true);

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

  useEffect(() => {
    let subscription: any;

    const fetchUser = async () => {
      try {
        console.log("email", session?.user?.email)
        const { data, error } = await supabase.from("accounts").select("*").eq("email", session?.user?.email).single();
        if(error) {
          console.error("Error fetching user:", error);
          return;
        }
        if(data) {
          setUser(data);
        }
      } catch (err) {
        console.error("Error in fetchUser:", err);
      }
    }

    if(session?.user?.email) {
      fetchUser();
      
      // Subscribe to realtime changes
      subscription = supabase
        .channel('accounts_changes')
        .on('postgres_changes', 
          {
            event: '*',
            schema: 'public',
            table: 'accounts',
            filter: `email=eq.${session.user.email}`
          }, 
          (payload) => {
            console.log('Change received!', payload)
            if (payload.new) {
              setUser(payload.new as Accounts)
            }
          }
        )
        .subscribe()
    } else {
      setUser(null);
    }

    // Cleanup subscription
    return () => {
      if (subscription) {
        supabase.removeChannel(subscription)
      }
    }
  }, [session])

  const signIn = async (email: string, password: string) => {
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    console.log("error",error)
    console.log("signInError", error)
    if (error) throw error
  }

  const verifyOtp = async (email: string, token: string, password: string, type : string = "signup") => {
    try {
      const { error, data } = await supabase.auth.verifyOtp({ email, token, type: 'email' });



      if(type == "signup"){
        const { error : updateError } = await supabase.auth.updateUser({ data : { role : "student", type : "student" }});
        if(updateError){
          throw updateError
        }
      }

      if (error) throw error

      // Get the session after successful verification
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.access_token) {
        // Set the JWT token in the default headers for future API requests
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
      // check if the email is already used
      try {
        await axios.post('http://192.168.1.168:3000/api/mobile/auth/create', 
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
        console.log(error)
        if (axios.isAxiosError(error) && error.response?.data?.error === "Email already exists in the system") {
          throw new Error('email exists');
        }
        throw error;
      }

      const { error } = await supabase.auth.signInWithOtp({
        email
      })
      if (error) throw error
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const value = {
    user,
    session,
    isLoading,
    signIn,
    signOut,
    signUp,
    verifyOtp
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
