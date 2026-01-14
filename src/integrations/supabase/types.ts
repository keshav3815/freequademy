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
    }
    Functions: {
      get_user_counts: {
        Args: never
        Returns: {
          mentor_count: number
          student_count: number
          total_users: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator"
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
      app_role: ["admin", "moderator"],
      user_role: ["student", "mentor"],
    },
  },
} as const
