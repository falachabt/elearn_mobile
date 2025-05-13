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
    user_program_enrollments: { id : string}[]
}

type AuthContextType = {
    session: Session | null
    user: Account | null
    isLoading: boolean
    signIn: (phone: string, password: string) => Promise<void>
    signOut: () => Promise<void>
    signUp: (phone: number | undefined, password: string) => Promise<void>
    verifyOtp: (phone: number,  token: string, password: string, type?: string) => Promise<void>
    mutateUser: () => Promise<Account | null | undefined>
    checkStreak: () => Promise<void>
    setIsAccountCreating: (isCreating: boolean) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// SWR fetcher function
const fetcher = async (authId: string) => {
    try {
        const {data, error} = await supabase
            .from("accounts")
            .select("*, user_xp(*), user_streaks(*), user_program_enrollments(*)")
            .eq("authId", authId)
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
    const [isAccountCreating, setIsAccountCreating] = useState(false);
    const initialLoadRef = useRef(false);
    const streakCheckedRef = useRef(false);

    // User data fetching with SWR
    const {data: user, error: userError, mutate: mutateUser} = useSWR<Account | null>(
        session?.user.id ? session.user.id : null,
        fetcher,
        {
            refreshInterval: 0,
            revalidateOnFocus: false,
            dedupingInterval: 2000,
            onSuccess: () => {
                // Successfully loaded user data, ensure loading is false if not creating account
                if (!isAccountCreating) {
                    setIsLoading(false);
                }
            },
            onError: (error) => {
                // Don't set loading to false if we're still creating an account
                if (!isAccountCreating) {
                    console.error("SWR error loading user:", error);
                    setIsLoading(false);
                }
            }
        }
    );

    // Helper function to wait for account data to be created
    const waitForAccountData = async (phone: number, maxRetries = 5, retryDelay = 1000) => {
        for (let i = 0; i < maxRetries; i++) {
            try {
                const { data, error } = await supabase
                    .from("accounts")
                    .select("*")
                    .eq("phone", phone)
                    .single();

                if (data) {
                    return data;
                }

                console.log(`Account data not available yet, retry ${i+1}/${maxRetries}`);
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            } catch (err) {
                console.log(`Error checking account data, retry ${i+1}/${maxRetries}`, err);
                if (i === maxRetries - 1) throw err;
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
        }
        throw new Error('Failed to retrieve account data after creation');
    };

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
                setIsAccountCreating(false);
                streakCheckedRef.current = false;
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Loading state management - separate from session changes
    useEffect(() => {
        if (!initialLoadRef.current) return;

        // If account creation is in progress, stay in loading state
        if (isAccountCreating) {
            return;
        }

        if (!session) {
            // No session = not loading
            setIsLoading(false);
        }
        else if (session && userError) {
            // Check if this is an expected error during signup
            if (isAccountCreating) {
                // This is expected during signup - stay in loading state
                return;
            }

            // Handle other errors
            console.error("Error loading user data:", userError);
            setIsLoading(false);
        }
        else if (session && user !== undefined) {
            // User data loaded
            setIsLoading(false);
        }
    }, [session, user, userError, isAccountCreating]);

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
                    filter: `authId=eq.${user.authId}`
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
            ) .on('postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'user_program_enrollments',
                    filter: `user_id=eq.${user.id}`
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
    const signIn = async (phone: string, password: string) => {
        try {
            setIsLoading(true);
            streakCheckedRef.current = false;

            console.log("Signing in...");
            const { data, error } = await supabase.auth.signInWithPassword({
                phone: phone.toString(),
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

    const verifyOtp = async (phone: number, token: string, password: string, type: string = "signup") => {
        try {
            setIsLoading(true);

            // Set account creation flag if this is a signup
            if (type === "signup") {
                setIsAccountCreating(true);
            }

            // Verify OTP
            const {error} = await supabase.auth.verifyOtp({phone : phone.toString(), token, type: "sms"});

            if (error) {
                throw error;
            }

            // Get the session after verification
            const {data: {session}} = await supabase.auth.getSession();

            if (!session?.access_token) {
                throw new Error('Session not created after OTP verification');
            }

            // For signup flow, create the account
            if (type === "signup" && session?.access_token) {
                try {
                    console.log("Creating account...");
                    // Account creation API call
                    await axios.post('https://elearn.ezadrive.com/api/mobile/auth/createAccount',
                        {phone, password},
                        {
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${session.access_token}`
                            }
                        }
                    );

                    console.log("Account creation API call successful, waiting for database...");

                    // Wait for the account data to be available in the database
                    await waitForAccountData(phone);

                    // Force revalidation of user data
                    await mutateUser();

                    console.log("Account created and data loaded successfully");
                } catch (apiError) {
                    console.error('Error in account creation process:', apiError);
                    throw apiError;
                }
            }
        } catch (error) {
            console.error('Error verifying OTP:', error);
            throw error;
        } finally {
            // Clear the account creation flag
            setIsAccountCreating(false);

            // If this is not signup, we can set loading to false here
            if (type !== "signup") {
                setIsLoading(false);
            }
            // For signup, loading state will be managed by the useEffect when user data loads
        }
    };

    const signUp = async (phone: number | undefined, password: string) => {
        try {
            setIsLoading(true);
            streakCheckedRef.current = false;

            if(!phone) {
                setIsLoading(false);
                throw new Error('Phone number is required');
            }

            try {
                setIsAccountCreating(true);
                const {data, error} = await supabase.auth.signUp({
                    phone: "+237"+ phone.toString(),
                    password
                });

                // make the logic that create the account

                if (data.session) {
                    console.log("Sign up successful, session:", data.session);
                    try {
                        console.log("Creating account...");
                        // Account creation API call
                        await axios.post('https://elearn.ezadrive.com/api/mobile/auth/createAccount',
                        // await axios.post('http://192.168.1.168:3000/api/mobile/auth/createAccount',
                            { phone, password },
                            {
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${data.session.access_token}`
                                },
                                timeout : 1500,
                            }
                        );

                        console.log("Account creation API call successful, waiting for database...");

                        // Wait for the account data to be available in the database
                        await waitForAccountData(phone);

                        // Force revalidation of user data
                        await mutateUser();

                        console.log("Account created and data loaded successfully");
                    } catch (apiError) {
                        console.error('Error in account creation process:', apiError);
                        throw apiError;
                    } finally {
                        setIsAccountCreating(false);
                        setIsLoading(false);
                    }
                } else {
                    console.log("Sign up successful, no session");
                }




                if (error) {
                    console.error("Sign up error:", error);
                    setIsLoading(false);
                    throw error;
                }
            } catch (error) {
                console.error("Sign up exception:", error);
                setIsLoading(false);
                throw error;
            }



            // try {
            //     await axios.post('https://elearn.ezadrive.com/api/mobile/auth/create',
            //         {
            //             email,
            //             password
            //         },
            //         {
            //             headers: {
            //                 'Content-Type': 'application/json'
            //             }
            //         }
            //     );
            // } catch (error) {
            //     axios.isAxiosError(error) && console.log("error", error.response?.data?.error);
            //     if (axios.isAxiosError(error) && error.response?.data?.error === "Email already exists in the system") {
            //         setIsLoading(false);
            //         throw new Error('email exists');
            //     }
            // }
            //
            // const { error } = await supabase.auth.signInWithOtp({
            //     email
            // });
            // if (error) {
            //     setIsLoading(false);
            //     throw error;
            // }
            //

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
        checkStreak,
        setIsAccountCreating,
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