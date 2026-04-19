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
      admin_actions: {
        Row: {
          action_type: string
          admin_user_id: string | null
          after_state: Json
          before_state: Json
          created_at: string
          id: string
          ip_address: unknown
          note: string | null
          target_id: string | null
          target_type: string
          user_agent: string | null
        }
        Insert: {
          action_type: string
          admin_user_id?: string | null
          after_state?: Json
          before_state?: Json
          created_at?: string
          id?: string
          ip_address?: unknown
          note?: string | null
          target_id?: string | null
          target_type: string
          user_agent?: string | null
        }
        Update: {
          action_type?: string
          admin_user_id?: string | null
          after_state?: Json
          before_state?: Json
          created_at?: string
          id?: string
          ip_address?: unknown
          note?: string | null
          target_id?: string | null
          target_type?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_actions_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      app_config: {
        Row: {
          bonus_ticket_ttl_days: number
          bonus_wager_multiplier: number
          created_at: string
          expiry_policy: Database["public"]["Enums"]["expiry_policy"]
          global_trade_freeze: boolean
          id: number
          rate_limit_per_10s: number
          ref_default_l1_bps: number
          ref_default_l2_bps: number
          ref_default_l3_bps: number
          ref_default_l4_bps: number
          ref_default_l5_bps: number
          ref_min_deposit_cents: number
          signup_bonus_cents: number
          updated_at: string
          withdraw_fee_cents: number
          withdraw_min_cents: number
        }
        Insert: {
          bonus_ticket_ttl_days?: number
          bonus_wager_multiplier?: number
          created_at?: string
          expiry_policy?: Database["public"]["Enums"]["expiry_policy"]
          global_trade_freeze?: boolean
          id?: number
          rate_limit_per_10s?: number
          ref_default_l1_bps?: number
          ref_default_l2_bps?: number
          ref_default_l3_bps?: number
          ref_default_l4_bps?: number
          ref_default_l5_bps?: number
          ref_min_deposit_cents?: number
          signup_bonus_cents?: number
          updated_at?: string
          withdraw_fee_cents?: number
          withdraw_min_cents?: number
        }
        Update: {
          bonus_ticket_ttl_days?: number
          bonus_wager_multiplier?: number
          created_at?: string
          expiry_policy?: Database["public"]["Enums"]["expiry_policy"]
          global_trade_freeze?: boolean
          id?: number
          rate_limit_per_10s?: number
          ref_default_l1_bps?: number
          ref_default_l2_bps?: number
          ref_default_l3_bps?: number
          ref_default_l4_bps?: number
          ref_default_l5_bps?: number
          ref_min_deposit_cents?: number
          signup_bonus_cents?: number
          updated_at?: string
          withdraw_fee_cents?: number
          withdraw_min_cents?: number
        }
        Relationships: []
      }
      bonus_tickets: {
        Row: {
          amount_cents: number
          created_at: string
          expires_at: string
          id: string
          kind: Database["public"]["Enums"]["bonus_ticket_kind"]
          note: string | null
          reference_id: string | null
          reference_type: string | null
          released_at: string | null
          status: Database["public"]["Enums"]["bonus_ticket_status"]
          updated_at: string
          user_id: string
          wager_progress_cents: number
          wager_required_cents: number
        }
        Insert: {
          amount_cents: number
          created_at?: string
          expires_at: string
          id?: string
          kind: Database["public"]["Enums"]["bonus_ticket_kind"]
          note?: string | null
          reference_id?: string | null
          reference_type?: string | null
          released_at?: string | null
          status?: Database["public"]["Enums"]["bonus_ticket_status"]
          updated_at?: string
          user_id: string
          wager_progress_cents?: number
          wager_required_cents: number
        }
        Update: {
          amount_cents?: number
          created_at?: string
          expires_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["bonus_ticket_kind"]
          note?: string | null
          reference_id?: string | null
          reference_type?: string | null
          released_at?: string | null
          status?: Database["public"]["Enums"]["bonus_ticket_status"]
          updated_at?: string
          user_id?: string
          wager_progress_cents?: number
          wager_required_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "bonus_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      candle_replay_bank: {
        Row: {
          bucket_start: string
          close_cents: number
          created_at: string
          high_cents: number
          low_cents: number
          metadata: Json
          open_cents: number
          sequence_no: number
          source_key: string
          timeframe_seconds: number
          token_id: string
          volume: number
        }
        Insert: {
          bucket_start: string
          close_cents: number
          created_at?: string
          high_cents: number
          low_cents: number
          metadata?: Json
          open_cents: number
          sequence_no: number
          source_key: string
          timeframe_seconds?: number
          token_id: string
          volume?: number
        }
        Update: {
          bucket_start?: string
          close_cents?: number
          created_at?: string
          high_cents?: number
          low_cents?: number
          metadata?: Json
          open_cents?: number
          sequence_no?: number
          source_key?: string
          timeframe_seconds?: number
          token_id?: string
          volume?: number
        }
        Relationships: [
          {
            foreignKeyName: "candle_replay_bank_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      candles_15m: {
        Row: {
          bucket_start: string
          close_cents: number
          created_at: string
          high_cents: number
          low_cents: number
          open_cents: number
          source: string
          token_id: string
          volume: number
        }
        Insert: {
          bucket_start: string
          close_cents: number
          created_at?: string
          high_cents: number
          low_cents: number
          open_cents: number
          source?: string
          token_id: string
          volume?: number
        }
        Update: {
          bucket_start?: string
          close_cents?: number
          created_at?: string
          high_cents?: number
          low_cents?: number
          open_cents?: number
          source?: string
          token_id?: string
          volume?: number
        }
        Relationships: [
          {
            foreignKeyName: "candles_15m_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      candles_1d: {
        Row: {
          bucket_start: string
          close_cents: number
          created_at: string
          high_cents: number
          low_cents: number
          open_cents: number
          source: string
          token_id: string
          volume: number
        }
        Insert: {
          bucket_start: string
          close_cents: number
          created_at?: string
          high_cents: number
          low_cents: number
          open_cents: number
          source?: string
          token_id: string
          volume?: number
        }
        Update: {
          bucket_start?: string
          close_cents?: number
          created_at?: string
          high_cents?: number
          low_cents?: number
          open_cents?: number
          source?: string
          token_id?: string
          volume?: number
        }
        Relationships: [
          {
            foreignKeyName: "candles_1d_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      candles_1h: {
        Row: {
          bucket_start: string
          close_cents: number
          created_at: string
          high_cents: number
          low_cents: number
          open_cents: number
          source: string
          token_id: string
          volume: number
        }
        Insert: {
          bucket_start: string
          close_cents: number
          created_at?: string
          high_cents: number
          low_cents: number
          open_cents: number
          source?: string
          token_id: string
          volume?: number
        }
        Update: {
          bucket_start?: string
          close_cents?: number
          created_at?: string
          high_cents?: number
          low_cents?: number
          open_cents?: number
          source?: string
          token_id?: string
          volume?: number
        }
        Relationships: [
          {
            foreignKeyName: "candles_1h_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      candles_1m: {
        Row: {
          bucket_start: string
          close_cents: number
          created_at: string
          high_cents: number
          low_cents: number
          open_cents: number
          source: string
          token_id: string
          volume: number
        }
        Insert: {
          bucket_start: string
          close_cents: number
          created_at?: string
          high_cents: number
          low_cents: number
          open_cents: number
          source?: string
          token_id: string
          volume?: number
        }
        Update: {
          bucket_start?: string
          close_cents?: number
          created_at?: string
          high_cents?: number
          low_cents?: number
          open_cents?: number
          source?: string
          token_id?: string
          volume?: number
        }
        Relationships: [
          {
            foreignKeyName: "candles_1m_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      candles_1s: {
        Row: {
          bucket_start: string
          close_cents: number
          created_at: string
          high_cents: number
          low_cents: number
          open_cents: number
          source: string
          token_id: string
          volume: number
        }
        Insert: {
          bucket_start: string
          close_cents: number
          created_at?: string
          high_cents: number
          low_cents: number
          open_cents: number
          source?: string
          token_id: string
          volume?: number
        }
        Update: {
          bucket_start?: string
          close_cents?: number
          created_at?: string
          high_cents?: number
          low_cents?: number
          open_cents?: number
          source?: string
          token_id?: string
          volume?: number
        }
        Relationships: [
          {
            foreignKeyName: "candles_1s_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      candles_1s_2026_04: {
        Row: {
          bucket_start: string
          close_cents: number
          created_at: string
          high_cents: number
          low_cents: number
          open_cents: number
          source: string
          token_id: string
          volume: number
        }
        Insert: {
          bucket_start: string
          close_cents: number
          created_at?: string
          high_cents: number
          low_cents: number
          open_cents: number
          source?: string
          token_id: string
          volume?: number
        }
        Update: {
          bucket_start?: string
          close_cents?: number
          created_at?: string
          high_cents?: number
          low_cents?: number
          open_cents?: number
          source?: string
          token_id?: string
          volume?: number
        }
        Relationships: []
      }
      candles_1s_2026_05: {
        Row: {
          bucket_start: string
          close_cents: number
          created_at: string
          high_cents: number
          low_cents: number
          open_cents: number
          source: string
          token_id: string
          volume: number
        }
        Insert: {
          bucket_start: string
          close_cents: number
          created_at?: string
          high_cents: number
          low_cents: number
          open_cents: number
          source?: string
          token_id: string
          volume?: number
        }
        Update: {
          bucket_start?: string
          close_cents?: number
          created_at?: string
          high_cents?: number
          low_cents?: number
          open_cents?: number
          source?: string
          token_id?: string
          volume?: number
        }
        Relationships: []
      }
      candles_4h: {
        Row: {
          bucket_start: string
          close_cents: number
          created_at: string
          high_cents: number
          low_cents: number
          open_cents: number
          source: string
          token_id: string
          volume: number
        }
        Insert: {
          bucket_start: string
          close_cents: number
          created_at?: string
          high_cents: number
          low_cents: number
          open_cents: number
          source?: string
          token_id: string
          volume?: number
        }
        Update: {
          bucket_start?: string
          close_cents?: number
          created_at?: string
          high_cents?: number
          low_cents?: number
          open_cents?: number
          source?: string
          token_id?: string
          volume?: number
        }
        Relationships: [
          {
            foreignKeyName: "candles_4h_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      candles_5m: {
        Row: {
          bucket_start: string
          close_cents: number
          created_at: string
          high_cents: number
          low_cents: number
          open_cents: number
          source: string
          token_id: string
          volume: number
        }
        Insert: {
          bucket_start: string
          close_cents: number
          created_at?: string
          high_cents: number
          low_cents: number
          open_cents: number
          source?: string
          token_id: string
          volume?: number
        }
        Update: {
          bucket_start?: string
          close_cents?: number
          created_at?: string
          high_cents?: number
          low_cents?: number
          open_cents?: number
          source?: string
          token_id?: string
          volume?: number
        }
        Relationships: [
          {
            foreignKeyName: "candles_5m_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      deposits: {
        Row: {
          admin_note: string | null
          amount_cents: number
          created_at: string
          id: string
          network: Database["public"]["Enums"]["deposit_network"]
          proof_path: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["deposit_status"]
          token_id: string
          tx_hash: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount_cents: number
          created_at?: string
          id?: string
          network: Database["public"]["Enums"]["deposit_network"]
          proof_path: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["deposit_status"]
          token_id: string
          tx_hash?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount_cents?: number
          created_at?: string
          id?: string
          network?: Database["public"]["Enums"]["deposit_network"]
          proof_path?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["deposit_status"]
          token_id?: string
          tx_hash?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deposits_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "deposits_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      invitation_codes: {
        Row: {
          code: string
          created_at: string
          created_by_admin_id: string | null
          expires_at: string | null
          id: string
          is_single_use: boolean
          last_used_at: string | null
          metadata: Json
          note: string | null
          owner_user_id: string | null
          revoked_at: string | null
          source: Database["public"]["Enums"]["invitation_source"]
          status: Database["public"]["Enums"]["invitation_status"]
          updated_at: string
          used_at: string | null
          used_by_user_id: string | null
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by_admin_id?: string | null
          expires_at?: string | null
          id?: string
          is_single_use?: boolean
          last_used_at?: string | null
          metadata?: Json
          note?: string | null
          owner_user_id?: string | null
          revoked_at?: string | null
          source: Database["public"]["Enums"]["invitation_source"]
          status?: Database["public"]["Enums"]["invitation_status"]
          updated_at?: string
          used_at?: string | null
          used_by_user_id?: string | null
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by_admin_id?: string | null
          expires_at?: string | null
          id?: string
          is_single_use?: boolean
          last_used_at?: string | null
          metadata?: Json
          note?: string | null
          owner_user_id?: string | null
          revoked_at?: string | null
          source?: Database["public"]["Enums"]["invitation_source"]
          status?: Database["public"]["Enums"]["invitation_status"]
          updated_at?: string
          used_at?: string | null
          used_by_user_id?: string | null
          used_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "invitation_codes_created_by_admin_id_fkey"
            columns: ["created_by_admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "invitation_codes_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "invitation_codes_used_by_user_id_fkey"
            columns: ["used_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          created_at: string
          display_name: string | null
          email: string
          is_frozen: boolean
          last_login_at: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          is_frozen?: boolean
          last_login_at?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          is_frozen?: boolean
          last_login_at?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      promo_slots: {
        Row: {
          body: string | null
          cta_href: string | null
          cta_label: string | null
          id: string
          image_path: string | null
          is_enabled: boolean
          slot_type: string
          slug: string
          sort_order: number
          subtitle: string | null
          title: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          body?: string | null
          cta_href?: string | null
          cta_label?: string | null
          id?: string
          image_path?: string | null
          is_enabled?: boolean
          slot_type?: string
          slug: string
          sort_order?: number
          subtitle?: string | null
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          body?: string | null
          cta_href?: string | null
          cta_label?: string | null
          id?: string
          image_path?: string | null
          is_enabled?: boolean
          slot_type?: string
          slug?: string
          sort_order?: number
          subtitle?: string | null
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      referral_commissions: {
        Row: {
          base_amount_cents: number
          beneficiary_user_id: string
          bps_applied: number
          commission_cents: number
          created_at: string
          deposit_id: string | null
          id: string
          level: number
          referee_user_id: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by_admin_id: string | null
          status: Database["public"]["Enums"]["commission_status"]
          updated_at: string
        }
        Insert: {
          base_amount_cents: number
          beneficiary_user_id: string
          bps_applied: number
          commission_cents: number
          created_at?: string
          deposit_id?: string | null
          id?: string
          level: number
          referee_user_id: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by_admin_id?: string | null
          status?: Database["public"]["Enums"]["commission_status"]
          updated_at?: string
        }
        Update: {
          base_amount_cents?: number
          beneficiary_user_id?: string
          bps_applied?: number
          commission_cents?: number
          created_at?: string
          deposit_id?: string | null
          id?: string
          level?: number
          referee_user_id?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by_admin_id?: string | null
          status?: Database["public"]["Enums"]["commission_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_commissions_beneficiary_user_id_fkey"
            columns: ["beneficiary_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "referral_commissions_deposit_fk"
            columns: ["deposit_id"]
            isOneToOne: false
            referencedRelation: "deposits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_commissions_referee_user_id_fkey"
            columns: ["referee_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "referral_commissions_reviewed_by_admin_id_fkey"
            columns: ["reviewed_by_admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      referral_flags: {
        Row: {
          created_at: string
          detail: Json
          id: string
          is_resolved: boolean
          kind: Database["public"]["Enums"]["referral_flag_kind"]
          resolved_at: string | null
          resolved_by_admin_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          detail?: Json
          id?: string
          is_resolved?: boolean
          kind: Database["public"]["Enums"]["referral_flag_kind"]
          resolved_at?: string | null
          resolved_by_admin_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          detail?: Json
          id?: string
          is_resolved?: boolean
          kind?: Database["public"]["Enums"]["referral_flag_kind"]
          resolved_at?: string | null
          resolved_by_admin_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_flags_resolved_by_admin_id_fkey"
            columns: ["resolved_by_admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "referral_flags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      referral_rates: {
        Row: {
          l1_bps: number
          l2_bps: number
          l3_bps: number
          l4_bps: number
          l5_bps: number
          updated_at: string
          updated_by_admin_id: string | null
          user_id: string
        }
        Insert: {
          l1_bps?: number
          l2_bps?: number
          l3_bps?: number
          l4_bps?: number
          l5_bps?: number
          updated_at?: string
          updated_by_admin_id?: string | null
          user_id: string
        }
        Update: {
          l1_bps?: number
          l2_bps?: number
          l3_bps?: number
          l4_bps?: number
          l5_bps?: number
          updated_at?: string
          updated_by_admin_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_rates_updated_by_admin_id_fkey"
            columns: ["updated_by_admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "referral_rates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      referral_upline: {
        Row: {
          ancestor_id: string
          created_at: string
          level: number
          user_id: string
        }
        Insert: {
          ancestor_id: string
          created_at?: string
          level: number
          user_id: string
        }
        Update: {
          ancestor_id?: string
          created_at?: string
          level?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_upline_ancestor_id_fkey"
            columns: ["ancestor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "referral_upline_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string
          first_deposit_fired: boolean
          id: string
          invited_via_code: string
          referee_user_id: string
          referrer_user_id: string
        }
        Insert: {
          created_at?: string
          first_deposit_fired?: boolean
          id?: string
          invited_via_code: string
          referee_user_id: string
          referrer_user_id: string
        }
        Update: {
          created_at?: string
          first_deposit_fired?: boolean
          id?: string
          invited_via_code?: string
          referee_user_id?: string
          referrer_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referee_user_id_fkey"
            columns: ["referee_user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "referrals_referrer_user_id_fkey"
            columns: ["referrer_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      token_replay_state: {
        Row: {
          created_at: string
          cursor_sequence: number
          is_looping: boolean
          last_advanced_at: string | null
          playback_speed: number
          source_key: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["replay_status"]
          token_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cursor_sequence?: number
          is_looping?: boolean
          last_advanced_at?: string | null
          playback_speed?: number
          source_key?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["replay_status"]
          token_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cursor_sequence?: number
          is_looping?: boolean
          last_advanced_at?: string | null
          playback_speed?: number
          source_key?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["replay_status"]
          token_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "token_replay_state_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      tokens: {
        Row: {
          base_price_cents: number
          created_at: string
          drift_bias_bps: number
          feed_source: Database["public"]["Enums"]["token_feed_source"]
          freeze_price_cents: number | null
          icon_path: string | null
          id: string
          is_enabled: boolean
          last_price_at: string | null
          last_price_cents: number | null
          last_shadow_at: string | null
          last_shadow_price_cents: number | null
          name: string
          price_offset_cents: number
          price_scale: number
          shadow_symbol: string | null
          symbol: string
          updated_at: string
          volatility_factor: number
        }
        Insert: {
          base_price_cents: number
          created_at?: string
          drift_bias_bps?: number
          feed_source?: Database["public"]["Enums"]["token_feed_source"]
          freeze_price_cents?: number | null
          icon_path?: string | null
          id?: string
          is_enabled?: boolean
          last_price_at?: string | null
          last_price_cents?: number | null
          last_shadow_at?: string | null
          last_shadow_price_cents?: number | null
          name: string
          price_offset_cents?: number
          price_scale?: number
          shadow_symbol?: string | null
          symbol: string
          updated_at?: string
          volatility_factor?: number
        }
        Update: {
          base_price_cents?: number
          created_at?: string
          drift_bias_bps?: number
          feed_source?: Database["public"]["Enums"]["token_feed_source"]
          freeze_price_cents?: number | null
          icon_path?: string | null
          id?: string
          is_enabled?: boolean
          last_price_at?: string | null
          last_price_cents?: number | null
          last_shadow_at?: string | null
          last_shadow_price_cents?: number | null
          name?: string
          price_offset_cents?: number
          price_scale?: number
          shadow_symbol?: string | null
          symbol?: string
          updated_at?: string
          volatility_factor?: number
        }
        Relationships: []
      }
      trade_periods: {
        Row: {
          created_at: string
          duration_seconds: number
          id: string
          is_enabled: boolean
          label: string
          max_amount_cents: number
          min_amount_cents: number
          payout_bps: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_seconds: number
          id?: string
          is_enabled?: boolean
          label: string
          max_amount_cents: number
          min_amount_cents: number
          payout_bps?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number
          id?: string
          is_enabled?: boolean
          label?: string
          max_amount_cents?: number
          min_amount_cents?: number
          payout_bps?: number
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount_cents: number
          balance_after_cents: number | null
          created_at: string
          id: string
          kind: string
          memo: string | null
          metadata: Json
          reference_id: string | null
          reference_type: string | null
          user_id: string
        }
        Insert: {
          amount_cents: number
          balance_after_cents?: number | null
          created_at?: string
          id?: string
          kind: string
          memo?: string | null
          metadata?: Json
          reference_id?: string | null
          reference_type?: string | null
          user_id: string
        }
        Update: {
          amount_cents?: number
          balance_after_cents?: number | null
          created_at?: string
          id?: string
          kind?: string
          memo?: string | null
          metadata?: Json
          reference_id?: string | null
          reference_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_balances: {
        Row: {
          balance_cents: number
          created_at: string
          locked_bonus_cents: number
          locked_in_trades_cents: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_cents?: number
          created_at?: string
          locked_bonus_cents?: number
          locked_in_trades_cents?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_cents?: number
          created_at?: string
          locked_bonus_cents?: number
          locked_in_trades_cents?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_balances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_trades: {
        Row: {
          created_at: string
          direction: Database["public"]["Enums"]["trade_direction"]
          end_time: string
          entry_price_cents: number
          id: string
          metadata: Json
          outcome: Database["public"]["Enums"]["trade_outcome"] | null
          payout_bps: number
          settled_at: string | null
          settled_by: string | null
          settled_reason: string | null
          stake_cents: number
          started_at: string
          status: Database["public"]["Enums"]["trade_status"]
          strike_price_cents: number | null
          token_id: string
          trade_period_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          direction: Database["public"]["Enums"]["trade_direction"]
          end_time: string
          entry_price_cents: number
          id?: string
          metadata?: Json
          outcome?: Database["public"]["Enums"]["trade_outcome"] | null
          payout_bps: number
          settled_at?: string | null
          settled_by?: string | null
          settled_reason?: string | null
          stake_cents: number
          started_at?: string
          status?: Database["public"]["Enums"]["trade_status"]
          strike_price_cents?: number | null
          token_id: string
          trade_period_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          direction?: Database["public"]["Enums"]["trade_direction"]
          end_time?: string
          entry_price_cents?: number
          id?: string
          metadata?: Json
          outcome?: Database["public"]["Enums"]["trade_outcome"] | null
          payout_bps?: number
          settled_at?: string | null
          settled_by?: string | null
          settled_reason?: string | null
          stake_cents?: number
          started_at?: string
          status?: Database["public"]["Enums"]["trade_status"]
          strike_price_cents?: number | null
          token_id?: string
          trade_period_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_trades_settled_by_fkey"
            columns: ["settled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_trades_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_trades_trade_period_id_fkey"
            columns: ["trade_period_id"]
            isOneToOne: false
            referencedRelation: "trade_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_trades_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      wallet_addresses: {
        Row: {
          address: string
          created_at: string
          id: string
          is_enabled: boolean
          memo: string | null
          min_deposit_cents: number
          network: string
          token_symbol: string
          updated_at: string
        }
        Insert: {
          address: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          memo?: string | null
          min_deposit_cents?: number
          network: string
          token_symbol: string
          updated_at?: string
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          memo?: string | null
          min_deposit_cents?: number
          network?: string
          token_symbol?: string
          updated_at?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          admin_note: string | null
          amount_cents: number
          created_at: string
          destination_address: string
          fee_cents: number
          flags: Database["public"]["Enums"]["withdrawal_flag"][]
          hold_tx_id: string | null
          id: string
          net_amount_cents: number
          network: string
          paid_at: string | null
          paid_by: string | null
          payout_tx_hash: string | null
          refund_tx_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["withdrawal_status"]
          token_symbol: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount_cents: number
          created_at?: string
          destination_address: string
          fee_cents?: number
          flags?: Database["public"]["Enums"]["withdrawal_flag"][]
          hold_tx_id?: string | null
          id?: string
          net_amount_cents: number
          network: string
          paid_at?: string | null
          paid_by?: string | null
          payout_tx_hash?: string | null
          refund_tx_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          token_symbol: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount_cents?: number
          created_at?: string
          destination_address?: string
          fee_cents?: number
          flags?: Database["public"]["Enums"]["withdrawal_flag"][]
          hold_tx_id?: string | null
          id?: string
          net_amount_cents?: number
          network?: string
          paid_at?: string | null
          paid_by?: string | null
          payout_tx_hash?: string | null
          refund_tx_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          token_symbol?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawals_hold_tx_id_fkey"
            columns: ["hold_tx_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawals_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "withdrawals_refund_tx_id_fkey"
            columns: ["refund_tx_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawals_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "withdrawals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_wager_progress: {
        Args: { p_stake_cents: number; p_user_id: string }
        Returns: undefined
      }
      approve_commission: {
        Args: { p_admin_id: string; p_commission_id: string; p_note?: string }
        Returns: {
          base_amount_cents: number
          beneficiary_user_id: string
          bps_applied: number
          commission_cents: number
          created_at: string
          deposit_id: string | null
          id: string
          level: number
          referee_user_id: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by_admin_id: string | null
          status: Database["public"]["Enums"]["commission_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "referral_commissions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      approve_deposit: {
        Args: { p_admin_user_id: string; p_deposit_id: string; p_note?: string }
        Returns: {
          admin_note: string | null
          amount_cents: number
          created_at: string
          id: string
          network: Database["public"]["Enums"]["deposit_network"]
          proof_path: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["deposit_status"]
          token_id: string
          tx_hash: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "deposits"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      approve_withdrawal: {
        Args: {
          p_admin_user_id: string
          p_note?: string
          p_withdrawal_id: string
        }
        Returns: {
          admin_note: string | null
          amount_cents: number
          created_at: string
          destination_address: string
          fee_cents: number
          flags: Database["public"]["Enums"]["withdrawal_flag"][]
          hold_tx_id: string | null
          id: string
          net_amount_cents: number
          network: string
          paid_at: string | null
          paid_by: string | null
          payout_tx_hash: string | null
          refund_tx_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["withdrawal_status"]
          token_symbol: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "withdrawals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      bind_referral: {
        Args: {
          p_code: string
          p_referee_user_id: string
          p_referrer_user_id: string
        }
        Returns: undefined
      }
      bulk_settle_trades: {
        Args: {
          p_admin_id: string
          p_outcome: Database["public"]["Enums"]["trade_outcome"]
          p_reason?: string
          p_trade_ids: string[]
        }
        Returns: {
          created_at: string
          direction: Database["public"]["Enums"]["trade_direction"]
          end_time: string
          entry_price_cents: number
          id: string
          metadata: Json
          outcome: Database["public"]["Enums"]["trade_outcome"] | null
          payout_bps: number
          settled_at: string | null
          settled_by: string | null
          settled_reason: string | null
          stake_cents: number
          started_at: string
          status: Database["public"]["Enums"]["trade_status"]
          strike_price_cents: number | null
          token_id: string
          trade_period_id: string
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "user_trades"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      can_read_market_token: { Args: { p_token_id: string }; Returns: boolean }
      cancel_withdrawal: {
        Args: { p_user_id: string; p_withdrawal_id: string }
        Returns: {
          admin_note: string | null
          amount_cents: number
          created_at: string
          destination_address: string
          fee_cents: number
          flags: Database["public"]["Enums"]["withdrawal_flag"][]
          hold_tx_id: string | null
          id: string
          net_amount_cents: number
          network: string
          paid_at: string | null
          paid_by: string | null
          payout_tx_hash: string | null
          refund_tx_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["withdrawal_status"]
          token_symbol: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "withdrawals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      check_referral_fraud: {
        Args: { p_ip?: unknown; p_user_id: string }
        Returns: undefined
      }
      consume_invite: {
        Args: {
          p_code: string
          p_ip?: unknown
          p_user_agent?: string
          p_user_id: string
        }
        Returns: {
          code: string
          owner_user_id: string
          source: Database["public"]["Enums"]["invitation_source"]
          status: Database["public"]["Enums"]["invitation_status"]
          used_count: number
        }[]
      }
      credit_bonus: {
        Args: {
          p_amount_cents: number
          p_kind: Database["public"]["Enums"]["bonus_ticket_kind"]
          p_note?: string
          p_reference_id?: string
          p_reference_type?: string
          p_user_id: string
        }
        Returns: {
          amount_cents: number
          created_at: string
          expires_at: string
          id: string
          kind: Database["public"]["Enums"]["bonus_ticket_kind"]
          note: string | null
          reference_id: string | null
          reference_type: string | null
          released_at: string | null
          status: Database["public"]["Enums"]["bonus_ticket_status"]
          updated_at: string
          user_id: string
          wager_progress_cents: number
          wager_required_cents: number
        }
        SetofOptions: {
          from: "*"
          to: "bonus_tickets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      expire_bonus_tickets: { Args: never; Returns: number }
      get_commission_bps: {
        Args: { p_level: number; p_user_id: string }
        Returns: number
      }
      is_admin: { Args: never; Returns: boolean }
      mark_withdrawal_paid: {
        Args: {
          p_admin_user_id: string
          p_tx_hash: string
          p_withdrawal_id: string
        }
        Returns: {
          admin_note: string | null
          amount_cents: number
          created_at: string
          destination_address: string
          fee_cents: number
          flags: Database["public"]["Enums"]["withdrawal_flag"][]
          hold_tx_id: string | null
          id: string
          net_amount_cents: number
          network: string
          paid_at: string | null
          paid_by: string | null
          payout_tx_hash: string | null
          refund_tx_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["withdrawal_status"]
          token_symbol: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "withdrawals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mint_invite_codes: {
        Args: { p_count: number; p_expires_at?: string; p_note?: string }
        Returns: {
          code: string
          expires_at: string
          note: string
        }[]
      }
      normalize_invite_code: { Args: { raw_code: string }; Returns: string }
      place_trade: {
        Args: {
          p_amount_cents: number
          p_direction: Database["public"]["Enums"]["trade_direction"]
          p_period_id: string
          p_token_id: string
          p_user_id: string
        }
        Returns: {
          created_at: string
          direction: Database["public"]["Enums"]["trade_direction"]
          end_time: string
          entry_price_cents: number
          id: string
          metadata: Json
          outcome: Database["public"]["Enums"]["trade_outcome"] | null
          payout_bps: number
          settled_at: string | null
          settled_by: string | null
          settled_reason: string | null
          stake_cents: number
          started_at: string
          status: Database["public"]["Enums"]["trade_status"]
          strike_price_cents: number | null
          token_id: string
          trade_period_id: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_trades"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_deposit_commissions: {
        Args: {
          p_amount_cents: number
          p_deposit_id: string
          p_referee_user_id: string
        }
        Returns: number
      }
      refresh_invitation_code_statuses: { Args: never; Returns: undefined }
      reject_commission: {
        Args: { p_admin_id: string; p_commission_id: string; p_note?: string }
        Returns: {
          base_amount_cents: number
          beneficiary_user_id: string
          bps_applied: number
          commission_cents: number
          created_at: string
          deposit_id: string | null
          id: string
          level: number
          referee_user_id: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by_admin_id: string | null
          status: Database["public"]["Enums"]["commission_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "referral_commissions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reject_deposit: {
        Args: { p_admin_user_id: string; p_deposit_id: string; p_note: string }
        Returns: {
          admin_note: string | null
          amount_cents: number
          created_at: string
          id: string
          network: Database["public"]["Enums"]["deposit_network"]
          proof_path: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["deposit_status"]
          token_id: string
          tx_hash: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "deposits"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reject_withdrawal: {
        Args: {
          p_admin_user_id: string
          p_note: string
          p_withdrawal_id: string
        }
        Returns: {
          admin_note: string | null
          amount_cents: number
          created_at: string
          destination_address: string
          fee_cents: number
          flags: Database["public"]["Enums"]["withdrawal_flag"][]
          hold_tx_id: string | null
          id: string
          net_amount_cents: number
          network: string
          paid_at: string | null
          paid_by: string | null
          payout_tx_hash: string | null
          refund_tx_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["withdrawal_status"]
          token_symbol: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "withdrawals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      request_withdrawal: {
        Args: {
          p_amount_cents: number
          p_destination_address: string
          p_network: string
          p_token_symbol: string
          p_user_id: string
        }
        Returns: {
          admin_note: string | null
          amount_cents: number
          created_at: string
          destination_address: string
          fee_cents: number
          flags: Database["public"]["Enums"]["withdrawal_flag"][]
          hold_tx_id: string | null
          id: string
          net_amount_cents: number
          network: string
          paid_at: string | null
          paid_by: string | null
          payout_tx_hash: string | null
          refund_tx_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["withdrawal_status"]
          token_symbol: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "withdrawals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      revoke_invite: {
        Args: { p_code: string }
        Returns: {
          code: string
          revoked_at: string
          status: Database["public"]["Enums"]["invitation_status"]
        }[]
      }
      settle_trade: {
        Args: {
          p_admin_id: string
          p_outcome: Database["public"]["Enums"]["trade_outcome"]
          p_reason?: string
          p_trade_id: string
        }
        Returns: {
          created_at: string
          direction: Database["public"]["Enums"]["trade_direction"]
          end_time: string
          entry_price_cents: number
          id: string
          metadata: Json
          outcome: Database["public"]["Enums"]["trade_outcome"] | null
          payout_bps: number
          settled_at: string | null
          settled_by: string | null
          settled_reason: string | null
          stake_cents: number
          started_at: string
          status: Database["public"]["Enums"]["trade_status"]
          strike_price_cents: number | null
          token_id: string
          trade_period_id: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_trades"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      storage_first_folder: { Args: { path: string }; Returns: string }
      submit_deposit: {
        Args: {
          p_amount_cents: number
          p_network: Database["public"]["Enums"]["deposit_network"]
          p_proof_path: string
          p_token_id: string
          p_tx_hash?: string
          p_user_id: string
        }
        Returns: {
          admin_note: string | null
          amount_cents: number
          created_at: string
          id: string
          network: Database["public"]["Enums"]["deposit_network"]
          proof_path: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["deposit_status"]
          token_id: string
          tx_hash: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "deposits"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      validate_invite: {
        Args: { p_code: string }
        Returns: {
          code: string
          expires_at: string
          is_single_use: boolean
          owner_user_id: string
          source: Database["public"]["Enums"]["invitation_source"]
          status: Database["public"]["Enums"]["invitation_status"]
          valid: boolean
        }[]
      }
    }
    Enums: {
      bonus_ticket_kind: "signup" | "commission" | "gift" | "admin"
      bonus_ticket_status: "locked" | "released" | "expired"
      commission_status: "pending" | "approved" | "rejected" | "clawed_back"
      deposit_network: "TRC20" | "ERC20" | "BEP20" | "BTC"
      deposit_status: "pending" | "approved" | "rejected"
      expiry_policy: "auto_lose" | "auto_win" | "void" | "leave_pending"
      invitation_source: "admin" | "user"
      invitation_status: "active" | "used" | "revoked" | "expired"
      referral_flag_kind:
        | "SAME_IP"
        | "VELOCITY"
        | "RAPID_CHAIN"
        | "SELF_REFERRAL_ATTEMPT"
        | "SUSPICIOUS_DEPOSIT"
      replay_status: "idle" | "running" | "paused" | "ended"
      token_feed_source: "synthetic" | "shadow" | "replay" | "frozen"
      trade_direction: "long" | "short"
      trade_outcome: "win" | "lose" | "void"
      trade_status: "active" | "settled" | "cancelled"
      user_role: "user" | "admin"
      withdrawal_flag:
        | "NEW_USER"
        | "LOW_TRADE_VOLUME"
        | "ADDRESS_REUSE"
        | "RAPID"
        | "POST_BONUS"
        | "FIRST_WITHDRAW"
      withdrawal_status:
        | "pending"
        | "approved"
        | "paid"
        | "rejected"
        | "cancelled"
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
    Enums: {
      bonus_ticket_kind: ["signup", "commission", "gift", "admin"],
      bonus_ticket_status: ["locked", "released", "expired"],
      commission_status: ["pending", "approved", "rejected", "clawed_back"],
      deposit_network: ["TRC20", "ERC20", "BEP20", "BTC"],
      deposit_status: ["pending", "approved", "rejected"],
      expiry_policy: ["auto_lose", "auto_win", "void", "leave_pending"],
      invitation_source: ["admin", "user"],
      invitation_status: ["active", "used", "revoked", "expired"],
      referral_flag_kind: [
        "SAME_IP",
        "VELOCITY",
        "RAPID_CHAIN",
        "SELF_REFERRAL_ATTEMPT",
        "SUSPICIOUS_DEPOSIT",
      ],
      replay_status: ["idle", "running", "paused", "ended"],
      token_feed_source: ["synthetic", "shadow", "replay", "frozen"],
      trade_direction: ["long", "short"],
      trade_outcome: ["win", "lose", "void"],
      trade_status: ["active", "settled", "cancelled"],
      user_role: ["user", "admin"],
      withdrawal_flag: [
        "NEW_USER",
        "LOW_TRADE_VOLUME",
        "ADDRESS_REUSE",
        "RAPID",
        "POST_BONUS",
        "FIRST_WITHDRAW",
      ],
      withdrawal_status: [
        "pending",
        "approved",
        "paid",
        "rejected",
        "cancelled",
      ],
    },
  },
} as const
