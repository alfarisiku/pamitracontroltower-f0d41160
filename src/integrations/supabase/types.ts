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
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: string | null
          entity_id: string | null
          entity_type: string
          id: string
          project_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          project_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
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
      finance_entries: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["finance_category"] | null
          created_at: string
          description: string | null
          direction: Database["public"]["Enums"]["finance_direction"]
          entry_kind: Database["public"]["Enums"]["finance_entry_kind"]
          frequency: Database["public"]["Enums"]["finance_frequency"]
          id: string
          period_date: string
          period_label: string
          po_id: string | null
          project_id: string
          related_activity: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          category?: Database["public"]["Enums"]["finance_category"] | null
          created_at?: string
          description?: string | null
          direction: Database["public"]["Enums"]["finance_direction"]
          entry_kind: Database["public"]["Enums"]["finance_entry_kind"]
          frequency?: Database["public"]["Enums"]["finance_frequency"]
          id?: string
          period_date: string
          period_label: string
          po_id?: string | null
          project_id: string
          related_activity?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["finance_category"] | null
          created_at?: string
          description?: string | null
          direction?: Database["public"]["Enums"]["finance_direction"]
          entry_kind?: Database["public"]["Enums"]["finance_entry_kind"]
          frequency?: Database["public"]["Enums"]["finance_frequency"]
          id?: string
          period_date?: string
          period_label?: string
          po_id?: string | null
          project_id?: string
          related_activity?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_entries_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      manpower_logs: {
        Row: {
          category: string
          created_at: string
          description: string | null
          hours_per_worker: number
          id: string
          log_date: string
          project_id: string
          updated_at: string
          workers: number
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          hours_per_worker?: number
          id?: string
          log_date?: string
          project_id: string
          updated_at?: string
          workers?: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          hours_per_worker?: number
          id?: string
          log_date?: string
          project_id?: string
          updated_at?: string
          workers?: number
        }
        Relationships: []
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
      procurement_items: {
        Row: {
          amount: number
          approval_date: string | null
          created_at: string
          delivery_actual_date: string | null
          delivery_date: string | null
          delivery_plan_date: string | null
          description: string | null
          fabrication_date: string | null
          id: string
          install_date: string | null
          item_name: string
          onsite_actual_date: string | null
          onsite_plan_date: string | null
          po_actual_date: string | null
          po_date: string | null
          po_plan_date: string | null
          pr_actual_date: string | null
          pr_plan_date: string | null
          project_id: string
          qty: number
          rfq_date: string | null
          status: string
          unit: string
          updated_at: string
          vendor: string | null
        }
        Insert: {
          amount?: number
          approval_date?: string | null
          created_at?: string
          delivery_actual_date?: string | null
          delivery_date?: string | null
          delivery_plan_date?: string | null
          description?: string | null
          fabrication_date?: string | null
          id?: string
          install_date?: string | null
          item_name: string
          onsite_actual_date?: string | null
          onsite_plan_date?: string | null
          po_actual_date?: string | null
          po_date?: string | null
          po_plan_date?: string | null
          pr_actual_date?: string | null
          pr_plan_date?: string | null
          project_id: string
          qty?: number
          rfq_date?: string | null
          status?: string
          unit?: string
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          amount?: number
          approval_date?: string | null
          created_at?: string
          delivery_actual_date?: string | null
          delivery_date?: string | null
          delivery_plan_date?: string | null
          description?: string | null
          fabrication_date?: string | null
          id?: string
          install_date?: string | null
          item_name?: string
          onsite_actual_date?: string | null
          onsite_plan_date?: string | null
          po_actual_date?: string | null
          po_date?: string | null
          po_plan_date?: string | null
          pr_actual_date?: string | null
          pr_plan_date?: string | null
          project_id?: string
          qty?: number
          rfq_date?: string | null
          status?: string
          unit?: string
          updated_at?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "procurement_items_project_id_fkey"
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
          category: string
          closed_at: string | null
          completion_percentage: number
          created_at: string
          current_status: string
          description: string | null
          due_date: string | null
          id: string
          impact: string | null
          is_resolved: boolean
          mitigation_plan: string | null
          pic: string
          priority: string
          probability: string | null
          project_id: string
          resolved_at: string | null
          risk_owner: string | null
          severity: Database["public"]["Enums"]["alert_severity"]
          title: string
        }
        Insert: {
          category?: string
          closed_at?: string | null
          completion_percentage?: number
          created_at?: string
          current_status?: string
          description?: string | null
          due_date?: string | null
          id?: string
          impact?: string | null
          is_resolved?: boolean
          mitigation_plan?: string | null
          pic?: string
          priority?: string
          probability?: string | null
          project_id: string
          resolved_at?: string | null
          risk_owner?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          title: string
        }
        Update: {
          category?: string
          closed_at?: string | null
          completion_percentage?: number
          created_at?: string
          current_status?: string
          description?: string | null
          due_date?: string | null
          id?: string
          impact?: string | null
          is_resolved?: boolean
          mitigation_plan?: string | null
          pic?: string
          priority?: string
          probability?: string | null
          project_id?: string
          resolved_at?: string | null
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
      project_photos: {
        Row: {
          activity_category: string
          caption: string | null
          description: string
          id: string
          location: string
          photo_date: string | null
          photo_url: string
          project_id: string
          title: string
          uploaded_at: string
          week_label: string | null
        }
        Insert: {
          activity_category?: string
          caption?: string | null
          description?: string
          id?: string
          location?: string
          photo_date?: string | null
          photo_url: string
          project_id: string
          title?: string
          uploaded_at?: string
          week_label?: string | null
        }
        Update: {
          activity_category?: string
          caption?: string | null
          description?: string
          id?: string
          location?: string
          photo_date?: string | null
          photo_url?: string
          project_id?: string
          title?: string
          uploaded_at?: string
          week_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_photos_project_id_fkey"
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
          contract_value: number
          created_at: string
          description: string | null
          end_date: string
          id: string
          image_url: string | null
          location: string
          manager: string
          map_x: number
          map_y: number
          margin_locked: boolean
          model_3d_url: string | null
          name: string
          phase: string
          profit_margin_target: number
          progress: number
          project_code: string
          rap: number
          spent: number
          start_date: string
          status: string
          tkdn_percentage: number
          updated_at: string
          video_url: string | null
        }
        Insert: {
          budget?: number
          category?: string | null
          cctv_url?: string | null
          client: string
          contract_value?: number
          created_at?: string
          description?: string | null
          end_date: string
          id?: string
          image_url?: string | null
          location: string
          manager: string
          map_x?: number
          map_y?: number
          margin_locked?: boolean
          model_3d_url?: string | null
          name: string
          phase?: string
          profit_margin_target?: number
          progress?: number
          project_code: string
          rap?: number
          spent?: number
          start_date: string
          status?: string
          tkdn_percentage?: number
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          budget?: number
          category?: string | null
          cctv_url?: string | null
          client?: string
          contract_value?: number
          created_at?: string
          description?: string | null
          end_date?: string
          id?: string
          image_url?: string | null
          location?: string
          manager?: string
          map_x?: number
          map_y?: number
          margin_locked?: boolean
          model_3d_url?: string | null
          name?: string
          phase?: string
          profit_margin_target?: number
          progress?: number
          project_code?: string
          rap?: number
          spent?: number
          start_date?: string
          status?: string
          tkdn_percentage?: number
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      purchase_orders: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string
          id: string
          penalty_amount: number
          penalty_note: string | null
          po_date: string | null
          project_id: string
          related_activity: string | null
          status: string
          updated_at: string
          vendor: string | null
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          description?: string
          id?: string
          penalty_amount?: number
          penalty_note?: string | null
          po_date?: string | null
          project_id: string
          related_activity?: string | null
          status?: string
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string
          id?: string
          penalty_amount?: number
          penalty_note?: string | null
          po_date?: string | null
          project_id?: string
          related_activity?: string | null
          status?: string
          updated_at?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      s_curve_data: {
        Row: {
          actual_progress: number | null
          created_at: string
          curve_type: string
          id: string
          period_end: string | null
          period_label: string
          period_order: number
          period_start: string | null
          planned_progress: number
          project_id: string
        }
        Insert: {
          actual_progress?: number | null
          created_at?: string
          curve_type?: string
          id?: string
          period_end?: string | null
          period_label: string
          period_order?: number
          period_start?: string | null
          planned_progress?: number
          project_id: string
        }
        Update: {
          actual_progress?: number | null
          created_at?: string
          curve_type?: string
          id?: string
          period_end?: string | null
          period_label?: string
          period_order?: number
          period_start?: string | null
          planned_progress?: number
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "s_curve_data_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
      weekly_progress_reports: {
        Row: {
          achievements: Json
          created_at: string
          escalations: Json
          id: string
          next_week_targets: Json
          outstanding_items: Json
          project_id: string
          summary: string
          updated_at: string
          week_end_date: string
          week_start_date: string
        }
        Insert: {
          achievements?: Json
          created_at?: string
          escalations?: Json
          id?: string
          next_week_targets?: Json
          outstanding_items?: Json
          project_id: string
          summary?: string
          updated_at?: string
          week_end_date: string
          week_start_date: string
        }
        Update: {
          achievements?: Json
          created_at?: string
          escalations?: Json
          id?: string
          next_week_targets?: Json
          outstanding_items?: Json
          project_id?: string
          summary?: string
          updated_at?: string
          week_end_date?: string
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_progress_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      work_areas: {
        Row: {
          code: string
          created_at: string
          epcc_category: string
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
          epcc_category?: string
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
          epcc_category?: string
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
          epcc_category: string
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
          epcc_category?: string
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
          epcc_category?: string
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
      project_cashflow: {
        Row: {
          actual_progress: number | null
          cash_in: number | null
          cash_out: number | null
          created_at: string | null
          id: string | null
          period_label: string | null
          period_order: number | null
          planned_progress: number | null
          project_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
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
      finance_category:
        | "project_management"
        | "material"
        | "services"
        | "mob_demob"
        | "tools_consumables"
        | "equipment"
        | "testing_commissioning"
        | "special_approval"
        | "bank_guarantee"
        | "overhead"
        | "other"
      finance_direction: "in" | "out"
      finance_entry_kind: "rap" | "po" | "actual" | "forecast"
      finance_frequency: "weekly" | "monthly"
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
      finance_category: [
        "project_management",
        "material",
        "services",
        "mob_demob",
        "tools_consumables",
        "equipment",
        "testing_commissioning",
        "special_approval",
        "bank_guarantee",
        "overhead",
        "other",
      ],
      finance_direction: ["in", "out"],
      finance_entry_kind: ["rap", "po", "actual", "forecast"],
      finance_frequency: ["weekly", "monthly"],
    },
  },
} as const
