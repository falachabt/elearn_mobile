import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Accounts, Courses, LearningPaths, CourseProgressSummary, tables, UserXp } from '@/types/type';
import useSWR from 'swr';
import { useAuth } from '@/contexts/auth';

interface UserStreak {
  id: string;
  user_id: string;
  current_streak: number;
  max_streak: number;
  last_updated: string;
  next_deadline: string;
}

interface Account extends Accounts {
  user_xp: UserXp;
  user_streaks: UserStreak;
}

interface EnhancedCourse extends Courses {
  current_section?: number;
  last_accessed?: Date;
  user_progress?: number;
  learning_path?: LearningPaths;
  courses_content?: { order: number };
  course_progress_summary?: CourseProgressSummary[];
}

type UserContextType = {
  user: Account | null;
  lastCourse: EnhancedCourse | null;
  toDayXp: number;
  toDayExo: number;
  toDayTime: number;
  userPrograms: LearningPaths[];
  isLoading: boolean;
  mutateUser: () => Promise<Account | null | undefined>;
  mutateLastCourse: () => void;
  mutateTodayXp: () => void;
  mutateTodayExercises: () => void;
  mutateUserPrograms: () => void;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

const fetchUserData = async (userId: string) => {
  const { data, error } = await supabase
    .from('accounts')
    .select(`
      *,
      user_xp(*),
      user_streaks(*),
      course_progress_summary(*),
      xp_history(*)
    `)
    .eq('id', userId)
    .single();

  if (error) throw error;

  return data as Account;
};

const fetchLastCourse = async (userId: string) => {
  const { data, error } = await supabase
    .from('usercourseprogress')
    .select(`
      courses (
        *,
        course_learningpath(learning_paths(*)),
        course_progress_summary!course_progress_summary_course_id_fkey(*)
      ),
      sectionid,
      lastaccessed,
      courses_content(order),
      progress
    `)
    .eq('userid', userId)
    .order('lastaccessed', { ascending: false })
    .limit(1)
    .single();

  if (error) return null;
  if (!data?.courses) return null;
  if (Array.isArray(data.courses)) return null;


  const courseData = data.courses as Courses & { course_learningpath?: { learning_paths: LearningPaths }[] };

  const enhancedCourse: EnhancedCourse = {
    ...courseData,
    current_section: data.sectionid,
    last_accessed: data.lastaccessed,
    user_progress: data.progress,
    courses_content: data.courses_content && !Array.isArray(data.courses_content) ? { order: data.courses_content.order } : { order: null },
    learning_path: courseData.course_learningpath?.[0]?.learning_paths,
  };

  return enhancedCourse;
};

const calculateTodayXP = async (userId: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('xp_history')
    .select('xp_gained')
    .eq('userid', userId)
    .gte('created_at', today.toISOString())
    .lt('created_at', new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString());

  if (error) return 0;
  return data.reduce((sum, record) => sum + (record.xp_gained || 0), 0);
};



const calculateTodayTime = async (userId: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from('user_activity')
    .select('session_start,last_heartbeat')
    .eq('user_id', userId)
    .gte('last_heartbeat', today.toISOString())
    .lt('last_heartbeat', tomorrow.toISOString());

  if (error) return 0;

  return data.reduce((sum, record) => {
    const start = new Date(record.session_start);
    const end = new Date(record.last_heartbeat);

    if (start < today) {
      start.setHours(0, 0, 0, 0);
    }

    return sum + (end.getTime() - start.getTime());
  }, 0);
};

const calculateTodayExercises = async (userId: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from('quiz_attempts')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .gte('start_time', today.toISOString())
    .lt('start_time', new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString());

  if (error) return 0;
  return count || 0;
};

const fetchUserPrograms = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_program_enrollments')
    .select(`
      concours_learningpaths (
        id,
        learningPathId,
        learning_paths (
          *,
          course_learningpath (
            courses (*)
          )
        )
      )
    `)
    .eq('user_id', userId);

  if (error) return [];

  const learningPaths = data
    ?.map(enrollment => enrollment.concours_learningpaths?.learning_paths)
    .filter((path): path is LearningPaths[] => path !== undefined && path !== null && typeof path === 'object');

  return learningPaths.flat() || [];
};

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { user: authUser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  const { data: user, mutate: mutateUser } = useSWR<Account | null>(
    authUser?.id ? authUser.id : null,
    fetchUserData,
    {
      refreshInterval: 0,
      revalidateOnFocus: false,
    }
  );

  const { data: lastCourse, mutate: mutateLastCourse } = useSWR<EnhancedCourse | null>(
    authUser?.id ? `lastCourse-${authUser.id}` : null,
    () => fetchLastCourse(authUser!.id)
  );

  const { data: toDayXp, mutate: mutateTodayXp } = useSWR<number>(
    authUser?.id ? `toDayXp-${authUser.id}` : null,
    () => calculateTodayXP(authUser!.id)
  );

  const { data: toDayTime, mutate: mutateTodayTime } = useSWR<number>(
    authUser?.id ? `toDayTime-${authUser.id}` : null,
    () => calculateTodayTime(authUser!.id)
  );

  const { data: toDayExo, mutate: mutateTodayExercises } = useSWR<number>(
    authUser?.id ? `toDayExo-${authUser.id}` : null,
    () => calculateTodayExercises(authUser!.id)
  );

  const { data: userPrograms, mutate: mutateUserPrograms } = useSWR<LearningPaths[]>(
    authUser?.id ? `userPrograms-${authUser.id}` : null,
    () => fetchUserPrograms(authUser!.id)
  );

  useEffect(() => {
    setIsLoading(!user || !lastCourse || toDayXp === undefined || toDayExo === undefined || !userPrograms);
  }, [user, lastCourse, toDayXp, toDayExo, userPrograms]);

  useEffect(() => {
    let subscription: any;

    if (authUser?.id) {
      subscription = supabase
        .channel('user_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'accounts',
            filter: `id=eq.${authUser.id}`,
          },
          () => mutateUser()
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_xp',
            filter: `userid=eq.${authUser.id}`,
          },
          () => mutateUser()
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_activity',
            filter: `user_id=eq.${authUser.id}`,
          },
          () => mutateTodayTime()
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_streaks',
            filter: `user_id=eq.${authUser.id}`,
          },
          () => mutateUser()
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'quiz_attempts',
            filter: `user_id=eq.${authUser.id}`,
          },
          async () => {
            if (authUser.id) {
              mutateTodayExercises();
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'usercourseprogress',
            filter: `userid=eq.${authUser.id}`,
          },
          async () => {
            if (authUser.id) {
              mutateLastCourse();
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'course_progress_summary',
            filter: `user_id=eq.${authUser.id}`,
          },
          async () => {
            if (authUser.id) {
              mutateLastCourse();
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'xp_history',
            filter: `userid=eq.${authUser.id}`,
          },
          async () => {
            if (authUser.id) {
              mutateTodayXp();
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_program_enrollments',
            filter: `user_id=eq.${authUser.id}`,
          },
          async () => {
            if (authUser.id) {
              mutateUserPrograms();
            }
          }
        )
        .subscribe();
    }

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [authUser?.id]);

  const value: UserContextType = {
    user: user ?? null,
    lastCourse: lastCourse ?? null,
    toDayXp: toDayXp ?? 0,
    toDayExo: toDayExo ?? 0,
    toDayTime: toDayTime ?? 0,
    userPrograms: userPrograms ?? [],
    isLoading,
    mutateUser,
    mutateLastCourse,
    mutateTodayXp,
    mutateTodayExercises,
    mutateUserPrograms,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
