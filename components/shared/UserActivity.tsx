import React, { useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useNavigationState } from '@react-navigation/native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth';
import { usePathname } from 'expo-router';

const HEARTBEAT_INTERVAL = 1000; // 1 seconds
const SESSION_TIMEOUT = 300000; // 5 minutes

const UserActivityTracker: React.FC = () => {
    const [sessionId, setSessionId] = useState<number | null>(null);
    const [lastHeartbeat, setLastHeartbeat] = useState<Date | null>(null);
    const pathname = usePathname();
    const { user } = useAuth();

    const isLearningPath = (path: string) => {
        const courseLessonPattern = /^\/learn\/[^\/]+\/courses\/[^\/]+\/lessons\/[^\/]+$/;
        const courseVideoPattern = /^\/learn\/[^\/]+\/courses\/[^\/]+\/videos\/[^\/]+$/;
        const quizPattern = /^\/learn\/[^\/]+\/quizzes\/[^\/]+\/[^\/]+$/;
        return courseLessonPattern.test(path) || quizPattern.test(path) || courseVideoPattern.test(path);
    };

    const startSession = async () => {
        const { data, error } = await supabase
            .from('user_activity')
            .insert({
                user_id: user?.id,
                session_start: new Date(),
                status: 'active',
                device_type: "mobile"
            })
            .select('id')
            .single();

        if (error) {
            console.error('Error starting session:', error);
        } else {
            setSessionId(data.id);
            setLastHeartbeat(new Date());
        }
    };

    const sendHeartbeat = async () => {
        if (sessionId) {
            const { error } = await supabase
                .from('user_activity')
                .update({
                    last_heartbeat: new Date(),
                })
                .eq('id', sessionId);

            if (error) {
                console.error('Error sending heartbeat:', error);
            } else {
                setLastHeartbeat(new Date());
            }
        }
    };

    const endSession = async () => {
        if (sessionId) {
            const { error } = await supabase
                .from('user_activity')
                .update({
                    status: 'inactive',
                })
                .eq('id', sessionId);

            if (error) {
                console.error('Error ending session:', error);
            } else {
                setSessionId(null);
            }
        }
    };

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
        const currentPath = pathname;

        if (nextAppState === 'background') {
            endSession();
        } else if (nextAppState === 'active') {
            if (isLearningPath(currentPath) && !sessionId) {
                startSession();
            }
        }
    };

    // Navigation effect
    useEffect(() => {
        const currentPath = pathname;
        
        if (isLearningPath(currentPath)) {
            if (!sessionId) {
                startSession();
            }
        } else {
            if (sessionId) {
                endSession();
            }
        }
    }, [pathname, sessionId]);

    // Heartbeat effect
    useEffect(() => {
        if (!sessionId || !isLearningPath(pathname)) {
            return;
        }

        const intervalId = setInterval(() => {
            const now = new Date().getTime();
            if (lastHeartbeat && (now - lastHeartbeat.getTime() > SESSION_TIMEOUT)) {
                endSession();
            } else {
                sendHeartbeat();
            }
        }, HEARTBEAT_INTERVAL);

        return () => {
            clearInterval(intervalId);
        };
    }, [sessionId, lastHeartbeat, pathname]);

    // App state effect
    useEffect(() => {
        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => {
            subscription.remove();
        };
    }, [sessionId, pathname]);

    // Cleanup effect
    useEffect(() => {
        return () => {
            if (sessionId) {
                endSession();
            }
        };
    }, []);

    return null;
};

export default UserActivityTracker;