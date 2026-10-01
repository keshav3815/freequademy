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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      ai_usage_daily: {
        Row: {
          request_count: number
          updated_at: string
          usage_date: string
          user_id: string
        }
        Insert: {
          request_count?: number
          updated_at?: string
          usage_date: string
          user_id: string
        }
        Update: {
          request_count?: number
          updated_at?: string
          usage_date?: string
          user_id?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          audience: string
          body: string
          created_at: string
          id: string
          publish_at: string
          session_id: string | null
          status: string
          student_ids: string[]
          subject_id: string | null
          teacher_id: string
          title: string
          updated_at: string
        }
        Insert: {
          audience: string
          body: string
          created_at?: string
          id?: string
          publish_at?: string
          session_id?: string | null
          status?: string
          student_ids?: string[]
          subject_id?: string | null
          teacher_id?: string
          title: string
          updated_at?: string
        }
        Update: {
          audience?: string
          body?: string
          created_at?: string
          id?: string
          publish_at?: string
          session_id?: string | null
          status?: string
          student_ids?: string[]
          subject_id?: string | null
          teacher_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "mentorship_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      attempt_answers: {
        Row: {
          answered_at: string
          attempt_id: string
          is_correct: boolean | null
          question_id: string
          selected_option: number | null
        }
        Insert: {
          answered_at?: string
          attempt_id: string
          is_correct?: boolean | null
          question_id: string
          selected_option?: number | null
        }
        Update: {
          answered_at?: string
          attempt_id?: string
          is_correct?: boolean | null
          question_id?: string
          selected_option?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "attempt_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "test_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "test_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      attempt_reviews: {
        Row: {
          attempt_id: string
          feedback: string | null
          reviewed_at: string
          teacher_id: string
        }
        Insert: {
          attempt_id: string
          feedback?: string | null
          reviewed_at?: string
          teacher_id: string
        }
        Update: {
          attempt_id?: string
          feedback?: string | null
          reviewed_at?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attempt_reviews_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: true
            referencedRelation: "test_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string
          after: Json | null
          before: Json | null
          changed_fields: string[] | null
          created_at: string
          id: number
          request_id: string | null
          resource_id: string | null
          resource_type: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role: string
          after?: Json | null
          before?: Json | null
          changed_fields?: string[] | null
          created_at?: string
          id?: never
          request_id?: string | null
          resource_id?: string | null
          resource_type: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string
          after?: Json | null
          before?: Json | null
          changed_fields?: string[] | null
          created_at?: string
          id?: never
          request_id?: string | null
          resource_id?: string | null
          resource_type?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string | null
          author_name: string
          chapter: string
          class_level: string
          concept_explanation: string
          created_at: string
          id: string
          introduction: string
          motivational_line: string
          practice_questions: Json
          quick_tips: string[]
          read_time_minutes: number | null
          real_life_example: string
          slug: string
          status: string
          subject: string
          summary_points: string[]
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          author_name: string
          chapter: string
          class_level: string
          concept_explanation: string
          created_at?: string
          id?: string
          introduction: string
          motivational_line: string
          practice_questions?: Json
          quick_tips?: string[]
          read_time_minutes?: number | null
          real_life_example: string
          slug: string
          status?: string
          subject: string
          summary_points?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          author_name?: string
          chapter?: string
          class_level?: string
          concept_explanation?: string
          created_at?: string
          id?: string
          introduction?: string
          motivational_line?: string
          practice_questions?: Json
          quick_tips?: string[]
          read_time_minutes?: number | null
          real_life_example?: string
          slug?: string
          status?: string
          subject?: string
          summary_points?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      chapters: {
        Row: {
          created_at: string
          description: string | null
          id: string
          sort_order: number
          subject_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number
          subject_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number
          subject_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapters_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      client_errors: {
        Row: {
          browser: string | null
          created_at: string
          environment: string
          error_type: string | null
          id: number
          message: string | null
          os: string | null
          release: string | null
          request_id: string | null
          route: string | null
          source: string | null
          stack: string | null
        }
        Insert: {
          browser?: string | null
          created_at?: string
          environment: string
          error_type?: string | null
          id?: never
          message?: string | null
          os?: string | null
          release?: string | null
          request_id?: string | null
          route?: string | null
          source?: string | null
          stack?: string | null
        }
        Update: {
          browser?: string | null
          created_at?: string
          environment?: string
          error_type?: string | null
          id?: never
          message?: string | null
          os?: string | null
          release?: string | null
          request_id?: string | null
          route?: string | null
          source?: string | null
          stack?: string | null
        }
        Relationships: []
      }
      client_vitals: {
        Row: {
          connection: string | null
          created_at: string
          environment: string
          id: number
          metric: string
          rating: string | null
          release: string | null
          route: string
          value: number
        }
        Insert: {
          connection?: string | null
          created_at?: string
          environment: string
          id?: never
          metric: string
          rating?: string | null
          release?: string | null
          route: string
          value: number
        }
        Update: {
          connection?: string | null
          created_at?: string
          environment?: string
          id?: never
          metric?: string
          rating?: string | null
          release?: string | null
          route?: string
          value?: number
        }
        Relationships: []
      }
      club_members: {
        Row: {
          club_id: string
          id: string
          joined_at: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          club_id: string
          id?: string
          joined_at?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          club_id?: string
          id?: string
          joined_at?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_members_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "student_clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_posts: {
        Row: {
          author_id: string
          club_id: string
          content: string
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          author_id: string
          club_id: string
          content: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          club_id?: string
          content?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "club_posts_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "student_clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      community_events: {
        Row: {
          attendee_count: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          duration_minutes: number | null
          event_type: string
          id: string
          max_attendees: number | null
          meeting_link: string | null
          scheduled_at: string
          title: string
          updated_at: string | null
        }
        Insert: {
          attendee_count?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          event_type: string
          id?: string
          max_attendees?: number | null
          meeting_link?: string | null
          scheduled_at: string
          title: string
          updated_at?: string | null
        }
        Update: {
          attendee_count?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          event_type?: string
          id?: string
          max_attendees?: number | null
          meeting_link?: string | null
          scheduled_at?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      dashboard_content: {
        Row: {
          author_id: string | null
          author_name: string
          content_snippet: string
          created_at: string | null
          date_submitted: string | null
          id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          author_name: string
          content_snippet: string
          created_at?: string | null
          date_submitted?: string | null
          id?: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          author_name?: string
          content_snippet?: string
          created_at?: string | null
          date_submitted?: string | null
          id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      donations: {
        Row: {
          amount: number
          created_at: string
          donor_name: string
          id: string
          razorpay_order_id: string
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          donor_name?: string
          id?: string
          razorpay_order_id: string
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          donor_name?: string
          id?: string
          razorpay_order_id?: string
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      doubts: {
        Row: {
          ai_answer: string | null
          created_at: string
          escalated_at: string | null
          escalation_note: string | null
          grade: number | null
          has_image: boolean
          id: string
          mentor_answer: string | null
          mentor_answered_at: string | null
          mentor_id: string | null
          model: string | null
          question: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_answer?: string | null
          created_at?: string
          escalated_at?: string | null
          escalation_note?: string | null
          grade?: number | null
          has_image?: boolean
          id?: string
          mentor_answer?: string | null
          mentor_answered_at?: string | null
          mentor_id?: string | null
          model?: string | null
          question: string
          status?: string
          subject?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_answer?: string | null
          created_at?: string
          escalated_at?: string | null
          escalation_note?: string | null
          grade?: number | null
          has_image?: boolean
          id?: string
          mentor_answer?: string | null
          mentor_answered_at?: string | null
          mentor_id?: string | null
          model?: string | null
          question?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      event_registrations: {
        Row: {
          event_id: string
          id: string
          registered_at: string | null
          user_id: string
        }
        Insert: {
          event_id: string
          id?: string
          registered_at?: string | null
          user_id: string
        }
        Update: {
          event_id?: string
          id?: string
          registered_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "community_events"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_categories: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      forum_replies: {
        Row: {
          author_id: string
          content: string
          created_at: string | null
          id: string
          is_solution: boolean | null
          thread_id: string
          updated_at: string | null
          upvotes: number | null
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string | null
          id?: string
          is_solution?: boolean | null
          thread_id: string
          updated_at?: string | null
          upvotes?: number | null
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string | null
          id?: string
          is_solution?: boolean | null
          thread_id?: string
          updated_at?: string | null
          upvotes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "forum_replies_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_threads: {
        Row: {
          author_id: string
          category_id: string | null
          content: string
          created_at: string | null
          id: string
          is_pinned: boolean | null
          reply_count: number | null
          title: string
          updated_at: string | null
          upvotes: number | null
        }
        Insert: {
          author_id: string
          category_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          reply_count?: number | null
          title: string
          updated_at?: string | null
          upvotes?: number | null
        }
        Update: {
          author_id?: string
          category_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          reply_count?: number | null
          title?: string
          updated_at?: string | null
          upvotes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "forum_threads_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "forum_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed_at: string | null
          last_viewed_at: string
          lesson_id: string
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          last_viewed_at?: string
          lesson_id: string
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          last_viewed_at?: string
          lesson_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          author_id: string | null
          chapter_id: string
          content_format: string
          content_md: string
          created_at: string
          duration_minutes: number
          id: string
          published_at: string | null
          sort_order: number
          status: string
          summary: string | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          author_id?: string | null
          chapter_id: string
          content_format?: string
          content_md?: string
          created_at?: string
          duration_minutes?: number
          id?: string
          published_at?: string | null
          sort_order?: number
          status?: string
          summary?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          author_id?: string | null
          chapter_id?: string
          content_format?: string
          content_md?: string
          created_at?: string
          duration_minutes?: number
          id?: string
          published_at?: string | null
          sort_order?: number
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_applications: {
        Row: {
          created_at: string
          email: string
          experience_years: number | null
          expertise: string[] | null
          full_name: string
          id: string
          is_volunteer: boolean | null
          motivation: string | null
          phone: string | null
          qualification: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          experience_years?: number | null
          expertise?: string[] | null
          full_name: string
          id?: string
          is_volunteer?: boolean | null
          motivation?: string | null
          phone?: string | null
          qualification?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          experience_years?: number | null
          expertise?: string[] | null
          full_name?: string
          id?: string
          is_volunteer?: boolean | null
          motivation?: string | null
          phone?: string | null
          qualification?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      mentors: {
        Row: {
          availability_hours: Json | null
          bio: string | null
          created_at: string
          email: string
          experience_years: number | null
          expertise: string[] | null
          full_name: string
          id: string
          is_verified: boolean | null
          is_volunteer: boolean | null
          qualification: string | null
          rating: number | null
          total_sessions: number | null
          updated_at: string
        }
        Insert: {
          availability_hours?: Json | null
          bio?: string | null
          created_at?: string
          email: string
          experience_years?: number | null
          expertise?: string[] | null
          full_name: string
          id: string
          is_verified?: boolean | null
          is_volunteer?: boolean | null
          qualification?: string | null
          rating?: number | null
          total_sessions?: number | null
          updated_at?: string
        }
        Update: {
          availability_hours?: Json | null
          bio?: string | null
          created_at?: string
          email?: string
          experience_years?: number | null
          expertise?: string[] | null
          full_name?: string
          id?: string
          is_verified?: boolean | null
          is_volunteer?: boolean | null
          qualification?: string | null
          rating?: number | null
          total_sessions?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      mentorship_feedback: {
        Row: {
          created_at: string
          feedback_text: string | null
          id: string
          is_anonymous: boolean | null
          mentor_id: string | null
          rating: number | null
          session_id: string | null
          student_id: string | null
        }
        Insert: {
          created_at?: string
          feedback_text?: string | null
          id?: string
          is_anonymous?: boolean | null
          mentor_id?: string | null
          rating?: number | null
          session_id?: string | null
          student_id?: string | null
        }
        Update: {
          created_at?: string
          feedback_text?: string | null
          id?: string
          is_anonymous?: boolean | null
          mentor_id?: string | null
          rating?: number | null
          session_id?: string | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentorship_feedback_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorship_feedback_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorship_feedback_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "mentorship_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      mentorship_programs: {
        Row: {
          category: string
          created_at: string
          description: string | null
          duration_weeks: number | null
          id: string
          max_participants: number | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          duration_weeks?: number | null
          id?: string
          max_participants?: number | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          duration_weeks?: number | null
          id?: string
          max_participants?: number | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      mentorship_sessions: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          max_participants: number | null
          meeting_link: string | null
          mentor_id: string | null
          program_id: string | null
          scheduled_at: string
          session_type: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          max_participants?: number | null
          meeting_link?: string | null
          mentor_id?: string | null
          program_id?: string | null
          scheduled_at: string
          session_type: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          max_participants?: number | null
          meeting_link?: string | null
          mentor_id?: string | null
          program_id?: string | null
          scheduled_at?: string
          session_type?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentorship_sessions_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorship_sessions_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorship_sessions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "mentorship_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          grade: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          grade?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          grade?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      reply_votes: {
        Row: {
          created_at: string | null
          id: string
          reply_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          reply_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          reply_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reply_votes_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "forum_replies"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_items: {
        Row: {
          created_at: string
          id: string
          lesson_id: string | null
          test_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lesson_id?: string | null
          test_id?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          lesson_id?: string | null
          test_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_items_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_items_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      session_participants: {
        Row: {
          created_at: string
          feedback_submitted: boolean | null
          id: string
          joined_at: string | null
          session_id: string | null
          status: string
          student_id: string | null
        }
        Insert: {
          created_at?: string
          feedback_submitted?: boolean | null
          id?: string
          joined_at?: string | null
          session_id?: string | null
          status?: string
          student_id?: string | null
        }
        Update: {
          created_at?: string
          feedback_submitted?: boolean | null
          id?: string
          joined_at?: string | null
          session_id?: string | null
          status?: string
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "mentorship_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      student_clubs: {
        Row: {
          category: string
          created_at: string | null
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          member_count: number | null
          name: string
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          member_count?: number | null
          name: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          member_count?: number | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      subjects: {
        Row: {
          class_level: number
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          sort_order: number
          stream: string | null
          updated_at: string
        }
        Insert: {
          class_level: number
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
          stream?: string | null
          updated_at?: string
        }
        Update: {
          class_level?: number
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          stream?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      teacher_resources: {
        Row: {
          created_at: string
          external_url: string | null
          folder: string
          id: string
          kind: string
          mime_type: string | null
          size_bytes: number | null
          storage_path: string | null
          subject_id: string | null
          tags: string[]
          teacher_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          external_url?: string | null
          folder?: string
          id?: string
          kind: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string | null
          subject_id?: string | null
          tags?: string[]
          teacher_id?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          external_url?: string | null
          folder?: string
          id?: string
          kind?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string | null
          subject_id?: string | null
          tags?: string[]
          teacher_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_resources_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_student_notes: {
        Row: {
          body: string
          created_at: string
          id: string
          student_id: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          student_id: string
          teacher_id?: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          student_id?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      test_attempts: {
        Row: {
          correct_count: number | null
          deadline_at: string
          id: string
          max_score: number | null
          percentage: number | null
          question_count: number | null
          score: number | null
          started_at: string
          status: string
          submitted_at: string | null
          test_id: string
          user_id: string
        }
        Insert: {
          correct_count?: number | null
          deadline_at: string
          id?: string
          max_score?: number | null
          percentage?: number | null
          question_count?: number | null
          score?: number | null
          started_at?: string
          status?: string
          submitted_at?: string | null
          test_id: string
          user_id: string
        }
        Update: {
          correct_count?: number | null
          deadline_at?: string
          id?: string
          max_score?: number | null
          percentage?: number | null
          question_count?: number | null
          score?: number | null
          started_at?: string
          status?: string
          submitted_at?: string | null
          test_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_attempts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      test_questions: {
        Row: {
          correct_option: number
          created_at: string
          explanation: string | null
          id: string
          marks: number
          options: Json
          prompt: string
          sort_order: number
          test_id: string
        }
        Insert: {
          correct_option: number
          created_at?: string
          explanation?: string | null
          id?: string
          marks?: number
          options: Json
          prompt: string
          sort_order?: number
          test_id: string
        }
        Update: {
          correct_option?: number
          created_at?: string
          explanation?: string | null
          id?: string
          marks?: number
          options?: Json
          prompt?: string
          sort_order?: number
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          author_id: string | null
          chapter_id: string | null
          created_at: string
          description: string | null
          difficulty: string
          duration_minutes: number
          id: string
          published_at: string | null
          status: string
          subject_id: string
          test_type: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          chapter_id?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string
          duration_minutes?: number
          id?: string
          published_at?: string | null
          status?: string
          subject_id: string
          test_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          chapter_id?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string
          duration_minutes?: number
          id?: string
          published_at?: string | null
          status?: string
          subject_id?: string
          test_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tests_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tests_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      thread_votes: {
        Row: {
          created_at: string | null
          id: string
          thread_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          thread_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          thread_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thread_votes_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_log: {
        Row: {
          action: string
          id: string
          metadata: Json | null
          timestamp: string | null
          user_id: string | null
          user_name: string
        }
        Insert: {
          action: string
          id?: string
          metadata?: Json | null
          timestamp?: string | null
          user_id?: string | null
          user_name: string
        }
        Update: {
          action?: string
          id?: string
          metadata?: Json | null
          timestamp?: string | null
          user_id?: string | null
          user_name?: string
        }
        Relationships: []
      }
      user_reports: {
        Row: {
          content_link: string | null
          created_at: string | null
          id: string
          reason: string
          reported_by: string | null
          reporter_name: string
          status: string
          updated_at: string | null
        }
        Insert: {
          content_link?: string | null
          created_at?: string | null
          id?: string
          reason: string
          reported_by?: string | null
          reporter_name: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          content_link?: string | null
          created_at?: string | null
          id?: string
          reason?: string
          reported_by?: string | null
          reporter_name?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      xp_events: {
        Row: {
          created_at: string
          id: string
          points: number
          source_id: string
          source_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          points: number
          source_id: string
          source_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          points?: number
          source_id?: string
          source_type?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      donations_public: {
        Row: {
          amount: number | null
          created_at: string | null
          donor_name: string | null
          id: string | null
          status: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          donor_name?: string | null
          id?: string | null
          status?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          donor_name?: string | null
          id?: string | null
          status?: string | null
        }
        Relationships: []
      }
      mentors_public: {
        Row: {
          availability_hours: Json | null
          bio: string | null
          created_at: string | null
          experience_years: number | null
          expertise: string[] | null
          full_name: string | null
          id: string | null
          is_verified: boolean | null
          is_volunteer: boolean | null
          qualification: string | null
          rating: number | null
          total_sessions: number | null
          updated_at: string | null
        }
        Insert: {
          availability_hours?: Json | null
          bio?: string | null
          created_at?: string | null
          experience_years?: number | null
          expertise?: string[] | null
          full_name?: string | null
          id?: string | null
          is_verified?: boolean | null
          is_volunteer?: boolean | null
          qualification?: string | null
          rating?: number | null
          total_sessions?: number | null
          updated_at?: string | null
        }
        Update: {
          availability_hours?: Json | null
          bio?: string | null
          created_at?: string | null
          experience_years?: number | null
          expertise?: string[] | null
          full_name?: string | null
          id?: string | null
          is_verified?: boolean | null
          is_volunteer?: boolean | null
          qualification?: string | null
          rating?: number | null
          total_sessions?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      public_profiles: {
        Row: {
          full_name: string | null
          id: string | null
        }
        Insert: {
          full_name?: string | null
          id?: string | null
        }
        Update: {
          full_name?: string | null
          id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      answer_escalated_doubt: {
        Args: { _answer: string; _doubt_id: string }
        Returns: undefined
      }
      approve_mentor_application: {
        Args: { _application_id: string }
        Returns: undefined
      }
      are_my_students: { Args: { _student_ids: string[] }; Returns: boolean }
      cancel_session_registration: {
        Args: { _session_id: string }
        Returns: undefined
      }
      consume_ai_quota: {
        Args: never
        Returns: {
          allowed: boolean
          daily_limit: number
          remaining: number
        }[]
      }
      escalate_doubt: {
        Args: { _doubt_id: string; _note?: string }
        Returns: undefined
      }
      get_activity_days: {
        Args: { _from: string; _to: string }
        Returns: {
          activity_date: string
          doubt_count: number
          lesson_count: number
          session_count: number
          test_count: number
          total_count: number
        }[]
      }
      get_attempt_review: {
        Args: { _attempt_id: string }
        Returns: {
          correct_option: number
          explanation: string
          is_correct: boolean
          marks: number
          options: Json
          prompt: string
          question_id: string
          selected_option: number
          sort_order: number
        }[]
      }
      get_client_error_summary: {
        Args: { _days?: number }
        Returns: {
          environment: string
          error_type: string
          last_release: string
          last_seen: string
          message: string
          occurrences: number
          route: string
        }[]
      }
      get_escalated_doubts: {
        Args: { _limit?: number }
        Returns: {
          ai_answer: string
          escalated_at: string
          escalation_note: string
          grade: number
          id: string
          question: string
          student_name: string
          subject: string
        }[]
      }
      get_job_health: {
        Args: never
        Returns: {
          jobs: number
          last_error: string
          oldest_scheduled_at: string
          status: string
          type: string
        }[]
      }
      get_learning_summary: {
        Args: never
        Returns: {
          active_days_last_30: number
          active_days_this_week: number
          active_today: boolean
          average_score: number
          best_streak_days: number
          lessons_completed: number
          level: number
          streak_days: number
          tests_submitted: number
          total_xp: number
          xp_for_next_level: number
          xp_into_level: number
          xp_this_week: number
        }[]
      }
      get_mentorship_summary: {
        Args: never
        Returns: {
          attendance_pct: number
          completed_count: number
          next_mentor_name: string
          next_session_at: string
          next_session_id: string
          next_session_title: string
          upcoming_count: number
        }[]
      }
      get_my_announcements: {
        Args: { _limit?: number }
        Returns: {
          body: string
          id: string
          publish_at: string
          teacher_name: string
          title: string
        }[]
      }
      get_recent_test_results: {
        Args: { _limit?: number }
        Returns: {
          attempt_id: string
          max_score: number
          percentage: number
          score: number
          subject_id: string
          subject_name: string
          submitted_at: string
          test_id: string
          test_title: string
        }[]
      }
      get_session_meeting_link: {
        Args: { _session_id: string }
        Returns: string
      }
      get_student_dashboard: {
        Args: { _class_level: number; _from: string; _to: string }
        Returns: Json
      }
      get_study_note_stats: {
        Args: { _class_level: number }
        Returns: {
          chapter_id: string
          completed_count: number
          last_updated_at: string
          note_count: number
          subject_id: string
        }[]
      }
      get_subject_progress: {
        Args: { _class_level: number }
        Returns: {
          average_score: number
          chapter_count: number
          last_activity_at: string
          lesson_count: number
          lessons_completed: number
          slug: string
          sort_order: number
          status: string
          subject_id: string
          subject_name: string
          test_count: number
        }[]
      }
      get_teacher_activity: {
        Args: { _limit?: number }
        Returns: {
          kind: string
          occurred_at: string
          ref_id: string
          student_id: string
          student_name: string
          title: string
        }[]
      }
      get_teacher_assignments: {
        Args: never
        Returns: {
          avg_score: number
          awaiting_review_count: number
          chapter_title: string
          class_level: number
          difficulty: string
          duration_minutes: number
          in_progress_count: number
          published_at: string
          question_count: number
          reviewed_count: number
          status: string
          student_count: number
          subject_id: string
          subject_name: string
          submitted_count: number
          test_id: string
          test_type: string
          title: string
          total_marks: number
          updated_at: string
        }[]
      }
      get_teacher_attempt_answers: {
        Args: { _attempt_id: string }
        Returns: {
          correct_option: number
          explanation: string
          is_correct: boolean
          marks: number
          options: Json
          prompt: string
          question_id: string
          selected_option: number
          sort_order: number
        }[]
      }
      get_teacher_courses: {
        Args: never
        Returns: {
          assignment_count: number
          avg_score: number
          class_level: number
          completion_pct: number
          last_updated_at: string
          lesson_count: number
          published_lesson_count: number
          student_count: number
          subject_id: string
          subject_name: string
          subject_slug: string
        }[]
      }
      get_teacher_overview: {
        Args: never
        Returns: {
          assignment_count: number
          avg_score_30d: number
          avg_score_prev_30d: number
          awaiting_review: number
          completion_pct: number
          course_count: number
          lesson_count: number
          published_assignment_count: number
          published_lesson_count: number
          student_count: number
          submissions_7d: number
        }[]
      }
      get_teacher_student_attempts: {
        Args: { _student_id: string }
        Returns: {
          attempt_id: string
          max_score: number
          percentage: number
          reviewed_at: string
          score: number
          status: string
          subject_name: string
          submitted_at: string
          test_id: string
          test_title: string
        }[]
      }
      get_teacher_student_courses: {
        Args: { _student_id: string }
        Returns: {
          avg_score: number
          class_level: number
          lessons_completed: number
          published_lessons: number
          subject_id: string
          subject_name: string
          tests_submitted: number
        }[]
      }
      get_teacher_student_sessions: {
        Args: { _student_id: string }
        Returns: {
          attendance: string
          scheduled_at: string
          session_id: string
          session_status: string
          title: string
        }[]
      }
      get_teacher_students: {
        Args: { _student_id?: string }
        Returns: {
          attendance_pct: number
          avg_score: number
          full_name: string
          grade: string
          last_active_at: string
          lessons_completed: number
          lessons_started: number
          previous_avg: number
          recent_avg: number
          sessions_absent: number
          sessions_attended: number
          student_id: string
          subject_ids: string[]
          subject_names: string[]
          tests_submitted: number
        }[]
      }
      get_teacher_submissions: {
        Args: { _test_id: string }
        Returns: {
          attempt_id: string
          correct_count: number
          feedback: string
          max_score: number
          percentage: number
          question_count: number
          reviewed_at: string
          score: number
          started_at: string
          status: string
          student_id: string
          student_name: string
          submitted_at: string
        }[]
      }
      get_teacher_trend: {
        Args: { _subject_id?: string; _weeks?: number }
        Returns: {
          active_students: number
          attendance_pct: number
          avg_score: number
          lessons_completed: number
          submissions: number
          week_start: string
        }[]
      }
      get_test_questions_for_author: {
        Args: { _test_id: string }
        Returns: {
          correct_option: number
          explanation: string
          id: string
          marks: number
          options: Json
          prompt: string
          sort_order: number
        }[]
      }
      get_user_counts: {
        Args: never
        Returns: {
          mentor_count: number
          student_count: number
          total_users: number
        }[]
      }
      get_weak_areas: {
        Args: { _limit?: number }
        Returns: {
          attempts_count: number
          average_score: number
          chapter_id: string
          chapter_title: string
          subject_id: string
          subject_name: string
        }[]
      }
      get_web_vitals_summary: {
        Args: { _days?: number; _environment?: string }
        Returns: {
          metric: string
          p50: number
          p75: number
          p95: number
          route: string
          samples: number
        }[]
      }
      get_weekly_summary: {
        Args: never
        Returns: {
          active_days: number
          average_score: number
          doubts_asked: number
          doubts_resolved: number
          lessons_completed: number
          period: string
          period_end: string
          period_start: string
          sessions_attended: number
          tests_attempted: number
          xp_earned: number
        }[]
      }
      get_xp_breakdown: {
        Args: never
        Returns: {
          event_count: number
          source_type: string
          total_points: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_api_client: { Args: never; Returns: boolean }
      is_mentor: { Args: { _user_id: string }; Returns: boolean }
      is_moderator: { Args: { _user_id: string }; Returns: boolean }
      is_my_student: { Args: { _student_id: string }; Returns: boolean }
      jobs_claim: {
        Args: { _limit?: number; _types: string[] }
        Returns: {
          attempt_count: number
          id: number
          payload: Json
          request_id: string
          type: string
        }[]
      }
      jobs_complete: { Args: { _id: number }; Returns: undefined }
      jobs_enqueue: {
        Args: { _idempotency_key: string; _payload: Json; _type: string }
        Returns: number
      }
      jobs_fail: { Args: { _error: string; _id: number }; Returns: string }
      mark_reply_solution: { Args: { _reply_id: string }; Returns: undefined }
      record_lesson_progress: {
        Args: { _completed?: boolean; _lesson_id: string }
        Returns: string
      }
      register_for_session: { Args: { _session_id: string }; Returns: string }
      reject_mentor_application: {
        Args: { _application_id: string }
        Returns: undefined
      }
      reorder_teacher_lessons: {
        Args: { _lesson_ids: string[] }
        Returns: undefined
      }
      report_client_error: { Args: { _report: Json }; Returns: undefined }
      report_web_vital: {
        Args: {
          _connection?: string
          _environment: string
          _metric: string
          _rating: string
          _release?: string
          _route: string
          _value: number
        }
        Returns: undefined
      }
      review_attempt: {
        Args: { _attempt_id: string; _feedback?: string }
        Returns: undefined
      }
      revoke_mentor_role: { Args: { _user_id: string }; Returns: undefined }
      save_test_answer: {
        Args: {
          _attempt_id: string
          _question_id: string
          _selected_option: number
        }
        Returns: undefined
      }
      session_participant_counts: {
        Args: { _session_ids: string[] }
        Returns: {
          participant_count: number
          session_id: string
        }[]
      }
      set_participant_attendance: {
        Args: { _session_id: string; _status: string; _student_id: string }
        Returns: undefined
      }
      set_platform_role: {
        Args: {
          _grant: boolean
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      set_thread_pinned: {
        Args: { _pinned: boolean; _thread_id: string }
        Returns: undefined
      }
      start_test_attempt: { Args: { _test_id: string }; Returns: string }
      submit_test_attempt: {
        Args: { _attempt_id: string }
        Returns: {
          correct_count: number
          max_score: number
          percentage: number
          question_count: number
          score: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "super_admin"
      user_role: "student" | "mentor"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["admin", "moderator", "super_admin"],
      user_role: ["student", "mentor"],
    },
  },
} as const

