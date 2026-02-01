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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      patients: {
        Row: {
          admission_date: string | null
          admission_type: Database["public"]["Enums"]["admission_type"]
          archived: boolean
          birth_date: string
          case_number: string | null
          catchment_area: boolean
          created_at: string
          created_by: string
          created_by_display_name: string
          diagnosis: string
          email: string | null
          external_referral: boolean
          first_name: string
          gender: Database["public"]["Enums"]["gender"]
          id: string
          last_modified_at: string
          last_modified_by: string
          last_modified_by_display_name: string
          last_name: string
          monday_call: boolean | null
          notes: string | null
          on_waiting_list: boolean | null
          phone: string | null
          pre_interview_date: string | null
          relevant_conditions: boolean
          relevant_conditions_details: string | null
          secondary_station: Database["public"]["Enums"]["voll_station"] | null
          station: Database["public"]["Enums"]["station"] | null
          substance_abuse: boolean
          substance_abuse_details: string | null
          urgency: Database["public"]["Enums"]["urgency"] | null
          voll_station: Database["public"]["Enums"]["voll_station"] | null
        }
        Insert: {
          admission_date?: string | null
          admission_type: Database["public"]["Enums"]["admission_type"]
          archived?: boolean
          birth_date: string
          case_number?: string | null
          catchment_area?: boolean
          created_at?: string
          created_by: string
          created_by_display_name: string
          diagnosis: string
          email?: string | null
          external_referral?: boolean
          first_name: string
          gender: Database["public"]["Enums"]["gender"]
          id?: string
          last_modified_at?: string
          last_modified_by: string
          last_modified_by_display_name: string
          last_name: string
          monday_call?: boolean | null
          notes?: string | null
          on_waiting_list?: boolean | null
          phone?: string | null
          pre_interview_date?: string | null
          relevant_conditions?: boolean
          relevant_conditions_details?: string | null
          secondary_station?: Database["public"]["Enums"]["voll_station"] | null
          station?: Database["public"]["Enums"]["station"] | null
          substance_abuse?: boolean
          substance_abuse_details?: string | null
          urgency?: Database["public"]["Enums"]["urgency"] | null
          voll_station?: Database["public"]["Enums"]["voll_station"] | null
        }
        Update: {
          admission_date?: string | null
          admission_type?: Database["public"]["Enums"]["admission_type"]
          archived?: boolean
          birth_date?: string
          case_number?: string | null
          catchment_area?: boolean
          created_at?: string
          created_by?: string
          created_by_display_name?: string
          diagnosis?: string
          email?: string | null
          external_referral?: boolean
          first_name?: string
          gender?: Database["public"]["Enums"]["gender"]
          id?: string
          last_modified_at?: string
          last_modified_by?: string
          last_modified_by_display_name?: string
          last_name?: string
          monday_call?: boolean | null
          notes?: string | null
          on_waiting_list?: boolean | null
          phone?: string | null
          pre_interview_date?: string | null
          relevant_conditions?: boolean
          relevant_conditions_details?: string | null
          secondary_station?: Database["public"]["Enums"]["voll_station"] | null
          station?: Database["public"]["Enums"]["station"] | null
          substance_abuse?: boolean
          substance_abuse_details?: string | null
          urgency?: Database["public"]["Enums"]["urgency"] | null
          voll_station?: Database["public"]["Enums"]["voll_station"] | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
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
      admission_type: "VOLLSTATION" | "TEILSTATION"
      app_role:
        | "ADMIN"
        | "MANAGER"
        | "INTAKE"
        | "VOLL_VIEW"
        | "arzt_a"
        | "arzt_b"
        | "arzt_c"
        | "arzt_d"
        | "pflege_a"
        | "pflege_b"
        | "pflege_c"
        | "pflege_d"
      gender: "m" | "w" | "d"
      station: "A" | "B" | "C" | "D"
      urgency: "elektiv" | "dringend"
      voll_station: "E" | "F" | "G"
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
      admission_type: ["VOLLSTATION", "TEILSTATION"],
      app_role: [
        "ADMIN",
        "MANAGER",
        "INTAKE",
        "VOLL_VIEW",
        "arzt_a",
        "arzt_b",
        "arzt_c",
        "arzt_d",
        "pflege_a",
        "pflege_b",
        "pflege_c",
        "pflege_d",
      ],
      gender: ["m", "w", "d"],
      station: ["A", "B", "C", "D"],
      urgency: ["elektiv", "dringend"],
      voll_station: ["E", "F", "G"],
    },
  },
} as const
