export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
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
      profiles: {
        Row: {
          created_at: string | null
          full_name: string | null
          id: string
          role: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          created_at?: string | null
          full_name?: string | null
          id: string
          role?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          created_at?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
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
          technician_id: string | null
          updated_at: string | null
        }
        Insert: {
          billable_rate?: number | null
          created_at?: string | null
          hourly_rate?: number | null
          id?: string
          technician_id?: string | null
          updated_at?: string | null
        }
        Update: {
          billable_rate?: number | null
          created_at?: string | null
          hourly_rate?: number | null
          id?: string
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
      webhook_hours: {
        Row: {
          created_at: string
          date: string
          hours_worked: number
          id: string
          received_at: string
          technician_id: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          date: string
          hours_worked: number
          id?: string
          received_at?: string
          technician_id: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          date?: string
          hours_worked?: number
          id?: string
          received_at?: string
          technician_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      work_hours: {
        Row: {
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          date: string
          description: string | null
          hours_worked: number
          id: string
          is_manual_entry: boolean | null
          is_sunday: boolean | null
          is_weekend: boolean | null
          overtime_hours: number | null
          regular_hours: number | null
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
          hours_worked: number
          id?: string
          is_manual_entry?: boolean | null
          is_sunday?: boolean | null
          is_weekend?: boolean | null
          overtime_hours?: number | null
          regular_hours?: number | null
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
          hours_worked?: number
          id?: string
          is_manual_entry?: boolean | null
          is_sunday?: boolean | null
          is_weekend?: boolean | null
          overtime_hours?: number | null
          regular_hours?: number | null
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
