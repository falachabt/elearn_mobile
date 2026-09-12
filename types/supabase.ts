export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          accessibilityneeds: string | null
          achievements: string[] | null
          active_trx: string | null
          address: string | null
          authId: string
          birthdate: string | null
          city: string | null
          class: string | null
          clubs: string[] | null
          country: string | null
          country_id: string | null
          coursescompleted: string[] | null
          coursesenrolled: string[] | null
          created_at: string
          defpass: string | null
          email: string
          favoritesubjects: string[] | null
          firebase_uid: string | null
          firstname: string | null
          genre: string | null
          gpa: number | null
          gradelevel: string | null
          groups: string[] | null
          guardianemail: string | null
          guardianname: string | null
          guardianphone: string | null
          hasrepeatedclass: boolean | null
          hobbies: string[] | null
          id: string
          image: Json | null
          internetaccess: boolean | null
          invitedfriends: string[] | null
          last_active_at: string | null
          lastname: string | null
          learningstyle: string | null
          maingoal: string | null
          major: string | null
          metadata: Json | null
          middlename: string | null
          minor: string | null
          motivation: string | null
          nationality: string | null
          onboarding_done: boolean | null
          othergoals: string | null
          phone: number | null
          postalcode: string | null
          preferredlanguage: string | null
          reminders: boolean | null
          remindertime: string | null
          repeatedclassdetails: string | null
          role_id: string | null
          school: string | null
          schoollevel: string | null
          skills: string[] | null
          state: string | null
          status: boolean | null
          studentid: string | null
          type: string
        }
        Insert: {
          accessibilityneeds?: string | null
          achievements?: string[] | null
          active_trx?: string | null
          address?: string | null
          authId: string
          birthdate?: string | null
          city?: string | null
          class?: string | null
          clubs?: string[] | null
          country?: string | null
          country_id?: string | null
          coursescompleted?: string[] | null
          coursesenrolled?: string[] | null
          created_at?: string
          defpass?: string | null
          email: string
          favoritesubjects?: string[] | null
          firebase_uid?: string | null
          firstname?: string | null
          genre?: string | null
          gpa?: number | null
          gradelevel?: string | null
          groups?: string[] | null
          guardianemail?: string | null
          guardianname?: string | null
          guardianphone?: string | null
          hasrepeatedclass?: boolean | null
          hobbies?: string[] | null
          id?: string
          image?: Json | null
          internetaccess?: boolean | null
          invitedfriends?: string[] | null
          last_active_at?: string | null
          lastname?: string | null
          learningstyle?: string | null
          maingoal?: string | null
          major?: string | null
          metadata?: Json | null
          middlename?: string | null
          minor?: string | null
          motivation?: string | null
          nationality?: string | null
          onboarding_done?: boolean | null
          othergoals?: string | null
          phone?: number | null
          postalcode?: string | null
          preferredlanguage?: string | null
          reminders?: boolean | null
          remindertime?: string | null
          repeatedclassdetails?: string | null
          role_id?: string | null
          school?: string | null
          schoollevel?: string | null
          skills?: string[] | null
          state?: string | null
          status?: boolean | null
          studentid?: string | null
          type?: string
        }
        Update: {
          accessibilityneeds?: string | null
          achievements?: string[] | null
          active_trx?: string | null
          address?: string | null
          authId?: string
          birthdate?: string | null
          city?: string | null
          class?: string | null
          clubs?: string[] | null
          country?: string | null
          country_id?: string | null
          coursescompleted?: string[] | null
          coursesenrolled?: string[] | null
          created_at?: string
          defpass?: string | null
          email?: string
          favoritesubjects?: string[] | null
          firebase_uid?: string | null
          firstname?: string | null
          genre?: string | null
          gpa?: number | null
          gradelevel?: string | null
          groups?: string[] | null
          guardianemail?: string | null
          guardianname?: string | null
          guardianphone?: string | null
          hasrepeatedclass?: boolean | null
          hobbies?: string[] | null
          id?: string
          image?: Json | null
          internetaccess?: boolean | null
          invitedfriends?: string[] | null
          last_active_at?: string | null
          lastname?: string | null
          learningstyle?: string | null
          maingoal?: string | null
          major?: string | null
          metadata?: Json | null
          middlename?: string | null
          minor?: string | null
          motivation?: string | null
          nationality?: string | null
          onboarding_done?: boolean | null
          othergoals?: string | null
          phone?: number | null
          postalcode?: string | null
          preferredlanguage?: string | null
          reminders?: boolean | null
          remindertime?: string | null
          repeatedclassdetails?: string | null
          role_id?: string | null
          school?: string | null
          schoollevel?: string | null
          skills?: string[] | null
          state?: string | null
          status?: boolean | null
          studentid?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_class_fkey"
            columns: ["class"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_config: {
        Row: {
          created_at: string
          data: Json | null
          id: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          content_id: string
          content_type: string
          course_id: number | null
          courses_content_id: number | null
          exercice_id: string | null
          id: number
          learning_path_id: string | null
          modified_at: string
          quiz_id: string | null
          quiz_question_id: number | null
          user_id: string | null
        }
        Insert: {
          action: string
          content_id: string
          content_type: string
          course_id?: number | null
          courses_content_id?: number | null
          exercice_id?: string | null
          id?: number
          learning_path_id?: string | null
          modified_at?: string
          quiz_id?: string | null
          quiz_question_id?: number | null
          user_id?: string | null
        }
        Update: {
          action?: string
          content_id?: string
          content_type?: string
          course_id?: number | null
          courses_content_id?: number | null
          exercice_id?: string | null
          id?: number
          learning_path_id?: string | null
          modified_at?: string
          quiz_id?: string | null
          quiz_question_id?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_courses_content_id_fkey"
            columns: ["courses_content_id"]
            isOneToOne: false
            referencedRelation: "courses_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_exercice_id_fkey"
            columns: ["exercice_id"]
            isOneToOne: false
            referencedRelation: "exercices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_learning_path_id_fkey"
            columns: ["learning_path_id"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quiz"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_quiz_question_id_fkey"
            columns: ["quiz_question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          cart_id: string | null
          created_at: string | null
          id: string
          price: number
          program_id: number | null
        }
        Insert: {
          cart_id?: string | null
          created_at?: string | null
          id?: string
          price: number
          program_id?: number | null
        }
        Update: {
          cart_id?: string | null
          created_at?: string | null
          id?: string
          price?: number
          program_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "concours_learningpaths"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          created_at: string | null
          id: string
          status: string | null
          total_amount: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      challenges: {
        Row: {
          challenge_type: string | null
          created_at: string | null
          end_date: string | null
          goal: number | null
          id: string
          is_completed: boolean | null
          name: string | null
          progress: number | null
          reward_points: number | null
          start_date: string | null
          target: number | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          challenge_type?: string | null
          created_at?: string | null
          end_date?: string | null
          goal?: number | null
          id?: string
          is_completed?: boolean | null
          name?: string | null
          progress?: number | null
          reward_points?: number | null
          start_date?: string | null
          target?: number | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          challenge_type?: string | null
          created_at?: string | null
          end_date?: string | null
          goal?: number | null
          id?: string
          is_completed?: boolean | null
          name?: string | null
          progress?: number | null
          reward_points?: number | null
          start_date?: string | null
          target?: number | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "challenges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          created_at: string | null
          id: string
          name: string | null
          type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name?: string | null
          type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string | null
          type?: string | null
        }
        Relationships: []
      }
      cities: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      comment_votes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
          vote_type: number
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id?: string
          vote_type: number
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
          vote_type?: number
        }
        Relationships: [
          {
            foreignKeyName: "comment_votes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      concours: {
        Row: {
          city_id: string | null
          created_at: string
          cycle_id: string | null
          dates: string[] | null
          description: string | null
          id: string
          image: Json | null
          isActive: boolean
          name: string | null
          nextDate: string | null
          school_id: string | null
        }
        Insert: {
          city_id?: string | null
          created_at?: string
          cycle_id?: string | null
          dates?: string[] | null
          description?: string | null
          id?: string
          image?: Json | null
          isActive?: boolean
          name?: string | null
          nextDate?: string | null
          school_id?: string | null
        }
        Update: {
          city_id?: string | null
          created_at?: string
          cycle_id?: string | null
          dates?: string[] | null
          description?: string | null
          id?: string
          image?: Json | null
          isActive?: boolean
          name?: string | null
          nextDate?: string | null
          school_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "concours_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concours_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "vw_concours_details"
            referencedColumns: ["city_id"]
          },
          {
            foreignKeyName: "concours_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "vw_schools_with_locations"
            referencedColumns: ["city_id"]
          },
          {
            foreignKeyName: "concours_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "vw_upcoming_concours"
            referencedColumns: ["city_id"]
          },
          {
            foreignKeyName: "concours_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "study_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concours_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "vw_concours_details"
            referencedColumns: ["cycle_id"]
          },
          {
            foreignKeyName: "concours_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "vw_upcoming_concours"
            referencedColumns: ["cycle_id"]
          },
          {
            foreignKeyName: "concours_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concours_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "vw_concours_details"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "concours_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "vw_schools_with_locations"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "concours_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "vw_upcoming_concours"
            referencedColumns: ["school_id"]
          },
        ]
      }
      concours_archives: {
        Row: {
          category_id: string | null
          concour_id: string | null
          description: string | null
          duration: number | null
          file_id: string | null
          file_path: string | null
          file_size: number | null
          file_url: string
          has_correction: boolean | null
          id: number
          name: string | null
          session: string | null
          uploaded_at: string | null
        }
        Insert: {
          category_id?: string | null
          concour_id?: string | null
          description?: string | null
          duration?: number | null
          file_id?: string | null
          file_path?: string | null
          file_size?: number | null
          file_url: string
          has_correction?: boolean | null
          id?: number
          name?: string | null
          session?: string | null
          uploaded_at?: string | null
        }
        Update: {
          category_id?: string | null
          concour_id?: string | null
          description?: string | null
          duration?: number | null
          file_id?: string | null
          file_path?: string | null
          file_size?: number | null
          file_url?: string
          has_correction?: boolean | null
          id?: number
          name?: string | null
          session?: string | null
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "concours_archives_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "courses_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concours_archives_concour_id_fkey"
            columns: ["concour_id"]
            isOneToOne: false
            referencedRelation: "concours"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concours_archives_concour_id_fkey"
            columns: ["concour_id"]
            isOneToOne: false
            referencedRelation: "vw_concours_details"
            referencedColumns: ["concours_id"]
          },
          {
            foreignKeyName: "concours_archives_concour_id_fkey"
            columns: ["concour_id"]
            isOneToOne: false
            referencedRelation: "vw_upcoming_concours"
            referencedColumns: ["concours_id"]
          },
        ]
      }
      concours_corrections: {
        Row: {
          archive_id: number
          file_id: string | null
          file_size: number | null
          file_url: string
          id: number
          uploaded_at: string | null
        }
        Insert: {
          archive_id: number
          file_id?: string | null
          file_size?: number | null
          file_url: string
          id?: number
          uploaded_at?: string | null
        }
        Update: {
          archive_id?: number
          file_id?: string | null
          file_size?: number | null
          file_url?: string
          id?: number
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "concours_corrections_archive_id_fkey"
            columns: ["archive_id"]
            isOneToOne: false
            referencedRelation: "concours_archives"
            referencedColumns: ["id"]
          },
        ]
      }
      concours_learningpaths: {
        Row: {
          concourId: string | null
          created_at: string
          id: number
          isActive: boolean | null
          learningPathId: string | null
          metadata: Json | null
          price: number | null
        }
        Insert: {
          concourId?: string | null
          created_at?: string
          id?: number
          isActive?: boolean | null
          learningPathId?: string | null
          metadata?: Json | null
          price?: number | null
        }
        Update: {
          concourId?: string | null
          created_at?: string
          id?: number
          isActive?: boolean | null
          learningPathId?: string | null
          metadata?: Json | null
          price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "concours_learningpaths_concourId_fkey"
            columns: ["concourId"]
            isOneToOne: false
            referencedRelation: "concours"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concours_learningpaths_concourId_fkey"
            columns: ["concourId"]
            isOneToOne: false
            referencedRelation: "vw_concours_details"
            referencedColumns: ["concours_id"]
          },
          {
            foreignKeyName: "concours_learningpaths_concourId_fkey"
            columns: ["concourId"]
            isOneToOne: false
            referencedRelation: "vw_upcoming_concours"
            referencedColumns: ["concours_id"]
          },
          {
            foreignKeyName: "concours_learningpaths_learningPathId_fkey"
            columns: ["learningPathId"]
            isOneToOne: true
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      concours_learningpaths_backup: {
        Row: {
          concourId: string | null
          created_at: string | null
          id: number | null
          isActive: boolean | null
          learningPathId: string | null
          metadata: Json | null
          price: number | null
        }
        Insert: {
          concourId?: string | null
          created_at?: string | null
          id?: number | null
          isActive?: boolean | null
          learningPathId?: string | null
          metadata?: Json | null
          price?: number | null
        }
        Update: {
          concourId?: string | null
          created_at?: string | null
          id?: number | null
          isActive?: boolean | null
          learningPathId?: string | null
          metadata?: Json | null
          price?: number | null
        }
        Relationships: []
      }
      content_interactions: {
        Row: {
          content_id: string | null
          content_type: string | null
          created_at: string | null
          duration: string | null
          id: string
          interaction_end: string | null
          interaction_start: string | null
          user_id: string | null
        }
        Insert: {
          content_id?: string | null
          content_type?: string | null
          created_at?: string | null
          duration?: string | null
          id?: string
          interaction_end?: string | null
          interaction_start?: string | null
          user_id?: string | null
        }
        Update: {
          content_id?: string | null
          content_type?: string | null
          created_at?: string | null
          duration?: string | null
          id?: string
          interaction_end?: string | null
          interaction_start?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_interactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          code: string | null
          created_at: string | null
          currency_code: string | null
          id: string
          name: string
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          currency_code?: string | null
          id?: string
          name: string
        }
        Update: {
          code?: string | null
          created_at?: string | null
          currency_code?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      country_group_members: {
        Row: {
          country_id: string
          created_at: string | null
          group_id: string
        }
        Insert: {
          country_id: string
          created_at?: string | null
          group_id: string
        }
        Update: {
          country_id?: string
          created_at?: string | null
          group_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "country_group_members_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "country_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "country_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      country_groups: {
        Row: {
          code: string | null
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          code?: string | null
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      course_learningpath: {
        Row: {
          courseId: number | null
          created_at: string
          id: string
          lpId: string | null
        }
        Insert: {
          courseId?: number | null
          created_at?: string
          id?: string
          lpId?: string | null
        }
        Update: {
          courseId?: number | null
          created_at?: string
          id?: string
          lpId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_learningPath_courseId_fkey"
            columns: ["courseId"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_learningPath_lpId_fkey"
            columns: ["lpId"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      course_progress_summary: {
        Row: {
          completed_sections: number
          course_id: number
          id: number
          is_completed: boolean | null
          last_updated: string
          progress_percentage: number | null
          total_sections: number
          user_id: string
        }
        Insert: {
          completed_sections?: number
          course_id: number
          id?: number
          is_completed?: boolean | null
          last_updated?: string
          progress_percentage?: number | null
          total_sections: number
          user_id: string
        }
        Update: {
          completed_sections?: number
          course_id?: number
          id?: number
          is_completed?: boolean | null
          last_updated?: string
          progress_percentage?: number | null
          total_sections?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_progress_summary_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_progress_summary_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      course_summaries: {
        Row: {
          content: Json
          course_id: number
          created_at: string
          id: number
          metadata: Json | null
          name: string
          source_content_count: number
          source_content_ids: number[]
          updated_at: string
        }
        Insert: {
          content: Json
          course_id: number
          created_at?: string
          id?: never
          metadata?: Json | null
          name?: string
          source_content_count?: number
          source_content_ids?: number[]
          updated_at?: string
        }
        Update: {
          content?: Json
          course_id?: number
          created_at?: string
          id?: never
          metadata?: Json | null
          name?: string
          source_content_count?: number
          source_content_ids?: number[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_summaries_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: true
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_tags: {
        Row: {
          course_id: number
          tag_id: string
        }
        Insert: {
          course_id: number
          tag_id: string
        }
        Update: {
          course_id?: number
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_tags_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      course_videos: {
        Row: {
          course_id: number
          created_at: string
          description: string | null
          duration: number | null
          filename: string
          filesize: number
          id: string
          is_active: boolean | null
          metadata: Json | null
          mime_type: string | null
          mux_asset_id: string | null
          mux_playback_id: string | null
          order_index: number
          status: string | null
          title: string | null
          updated_at: string
          uploadthing_id: string | null
          url: string
        }
        Insert: {
          course_id: number
          created_at?: string
          description?: string | null
          duration?: number | null
          filename: string
          filesize: number
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          mime_type?: string | null
          mux_asset_id?: string | null
          mux_playback_id?: string | null
          order_index?: number
          status?: string | null
          title?: string | null
          updated_at?: string
          uploadthing_id?: string | null
          url: string
        }
        Update: {
          course_id?: number
          created_at?: string
          description?: string | null
          duration?: number | null
          filename?: string
          filesize?: number
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          mime_type?: string | null
          mux_asset_id?: string | null
          mux_playback_id?: string | null
          order_index?: number
          status?: string | null
          title?: string | null
          updated_at?: string
          uploadthing_id?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_course_videos_courses"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          accessKey: string | null
          category: string | null
          country_group_id: string | null
          created_at: string
          description: string | null
          goals: string[] | null
          groups: string[] | null
          id: number
          image: Json | null
          learners: string[] | null
          name: string
          status: boolean
          tags: string[] | null
        }
        Insert: {
          accessKey?: string | null
          category?: string | null
          country_group_id?: string | null
          created_at?: string
          description?: string | null
          goals?: string[] | null
          groups?: string[] | null
          id?: number
          image?: Json | null
          learners?: string[] | null
          name?: string
          status?: boolean
          tags?: string[] | null
        }
        Update: {
          accessKey?: string | null
          category?: string | null
          country_group_id?: string | null
          created_at?: string
          description?: string | null
          goals?: string[] | null
          groups?: string[] | null
          id?: number
          image?: Json | null
          learners?: string[] | null
          name?: string
          status?: boolean
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_category_fkey"
            columns: ["category"]
            isOneToOne: false
            referencedRelation: "courses_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_country_group_id_fkey"
            columns: ["country_group_id"]
            isOneToOne: false
            referencedRelation: "country_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      courses_categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      courses_content: {
        Row: {
          content: Json | null
          courseId: number
          created_at: string
          id: number
          last_modify_at: string | null
          name: string | null
          order: number | null
          reading_time_minutes: number | null
        }
        Insert: {
          content?: Json | null
          courseId: number
          created_at?: string
          id?: number
          last_modify_at?: string | null
          name?: string | null
          order?: number | null
          reading_time_minutes?: number | null
        }
        Update: {
          content?: Json | null
          courseId?: number
          created_at?: string
          id?: number
          last_modify_at?: string | null
          name?: string | null
          order?: number | null
          reading_time_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "public_couses_content_courseid_fkey"
            columns: ["courseId"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses_content_replica: {
        Row: {
          content: Json | null
          courseId: number
          created_at: string
          id: number
          last_modify_at: string | null
          name: string | null
          order: number | null
        }
        Insert: {
          content?: Json | null
          courseId: number
          created_at?: string
          id?: number
          last_modify_at?: string | null
          name?: string | null
          order?: number | null
        }
        Update: {
          content?: Json | null
          courseId?: number
          created_at?: string
          id?: number
          last_modify_at?: string | null
          name?: string | null
          order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_content_replica_courseid_fkey"
            columns: ["courseId"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses_replica: {
        Row: {
          accessKey: string | null
          category: string | null
          created_at: string
          description: string | null
          goals: string[] | null
          groups: string[] | null
          id: number
          image: Json | null
          learners: string[] | null
          name: string
          status: boolean
          tags: string[] | null
        }
        Insert: {
          accessKey?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          goals?: string[] | null
          groups?: string[] | null
          id?: number
          image?: Json | null
          learners?: string[] | null
          name?: string
          status?: boolean
          tags?: string[] | null
        }
        Update: {
          accessKey?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          goals?: string[] | null
          groups?: string[] | null
          id?: number
          image?: Json | null
          learners?: string[] | null
          name?: string
          status?: boolean
          tags?: string[] | null
        }
        Relationships: []
      }
      daily_challenges: {
        Row: {
          challenge_date: string | null
          created_at: string | null
          id: string
          is_completed: boolean | null
          streak_count: number | null
          user_id: string | null
        }
        Insert: {
          challenge_date?: string | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          streak_count?: number | null
          user_id?: string | null
        }
        Update: {
          challenge_date?: string | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          streak_count?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_challenges_user_id_fkey1"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string | null
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string | null
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "discussion_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_group_reads: {
        Row: {
          group_id: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          group_id: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          group_id?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_group_reads_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "discussion_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_groups: {
        Row: {
          capacity: number | null
          concours_id: string | null
          created_at: string | null
          current_member_count: number | null
          group_number: number | null
          id: string
          secondary_program_id: string | null
          updated_at: string | null
        }
        Insert: {
          capacity?: number | null
          concours_id?: string | null
          created_at?: string | null
          current_member_count?: number | null
          group_number?: number | null
          id?: string
          secondary_program_id?: string | null
          updated_at?: string | null
        }
        Update: {
          capacity?: number | null
          concours_id?: string | null
          created_at?: string | null
          current_member_count?: number | null
          group_number?: number | null
          id?: string
          secondary_program_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discussion_groups_concours_id_fkey"
            columns: ["concours_id"]
            isOneToOne: false
            referencedRelation: "concours"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_groups_concours_id_fkey"
            columns: ["concours_id"]
            isOneToOne: false
            referencedRelation: "vw_concours_details"
            referencedColumns: ["concours_id"]
          },
          {
            foreignKeyName: "discussion_groups_concours_id_fkey"
            columns: ["concours_id"]
            isOneToOne: false
            referencedRelation: "vw_upcoming_concours"
            referencedColumns: ["concours_id"]
          },
          {
            foreignKeyName: "discussion_groups_secondary_program_id_fkey"
            columns: ["secondary_program_id"]
            isOneToOne: false
            referencedRelation: "secondary_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_groups_secondary_program_id_fkey"
            columns: ["secondary_program_id"]
            isOneToOne: false
            referencedRelation: "vw_available_secondary_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_message_attachments: {
        Row: {
          created_at: string | null
          file_name: string | null
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          message_id: string
        }
        Insert: {
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          message_id: string
        }
        Update: {
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "discussion_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_message_notification_deliveries: {
        Row: {
          created_at: string
          error_message: string | null
          expo_push_token: string | null
          message_id: string
          status: string
          ticket_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          expo_push_token?: string | null
          message_id: string
          status: string
          ticket_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          expo_push_token?: string | null
          message_id?: string
          status?: string
          ticket_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_message_notification_deliveries_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "discussion_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_message_notification_deliveries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_messages: {
        Row: {
          created_at: string | null
          group_id: string
          id: string
          image_url: string | null
          parent_message_id: string | null
          tagged_content_id: string | null
          tagged_content_type: string | null
          text_content: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          group_id: string
          id?: string
          image_url?: string | null
          parent_message_id?: string | null
          tagged_content_id?: string | null
          tagged_content_type?: string | null
          text_content?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          group_id?: string
          id?: string
          image_url?: string | null
          parent_message_id?: string | null
          tagged_content_id?: string | null
          tagged_content_type?: string | null
          text_content?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "discussion_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "discussion_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      document_requests: {
        Row: {
          created_at: string | null
          document_type: string | null
          email: string
          est_contacte: boolean | null
          id: string
          niveau: string
          nom: string
          telephone: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          document_type?: string | null
          email: string
          est_contacte?: boolean | null
          id?: string
          niveau: string
          nom: string
          telephone: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          document_type?: string | null
          email?: string
          est_contacte?: boolean | null
          id?: string
          niveau?: string
          nom?: string
          telephone?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      event: {
        Row: {
          created_at: string | null
          description: string | null
          end_date: string
          id: string
          is_active: boolean | null
          start_date: string
          title: string
          updated_at: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_date: string
          id?: string
          is_active?: boolean | null
          start_date: string
          title: string
          updated_at?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          start_date?: string
          title?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: []
      }
      exchange_rates: {
        Row: {
          currency_code: string
          source: string | null
          units_per_xaf: number
          updated_at: string | null
        }
        Insert: {
          currency_code: string
          source?: string | null
          units_per_xaf: number
          updated_at?: string | null
        }
        Update: {
          currency_code?: string
          source?: string | null
          units_per_xaf?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      exercices: {
        Row: {
          content: Json | null
          context: Json | null
          correction: Json | null
          course_id: number | null
          created_at: string
          description: string | null
          id: string
          title: string | null
        }
        Insert: {
          content?: Json | null
          context?: Json | null
          correction?: Json | null
          course_id?: number | null
          created_at?: string
          description?: string | null
          id?: string
          title?: string | null
        }
        Update: {
          content?: Json | null
          context?: Json | null
          correction?: Json | null
          course_id?: number | null
          created_at?: string
          description?: string | null
          id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercices_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      exercices_complete: {
        Row: {
          created_at: string
          exercice_id: string | null
          id: string
          is_completed: boolean | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          exercice_id?: string | null
          id?: string
          is_completed?: boolean | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          exercice_id?: string | null
          id?: string
          is_completed?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercices_complete_exercice_id_fkey"
            columns: ["exercice_id"]
            isOneToOne: false
            referencedRelation: "exercices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercices_complete_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      exercices_pin: {
        Row: {
          created_at: string
          exercice_id: string | null
          id: number
          is_pinned: boolean | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          exercice_id?: string | null
          id?: number
          is_pinned?: boolean | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          exercice_id?: string | null
          id?: number
          is_pinned?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercices_pin_exercice_id_fkey"
            columns: ["exercice_id"]
            isOneToOne: false
            referencedRelation: "exercices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercices_pin_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_posts: {
        Row: {
          author_id: string
          best_comment_id: string | null
          bg_color: string | null
          content: string
          created_at: string
          id: string
          media_urls: string[]
          updated_at: string
        }
        Insert: {
          author_id?: string
          best_comment_id?: string | null
          bg_color?: string | null
          content: string
          created_at?: string
          id?: string
          media_urls?: string[]
          updated_at?: string
        }
        Update: {
          author_id?: string
          best_comment_id?: string | null
          bg_color?: string | null
          content?: string
          created_at?: string
          id?: string
          media_urls?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_posts_best_comment_id_fkey"
            columns: ["best_comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_jobs: {
        Row: {
          config: Json | null
          created_at: string | null
          current_step: Json | null
          error_message: string | null
          id: string
          progress: Json | null
          result: Json | null
          status: string
          type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          current_step?: Json | null
          error_message?: string | null
          id?: string
          progress?: Json | null
          result?: Json | null
          status?: string
          type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          current_step?: Json | null
          error_message?: string | null
          id?: string
          progress?: Json | null
          result?: Json | null
          status?: string
          type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      group_content: {
        Row: {
          content_id: string
          content_type: string
          created_at: string | null
          group_id: string | null
          id: string
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string | null
          group_id?: string | null
          id?: string
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string | null
          group_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_content_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image: Json | null
          learners: string[] | null
          name: string
          schoolId: string | null
          type: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image?: Json | null
          learners?: string[] | null
          name: string
          schoolId?: string | null
          type?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image?: Json | null
          learners?: string[] | null
          name?: string
          schoolId?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "groups_schoolId_fkey"
            columns: ["schoolId"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_schoolId_fkey"
            columns: ["schoolId"]
            isOneToOne: false
            referencedRelation: "vw_concours_details"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "groups_schoolId_fkey"
            columns: ["schoolId"]
            isOneToOne: false
            referencedRelation: "vw_schools_with_locations"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "groups_schoolId_fkey"
            columns: ["schoolId"]
            isOneToOne: false
            referencedRelation: "vw_upcoming_concours"
            referencedColumns: ["school_id"]
          },
        ]
      }
      influencers: {
        Row: {
          contact_info: string | null
          contract_file_path: string | null
          created_at: string
          discount_percentage: number
          email: string | null
          id: string
          name: string
          phone: string | null
          profile_description: string | null
          promo_code: string
          social_media: Json | null
          status: string
          updated_at: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          contact_info?: string | null
          contract_file_path?: string | null
          created_at?: string
          discount_percentage: number
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          profile_description?: string | null
          promo_code: string
          social_media?: Json | null
          status?: string
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          contact_info?: string | null
          contract_file_path?: string | null
          created_at?: string
          discount_percentage?: number
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          profile_description?: string | null
          promo_code?: string
          social_media?: Json | null
          status?: string
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      instructors: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string | null
          is_active: boolean
          is_admin: boolean
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string | null
          is_active?: boolean
          is_admin?: boolean
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string | null
          is_active?: boolean
          is_admin?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      learning_path_categories: {
        Row: {
          category_id: string
          created_at: string
          id: string
          learning_path_id: string
          order_index: number
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          learning_path_id: string
          order_index: number
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          learning_path_id?: string
          order_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "learning_path_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "courses_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_path_categories_learning_path_id_fkey"
            columns: ["learning_path_id"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_path_course_order: {
        Row: {
          category_id: string
          course_id: number
          created_at: string
          id: string
          learning_path_id: string
          order_index: number
        }
        Insert: {
          category_id: string
          course_id: number
          created_at?: string
          id?: string
          learning_path_id: string
          order_index: number
        }
        Update: {
          category_id?: string
          course_id?: number
          created_at?: string
          id?: string
          learning_path_id?: string
          order_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "learning_path_course_order_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "courses_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_path_course_order_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_path_course_order_learning_path_id_fkey"
            columns: ["learning_path_id"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_paths: {
        Row: {
          content: Json | null
          course_count: number | null
          created_at: string
          description: string | null
          duration: Json[] | null
          end_at: string | null
          groups: string[] | null
          id: string
          image: Json | null
          last_modified_at: string | null
          metadata: Json | null
          quiz_count: number | null
          start_at: string | null
          status: boolean | null
          students: string[] | null
          title: string | null
          total_duration: number | null
        }
        Insert: {
          content?: Json | null
          course_count?: number | null
          created_at?: string
          description?: string | null
          duration?: Json[] | null
          end_at?: string | null
          groups?: string[] | null
          id?: string
          image?: Json | null
          last_modified_at?: string | null
          metadata?: Json | null
          quiz_count?: number | null
          start_at?: string | null
          status?: boolean | null
          students?: string[] | null
          title?: string | null
          total_duration?: number | null
        }
        Update: {
          content?: Json | null
          course_count?: number | null
          created_at?: string
          description?: string | null
          duration?: Json[] | null
          end_at?: string | null
          groups?: string[] | null
          id?: string
          image?: Json | null
          last_modified_at?: string | null
          metadata?: Json | null
          quiz_count?: number | null
          start_at?: string | null
          status?: boolean | null
          students?: string[] | null
          title?: string | null
          total_duration?: number | null
        }
        Relationships: []
      }
      learning_sessions: {
        Row: {
          content_id: string | null
          content_type: string | null
          created_at: string | null
          duration: string | null
          id: string
          is_completed: boolean | null
          last_heartbeat: string | null
          session_end: string | null
          session_start: string
          session_type: string | null
          user_id: string | null
        }
        Insert: {
          content_id?: string | null
          content_type?: string | null
          created_at?: string | null
          duration?: string | null
          id?: string
          is_completed?: boolean | null
          last_heartbeat?: string | null
          session_end?: string | null
          session_start: string
          session_type?: string | null
          user_id?: string | null
        }
        Update: {
          content_id?: string | null
          content_type?: string | null
          created_at?: string | null
          duration?: string | null
          id?: string
          is_completed?: boolean | null
          last_heartbeat?: string | null
          session_end?: string | null
          session_start?: string
          session_type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      lp_milestones: {
        Row: {
          created_at: string
          id: string
          order_index: number
          ref_course_id: number | null
          title: string
          type: string
          unit_id: string
          xp_reward: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_index?: number
          ref_course_id?: number | null
          title: string
          type: string
          unit_id: string
          xp_reward?: number
        }
        Update: {
          created_at?: string
          id?: string
          order_index?: number
          ref_course_id?: number | null
          title?: string
          type?: string
          unit_id?: string
          xp_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "lp_milestones_ref_course_id_fkey"
            columns: ["ref_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lp_milestones_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "lp_units"
            referencedColumns: ["id"]
          },
        ]
      }
      lp_steps: {
        Row: {
          created_at: string
          id: string
          milestone_id: string
          order_index: number
          ref_id: string
          step_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          milestone_id: string
          order_index?: number
          ref_id: string
          step_type: string
        }
        Update: {
          created_at?: string
          id?: string
          milestone_id?: string
          order_index?: number
          ref_id?: string
          step_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "lp_steps_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "lp_milestones"
            referencedColumns: ["id"]
          },
        ]
      }
      lp_units: {
        Row: {
          category_id: string
          created_at: string
          id: string
          order_index: number
          secondary_program_id: string
          title: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          order_index?: number
          secondary_program_id: string
          title: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          order_index?: number
          secondary_program_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "lp_units_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "courses_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lp_units_secondary_program_id_fkey"
            columns: ["secondary_program_id"]
            isOneToOne: false
            referencedRelation: "secondary_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lp_units_secondary_program_id_fkey"
            columns: ["secondary_program_id"]
            isOneToOne: false
            referencedRelation: "vw_available_secondary_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachments: Json[] | null
          chat_room_id: string | null
          content: string
          created_at: string | null
          deleted: string[] | null
          id: string
          parent_message_id: string | null
          reads: string[] | null
          user_id: string | null
        }
        Insert: {
          attachments?: Json[] | null
          chat_room_id?: string | null
          content: string
          created_at?: string | null
          deleted?: string[] | null
          id?: string
          parent_message_id?: string | null
          reads?: string[] | null
          user_id?: string | null
        }
        Update: {
          attachments?: Json[] | null
          chat_room_id?: string | null
          content?: string
          created_at?: string | null
          deleted?: string[] | null
          id?: string
          parent_message_id?: string | null
          reads?: string[] | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_room_id_fkey"
            columns: ["chat_room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      news: {
        Row: {
          action_data: Json | null
          action_type: string | null
          author_id: string | null
          background_color: string | null
          badge_color: string | null
          badge_text: string | null
          card_style: string | null
          category: string | null
          click_count: number | null
          content: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          end_date: string | null
          id: string
          is_featured: boolean | null
          max_display_count: number | null
          media_alt_text: string | null
          media_type: string | null
          media_url: string | null
          priority: number | null
          published_at: string | null
          require_authentication: boolean | null
          share_count: number | null
          show_badge: boolean | null
          show_for_new_users_only: boolean | null
          start_date: string
          status: string | null
          subtitle: string | null
          tags: Json | null
          target_audience: string | null
          target_programs: Json | null
          target_user_types: Json | null
          text_color: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          video_duration: number | null
          view_count: number | null
        }
        Insert: {
          action_data?: Json | null
          action_type?: string | null
          author_id?: string | null
          background_color?: string | null
          badge_color?: string | null
          badge_text?: string | null
          card_style?: string | null
          category?: string | null
          click_count?: number | null
          content?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          end_date?: string | null
          id?: string
          is_featured?: boolean | null
          max_display_count?: number | null
          media_alt_text?: string | null
          media_type?: string | null
          media_url?: string | null
          priority?: number | null
          published_at?: string | null
          require_authentication?: boolean | null
          share_count?: number | null
          show_badge?: boolean | null
          show_for_new_users_only?: boolean | null
          start_date: string
          status?: string | null
          subtitle?: string | null
          tags?: Json | null
          target_audience?: string | null
          target_programs?: Json | null
          target_user_types?: Json | null
          text_color?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          video_duration?: number | null
          view_count?: number | null
        }
        Update: {
          action_data?: Json | null
          action_type?: string | null
          author_id?: string | null
          background_color?: string | null
          badge_color?: string | null
          badge_text?: string | null
          card_style?: string | null
          category?: string | null
          click_count?: number | null
          content?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          end_date?: string | null
          id?: string
          is_featured?: boolean | null
          max_display_count?: number | null
          media_alt_text?: string | null
          media_type?: string | null
          media_url?: string | null
          priority?: number | null
          published_at?: string | null
          require_authentication?: boolean | null
          share_count?: number | null
          show_badge?: boolean | null
          show_for_new_users_only?: boolean | null
          start_date?: string
          status?: string | null
          subtitle?: string | null
          tags?: Json | null
          target_audience?: string | null
          target_programs?: Json | null
          target_user_types?: Json | null
          text_color?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          video_duration?: number | null
          view_count?: number | null
        }
        Relationships: []
      }
      news_interactions: {
        Row: {
          id: string
          interacted_at: string | null
          interaction_type: string
          metadata: Json | null
          news_id: string
          user_id: string
        }
        Insert: {
          id?: string
          interacted_at?: string | null
          interaction_type: string
          metadata?: Json | null
          news_id: string
          user_id: string
        }
        Update: {
          id?: string
          interacted_at?: string | null
          interaction_type?: string
          metadata?: Json | null
          news_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_interactions_news_id_fkey"
            columns: ["news_id"]
            isOneToOne: false
            referencedRelation: "news"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_interactions_news_id_fkey"
            columns: ["news_id"]
            isOneToOne: false
            referencedRelation: "news_stats"
            referencedColumns: ["news_id"]
          },
        ]
      }
      news_views: {
        Row: {
          device_info: Json | null
          id: string
          news_id: string
          session_id: string | null
          user_id: string
          viewed_at: string | null
        }
        Insert: {
          device_info?: Json | null
          id?: string
          news_id: string
          session_id?: string | null
          user_id: string
          viewed_at?: string | null
        }
        Update: {
          device_info?: Json | null
          id?: string
          news_id?: string
          session_id?: string | null
          user_id?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "news_views_news_id_fkey"
            columns: ["news_id"]
            isOneToOne: false
            referencedRelation: "news"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_views_news_id_fkey"
            columns: ["news_id"]
            isOneToOne: false
            referencedRelation: "news_stats"
            referencedColumns: ["news_id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          data: Json
          id: string
          read_at: string | null
          sent_push: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          data?: Json
          id?: string
          read_at?: string | null
          sent_push?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          data?: Json
          id?: string
          read_at?: string | null
          sent_push?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      participants: {
        Row: {
          chat_room_id: string | null
          created_at: string | null
          id: string
          userId: string
        }
        Insert: {
          chat_room_id?: string | null
          created_at?: string | null
          id?: string
          userId: string
        }
        Update: {
          chat_room_id?: string | null
          created_at?: string | null
          id?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "participants_chat_room_id_fkey"
            columns: ["chat_room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participants_userid_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_status: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          payment_id: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_id?: string | null
          status: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_status_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          cart_id: string | null
          created_at: string | null
          id: string
          payment_provider: string | null
          payment_reference: string | null
          phone_number: string
          promo_code_id: string | null
          status: string | null
          trx_reference: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          cart_id?: string | null
          created_at?: string | null
          id?: string
          payment_provider?: string | null
          payment_reference?: string | null
          phone_number: string
          promo_code_id?: string | null
          status?: string | null
          trx_reference: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          cart_id?: string | null
          created_at?: string | null
          id?: string
          payment_provider?: string | null
          payment_reference?: string | null
          phone_number?: string
          promo_code_id?: string | null
          status?: string | null
          trx_reference?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_promo_code_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "influencers"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          can_create: boolean | null
          can_delete: boolean | null
          can_read: boolean | null
          can_update: boolean | null
          created_at: string
          id: string
          role_id: string | null
        }
        Insert: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_read?: boolean | null
          can_update?: boolean | null
          created_at?: string
          id?: string
          role_id?: string | null
        }
        Update: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_read?: boolean | null
          can_update?: boolean | null
          created_at?: string
          id?: string
          role_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_options: {
        Row: {
          created_at: string
          id: string
          label: string
          position: number
          post_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          position?: number
          post_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          position?: number
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_options_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          created_at: string
          id: string
          option_id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_id: string
          post_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          option_id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          media_urls: string[]
          mentioned_user_ids: string[]
          parent_comment_id: string | null
          post_id: string
          score: number
          updated_at: string
        }
        Insert: {
          author_id?: string
          content: string
          created_at?: string
          id?: string
          media_urls?: string[]
          mentioned_user_ids?: string[]
          parent_comment_id?: string | null
          post_id: string
          score?: number
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          media_urls?: string[]
          mentioned_user_ids?: string[]
          parent_comment_id?: string | null
          post_id?: string
          score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_code_usage: {
        Row: {
          created_at: string
          discount_amount: number
          id: string
          influencer_id: string
          payment_id: string
        }
        Insert: {
          created_at?: string
          discount_amount: number
          id?: string
          influencer_id: string
          payment_id: string
        }
        Update: {
          created_at?: string
          discount_amount?: number
          id?: string
          influencer_id?: string
          payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_code_usage_influencer_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_code_usage_payment_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz: {
        Row: {
          accessKey: string | null
          category: string | null
          course: number | null
          course_content: number | null
          created_at: string
          description: string | null
          enonce: string | null
          groups: string[] | null
          id: string
          image: Json | null
          isExerciseMode: boolean | null
          learners: string[] | null
          name: string
          selectedCourses: string[] | null
          status: boolean
          tags: string[] | null
        }
        Insert: {
          accessKey?: string | null
          category?: string | null
          course?: number | null
          course_content?: number | null
          created_at?: string
          description?: string | null
          enonce?: string | null
          groups?: string[] | null
          id?: string
          image?: Json | null
          isExerciseMode?: boolean | null
          learners?: string[] | null
          name?: string
          selectedCourses?: string[] | null
          status?: boolean
          tags?: string[] | null
        }
        Update: {
          accessKey?: string | null
          category?: string | null
          course?: number | null
          course_content?: number | null
          created_at?: string
          description?: string | null
          enonce?: string | null
          groups?: string[] | null
          id?: string
          image?: Json | null
          isExerciseMode?: boolean | null
          learners?: string[] | null
          name?: string
          selectedCourses?: string[] | null
          status?: boolean
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_category_fkey"
            columns: ["category"]
            isOneToOne: false
            referencedRelation: "courses_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_course_content_fkey"
            columns: ["course_content"]
            isOneToOne: false
            referencedRelation: "courses_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_course_fkey"
            columns: ["course"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          answers: Json | null
          current_question_index: number | null
          daily_content_item_id: string | null
          end_time: string | null
          id: number
          last_modified_at: string | null
          program_id: string | null
          quiz_id: string | null
          score: number | null
          selected_answers: string[] | null
          start_time: string | null
          status: string | null
          timeSpent: number | null
          user_id: string | null
        }
        Insert: {
          answers?: Json | null
          current_question_index?: number | null
          daily_content_item_id?: string | null
          end_time?: string | null
          id?: number
          last_modified_at?: string | null
          program_id?: string | null
          quiz_id?: string | null
          score?: number | null
          selected_answers?: string[] | null
          start_time?: string | null
          status?: string | null
          timeSpent?: number | null
          user_id?: string | null
        }
        Update: {
          answers?: Json | null
          current_question_index?: number | null
          daily_content_item_id?: string | null
          end_time?: string | null
          id?: number
          last_modified_at?: string | null
          program_id?: string | null
          quiz_id?: string | null
          score?: number | null
          selected_answers?: string[] | null
          start_time?: string | null
          status?: string | null
          timeSpent?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_daily_content_item_id_fkey"
            columns: ["daily_content_item_id"]
            isOneToOne: false
            referencedRelation: "secondary_daily_content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "secondary_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "vw_available_secondary_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quiz"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_courses: {
        Row: {
          courseId: number | null
          created_at: string
          id: number
          quizId: string | null
        }
        Insert: {
          courseId?: number | null
          created_at?: string
          id?: number
          quizId?: string | null
        }
        Update: {
          courseId?: number | null
          created_at?: string
          id?: number
          quizId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_courses_courseId_fkey"
            columns: ["courseId"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_courses_quizId_fkey"
            columns: ["quizId"]
            isOneToOne: false
            referencedRelation: "quiz"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_duplicate: {
        Row: {
          accessKey: string | null
          category: string | null
          course: number | null
          course_content: number | null
          created_at: string
          description: string | null
          enonce: string | null
          groups: string[] | null
          id: string
          image: Json | null
          isExerciseMode: boolean | null
          learners: string[] | null
          name: string
          selectedCourses: string[] | null
          status: boolean
          tags: string[] | null
        }
        Insert: {
          accessKey?: string | null
          category?: string | null
          course?: number | null
          course_content?: number | null
          created_at?: string
          description?: string | null
          enonce?: string | null
          groups?: string[] | null
          id?: string
          image?: Json | null
          isExerciseMode?: boolean | null
          learners?: string[] | null
          name?: string
          selectedCourses?: string[] | null
          status?: boolean
          tags?: string[] | null
        }
        Update: {
          accessKey?: string | null
          category?: string | null
          course?: number | null
          course_content?: number | null
          created_at?: string
          description?: string | null
          enonce?: string | null
          groups?: string[] | null
          id?: string
          image?: Json | null
          isExerciseMode?: boolean | null
          learners?: string[] | null
          name?: string
          selectedCourses?: string[] | null
          status?: boolean
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_duplicate_category_fkey"
            columns: ["category"]
            isOneToOne: false
            referencedRelation: "courses_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_duplicate_course_content_fkey"
            columns: ["course_content"]
            isOneToOne: false
            referencedRelation: "courses_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_duplicate_course_fkey"
            columns: ["course"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_learningpath: {
        Row: {
          created_at: string
          id: string
          lpId: string | null
          quizId: string | null
          source: string
        }
        Insert: {
          created_at?: string
          id?: string
          lpId?: string | null
          quizId?: string | null
          source?: string
        }
        Update: {
          created_at?: string
          id?: string
          lpId?: string | null
          quizId?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_learningPath_lpId_fkey"
            columns: ["lpId"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_learningPath_quizId_fkey"
            columns: ["quizId"]
            isOneToOne: false
            referencedRelation: "quiz"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_pin: {
        Row: {
          created_at: string
          id: number
          is_pinned: boolean | null
          quiz_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          is_pinned?: boolean | null
          quiz_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          is_pinned?: boolean | null
          quiz_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_pin_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quiz"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_pin_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_question_template: {
        Row: {
          content: Json | null
          correct: string[] | null
          created_at: string
          details: Json[] | null
          difficulty: number | null
          group_id: string | null
          hasDetails: boolean | null
          hasEditor: boolean | null
          hasImg: boolean | null
          id: number
          image: Json | null
          isMultiple: boolean | null
          last_modify_at: string | null
          name: string | null
          options: Json[] | null
          order: number | null
          tag: string[] | null
          tags: string[] | null
          title: string | null
          type: string | null
        }
        Insert: {
          content?: Json | null
          correct?: string[] | null
          created_at?: string
          details?: Json[] | null
          difficulty?: number | null
          group_id?: string | null
          hasDetails?: boolean | null
          hasEditor?: boolean | null
          hasImg?: boolean | null
          id?: number
          image?: Json | null
          isMultiple?: boolean | null
          last_modify_at?: string | null
          name?: string | null
          options?: Json[] | null
          order?: number | null
          tag?: string[] | null
          tags?: string[] | null
          title?: string | null
          type?: string | null
        }
        Update: {
          content?: Json | null
          correct?: string[] | null
          created_at?: string
          details?: Json[] | null
          difficulty?: number | null
          group_id?: string | null
          hasDetails?: boolean | null
          hasEditor?: boolean | null
          hasImg?: boolean | null
          id?: number
          image?: Json | null
          isMultiple?: boolean | null
          last_modify_at?: string | null
          name?: string | null
          options?: Json[] | null
          order?: number | null
          tag?: string[] | null
          tags?: string[] | null
          title?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_question_template_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          content: Json | null
          correct: string[] | null
          created_at: string
          details: Json[] | null
          hasDetails: boolean | null
          hasEditor: boolean | null
          hasImg: boolean | null
          id: number
          image: Json | null
          isMultiple: boolean | null
          justificatif: string | null
          last_modify_at: string | null
          name: string | null
          options: Json[] | null
          order: number | null
          quizId: string
          title: string | null
          type: string | null
        }
        Insert: {
          content?: Json | null
          correct?: string[] | null
          created_at?: string
          details?: Json[] | null
          hasDetails?: boolean | null
          hasEditor?: boolean | null
          hasImg?: boolean | null
          id?: number
          image?: Json | null
          isMultiple?: boolean | null
          justificatif?: string | null
          last_modify_at?: string | null
          name?: string | null
          options?: Json[] | null
          order?: number | null
          quizId: string
          title?: string | null
          type?: string | null
        }
        Update: {
          content?: Json | null
          correct?: string[] | null
          created_at?: string
          details?: Json[] | null
          hasDetails?: boolean | null
          hasEditor?: boolean | null
          hasImg?: boolean | null
          id?: number
          image?: Json | null
          isMultiple?: boolean | null
          justificatif?: string | null
          last_modify_at?: string | null
          name?: string | null
          options?: Json[] | null
          order?: number | null
          quizId?: string
          title?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quizid_fkey"
            columns: ["quizId"]
            isOneToOne: false
            referencedRelation: "quiz"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_tags: {
        Row: {
          quiz_id: string
          tag_id: string
        }
        Insert: {
          quiz_id: string
          tag_id: string
        }
        Update: {
          quiz_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_tags_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quiz"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_permissions: {
        Row: {
          can_create: boolean | null
          can_delete: boolean | null
          can_read: boolean | null
          can_update: boolean | null
          created_at: string
          id: string
          resource_id: string
          role_id: string | null
          user_id: string | null
        }
        Insert: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_read?: boolean | null
          can_update?: boolean | null
          created_at?: string
          id?: string
          resource_id: string
          role_id?: string | null
          user_id?: string | null
        }
        Update: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_read?: boolean | null
          can_update?: boolean | null
          created_at?: string
          id?: string
          resource_id?: string
          role_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resource_permissions_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "ressources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ressources: {
        Row: {
          code: string | null
          created_at: string
          id: string
          name: string | null
          slug: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          name?: string | null
          slug?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          name?: string | null
          slug?: string | null
        }
        Relationships: []
      }
      rewards: {
        Row: {
          earned_at: string | null
          id: string
          reward_description: string | null
          reward_type: string | null
          user_id: string | null
        }
        Insert: {
          earned_at?: string | null
          id?: string
          reward_description?: string | null
          reward_type?: string | null
          user_id?: string | null
        }
        Update: {
          earned_at?: string | null
          id?: string
          reward_description?: string | null
          reward_type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rewards_user_id_fkey1"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      school_locations: {
        Row: {
          city_id: string
          created_at: string
          id: string
          school_id: string
        }
        Insert: {
          city_id: string
          created_at?: string
          id?: string
          school_id: string
        }
        Update: {
          city_id?: string
          created_at?: string
          id?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_locations_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_locations_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "vw_concours_details"
            referencedColumns: ["city_id"]
          },
          {
            foreignKeyName: "school_locations_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "vw_schools_with_locations"
            referencedColumns: ["city_id"]
          },
          {
            foreignKeyName: "school_locations_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "vw_upcoming_concours"
            referencedColumns: ["city_id"]
          },
          {
            foreignKeyName: "school_locations_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_locations_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "vw_concours_details"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "school_locations_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "vw_schools_with_locations"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "school_locations_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "vw_upcoming_concours"
            referencedColumns: ["school_id"]
          },
        ]
      }
      schools: {
        Row: {
          brand: Json | null
          created_at: string
          description: string | null
          id: string
          imageUrl: string | null
          isActive: boolean | null
          localisation: string | null
          name: string | null
          sigle: string | null
          subdomain: string
          tenant_id: string
        }
        Insert: {
          brand?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          imageUrl?: string | null
          isActive?: boolean | null
          localisation?: string | null
          name?: string | null
          sigle?: string | null
          subdomain?: string
          tenant_id?: string
        }
        Update: {
          brand?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          imageUrl?: string | null
          isActive?: boolean | null
          localisation?: string | null
          name?: string | null
          sigle?: string | null
          subdomain?: string
          tenant_id?: string
        }
        Relationships: []
      }
      secondary_classes: {
        Row: {
          country_id: string | null
          created_at: string | null
          description: string | null
          id: string
          level: number
          name: string
          updated_at: string | null
        }
        Insert: {
          country_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          level: number
          name: string
          updated_at?: string | null
        }
        Update: {
          country_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          level?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "secondary_classes_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      secondary_daily_content: {
        Row: {
          created_at: string
          generated_at: string
          id: string
          program_id: string
          selection_mode: string
          target_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          generated_at?: string
          id?: string
          program_id: string
          selection_mode?: string
          target_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          generated_at?: string
          id?: string
          program_id?: string
          selection_mode?: string
          target_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "secondary_daily_content_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "secondary_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secondary_daily_content_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "vw_available_secondary_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      secondary_daily_content_items: {
        Row: {
          course_id: number | null
          created_at: string
          daily_content_id: string
          exercise_id: string | null
          id: string
          item_type: string
          order_index: number
          quiz_id: string | null
          updated_at: string
        }
        Insert: {
          course_id?: number | null
          created_at?: string
          daily_content_id: string
          exercise_id?: string | null
          id?: string
          item_type: string
          order_index?: number
          quiz_id?: string | null
          updated_at?: string
        }
        Update: {
          course_id?: number | null
          created_at?: string
          daily_content_id?: string
          exercise_id?: string | null
          id?: string
          item_type?: string
          order_index?: number
          quiz_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "secondary_daily_content_items_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secondary_daily_content_items_daily_content_id_fkey"
            columns: ["daily_content_id"]
            isOneToOne: false
            referencedRelation: "secondary_daily_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secondary_daily_content_items_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secondary_daily_content_items_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quiz"
            referencedColumns: ["id"]
          },
        ]
      }
      secondary_daily_user_progress: {
        Row: {
          completed_at: string | null
          completion_source: string
          created_at: string
          daily_content_item_id: string
          id: string
          is_completed: boolean
          metadata: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          completion_source?: string
          created_at?: string
          daily_content_item_id: string
          id?: string
          is_completed?: boolean
          metadata?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          completion_source?: string
          created_at?: string
          daily_content_item_id?: string
          id?: string
          is_completed?: boolean
          metadata?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "secondary_daily_user_progress_daily_content_item_id_fkey"
            columns: ["daily_content_item_id"]
            isOneToOne: false
            referencedRelation: "secondary_daily_content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secondary_daily_user_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      secondary_document_category_links: {
        Row: {
          category_id: string | null
          created_at: string | null
          document_id: string | null
          id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          document_id?: string | null
          id?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          document_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "secondary_document_category_links_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "courses_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secondary_document_category_links_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "secondary_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      secondary_document_folders: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          order_index: number | null
          parent_folder_id: string | null
          program_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          order_index?: number | null
          parent_folder_id?: string | null
          program_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          order_index?: number | null
          parent_folder_id?: string | null
          program_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "secondary_document_folders_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "secondary_document_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secondary_document_folders_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "secondary_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secondary_document_folders_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "vw_available_secondary_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      secondary_documents: {
        Row: {
          correction_document_id: string | null
          created_at: string | null
          description: string | null
          download_url: string | null
          file_size: number | null
          file_type: string | null
          folder_id: string | null
          id: string
          is_correction: boolean | null
          name: string
          order_index: number | null
          storage_object_id: string | null
          storage_path: string
          updated_at: string | null
        }
        Insert: {
          correction_document_id?: string | null
          created_at?: string | null
          description?: string | null
          download_url?: string | null
          file_size?: number | null
          file_type?: string | null
          folder_id?: string | null
          id?: string
          is_correction?: boolean | null
          name: string
          order_index?: number | null
          storage_object_id?: string | null
          storage_path: string
          updated_at?: string | null
        }
        Update: {
          correction_document_id?: string | null
          created_at?: string | null
          description?: string | null
          download_url?: string | null
          file_size?: number | null
          file_type?: string | null
          folder_id?: string | null
          id?: string
          is_correction?: boolean | null
          name?: string
          order_index?: number | null
          storage_object_id?: string | null
          storage_path?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "secondary_documents_correction_document_id_fkey"
            columns: ["correction_document_id"]
            isOneToOne: false
            referencedRelation: "secondary_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secondary_documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "secondary_document_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      secondary_documents_complete: {
        Row: {
          completed_at: string | null
          created_at: string | null
          document_id: string
          id: string
          is_completed: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          document_id: string
          id?: string
          is_completed?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          document_id?: string
          id?: string
          is_completed?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "secondary_documents_complete_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "secondary_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      secondary_documents_pin: {
        Row: {
          created_at: string | null
          document_id: string
          id: string
          is_pinned: boolean | null
          pinned_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          document_id: string
          id?: string
          is_pinned?: boolean | null
          pinned_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          document_id?: string
          id?: string
          is_pinned?: boolean | null
          pinned_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "secondary_documents_pin_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "secondary_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      secondary_program_courses: {
        Row: {
          course_id: number | null
          created_at: string | null
          id: string
          order_index: number | null
          program_id: string | null
        }
        Insert: {
          course_id?: number | null
          created_at?: string | null
          id?: string
          order_index?: number | null
          program_id?: string | null
        }
        Update: {
          course_id?: number | null
          created_at?: string | null
          id?: string
          order_index?: number | null
          program_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "secondary_program_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secondary_program_courses_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "secondary_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secondary_program_courses_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "vw_available_secondary_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      secondary_program_documents: {
        Row: {
          created_at: string | null
          document_id: string | null
          id: string
          is_active: boolean | null
          program_id: string | null
        }
        Insert: {
          created_at?: string | null
          document_id?: string | null
          id?: string
          is_active?: boolean | null
          program_id?: string | null
        }
        Update: {
          created_at?: string | null
          document_id?: string | null
          id?: string
          is_active?: boolean | null
          program_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "secondary_program_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "secondary_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secondary_program_documents_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "secondary_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secondary_program_documents_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "vw_available_secondary_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      secondary_program_exercises: {
        Row: {
          created_at: string | null
          exercise_id: string | null
          id: string
          is_active: boolean | null
          program_id: string | null
        }
        Insert: {
          created_at?: string | null
          exercise_id?: string | null
          id?: string
          is_active?: boolean | null
          program_id?: string | null
        }
        Update: {
          created_at?: string | null
          exercise_id?: string | null
          id?: string
          is_active?: boolean | null
          program_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "secondary_program_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secondary_program_exercises_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "secondary_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secondary_program_exercises_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "vw_available_secondary_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      secondary_program_quizzes: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          order_index: number | null
          program_id: string | null
          quiz_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          order_index?: number | null
          program_id?: string | null
          quiz_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          order_index?: number | null
          program_id?: string | null
          quiz_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "secondary_program_quizzes_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "secondary_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secondary_program_quizzes_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "vw_available_secondary_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secondary_program_quizzes_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quiz"
            referencedColumns: ["id"]
          },
        ]
      }
      secondary_programs: {
        Row: {
          class_id: string | null
          course_count: number | null
          created_at: string | null
          description: string | null
          document_count: number | null
          duration: string | null
          exercise_count: number | null
          id: string
          image: Json | null
          is_active: boolean | null
          learning_path_id: string | null
          price: number
          quiz_count: number | null
          series_id: string | null
          updated_at: string | null
        }
        Insert: {
          class_id?: string | null
          course_count?: number | null
          created_at?: string | null
          description?: string | null
          document_count?: number | null
          duration?: string | null
          exercise_count?: number | null
          id?: string
          image?: Json | null
          is_active?: boolean | null
          learning_path_id?: string | null
          price?: number
          quiz_count?: number | null
          series_id?: string | null
          updated_at?: string | null
        }
        Update: {
          class_id?: string | null
          course_count?: number | null
          created_at?: string | null
          description?: string | null
          document_count?: number | null
          duration?: string | null
          exercise_count?: number | null
          id?: string
          image?: Json | null
          is_active?: boolean | null
          learning_path_id?: string | null
          price?: number
          quiz_count?: number | null
          series_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "secondary_programs_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "secondary_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secondary_programs_learning_path_id_fkey"
            columns: ["learning_path_id"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secondary_programs_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "secondary_series"
            referencedColumns: ["id"]
          },
        ]
      }
      secondary_series: {
        Row: {
          class_id: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          class_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "secondary_series_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "secondary_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_invitations: {
        Row: {
          created_at: string | null
          email: string
          id: string
          invitation_sent_at: string | null
          invited_by: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          invitation_sent_at?: string | null
          invited_by?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          invitation_sent_at?: string | null
          invited_by?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      started_exams: {
        Row: {
          answers: Json | null
          closed_at: string | null
          created_at: string
          end: boolean | null
          id: number
          proctoring_issues: Json | null
          quiz_id: string | null
          score: number | null
          total_xp_gained: number | null
          try: number | null
          user_id: string | null
        }
        Insert: {
          answers?: Json | null
          closed_at?: string | null
          created_at?: string
          end?: boolean | null
          id?: number
          proctoring_issues?: Json | null
          quiz_id?: string | null
          score?: number | null
          total_xp_gained?: number | null
          try?: number | null
          user_id?: string | null
        }
        Update: {
          answers?: Json | null
          closed_at?: string | null
          created_at?: string
          end?: boolean | null
          id?: number
          proctoring_issues?: Json | null
          quiz_id?: string | null
          score?: number | null
          total_xp_gained?: number | null
          try?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "started_exams_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quiz"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "started_exams_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      started_exams_questions: {
        Row: {
          created_at: string
          id: number
          options: Json | null
          questionId: Json | null
          started_exams_id: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          options?: Json | null
          questionId?: Json | null
          started_exams_id?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          options?: Json | null
          questionId?: Json | null
          started_exams_id?: string | null
        }
        Relationships: []
      }
      streak_logs: {
        Row: {
          created_at: string | null
          id: string
          streak_count: number | null
          streak_date: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          streak_count?: number | null
          streak_date?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          streak_count?: number | null
          streak_date?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      study_cycles: {
        Row: {
          created_at: string
          id: string
          level: number
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          level: number
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: number
          name?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      tags_content: {
        Row: {
          content_id: string
          content_type: string
          created_at: string | null
          id: string
          tag_id: string | null
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string | null
          id?: string
          tag_id?: string | null
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string | null
          id?: string
          tag_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tags_content_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: string | null
          class_id: string | null
          created_at: string
          email: string | null
          id: string
          last: string | null
          months: number | null
        }
        Insert: {
          amount?: string | null
          class_id?: string | null
          created_at?: string
          email?: string | null
          id: string
          last?: string | null
          months?: number | null
        }
        Update: {
          amount?: string | null
          class_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last?: string | null
          months?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity: {
        Row: {
          created_at: string | null
          device_type: Database["public"]["Enums"]["learning_session_type"]
          duration: number | null
          id: string
          last_heartbeat: string | null
          session_start: string | null
          status: Database["public"]["Enums"]["user_activity_status"] | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          device_type: Database["public"]["Enums"]["learning_session_type"]
          duration?: number | null
          id?: string
          last_heartbeat?: string | null
          session_start?: string | null
          status?: Database["public"]["Enums"]["user_activity_status"] | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          device_type?: Database["public"]["Enums"]["learning_session_type"]
          duration?: number | null
          id?: string
          last_heartbeat?: string | null
          session_start?: string | null
          status?: Database["public"]["Enums"]["user_activity_status"] | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_answers: {
        Row: {
          attempt_id: number | null
          id: number
          is_correct: boolean | null
          question_id: number | null
          selected_options: string[] | null
          submitted_at: string | null
          time_taken: number | null
        }
        Insert: {
          attempt_id?: number | null
          id?: number
          is_correct?: boolean | null
          question_id?: number | null
          selected_options?: string[] | null
          submitted_at?: string | null
          time_taken?: number | null
        }
        Update: {
          attempt_id?: number | null
          id?: number
          is_correct?: boolean | null
          question_id?: number | null
          selected_options?: string[] | null
          submitted_at?: string | null
          time_taken?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "quiz_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_challenges: {
        Row: {
          challenge_id: string
          completed: boolean | null
          completion_date: string | null
          id: string
          progress: number | null
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed?: boolean | null
          completion_date?: string | null
          id?: string
          progress?: number | null
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed?: boolean | null
          completion_date?: string | null
          id?: string
          progress?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_challenges_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_competition_payment_status: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          payment_id: string
          status: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_id: string
          status: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_competition_payment_status_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "user_competition_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_competition_payments: {
        Row: {
          amount: number
          authorizationurl: string | null
          competition_id: string
          created_at: string | null
          expiry_date: string
          has_seen_results: boolean | null
          id: string
          payment_date: string | null
          payment_provider: string | null
          payment_reference: string | null
          payment_status: string
          phone_number: string | null
          promo_code_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          authorizationurl?: string | null
          competition_id: string
          created_at?: string | null
          expiry_date: string
          has_seen_results?: boolean | null
          id?: string
          payment_date?: string | null
          payment_provider?: string | null
          payment_reference?: string | null
          payment_status?: string
          phone_number?: string | null
          promo_code_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          authorizationurl?: string | null
          competition_id?: string
          created_at?: string | null
          expiry_date?: string
          has_seen_results?: boolean | null
          id?: string
          payment_date?: string | null
          payment_provider?: string | null
          payment_reference?: string | null
          payment_status?: string
          phone_number?: string | null
          promo_code_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_competition_payments_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "concours"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_competition_payments_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "vw_concours_details"
            referencedColumns: ["concours_id"]
          },
          {
            foreignKeyName: "user_competition_payments_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "vw_upcoming_concours"
            referencedColumns: ["concours_id"]
          },
          {
            foreignKeyName: "user_competition_payments_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "influencers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_complete_exercices: {
        Row: {
          created_at: string
          exercice_id: string | null
          id: number
          is_completed: boolean | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          exercice_id?: string | null
          id?: number
          is_completed?: boolean | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          exercice_id?: string | null
          id?: number
          is_completed?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_complete_exercices_exercice_id_fkey"
            columns: ["exercice_id"]
            isOneToOne: false
            referencedRelation: "exercices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_complete_exercices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_completed_archives: {
        Row: {
          archive_id: number
          completed_at: string | null
          id: number
          user_id: string
        }
        Insert: {
          archive_id: number
          completed_at?: string | null
          id?: number
          user_id: string
        }
        Update: {
          archive_id?: number
          completed_at?: string | null
          id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_completed_archives_archive_id_fkey"
            columns: ["archive_id"]
            isOneToOne: false
            referencedRelation: "concours_archives"
            referencedColumns: ["id"]
          },
        ]
      }
      user_exam_sessions: {
        Row: {
          answers: Json | null
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          is_completed: boolean | null
          quiz_id: string
          score: number | null
          started_at: string
          user_id: string | null
        }
        Insert: {
          answers?: Json | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          is_completed?: boolean | null
          quiz_id: string
          score?: number | null
          started_at?: string
          user_id?: string | null
        }
        Update: {
          answers?: Json | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          is_completed?: boolean | null
          quiz_id?: string
          score?: number | null
          started_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_notification_history: {
        Row: {
          hours_remaining: number
          id: number
          message_hash: string
          message_tone: string | null
          notification_type: string | null
          sent_at: string | null
          streak_count: number | null
          user_id: string
        }
        Insert: {
          hours_remaining: number
          id?: number
          message_hash: string
          message_tone?: string | null
          notification_type?: string | null
          sent_at?: string | null
          streak_count?: number | null
          user_id: string
        }
        Update: {
          hours_remaining?: number
          id?: number
          message_hash?: string
          message_tone?: string | null
          notification_type?: string | null
          sent_at?: string | null
          streak_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notification_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_pinned_archive: {
        Row: {
          archive_id: number | null
          created_at: string
          id: string
          is_pinned: boolean | null
          user_id: string | null
        }
        Insert: {
          archive_id?: number | null
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          user_id?: string | null
        }
        Update: {
          archive_id?: number | null
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_pinned_archive_archive_id_fkey"
            columns: ["archive_id"]
            isOneToOne: false
            referencedRelation: "concours_archives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_pinned_archive_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          has_paid: boolean | null
          id: string
          school: string | null
          series: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          has_paid?: boolean | null
          id: string
          school?: string | null
          series?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          has_paid?: boolean | null
          id?: string
          school?: string | null
          series?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_program_enrollments: {
        Row: {
          created_at: string | null
          expiry_date: string
          id: number
          program_id: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expiry_date: string
          id?: never
          program_id: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          expiry_date?: string
          id?: never
          program_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_program_enrollments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "concours_learningpaths"
            referencedColumns: ["id"]
          },
        ]
      }
      user_program_payments: {
        Row: {
          amount: number
          created_at: string | null
          current_installment: number | null
          expiry_date: string
          has_seen_result: boolean | null
          id: string
          is_installment: boolean | null
          next_payment_due_date: string | null
          parent_payment_id: string | null
          payment_date: string | null
          payment_provider: string | null
          payment_reference: string | null
          payment_status: string
          phone_number: string | null
          program_id: number
          promo_code_id: string | null
          total_amount: number | null
          total_installments: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          current_installment?: number | null
          expiry_date: string
          has_seen_result?: boolean | null
          id?: string
          is_installment?: boolean | null
          next_payment_due_date?: string | null
          parent_payment_id?: string | null
          payment_date?: string | null
          payment_provider?: string | null
          payment_reference?: string | null
          payment_status?: string
          phone_number?: string | null
          program_id: number
          promo_code_id?: string | null
          total_amount?: number | null
          total_installments?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          current_installment?: number | null
          expiry_date?: string
          has_seen_result?: boolean | null
          id?: string
          is_installment?: boolean | null
          next_payment_due_date?: string | null
          parent_payment_id?: string | null
          payment_date?: string | null
          payment_provider?: string | null
          payment_reference?: string | null
          payment_status?: string
          phone_number?: string | null
          program_id?: number
          promo_code_id?: string | null
          total_amount?: number | null
          total_installments?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_program_payments_parent_payment_id_fkey"
            columns: ["parent_payment_id"]
            isOneToOne: false
            referencedRelation: "user_program_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_program_payments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "concours_learningpaths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_program_payments_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "influencers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_secondary_enrollments: {
        Row: {
          enrollment_date: string | null
          expiry_date: string | null
          id: string
          program_id: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          enrollment_date?: string | null
          expiry_date?: string | null
          id?: string
          program_id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          enrollment_date?: string | null
          expiry_date?: string | null
          id?: string
          program_id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_secondary_enrollments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "secondary_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_secondary_enrollments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "vw_available_secondary_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_secondary_payments: {
        Row: {
          amount: number
          created_at: string | null
          expiry_date: string | null
          has_seen_result: boolean | null
          id: string
          payment_date: string | null
          payment_provider: string | null
          payment_reference: string | null
          payment_status: string | null
          phone_number: string | null
          plan: string | null
          program_id: string | null
          promo_code_id: string | null
          transaction_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          expiry_date?: string | null
          has_seen_result?: boolean | null
          id?: string
          payment_date?: string | null
          payment_provider?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          phone_number?: string | null
          plan?: string | null
          program_id?: string | null
          promo_code_id?: string | null
          transaction_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          expiry_date?: string | null
          has_seen_result?: boolean | null
          id?: string
          payment_date?: string | null
          payment_provider?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          phone_number?: string | null
          plan?: string | null
          program_id?: string | null
          promo_code_id?: string | null
          transaction_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_secondary_payments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "secondary_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_secondary_payments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "vw_available_secondary_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_secondary_payments_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "influencers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          created_at: string
          id: number
        }
        Insert: {
          created_at?: string
          id?: number
        }
        Update: {
          created_at?: string
          id?: number
        }
        Relationships: []
      }
      user_signup_status: {
        Row: {
          classe: string | null
          data: Json | null
          email: string
          id: string
          is_email_verified: boolean | null
          is_password_set: boolean | null
          is_payment_done: boolean | null
          name: string | null
          opt_send: boolean | null
          opt_send_time: string | null
          otp_confirm: boolean | null
          phone: number | null
          transaction_id: string | null
          user_id: string | null
        }
        Insert: {
          classe?: string | null
          data?: Json | null
          email: string
          id?: string
          is_email_verified?: boolean | null
          is_password_set?: boolean | null
          is_payment_done?: boolean | null
          name?: string | null
          opt_send?: boolean | null
          opt_send_time?: string | null
          otp_confirm?: boolean | null
          phone?: number | null
          transaction_id?: string | null
          user_id?: string | null
        }
        Update: {
          classe?: string | null
          data?: Json | null
          email?: string
          id?: string
          is_email_verified?: boolean | null
          is_password_set?: boolean | null
          is_payment_done?: boolean | null
          name?: string | null
          opt_send?: boolean | null
          opt_send_time?: string | null
          otp_confirm?: boolean | null
          phone?: number | null
          transaction_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_signup_status_classe_fkey"
            columns: ["classe"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      user_step_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          score: number | null
          status: string
          step_id: string
          updated_at: string
          user_id: string
          xp_earned: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          score?: number | null
          status?: string
          step_id: string
          updated_at?: string
          user_id: string
          xp_earned?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          score?: number | null
          status?: string
          step_id?: string
          updated_at?: string
          user_id?: string
          xp_earned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_step_progress_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "lp_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_step_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_streaks: {
        Row: {
          created_at: string | null
          current_streak: number | null
          id: string
          last_updated: string | null
          max_streak: number | null
          next_deadline: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_updated?: string | null
          max_streak?: number | null
          next_deadline?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_updated?: string | null
          max_streak?: number | null
          next_deadline?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_streaks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_xp: {
        Row: {
          total_xp: number
          userid: string
        }
        Insert: {
          total_xp?: number
          userid: string
        }
        Update: {
          total_xp?: number
          userid?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_xp_userid_fkey"
            columns: ["userid"]
            isOneToOne: true
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      usercourseprogress: {
        Row: {
          courseid: number
          enrollmentdate: string
          id: number
          lastaccessed: string | null
          progress: number | null
          sectionid: number | null
          userid: string
        }
        Insert: {
          courseid: number
          enrollmentdate?: string
          id?: number
          lastaccessed?: string | null
          progress?: number | null
          sectionid?: number | null
          userid: string
        }
        Update: {
          courseid?: number
          enrollmentdate?: string
          id?: number
          lastaccessed?: string | null
          progress?: number | null
          sectionid?: number | null
          userid?: string
        }
        Relationships: [
          {
            foreignKeyName: "usercourseprogress_courseid_fkey"
            columns: ["courseid"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usercourseprogress_sectionid_fkey"
            columns: ["sectionid"]
            isOneToOne: false
            referencedRelation: "courses_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usercourseprogress_userid_fkey"
            columns: ["userid"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      userquizprogress: {
        Row: {
          correctIds: string[] | null
          enrollmentdate: string
          id: number
          lastaccessed: string | null
          progress: number | null
          questionid: number | null
          quizid: string | null
          score: number | null
          selectedAns: string[] | null
          shouldBeCorrect: string | null
          userid: string
          wrongIds: string[] | null
          xp_gained: number | null
        }
        Insert: {
          correctIds?: string[] | null
          enrollmentdate?: string
          id?: number
          lastaccessed?: string | null
          progress?: number | null
          questionid?: number | null
          quizid?: string | null
          score?: number | null
          selectedAns?: string[] | null
          shouldBeCorrect?: string | null
          userid: string
          wrongIds?: string[] | null
          xp_gained?: number | null
        }
        Update: {
          correctIds?: string[] | null
          enrollmentdate?: string
          id?: number
          lastaccessed?: string | null
          progress?: number | null
          questionid?: number | null
          quizid?: string | null
          score?: number | null
          selectedAns?: string[] | null
          shouldBeCorrect?: string | null
          userid?: string
          wrongIds?: string[] | null
          xp_gained?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "userquizprogress_questionid_fkey"
            columns: ["questionid"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "userquizprogress_quizid_fkey"
            columns: ["quizid"]
            isOneToOne: false
            referencedRelation: "quiz"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "userquizprogress_userid_fkey"
            columns: ["userid"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      view: {
        Row: {
          created_at: string
          id: number
          name: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          name?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          name?: string | null
        }
        Relationships: []
      }
      weekly_top3_likes: {
        Row: {
          created_at: string
          id: string
          liker_id: string
          target_id: string
          week_boundary: string
        }
        Insert: {
          created_at?: string
          id?: string
          liker_id: string
          target_id: string
          week_boundary: string
        }
        Update: {
          created_at?: string
          id?: string
          liker_id?: string
          target_id?: string
          week_boundary?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_top3_likes_liker_id_fkey"
            columns: ["liker_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_top3_likes_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      xp_history: {
        Row: {
          created_at: string | null
          id: number
          quiz_id: string | null
          source_id: string | null
          source_type: string
          userid: string
          xp_gained: number
        }
        Insert: {
          created_at?: string | null
          id?: number
          quiz_id?: string | null
          source_id?: string | null
          source_type: string
          userid: string
          xp_gained: number
        }
        Update: {
          created_at?: string | null
          id?: number
          quiz_id?: string | null
          source_id?: string | null
          source_type?: string
          userid?: string
          xp_gained?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_user"
            columns: ["userid"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "xp_history_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quiz"
            referencedColumns: ["id"]
          },
        ]
      }
      year_programs: {
        Row: {
          class_id: string
          created_at: string | null
          id: string
          program: Json
          subject: string
          updated_at: string | null
        }
        Insert: {
          class_id: string
          created_at?: string | null
          id?: string
          program: Json
          subject: string
          updated_at?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string | null
          id?: string
          program?: Json
          subject?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "year_programs_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      news_stats: {
        Row: {
          category: string | null
          click_through_rate: number | null
          created_at: string | null
          news_id: string | null
          published_at: string | null
          status: string | null
          title: string | null
          total_bookmarks: number | null
          total_clicks: number | null
          total_likes: number | null
          total_shares: number | null
          total_views: number | null
          unique_clickers: number | null
          unique_viewers: number | null
        }
        Relationships: []
      }
      notification_stats: {
        Row: {
          avg_hours_remaining: number | null
          avg_streak_count: number | null
          date: string | null
          message_tone: string | null
          total_sent: number | null
          unique_users: number | null
        }
        Relationships: []
      }
      vw_available_secondary_programs: {
        Row: {
          class_name: string | null
          course_count: number | null
          description: string | null
          exercise_count: number | null
          id: string | null
          price: number | null
          quiz_count: number | null
          series_name: string | null
        }
        Relationships: []
      }
      vw_concours_details: {
        Row: {
          city_id: string | null
          city_name: string | null
          concours_description: string | null
          concours_id: string | null
          concours_name: string | null
          cycle_id: string | null
          cycle_level: number | null
          cycle_name: string | null
          next_date: string | null
          school_id: string | null
          school_name: string | null
          school_sigle: string | null
        }
        Relationships: []
      }
      vw_schools_with_locations: {
        Row: {
          city_id: string | null
          city_name: string | null
          is_active: boolean | null
          school_description: string | null
          school_id: string | null
          school_name: string | null
          school_sigle: string | null
        }
        Relationships: []
      }
      vw_upcoming_concours: {
        Row: {
          city_id: string | null
          city_name: string | null
          concours_description: string | null
          concours_id: string | null
          concours_name: string | null
          cycle_id: string | null
          cycle_level: number | null
          cycle_name: string | null
          next_date: string | null
          school_id: string | null
          school_name: string | null
          school_sigle: string | null
        }
        Relationships: []
      }
      vw_user_secondary_subscriptions: {
        Row: {
          expiry_date: string | null
          price: number | null
          program_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_secondary_enrollments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "secondary_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_secondary_enrollments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "vw_available_secondary_programs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calculate_session_duration: {
        Args: { session_id: string }
        Returns: string
      }
      check_and_update_streak: { Args: { p_user_id: string }; Returns: Json }
      check_competition_access: {
        Args: { p_competition_id: string; p_user_id: string }
        Returns: boolean
      }
      check_program_payment_access: {
        Args: { p_program_id: string; p_user_id: string }
        Returns: boolean
      }
      check_secondary_access: {
        Args: { p_program_id: string; p_user_id: string }
        Returns: boolean
      }
      claim_instructor_profile: {
        Args: { p_avatar_url: string; p_full_name: string }
        Returns: boolean
      }
      cleanup_incomplete_sessions: { Args: never; Returns: undefined }
      cleanup_old_notification_history: { Args: never; Returns: undefined }
      delete_user_safely: { Args: { user_id: string }; Returns: boolean }
      enqueue_feed_notification_push: {
        Args: { p_notification_id: string }
        Returns: undefined
      }
      generate_class_levels: {
        Args: {
          p_base_levels: number
          p_class_id: string
          p_class_name: string
          p_xp_multiplier: number
        }
        Returns: undefined
      }
      get_active_news_for_user: {
        Args: {
          p_is_new_user?: boolean
          p_limit?: number
          p_user_id: string
          p_user_programs?: string
          p_user_type?: string
        }
        Returns: {
          action_data: Json
          action_type: string
          background_color: string
          badge_color: string
          badge_text: string
          card_style: string
          category: string
          click_count: number
          content: string
          created_at: string
          description: string
          display_order: number
          end_date: string
          has_clicked: boolean
          has_viewed: boolean
          id: string
          is_featured: boolean
          media_alt_text: string
          media_type: string
          media_url: string
          priority: number
          published_at: string
          share_count: number
          show_badge: boolean
          start_date: string
          status: string
          subtitle: string
          tags: Json
          target_audience: string
          text_color: string
          thumbnail_url: string
          title: string
          updated_at: string
          user_view_count: number
          video_duration: number
          view_count: number
        }[]
      }
      get_available_programs: { Args: { p_user_id: string }; Returns: Json }
      get_concours_by_school_and_city: {
        Args: { city_name: string; school_sigle: string }
        Returns: {
          concours_description: string
          concours_id: string
          concours_name: string
          cycle_level: number
          cycle_name: string
          next_date: string
        }[]
      }
      get_discussion_unread_counts: {
        Args: never
        Returns: {
          group_id: string
          unread_count: number
        }[]
      }
      get_instructor_group_overview: {
        Args: never
        Returns: {
          concours_id: string
          group_id: string
          group_number: number
          last_message_at: string
          last_message_is_instructor: boolean
          last_message_preview: string
          member_count: number
          pending_count: number
          secondary_program_id: string
        }[]
      }
      get_last_completed_week_leaderboard: {
        Args: {
          p_country_id?: string
          p_gradelevel?: string
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          avatar_url: string
          full_name: string
          gradelevel: string
          id: string
          is_online: boolean
          rank: number
          weekly_xp: number
        }[]
      }
      get_leaderboard: {
        Args: {
          p_country_id?: string
          p_gradelevel?: string
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          avatar_url: string
          full_name: string
          gradelevel: string
          id: string
          is_online: boolean
          rank: number
          total_xp: number
        }[]
      }
      get_leaderboard_gradelevels: {
        Args: never
        Returns: {
          gradelevel: string
          student_count: number
        }[]
      }
      get_learningpath_enrollment_counts: {
        Args: never
        Returns: {
          enrolled_count: number
          learning_path_id: string
        }[]
      }
      get_my_last_completed_week_rank: {
        Args: { p_country_id?: string; p_gradelevel?: string }
        Returns: {
          avatar_url: string
          full_name: string
          gradelevel: string
          id: string
          is_online: boolean
          rank: number
          weekly_xp: number
        }[]
      }
      get_my_leaderboard_rank: {
        Args: { p_country_id?: string; p_gradelevel?: string }
        Returns: {
          avatar_url: string
          full_name: string
          gradelevel: string
          id: string
          is_online: boolean
          rank: number
          total_xp: number
        }[]
      }
      get_my_quiz_rank: {
        Args: { p_quiz_id: string }
        Returns: {
          avatar_url: string
          correct_count: number
          full_name: string
          rank: number
          score: number
          time_spent: number
          total_count: number
          user_id: string
        }[]
      }
      get_my_weekly_leaderboard_rank: {
        Args: { p_country_id?: string; p_gradelevel?: string }
        Returns: {
          avatar_url: string
          full_name: string
          gradelevel: string
          id: string
          is_online: boolean
          rank: number
          weekly_xp: number
        }[]
      }
      get_my_weekly_like_cooldown_seconds: { Args: never; Returns: number }
      get_my_xp_history: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          created_at: string
          id: number
          post_id: string
          source_id: string
          source_type: string
          xp_gained: number
        }[]
      }
      get_news_statistics: {
        Args: { p_news_id: string }
        Returns: {
          bookmarks_count: number
          click_rate_percentage: number
          last_interaction_at: string
          likes_count: number
          news_id: string
          title: string
          total_clicks: number
          total_shares: number
          total_views: number
          unique_clickers: number
          unique_viewers: number
        }[]
      }
      get_program_details: { Args: { p_program_id: number }; Returns: Json }
      get_quiz_leaderboard: {
        Args: { p_limit?: number; p_quiz_id: string }
        Returns: {
          avatar_url: string
          correct_count: number
          full_name: string
          rank: number
          score: number
          time_spent: number
          total_count: number
          user_id: string
        }[]
      }
      get_schools_by_city: {
        Args: { city_name: string }
        Returns: {
          school_description: string
          school_id: string
          school_name: string
          school_sigle: string
        }[]
      }
      get_secondary_daily_content: {
        Args: {
          p_auto_create?: boolean
          p_program_id: string
          p_target_date?: string
          p_user_id?: string
        }
        Returns: Json
      }
      get_secondary_daily_content_for_programs: {
        Args: {
          p_program_ids: string[]
          p_target_date?: string
          p_user_id?: string
        }
        Returns: Json
      }
      get_secondary_daily_quiz_leaderboard: {
        Args: {
          p_daily_content_item_id?: string
          p_limit?: number
          p_program_id: string
          p_quiz_id?: string
          p_target_date?: string
        }
        Returns: Json
      }
      get_secondary_enrollment_counts: {
        Args: never
        Returns: {
          enrolled_count: number
          program_id: string
        }[]
      }
      get_statistics: {
        Args: never
        Returns: {
          concours_next_month: number
          concours_this_month: number
          total_cities: number
          total_concours: number
          total_schools: number
        }[]
      }
      get_trending_feed_post_ids: {
        Args: { p_limit?: number }
        Returns: {
          id: string
        }[]
      }
      get_upcoming_concours_by_city: {
        Args: { city_name: string }
        Returns: {
          concours_id: string
          concours_name: string
          cycle_level: number
          next_date: string
          school_name: string
          school_sigle: string
        }[]
      }
      get_users_public_info: {
        Args: { user_ids: string[] }
        Returns: {
          avatar_url: string
          current_streak: number
          full_name: string
          id: string
          is_online: boolean
          total_xp: number
        }[]
      }
      get_weekly_leaderboard: {
        Args: {
          p_country_id?: string
          p_gradelevel?: string
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          avatar_url: string
          full_name: string
          gradelevel: string
          id: string
          is_online: boolean
          rank: number
          weekly_xp: number
        }[]
      }
      increment_comment_score: {
        Args: { comment_id: string; delta: number }
        Returns: undefined
      }
      is_discussion_group_member: {
        Args: { p_group_id: string }
        Returns: boolean
      }
      is_instructor: { Args: never; Returns: boolean }
      is_instructor_admin: { Args: never; Returns: boolean }
      is_news_visible_for_user: {
        Args: {
          p_is_new_user?: boolean
          p_news_id: string
          p_user_id: string
          p_user_programs?: Json
          p_user_type?: string
        }
        Returns: boolean
      }
      lp_next_step_order: { Args: { p_milestone_id: string }; Returns: number }
      lp_sync_lesson_milestone: {
        Args: { p_course_id: number; p_unit_id: string }
        Returns: string
      }
      lp_sync_practice_milestone: {
        Args: { p_unit_id: string }
        Returns: string
      }
      lp_sync_unit: {
        Args: { p_category_id: string; p_program_id: string }
        Returns: string
      }
      mark_notification_read: {
        Args: { p_notification_id: string }
        Returns: undefined
      }
      mark_secondary_daily_item_completed: {
        Args: {
          p_completion_source?: string
          p_daily_content_item_id: string
          p_metadata?: Json
          p_user_id?: string
        }
        Returns: Json
      }
      rechercher_partout: {
        Args: { search_term: string }
        Returns: {
          column_name: string
          matched_value: string
          schema_name: string
          table_name: string
        }[]
      }
      record_news_interaction: {
        Args: {
          p_interaction_type: string
          p_metadata?: Json
          p_news_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      record_news_view: {
        Args: {
          p_device_info?: Json
          p_news_id: string
          p_session_id?: string
          p_user_id: string
        }
        Returns: undefined
      }
      refresh_secondary_daily_content_for_date: {
        Args: {
          p_course_limit?: number
          p_exercise_limit?: number
          p_force?: boolean
          p_program_id?: string
          p_quiz_limit?: number
          p_target_date?: string
        }
        Returns: number
      }
      search_accounts_for_mention: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          avatar_url: string
          full_name: string
          id: string
        }[]
      }
      secondary_track_key: { Args: { p: string }; Returns: string }
      set_best_answer: {
        Args: { p_comment_id: string; p_post_id: string }
        Returns: undefined
      }
      set_secondary_daily_content: {
        Args: {
          p_course_ids?: number[]
          p_exercise_ids?: string[]
          p_program_id: string
          p_quiz_ids?: string[]
          p_selection_mode?: string
          p_target_date?: string
        }
        Returns: string
      }
      sync_secondary_daily_progress_from_sources: {
        Args: {
          p_program_id: string
          p_target_date?: string
          p_user_id?: string
        }
        Returns: undefined
      }
      update_challenge_progress: {
        Args: { challenge_type: string; user_id_or_session_id: string }
        Returns: undefined
      }
    }
    Enums: {
      image: "url" | "id" | "path" | "uploadthing_id"
      learning_session_type: "mobile" | "web"
      user_activity_status: "active" | "inactive"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      image: ["url", "id", "path", "uploadthing_id"],
      learning_session_type: ["mobile", "web"],
      user_activity_status: ["active", "inactive"],
    },
  },
} as const
