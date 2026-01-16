import { createContext, useContext, useEffect, useState } from "react";
import useSWR from "swr";

import { supabase } from "@/lib/supabase";
import {
  Accounts,
  Courses,
  LearningPaths,
  CourseProgressSummary,
  UserXp,
} from "@/types/type";
import { useAuth } from "@/contexts/auth";
import { useAppConfig } from "@/contexts/useAppConfig";
import { ProgramPaymentService } from "@/services/program-payment.service";
import { logger } from "@/utils/logger";

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
  generousWeekLearningPathId: string | null;
  userPrograms: LearningPaths[];
  isLoading: boolean;
  mutateUser: () => Promise<Account | null | undefined>;
  mutateLastCourse: () => void;
  mutateTodayXp: () => void;
  mutateTodayExercises: () => void;
  mutateUserPrograms: () => Promise<LearningPaths[] | undefined>;
  isLearningPathEnrolled: (learningPathId: string) => boolean;
  isSecondaryProgramEnrolled: (programId: string) => boolean;
  getProgramAccessStatus: (learningPathId: string) => ProgramAccessStatus;
  mutateProgramAccessMap: () => Promise<ProgramAccessMap | undefined>;
};

type ProgramAccessStatus = {
  hasAccess: boolean;
  isExpired: boolean;
  expiryDate?: string;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

const fetchUserData = async (userId: string) => {
  const { data, error } = await supabase
    .from("accounts")
    .select(
      `
      *,
      user_xp(*),
      user_streaks(*),
      course_progress_summary(*),
      xp_history(*)
    `
    )
    .eq("id", userId)
    .single();

  if (error) throw error;

  return data as Account;
};

const fetchLastCourse = async (userId: string) => {
  const { data, error } = await supabase
    .from("usercourseprogress")
    .select(
      `
      courses (
        *,
        course_learningpath(learning_paths(id)),
        course_progress_summary!course_progress_summary_course_id_fkey(*)
      ),
      sectionid,
      lastaccessed,
      courses_content(order),
      progress
    `
    )
    .eq("userid", userId)
    .order("lastaccessed", { ascending: false })
    .limit(1)
    .single();

  if (error) return null;
  if (!data?.courses) return null;
  if (Array.isArray(data.courses)) return null;

  const courseData = data.courses as Courses & {
    course_learningpath?: { learning_paths: LearningPaths }[];
  };

  const enhancedCourse: EnhancedCourse = {
    ...courseData,
    current_section: data.sectionid,
    last_accessed: data.lastaccessed,
    user_progress: data.progress,
    courses_content:
      data.courses_content && !Array.isArray(data.courses_content)
        ? { order: data.courses_content.order }
        : { order: null },
    learning_path: courseData.course_learningpath?.[0]?.learning_paths,
  };

  return enhancedCourse;
};

const calculateTodayXP = async (userId: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("xp_history")
    .select("xp_gained")
    .eq("userid", userId)
    .gte("created_at", today.toISOString())
    .lt(
      "created_at",
      new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString()
    );

  if (error) return 0;
  return data.reduce((sum, record) => sum + (record.xp_gained || 0), 0);
};

const calculateTodayTime = async (userId: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from("user_activity")
    .select("session_start,last_heartbeat")
    .eq("user_id", userId)
    .gte("last_heartbeat", today.toISOString())
    .lt("last_heartbeat", tomorrow.toISOString());

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
    .from("quiz_attempts")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .gte("start_time", today.toISOString())
    .lt(
      "start_time",
      new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString()
    );

  if (error) return 0;
  return count || 0;
};

const fetchUserPrograms = async (userId: string) => {
  const { data, error } = await supabase
    .from("user_program_enrollments")
    .select(
      `
      concours_learningpaths (
        id,
        learningPathId,
        learning_paths (
          id,
          title,
          description,
          image,
          duration,
          course_count,
          quiz_count,
          total_duration,
          status,
          end_at,
          groups
        )
      )
    `
    )
    .eq("user_id", userId);

  if (error) {
    logger.error('[UserContext] Error fetching user programs:', error);
    return [];
  }

  // Correction : on retourne un tableau d'objets { ...learningPath, concours_learningpaths }
  const learningPaths = data
    ?.map((enrollment) => {
      const concoursLearningPath = enrollment.concours_learningpaths;
      const learningPath = concoursLearningPath?.learning_paths;
      // On fusionne les propriétés pour garder la référence au concours_learningpaths
      if (learningPath && typeof learningPath === "object") {
        // Si learningPath est un tableau, on mappe chaque élément
        if (Array.isArray(learningPath)) {
          return learningPath.map((lp) => ({
            ...lp,
            concours_learningpaths: concoursLearningPath,
          }));
        } else {
          // Sinon, on retourne l'objet fusionné
          return [
            {
              ...learningPath,
              concours_learningpaths: concoursLearningPath,
            },
          ];
        }
      }
      return [];
    })
    .flat();

  return learningPaths || [];
};

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { user: authUser } = useAuth();
  const { isGenerousWeekActive } = useAppConfig();
  const [isLoading, setIsLoading] = useState(true);

  // Ajout : déclaration et initialisation de generousWeekLearningPathId
  const generousWeekLearningPathId = null;

  const { data: user, mutate: mutateUser } = useSWR<Account | null>(
    authUser?.id ? authUser.id : null,
    fetchUserData,
    {
      refreshInterval: 0,
      revalidateOnFocus: false,
    }
  );

  const { data: lastCourse, mutate: mutateLastCourse } =
    useSWR<EnhancedCourse | null>(
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

  const { data: userPrograms, mutate: mutateUserPrograms } = useSWR<
    LearningPaths[]
  >(
    authUser?.id ? `userProgramsEnrollments-${authUser.id}` : null, 
    () => fetchUserPrograms(authUser!.id),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 1000, // Allow revalidation every second
      onSuccess: (data) => {
        logger.log('[UserContext] User programs fetched:', data?.length || 0, 'programs');
      }
    }
  );

  // Récupère tous les programIds de l'utilisateur
  const programIds =
    userPrograms
      ?.map((p) => p?.concours_learningpaths?.id)
      .filter((id): id is string => !!id) || [];

  // Mapping d'accès aux programmes via SWR
  const { data: programAccessMap, mutate: mutateProgramAccessMap } = useSWR<
    Record<string, ProgramAccessStatus>
  >(
    programIds.length > 0 ? `program-access-map-${programIds.join(",")}` : null,
    async () => {
      const accessMap: Record<string, ProgramAccessStatus> = {};
      for (const programId of programIds) {
        if (!programId) continue;
        const payment = await ProgramPaymentService.getLatestPayment(programId);
        if (!payment) {
          accessMap[programId] = { hasAccess: false, isExpired: false };
        } else {
          const now = new Date();
          const expiryDate = new Date(payment.expiry_date);
          const isExpired = now > expiryDate;
          accessMap[programId] = {
            hasAccess: !isExpired,
            isExpired,
            expiryDate: payment.expiry_date,
          };
        }
      }
      return accessMap;
    },
    { 
      revalidateOnFocus: true, 
      revalidateOnReconnect: true,
      dedupingInterval: 1000, // Allow revalidation every second
      onSuccess: (data) => {
        logger.log('[UserContext] Program access map updated:', Object.keys(data || {}).length, 'programs');
      }
    }
  );

  // Nouvelle fonction utilitaire pour obtenir le statut d'accès d'un programme
  const getProgramAccessStatus = (
    learningPathId: string
  ): ProgramAccessStatus => {
    const userProgram = userPrograms?.find(
      (program) => program.id === learningPathId
    );
    const programId = userProgram?.concours_learningpaths?.id;
    if (!programId || !programAccessMap) {
      return { hasAccess: false, isExpired: false };
    }
    return (
      programAccessMap[programId] || { hasAccess: false, isExpired: false }
    );
  };

  // Nouvelle version de isLearningPathEnrolled
  const isLearningPathEnrolled = (learningPathId: string) => {
    logger.log('[UserContext] Checking enrollment for learningPathId:', learningPathId);
    logger.log('[UserContext] Available userPrograms:', userPrograms?.map(p => ({ id: p.id, title: p.title })));
    
    const userProgram = userPrograms?.find(
      (program) => program.id === learningPathId
    );
    
    logger.log('[UserContext] Found userProgram:', userProgram ? 'YES' : 'NO');
    
    if (!userProgram) {
      if (!isGenerousWeekActive()) return false;
      if (
        generousWeekLearningPathId === learningPathId &&
        user?.metadata?.generousWeek
      ) {
        const generousWeek = user.metadata.generousWeek as {
          programId: number;
          selectedAt: string;
          duration: number;
        };
        const selectedAt = new Date(generousWeek.selectedAt);
        const durationInMs = generousWeek.duration * 24 * 60 * 60 * 1000;
        if (Date.now() < selectedAt.getTime() + durationInMs) {
          return true;
        }
      }
      return false;
    }
    
    // CORRECTION: Si le programme est trouvé dans userPrograms, il est inscrit
    // On vérifie le status d'accès (expiration) seulement s'il est disponible dans le map
    const programId = userProgram?.concours_learningpaths?.id;
    
    // Si programAccessMap n'a pas encore été chargé ou ne contient pas ce programme
    // mais que le programme existe dans userPrograms, on considère l'utilisateur comme inscrit
    if (!programAccessMap || !programId || !(programId in programAccessMap)) {
      logger.log('[UserContext] Program found in userPrograms but not in accessMap yet - returning TRUE');
      return true; // Le programme existe dans les inscriptions, donc l'utilisateur est inscrit
    }
    
    // Sinon, on vérifie le statut d'accès (expiration)
    const status = getProgramAccessStatus(learningPathId);
    return status.hasAccess;
  };

  // Check if user is enrolled in a secondary program
  const isSecondaryProgramEnrolled = (programId: string) => {
    return programId == programId; // user do not pay for secondary courses for now 
  };

  useEffect(() => {
    setIsLoading(
      !user ||
        !lastCourse ||
        toDayXp === undefined ||
        toDayExo === undefined ||
        !userPrograms
    );
  }, [user, lastCourse, toDayXp, toDayExo, userPrograms]);

  useEffect(() => {
    let subscription: ReturnType<typeof supabase.channel>;

    if (authUser?.id) {
      subscription = supabase
        .channel("user_changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "accounts",
            filter: `id=eq.${authUser.id}`,
          },
          () => mutateUser()
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "user_xp",
            filter: `userid=eq.${authUser.id}`,
          },
          () => mutateUser()
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "user_activity",
            filter: `user_id=eq.${authUser.id}`,
          },
          () => mutateTodayTime()
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "user_streaks",
            filter: `user_id=eq.${authUser.id}`,
          },
          () => mutateUser()
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "quiz_attempts",
            filter: `user_id=eq.${authUser.id}`,
          },
          async () => {
            if (authUser.id) {
              mutateTodayExercises();
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "usercourseprogress",
            filter: `userid=eq.${authUser.id}`,
          },
          async () => {
            if (authUser.id) {
              mutateLastCourse();
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "course_progress_summary",
            filter: `user_id=eq.${authUser.id}`,
          },
          async () => {
            if (authUser.id) {
              mutateLastCourse();
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "xp_history",
            filter: `userid=eq.${authUser.id}`,
          },
          async () => {
            if (authUser.id) {
              mutateTodayXp();
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "user_program_enrollments",
            filter: `user_id=eq.${authUser.id}`,
          },
          async () => {
            if (authUser.id) {
              logger.log('[UserContext] Realtime: user_program_enrollments changed, mutating...');
              mutateUserPrograms();
              mutateProgramAccessMap();
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "user_program_payments",
            filter: `user_id=eq.${authUser.id}`,
          },
          async () => {
            if (authUser.id) {
              console.log('[UserContext] Realtime: user_program_payments changed, mutating...');
              // Mutate both enrollments and access map when payment changes
              mutateUserPrograms();
              mutateProgramAccessMap();
            }
          }
        )
        .subscribe();
    }

    return () => {
      subscription?.unsubscribe();
    };
  }, [
    authUser?.id,
    mutateUser,
    mutateLastCourse,
    mutateTodayXp,
    mutateTodayExercises,
    mutateTodayTime,
    mutateUserPrograms,
    mutateProgramAccessMap,
  ]);

  const value: UserContextType = {
    user: user ?? null,
    lastCourse: lastCourse ?? null,
    toDayXp: toDayXp ?? 0,
    toDayExo: toDayExo ?? 0,
    toDayTime: toDayTime ?? 0,
    userPrograms: userPrograms ?? [],
    generousWeekLearningPathId: generousWeekLearningPathId,
    isLoading,
    mutateUser,
    mutateLastCourse,
    mutateTodayXp,
    mutateTodayExercises,
    mutateUserPrograms,
    isLearningPathEnrolled,
    isSecondaryProgramEnrolled,
    getProgramAccessStatus,
    // Expose mutate pour accès map et userPrograms
    mutateProgramAccessMap,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
