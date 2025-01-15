// src/contexts/auth.tsx
import { createContext, useContext, useEffect, useState } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import axios from 'axios'

type AuthContextType = {
  session: Session | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  verifyOtp: (email: string, token: string, password: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user , setUser]=useState(null)
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setIsLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);


    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
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
        await axios.post('http://192.168.1.168:3000/api/mobile/auth/createAccount', 
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
