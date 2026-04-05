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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      addendums: {
        Row: {
          addendum_code: string
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          cost_impact: number
          created_at: string
          description: string
          id: string
          project_id: string
          schedule_impact_days: number
          scope_change: string | null
          updated_at: string
        }
        Insert: {
          addendum_code: string
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          cost_impact?: number
          created_at?: string
          description?: string
          id?: string
          project_id: string
          schedule_impact_days?: number
          scope_change?: string | null
          updated_at?: string
        }
        Update: {
          addendum_code?: string
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          cost_impact?: number
          created_at?: string
          description?: string
          id?: string
          project_id?: string
          schedule_impact_days?: number
          scope_change?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "addendums_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          actual_date: string | null
          created_at: string
          id: string
          name: string
          phase: string
          project_id: string
          sort_order: number
          status: string
          target_date: string
          weight: number
        }
        Insert: {
          actual_date?: string | null
          created_at?: string
          id?: string
          name: string
          phase?: string
          project_id: string
          sort_order?: number
          status?: string
          target_date: string
          weight?: number
        }
        Update: {
          actual_date?: string | null
          created_at?: string
          id?: string
          name?: string
          phase?: string
          project_id?: string
          sort_order?: number
          status?: string
          target_date?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_budgets: {
        Row: {
          actual: number
          created_at: string
          id: string
          month: string
          planned: number
          year: number
        }
        Insert: {
          actual?: number
          created_at?: string
          id?: string
          month: string
          planned?: number
          year: number
        }
        Update: {
          actual?: number
          created_at?: string
          id?: string
          month?: string
          planned?: number
          year?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string | null
          project_id: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          project_id?: string | null
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          project_id?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          assigned_project_id: string | null
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          assigned_project_id?: string | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          assigned_project_id?: string | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_alerts: {
        Row: {
          created_at: string
          description: string | null
          id: string
          impact: string | null
          is_resolved: boolean
          mitigation_plan: string | null
          probability: string | null
          project_id: string
          risk_owner: string | null
          severity: Database["public"]["Enums"]["alert_severity"]
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          impact?: string | null
          is_resolved?: boolean
          mitigation_plan?: string | null
          probability?: string | null
          project_id: string
          risk_owner?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          impact?: string | null
          is_resolved?: boolean
          mitigation_plan?: string | null
          probability?: string | null
          project_id?: string
          risk_owner?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_alerts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          budget: number
          category: string | null
          cctv_url: string | null
          client: string
          created_at: string
          description: string | null
          end_date: string
          id: string
          image_url: string | null
          location: string
          manager: string
          map_x: number
          map_y: number
          name: string
          phase: Database["public"]["Enums"]["project_phase"]
          progress: number
          project_code: string
          spent: number
          start_date: string
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
          video_url: string | null
        }
        Insert: {
          budget?: number
          category?: string | null
          cctv_url?: string | null
          client: string
          created_at?: string
          description?: string | null
          end_date: string
          id?: string
          image_url?: string | null
          location: string
          manager: string
          map_x?: number
          map_y?: number
          name: string
          phase?: Database["public"]["Enums"]["project_phase"]
          progress?: number
          project_code: string
          spent?: number
          start_date: string
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          budget?: number
          category?: string | null
          cctv_url?: string | null
          client?: string
          created_at?: string
          description?: string | null
          end_date?: string
          id?: string
          image_url?: string | null
          location?: string
          manager?: string
          map_x?: number
          map_y?: number
          name?: string
          phase?: Database["public"]["Enums"]["project_phase"]
          progress?: number
          project_code?: string
          spent?: number
          start_date?: string
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      sub_tasks: {
        Row: {
          created_at: string
          id: string
          name: string
          progress: number
          qty_completed: number
          qty_total: number
          sort_order: number
          status: string
          unit: string
          work_item_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          progress?: number
          qty_completed?: number
          qty_total?: number
          sort_order?: number
          status?: string
          unit?: string
          work_item_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          progress?: number
          qty_completed?: number
          qty_total?: number
          sort_order?: number
          status?: string
          unit?: string
          work_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_tasks_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
        ]
      }
      user_project_assignments: {
        Row: {
          created_at: string
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_project_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
      work_areas: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          progress: number
          project_id: string
          sort_order: number
          weight: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          progress?: number
          project_id: string
          sort_order?: number
          weight?: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          progress?: number
          project_id?: string
          sort_order?: number
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "work_areas_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      work_items: {
        Row: {
          code: string
          created_at: string
          end_date: string | null
          id: string
          name: string
          progress: number
          qty_completed: number
          qty_total: number
          sort_order: number
          start_date: string | null
          status: string
          unit: string
          weight: number
          work_area_id: string
        }
        Insert: {
          code: string
          created_at?: string
          end_date?: string | null
          id?: string
          name: string
          progress?: number
          qty_completed?: number
          qty_total?: number
          sort_order?: number
          start_date?: string | null
          status?: string
          unit?: string
          weight?: number
          work_area_id: string
        }
        Update: {
          code?: string
          created_at?: string
          end_date?: string | null
          id?: string
          name?: string
          progress?: number
          qty_completed?: number
          qty_total?: number
          sort_order?: number
          start_date?: string | null
          status?: string
          unit?: string
          weight?: number
          work_area_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_items_work_area_id_fkey"
            columns: ["work_area_id"]
            isOneToOne: false
            referencedRelation: "work_areas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      alert_severity: "critical" | "high" | "medium" | "low"
      app_role: "admin" | "management" | "team" | "client"
      project_phase:
        | "Engineering"
        | "Procurement"
        | "Construction"
        | "Commissioning"
      project_status: "on-track" | "at-risk" | "delayed" | "completed"
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
      alert_severity: ["critical", "high", "medium", "low"],
      app_role: ["admin", "management", "team", "client"],
      project_phase: [
        "Engineering",
        "Procurement",
        "Construction",
        "Commissioning",
      ],
      project_status: ["on-track", "at-risk", "delayed", "completed"],
    },
  },
} as const
