// hooks/useWeeklyRecap.ts
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth';

const RECAP_STORAGE_KEY = '@app_recap_status';

export interface WeeklyRecapData {
    xpGained: number;
    learningTimeMs: number;
    lessonsCompleted: number;
    quizzesPassed: number;
    exercisesCompleted: number;
    // currentStreak: number; // from useUserInfo
    // maxStreak: number; // from useUserInfo
    periodStart?: string;
    periodEnd?: string;
}

export const useWeeklyRecap = () => {
    const { user } = useAuth();
    const [recapData, setRecapData] = useState<WeeklyRecapData | null>(null);
    const [isRecapAvailable, setIsRecapAvailable] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const fetchRecapData = useCallback(async (periodStart: string, periodEnd: string) => {
        if (!user?.id) return;
        setIsLoading(true);

        try {
            // Fetch XP Gained
            const { data: xpData, error: xpError } = await supabase
                .from('xp_history')
                .select('xp_gained')
                .eq('userid', user.id)
                .gte('created_at', periodStart)
                .lte('created_at', periodEnd);
            if (xpError) throw xpError;
            const xpGained = xpData?.reduce((sum, r) => sum + (r.xp_gained || 0), 0) || 0;

            // Fetch Learning Time
            const { data: activityData, error: activityError } = await supabase
                .from('user_activity')
                .select('duration')
                .eq('user_id', user.id)
                .gte('last_heartbeat', periodStart) // or session_start
                .lte('last_heartbeat', periodEnd);
            if (activityError) throw activityError;
            const learningTimeMs = activityData?.reduce((sum, r) => sum + (r.duration || 0), 0) || 0;

            // Fetch Lessons Completed
            const { count: lessonsCompleted, error: lessonsError } = await supabase
                .from('usercourseprogress')
                .select('id', { count: 'exact', head: true })
                .eq('userid', user.id)
                .eq('progress', 1) // Assuming 1 means 100%
                .gte('lastaccessed', periodStart)
                .lte('lastaccessed', periodEnd);
            if (lessonsError) throw lessonsError;

            // Fetch Quizzes Passed
            const { count: quizzesPassed, error: quizzesError } = await supabase
                .from('quiz_attempts')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('status', 'completed')
                .gte('score', 70) // Assuming 70% is a pass
                .gte('end_time', periodStart)
                .lte('end_time', periodEnd);
            if (quizzesError) throw quizzesError;

            // Fetch Exercises Completed (assuming a similar table structure or logic)
            // This is a placeholder, adjust based on your 'exercices_complete' table
            const { count: exercisesCompleted, error: exercisesError } = await supabase
                .from('exercices_complete') // Assuming this table exists
                .select('id', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('is_completed', true)
                .gte('completed_at', periodStart) // Assuming 'completed_at' field
                .lte('completed_at', periodEnd);
            if (exercisesError) console.warn("Exercise completion fetch error (adjust if table differs):", exercisesError);


            setRecapData({
                xpGained,
                learningTimeMs,
                lessonsCompleted: lessonsCompleted || 0,
                quizzesPassed: quizzesPassed || 0,
                exercisesCompleted: exercisesCompleted || 0,
                periodStart,
                periodEnd,
            });
            setIsRecapAvailable(true);

        } catch (error) {
            console.error("Error fetching weekly recap data:", error);
            setRecapData(null);
        } finally {
            setIsLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        const checkRecapStatus = async () => {
            const recapStatusStr = await AsyncStorage.getItem(RECAP_STORAGE_KEY);
            if (recapStatusStr) {
                const status = JSON.parse(recapStatusStr);
                if (status.available && status.periodStart && status.periodEnd) {
                    fetchRecapData(status.periodStart, status.periodEnd);
                } else {
                    setIsRecapAvailable(false);
                    setRecapData(null);
                }
            }
        };
        checkRecapStatus();
    }, [fetchRecapData]);

    const markRecapAsSeen = async () => {
        const recapStatusStr = await AsyncStorage.getItem(RECAP_STORAGE_KEY);
        if (recapStatusStr) {
            const status = JSON.parse(recapStatusStr);
            await AsyncStorage.setItem(RECAP_STORAGE_KEY, JSON.stringify({ ...status, available: false }));
            setIsRecapAvailable(false);
            setRecapData(null);
        }
    };

    return { recapData, isRecapAvailable, isLoading, markRecapAsSeen, refetch: fetchRecapData };
};