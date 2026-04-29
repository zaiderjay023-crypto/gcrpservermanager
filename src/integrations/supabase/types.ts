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
      action_requests: {
        Row: {
          action: Database["public"]["Enums"]["action_type"]
          created_at: string
          id: string
          payload: Json
          requester_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          server_id: string
          status: string
          target_discord_id: string | null
          target_user_id: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["action_type"]
          created_at?: string
          id?: string
          payload?: Json
          requester_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          server_id: string
          status?: string
          target_discord_id?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["action_type"]
          created_at?: string
          id?: string
          payload?: Json
          requester_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          server_id?: string
          status?: string
          target_discord_id?: string | null
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "action_requests_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: Database["public"]["Enums"]["app_role"] | null
          created_at: string
          details: Json | null
          id: string
          server_id: string
          target_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["app_role"] | null
          created_at?: string
          details?: Json | null
          id?: string
          server_id: string
          target_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["app_role"] | null
          created_at?: string
          details?: Json | null
          id?: string
          server_id?: string
          target_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      fines: {
        Row: {
          amount: number
          created_at: string
          id: string
          issued_by: string
          reason: string
          server_id: string
          status: string
          target_discord_id: string
          target_user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          issued_by: string
          reason: string
          server_id: string
          status?: string
          target_discord_id: string
          target_user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          issued_by?: string
          reason?: string
          server_id?: string
          status?: string
          target_discord_id?: string
          target_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fines_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      licenses: {
        Row: {
          created_at: string
          discord_id: string
          id: string
          license_image_url: string | null
          license_number: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          roblox_username: string
          rp_age: number
          rp_citizenship: string
          rp_name: string
          server_id: string
          status: Database["public"]["Enums"]["license_status"]
          suspended_until: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          discord_id: string
          id?: string
          license_image_url?: string | null
          license_number?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          roblox_username: string
          rp_age: number
          rp_citizenship: string
          rp_name: string
          server_id: string
          status?: Database["public"]["Enums"]["license_status"]
          suspended_until?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          discord_id?: string
          id?: string
          license_image_url?: string | null
          license_number?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          roblox_username?: string
          rp_age?: number
          rp_citizenship?: string
          rp_name?: string
          server_id?: string
          status?: Database["public"]["Enums"]["license_status"]
          suspended_until?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "licenses_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          discord_access_token: string | null
          discord_avatar: string | null
          discord_id: string
          discord_refresh_token: string | null
          discord_username: string
          id: string
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          discord_access_token?: string | null
          discord_avatar?: string | null
          discord_id: string
          discord_refresh_token?: string | null
          discord_username: string
          id?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          discord_access_token?: string | null
          discord_avatar?: string | null
          discord_id?: string
          discord_refresh_token?: string | null
          discord_username?: string
          id?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      server_members: {
        Row: {
          created_at: string
          discord_id: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          server_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          discord_id: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          server_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          discord_id?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          server_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "server_members_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      server_role_permissions: {
        Row: {
          action: Database["public"]["Enums"]["action_type"]
          created_at: string
          discord_role_id: string
          id: string
          mode: string
          panel: Database["public"]["Enums"]["app_role"]
          server_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["action_type"]
          created_at?: string
          discord_role_id: string
          id?: string
          mode?: string
          panel?: Database["public"]["Enums"]["app_role"]
          server_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["action_type"]
          created_at?: string
          discord_role_id?: string
          id?: string
          mode?: string
          panel?: Database["public"]["Enums"]["app_role"]
          server_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "server_role_permissions_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      servers: {
        Row: {
          created_at: string
          fine_dm_message: string | null
          fines_channel_id: string | null
          guild_id: string
          id: string
          license_channel_id: string | null
          license_dm_message: string | null
          license_template: Json | null
          logo_url: string | null
          name: string
          owner_user_id: string
          slug: string
          suspension_dm_message: string | null
          suspensions_channel_id: string | null
          updated_at: string
          wanted_channel_id: string | null
          wanted_dm_message: string | null
        }
        Insert: {
          created_at?: string
          fine_dm_message?: string | null
          fines_channel_id?: string | null
          guild_id: string
          id?: string
          license_channel_id?: string | null
          license_dm_message?: string | null
          license_template?: Json | null
          logo_url?: string | null
          name: string
          owner_user_id: string
          slug: string
          suspension_dm_message?: string | null
          suspensions_channel_id?: string | null
          updated_at?: string
          wanted_channel_id?: string | null
          wanted_dm_message?: string | null
        }
        Update: {
          created_at?: string
          fine_dm_message?: string | null
          fines_channel_id?: string | null
          guild_id?: string
          id?: string
          license_channel_id?: string | null
          license_dm_message?: string | null
          license_template?: Json | null
          logo_url?: string | null
          name?: string
          owner_user_id?: string
          slug?: string
          suspension_dm_message?: string | null
          suspensions_channel_id?: string | null
          updated_at?: string
          wanted_channel_id?: string | null
          wanted_dm_message?: string | null
        }
        Relationships: []
      }
      wanted: {
        Row: {
          created_at: string
          id: string
          issued_by: string
          reason: string
          server_id: string
          status: string
          target_discord_id: string
          target_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          issued_by: string
          reason: string
          server_id: string
          status?: string
          target_discord_id: string
          target_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          issued_by?: string
          reason?: string
          server_id?: string
          status?: string
          target_discord_id?: string
          target_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wanted_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_server_role: {
        Args: { _server_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_server_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _server_id: string
          _user_id: string
        }
        Returns: boolean
      }
      is_server_member: {
        Args: { _server_id: string; _user_id: string }
        Returns: boolean
      }
      is_server_owner: {
        Args: { _server_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      action_type:
        | "approve_license"
        | "issue_fine"
        | "request_wanted"
        | "request_suspension"
        | "kick_police"
        | "kick_citizen"
        | "manage_server"
        | "view_audit"
      app_role: "owner" | "staff" | "police" | "citizen"
      license_status: "pending" | "approved" | "rejected" | "suspended"
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
      action_type: [
        "approve_license",
        "issue_fine",
        "request_wanted",
        "request_suspension",
        "kick_police",
        "kick_citizen",
        "manage_server",
        "view_audit",
      ],
      app_role: ["owner", "staff", "police", "citizen"],
      license_status: ["pending", "approved", "rejected", "suspended"],
    },
  },
} as const
