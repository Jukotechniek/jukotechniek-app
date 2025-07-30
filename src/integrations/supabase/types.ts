export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      ai_assistant_config: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_enabled: boolean | null
          updated_at: string | null
          webhook_url: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_enabled?: boolean | null
          updated_at?: string | null
          webhook_url?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_enabled?: boolean | null
          updated_at?: string | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_assistant_config_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_permissions: {
        Row: {
          can_assign_technicians: boolean | null
          can_create_projects: boolean | null
          client_id: string
          created_at: string
          granted_by: string | null
          id: string
          updated_at: string
        }
        Insert: {
          can_assign_technicians?: boolean | null
          can_create_projects?: boolean | null
          client_id: string
          created_at?: string
          granted_by?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          can_assign_technicians?: boolean | null
          can_create_projects?: boolean | null
          client_id?: string
          created_at?: string
          granted_by?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_permissions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_permissions: {
        Row: {
          can_book_hours: boolean | null
          created_at: string
          customer_id: string
          id: string
          technician_id: string
        }
        Insert: {
          can_book_hours?: boolean | null
          created_at?: string
          customer_id: string
          id?: string
          technician_id: string
        }
        Update: {
          can_book_hours?: boolean | null
          created_at?: string
          customer_id?: string
          id?: string
          technician_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_permissions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_permissions_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_technician_assignments: {
        Row: {
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          id: string
          technician_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          id?: string
          technician_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          id?: string
          technician_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_technician_assignments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_technician_assignments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_technician_assignments_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_technician_rates: {
        Row: {
          created_at: string | null
          customer_id: string | null
          id: string
          technician_id: string | null
          travel_expense_from_client: number | null
          travel_expense_to_technician: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          technician_id?: string | null
          travel_expense_from_client?: number | null
          travel_expense_to_technician?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          technician_id?: string | null
          travel_expense_from_client?: number | null
          travel_expense_to_technician?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_technician_rates_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_technician_rates_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          address: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          address?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      hour_imports: {
        Row: {
          created_at: string
          date: string
          difference: number | null
          id: string
          manual_hours: number | null
          status: string
          technician_id: string
          updated_at: string
          webhook_hours: number
        }
        Insert: {
          created_at?: string
          date: string
          difference?: number | null
          id?: string
          manual_hours?: number | null
          status?: string
          technician_id: string
          updated_at?: string
          webhook_hours: number
        }
        Update: {
          created_at?: string
          date?: string
          difference?: number | null
          id?: string
          manual_hours?: number | null
          status?: string
          technician_id?: string
          updated_at?: string
          webhook_hours?: number
        }
        Relationships: []
      }
      KeepAWAKE: {
        Row: {
          created_at: string
          id: number
        }
        Insert: {
          created_at: string
          id?: number
        }
        Update: {
          created_at?: string
          id?: number
        }
        Relationships: []
      }
      magazine_articles: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          Location: string | null
          Magazine_name: string | null
          part_name: string
          part_number: string
          price: number | null
          stock_quantity: number
          supplier: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          Location?: string | null
          Magazine_name?: string | null
          part_name: string
          part_number: string
          price?: number | null
          stock_quantity: number
          supplier?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          Location?: string | null
          Magazine_name?: string | null
          part_name?: string
          part_number?: string
          price?: number | null
          stock_quantity?: number
          supplier?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          customer: string | null
          full_name: string | null
          id: string
          role: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          created_at?: string | null
          customer?: string | null
          full_name?: string | null
          id: string
          role?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          created_at?: string | null
          customer?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      project_permissions: {
        Row: {
          can_view: boolean | null
          created_at: string
          id: string
          project_id: string
          technician_id: string
        }
        Insert: {
          can_view?: boolean | null
          created_at?: string
          id?: string
          project_id: string
          technician_id: string
        }
        Update: {
          can_view?: boolean | null
          created_at?: string
          id?: string
          project_id?: string
          technician_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_permissions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_permissions_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string | null
          customer_id: string | null
          date: string
          description: string | null
          hours_spent: number
          id: string
          images: string[] | null
          is_public: boolean | null
          status: string | null
          technician_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          date: string
          description?: string | null
          hours_spent: number
          id?: string
          images?: string[] | null
          is_public?: boolean | null
          status?: string | null
          technician_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          date?: string
          description?: string | null
          hours_spent?: number
          id?: string
          images?: string[] | null
          is_public?: boolean | null
          status?: string | null
          technician_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      technician_rates: {
        Row: {
          billable_rate: number | null
          created_at: string | null
          hourly_rate: number | null
          id: string
          saturday_rate: number | null
          sunday_rate: number | null
          technician_id: string | null
          updated_at: string | null
        }
        Insert: {
          billable_rate?: number | null
          created_at?: string | null
          hourly_rate?: number | null
          id?: string
          saturday_rate?: number | null
          sunday_rate?: number | null
          technician_id?: string | null
          updated_at?: string | null
        }
        Update: {
          billable_rate?: number | null
          created_at?: string | null
          hourly_rate?: number | null
          id?: string
          saturday_rate?: number | null
          sunday_rate?: number | null
          technician_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "technician_rates_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vacation_requests: {
        Row: {
          approved_by: string | null
          created_at: string
          end_date: string
          id: string
          reason: string | null
          reviewed_at: string | null
          start_date: string
          status: string
          technician_id: string
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          end_date: string
          id?: string
          reason?: string | null
          reviewed_at?: string | null
          start_date: string
          status?: string
          technician_id: string
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          end_date?: string
          id?: string
          reason?: string | null
          reviewed_at?: string | null
          start_date?: string
          status?: string
          technician_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vacation_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacation_requests_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_hours: {
        Row: {
          created_at: string
          date: string
          hours_worked: number
          id: string
          received_at: string
          technician_id: string
          verified_at: string | null
          verified_by: string | null
          webhook_end: string | null
          webhook_start: string | null
          webhook_verified: boolean
        }
        Insert: {
          created_at?: string
          date: string
          hours_worked: number
          id?: string
          received_at?: string
          technician_id: string
          verified_at?: string | null
          verified_by?: string | null
          webhook_end?: string | null
          webhook_start?: string | null
          webhook_verified?: boolean
        }
        Update: {
          created_at?: string
          date?: string
          hours_worked?: number
          id?: string
          received_at?: string
          technician_id?: string
          verified_at?: string | null
          verified_by?: string | null
          webhook_end?: string | null
          webhook_start?: string | null
          webhook_verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "webhook_hours_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_hours_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      work_hours: {
        Row: {
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          date: string
          description: string | null
          end_time: string | null
          hours_worked: number
          id: string
          is_manual_entry: boolean | null
          is_sunday: boolean | null
          is_weekend: boolean | null
          manual_verified: boolean | null
          overtime_hours: number | null
          regular_hours: number | null
          start_time: string | null
          sunday_hours: number | null
          technician_id: string | null
          travel_expense_from_client: number | null
          travel_expense_to_technician: number | null
          weekend_hours: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          date: string
          description?: string | null
          end_time?: string | null
          hours_worked: number
          id?: string
          is_manual_entry?: boolean | null
          is_sunday?: boolean | null
          is_weekend?: boolean | null
          manual_verified?: boolean | null
          overtime_hours?: number | null
          regular_hours?: number | null
          start_time?: string | null
          sunday_hours?: number | null
          technician_id?: string | null
          travel_expense_from_client?: number | null
          travel_expense_to_technician?: number | null
          weekend_hours?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          date?: string
          description?: string | null
          end_time?: string | null
          hours_worked?: number
          id?: string
          is_manual_entry?: boolean | null
          is_sunday?: boolean | null
          is_weekend?: boolean | null
          manual_verified?: boolean | null
          overtime_hours?: number | null
          regular_hours?: number | null
          start_time?: string | null
          sunday_hours?: number | null
          technician_id?: string | null
          travel_expense_from_client?: number | null
          travel_expense_to_technician?: number | null
          weekend_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "work_hours_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_hours_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_hours_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      work_schedules: {
        Row: {
          created_at: string
          date: string | null
          id: string
          is_working: boolean | null
          technician_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date?: string | null
          id?: string
          is_working?: boolean | null
          technician_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string | null
          id?: string
          is_working?: boolean | null
          technician_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_schedules_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      n8n_chat_histories: {
        Row: {
          id: number
          session_id: string | null
          message: Json | null
          created_at: string | null
        }
        Insert: {
          id?: number
          session_id?: string | null
          message?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: number
          session_id?: string | null
          message?: Json | null
          created_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      process_webhook_hours: {
        Args: { p_technician_id: string; p_date: string; p_hours: number }
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
  public: {
    Enums: {},
  },
} as const
