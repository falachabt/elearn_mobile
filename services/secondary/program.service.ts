import { supabase } from "@/lib/supabase";
import { SecondaryProgram } from "@/types/secondary.type";

export async function getSecondaryPrograms(): Promise<SecondaryProgram[]> {
  const { data, error } = await supabase
    .from("secondary_programs")
    .select("*, class:secondary_classes(*), serie:secondary_series(*)")
    .filter("is_active", "eq", true);
  if (error) throw error;
  return (data || []).map(program => ({
    ...program,
    document_count: 0 // TODO: Add document_count field to database
  }));
}

export async function getSecondaryProgramById(
  id: string
): Promise<SecondaryProgram> {
  const { data, error } = await supabase
    .from("secondary_programs")
    .select("*, class:secondary_classes(*), serie:secondary_series(*)")
    .eq("id", id)
    .single();
  if (error) throw error;
  return {
    ...data,
    document_count: 0 // TODO: Add document_count field to database
  };
}

export async function getSecondaryProgramsByClass(classId: string) {
  const { data, error } = await supabase
    .from("secondary_programs")
    .select("*")
    .eq("class_id", classId);
  if (error) throw error;
  return data;
}

export async function getSecondaryProgramsBySerie(serieId: string) {
  const { data, error } = await supabase
    .from("secondary_programs")
    .select("*")
    .eq("serie_id", serieId);
  if (error) throw error;
  return data;
}

export async function getSecondaryProgramCourses(programId: string) {
  const { data, error } = await supabase
    .from("secondary_program_courses")
    .select("*, course:courses(*)")
    .eq("program_id", programId);
  if (error) throw error;
  return data;
}

export async function getSecondaryProgramExercises(
  programId: string, 
  userId?: string,
  page: number = 0,
  pageSize: number = 20,
  searchQuery: string = ""
) {
  const from = page * pageSize;
  const to = from + pageSize - 1;
  
  let query = supabase
    .from("secondary_program_exercises")
    .select(`
      *,
      exercise:exercices(
        *,
        course:courses(
          id,
          name,
          category,
          courses_categories(
            id,
            name,
            description
          )
        )
      )
    `, { count: 'exact' })
    .eq("program_id", programId);

  // Add search filter if provided
  if (searchQuery && searchQuery.trim().length > 0) {
    const searchTerm = `%${searchQuery.trim()}%`;
    query = query.or(`exercise.title.ilike.${searchTerm},exercise.description.ilike.${searchTerm}`);
  }

  const { data, error, count } = await query
    .order('id', { ascending: true })
    .range(from, to);
  
  if (error) throw error;
  
  // If userId is provided, fetch pin and complete states for exercises in this page
  if (userId && data && data.length > 0) {
    const exerciseIds = data
      .filter(item => item.exercise)
      .map(item => item.exercise.id);
    
    if (exerciseIds.length > 0) {
      const [pinsRes, completesRes] = await Promise.all([
        supabase
          .from("exercices_pin")
          .select("exercice_id, is_pinned")
          .eq("user_id", userId)
          .in("exercice_id", exerciseIds),
        supabase
          .from("exercices_complete")
          .select("exercice_id, is_completed")
          .eq("user_id", userId)
          .in("exercice_id", exerciseIds),
      ]);
      
      // Log errors if any
      if (pinsRes.error) console.error("Error fetching pins:", pinsRes.error);
      if (completesRes.error) console.error("Error fetching completes:", completesRes.error);
      
      // Create maps for quick lookup
      const pinsMap = new Map(
        pinsRes.data?.map(pin => [pin.exercice_id, pin.is_pinned]) || []
      );
      const completesMap = new Map(
        completesRes.data?.map(comp => [comp.exercice_id, comp.is_completed]) || []
      );
      
      // Merge the data
      const mergedData = data.map(item => ({
        ...item,
        exercise: item.exercise ? {
          ...item.exercise,
          exercices_pin: pinsMap.has(item.exercise.id) 
            ? [{ is_pinned: pinsMap.get(item.exercise.id) }] 
            : [],
          exercices_complete: completesMap.has(item.exercise.id)
            ? [{ is_completed: completesMap.get(item.exercise.id) }]
            : [],
        } : null
      }));
      
      return { data: mergedData, count: count || 0, hasMore: (count || 0) > to + 1 };
    }
  }
  
  return { data, count: count || 0, hasMore: (count || 0) > to + 1 };
}

export async function getSecondaryProgramQuizzes(
  programId: string,
  page: number = 0,
  pageSize: number = 20,
  searchQuery: string = ""
) {
  const from = page * pageSize;
  const to = from + pageSize - 1;
  
  let query = supabase
    .from("secondary_program_quizzes")
    .select(`
      *,
      quiz(
        *,
        quiz_questions(id),
        course:courses(
          id,
          name,
          category,
          courses_categories(
            id,
            name,
            description
          )
        )
      )
    `, { count: 'exact' })
    .eq("program_id", programId);

  // Add search filter if provided
  // Using Supabase's ilike operator which safely handles pattern matching
  // Escape special LIKE wildcards (% and _) to treat them as literal characters
  if (searchQuery && searchQuery.trim().length > 0) {
    // Escape special characters for LIKE patterns
    const escapedQuery = searchQuery.trim()
      .replace(/\\/g, '\\\\')  // Escape backslash first
      .replace(/%/g, '\\%')    // Escape percent
      .replace(/_/g, '\\_');    // Escape underscore
    const searchTerm = `%${escapedQuery}%`;
    query = query.or(`quiz.name.ilike.${searchTerm},quiz.description.ilike.${searchTerm}`);
  }

  const { data, error, count } = await query
    .order('id', { ascending: true })
    .range(from, to);
  
  if (error) throw error;
  
  return { data, count: count || 0, hasMore: (count || 0) > to + 1 };
}

export async function getSecondaryProgramQuizById(programId: string, quizId: string) {
  const { data, error } = await supabase
    .from("secondary_program_quizzes")
    .select(`
      quiz_id,
      quiz(
        *,
        quiz_questions(count),
        category(name),
        quiz_tags(tags(id,name)),
        quiz_courses(courses(id,name))
      )
    `)
    .eq("program_id", programId)
    .eq("quiz_id", quizId)
    .single();
  
  if (error) throw error;
  // Return the nested quiz object to match the expected format
  return data?.quiz || null;
}

export async function getSecondaryProgramContent(programId: string) {
  const coursesPromise = getSecondaryProgramCourses(programId);
  const exercisesPromise = getSecondaryProgramExercises(programId);
  const quizzesPromise = getSecondaryProgramQuizzes(programId);

  const [courses, exercises, quizzes] = await Promise.all([
    coursesPromise,
    exercisesPromise,
    quizzesPromise,
  ]);

  return {
    courses,
    exercises: exercises.data,
    quizzes: quizzes.data,
  };
}

// ===== DOCUMENT MANAGEMENT =====

export interface SecondaryDocumentFolder {
  id: string;
  program_id: string;
  parent_folder_id: string | null;
  name: string;
  description: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface SecondaryDocument {
  id: string;
  folder_id: string | null;
  storage_object_id: string | null;
  correction_document_id: string | null;
  name: string;
  description: string | null;
  is_correction: boolean;
  file_type: string;
  storage_path: string;
  file_url: string;
  download_url: string | null;
  file_size: number | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

/**
 * Get folders and documents at a specific level (root if folderId is null)
 */
export async function getSecondaryProgramDocuments(
  programId: string,
  folderId: string | null = null
) {
  // Get folders at this level
  let foldersQuery = supabase
    .from("secondary_document_folders")
    .select("*")
    .eq("program_id", programId);
  
  // Use .is() for null check, .eq() for actual ID
  if (folderId) {
    foldersQuery = foldersQuery.eq("parent_folder_id", folderId);
  } else {
    foldersQuery = foldersQuery.is("parent_folder_id", null);
  }
  
  const { data: folders, error: foldersError } = await foldersQuery
    .order("order_index", { ascending: true })
    .order("name", { ascending: true });

  if (foldersError) throw foldersError;

  // Get documents at this level
  let documents: Database["secondary_documents"][] = [];
  
  if (folderId) {
    // Get documents in this specific folder (folder already verified to belong to program)
    const { data: folderDocuments, error: documentsError } = await supabase
      .from("secondary_documents")
      .select("*")
      .eq("folder_id", folderId)
      .eq("is_correction", false)
      .order("order_index", { ascending: true })
      .order("name", { ascending: true });

    if (documentsError) throw documentsError;
    documents = folderDocuments || [];
  } else {
    // At root level: get documents linked to this program via secondary_program_documents
    const { data: programDocLinks, error: linksError } = await supabase
      .from("secondary_program_documents")
      .select("document_id")
      .eq("program_id", programId)
      .eq("is_active", true);

    if (linksError) throw linksError;
    
    const documentIds = programDocLinks?.map(link => link.document_id).filter(id => id != null) || [];
    
    if (documentIds.length > 0) {
      // Get the actual documents at root level
      const { data: rootDocuments, error: documentsError } = await supabase
        .from("secondary_documents")
        .select("*")
        .in("id", documentIds)
        .is("folder_id", null)
        .eq("is_correction", false)
        .order("order_index", { ascending: true })
        .order("name", { ascending: true });

      if (documentsError) throw documentsError;
      documents = rootDocuments || [];
    }
  }

  return {
    folders: folders || [],
    documents: documents || [],
  };
}

/**
 * Get folder details by ID
 */
export async function getSecondaryDocumentFolder(folderId: string) {
  const { data, error } = await supabase
    .from("secondary_document_folders")
    .select("*")
    .eq("id", folderId)
    .single();

  if (error) throw error;
  return data as SecondaryDocumentFolder;
}

/**
 * Get document details by ID
 */
export async function getSecondaryDocument(documentId: string) {
  const { data, error } = await supabase
    .from("secondary_documents")
    .select("*")
    .eq("id", documentId)
    .single();

  if (error) throw error;
  return data as SecondaryDocument;
}

/**
 * Get breadcrumb trail for current folder
 */
export async function getSecondaryDocumentBreadcrumb(folderId: string | null) {
  if (!folderId) return [];

  const breadcrumb: SecondaryDocumentFolder[] = [];
  let currentFolderId: string | null = folderId;

  while (currentFolderId) {
    const { data, error } = await supabase
      .from("secondary_document_folders")
      .select("*")
      .eq("id", currentFolderId)
      .single();

    if (error) throw error;
    breadcrumb.unshift(data);
    currentFolderId = data.parent_folder_id;
  }

  return breadcrumb;
}
