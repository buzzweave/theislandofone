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
      access_codes: {
        Row: {
          access_type: string
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_single_use: boolean
          notes: string | null
          plan_type: string
          redeemed_at: string | null
          redeemed_by_user_id: string | null
        }
        Insert: {
          access_type?: string
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_single_use?: boolean
          notes?: string | null
          plan_type?: string
          redeemed_at?: string | null
          redeemed_by_user_id?: string | null
        }
        Update: {
          access_type?: string
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_single_use?: boolean
          notes?: string | null
          plan_type?: string
          redeemed_at?: string | null
          redeemed_by_user_id?: string | null
        }
        Relationships: []
      }
      ai_conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
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
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content?: string
          conversation_id: string
          created_at?: string
          id?: string
          role?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      audiobooks: {
        Row: {
          audio_url: string
          content_id: string
          content_type: string
          cover_image: string
          created_at: string
          id: string
          is_featured: boolean
          is_free: boolean
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
          cover_image?: string
          created_at?: string
          id?: string
          is_featured?: boolean
          is_free?: boolean
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
          cover_image?: string
          created_at?: string
          id?: string
          is_featured?: boolean
          is_free?: boolean
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
          audio_url: string
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
          video_url: string
        }
        Insert: {
          audio_url?: string
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
          video_url?: string
        }
        Update: {
          audio_url?: string
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
          video_url?: string
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
          is_published: boolean
          pdf_url: string
          price: number
          published_at: string | null
          sort_order: number
          subtitle: string
          title: string
          unpublished_at: string | null
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
          is_published?: boolean
          pdf_url?: string
          price?: number
          published_at?: string | null
          sort_order?: number
          subtitle?: string
          title: string
          unpublished_at?: string | null
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
          is_published?: boolean
          pdf_url?: string
          price?: number
          published_at?: string | null
          sort_order?: number
          subtitle?: string
          title?: string
          unpublished_at?: string | null
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
      content_categories: {
        Row: {
          created_at: string
          description: string
          id: string
          name: string
          slug: string
          sort_order: number
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      content_reviews: {
        Row: {
          comment: string
          content_id: string
          content_type: string
          created_at: string
          fb_user_id: string
          id: string
          rating: number
          user_avatar: string
          user_name: string
        }
        Insert: {
          comment: string
          content_id: string
          content_type: string
          created_at?: string
          fb_user_id: string
          id?: string
          rating: number
          user_avatar?: string
          user_name: string
        }
        Update: {
          comment?: string
          content_id?: string
          content_type?: string
          created_at?: string
          fb_user_id?: string
          id?: string
          rating?: number
          user_avatar?: string
          user_name?: string
        }
        Relationships: []
      }
      email_campaigns: {
        Row: {
          content: string
          created_at: string
          id: string
          sent_at: string | null
          sent_count: number | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          subject?: string
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
      graphics_folder_images: {
        Row: {
          created_at: string
          file_name: string
          file_size: number
          file_url: string
          folder_id: string
          id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          file_name?: string
          file_size?: number
          file_url?: string
          folder_id: string
          id?: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number
          file_url?: string
          folder_id?: string
          id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "graphics_folder_images_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "graphics_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      graphics_folders: {
        Row: {
          cover_image: string
          created_at: string
          description: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          cover_image?: string
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          cover_image?: string
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
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
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          id: string
          invite_code: string
          invited_by: string
          status: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          id?: string
          invite_code?: string
          invited_by: string
          status?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          id?: string
          invite_code?: string
          invited_by?: string
          status?: string
        }
        Relationships: []
      }
      login_codes: {
        Row: {
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          used: boolean
        }
        Insert: {
          code: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          used?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          used?: boolean
        }
        Relationships: []
      }
      media_folders: {
        Row: {
          created_at: string
          id: string
          name: string
          org_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          org_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_folders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      media_images: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          folder_id: string | null
          id: string
          org_id: string
        }
        Insert: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          folder_id?: string | null
          id?: string
          org_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          folder_id?: string | null
          id?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_images_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "media_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_images_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      media_videos: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          org_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          org_id: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          org_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_videos_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
          is_visible: boolean
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
          is_visible?: boolean
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
          is_visible?: boolean
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
      organization_members: {
        Row: {
          created_at: string
          id: string
          org_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          slug?: string
          updated_at?: string
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
          is_published: boolean
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
          is_published?: boolean
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
          is_published?: boolean
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
      sms_campaigns: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          message_template: string
          name: string
          scheduled_for: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          message_template?: string
          name?: string
          scheduled_for?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          message_template?: string
          name?: string
          scheduled_for?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      sms_messages: {
        Row: {
          body: string
          campaign_id: string | null
          contact_id: string | null
          created_at: string
          error: string | null
          from_number: string
          id: string
          provider_message_id: string | null
          sent_at: string | null
          status: string
          to_number: string
        }
        Insert: {
          body?: string
          campaign_id?: string | null
          contact_id?: string | null
          created_at?: string
          error?: string | null
          from_number?: string
          id?: string
          provider_message_id?: string | null
          sent_at?: string | null
          status?: string
          to_number?: string
        }
        Update: {
          body?: string
          campaign_id?: string | null
          contact_id?: string | null
          created_at?: string
          error?: string | null
          from_number?: string
          id?: string
          provider_message_id?: string | null
          sent_at?: string | null
          status?: string
          to_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_messages_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "sms_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "subscribers"
            referencedColumns: ["id"]
          },
        ]
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
      subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean | null
          name: string | null
          phone_number: string | null
          sms_last_opt_in_at: string | null
          sms_last_opt_out_at: string | null
          sms_opt_in: boolean | null
          sms_opt_out: boolean | null
          source: string | null
          subscribed_at: string
          unsubscribed_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_active?: boolean | null
          name?: string | null
          phone_number?: string | null
          sms_last_opt_in_at?: string | null
          sms_last_opt_out_at?: string | null
          sms_opt_in?: boolean | null
          sms_opt_out?: boolean | null
          source?: string | null
          subscribed_at?: string
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean | null
          name?: string | null
          phone_number?: string | null
          sms_last_opt_in_at?: string | null
          sms_last_opt_out_at?: string | null
          sms_opt_in?: boolean | null
          sms_opt_out?: boolean | null
          source?: string | null
          subscribed_at?: string
          unsubscribed_at?: string | null
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
      video_projects: {
        Row: {
          audio_url: string | null
          content_id: string | null
          content_type: string
          created_at: string
          custom_text: string | null
          effects: Json
          error_message: string | null
          id: string
          music_style: string | null
          output_format: string
          prompt: string | null
          slides: Json
          status: string
          title: string
          tone: string
          updated_at: string
          video_url: string | null
          viral_mode: boolean
          voice_id: string
          voice_provider: string
        }
        Insert: {
          audio_url?: string | null
          content_id?: string | null
          content_type?: string
          created_at?: string
          custom_text?: string | null
          effects?: Json
          error_message?: string | null
          id?: string
          music_style?: string | null
          output_format?: string
          prompt?: string | null
          slides?: Json
          status?: string
          title?: string
          tone?: string
          updated_at?: string
          video_url?: string | null
          viral_mode?: boolean
          voice_id?: string
          voice_provider?: string
        }
        Update: {
          audio_url?: string | null
          content_id?: string | null
          content_type?: string
          created_at?: string
          custom_text?: string | null
          effects?: Json
          error_message?: string | null
          id?: string
          music_style?: string | null
          output_format?: string
          prompt?: string | null
          slides?: Json
          status?: string
          title?: string
          tone?: string
          updated_at?: string
          video_url?: string | null
          viral_mode?: boolean
          voice_id?: string
          voice_provider?: string
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
      workspace_branding: {
        Row: {
          author_name: string
          color_theme: string
          id: string
          logo_url: string
          org_id: string
          publisher_name: string
          studio_name: string
          updated_at: string
        }
        Insert: {
          author_name?: string
          color_theme?: string
          id?: string
          logo_url?: string
          org_id: string
          publisher_name?: string
          studio_name?: string
          updated_at?: string
        }
        Update: {
          author_name?: string
          color_theme?: string
          id?: string
          logo_url?: string
          org_id?: string
          publisher_name?: string
          studio_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_branding_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_chapters: {
        Row: {
          content: string
          created_at: string
          id: string
          org_id: string
          project_id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          org_id: string
          project_id: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          org_id?: string
          project_id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_chapters_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_chapters_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "workspace_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_materials: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          org_id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          org_id: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          org_id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_materials_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_notes: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          org_id: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          org_id: string
          title?: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          org_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_notes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_projects: {
        Row: {
          created_at: string
          description: string
          id: string
          org_id: string
          sort_order: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          org_id: string
          sort_order?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          org_id?: string
          sort_order?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_projects_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          org_id: string
          status: string
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          org_id: string
          status?: string
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          org_id?: string
          status?: string
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      user_has_book_access: {
        Args: { _book_access_tiers: string[]; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "moderator"
        | "user"
        | "content_editor"
        | "prayer_team"
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
      app_role: ["admin", "moderator", "user", "content_editor", "prayer_team"],
    },
  },
} as const
