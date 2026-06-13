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
      attendance_records: {
        Row: {
          attendance_date: string
          created_at: string
          first_in_at: string | null
          id: string
          last_out_at: string | null
          marked_by: string | null
          needs_review: boolean
          notes: string | null
          profile_id: string
          raw_events: Json
          session_count: number
          source: string
          status: string
          total_minutes: number | null
          updated_at: string
        }
        Insert: {
          attendance_date: string
          created_at?: string
          first_in_at?: string | null
          id?: string
          last_out_at?: string | null
          marked_by?: string | null
          needs_review?: boolean
          notes?: string | null
          profile_id: string
          raw_events?: Json
          session_count?: number
          source?: string
          status?: string
          total_minutes?: number | null
          updated_at?: string
        }
        Update: {
          attendance_date?: string
          created_at?: string
          first_in_at?: string | null
          id?: string
          last_out_at?: string | null
          marked_by?: string | null
          needs_review?: boolean
          notes?: string | null
          profile_id?: string
          raw_events?: Json
          session_count?: number
          source?: string
          status?: string
          total_minutes?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      board_seats: {
        Row: {
          created_at: string
          holder_name: string
          holder_role: string | null
          id: string
          notes: string | null
          seat_type: string
          startup_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          holder_name: string
          holder_role?: string | null
          id?: string
          notes?: string | null
          seat_type?: string
          startup_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          holder_name?: string
          holder_role?: string | null
          id?: string
          notes?: string | null
          seat_type?: string
          startup_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_seats_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      bug_comments: {
        Row: {
          author_id: string | null
          body: string
          bug_id: string
          created_at: string
          deleted_at: string | null
          id: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          body: string
          bug_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          body?: string
          bug_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bug_comments_bug_id_fkey"
            columns: ["bug_id"]
            isOneToOne: false
            referencedRelation: "bugs"
            referencedColumns: ["id"]
          },
        ]
      }
      bugs: {
        Row: {
          area: string
          assignee_profile: string | null
          created_at: string
          description: string
          id: string
          project_id: string | null
          reporter_profile: string | null
          solved_at: string | null
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          area?: string
          assignee_profile?: string | null
          created_at?: string
          description: string
          id?: string
          project_id?: string | null
          reporter_profile?: string | null
          solved_at?: string | null
          status?: string
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          area?: string
          assignee_profile?: string | null
          created_at?: string
          description?: string
          id?: string
          project_id?: string | null
          reporter_profile?: string | null
          solved_at?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bugs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      burn_categories: {
        Row: {
          category_name: string
          created_at: string
          created_by: string | null
          id: string
          monthly_amount: number
          notes: string | null
          startup_id: string
          trend: string
          updated_at: string
        }
        Insert: {
          category_name: string
          created_at?: string
          created_by?: string | null
          id?: string
          monthly_amount?: number
          notes?: string | null
          startup_id: string
          trend?: string
          updated_at?: string
        }
        Update: {
          category_name?: string
          created_at?: string
          created_by?: string | null
          id?: string
          monthly_amount?: number
          notes?: string | null
          startup_id?: string
          trend?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "burn_categories_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          applied_at: string
          created_at: string
          created_by: string | null
          email: string | null
          full_name: string
          hired_at: string | null
          hired_profile_id: string | null
          id: string
          job_id: string | null
          notes: string | null
          phone: string | null
          rating: number | null
          rejected_reason: string | null
          resume_url: string | null
          source: string | null
          stage: string
          updated_at: string
        }
        Insert: {
          applied_at?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name: string
          hired_at?: string | null
          hired_profile_id?: string | null
          id?: string
          job_id?: string | null
          notes?: string | null
          phone?: string | null
          rating?: number | null
          rejected_reason?: string | null
          resume_url?: string | null
          source?: string | null
          stage?: string
          updated_at?: string
        }
        Update: {
          applied_at?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name?: string
          hired_at?: string | null
          hired_profile_id?: string | null
          id?: string
          job_id?: string | null
          notes?: string | null
          phone?: string | null
          rating?: number | null
          rejected_reason?: string | null
          resume_url?: string | null
          source?: string | null
          stage?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidates_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_flow_entries: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          entry_date: string
          flow_type: string
          id: string
          notes: string | null
          source: string
          startup_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          entry_date?: string
          flow_type?: string
          id?: string
          notes?: string | null
          source?: string
          startup_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          entry_date?: string
          flow_type?: string
          id?: string
          notes?: string | null
          source?: string
          startup_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_flow_entries_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      connector_credentials: {
        Row: {
          connector_type: string
          created_at: string
          created_by: string | null
          credentials: Json
          id: string
          is_active: boolean
          label: string | null
          last_sync_error: string | null
          last_synced_at: string | null
          startup_id: string
          updated_at: string
        }
        Insert: {
          connector_type: string
          created_at?: string
          created_by?: string | null
          credentials?: Json
          id?: string
          is_active?: boolean
          label?: string | null
          last_sync_error?: string | null
          last_synced_at?: string | null
          startup_id: string
          updated_at?: string
        }
        Update: {
          connector_type?: string
          created_at?: string
          created_by?: string | null
          credentials?: Json
          id?: string
          is_active?: boolean
          label?: string | null
          last_sync_error?: string | null
          last_synced_at?: string | null
          startup_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "connector_credentials_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      connector_data_github: {
        Row: {
          author_login: string | null
          author_profile_id: string | null
          body: string | null
          closed_at_source: string | null
          created_at_source: string | null
          external_id: string
          id: string
          labels: string[]
          merged_at_source: string | null
          raw_payload: Json
          record_type: string
          repo_name: string
          startup_id: string
          state: string | null
          synced_at: string
          title: string | null
          updated_at_source: string | null
        }
        Insert: {
          author_login?: string | null
          author_profile_id?: string | null
          body?: string | null
          closed_at_source?: string | null
          created_at_source?: string | null
          external_id: string
          id?: string
          labels?: string[]
          merged_at_source?: string | null
          raw_payload?: Json
          record_type: string
          repo_name: string
          startup_id: string
          state?: string | null
          synced_at?: string
          title?: string | null
          updated_at_source?: string | null
        }
        Update: {
          author_login?: string | null
          author_profile_id?: string | null
          body?: string | null
          closed_at_source?: string | null
          created_at_source?: string | null
          external_id?: string
          id?: string
          labels?: string[]
          merged_at_source?: string | null
          raw_payload?: Json
          record_type?: string
          repo_name?: string
          startup_id?: string
          state?: string | null
          synced_at?: string
          title?: string | null
          updated_at_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "connector_data_github_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      connector_data_slack: {
        Row: {
          author_profile_id: string | null
          channel_id: string
          channel_name: string | null
          has_files: boolean
          id: string
          message_date: string | null
          message_ts: string
          raw_payload: Json
          reaction_count: number
          reply_count: number
          startup_id: string
          synced_at: string
          text: string | null
          thread_ts: string | null
          user_id_source: string | null
        }
        Insert: {
          author_profile_id?: string | null
          channel_id: string
          channel_name?: string | null
          has_files?: boolean
          id?: string
          message_date?: string | null
          message_ts: string
          raw_payload?: Json
          reaction_count?: number
          reply_count?: number
          startup_id: string
          synced_at?: string
          text?: string | null
          thread_ts?: string | null
          user_id_source?: string | null
        }
        Update: {
          author_profile_id?: string | null
          channel_id?: string
          channel_name?: string | null
          has_files?: boolean
          id?: string
          message_date?: string | null
          message_ts?: string
          raw_payload?: Json
          reaction_count?: number
          reply_count?: number
          startup_id?: string
          synced_at?: string
          text?: string | null
          thread_ts?: string | null
          user_id_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "connector_data_slack_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      connector_data_slack_channel_stats: {
        Row: {
          active_users: number
          channel_id: string
          channel_name: string | null
          files_shared: number
          id: string
          message_count: number
          peak_hour: number | null
          reactions_total: number
          replies_total: number
          startup_id: string
          stat_date: string
          synced_at: string
        }
        Insert: {
          active_users?: number
          channel_id: string
          channel_name?: string | null
          files_shared?: number
          id?: string
          message_count?: number
          peak_hour?: number | null
          reactions_total?: number
          replies_total?: number
          startup_id: string
          stat_date: string
          synced_at?: string
        }
        Update: {
          active_users?: number
          channel_id?: string
          channel_name?: string | null
          files_shared?: number
          id?: string
          message_count?: number
          peak_hour?: number | null
          reactions_total?: number
          replies_total?: number
          startup_id?: string
          stat_date?: string
          synced_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "connector_data_slack_channel_stats_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      connector_data_slack_channels: {
        Row: {
          channel_id: string
          channel_name: string | null
          created_at_source: string | null
          id: string
          is_archived: boolean
          is_private: boolean
          member_count: number | null
          purpose: string | null
          startup_id: string
          synced_at: string
          topic: string | null
        }
        Insert: {
          channel_id: string
          channel_name?: string | null
          created_at_source?: string | null
          id?: string
          is_archived?: boolean
          is_private?: boolean
          member_count?: number | null
          purpose?: string | null
          startup_id: string
          synced_at?: string
          topic?: string | null
        }
        Update: {
          channel_id?: string
          channel_name?: string | null
          created_at_source?: string | null
          id?: string
          is_archived?: boolean
          is_private?: boolean
          member_count?: number | null
          purpose?: string | null
          startup_id?: string
          synced_at?: string
          topic?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "connector_data_slack_channels_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      connector_data_slack_user_stats: {
        Row: {
          display_name: string | null
          id: string
          messages_sent: number
          reactions_given: number
          replies_sent: number
          startup_id: string
          stat_date: string
          synced_at: string
          user_id_source: string
        }
        Insert: {
          display_name?: string | null
          id?: string
          messages_sent?: number
          reactions_given?: number
          replies_sent?: number
          startup_id: string
          stat_date: string
          synced_at?: string
          user_id_source: string
        }
        Update: {
          display_name?: string | null
          id?: string
          messages_sent?: number
          reactions_given?: number
          replies_sent?: number
          startup_id?: string
          stat_date?: string
          synced_at?: string
          user_id_source?: string
        }
        Relationships: [
          {
            foreignKeyName: "connector_data_slack_user_stats_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      connector_data_slack_users: {
        Row: {
          avatar_url: string | null
          display_name: string | null
          id: string
          is_admin: boolean
          is_bot: boolean
          real_name: string | null
          startup_id: string
          synced_at: string
          title: string | null
          user_id_source: string
        }
        Insert: {
          avatar_url?: string | null
          display_name?: string | null
          id?: string
          is_admin?: boolean
          is_bot?: boolean
          real_name?: string | null
          startup_id: string
          synced_at?: string
          title?: string | null
          user_id_source: string
        }
        Update: {
          avatar_url?: string | null
          display_name?: string | null
          id?: string
          is_admin?: boolean
          is_bot?: boolean
          real_name?: string | null
          startup_id?: string
          synced_at?: string
          title?: string | null
          user_id_source?: string
        }
        Relationships: [
          {
            foreignKeyName: "connector_data_slack_users_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      connector_data_youtube_channel_analytics: {
        Row: {
          average_view_duration_sec: number | null
          channel_uuid: string
          comments: number
          cpm_usd: number | null
          created_at: string
          date: string
          estimated_ad_revenue_usd: number | null
          estimated_minutes_watched: number
          estimated_revenue_usd: number | null
          id: string
          impressions: number | null
          impressions_ctr: number | null
          likes: number
          raw_payload: Json
          shares: number
          subscribers_gained: number
          subscribers_lost: number
          updated_at: string
          views: number
        }
        Insert: {
          average_view_duration_sec?: number | null
          channel_uuid: string
          comments?: number
          cpm_usd?: number | null
          created_at?: string
          date: string
          estimated_ad_revenue_usd?: number | null
          estimated_minutes_watched?: number
          estimated_revenue_usd?: number | null
          id?: string
          impressions?: number | null
          impressions_ctr?: number | null
          likes?: number
          raw_payload?: Json
          shares?: number
          subscribers_gained?: number
          subscribers_lost?: number
          updated_at?: string
          views?: number
        }
        Update: {
          average_view_duration_sec?: number | null
          channel_uuid?: string
          comments?: number
          cpm_usd?: number | null
          created_at?: string
          date?: string
          estimated_ad_revenue_usd?: number | null
          estimated_minutes_watched?: number
          estimated_revenue_usd?: number | null
          id?: string
          impressions?: number | null
          impressions_ctr?: number | null
          likes?: number
          raw_payload?: Json
          shares?: number
          subscribers_gained?: number
          subscribers_lost?: number
          updated_at?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "connector_data_youtube_channel_analytics_channel_uuid_fkey"
            columns: ["channel_uuid"]
            isOneToOne: false
            referencedRelation: "connector_data_youtube_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      connector_data_youtube_channels: {
        Row: {
          channel_created: string | null
          channel_id: string
          country: string | null
          created_at: string
          custom_url: string | null
          description: string | null
          handle: string | null
          id: string
          is_active: boolean
          is_monetized: boolean
          last_synced_at: string | null
          raw_payload: Json
          startup_id: string
          subscriber_count: number | null
          thumbnail_url: string | null
          title: string | null
          updated_at: string
          uploads_playlist: string | null
          video_count: number | null
          view_count: number | null
        }
        Insert: {
          channel_created?: string | null
          channel_id: string
          country?: string | null
          created_at?: string
          custom_url?: string | null
          description?: string | null
          handle?: string | null
          id?: string
          is_active?: boolean
          is_monetized?: boolean
          last_synced_at?: string | null
          raw_payload?: Json
          startup_id: string
          subscriber_count?: number | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          uploads_playlist?: string | null
          video_count?: number | null
          view_count?: number | null
        }
        Update: {
          channel_created?: string | null
          channel_id?: string
          country?: string | null
          created_at?: string
          custom_url?: string | null
          description?: string | null
          handle?: string | null
          id?: string
          is_active?: boolean
          is_monetized?: boolean
          last_synced_at?: string | null
          raw_payload?: Json
          startup_id?: string
          subscriber_count?: number | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          uploads_playlist?: string | null
          video_count?: number | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "connector_data_youtube_channels_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      connector_data_youtube_demographics: {
        Row: {
          age_group: string
          channel_uuid: string
          created_at: string
          gender: string
          id: string
          period_days: number
          period_end_date: string
          raw_payload: Json
          updated_at: string
          viewer_percentage: number
        }
        Insert: {
          age_group: string
          channel_uuid: string
          created_at?: string
          gender: string
          id?: string
          period_days?: number
          period_end_date: string
          raw_payload?: Json
          updated_at?: string
          viewer_percentage: number
        }
        Update: {
          age_group?: string
          channel_uuid?: string
          created_at?: string
          gender?: string
          id?: string
          period_days?: number
          period_end_date?: string
          raw_payload?: Json
          updated_at?: string
          viewer_percentage?: number
        }
        Relationships: [
          {
            foreignKeyName: "connector_data_youtube_demographics_channel_uuid_fkey"
            columns: ["channel_uuid"]
            isOneToOne: false
            referencedRelation: "connector_data_youtube_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      connector_data_youtube_device_types: {
        Row: {
          channel_uuid: string
          created_at: string
          device_type: string
          estimated_minutes_watched: number
          id: string
          period_days: number
          period_end_date: string
          raw_payload: Json
          updated_at: string
          views: number
        }
        Insert: {
          channel_uuid: string
          created_at?: string
          device_type: string
          estimated_minutes_watched?: number
          id?: string
          period_days?: number
          period_end_date: string
          raw_payload?: Json
          updated_at?: string
          views?: number
        }
        Update: {
          channel_uuid?: string
          created_at?: string
          device_type?: string
          estimated_minutes_watched?: number
          id?: string
          period_days?: number
          period_end_date?: string
          raw_payload?: Json
          updated_at?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "connector_data_youtube_device_types_channel_uuid_fkey"
            columns: ["channel_uuid"]
            isOneToOne: false
            referencedRelation: "connector_data_youtube_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      connector_data_youtube_geography: {
        Row: {
          average_view_duration_sec: number | null
          channel_uuid: string
          country_code: string
          created_at: string
          estimated_minutes_watched: number
          estimated_revenue_usd: number | null
          id: string
          period_days: number
          period_end_date: string
          raw_payload: Json
          updated_at: string
          views: number
        }
        Insert: {
          average_view_duration_sec?: number | null
          channel_uuid: string
          country_code: string
          created_at?: string
          estimated_minutes_watched?: number
          estimated_revenue_usd?: number | null
          id?: string
          period_days?: number
          period_end_date: string
          raw_payload?: Json
          updated_at?: string
          views?: number
        }
        Update: {
          average_view_duration_sec?: number | null
          channel_uuid?: string
          country_code?: string
          created_at?: string
          estimated_minutes_watched?: number
          estimated_revenue_usd?: number | null
          id?: string
          period_days?: number
          period_end_date?: string
          raw_payload?: Json
          updated_at?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "connector_data_youtube_geography_channel_uuid_fkey"
            columns: ["channel_uuid"]
            isOneToOne: false
            referencedRelation: "connector_data_youtube_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      connector_data_youtube_traffic_sources: {
        Row: {
          channel_uuid: string
          created_at: string
          estimated_minutes_watched: number
          id: string
          period_days: number
          period_end_date: string
          raw_payload: Json
          source_type: string
          updated_at: string
          views: number
        }
        Insert: {
          channel_uuid: string
          created_at?: string
          estimated_minutes_watched?: number
          id?: string
          period_days?: number
          period_end_date: string
          raw_payload?: Json
          source_type: string
          updated_at?: string
          views?: number
        }
        Update: {
          channel_uuid?: string
          created_at?: string
          estimated_minutes_watched?: number
          id?: string
          period_days?: number
          period_end_date?: string
          raw_payload?: Json
          source_type?: string
          updated_at?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "connector_data_youtube_traffic_sources_channel_uuid_fkey"
            columns: ["channel_uuid"]
            isOneToOne: false
            referencedRelation: "connector_data_youtube_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      connector_data_youtube_video_analytics: {
        Row: {
          average_view_duration_sec: number | null
          average_view_percentage: number | null
          comments: number
          cpm_usd: number | null
          created_at: string
          date: string
          estimated_minutes_watched: number
          estimated_revenue_usd: number | null
          id: string
          likes: number
          raw_payload: Json
          shares: number
          subscribers_gained: number
          subscribers_lost: number
          updated_at: string
          video_uuid: string
          views: number
        }
        Insert: {
          average_view_duration_sec?: number | null
          average_view_percentage?: number | null
          comments?: number
          cpm_usd?: number | null
          created_at?: string
          date: string
          estimated_minutes_watched?: number
          estimated_revenue_usd?: number | null
          id?: string
          likes?: number
          raw_payload?: Json
          shares?: number
          subscribers_gained?: number
          subscribers_lost?: number
          updated_at?: string
          video_uuid: string
          views?: number
        }
        Update: {
          average_view_duration_sec?: number | null
          average_view_percentage?: number | null
          comments?: number
          cpm_usd?: number | null
          created_at?: string
          date?: string
          estimated_minutes_watched?: number
          estimated_revenue_usd?: number | null
          id?: string
          likes?: number
          raw_payload?: Json
          shares?: number
          subscribers_gained?: number
          subscribers_lost?: number
          updated_at?: string
          video_uuid?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "connector_data_youtube_video_analytics_video_uuid_fkey"
            columns: ["video_uuid"]
            isOneToOne: false
            referencedRelation: "connector_data_youtube_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      connector_data_youtube_video_retention: {
        Row: {
          audience_watch_ratio: number
          created_at: string
          elapsed_video_time_ratio: number
          id: string
          period_days: number
          period_end_date: string
          raw_payload: Json
          relative_retention_performance: number | null
          updated_at: string
          video_uuid: string
        }
        Insert: {
          audience_watch_ratio: number
          created_at?: string
          elapsed_video_time_ratio: number
          id?: string
          period_days?: number
          period_end_date: string
          raw_payload?: Json
          relative_retention_performance?: number | null
          updated_at?: string
          video_uuid: string
        }
        Update: {
          audience_watch_ratio?: number
          created_at?: string
          elapsed_video_time_ratio?: number
          id?: string
          period_days?: number
          period_end_date?: string
          raw_payload?: Json
          relative_retention_performance?: number | null
          updated_at?: string
          video_uuid?: string
        }
        Relationships: [
          {
            foreignKeyName: "connector_data_youtube_video_retention_video_uuid_fkey"
            columns: ["video_uuid"]
            isOneToOne: false
            referencedRelation: "connector_data_youtube_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      connector_data_youtube_video_snapshots: {
        Row: {
          comment_count: number
          created_at: string
          delta_views: number | null
          id: string
          like_count: number
          snapshot_date: string
          video_uuid: string
          view_count: number
        }
        Insert: {
          comment_count?: number
          created_at?: string
          delta_views?: number | null
          id?: string
          like_count?: number
          snapshot_date: string
          video_uuid: string
          view_count?: number
        }
        Update: {
          comment_count?: number
          created_at?: string
          delta_views?: number | null
          id?: string
          like_count?: number
          snapshot_date?: string
          video_uuid?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "connector_data_youtube_video_snapshots_video_uuid_fkey"
            columns: ["video_uuid"]
            isOneToOne: false
            referencedRelation: "connector_data_youtube_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      connector_data_youtube_videos: {
        Row: {
          category_id: string | null
          channel_uuid: string
          comment_count: number
          created_at: string
          description: string | null
          duration_seconds: number | null
          id: string
          last_synced_at: string | null
          like_count: number
          privacy: string | null
          published_at: string | null
          raw_payload: Json
          tags: string[]
          thumbnail_url: string | null
          title: string | null
          updated_at: string
          video_id: string
          view_count: number
        }
        Insert: {
          category_id?: string | null
          channel_uuid: string
          comment_count?: number
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          last_synced_at?: string | null
          like_count?: number
          privacy?: string | null
          published_at?: string | null
          raw_payload?: Json
          tags?: string[]
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          video_id: string
          view_count?: number
        }
        Update: {
          category_id?: string | null
          channel_uuid?: string
          comment_count?: number
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          last_synced_at?: string | null
          like_count?: number
          privacy?: string | null
          published_at?: string | null
          raw_payload?: Json
          tags?: string[]
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          video_id?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "connector_data_youtube_videos_channel_uuid_fkey"
            columns: ["channel_uuid"]
            isOneToOne: false
            referencedRelation: "connector_data_youtube_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      connector_slack_workspace: {
        Row: {
          id: string
          member_count_total: number | null
          startup_id: string
          synced_at: string
          team_icon_url: string | null
          workspace_domain: string | null
          workspace_id: string
          workspace_name: string | null
        }
        Insert: {
          id?: string
          member_count_total?: number | null
          startup_id: string
          synced_at?: string
          team_icon_url?: string | null
          workspace_domain?: string | null
          workspace_id: string
          workspace_name?: string | null
        }
        Update: {
          id?: string
          member_count_total?: number | null
          startup_id?: string
          synced_at?: string
          team_icon_url?: string | null
          workspace_domain?: string | null
          workspace_id?: string
          workspace_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "connector_slack_workspace_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: true
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      connector_youtube_oauth: {
        Row: {
          access_token: string
          authorized_at: string
          authorized_by: string | null
          channel_id: string
          created_at: string
          id: string
          refresh_token: string
          scopes: string[]
          startup_id: string
          token_expires_at: string
          updated_at: string
        }
        Insert: {
          access_token: string
          authorized_at?: string
          authorized_by?: string | null
          channel_id: string
          created_at?: string
          id?: string
          refresh_token: string
          scopes?: string[]
          startup_id: string
          token_expires_at: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          authorized_at?: string
          authorized_by?: string | null
          channel_id?: string
          created_at?: string
          id?: string
          refresh_token?: string
          scopes?: string[]
          startup_id?: string
          token_expires_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "connector_youtube_oauth_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      department_updates: {
        Row: {
          asks: string[]
          blockers: string[]
          created_at: string
          created_by: string | null
          department_key: string
          id: string
          owner_person_id: string | null
          risks: string[]
          startup_id: string
          summary: string
          update_date: string
          updated_at: string
          wins: string[]
        }
        Insert: {
          asks?: string[]
          blockers?: string[]
          created_at?: string
          created_by?: string | null
          department_key: string
          id?: string
          owner_person_id?: string | null
          risks?: string[]
          startup_id: string
          summary?: string
          update_date?: string
          updated_at?: string
          wins?: string[]
        }
        Update: {
          asks?: string[]
          blockers?: string[]
          created_at?: string
          created_by?: string | null
          department_key?: string
          id?: string
          owner_person_id?: string | null
          risks?: string[]
          startup_id?: string
          summary?: string
          update_date?: string
          updated_at?: string
          wins?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "department_updates_owner_person_id_fkey"
            columns: ["owner_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_updates_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      equity_documents: {
        Row: {
          created_at: string
          doc_type: string
          file_name: string
          file_url: string
          id: string
          stakeholder_id: string
          startup_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          doc_type?: string
          file_name: string
          file_url: string
          id?: string
          stakeholder_id: string
          startup_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          doc_type?: string
          file_name?: string
          file_url?: string
          id?: string
          stakeholder_id?: string
          startup_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equity_documents_stakeholder_id_fkey"
            columns: ["stakeholder_id"]
            isOneToOne: false
            referencedRelation: "stakeholders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equity_documents_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_entries: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          currency: string
          description: string
          entry_date: string
          entry_type: string
          id: string
          recurring: boolean
          startup_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string
          entry_date?: string
          entry_type?: string
          id?: string
          recurring?: boolean
          startup_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string
          entry_date?: string
          entry_type?: string
          id?: string
          recurring?: boolean
          startup_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_entries_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_forecasts: {
        Row: {
          assumptions: string | null
          created_at: string
          created_by: string | null
          forecast_month: string
          id: string
          projected_expenses: number
          projected_revenue: number
          projected_runway_months: number | null
          startup_id: string
          updated_at: string
        }
        Insert: {
          assumptions?: string | null
          created_at?: string
          created_by?: string | null
          forecast_month: string
          id?: string
          projected_expenses?: number
          projected_revenue?: number
          projected_runway_months?: number | null
          startup_id: string
          updated_at?: string
        }
        Update: {
          assumptions?: string | null
          created_at?: string
          created_by?: string | null
          forecast_month?: string
          id?: string
          projected_expenses?: number
          projected_revenue?: number
          projected_runway_months?: number | null
          startup_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_forecasts_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      funding_rounds: {
        Row: {
          created_at: string
          id: string
          is_simulated: boolean
          notes: string | null
          raise_amount: number | null
          round_name: string
          round_order: number
          startup_id: string
          updated_at: string
          valuation: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_simulated?: boolean
          notes?: string | null
          raise_amount?: number | null
          round_name: string
          round_order?: number
          startup_id: string
          updated_at?: string
          valuation?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          is_simulated?: boolean
          notes?: string | null
          raise_amount?: number | null
          round_name?: string
          round_order?: number
          startup_id?: string
          updated_at?: string
          valuation?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "funding_rounds_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_config: {
        Row: {
          created_at: string
          custom_channels: Json
          funnel_stages: Json
          growth_model: string
          id: string
          startup_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_channels?: Json
          funnel_stages?: Json
          growth_model?: string
          id?: string
          startup_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_channels?: Json
          funnel_stages?: Json
          growth_model?: string
          id?: string
          startup_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "growth_config_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: true
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_experiments: {
        Row: {
          channel: string
          created_at: string
          created_by: string | null
          end_date: string | null
          experiment_type: string
          id: string
          impact_score: number
          name: string
          result_summary: string | null
          start_date: string | null
          startup_id: string
          status: string
          updated_at: string
        }
        Insert: {
          channel?: string
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          experiment_type?: string
          id?: string
          impact_score?: number
          name: string
          result_summary?: string | null
          start_date?: string | null
          startup_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          experiment_type?: string
          id?: string
          impact_score?: number
          name?: string
          result_summary?: string | null
          start_date?: string | null
          startup_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "growth_experiments_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_metrics: {
        Row: {
          activation_rate: number
          channel: string
          created_at: string
          created_by: string | null
          growth_rate: number
          id: string
          metric_key: string
          metric_type: string
          metric_value: number
          period: string
          retention_rate: number
          revenue: number
          startup_id: string
          updated_at: string
          users: number
        }
        Insert: {
          activation_rate?: number
          channel?: string
          created_at?: string
          created_by?: string | null
          growth_rate?: number
          id?: string
          metric_key?: string
          metric_type?: string
          metric_value?: number
          period?: string
          retention_rate?: number
          revenue?: number
          startup_id: string
          updated_at?: string
          users?: number
        }
        Update: {
          activation_rate?: number
          channel?: string
          created_at?: string
          created_by?: string | null
          growth_rate?: number
          id?: string
          metric_key?: string
          metric_type?: string
          metric_value?: number
          period?: string
          retention_rate?: number
          revenue?: number
          startup_id?: string
          updated_at?: string
          users?: number
        }
        Relationships: [
          {
            foreignKeyName: "growth_metrics_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      job_postings: {
        Row: {
          closing_at: string | null
          created_at: string
          created_by: string | null
          department: string | null
          description: string | null
          hiring_manager: string | null
          id: string
          positions: number
          posted_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          closing_at?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          description?: string | null
          hiring_manager?: string | null
          id?: string
          positions?: number
          posted_at?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          closing_at?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          description?: string | null
          hiring_manager?: string | null
          id?: string
          positions?: number
          posted_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      kai_insights: {
        Row: {
          body: string
          confidence: string | null
          data_sources: string[]
          department_key: string | null
          expires_at: string | null
          generated_at: string
          id: string
          insight_type: string
          is_dismissed: boolean
          is_read: boolean
          startup_id: string
          title: string | null
        }
        Insert: {
          body: string
          confidence?: string | null
          data_sources?: string[]
          department_key?: string | null
          expires_at?: string | null
          generated_at?: string
          id?: string
          insight_type?: string
          is_dismissed?: boolean
          is_read?: boolean
          startup_id: string
          title?: string | null
        }
        Update: {
          body?: string
          confidence?: string | null
          data_sources?: string[]
          department_key?: string | null
          expires_at?: string | null
          generated_at?: string
          id?: string
          insight_type?: string
          is_dismissed?: boolean
          is_read?: boolean
          startup_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kai_insights_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      kai_memories: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          id: string
          memory: string
          startup_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          memory: string
          startup_id: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          memory?: string
          startup_id?: string
        }
        Relationships: []
      }
      leave_requests: {
        Row: {
          created_at: string
          end_date: string
          half_day_part: string | null
          id: string
          leave_type: string
          profile_id: string
          reason: string | null
          requested_by: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date: string
          half_day_part?: string | null
          id?: string
          leave_type?: string
          profile_id: string
          reason?: string | null
          requested_by?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          half_day_part?: string | null
          id?: string
          leave_type?: string
          profile_id?: string
          reason?: string | null
          requested_by?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      metrics: {
        Row: {
          connector_type: string
          department_key: string | null
          granularity: string
          id: string
          metric_name: string
          metric_text: string | null
          metric_value: number | null
          period_end: string
          period_start: string
          raw_data: Json
          source_ref: string | null
          startup_id: string
          synced_at: string
        }
        Insert: {
          connector_type: string
          department_key?: string | null
          granularity?: string
          id?: string
          metric_name: string
          metric_text?: string | null
          metric_value?: number | null
          period_end: string
          period_start: string
          raw_data?: Json
          source_ref?: string | null
          startup_id: string
          synced_at?: string
        }
        Update: {
          connector_type?: string
          department_key?: string | null
          granularity?: string
          id?: string
          metric_name?: string
          metric_text?: string | null
          metric_value?: number | null
          period_end?: string
          period_start?: string
          raw_data?: Json
          source_ref?: string | null
          startup_id?: string
          synced_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "metrics_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      mfa_codes: {
        Row: {
          attempts: number
          code_hash: string
          created_at: string
          expires_at: string
          id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          created_at?: string
          expires_at: string
          id?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          created_at?: string
          expires_at?: string
          id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          project_id: string | null
          read: boolean
          recipient_profile_id: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          project_id?: string | null
          read?: boolean
          recipient_profile_id: string
          type?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          project_id?: string | null
          read?: boolean
          recipient_profile_id?: string
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
      onboarding_items: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          done_at: string | null
          done_by: string | null
          due_date: string | null
          id: string
          notes: string | null
          profile_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          done_at?: string | null
          done_by?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          profile_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          done_at?: string | null
          done_by?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          profile_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      payroll_payments: {
        Row: {
          base_salary: number
          bonus: number
          created_at: string
          created_by: string | null
          deductions: number
          id: string
          month_year: string
          net_pay: number | null
          notes: string | null
          paid_at: string | null
          profile_id: string
          status: string
          updated_at: string
        }
        Insert: {
          base_salary?: number
          bonus?: number
          created_at?: string
          created_by?: string | null
          deductions?: number
          id?: string
          month_year: string
          net_pay?: number | null
          notes?: string | null
          paid_at?: string | null
          profile_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          base_salary?: number
          bonus?: number
          created_at?: string
          created_by?: string | null
          deductions?: number
          id?: string
          month_year?: string
          net_pay?: number | null
          notes?: string | null
          paid_at?: string | null
          profile_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      people: {
        Row: {
          cost_to_company: number
          created_at: string
          created_by: string | null
          department: string
          employment_type: string
          full_name: string
          hours_committed: number
          hours_delivered: number
          id: string
          joining_date: string | null
          kpi_score: number
          linked_startups: string[]
          productivity_score: number
          reporting_manager_id: string | null
          role: string
          salary: number
          status: string
          tasks_assigned: number
          tasks_completed: number
          updated_at: string
          weekly_output_score: number
        }
        Insert: {
          cost_to_company?: number
          created_at?: string
          created_by?: string | null
          department?: string
          employment_type?: string
          full_name: string
          hours_committed?: number
          hours_delivered?: number
          id?: string
          joining_date?: string | null
          kpi_score?: number
          linked_startups?: string[]
          productivity_score?: number
          reporting_manager_id?: string | null
          role?: string
          salary?: number
          status?: string
          tasks_assigned?: number
          tasks_completed?: number
          updated_at?: string
          weekly_output_score?: number
        }
        Update: {
          cost_to_company?: number
          created_at?: string
          created_by?: string | null
          department?: string
          employment_type?: string
          full_name?: string
          hours_committed?: number
          hours_delivered?: number
          id?: string
          joining_date?: string | null
          kpi_score?: number
          linked_startups?: string[]
          productivity_score?: number
          reporting_manager_id?: string | null
          role?: string
          salary?: number
          status?: string
          tasks_assigned?: number
          tasks_completed?: number
          updated_at?: string
          weekly_output_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "people_reporting_manager_id_fkey"
            columns: ["reporting_manager_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_reviews: {
        Row: {
          acknowledged_at: string | null
          acknowledgment_note: string | null
          created_at: string
          cycle_id: string
          goals: string | null
          id: string
          improvements: string | null
          overall_rating: number | null
          ratings: Json
          reviewee_id: string
          reviewer_id: string
          reviewer_notes: string | null
          status: string
          strengths: string | null
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledgment_note?: string | null
          created_at?: string
          cycle_id: string
          goals?: string | null
          id?: string
          improvements?: string | null
          overall_rating?: number | null
          ratings?: Json
          reviewee_id: string
          reviewer_id: string
          reviewer_notes?: string | null
          status?: string
          strengths?: string | null
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledgment_note?: string | null
          created_at?: string
          cycle_id?: string
          goals?: string | null
          id?: string
          improvements?: string | null
          overall_rating?: number | null
          ratings?: Json
          reviewee_id?: string
          reviewer_id?: string
          reviewer_notes?: string | null
          status?: string
          strengths?: string | null
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_reviews_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "review_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      priorities: {
        Row: {
          created_at: string
          created_by: string | null
          deadline_in: string
          detected_ago: string
          execution_status: string
          id: string
          impact: string
          impact_level: string
          mfo_confidence: string
          mfo_suggestion: string
          owner: string | null
          problem: string
          rank: number
          severity: string
          startup_id: string
          startup_name: string
          tag: string
          updated_at: string
          why: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deadline_in?: string
          detected_ago?: string
          execution_status?: string
          id?: string
          impact?: string
          impact_level?: string
          mfo_confidence?: string
          mfo_suggestion?: string
          owner?: string | null
          problem: string
          rank?: number
          severity?: string
          startup_id: string
          startup_name: string
          tag?: string
          updated_at?: string
          why?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deadline_in?: string
          detected_ago?: string
          execution_status?: string
          id?: string
          impact?: string
          impact_level?: string
          mfo_confidence?: string
          mfo_suggestion?: string
          owner?: string | null
          problem?: string
          rank?: number
          severity?: string
          startup_id?: string
          startup_name?: string
          tag?: string
          updated_at?: string
          why?: string
        }
        Relationships: [
          {
            foreignKeyName: "priorities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_features: {
        Row: {
          assigned_to: string | null
          created_at: string
          cycle_time_days: number
          feature_type: string
          id: string
          impact_score: number
          initiative_id: string | null
          name: string
          released_at: string | null
          startup_id: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          cycle_time_days?: number
          feature_type?: string
          id?: string
          impact_score?: number
          initiative_id?: string | null
          name: string
          released_at?: string | null
          startup_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          cycle_time_days?: number
          feature_type?: string
          id?: string
          impact_score?: number
          initiative_id?: string | null
          name?: string
          released_at?: string | null
          startup_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_features_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "product_initiatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_features_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      product_initiatives: {
        Row: {
          created_at: string
          id: string
          name: string
          outcome_id: string | null
          priority: string
          startup_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          outcome_id?: string | null
          priority?: string
          startup_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          outcome_id?: string | null
          priority?: string
          startup_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_initiatives_outcome_id_fkey"
            columns: ["outcome_id"]
            isOneToOne: false
            referencedRelation: "product_outcomes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_initiatives_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      product_outcomes: {
        Row: {
          created_at: string
          current_value: number
          id: string
          name: string
          startup_id: string
          status: string
          target_value: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_value?: number
          id?: string
          name: string
          startup_id: string
          status?: string
          target_value?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_value?: number
          id?: string
          name?: string
          startup_id?: string
          status?: string
          target_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_outcomes_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          email: string | null
          full_name: string | null
          github_username: string | null
          id: string
          last_mfa_verified_at: string | null
          mfa_required: boolean
          notification_email: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string | null
          github_username?: string | null
          id: string
          last_mfa_verified_at?: string | null
          mfa_required?: boolean
          notification_email?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string | null
          github_username?: string | null
          id?: string
          last_mfa_verified_at?: string | null
          mfa_required?: boolean
          notification_email?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      project_documents: {
        Row: {
          created_at: string
          description: string | null
          display_name: string
          id: string
          mime_type: string | null
          project_id: string
          size_bytes: number | null
          storage_path: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          mime_type?: string | null
          project_id: string
          size_bytes?: number | null
          storage_path: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          mime_type?: string | null
          project_id?: string
          size_bytes?: number | null
          storage_path?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_links: {
        Row: {
          added_by: string | null
          category: string
          created_at: string
          description: string | null
          id: string
          is_pinned: boolean
          project_id: string
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          added_by?: string | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_pinned?: boolean
          project_id: string
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          added_by?: string | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_pinned?: boolean
          project_id?: string
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_links_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          assigned_at: string
          blocked_reason: string | null
          completion_percentage: number
          id: string
          person_id: string | null
          profile_id: string
          progress_note: string | null
          project_id: string
          role: string
          status: string
          task_description: string | null
          task_title: string | null
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          blocked_reason?: string | null
          completion_percentage?: number
          id?: string
          person_id?: string | null
          profile_id: string
          progress_note?: string | null
          project_id: string
          role?: string
          status?: string
          task_description?: string | null
          task_title?: string | null
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          blocked_reason?: string | null
          completion_percentage?: number
          id?: string
          person_id?: string | null
          profile_id?: string
          progress_note?: string | null
          project_id?: string
          role?: string
          status?: string
          task_description?: string | null
          task_title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_messages: {
        Row: {
          author_name: string
          author_profile: string
          body: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          project_id: string
          updated_at: string
        }
        Insert: {
          author_name?: string
          author_profile: string
          body: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          project_id: string
          updated_at?: string
        }
        Update: {
          author_name?: string
          author_profile?: string
          body?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tasks: {
        Row: {
          assignee_person_id: string | null
          assignee_profile: string | null
          blocked_reason: string | null
          completion_percentage: number
          created_at: string
          created_by: string | null
          deadline: string | null
          description: string | null
          id: string
          progress_note: string | null
          project_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_person_id?: string | null
          assignee_profile?: string | null
          blocked_reason?: string | null
          completion_percentage?: number
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          progress_note?: string | null
          project_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_person_id?: string | null
          assignee_profile?: string | null
          blocked_reason?: string | null
          completion_percentage?: number
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          progress_note?: string | null
          project_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          created_by_profile: string | null
          deadline: string | null
          department_key: string | null
          description: string | null
          id: string
          overall_completion: number
          readme_md: string | null
          startup_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_profile?: string | null
          deadline?: string | null
          department_key?: string | null
          description?: string | null
          id?: string
          overall_completion?: number
          readme_md?: string | null
          startup_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_profile?: string | null
          deadline?: string | null
          department_key?: string | null
          description?: string | null
          id?: string
          overall_completion?: number
          readme_md?: string | null
          startup_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      review_cycles: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string
          id: string
          name: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date: string
          id?: string
          name: string
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string
          id?: string
          name?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      slack_daily_attendance: {
        Row: {
          check_in_time: string | null
          checked_in: boolean
          display_name: string | null
          first_activity: string | null
          id: string
          last_activity: string | null
          message_count: number
          posted_update: boolean
          startup_id: string
          synced_at: string
          update_time: string | null
          user_id_source: string
          was_active: boolean
          work_date: string
        }
        Insert: {
          check_in_time?: string | null
          checked_in?: boolean
          display_name?: string | null
          first_activity?: string | null
          id?: string
          last_activity?: string | null
          message_count?: number
          posted_update?: boolean
          startup_id: string
          synced_at?: string
          update_time?: string | null
          user_id_source: string
          was_active?: boolean
          work_date: string
        }
        Update: {
          check_in_time?: string | null
          checked_in?: boolean
          display_name?: string | null
          first_activity?: string | null
          id?: string
          last_activity?: string | null
          message_count?: number
          posted_update?: boolean
          startup_id?: string
          synced_at?: string
          update_time?: string | null
          user_id_source?: string
          was_active?: boolean
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "slack_daily_attendance_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      slack_monitoring_config: {
        Row: {
          attendance_channel_id: string | null
          attendance_channel_name: string | null
          created_at: string
          day_boundary_hour: number
          id: string
          is_enabled: boolean
          startup_id: string
          timezone: string
          updated_at: string
          updates_channel_suffix: string
        }
        Insert: {
          attendance_channel_id?: string | null
          attendance_channel_name?: string | null
          created_at?: string
          day_boundary_hour?: number
          id?: string
          is_enabled?: boolean
          startup_id: string
          timezone?: string
          updated_at?: string
          updates_channel_suffix?: string
        }
        Update: {
          attendance_channel_id?: string | null
          attendance_channel_name?: string | null
          created_at?: string
          day_boundary_hour?: number
          id?: string
          is_enabled?: boolean
          startup_id?: string
          timezone?: string
          updated_at?: string
          updates_channel_suffix?: string
        }
        Relationships: [
          {
            foreignKeyName: "slack_monitoring_config_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: true
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      special_rights: {
        Row: {
          conditions: string | null
          created_at: string
          description: string | null
          holder_name: string
          id: string
          right_type: string
          startup_id: string
          updated_at: string
        }
        Insert: {
          conditions?: string | null
          created_at?: string
          description?: string | null
          holder_name: string
          id?: string
          right_type?: string
          startup_id: string
          updated_at?: string
        }
        Update: {
          conditions?: string | null
          created_at?: string
          description?: string | null
          holder_name?: string
          id?: string
          right_type?: string
          startup_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "special_rights_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      stakeholder_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          field_changed: string
          id: string
          new_value: string | null
          old_value: string | null
          stakeholder_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          field_changed: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          stakeholder_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          field_changed?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          stakeholder_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stakeholder_history_stakeholder_id_fkey"
            columns: ["stakeholder_id"]
            isOneToOne: false
            referencedRelation: "stakeholders"
            referencedColumns: ["id"]
          },
        ]
      }
      stakeholders: {
        Row: {
          created_at: string
          created_by: string | null
          equity_pct: number
          equity_type: string
          id: string
          name: string
          notes: string | null
          role: string
          startup_id: string
          updated_at: string
          vesting_end: string | null
          vesting_schedule: string | null
          vesting_start: string | null
          voting_pct: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          equity_pct?: number
          equity_type?: string
          id?: string
          name: string
          notes?: string | null
          role?: string
          startup_id: string
          updated_at?: string
          vesting_end?: string | null
          vesting_schedule?: string | null
          vesting_start?: string | null
          voting_pct?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          equity_pct?: number
          equity_type?: string
          id?: string
          name?: string
          notes?: string | null
          role?: string
          startup_id?: string
          updated_at?: string
          vesting_end?: string | null
          vesting_schedule?: string | null
          vesting_start?: string | null
          voting_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "stakeholders_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      startup_assignments: {
        Row: {
          assigned_by: string | null
          created_at: string
          id: string
          startup_id: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          startup_id: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          startup_id?: string
          user_id?: string
        }
        Relationships: []
      }
      startup_contacts: {
        Row: {
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          role: string
          startup_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          role?: string
          startup_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          role?: string
          startup_id?: string
        }
        Relationships: []
      }
      startup_departments: {
        Row: {
          created_at: string
          created_by: string | null
          department_key: string
          headcount: number
          id: string
          lead_person_id: string | null
          name: string
          startup_id: string
          status: string
          summary: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department_key: string
          headcount?: number
          id?: string
          lead_person_id?: string | null
          name: string
          startup_id: string
          status?: string
          summary?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department_key?: string
          headcount?: number
          id?: string
          lead_person_id?: string | null
          name?: string
          startup_id?: string
          status?: string
          summary?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "startup_departments_lead_person_id_fkey"
            columns: ["lead_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "startup_departments_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      startup_documents: {
        Row: {
          category: string
          created_at: string
          department: string | null
          doc_type: string
          document_date: string | null
          file_name: string
          file_url: string
          id: string
          mime_type: string | null
          size_bytes: number | null
          startup_id: string
          storage_path: string | null
          title: string | null
          uploaded_by: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          department?: string | null
          doc_type?: string
          document_date?: string | null
          file_name: string
          file_url: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          startup_id: string
          storage_path?: string | null
          title?: string | null
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          department?: string | null
          doc_type?: string
          document_date?: string | null
          file_name?: string
          file_url?: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          startup_id?: string
          storage_path?: string | null
          title?: string | null
          uploaded_by?: string | null
        }
        Relationships: []
      }
      startup_milestones: {
        Row: {
          created_at: string
          created_by: string | null
          deadline: string | null
          description: string | null
          id: string
          startup_id: string
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          startup_id: string
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          startup_id?: string
          status?: string
          title?: string
        }
        Relationships: []
      }
      startup_notes: {
        Row: {
          author_id: string | null
          content: string
          created_at: string
          id: string
          startup_id: string
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string
          id?: string
          startup_id: string
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string
          id?: string
          startup_id?: string
        }
        Relationships: []
      }
      startups: {
        Row: {
          created_at: string
          created_by: string | null
          detected_ago: string
          growth: string
          growth_direction: string
          id: string
          insight: string
          insight_detail: string
          insight_last_updated: string
          insight_trend: string
          last_updated: string
          name: string
          runway: string
          slug: string
          spark_data: Json
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          detected_ago?: string
          growth?: string
          growth_direction?: string
          id?: string
          insight?: string
          insight_detail?: string
          insight_last_updated?: string
          insight_trend?: string
          last_updated?: string
          name: string
          runway?: string
          slug: string
          spark_data?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          detected_ago?: string
          growth?: string
          growth_direction?: string
          id?: string
          insight?: string
          insight_detail?: string
          insight_last_updated?: string
          insight_trend?: string
          last_updated?: string
          name?: string
          runway?: string
          slug?: string
          spark_data?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "startups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assignee: string
          blocked_reason: string | null
          created_at: string
          created_by: string | null
          deadline: string | null
          id: string
          instructions: string
          linked_issue_id: string | null
          linked_startup_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee: string
          blocked_reason?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          id?: string
          instructions?: string
          linked_issue_id?: string | null
          linked_startup_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee?: string
          blocked_reason?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          id?: string
          instructions?: string
          linked_issue_id?: string | null
          linked_startup_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invites: {
        Row: {
          accepted: boolean
          created_at: string
          email: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          accepted?: boolean
          created_at?: string
          email: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          accepted?: boolean
          created_at?: string
          email?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      tech_health_entries: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          id: string
          severity: string
          startup_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          severity?: string
          startup_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          severity?: string
          startup_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tech_health_entries_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
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
      youtube_oauth_states: {
        Row: {
          created_at: string
          expires_at: string
          initiated_by: string | null
          return_path: string | null
          startup_id: string
          state: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          initiated_by?: string | null
          return_path?: string | null
          startup_id: string
          state: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          initiated_by?: string | null
          return_path?: string | null
          startup_id?: string
          state?: string
        }
        Relationships: [
          {
            foreignKeyName: "youtube_oauth_states_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_edit_any_bug: { Args: never; Returns: boolean }
      can_manage_bugs: { Args: never; Returns: boolean }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_authorized_youtube_channels: {
        Args: { p_startup_id: string }
        Returns: {
          channel_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_founder: { Args: { _user_id: string }; Returns: boolean }
      is_hr_or_founder: { Args: never; Returns: boolean }
      is_project_lead: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      is_project_member: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      is_social_media_lead: { Args: never; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      purge_expired_mfa_codes: { Args: never; Returns: undefined }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role:
        | "founder"
        | "mfo"
        | "functional_head"
        | "project_manager"
        | "team_member"
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
      app_role: [
        "founder",
        "mfo",
        "functional_head",
        "project_manager",
        "team_member",
      ],
    },
  },
} as const
