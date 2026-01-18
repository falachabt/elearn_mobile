import { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
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
  getProgramAccessStatus: (learningPathId: string) => Promise<ProgramAccessStatus>;
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
  // Première requête : récupérer uniquement les program_id (avec duplications potentielles)
  const { data: enrollments, error: enrollError } = await supabase
    .from("user_program_enrollments")
    .select("program_id")
    .eq("user_id", userId);
  
  logger.log('[UserContext] fetchUserPrograms - Raw enrollments from DB:', enrollments?.length || 0);

  if (enrollError) {
    logger.error('[UserContext] Error fetching user enrollments:', enrollError);
    return [];
  }

  // Déduplication côté client pour obtenir les program_ids uniques
  const allProgramIds = enrollments?.map(e => e.program_id).filter(Boolean) || [];
  const uniqueProgramIds = [...new Set(allProgramIds)];
  
  if (allProgramIds.length !== uniqueProgramIds.length) {
    logger.warn('[UserContext] ⚠️ DUPLICATIONS DETECTED:', allProgramIds.length, 'enrollments but only', uniqueProgramIds.length, 'unique program IDs');
    logger.warn('[UserContext] 🔧 Consider cleaning duplicates in user_program_enrollments table');
  }
  
  if (uniqueProgramIds.length === 0) {
    logger.log('[UserContext] No programs found for user');
    return [];
  }

  // Deuxième requête : récupérer les détails des programmes uniques
  const { data, error } = await supabase
    .from("concours_learningpaths")
    .select(
      `
      id,
      learningPathId,
      learning_paths!inner (
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
    `
    )
    .in("id", uniqueProgramIds);

  if (error) {
    logger.error('[UserContext] Error fetching program details:', error);
    return [];
  }

  // Transformer les données
  const learningPaths = data
    ?.map((concoursLearningPath) => {
      const learningPath = concoursLearningPath.learning_paths;
      
      if (learningPath && typeof learningPath === "object" && !Array.isArray(learningPath)) {
        return {
          ...learningPath,
          concours_learningpaths: {
            id: concoursLearningPath.id,
            learningPathId: concoursLearningPath.learningPathId,
          },
        };
      }
      return null;
    })
    .filter((lp): lp is LearningPaths => lp !== null);
  
  logger.log('[UserContext] fetchUserPrograms - Enrollments:', enrollments?.length, 'Unique programs loaded:', learningPaths?.length || 0);
  
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

  // Mapping d'accès aux programmes via SWR - Optimisé avec enrollments
  // ✨ IMPORTANT: Indépendant de programIds pour éviter les race conditions
  // Charge TOUS les enrollments de l'utilisateur, pas seulement ceux dans programIds
  const { data: programAccessMap, mutate: mutateProgramAccessMap } = useSWR<
    Record<string, ProgramAccessStatus>
  >(
    authUser?.id ? `program-access-map-${authUser.id}` : null,
    async () => {
      logger.log('[UserContext] Fetching ALL user enrollments for access map...');
      const startTime = Date.now();
      
      if (!authUser?.id) {
        return {};
      }
      
      // ✨ OPTIMISATION: Récupérer TOUS les enrollments de l'utilisateur en une seule requête
      // Ne plus filtrer par programIds pour éviter les race conditions quand un nouvel
      // enrollment est créé mais que userPrograms n'a pas encore été mis à jour
      const { data: enrollments, error } = await supabase
        .from('user_program_enrollments')
        .select('program_id, expiry_date')
        .eq('user_id', authUser.id);
      
      if (error) {
        logger.error('[UserContext] Error fetching enrollments:', error);
        return {};
      }
      
      // Construire le map d'accès pour TOUS les enrollments trouvés
      const accessMap: Record<string, ProgramAccessStatus> = {};
      const now = new Date();
      
      logger.log(`[UserContext] Found ${enrollments?.length || 0} total enrollments`);
      
      enrollments?.forEach(enrollment => {
        const programId = enrollment.program_id.toString();
        const expiryDate = new Date(enrollment.expiry_date);
        const isExpired = now > expiryDate;
        
        accessMap[programId] = {
          hasAccess: !isExpired,
          isExpired,
          expiryDate: enrollment.expiry_date,
        };
        logger.log(`[UserContext] Program ${programId}: hasAccess=${!isExpired}, isExpired=${isExpired}, expiry=${enrollment.expiry_date}`);
      });
      
      const duration = Date.now() - startTime;
      logger.log(`[UserContext] Program access map loaded in ${duration}ms:`, Object.keys(accessMap).length, 'programs');
      logger.log(`[UserContext] Access map keys:`, Object.keys(accessMap));
      
      return accessMap;
    },
    { 
      revalidateOnFocus: false, // CRITICAL: Désactiver pour éviter boucles infinies
      revalidateOnReconnect: false,
      dedupingInterval: 5000, // Augmenté à 5s pour réduire les appels
    }
  );

  // Nouvelle fonction utilitaire pour obtenir le statut d'accès d'un programme - mémorisée
  // Synchronous version for component-level usage (returns cached result only)
  const getProgramAccessStatusSync = useCallback((
    learningPathId: string
  ): ProgramAccessStatus => {
    const userProgram = userPrograms?.find(
      (program) => program.id === learningPathId
    );
    const programId = userProgram?.concours_learningpaths?.id;
    
    if (!programAccessMap || !programId) {
      return { hasAccess: false, isExpired: false };
    }
    
    return programAccessMap[programId] || { hasAccess: false, isExpired: false };
  }, [userPrograms, programAccessMap]);

  // Async version with DB fallback for programId lookup (for payment flows)
  const getProgramAccessStatus = useCallback(async (
    learningPathId: string
  ): Promise<ProgramAccessStatus> => {
    let programId: string | undefined;
    
    // Try to get programId from userPrograms first (fast path)
    const userProgram = userPrograms?.find(
      (program) => program.id === learningPathId
    );
    programId = userProgram?.concours_learningpaths?.id;
    
    // If not found in userPrograms, query database directly (fallback for race condition)
    if (!programId) {
      logger.log(`[UserContext] getProgramAccessStatus - programId not in userPrograms, querying DB directly for learningPathId: ${learningPathId}`);
      
      try {
        const { data, error } = await supabase
          .from('learning_paths')
          .select('concours_id')
          .eq('id', learningPathId)
          .single();
        
        if (!error && data) {
          programId = data.concours_id?.toString();
          logger.log(`[UserContext] getProgramAccessStatus - found programId from DB: ${programId}`);
        } else {
          logger.error(`[UserContext] getProgramAccessStatus - DB query error:`, error);
        }
      } catch (err) {
        logger.error(`[UserContext] getProgramAccessStatus - exception:`, err);
      }
    }
    
    logger.log(`[UserContext] getProgramAccessStatus - learningPathId: ${learningPathId}, programId: ${programId}, hasMap: ${!!programAccessMap}`);
    
    if (!programAccessMap) {
      logger.log(`[UserContext] getProgramAccessStatus - no access map yet`);
      return { hasAccess: false, isExpired: false };
    }
    
    if (!programId) {
      logger.log(`[UserContext] getProgramAccessStatus - no programId found`);
      return { hasAccess: false, isExpired: false };
    }
    
    const status = programAccessMap[programId] || { hasAccess: false, isExpired: false };
    logger.log(`[UserContext] getProgramAccessStatus - programId ${programId} status:`, status);
    
    return status;
  }, [userPrograms, programAccessMap]);

  // Nouvelle version de isLearningPathEnrolled - mémorisée pour éviter re-renders en boucle
  const isLearningPathEnrolled = useCallback((learningPathId: string) => {
    const userProgram = userPrograms?.find(
      (program) => program.id === learningPathId
    );
    
    // Log seulement si programme trouvé (réduit le spam)
    if (userProgram) {
      logger.log('[UserContext] ✓ Program enrolled:', learningPathId);
    }
    
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
      return true; // Le programme existe dans les inscriptions, donc l'utilisateur est inscrit
    }
    
    // Sinon, on vérifie le statut d'accès (expiration)
    const status = getProgramAccessStatus(learningPathId);
    return status.hasAccess;
  }, [userPrograms, programAccessMap, generousWeekLearningPathId, user?.metadata?.generousWeek]);

  // Check if user is enrolled in a secondary program - mémorisée
  const isSecondaryProgramEnrolled = useCallback((programId: string) => {
    return programId == programId; // user do not pay for secondary courses for now 
  }, []);

  useEffect(() => {
    setIsLoading(
      !user ||
        !lastCourse ||
        toDayXp === undefined ||
        toDayExo === undefined ||
        !userPrograms
    );
  }, [user, lastCourse, toDayXp, toDayExo, userPrograms]);

  // Store mutate functions in refs to avoid recreating subscriptions
  const mutateUserRef = useRef(mutateUser);
  const mutateLastCourseRef = useRef(mutateLastCourse);
  const mutateTodayXpRef = useRef(mutateTodayXp);
  const mutateTodayExercisesRef = useRef(mutateTodayExercises);
  const mutateTodayTimeRef = useRef(mutateTodayTime);
  const mutateUserProgramsRef = useRef(mutateUserPrograms);
  const mutateProgramAccessMapRef = useRef(mutateProgramAccessMap);

  // Update refs when functions change
  useEffect(() => {
    mutateUserRef.current = mutateUser;
    mutateLastCourseRef.current = mutateLastCourse;
    mutateTodayXpRef.current = mutateTodayXp;
    mutateTodayExercisesRef.current = mutateTodayExercises;
    mutateTodayTimeRef.current = mutateTodayTime;
    mutateUserProgramsRef.current = mutateUserPrograms;
    mutateProgramAccessMapRef.current = mutateProgramAccessMap;
  }, [mutateUser, mutateLastCourse, mutateTodayXp, mutateTodayExercises, mutateTodayTime, mutateUserPrograms, mutateProgramAccessMap]);

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
          () => mutateUserRef.current()
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "user_xp",
            filter: `userid=eq.${authUser.id}`,
          },
          () => mutateUserRef.current()
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "user_activity",
            filter: `user_id=eq.${authUser.id}`,
          },
          () => mutateTodayTimeRef.current()
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "user_streaks",
            filter: `user_id=eq.${authUser.id}`,
          },
          () => mutateUserRef.current()
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
              mutateTodayExercisesRef.current();
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
              mutateLastCourseRef.current();
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
              mutateLastCourseRef.current();
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
              mutateTodayXpRef.current();
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
              mutateUserProgramsRef.current();
              mutateProgramAccessMapRef.current();
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
              mutateUserProgramsRef.current();
              mutateProgramAccessMapRef.current();
            }
          }
        )
        .subscribe();
    }

    return () => {
      subscription?.unsubscribe();
    };
  }, [authUser?.id]);

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
