export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      academic_years: {
        Row: {
          created_at: string
          id: string
          name: string
          teacher_id: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          teacher_id: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          teacher_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "academic_years_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_results: {
        Row: {
          assessment_id: string
          classroom_id: string
          id: string
          student_id: string
          updated_at: string
          value: string
        }
        Insert: {
          assessment_id: string
          classroom_id: string
          id?: string
          student_id: string
          updated_at?: string
          value: string
        }
        Update: {
          assessment_id?: string
          classroom_id?: string
          id?: string
          student_id?: string
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_results_assessment_id_classroom_id_fkey"
            columns: ["assessment_id", "classroom_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id", "classroom_id"]
          },
          {
            foreignKeyName: "assessment_results_student_id_classroom_id_fkey"
            columns: ["student_id", "classroom_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id", "classroom_id"]
          },
        ]
      }
      assessments: {
        Row: {
          assess_date: string
          classroom_id: string
          created_at: string
          id: string
          kind: string
          levels: string[] | null
          max_score: number | null
          subject_id: string
          title: string
        }
        Insert: {
          assess_date?: string
          classroom_id: string
          created_at?: string
          id?: string
          kind: string
          levels?: string[] | null
          max_score?: number | null
          subject_id: string
          title: string
        }
        Update: {
          assess_date?: string
          classroom_id?: string
          created_at?: string
          id?: string
          kind?: string
          levels?: string[] | null
          max_score?: number | null
          subject_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_subject_id_classroom_id_fkey"
            columns: ["subject_id", "classroom_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id", "classroom_id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          classroom_id: string
          created_at: string
          id: string
          memo: string
          reason: string
          record_date: string
          student_id: string
          type: string
          updated_at: string
        }
        Insert: {
          classroom_id: string
          created_at?: string
          id?: string
          memo?: string
          reason: string
          record_date: string
          student_id: string
          type: string
          updated_at?: string
        }
        Update: {
          classroom_id?: string
          created_at?: string
          id?: string
          memo?: string
          reason?: string
          record_date?: string
          student_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_student_id_classroom_id_fkey"
            columns: ["student_id", "classroom_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id", "classroom_id"]
          },
        ]
      }
      class_tools: {
        Row: {
          color: string
          created_at: string
          description: string
          id: string
          is_favorite: boolean
          is_student_visible: boolean
          name: string
          position: number
          teacher_id: string
          updated_at: string
          url: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string
          id?: string
          is_favorite?: boolean
          is_student_visible?: boolean
          name: string
          position?: number
          teacher_id: string
          updated_at?: string
          url: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string
          id?: string
          is_favorite?: boolean
          is_student_visible?: boolean
          name?: string
          position?: number
          teacher_id?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_tools_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      classrooms: {
        Row: {
          academic_year_id: string
          class_code: string
          created_at: string
          id: string
          name: string
          periods_per_day: number
          share_token: string | null
          teacher_id: string
          theme_color: string | null
        }
        Insert: {
          academic_year_id: string
          class_code: string
          created_at?: string
          id?: string
          name: string
          periods_per_day?: number
          share_token?: string | null
          teacher_id: string
          theme_color?: string | null
        }
        Update: {
          academic_year_id?: string
          class_code?: string
          created_at?: string
          id?: string
          name?: string
          periods_per_day?: number
          share_token?: string | null
          teacher_id?: string
          theme_color?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classrooms_academic_year_id_teacher_id_fkey"
            columns: ["academic_year_id", "teacher_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id", "teacher_id"]
          },
          {
            foreignKeyName: "classrooms_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          classroom_id: string
          created_at: string
          end_date: string | null
          event_date: string
          id: string
          layer: string
          title: string
        }
        Insert: {
          classroom_id: string
          created_at?: string
          end_date?: string | null
          event_date: string
          id?: string
          layer: string
          title: string
        }
        Update: {
          classroom_id?: string
          created_at?: string
          end_date?: string | null
          event_date?: string
          id?: string
          layer?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      item_checks: {
        Row: {
          checked_at: string
          classroom_id: string
          id: string
          item_id: string
          student_id: string
        }
        Insert: {
          checked_at?: string
          classroom_id: string
          id?: string
          item_id: string
          student_id: string
        }
        Update: {
          checked_at?: string
          classroom_id?: string
          id?: string
          item_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_checks_item_id_classroom_id_fkey"
            columns: ["item_id", "classroom_id"]
            isOneToOne: false
            referencedRelation: "post_items"
            referencedColumns: ["id", "classroom_id"]
          },
          {
            foreignKeyName: "item_checks_student_id_classroom_id_fkey"
            columns: ["student_id", "classroom_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id", "classroom_id"]
          },
        ]
      }
      post_items: {
        Row: {
          classroom_id: string
          id: string
          label: string
          position: number
          post_id: string
        }
        Insert: {
          classroom_id: string
          id?: string
          label: string
          position?: number
          post_id: string
        }
        Update: {
          classroom_id?: string
          id?: string
          label?: string
          position?: number
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_items_post_id_classroom_id_fkey"
            columns: ["post_id", "classroom_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id", "classroom_id"]
          },
        ]
      }
      post_reads: {
        Row: {
          classroom_id: string
          id: string
          post_id: string
          read_at: string
          student_id: string
        }
        Insert: {
          classroom_id: string
          id?: string
          post_id: string
          read_at?: string
          student_id: string
        }
        Update: {
          classroom_id?: string
          id?: string
          post_id?: string
          read_at?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reads_post_id_classroom_id_fkey"
            columns: ["post_id", "classroom_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id", "classroom_id"]
          },
          {
            foreignKeyName: "post_reads_student_id_classroom_id_fkey"
            columns: ["student_id", "classroom_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id", "classroom_id"]
          },
        ]
      }
      posts: {
        Row: {
          classroom_id: string
          content: string
          created_at: string
          id: string
          post_date: string
          title: string
          updated_at: string
        }
        Insert: {
          classroom_id: string
          content?: string
          created_at?: string
          id?: string
          post_date?: string
          title: string
          updated_at?: string
        }
        Update: {
          classroom_id?: string
          content?: string
          created_at?: string
          id?: string
          post_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          last_mode: string
          role: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          id: string
          last_mode?: string
          role?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          last_mode?: string
          role?: string
        }
        Relationships: []
      }
      student_records: {
        Row: {
          category: string
          classroom_id: string
          content: string
          created_at: string
          id: string
          record_date: string
          student_id: string
        }
        Insert: {
          category?: string
          classroom_id: string
          content: string
          created_at?: string
          id?: string
          record_date?: string
          student_id: string
        }
        Update: {
          category?: string
          classroom_id?: string
          content?: string
          created_at?: string
          id?: string
          record_date?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_records_student_id_classroom_id_fkey"
            columns: ["student_id", "classroom_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id", "classroom_id"]
          },
        ]
      }
      students: {
        Row: {
          classroom_id: string
          created_at: string
          id: string
          nickname: string
          number: number
          pin_hash: string
          pin_is_initial: boolean
          real_name: string | null
        }
        Insert: {
          classroom_id: string
          created_at?: string
          id?: string
          nickname: string
          number: number
          pin_hash: string
          pin_is_initial?: boolean
          real_name?: string | null
        }
        Update: {
          classroom_id?: string
          created_at?: string
          id?: string
          nickname?: string
          number?: number
          pin_hash?: string
          pin_is_initial?: boolean
          real_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          classroom_id: string
          created_at: string
          id: string
          name: string
          position: number
        }
        Insert: {
          classroom_id: string
          created_at?: string
          id?: string
          name: string
          position?: number
        }
        Update: {
          classroom_id?: string
          created_at?: string
          id?: string
          name?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "subjects_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_slots: {
        Row: {
          classroom_id: string
          created_at: string
          day_of_week: number
          id: string
          period: number
          subject: string
        }
        Insert: {
          classroom_id: string
          created_at?: string
          day_of_week: number
          id?: string
          period: number
          subject: string
        }
        Update: {
          classroom_id?: string
          created_at?: string
          day_of_week?: number
          id?: string
          period?: number
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "timetable_slots_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      work_documents: {
        Row: {
          created_at: string
          due_date: string | null
          id: string
          link: string | null
          memo: string
          received_date: string
          status: string
          teacher_id: string
          title: string
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          id?: string
          link?: string | null
          memo?: string
          received_date?: string
          status?: string
          teacher_id: string
          title: string
        }
        Update: {
          created_at?: string
          due_date?: string | null
          id?: string
          link?: string | null
          memo?: string
          received_date?: string
          status?: string
          teacher_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_documents_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      work_events: {
        Row: {
          category: string
          created_at: string
          end_date: string | null
          event_date: string
          id: string
          teacher_id: string
          title: string
        }
        Insert: {
          category?: string
          created_at?: string
          end_date?: string | null
          event_date: string
          id?: string
          teacher_id: string
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          end_date?: string | null
          event_date?: string
          id?: string
          teacher_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_events_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      work_links: {
        Row: {
          created_at: string
          id: string
          name: string
          position: number
          teacher_id: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          position?: number
          teacher_id: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          position?: number
          teacher_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_links_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      work_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          tags: string[]
          teacher_id: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          tags?: string[]
          teacher_id: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          tags?: string[]
          teacher_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_notes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      work_snippets: {
        Row: {
          content: string
          created_at: string
          id: string
          teacher_id: string
          title: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          teacher_id: string
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          teacher_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_snippets_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      work_todos: {
        Row: {
          created_at: string
          done_at: string | null
          due_date: string | null
          id: string
          last_done_date: string | null
          priority: number
          repeat_dow: number | null
          teacher_id: string
          title: string
        }
        Insert: {
          created_at?: string
          done_at?: string | null
          due_date?: string | null
          id?: string
          last_done_date?: string | null
          priority?: number
          repeat_dow?: number | null
          teacher_id: string
          title: string
        }
        Update: {
          created_at?: string
          done_at?: string | null
          due_date?: string | null
          id?: string
          last_done_date?: string | null
          priority?: number
          repeat_dow?: number | null
          teacher_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_todos_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      shared_calendar: {
        Args: { p_from: string; p_to: string; p_token: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

