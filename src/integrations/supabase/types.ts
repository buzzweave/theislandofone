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
      ai_dev_audit: {
        Row: {
          action: string
          created_at: string
          details: Json
          id: string
          plan_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json
          id?: string
          plan_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json
          id?: string
          plan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_dev_audit_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "ai_dev_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_dev_backups: {
        Row: {
          created_at: string
          id: string
          plan_id: string
          snapshot: Json
          type: string
          version_tag: string
        }
        Insert: {
          created_at?: string
          id?: string
          plan_id: string
          snapshot?: Json
          type?: string
          version_tag: string
        }
        Update: {
          created_at?: string
          id?: string
          plan_id?: string
          snapshot?: Json
          type?: string
          version_tag?: string
        }
        Relationships: []
      }
      ai_dev_deployments: {
        Row: {
          created_at: string
          environment: string
          id: string
          kind: string
          plan_id: string
          request_payload: Json
          response_payload: Json
          status: string
          version_tag: string
        }
        Insert: {
          created_at?: string
          environment: string
          id?: string
          kind?: string
          plan_id: string
          request_payload?: Json
          response_payload?: Json
          status: string
          version_tag: string
        }
        Update: {
          created_at?: string
          environment?: string
          id?: string
          kind?: string
          plan_id?: string
          request_payload?: Json
          response_payload?: Json
          status?: string
          version_tag?: string
        }
        Relationships: []
      }
      ai_dev_plans: {
        Row: {
          created_at: string
          id: string
          mode: string
          plan: Json | null
          prompt: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          mode?: string
          plan?: Json | null
          prompt: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          mode?: string
          plan?: Json | null
          prompt?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_dev_scans: {
        Row: {
          created_at: string
          id: string
          results: Json
          scan_type: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          results?: Json
          scan_type?: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          results?: Json
          scan_type?: string
          status?: string
        }
        Relationships: []
      }
      ai_dev_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      audiobooks: {
        Row: {
          audio_url: string
          content_id: string
          content_type: string
          created_at: string
          id: string
          is_separate_price: boolean
          is_visible: boolean
          price: number
          title: string
          updated_at: string
          voice_id: string
          voice_provider: string
        }
        Insert: {
          audio_url?: string
          content_id: string
          content_type: string
          created_at?: string
          id?: string
          is_separate_price?: boolean
          is_visible?: boolean
          price?: number
          title?: string
          updated_at?: string
          voice_id?: string
          voice_provider?: string
        }
        Update: {
          audio_url?: string
          content_id?: string
          content_type?: string
          created_at?: string
          id?: string
          is_separate_price?: boolean
          is_visible?: boolean
          price?: number
          title?: string
          updated_at?: string
          voice_id?: string
          voice_provider?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author: string
          content: string
          created_at: string
          excerpt: string
          id: string
          image_url: string
          is_published: boolean
          published_at: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author?: string
          content?: string
          created_at?: string
          excerpt?: string
          id?: string
          image_url?: string
          is_published?: boolean
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author?: string
          content?: string
          created_at?: string
          excerpt?: string
          id?: string
          image_url?: string
          is_published?: boolean
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      book_chapters: {
        Row: {
          book_id: string
          content: string
          created_at: string
          id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          book_id: string
          content?: string
          created_at?: string
          id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Update: {
          book_id?: string
          content?: string
          created_at?: string
          id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_chapters_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      book_publish_records: {
        Row: {
          book_id: string
          created_at: string
          id: string
          notes: string | null
          platform: string
          published_at: string | null
          status: string
          store_url: string | null
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          notes?: string | null
          platform: string
          published_at?: string | null
          status?: string
          store_url?: string | null
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          platform?: string
          published_at?: string | null
          status?: string
          store_url?: string | null
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_publish_records_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          access_tiers: string[]
          audio_url: string | null
          author: string
          category: string
          cover_image: string
          created_at: string
          description: string
          featured: boolean
          id: string
          is_free: boolean
          pdf_url: string
          price: number
          sort_order: number
          subtitle: string
          title: string
          updated_at: string
        }
        Insert: {
          access_tiers?: string[]
          audio_url?: string | null
          author?: string
          category?: string
          cover_image?: string
          created_at?: string
          description?: string
          featured?: boolean
          id?: string
          is_free?: boolean
          pdf_url?: string
          price?: number
          sort_order?: number
          subtitle?: string
          title: string
          updated_at?: string
        }
        Update: {
          access_tiers?: string[]
          audio_url?: string | null
          author?: string
          category?: string
          cover_image?: string
          created_at?: string
          description?: string
          featured?: boolean
          id?: string
          is_free?: boolean
          pdf_url?: string
          price?: number
          sort_order?: number
          subtitle?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          admin_notes: string | null
          created_at: string
          email: string
          id: string
          message: string
          name: string
          page_url: string | null
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          email: string
          id?: string
          message?: string
          name: string
          page_url?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          page_url?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      forum_categories: {
        Row: {
          created_at: string
          description: string
          id: string
          name: string
          slug: string
          sort_order: number
          tier_required: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
          tier_required?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          tier_required?: string
        }
        Relationships: []
      }
      forum_posts: {
        Row: {
          author_name: string
          category_id: string
          content: string
          created_at: string
          id: string
          is_locked: boolean
          is_pinned: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          author_name: string
          category_id: string
          content: string
          created_at?: string
          id?: string
          is_locked?: boolean
          is_pinned?: boolean
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          author_name?: string
          category_id?: string
          content?: string
          created_at?: string
          id?: string
          is_locked?: boolean
          is_pinned?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "forum_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_replies: {
        Row: {
          author_name: string
          content: string
          created_at: string
          id: string
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          author_name: string
          content: string
          created_at?: string
          id?: string
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          author_name?: string
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_replies_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      graphics: {
        Row: {
          access_tiers: string[]
          category: string
          created_at: string
          description: string
          file_url: string
          id: string
          is_active: boolean
          preview_url: string
          price: number
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          access_tiers?: string[]
          category?: string
          created_at?: string
          description?: string
          file_url: string
          id?: string
          is_active?: boolean
          preview_url: string
          price?: number
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          access_tiers?: string[]
          category?: string
          created_at?: string
          description?: string
          file_url?: string
          id?: string
          is_active?: boolean
          preview_url?: string
          price?: number
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      hero_banners: {
        Row: {
          created_at: string
          cta_link: string | null
          cta_text: string | null
          id: string
          image_url: string
          is_active: boolean
          sort_order: number
          subtitle: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          id?: string
          image_url: string
          is_active?: boolean
          sort_order?: number
          subtitle?: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          id?: string
          image_url?: string
          is_active?: boolean
          sort_order?: number
          subtitle?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      members: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          plan: string
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          plan?: string
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          plan?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      membership_plans: {
        Row: {
          created_at: string
          features: string[]
          id: string
          is_featured: boolean
          name: string
          price: number
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          features?: string[]
          id?: string
          is_featured?: boolean
          name: string
          price?: number
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          features?: string[]
          id?: string
          is_featured?: boolean
          name?: string
          price?: number
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          email_queued: boolean
          id: string
          is_read: boolean
          preview: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          email_queued?: boolean
          id?: string
          is_read?: boolean
          preview?: string
          title?: string
          type?: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          email_queued?: boolean
          id?: string
          is_read?: boolean
          preview?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          amount: number
          created_at: string
          id: string
          item_id: string
          item_type: string
          stripe_session_id: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          item_id: string
          item_type: string
          stripe_session_id: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          stripe_session_id?: string
          user_id?: string
        }
        Relationships: []
      }
      sermons: {
        Row: {
          access_level: string
          access_tiers: string[]
          audio_url: string | null
          category: string
          created_at: string
          date: string
          excerpt: string
          featured: boolean
          id: string
          is_free: boolean
          manuscript: string
          preview_cutoff: number
          price: number
          scripture: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          access_level?: string
          access_tiers?: string[]
          audio_url?: string | null
          category?: string
          created_at?: string
          date?: string
          excerpt?: string
          featured?: boolean
          id?: string
          is_free?: boolean
          manuscript?: string
          preview_cutoff?: number
          price?: number
          scripture?: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          access_level?: string
          access_tiers?: string[]
          audio_url?: string | null
          category?: string
          created_at?: string
          date?: string
          excerpt?: string
          featured?: boolean
          id?: string
          is_free?: boolean
          manuscript?: string
          preview_cutoff?: number
          price?: number
          scripture?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      smtp_settings: {
        Row: {
          created_at: string
          encrypted_password: string
          encryption: string
          from_email: string
          from_name: string
          host: string
          id: string
          is_verified: boolean
          port: number
          reply_to: string
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          encrypted_password?: string
          encryption?: string
          from_email?: string
          from_name?: string
          host?: string
          id?: string
          is_verified?: boolean
          port?: number
          reply_to?: string
          updated_at?: string
          username?: string
        }
        Update: {
          created_at?: string
          encrypted_password?: string
          encryption?: string
          from_email?: string
          from_name?: string
          host?: string
          id?: string
          is_verified?: boolean
          port?: number
          reply_to?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      speaking_requests: {
        Row: {
          admin_notes: string | null
          budget: string | null
          created_at: string
          email: string
          event_date: string
          event_location: string | null
          event_name: string
          expected_attendance: string | null
          id: string
          message: string | null
          name: string
          organization: string | null
          phone: string | null
          status: string
          topic: string | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          budget?: string | null
          created_at?: string
          email: string
          event_date: string
          event_location?: string | null
          event_name: string
          expected_attendance?: string | null
          id?: string
          message?: string | null
          name: string
          organization?: string | null
          phone?: string | null
          status?: string
          topic?: string | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          budget?: string | null
          created_at?: string
          email?: string
          event_date?: string
          event_location?: string | null
          event_name?: string
          expected_attendance?: string | null
          id?: string
          message?: string | null
          name?: string
          organization?: string | null
          phone?: string | null
          status?: string
          topic?: string | null
          updated_at?: string
        }
        Relationships: []
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
      videos: {
        Row: {
          category: string
          created_at: string
          duration: string
          featured: boolean
          id: string
          is_active: boolean
          is_free: boolean
          price: number
          sort_order: number
          thumbnail: string
          title: string
          updated_at: string
          youtube_url: string
        }
        Insert: {
          category?: string
          created_at?: string
          duration?: string
          featured?: boolean
          id?: string
          is_active?: boolean
          is_free?: boolean
          price?: number
          sort_order?: number
          thumbnail?: string
          title: string
          updated_at?: string
          youtube_url?: string
        }
        Update: {
          category?: string
          created_at?: string
          duration?: string
          featured?: boolean
          id?: string
          is_active?: boolean
          is_free?: boolean
          price?: number
          sort_order?: number
          thumbnail?: string
          title?: string
          updated_at?: string
          youtube_url?: string
        }
        Relationships: []
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
      user_has_book_access: {
        Args: { _book_access_tiers: string[]; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
