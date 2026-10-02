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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          appt_date: string
          called_at: string | null
          checked_in_at: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          doctor_id: string
          id: string
          is_walkin: boolean
          patient_id: string | null
          status: Database["public"]["Enums"]["appt_status"]
          token_number: number
          walkin_name: string | null
          walkin_phone: string | null
        }
        Insert: {
          appt_date?: string
          called_at?: string | null
          checked_in_at?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          doctor_id: string
          id?: string
          is_walkin?: boolean
          patient_id?: string | null
          status?: Database["public"]["Enums"]["appt_status"]
          token_number: number
          walkin_name?: string | null
          walkin_phone?: string | null
        }
        Update: {
          appt_date?: string
          called_at?: string | null
          checked_in_at?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          doctor_id?: string
          id?: string
          is_walkin?: boolean
          patient_id?: string | null
          status?: Database["public"]["Enums"]["appt_status"]
          token_number?: number
          walkin_name?: string | null
          walkin_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          created_at: string
          details: Json
          entity: string | null
          entity_id: string | null
          id: number
          priority: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          details?: Json
          entity?: string | null
          entity_id?: string | null
          id?: number
          priority?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          details?: Json
          entity?: string | null
          entity_id?: string | null
          id?: number
          priority?: string
        }
        Relationships: []
      }
      break_glass_access: {
        Row: {
          created_at: string
          doctor_id: string
          expires_at: string
          id: string
          justification: string
          patient_id: string
        }
        Insert: {
          created_at?: string
          doctor_id: string
          expires_at: string
          id?: string
          justification: string
          patient_id: string
        }
        Update: {
          created_at?: string
          doctor_id?: string
          expires_at?: string
          id?: string
          justification?: string
          patient_id?: string
        }
        Relationships: []
      }
      clinical_records: {
        Row: {
          appointment_id: string
          created_at: string
          diagnosis: string
          doctor_id: string
          finalized: boolean
          finalized_at: string | null
          id: string
          notes: string
          patient_id: string | null
          prescription: string
          updated_at: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          diagnosis?: string
          doctor_id: string
          finalized?: boolean
          finalized_at?: string | null
          id?: string
          notes?: string
          patient_id?: string | null
          prescription?: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          diagnosis?: string
          doctor_id?: string
          finalized?: boolean
          finalized_at?: string | null
          id?: string
          notes?: string
          patient_id?: string | null
          prescription?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_records_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name_en: string
          name_ur: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name_en: string
          name_ur?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name_en?: string
          name_ur?: string
        }
        Relationships: []
      }
      doctors: {
        Row: {
          active: boolean
          created_at: string
          department_id: string | null
          full_name: string
          specialty: string | null
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          department_id?: string | null
          full_name: string
          specialty?: string | null
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          department_id?: string | null
          full_name?: string
          specialty?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctors_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body_en: string
          body_ur: string
          created_at: string
          id: string
          read: boolean
          title_en: string
          title_ur: string
          user_id: string
        }
        Insert: {
          body_en?: string
          body_ur?: string
          created_at?: string
          id?: string
          read?: boolean
          title_en: string
          title_ur: string
          user_id: string
        }
        Update: {
          body_en?: string
          body_ur?: string
          created_at?: string
          id?: string
          read?: boolean
          title_en?: string
          title_ur?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          date_of_birth: string | null
          email: string | null
          full_name: string
          gender: string | null
          id: string
          language: string
          phone: string | null
          photo_consent_at: string | null
          photo_locked_at: string | null
          photo_path: string | null
        }
        Insert: {
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name?: string
          gender?: string | null
          id: string
          language?: string
          phone?: string | null
          photo_consent_at?: string | null
          photo_locked_at?: string | null
          photo_path?: string | null
        }
        Update: {
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          language?: string
          phone?: string | null
          photo_consent_at?: string | null
          photo_locked_at?: string | null
          photo_path?: string | null
        }
        Relationships: []
      }
      queue_settings: {
        Row: {
          id: number
          max_daily_patients: number
          max_daily_walkins: number
          slot_minutes: number
          updated_at: string
          walkins_allowed: boolean
        }
        Insert: {
          id?: number
          max_daily_patients?: number
          max_daily_walkins?: number
          slot_minutes?: number
          updated_at?: string
          walkins_allowed?: boolean
        }
        Update: {
          id?: number
          max_daily_patients?: number
          max_daily_walkins?: number
          slot_minutes?: number
          updated_at?: string
          walkins_allowed?: boolean
        }
        Relationships: []
      }
      staff_members: {
        Row: {
          created_at: string
          department_id: string | null
          full_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          full_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          full_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_members_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      triage_records: {
        Row: {
          appointment_id: string
          blood_pressure: string | null
          chief_complaint: string | null
          created_at: string
          id: string
          pulse: number | null
          recorded_by: string | null
          temperature: number | null
          weight: number | null
        }
        Insert: {
          appointment_id: string
          blood_pressure?: string | null
          chief_complaint?: string | null
          created_at?: string
          id?: string
          pulse?: number | null
          recorded_by?: string | null
          temperature?: number | null
          weight?: number | null
        }
        Update: {
          appointment_id?: string
          blood_pressure?: string | null
          chief_complaint?: string | null
          created_at?: string
          id?: string
          pulse?: number | null
          recorded_by?: string | null
          temperature?: number | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "triage_records_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_role: {
        Args: {
          _department_id?: string
          _email: string
          _role: Database["public"]["Enums"]["app_role"]
          _specialty?: string
        }
        Returns: string
      }
      book_appointment: {
        Args: { _date: string; _doctor_id: string }
        Returns: string
      }
      call_next_patient: { Args: never; Returns: string }
      cancel_appointment: { Args: { _id: string }; Returns: undefined }
      check_in_patient: { Args: { _id: string }; Returns: undefined }
      complete_visit: { Args: { _id: string }; Returns: undefined }
      doctor_can_view: {
        Args: { _doc: string; _patient: string }
        Returns: boolean
      }
      ensure_profile: { Args: { _full_name?: string }; Returns: string }
      find_patient: {
        Args: { _q: string }
        Returns: {
          email: string
          full_name: string
          id: string
          phone: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      lock_photo: { Args: { _path: string }; Returns: undefined }
      log_audit: {
        Args: {
          _action: string
          _details?: Json
          _entity: string
          _entity_id: string
          _priority?: string
        }
        Returns: undefined
      }
      mark_no_show: { Args: { _id: string }; Returns: undefined }
      my_queue_position: { Args: { _appointment_id: string }; Returns: Json }
      next_token: { Args: { _date: string; _doctor: string }; Returns: number }
      notify_user: {
        Args: {
          _be: string
          _bu: string
          _te: string
          _tu: string
          _user: string
        }
        Returns: undefined
      }
      photo_unlocked: { Args: { _uid: string }; Returns: boolean }
      queue_info: { Args: { _date: string; _doctor_id: string }; Returns: Json }
      record_triage: {
        Args: {
          _appointment_id: string
          _bp: string
          _complaint: string
          _pulse: number
          _temp: number
          _weight: number
        }
        Returns: undefined
      }
      register_walkin: {
        Args: { _doctor_id: string; _name: string; _phone: string }
        Returns: string
      }
      request_break_glass: {
        Args: { _justification: string; _patient_id: string }
        Returns: undefined
      }
      reset_patient_photo: {
        Args: { _patient_id: string; _reason: string; _remove: boolean }
        Returns: undefined
      }
      revoke_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "doctor" | "staff" | "patient"
      appt_status:
        | "booked"
        | "checked_in"
        | "in_consultation"
        | "completed"
        | "no_show"
        | "cancelled"
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
      app_role: ["admin", "doctor", "staff", "patient"],
      appt_status: [
        "booked",
        "checked_in",
        "in_consultation",
        "completed",
        "no_show",
        "cancelled",
      ],
    },
  },
} as const
