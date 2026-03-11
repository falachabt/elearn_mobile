import {createContext, useContext, useEffect, useState, useRef} from 'react'
import {RealtimeChannel, Session} from '@supabase/supabase-js'
import axios from 'axios'
import useSWR from 'swr'

import { useAppConfig } from './useAppConfig'

import {supabase} from '@/lib/supabase'
import {Accounts, tables, UserXp} from '@/types/type'
import { trackEvent, Events, setUserId, resetPostHogUser } from '@/utils/analytics'
import { registerForPushNotificationsAsync, setupNotifications } from '@/utils/pushNotifications'
import { posthogService } from '@/utils/posthogService'
import { logger } from '@/utils/logger'

interface UserStreak {
    id: string
    user_id: string
    current_streak: number
    max_streak: number
    last_updated: string
    next_deadline: string
}

interface UserProgramEnrollment {
    id: string
    user_id: string
    program_id: {
        concourId: string
        id: string
        isActive: boolean
        learningPathId: string
        created_at: string
        price: number
    }
    enrolled_at: string
    status: string
}

interface Account extends Accounts {
    user_xp: UserXp
    user_streaks: UserStreak
    image: { url: string }
    user_program_enrollments: UserProgramEnrollment[]
}

type AuthContextType = {
    session: Session | null
    user: Account | null
    isLoading: boolean
    signIn: (phone: string, password: string) => Promise<void>
    signOut: () => Promise<void>
    signUp: (phone: number | undefined, password: string) => Promise<void>
    verifyOtp: (phone: number, token: string, password: string, type?: string) => Promise<void>
    mutateUser: () => Promise<Account | null | undefined>
    checkStreak: () => Promise<void>
    setIsAccountCreating: (isCreating: boolean) => void
}

// Create context with unique name
const AuthProviderContext = createContext<AuthContextType | undefined>(undefined)

// SWR fetcher functions with unique names
// @ts-ignore
const getUserEnrollments = async (userId: string) => {
    const {data, error} = await supabase
        .from('user_program_enrollments')
        .select('*, program_id(*)')
        .eq('user_id', userId);

    if (error) throw error;
    return data;
}

const getUserAccountData = async (authId: string) => {
    const {data, error} = await supabase
        .from("accounts")
        .select("*, user_xp(*), user_streaks(*)")
        .eq("authId", authId)
        .single();

    if (error) throw error;
    return data;
};

// Main fetcher function with unique name
const userDataFetcher = async (authId: string) => {
    try {
        const userData = await getUserAccountData(authId);
        const enrollments = await getUserEnrollments(userData.id);

        return {
            ...userData,
            user_program_enrollments: enrollments || []
        } as unknown as Account;
    } catch (error) {
        logger.error("Error fetching user data:", error);
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
    const { getApiBaseUrl } = useAppConfig();
    const apiBaseUrl = getApiBaseUrl();

    // User data fetching with SWR
    const {data: user, error: userError, mutate: mutateUser} = useSWR<Account | null>(
        session?.user.id ? session.user.id : null,
        userDataFetcher,
        {
            refreshInterval: 60000, // Refresh every 60 seconds
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
                    logger.error("SWR error loading user:", error);
                    setIsLoading(false);
                }
            }
        }
    );

    // Helper function to wait for account data to be created
    const waitForAccountData = async (phone: number, maxRetries = 5, retryDelay = 1000) => {
        for (let i = 0; i < maxRetries; i++) {
            try {
                const {data, error} = await supabase
                    .from("accounts")
                    .select("*")
                    .eq("phone", phone)
                    .single();

                if (data) {
                    return data;
                }

                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            } catch (err) {
                if (i === maxRetries - 1) throw err;
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
        }
        throw new Error('Failed to retrieve account data after creation');
    };

    // User streak check function
    const checkStreak = async () => {
        try {
            // Make sure user and user.id are defined before proceeding
            if (!user || !user.id || streakCheckedRef.current) return;

            streakCheckedRef.current = true;

            const {data, error} = await supabase
                .rpc('check_and_update_streak', {
                    p_user_id: user.id
                });

            if (error) throw error;

            // Revalidate user data to get updated streak
            await mutateUser();

            void data;
            return;
        } catch (error) {
            logger.error('Error checking streak:', error);
            // Reset streak checked flag on error so it can be tried again
            streakCheckedRef.current = false;
        }
    };

    // Initialize auth (only once)
    useEffect(() => {
      const initializeAuth = async () => {
        try {
          setIsLoading(true);
          const {data: {session}} = await supabase.auth.getSession();
          setSession(session);

          // Set up notifications
          setupNotifications();

          // Set user ID for analytics if available
          if (session?.user?.id) {
            setUserId(session.user.id);
          }

          // If no session, we're done loading
          if (!session) {
            setIsLoading(false);
          }

          initialLoadRef.current = true;
        } catch (error) {
          logger.error("Error initializing auth:", error);
          setIsLoading(false);
          initialLoadRef.current = true;
        }
      };

      initializeAuth();

        // Listen for auth changes
        const {data: {subscription}} = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);

            // Update user ID for analytics
            if (session?.user?.id) {
                setUserId(session.user.id);
            }

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
        } else if (session && userError) {
            // Check if this is an expected error during signup
            if (isAccountCreating) {
                // This is expected during signup - stay in loading state
                return;
            }

            // Handle other errors
            logger.error("Error loading user data:", userError);
            setIsLoading(false);
        } else if (session && user !== undefined) {
            // User data loaded
            setIsLoading(false);
        }
    }, [session, user, userError, isAccountCreating]);

    // Check streak when user data becomes available - but only once
    useEffect(() => {
      // Make sure session, user, and user.id are all defined before checking streak
      if (session && user && user.id && !streakCheckedRef.current) {
        checkStreak();
      }
    }, [session, user]);

    // Identify user with PostHog when user data is loaded
    useEffect(() => {
      if (session && user && user.id) {
        // Identify user with user properties
        posthogService.identify(user.id, {
          email: user.email,
          user_type: user.type === 'admin' ? 'admin' : 'student',
          total_courses_enrolled: user.coursesenrolled?.length || 0,
          courses_completed: user.coursescompleted?.length || 0,
          total_points: user.user_xp?.total_xp || 0,
          has_payment: user.active_trx ? true : false,
        });
      }
    }, [session, user]);

    // Register for push notifications when user data becomes available
    useEffect(() => {
      const registerPushNotifications = async () => {
        // Make sure user is defined before registering
        if (session && user && user.id) {
          try {
            await registerForPushNotificationsAsync(user.id);
          } catch (error) {
            logger.error("Error registering for push notifications:", error);
          }
        }
      };

      registerPushNotifications();
    }, [session, user]);

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
            ).on('postgres_changes',
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

            const {data, error} = await supabase.auth.signInWithPassword({
                phone: phone.toString(),
                password,
            });

            if (error) {
                logger.error("Sign in error:", error);
                setIsLoading(false);
                // Track failed login
                posthogService.trackLoginFailed(error.message);
                throw error;
            }

            // Track login event
            posthogService.trackLogin('password');

            // We don't set isLoading=false here because the useEffect
            // for session/user will handle that after user data loads
        } catch (error) {
            logger.error("Sign in exception:", error);
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
            const {error} = await supabase.auth.verifyOtp({phone: phone.toString(), token, type: "sms"});

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
                    // Account creation API call
                    await axios.post(`${apiBaseUrl}/api/mobile/auth/createAccount`,
                        {phone, password},
                        {
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${session.access_token}`
                            }
                        }
                    );

                    // Wait for the account data to be available in the database
                    await waitForAccountData(phone);

                    // Force revalidation of user data
                    await mutateUser();
                } catch (apiError) {
                    logger.error('Error in account creation process:', apiError);
                    throw apiError;
                }
            }
        } catch (error) {
            logger.error('Error verifying OTP:', error);
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

            if (!phone) {
                setIsLoading(false);
                throw new Error('Phone number is required');
            }

            try {
                setIsAccountCreating(true);

                // Simulate slow connection
                await new Promise(resolve => setTimeout(resolve, 2000));

                const {data, error} = await supabase.auth.signUp({
                    phone: "+237" + phone.toString(),
                    password
                });

                // make the logic that create the account

                if (data.session) {
                    try {
                        // Account creation API call
                        await axios.post(`${apiBaseUrl}/api/mobile/auth/createAccount`,
                            // await axios.post('http://192.168.1.168:3000/api/mobile/auth/createAccount',
                            {phone, password},
                            {
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${data.session.access_token}`
                                },
                                timeout: 3000,
                            }
                        );

                        // Wait for the account data to be available in the database

                        try {
                            // Simulate slow connection
                            await new Promise(resolve => setTimeout(resolve, 2000));

                            await waitForAccountData(phone);

                        } catch (error) {
                            // Silently handle account data waiting errors
                        }

                        // Force revalidation of user data
                        await mutateUser();

                        // Track sign up event
                        posthogService.trackSignupCompleted('phone');
                    } catch (apiError) {
                        logger.error('Error in account creation process:', apiError);
                        throw apiError;
                    } finally {
                        setIsAccountCreating(false);
                        setIsLoading(false);
                    }
                }

                if (error) {
                    logger.error("Sign up error:", error);
                    setIsLoading(false);
                    throw error;
                }
            } catch (error) {
                logger.error("Sign up exception:", error);
                setIsLoading(false);
                throw error;
            }

        } catch (error) {
            logger.error('Error signing up:', error);
            setIsLoading(false);
            throw error;
        }
    };
    const signOut = async () => {
        try {
            setIsLoading(true);
            streakCheckedRef.current = false;

            // Track logout event before signing out
            posthogService.trackLogout();

            // Reset PostHog user on logout
            posthogService.reset();
            resetPostHogUser();

            const {error} = await supabase.auth.signOut();
            if (error) throw error;
            // Session will be updated by the onAuthStateChange listener
        } catch (error) {
            setIsLoading(false);
            throw error;
        }
    };

    // Provide auth context
    const value: AuthContextType = {
        user: user || null,
        session,
        isLoading,
        signIn,
        signOut,
        signUp,
        verifyOtp,
        mutateUser: async () => await mutateUser(),
        checkStreak,
        setIsAccountCreating,
    };

    return (
        <AuthProviderContext.Provider value={value}>
            {children}
        </AuthProviderContext.Provider>
    );
}

// Custom hook to use auth context
export function useAuth() {
    const context = useContext(AuthProviderContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
