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
      cards: {
        Row: {
          category_id: string
          covers: Json
          created_at: string
          function: string | null
          id: string
          image_author: string | null
          image_license: string | null
          image_path: string | null
          image_source: string | null
          innervation: string | null
          insertion: string | null
          is_public: boolean
          marker: Json | null
          name_latin: string | null
          name_nl: string
          origin: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id: string
          covers?: Json
          created_at?: string
          function?: string | null
          id?: string
          image_author?: string | null
          image_license?: string | null
          image_path?: string | null
          image_source?: string | null
          innervation?: string | null
          insertion?: string | null
          is_public?: boolean
          marker?: Json | null
          name_latin?: string | null
          name_nl: string
          origin?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          category_id?: string
          covers?: Json
          created_at?: string
          function?: string | null
          id?: string
          image_author?: string | null
          image_license?: string | null
          image_path?: string | null
          image_source?: string | null
          innervation?: string | null
          insertion?: string | null
          is_public?: boolean
          marker?: Json | null
          name_latin?: string | null
          name_nl?: string
          origin?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cards_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          user_id?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      category_invites: {
        Row: {
          category_id: string
          created_at: string
          expires_at: string
          id: string
          revoked_at: string | null
          token: string
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          expires_at?: string
          id?: string
          revoked_at?: string | null
          token?: string
          user_id?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          revoked_at?: string | null
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      category_shares: {
        Row: {
          copied_category_id: string
          created_at: string
          id: string
          invite_id: string | null
          recipient_id: string
          source_category_id: string
        }
        Insert: {
          copied_category_id: string
          created_at?: string
          id?: string
          invite_id?: string | null
          recipient_id: string
          source_category_id: string
        }
        Update: {
          copied_category_id?: string
          created_at?: string
          id?: string
          invite_id?: string | null
          recipient_id?: string
          source_category_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          daily_goal: number
          display_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          daily_goal?: number
          display_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          daily_goal?: number
          display_name?: string | null
          id?: string
        }
        Relationships: []
      }
      review_log: {
        Row: {
          card_id: string
          direction: string
          id: string
          rating: string
          reviewed_at: string
          user_id: string
        }
        Insert: {
          card_id: string
          direction: string
          id?: string
          rating: string
          reviewed_at?: string
          user_id?: string
        }
        Update: {
          card_id?: string
          direction?: string
          id?: string
          rating?: string
          reviewed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_log_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          card_id: string
          due_date: string
          ease_factor: number
          interval_days: number
          last_reviewed: string | null
          repetitions: number
          user_id: string
        }
        Insert: {
          card_id: string
          due_date?: string
          ease_factor?: number
          interval_days?: number
          last_reviewed?: string | null
          repetitions?: number
          user_id?: string
        }
        Update: {
          card_id?: string
          due_date?: string
          ease_factor?: number
          interval_days?: number
          last_reviewed?: string | null
          repetitions?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invite: { Args: { p_token: string }; Returns: string }
      can_read_shared_image: { Args: { p_path: string }; Returns: boolean }
      category_stats: {
        Args: { p_tz?: string }
        Returns: {
          category_id: string
          good_30: number
          learning: number
          mature: number
          new_cards: number
          reviews_30: number
          total: number
        }[]
      }
      daily_review_counts: {
        Args: { p_days?: number; p_tz?: string }
        Returns: { category_id: string; day: string; good: number; reviews: number }[]
      }
      due_forecast: {
        Args: { p_days?: number; p_tz?: string }
        Returns: { day: string; due: number }[]
      }
      streak_stats: {
        Args: { p_tz?: string }
        Returns: { current_streak: number; longest_streak: number; reviewed_today: number; total_reviews: number }[]
      }
      weakest_cards: {
        Args: { p_limit?: number; p_tz?: string }
        Returns: { again_count: number; card_id: string; category_id: string; name_nl: string }[]
      }
      invite_preview: {
        Args: { p_token: string }
        Returns: {
          card_count: number
          category_color: string
          category_name: string
          copied_category_id: string | null
          is_owner: boolean
          owner_name: string | null
        }[]
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
    Enums: {},
  },
} as const
