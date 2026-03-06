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
    PostgrestVersion: "13.0.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
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
  public: {
    Tables: {
      accounts: {
        Row: {
          access_token: string | null
          created_at: string | null
          expires_at: number | null
          id: string
          id_token: string | null
          provider: string
          provider_account_id: string
          refresh_token: string | null
          scope: string | null
          session_state: string | null
          token_type: string | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string | null
          expires_at?: number | null
          id?: string
          id_token?: string | null
          provider: string
          provider_account_id: string
          refresh_token?: string | null
          scope?: string | null
          session_state?: string | null
          token_type?: string | null
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string | null
          expires_at?: number | null
          id?: string
          id_token?: string | null
          provider?: string
          provider_account_id?: string
          refresh_token?: string | null
          scope?: string | null
          session_state?: string | null
          token_type?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_clicks: {
        Row: {
          clicked_at: string | null
          component_id: string | null
          created_at: string | null
          id: string
          ip_address: unknown
          platform: string
          referrer_url: string | null
          session_id: string | null
          source: string
          tracking_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          clicked_at?: string | null
          component_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          platform: string
          referrer_url?: string | null
          session_id?: string | null
          source: string
          tracking_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          clicked_at?: string | null
          component_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          platform?: string
          referrer_url?: string | null
          session_id?: string | null
          source?: string
          tracking_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_clicks_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_clicks_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "top_affiliate_components"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_revenue: {
        Row: {
          click_id: string | null
          commission_amount: number
          commission_rate: number | null
          component_id: string | null
          confirmed_at: string | null
          created_at: string | null
          id: string
          order_id: string | null
          paid_at: string | null
          platform: string
          sale_amount: number | null
          status: string | null
          tracking_id: string | null
          transaction_date: string
          updated_at: string | null
        }
        Insert: {
          click_id?: string | null
          commission_amount: number
          commission_rate?: number | null
          component_id?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          id?: string
          order_id?: string | null
          paid_at?: string | null
          platform: string
          sale_amount?: number | null
          status?: string | null
          tracking_id?: string | null
          transaction_date: string
          updated_at?: string | null
        }
        Update: {
          click_id?: string | null
          commission_amount?: number
          commission_rate?: number | null
          component_id?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          id?: string
          order_id?: string | null
          paid_at?: string | null
          platform?: string
          sale_amount?: number | null
          status?: string | null
          tracking_id?: string | null
          transaction_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_revenue_click_id_fkey"
            columns: ["click_id"]
            isOneToOne: false
            referencedRelation: "affiliate_clicks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_revenue_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_revenue_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "top_affiliate_components"
            referencedColumns: ["id"]
          },
        ]
      }
      aggregation_errors: {
        Row: {
          context: Json | null
          created_at: string | null
          error_message: string
          error_stack: string | null
          error_type: string
          id: string
          resolved: boolean | null
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          error_message: string
          error_stack?: string | null
          error_type: string
          id?: string
          resolved?: boolean | null
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          error_message?: string
          error_stack?: string | null
          error_type?: string
          id?: string
          resolved?: boolean | null
        }
        Relationships: []
      }
      aggregation_stats: {
        Row: {
          created_at: string | null
          duplicates_removed: number | null
          duration_ms: number
          ebay_errors: number | null
          ebay_new: number | null
          ebay_total: number | null
          id: string
          listings_archived: number | null
          reddit_errors: number | null
          reddit_new: number | null
          reddit_total: number | null
          run_date: string
        }
        Insert: {
          created_at?: string | null
          duplicates_removed?: number | null
          duration_ms: number
          ebay_errors?: number | null
          ebay_new?: number | null
          ebay_total?: number | null
          id?: string
          listings_archived?: number | null
          reddit_errors?: number | null
          reddit_new?: number | null
          reddit_total?: number | null
          run_date: string
        }
        Update: {
          created_at?: string | null
          duplicates_removed?: number | null
          duration_ms?: number
          ebay_errors?: number | null
          ebay_new?: number | null
          ebay_total?: number | null
          id?: string
          listings_archived?: number | null
          reddit_errors?: number | null
          reddit_new?: number | null
          reddit_total?: number | null
          run_date?: string
        }
        Relationships: []
      }
      alert_history: {
        Row: {
          alert_id: string | null
          id: string
          listing_condition: string | null
          listing_date: string | null
          listing_price: number | null
          listing_source: string | null
          listing_title: string | null
          listing_url: string | null
          notification_sent: boolean | null
          notification_sent_at: string | null
          triggered_at: string | null
          user_id: string
          user_viewed: boolean | null
          user_viewed_at: string | null
        }
        Insert: {
          alert_id?: string | null
          id?: string
          listing_condition?: string | null
          listing_date?: string | null
          listing_price?: number | null
          listing_source?: string | null
          listing_title?: string | null
          listing_url?: string | null
          notification_sent?: boolean | null
          notification_sent_at?: string | null
          triggered_at?: string | null
          user_id: string
          user_viewed?: boolean | null
          user_viewed_at?: string | null
        }
        Update: {
          alert_id?: string | null
          id?: string
          listing_condition?: string | null
          listing_date?: string | null
          listing_price?: number | null
          listing_source?: string | null
          listing_title?: string | null
          listing_url?: string | null
          notification_sent?: boolean | null
          notification_sent_at?: string | null
          triggered_at?: string | null
          user_id?: string
          user_viewed?: boolean | null
          user_viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alert_history_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "price_alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      component_ratings: {
        Row: {
          component_id: string
          created_at: string | null
          id: string
          rating: number
          review_text: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          component_id: string
          created_at?: string | null
          id?: string
          rating: number
          review_text?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          component_id?: string
          created_at?: string | null
          id?: string
          rating?: number
          review_text?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      component_specifications: {
        Row: {
          component_id: string
          created_at: string | null
          id: string
          measurement_condition: string | null
          sensitivity_db_mw: number | null
          sensitivity_vrms: number | null
          updated_at: string | null
        }
        Insert: {
          component_id: string
          created_at?: string | null
          id?: string
          measurement_condition?: string | null
          sensitivity_db_mw?: number | null
          sensitivity_vrms?: number | null
          updated_at?: string | null
        }
        Update: {
          component_id?: string
          created_at?: string | null
          id?: string
          measurement_condition?: string | null
          sensitivity_db_mw?: number | null
          sensitivity_vrms?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "component_specifications_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: true
            referencedRelation: "components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "component_specifications_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: true
            referencedRelation: "top_affiliate_components"
            referencedColumns: ["id"]
          },
        ]
      }
      components: {
        Row: {
          amazon_url: string | null
          amplification_difficulty: string | null
          asr_review_url: string | null
          asr_sinad: number | null
          brand: string
          budget_tier: string | null
          category: string
          created_at: string | null
          crin_comments: string | null
          crin_rank: string | null
          crin_signature: string | null
          crin_tech: string | null
          crin_tone: string | null
          crin_value: number | null
          derived_signature: string | null
          derived_signature_detail: string | null
          driver_type: string | null
          expert_grade_numeric: number | null
          fit: string | null
          fr_data: Json | null
          id: string
          image_url: string | null
          impedance: number | null
          is_tws: boolean | null
          manufacturer_url: string | null
          name: string
          needs_amp: boolean | null
          power_output: string | null
          power_output_mw_300: number | null
          power_output_mw_32: number | null
          power_required_mw: number | null
          price_new: number | null
          price_used_max: number | null
          price_used_min: number | null
          sensitivity_db_mw: number | null
          sensitivity_db_v: number | null
          sound_signature: string | null
          source: string | null
          technical_specs: Json | null
          updated_at: string | null
          use_cases: string[] | null
          voltage_required_v: number | null
          why_recommended: string | null
        }
        Insert: {
          amazon_url?: string | null
          amplification_difficulty?: string | null
          asr_review_url?: string | null
          asr_sinad?: number | null
          brand: string
          budget_tier?: string | null
          category: string
          created_at?: string | null
          crin_comments?: string | null
          crin_rank?: string | null
          crin_signature?: string | null
          crin_tech?: string | null
          crin_tone?: string | null
          crin_value?: number | null
          derived_signature?: string | null
          derived_signature_detail?: string | null
          driver_type?: string | null
          expert_grade_numeric?: number | null
          fit?: string | null
          fr_data?: Json | null
          id?: string
          image_url?: string | null
          impedance?: number | null
          is_tws?: boolean | null
          manufacturer_url?: string | null
          name: string
          needs_amp?: boolean | null
          power_output?: string | null
          power_output_mw_300?: number | null
          power_output_mw_32?: number | null
          power_required_mw?: number | null
          price_new?: number | null
          price_used_max?: number | null
          price_used_min?: number | null
          sensitivity_db_mw?: number | null
          sensitivity_db_v?: number | null
          sound_signature?: string | null
          source?: string | null
          technical_specs?: Json | null
          updated_at?: string | null
          use_cases?: string[] | null
          voltage_required_v?: number | null
          why_recommended?: string | null
        }
        Update: {
          amazon_url?: string | null
          amplification_difficulty?: string | null
          asr_review_url?: string | null
          asr_sinad?: number | null
          brand?: string
          budget_tier?: string | null
          category?: string
          created_at?: string | null
          crin_comments?: string | null
          crin_rank?: string | null
          crin_signature?: string | null
          crin_tech?: string | null
          crin_tone?: string | null
          crin_value?: number | null
          derived_signature?: string | null
          derived_signature_detail?: string | null
          driver_type?: string | null
          expert_grade_numeric?: number | null
          fit?: string | null
          fr_data?: Json | null
          id?: string
          image_url?: string | null
          impedance?: number | null
          is_tws?: boolean | null
          manufacturer_url?: string | null
          name?: string
          needs_amp?: boolean | null
          power_output?: string | null
          power_output_mw_300?: number | null
          power_output_mw_32?: number | null
          power_required_mw?: number | null
          price_new?: number | null
          price_used_max?: number | null
          price_used_min?: number | null
          sensitivity_db_mw?: number | null
          sensitivity_db_v?: number | null
          sound_signature?: string | null
          source?: string | null
          technical_specs?: Json | null
          updated_at?: string | null
          use_cases?: string[] | null
          voltage_required_v?: number | null
          why_recommended?: string | null
        }
        Relationships: []
      }
      configurations: {
        Row: {
          budget: number | null
          created_at: string | null
          id: string
          preferences: Json | null
          recommended_items: Json | null
          user_email: string | null
        }
        Insert: {
          budget?: number | null
          created_at?: string | null
          id?: string
          preferences?: Json | null
          recommended_items?: Json | null
          user_email?: string | null
        }
        Update: {
          budget?: number | null
          created_at?: string | null
          id?: string
          preferences?: Json | null
          recommended_items?: Json | null
          user_email?: string | null
        }
        Relationships: []
      }
      curated_systems: {
        Row: {
          budget_tier: number
          category: string
          component_ids: string[]
          created_at: string | null
          description: string
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          rationale: string
          updated_at: string | null
        }
        Insert: {
          budget_tier: number
          category: string
          component_ids: string[]
          created_at?: string | null
          description: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          rationale: string
          updated_at?: string | null
        }
        Update: {
          budget_tier?: number
          category?: string
          component_ids?: string[]
          created_at?: string | null
          description?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          rationale?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      email_subscribers: {
        Row: {
          confirmation_token: string | null
          confirmed: boolean | null
          confirmed_at: string | null
          created_at: string | null
          email: string
          id: string
          source: string
          unsubscribed_at: string | null
        }
        Insert: {
          confirmation_token?: string | null
          confirmed?: boolean | null
          confirmed_at?: string | null
          created_at?: string | null
          email: string
          id?: string
          source: string
          unsubscribed_at?: string | null
        }
        Update: {
          confirmation_token?: string | null
          confirmed?: boolean | null
          confirmed_at?: string | null
          created_at?: string | null
          email?: string
          id?: string
          source?: string
          unsubscribed_at?: string | null
        }
        Relationships: []
      }
      kv_store_a5bfa774: {
        Row: {
          key: string
          value: Json
        }
        Insert: {
          key: string
          value: Json
        }
        Update: {
          key?: string
          value?: Json
        }
        Relationships: []
      }
      listing_moderation: {
        Row: {
          action: string
          automated: boolean | null
          created_at: string | null
          created_by: string | null
          id: string
          listing_id: string | null
          moderator_notes: string | null
          reason: string | null
        }
        Insert: {
          action: string
          automated?: boolean | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          listing_id?: string | null
          moderator_notes?: string | null
          reason?: string | null
        }
        Update: {
          action?: string
          automated?: boolean | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          listing_id?: string | null
          moderator_notes?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_moderation_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "used_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      new_component_candidates: {
        Row: {
          asr_review_url: string | null
          asr_sinad: number | null
          brand: string
          category: string | null
          created_at: string | null
          crin_rank: string | null
          crin_signature: string | null
          crin_tech: string | null
          crin_tone: string | null
          crin_value: number | null
          driver_type: string | null
          first_seen_at: string | null
          id: string
          image_url: string | null
          impedance: number | null
          last_seen_at: string | null
          listing_count: number | null
          manufacturer_url: string | null
          merged_with_component_id: string | null
          model: string
          needs_amp: boolean | null
          price_estimate_new: number | null
          price_observed_max: number | null
          price_observed_min: number | null
          price_used_max: number | null
          price_used_min: number | null
          quality_score: number | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sound_signature: string | null
          status: string | null
          trigger_listing_ids: string[] | null
          updated_at: string | null
        }
        Insert: {
          asr_review_url?: string | null
          asr_sinad?: number | null
          brand: string
          category?: string | null
          created_at?: string | null
          crin_rank?: string | null
          crin_signature?: string | null
          crin_tech?: string | null
          crin_tone?: string | null
          crin_value?: number | null
          driver_type?: string | null
          first_seen_at?: string | null
          id?: string
          image_url?: string | null
          impedance?: number | null
          last_seen_at?: string | null
          listing_count?: number | null
          manufacturer_url?: string | null
          merged_with_component_id?: string | null
          model: string
          needs_amp?: boolean | null
          price_estimate_new?: number | null
          price_observed_max?: number | null
          price_observed_min?: number | null
          price_used_max?: number | null
          price_used_min?: number | null
          quality_score?: number | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sound_signature?: string | null
          status?: string | null
          trigger_listing_ids?: string[] | null
          updated_at?: string | null
        }
        Update: {
          asr_review_url?: string | null
          asr_sinad?: number | null
          brand?: string
          category?: string | null
          created_at?: string | null
          crin_rank?: string | null
          crin_signature?: string | null
          crin_tech?: string | null
          crin_tone?: string | null
          crin_value?: number | null
          driver_type?: string | null
          first_seen_at?: string | null
          id?: string
          image_url?: string | null
          impedance?: number | null
          last_seen_at?: string | null
          listing_count?: number | null
          manufacturer_url?: string | null
          merged_with_component_id?: string | null
          model?: string
          needs_amp?: boolean | null
          price_estimate_new?: number | null
          price_observed_max?: number | null
          price_observed_min?: number | null
          price_used_max?: number | null
          price_used_min?: number | null
          quality_score?: number | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sound_signature?: string | null
          status?: string | null
          trigger_listing_ids?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      price_alerts: {
        Row: {
          alert_type: string | null
          component_id: string | null
          condition_preference: string[] | null
          created_at: string | null
          custom_brand: string | null
          custom_model: string | null
          custom_search_query: string | null
          email_enabled: boolean | null
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          marketplace_preference: string[] | null
          notification_frequency: string | null
          price_range_max: number | null
          price_range_min: number | null
          target_price: number
          trigger_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          alert_type?: string | null
          component_id?: string | null
          condition_preference?: string[] | null
          created_at?: string | null
          custom_brand?: string | null
          custom_model?: string | null
          custom_search_query?: string | null
          email_enabled?: boolean | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          marketplace_preference?: string[] | null
          notification_frequency?: string | null
          price_range_max?: number | null
          price_range_min?: number | null
          target_price: number
          trigger_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          alert_type?: string | null
          component_id?: string | null
          condition_preference?: string[] | null
          created_at?: string | null
          custom_brand?: string | null
          custom_model?: string | null
          custom_search_query?: string | null
          email_enabled?: boolean | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          marketplace_preference?: string[] | null
          notification_frequency?: string | null
          price_range_max?: number | null
          price_range_min?: number | null
          target_price?: number
          trigger_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_alerts_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_alerts_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "top_affiliate_components"
            referencedColumns: ["id"]
          },
        ]
      }
      price_history: {
        Row: {
          component_id: string
          created_at: string | null
          date_recorded: string
          excellent_condition_avg: number | null
          good_condition_avg: number | null
          id: string
          listing_count: number | null
          price_avg: number | null
          price_max: number | null
          price_min: number | null
          source: string
        }
        Insert: {
          component_id: string
          created_at?: string | null
          date_recorded: string
          excellent_condition_avg?: number | null
          good_condition_avg?: number | null
          id?: string
          listing_count?: number | null
          price_avg?: number | null
          price_max?: number | null
          price_min?: number | null
          source: string
        }
        Update: {
          component_id?: string
          created_at?: string | null
          date_recorded?: string
          excellent_condition_avg?: number | null
          good_condition_avg?: number | null
          id?: string
          listing_count?: number | null
          price_avg?: number | null
          price_max?: number | null
          price_min?: number | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_history_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_history_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "top_affiliate_components"
            referencedColumns: ["id"]
          },
        ]
      }
      price_trends: {
        Row: {
          active_count: number | null
          avg_asking_price: number | null
          component_id: string | null
          confidence_score: string | null
          created_at: string | null
          data_quality_notes: string | null
          discount_factor: number | null
          id: number
          max_asking_price: number | null
          median_asking_price: number | null
          min_asking_price: number | null
          period_end: string
          period_start: string
          sold_count: number | null
          trend_direction: string | null
          trend_percentage: number | null
          updated_at: string | null
        }
        Insert: {
          active_count?: number | null
          avg_asking_price?: number | null
          component_id?: string | null
          confidence_score?: string | null
          created_at?: string | null
          data_quality_notes?: string | null
          discount_factor?: number | null
          id?: number
          max_asking_price?: number | null
          median_asking_price?: number | null
          min_asking_price?: number | null
          period_end: string
          period_start: string
          sold_count?: number | null
          trend_direction?: string | null
          trend_percentage?: number | null
          updated_at?: string | null
        }
        Update: {
          active_count?: number | null
          avg_asking_price?: number | null
          component_id?: string | null
          confidence_score?: string | null
          created_at?: string | null
          data_quality_notes?: string | null
          discount_factor?: number | null
          id?: number
          max_asking_price?: number | null
          median_asking_price?: number | null
          min_asking_price?: number | null
          period_end?: string
          period_start?: string
          sold_count?: number | null
          trend_direction?: string | null
          trend_percentage?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_trends_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_trends_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "top_affiliate_components"
            referencedColumns: ["id"]
          },
        ]
      }
      reverb_priceguide_mappings: {
        Row: {
          component_id: string
          created_at: string | null
          estimated_value_high: number | null
          estimated_value_low: number | null
          id: string
          last_synced_at: string | null
          match_confidence: number
          reverb_priceguide_id: number
          reverb_title: string | null
          transaction_count: number | null
        }
        Insert: {
          component_id: string
          created_at?: string | null
          estimated_value_high?: number | null
          estimated_value_low?: number | null
          id?: string
          last_synced_at?: string | null
          match_confidence: number
          reverb_priceguide_id: number
          reverb_title?: string | null
          transaction_count?: number | null
        }
        Update: {
          component_id?: string
          created_at?: string | null
          estimated_value_high?: number | null
          estimated_value_low?: number | null
          id?: string
          last_synced_at?: string | null
          match_confidence?: number
          reverb_priceguide_id?: number
          reverb_title?: string | null
          transaction_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reverb_priceguide_mappings_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: true
            referencedRelation: "components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reverb_priceguide_mappings_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: true
            referencedRelation: "top_affiliate_components"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string | null
          expires: string
          id: string
          session_token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires: string
          id?: string
          session_token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires?: string
          id?: string
          session_token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      stack_components: {
        Row: {
          component_id: string | null
          created_at: string | null
          id: string
          position: number
          stack_id: string
          user_gear_id: string | null
        }
        Insert: {
          component_id?: string | null
          created_at?: string | null
          id?: string
          position?: number
          stack_id: string
          user_gear_id?: string | null
        }
        Update: {
          component_id?: string | null
          created_at?: string | null
          id?: string
          position?: number
          stack_id?: string
          user_gear_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stack_components_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stack_components_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "top_affiliate_components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stack_components_stack_id_fkey"
            columns: ["stack_id"]
            isOneToOne: false
            referencedRelation: "user_stacks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stack_components_user_gear_id_fkey"
            columns: ["user_gear_id"]
            isOneToOne: false
            referencedRelation: "user_gear"
            referencedColumns: ["id"]
          },
        ]
      }
      used_listings: {
        Row: {
          accepts_offers: boolean | null
          avexchange_bot_comment_id: string | null
          avexchange_bot_confirmed: boolean | null
          bundle_component_count: number | null
          bundle_group_id: string | null
          bundle_position: number | null
          bundle_total_price: number | null
          buyer_feedback_given: boolean | null
          buyer_username: string | null
          component_count: number | null
          component_id: string | null
          condition: string | null
          created_at: string | null
          date_posted: string
          date_sold: string | null
          description: string | null
          id: string
          images: string[] | null
          is_active: boolean | null
          is_ambiguous: boolean | null
          is_bundle: boolean | null
          listing_type: string | null
          location: string | null
          location_country: string | null
          location_state: string | null
          manual_review_notes: string | null
          match_confidence: number | null
          matched_segment: string | null
          price: number
          price_is_estimated: boolean | null
          price_is_reasonable: boolean | null
          price_variance_percentage: number | null
          price_warning: string | null
          requires_manual_review: boolean | null
          reviewed_at: string | null
          reviewed_by: string | null
          sale_price: number | null
          seller_confirmed_trades: number | null
          seller_feedback_given: boolean | null
          seller_feedback_percentage: number | null
          seller_feedback_score: number | null
          seller_username: string
          shipping_cost: number | null
          source: string | null
          status: string | null
          title: string
          updated_at: string | null
          url: string
          validation_warnings: Json | null
        }
        Insert: {
          accepts_offers?: boolean | null
          avexchange_bot_comment_id?: string | null
          avexchange_bot_confirmed?: boolean | null
          bundle_component_count?: number | null
          bundle_group_id?: string | null
          bundle_position?: number | null
          bundle_total_price?: number | null
          buyer_feedback_given?: boolean | null
          buyer_username?: string | null
          component_count?: number | null
          component_id?: string | null
          condition?: string | null
          created_at?: string | null
          date_posted: string
          date_sold?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          is_ambiguous?: boolean | null
          is_bundle?: boolean | null
          listing_type?: string | null
          location?: string | null
          location_country?: string | null
          location_state?: string | null
          manual_review_notes?: string | null
          match_confidence?: number | null
          matched_segment?: string | null
          price: number
          price_is_estimated?: boolean | null
          price_is_reasonable?: boolean | null
          price_variance_percentage?: number | null
          price_warning?: string | null
          requires_manual_review?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sale_price?: number | null
          seller_confirmed_trades?: number | null
          seller_feedback_given?: boolean | null
          seller_feedback_percentage?: number | null
          seller_feedback_score?: number | null
          seller_username: string
          shipping_cost?: number | null
          source?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          url: string
          validation_warnings?: Json | null
        }
        Update: {
          accepts_offers?: boolean | null
          avexchange_bot_comment_id?: string | null
          avexchange_bot_confirmed?: boolean | null
          bundle_component_count?: number | null
          bundle_group_id?: string | null
          bundle_position?: number | null
          bundle_total_price?: number | null
          buyer_feedback_given?: boolean | null
          buyer_username?: string | null
          component_count?: number | null
          component_id?: string | null
          condition?: string | null
          created_at?: string | null
          date_posted?: string
          date_sold?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          is_ambiguous?: boolean | null
          is_bundle?: boolean | null
          listing_type?: string | null
          location?: string | null
          location_country?: string | null
          location_state?: string | null
          manual_review_notes?: string | null
          match_confidence?: number | null
          matched_segment?: string | null
          price?: number
          price_is_estimated?: boolean | null
          price_is_reasonable?: boolean | null
          price_variance_percentage?: number | null
          price_warning?: string | null
          requires_manual_review?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sale_price?: number | null
          seller_confirmed_trades?: number | null
          seller_feedback_given?: boolean | null
          seller_feedback_percentage?: number | null
          seller_feedback_score?: number | null
          seller_username?: string
          shipping_cost?: number | null
          source?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          url?: string
          validation_warnings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "used_listings_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "used_listings_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "top_affiliate_components"
            referencedColumns: ["id"]
          },
        ]
      }
      used_listings_archive: {
        Row: {
          accepts_offers: boolean | null
          archived_at: string
          component_id: string | null
          condition: string
          created_at: string | null
          date_posted: string
          description: string | null
          expires_at: string | null
          id: string
          images: string[] | null
          listing_type: string | null
          location: string
          location_country: string | null
          location_state: string | null
          original_created_at: string
          original_updated_at: string
          price: number
          price_is_reasonable: boolean | null
          price_variance_percentage: number | null
          price_warning: string | null
          seller_confirmed_trades: number | null
          seller_feedback_percentage: number | null
          seller_feedback_score: number | null
          seller_username: string
          shipping_cost: number | null
          source: string
          title: string
          updated_at: string | null
          url: string
          view_count: number | null
        }
        Insert: {
          accepts_offers?: boolean | null
          archived_at?: string
          component_id?: string | null
          condition: string
          created_at?: string | null
          date_posted: string
          description?: string | null
          expires_at?: string | null
          id?: string
          images?: string[] | null
          listing_type?: string | null
          location: string
          location_country?: string | null
          location_state?: string | null
          original_created_at: string
          original_updated_at: string
          price: number
          price_is_reasonable?: boolean | null
          price_variance_percentage?: number | null
          price_warning?: string | null
          seller_confirmed_trades?: number | null
          seller_feedback_percentage?: number | null
          seller_feedback_score?: number | null
          seller_username: string
          shipping_cost?: number | null
          source: string
          title: string
          updated_at?: string | null
          url: string
          view_count?: number | null
        }
        Update: {
          accepts_offers?: boolean | null
          archived_at?: string
          component_id?: string | null
          condition?: string
          created_at?: string | null
          date_posted?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          images?: string[] | null
          listing_type?: string | null
          location?: string
          location_country?: string | null
          location_state?: string | null
          original_created_at?: string
          original_updated_at?: string
          price?: number
          price_is_reasonable?: boolean | null
          price_variance_percentage?: number | null
          price_warning?: string | null
          seller_confirmed_trades?: number | null
          seller_feedback_percentage?: number | null
          seller_feedback_score?: number | null
          seller_username?: string
          shipping_cost?: number | null
          source?: string
          title?: string
          updated_at?: string | null
          url?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "used_listings_archive_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "used_listings_archive_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "top_affiliate_components"
            referencedColumns: ["id"]
          },
        ]
      }
      user_gear: {
        Row: {
          component_id: string | null
          condition: string | null
          created_at: string | null
          current_value: number | null
          custom_brand: string | null
          custom_category: string | null
          custom_name: string | null
          id: string
          is_active: boolean | null
          is_loaned: boolean | null
          loaned_date: string | null
          loaned_to: string | null
          notes: string | null
          purchase_date: string | null
          purchase_location: string | null
          purchase_price: number | null
          serial_number: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          component_id?: string | null
          condition?: string | null
          created_at?: string | null
          current_value?: number | null
          custom_brand?: string | null
          custom_category?: string | null
          custom_name?: string | null
          id?: string
          is_active?: boolean | null
          is_loaned?: boolean | null
          loaned_date?: string | null
          loaned_to?: string | null
          notes?: string | null
          purchase_date?: string | null
          purchase_location?: string | null
          purchase_price?: number | null
          serial_number?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          component_id?: string | null
          condition?: string | null
          created_at?: string | null
          current_value?: number | null
          custom_brand?: string | null
          custom_category?: string | null
          custom_name?: string | null
          id?: string
          is_active?: boolean | null
          is_loaned?: boolean | null
          loaned_date?: string | null
          loaned_to?: string | null
          notes?: string | null
          purchase_date?: string | null
          purchase_location?: string | null
          purchase_price?: number | null
          serial_number?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_gear_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_gear_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "top_affiliate_components"
            referencedColumns: ["id"]
          },
        ]
      }
      user_stacks: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_primary: boolean | null
          name: string
          purpose: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_primary?: boolean | null
          name: string
          purpose?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_primary?: boolean | null
          name?: string
          purpose?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          email: string | null
          email_verified: string | null
          id: string
          image: string | null
          name: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          email_verified?: string | null
          id?: string
          image?: string | null
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          email_verified?: string | null
          id?: string
          image?: string | null
          name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      verification_tokens: {
        Row: {
          created_at: string | null
          expires: string
          identifier: string
          token: string
        }
        Insert: {
          created_at?: string | null
          expires: string
          identifier: string
          token: string
        }
        Update: {
          created_at?: string | null
          expires?: string
          identifier?: string
          token?: string
        }
        Relationships: []
      }
      wishlists: {
        Row: {
          component_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          component_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          component_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlists_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "top_affiliate_components"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      affiliate_revenue_summary: {
        Row: {
          avg_commission_rate: number | null
          date: string | null
          platform: string | null
          status: string | null
          total_commission: number | null
          total_sales: number | null
          transaction_count: number | null
        }
        Relationships: []
      }
      affiliate_stats_daily: {
        Row: {
          date: string | null
          platform: string | null
          source: string | null
          total_clicks: number | null
          unique_components: number | null
          unique_sessions: number | null
        }
        Relationships: []
      }
      top_affiliate_components: {
        Row: {
          brand: string | null
          category: string | null
          conversion_rate: number | null
          id: string | null
          name: string | null
          total_clicks: number | null
          total_commission: number | null
          total_conversions: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_active_listing_counts: {
        Args: { component_ids: string[] }
        Returns: {
          component_id: string
          listing_count: number
        }[]
      }
      get_unique_brands: {
        Args: never
        Returns: {
          brand: string
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
