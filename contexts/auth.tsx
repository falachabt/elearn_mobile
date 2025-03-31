import { createContext, useContext, useEffect, useState, useRef } from 'react'
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
    signUp: (email: string,  password: string) => Promise<void>
    verifyOtp: (email: string,  token: string, password: string, type?: string) => Promise<void>
    mutateUser: () => Promise<Account | null | undefined>
    checkStreak: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// SWR fetcher function
const fetcher = async (email: string) => {
    try {
        const {data, error} = await supabase
            .from("accounts")
            .select("*, user_xp(*), user_streaks(*)")
            .eq("email", email)
            .single();

        if (error) throw error;
        return data as Account;
    } catch (error) {
        console.error("Error fetching user data:", error);
        throw error;
    }
}

export function AuthProvider({children}: { children: React.ReactNode }) {
    // Auth state management
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const initialLoadRef = useRef(false);
    const streakCheckedRef = useRef(false);

    // User data fetching with SWR
    const {data: user, error: userError, mutate: mutateUser} = useSWR<Account | null>(
        session?.user?.email ? session.user.email : null,
        fetcher,
        {
            refreshInterval: 0,
            revalidateOnFocus: false,
            dedupingInterval: 2000,
            onSuccess: () => {
                // Successfully loaded user data, ensure loading is false
                setIsLoading(false);
            },
            onError: (error) => {
                console.error("SWR error loading user:", error);
                setIsLoading(false);
            }
        }
    );

    // User streak check function
    const checkStreak = async () => {
        try {
            if (!user?.id || streakCheckedRef.current) return;

            streakCheckedRef.current = true;

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

    // Initialize auth (only once)
    useEffect(() => {
        const initializeAuth = async () => {
            try {
                setIsLoading(true);
                const {data: {session}} = await supabase.auth.getSession();
                setSession(session);

                // If no session, we're done loading
                if (!session) {
                    setIsLoading(false);
                }

                initialLoadRef.current = true;
            } catch (error) {
                console.error("Error initializing auth:", error);
                setIsLoading(false);
                initialLoadRef.current = true;
            }
        };

        initializeAuth();

        // Listen for auth changes
        const {data: {subscription}} = supabase.auth.onAuthStateChange((_event, session) => {
            console.log("Auth state changed:", _event);
            setSession(session);

            // If signing out, ensure loading is false and reset refs
            if (!session) {
                setIsLoading(false);
                streakCheckedRef.current = false;
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Loading state management - separate from session changes
    useEffect(() => {
        if (!initialLoadRef.current) return;

        if (!session) {
            // No session = not loading
            setIsLoading(false);
        }
        else if (session && userError) {
            // Error loading user data
            console.error("Error loading user data:", userError);
            setIsLoading(false);
        }
        else if (session && user !== undefined) {
            // User data loaded
            setIsLoading(false);
        }
    }, [session, user, userError]);

    // Check streak when user data becomes available - but only once
    useEffect(() => {
        if (session && user?.id && !streakCheckedRef.current) {
            checkStreak();
        }
    }, [user?.id]);

    // Setup real-time database subscriptions - with stable dependencies
    useEffect(() => {
        if (!user?.id || !user?.email) return;

        let subscription: RealtimeChannel;

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

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [user?.id]); // Only depend on stable ID

    // Auth methods
    const signIn = async (email: string, password: string) => {
        try {
            setIsLoading(true);
            streakCheckedRef.current = false;

            console.log("Signing in...");
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                console.error("Sign in error:", error);
                setIsLoading(false);
                throw error;
            }

            console.log("Sign in successful, session:", data.session ? "exists" : "null");

            // We don't set isLoading=false here because the useEffect
            // for session/user will handle that after user data loads
        } catch (error) {
            console.error("Sign in exception:", error);
            setIsLoading(false);
            throw error;
        }
    };

    const verifyOtp = async (email : string , token: string, password: string, type: string = "signup") => {
        try {
            setIsLoading(true);

            // to check with sms
            const { error } = await supabase.auth.verifyOtp({ email , token, type: "email" });

            if(type === "signup"){
                // const { error: updateError } = await supabase.auth.updateUser({
                //     // data: { role: "student", type: "student" , roles: ["student"] }
                // });
                // if(updateError) throw updateError;
            }

            if (error) throw error;

            const { data: { session } } = await supabase.auth.getSession();

            if (session?.access_token) {
                await axios.post('https://elearn.ezadrive.com/api/mobile/auth/createAccount',
                    // await axios.post('https://elearn/api/mobile/auth/createAccount',
                    { email, password },
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
        try {
            setIsLoading(true);
            streakCheckedRef.current = false;

            try {
                await axios.post('https://elearn.ezadrive.com/api/mobile/auth/create',
                    // await axios.post('http://192.168.1.168:3000/api/mobile/auth/create',
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
                axios.isAxiosError(error) && console.log("error", error.response?.data?.error);
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
            setIsLoading(true);
            streakCheckedRef.current = false;
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            // Session will be updated by the onAuthStateChange listener
        } catch (error) {
            setIsLoading(false);
            throw error;
        }
    };

    // Provide auth context
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