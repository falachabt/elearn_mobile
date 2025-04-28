import { supabase } from '@/lib/supabase';

export const CourseProgressService = {
  async getCurrentProgress(userId: string, courseId: number) {
    const { data: summary } = await supabase
      .from('course_progress_summary')
      .select('*')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .single();

    return summary;
  },

  async getSectionsProgress(userId: string, courseId: number) {
    const { data: progress } = await supabase
      .from('usercourseprogress')
      .select('*')
      .eq('userid', userId)
      .eq('courseid', courseId);

    return progress;
  },

  async getSectionProgress(userId: string, courseId: number, sectionId: number) {
    const { data: progress } = await supabase
      .from('usercourseprogress')
      .select('*')
      .eq('userid', userId)
      .eq('courseid', courseId)
      .eq('sectionid', sectionId)
      .single();

    return progress;
  },

  async updateLastAccessed(userId: string, courseId: number, sectionId: number) {
    // Update last accessed
    const { error } = await supabase
      .from('usercourseprogress')
      .update({ lastaccessed: new Date().toISOString() })
      .eq('userid', userId)
      .eq('courseid', courseId)
      .eq('sectionid', sectionId);

    return error;
  },

  async markSectionAsComplete(userId: string, courseId: number, sectionId: number) {
    // Create or update section progress
    const { data: sectionProgress, error } = await supabase
      .from('usercourseprogress')
      .upsert({
        userid: userId,
        courseid: courseId,
        sectionid: sectionId,
        progress: 1,
        lastaccessed: new Date().toISOString()
      })
      .select()
      .single();

      console.log("error",error)

    // Update course summary
    await this.updateCourseSummary(userId, courseId);

    return sectionProgress;
  },

  async updateCourseSummary(userId: string, courseId: number) {
    // Get total sections count
    const { count: totalSections } = await supabase
      .from('courses_content')
      .select('id', { count: 'exact' })
      .eq('courseId', courseId);

    // Get completed sections count
    const { count: completedSections } = await supabase
      .from('usercourseprogress')
      .select('*', { count: 'exact' })
      .eq('userid', userId)
      .eq('courseid', courseId)
      .eq('progress', 1);

    // Calculate progress percentage
    const progress = totalSections ? ((completedSections ?? 0) / totalSections) : 0;
    const isCompleted = progress === 1;

    // Update summary
//  const { error }=   await supabase
//       .from('course_progress_summary')
//       .upsert({
//         user_id: userId,
//         course_id: courseId,
//         total_sections: totalSections,
//         completed_sections: completedSections,
//         progress_percentage: progress,
//         is_completed: isCompleted,
//         last_updated: new Date().toISOString()
//       }, { onConflict: ['user_id', 'course_id'].join(','), ignoreDuplicates: false })
      
//       ;
      // console.log("progress sumary error", error)
  }

};