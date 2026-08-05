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
      ab_events: {
        Row: {
          created_at: string
          event_type: string
          experiment_id: string
          id: string
          metadata: Json | null
          variant_id: string
          visitor_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          experiment_id: string
          id?: string
          metadata?: Json | null
          variant_id: string
          visitor_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          experiment_id?: string
          id?: string
          metadata?: Json | null
          variant_id?: string
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ab_events_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "ab_experiment_results"
            referencedColumns: ["experiment_id"]
          },
          {
            foreignKeyName: "ab_events_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "ab_experiments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ab_events_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "ab_experiment_results"
            referencedColumns: ["variant_id"]
          },
          {
            foreignKeyName: "ab_events_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "ab_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      ab_experiments: {
        Row: {
          created_at: string
          description: string | null
          ended_at: string | null
          id: string
          name: string
          required_sample_size: number
          started_at: string | null
          status: string
          target_element: string
          updated_at: string
          winner_variant_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          ended_at?: string | null
          id?: string
          name: string
          required_sample_size?: number
          started_at?: string | null
          status?: string
          target_element: string
          updated_at?: string
          winner_variant_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          ended_at?: string | null
          id?: string
          name?: string
          required_sample_size?: number
          started_at?: string | null
          status?: string
          target_element?: string
          updated_at?: string
          winner_variant_id?: string | null
        }
        Relationships: []
      }
      ab_variants: {
        Row: {
          config: Json
          created_at: string
          experiment_id: string
          id: string
          is_control: boolean
          name: string
          variant_key: string
        }
        Insert: {
          config?: Json
          created_at?: string
          experiment_id: string
          id?: string
          is_control?: boolean
          name: string
          variant_key: string
        }
        Update: {
          config?: Json
          created_at?: string
          experiment_id?: string
          id?: string
          is_control?: boolean
          name?: string
          variant_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "ab_variants_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "ab_experiment_results"
            referencedColumns: ["experiment_id"]
          },
          {
            foreignKeyName: "ab_variants_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "ab_experiments"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          balance: number
          created_at: string
          currency: string
          deleted_at: string | null
          household_id: string
          id: string
          institution: string | null
          is_active: boolean
          last_synced_at: string | null
          name: string
          owner_tag: string | null
          provider_account_id: string | null
          provider_type: string | null
          updated_at: string
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"]
          balance?: number
          created_at?: string
          currency?: string
          deleted_at?: string | null
          household_id: string
          id?: string
          institution?: string | null
          is_active?: boolean
          last_synced_at?: string | null
          name: string
          owner_tag?: string | null
          provider_account_id?: string | null
          provider_type?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          balance?: number
          created_at?: string
          currency?: string
          deleted_at?: string | null
          household_id?: string
          id?: string
          institution?: string | null
          is_active?: boolean
          last_synced_at?: string | null
          name?: string
          owner_tag?: string | null
          provider_account_id?: string | null
          provider_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_financial_snapshots: {
        Row: {
          biweekly_payroll: number
          cash_reserves: number
          client_census: number
          created_at: string
          household_id: string
          id: string
          monthly_operating_expenses: number
          monthly_revenue: number
          notes: string | null
          snapshot_month: string
          updated_at: string
        }
        Insert: {
          biweekly_payroll?: number
          cash_reserves?: number
          client_census?: number
          created_at?: string
          household_id: string
          id?: string
          monthly_operating_expenses?: number
          monthly_revenue?: number
          notes?: string | null
          snapshot_month: string
          updated_at?: string
        }
        Update: {
          biweekly_payroll?: number
          cash_reserves?: number
          client_census?: number
          created_at?: string
          household_id?: string
          id?: string
          monthly_operating_expenses?: number
          monthly_revenue?: number
          notes?: string | null
          snapshot_month?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_financial_snapshots_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      annual_family_meetings: {
        Row: {
          agenda_md: string | null
          attendees: Json | null
          created_at: string
          decisions: Json | null
          household_id: string
          id: string
          meeting_date: string
          notes_md: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agenda_md?: string | null
          attendees?: Json | null
          created_at?: string
          decisions?: Json | null
          household_id: string
          id?: string
          meeting_date: string
          notes_md?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agenda_md?: string | null
          attendees?: Json | null
          created_at?: string
          decisions?: Json | null
          household_id?: string
          id?: string
          meeting_date?: string
          notes_md?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      app_dev_credit_log: {
        Row: {
          created_at: string
          created_by: string
          credits_used: number
          date: string
          deleted_at: string | null
          household_id: string
          id: string
          note: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string
          credits_used: number
          date?: string
          deleted_at?: string | null
          household_id: string
          id?: string
          note?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          credits_used?: number
          date?: string
          deleted_at?: string | null
          household_id?: string
          id?: string
          note?: string | null
        }
        Relationships: []
      }
      app_dev_limits: {
        Row: {
          created_at: string
          household_id: string
          id: string
          is_enabled: boolean
          monthly_credit_limit: number
          monthly_spend_limit: number
          period_start: string
          tracked_category_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          is_enabled?: boolean
          monthly_credit_limit?: number
          monthly_spend_limit?: number
          period_start?: string
          tracked_category_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          is_enabled?: boolean
          monthly_credit_limit?: number
          monthly_spend_limit?: number
          period_start?: string
          tracked_category_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      app_dev_overrides: {
        Row: {
          approved_by: string | null
          created_at: string
          expires_at: string
          household_id: string
          id: string
          reason: string
          requested_by: string
          status: string
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          expires_at?: string
          household_id: string
          id?: string
          reason: string
          requested_by?: string
          status?: string
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          expires_at?: string
          household_id?: string
          id?: string
          reason?: string
          requested_by?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_dev_pool_log: {
        Row: {
          amount_usd: number
          app_name: string
          created_at: string
          credits_used: number
          date: string
          deleted_at: string | null
          founder_email: string
          id: string
          note: string | null
          source: string
        }
        Insert: {
          amount_usd?: number
          app_name: string
          created_at?: string
          credits_used?: number
          date?: string
          deleted_at?: string | null
          founder_email: string
          id?: string
          note?: string | null
          source?: string
        }
        Update: {
          amount_usd?: number
          app_name?: string
          created_at?: string
          credits_used?: number
          date?: string
          deleted_at?: string | null
          founder_email?: string
          id?: string
          note?: string | null
          source?: string
        }
        Relationships: []
      }
      app_dev_pool_overrides: {
        Row: {
          created_at: string
          expires_at: string
          founder_email: string
          id: string
          reason: string
          status: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          founder_email: string
          id?: string
          reason: string
          status?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          founder_email?: string
          id?: string
          reason?: string
          status?: string
        }
        Relationships: []
      }
      app_dev_pool_settings: {
        Row: {
          created_at: string
          founder_email: string
          id: string
          is_enabled: boolean
          monthly_credit_limit: number
          monthly_spend_limit: number
          period_start: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          founder_email: string
          id?: string
          is_enabled?: boolean
          monthly_credit_limit?: number
          monthly_spend_limit?: number
          period_start?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          founder_email?: string
          id?: string
          is_enabled?: boolean
          monthly_credit_limit?: number
          monthly_spend_limit?: number
          period_start?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          household_id: string | null
          id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          household_id?: string | null
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          household_id?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_split_rules: {
        Row: {
          amount_max: number | null
          amount_min: number | null
          business_category_id: string | null
          business_profile_id: string | null
          business_split_pct: number
          created_at: string
          date_range_end: string | null
          date_range_start: string | null
          household_id: string
          id: string
          is_active: boolean
          last_run_at: string | null
          last_run_match_count: number
          match_type: string
          match_value: string
          name: string
          notes: string | null
          personal_category_id: string | null
          priority: number
          updated_at: string
        }
        Insert: {
          amount_max?: number | null
          amount_min?: number | null
          business_category_id?: string | null
          business_profile_id?: string | null
          business_split_pct?: number
          created_at?: string
          date_range_end?: string | null
          date_range_start?: string | null
          household_id: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          last_run_match_count?: number
          match_type: string
          match_value: string
          name: string
          notes?: string | null
          personal_category_id?: string | null
          priority?: number
          updated_at?: string
        }
        Update: {
          amount_max?: number | null
          amount_min?: number | null
          business_category_id?: string | null
          business_profile_id?: string | null
          business_split_pct?: number
          created_at?: string
          date_range_end?: string | null
          date_range_start?: string | null
          household_id?: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          last_run_match_count?: number
          match_type?: string
          match_value?: string
          name?: string
          notes?: string | null
          personal_category_id?: string | null
          priority?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "auto_split_rules_business_category_id_fkey"
            columns: ["business_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_split_rules_business_profile_id_fkey"
            columns: ["business_profile_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_split_rules_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_split_rules_personal_category_id_fkey"
            columns: ["personal_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          category_id: string
          created_at: string
          household_id: string
          id: string
          month: string
          planned_amount: number
          rollover: boolean
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          household_id: string
          id?: string
          month: string
          planned_amount?: number
          rollover?: boolean
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          household_id?: string
          id?: string
          month?: string
          planned_amount?: number
          rollover?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      business_credit_steps: {
        Row: {
          completed_at: string | null
          created_at: string
          household_id: string
          id: string
          is_completed: boolean
          notes: string | null
          step_key: string
          step_label: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          household_id: string
          id?: string
          is_completed?: boolean
          notes?: string | null
          step_key: string
          step_label: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          household_id?: string
          id?: string
          is_completed?: boolean
          notes?: string | null
          step_key?: string
          step_label?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_credit_steps_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      business_profiles: {
        Row: {
          address: string | null
          business_name: string
          city: string | null
          created_at: string
          ein: string | null
          email: string | null
          entity_type: string
          fiscal_year_end: string | null
          household_id: string
          id: string
          industry: string | null
          is_active: boolean
          notes: string | null
          phone: string | null
          state: string | null
          updated_at: string
          website: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          business_name: string
          city?: string | null
          created_at?: string
          ein?: string | null
          email?: string | null
          entity_type?: string
          fiscal_year_end?: string | null
          household_id: string
          id?: string
          industry?: string | null
          is_active?: boolean
          notes?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
          website?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          business_name?: string
          city?: string | null
          created_at?: string
          ein?: string | null
          email?: string | null
          entity_type?: string
          fiscal_year_end?: string | null
          household_id?: string
          id?: string
          industry?: string | null
          is_active?: boolean
          notes?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
          website?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_profiles_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      calculator_snapshots: {
        Row: {
          calculator_type: string
          created_at: string
          household_id: string
          id: string
          inputs: Json
          label: string
          results: Json
        }
        Insert: {
          calculator_type: string
          created_at?: string
          household_id: string
          id?: string
          inputs?: Json
          label?: string
          results?: Json
        }
        Update: {
          calculator_type?: string
          created_at?: string
          household_id?: string
          id?: string
          inputs?: Json
          label?: string
          results?: Json
        }
        Relationships: [
          {
            foreignKeyName: "calculator_snapshots_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string
          created_at: string
          default_account_id: string | null
          group_id: string
          household_id: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          color?: string
          created_at?: string
          default_account_id?: string | null
          group_id: string
          household_id: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          color?: string
          created_at?: string
          default_account_id?: string | null
          group_id?: string
          household_id?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "categories_default_account_id_fkey"
            columns: ["default_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "category_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      categorization_rules: {
        Row: {
          category_id: string
          created_at: string
          household_id: string
          id: string
          is_ai_generated: boolean
          match_count: number
          merchant_pattern: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          household_id: string
          id?: string
          is_ai_generated?: boolean
          match_count?: number
          merchant_pattern: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          household_id?: string
          id?: string
          is_ai_generated?: boolean
          match_count?: number
          merchant_pattern?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categorization_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categorization_rules_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      category_groups: {
        Row: {
          budget_type: string
          business_profile_id: string | null
          color: string
          created_at: string
          expense_type: string
          household_id: string
          id: string
          name: string
          sort_order: number
          target_percent_max: number | null
          target_percent_min: number | null
        }
        Insert: {
          budget_type?: string
          business_profile_id?: string | null
          color?: string
          created_at?: string
          expense_type?: string
          household_id: string
          id?: string
          name: string
          sort_order?: number
          target_percent_max?: number | null
          target_percent_min?: number | null
        }
        Update: {
          budget_type?: string
          business_profile_id?: string | null
          color?: string
          created_at?: string
          expense_type?: string
          household_id?: string
          id?: string
          name?: string
          sort_order?: number
          target_percent_max?: number | null
          target_percent_min?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "category_groups_business_profile_id_fkey"
            columns: ["business_profile_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_groups_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      cfpb_complaints: {
        Row: {
          attachments: Json | null
          cfpb_case_number: string | null
          company_name: string
          company_response: string | null
          company_response_date: string | null
          consumer_disputed_response: boolean | null
          created_at: string
          desired_resolution: string | null
          household_id: string
          id: string
          issue: string
          narrative: string
          product: string
          related_dispute_id: string | null
          status: string
          submitted_date: string | null
          updated_at: string
        }
        Insert: {
          attachments?: Json | null
          cfpb_case_number?: string | null
          company_name: string
          company_response?: string | null
          company_response_date?: string | null
          consumer_disputed_response?: boolean | null
          created_at?: string
          desired_resolution?: string | null
          household_id: string
          id?: string
          issue: string
          narrative: string
          product: string
          related_dispute_id?: string | null
          status?: string
          submitted_date?: string | null
          updated_at?: string
        }
        Update: {
          attachments?: Json | null
          cfpb_case_number?: string | null
          company_name?: string
          company_response?: string | null
          company_response_date?: string | null
          consumer_disputed_response?: boolean | null
          created_at?: string
          desired_resolution?: string | null
          household_id?: string
          id?: string
          issue?: string
          narrative?: string
          product?: string
          related_dispute_id?: string | null
          status?: string
          submitted_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cfpb_complaints_related_dispute_id_fkey"
            columns: ["related_dispute_id"]
            isOneToOne: false
            referencedRelation: "credit_disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_plans: {
        Row: {
          answers: Json
          created_at: string
          current_step: number
          generated_at: string | null
          generated_plan: Json | null
          household_id: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          current_step?: number
          generated_at?: string | null
          generated_plan?: Json | null
          household_id: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          current_step?: number
          generated_at?: string | null
          generated_plan?: Json | null
          household_id?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      credit_accounts: {
        Row: {
          account_name: string
          account_number: string | null
          account_status: string
          account_type: string
          balance: number
          bureau: string
          created_at: string
          credit_limit: number | null
          date_closed: string | null
          date_of_first_delinquency: string | null
          date_opened: string | null
          dispute_status: string | null
          due_day: number | null
          high_balance: number | null
          household_id: string
          id: string
          monthly_payment: number | null
          notes: string | null
          payment_history: string | null
          reaging_notes: string | null
          reaging_suspected: boolean | null
          remarks_codes: string | null
          reported_first_delinquency: string | null
          responsibility: string | null
          statement_close_day: number | null
          terms: string | null
          updated_at: string
        }
        Insert: {
          account_name: string
          account_number?: string | null
          account_status?: string
          account_type?: string
          balance?: number
          bureau?: string
          created_at?: string
          credit_limit?: number | null
          date_closed?: string | null
          date_of_first_delinquency?: string | null
          date_opened?: string | null
          dispute_status?: string | null
          due_day?: number | null
          high_balance?: number | null
          household_id: string
          id?: string
          monthly_payment?: number | null
          notes?: string | null
          payment_history?: string | null
          reaging_notes?: string | null
          reaging_suspected?: boolean | null
          remarks_codes?: string | null
          reported_first_delinquency?: string | null
          responsibility?: string | null
          statement_close_day?: number | null
          terms?: string | null
          updated_at?: string
        }
        Update: {
          account_name?: string
          account_number?: string | null
          account_status?: string
          account_type?: string
          balance?: number
          bureau?: string
          created_at?: string
          credit_limit?: number | null
          date_closed?: string | null
          date_of_first_delinquency?: string | null
          date_opened?: string | null
          dispute_status?: string | null
          due_day?: number | null
          high_balance?: number | null
          household_id?: string
          id?: string
          monthly_payment?: number | null
          notes?: string | null
          payment_history?: string | null
          reaging_notes?: string | null
          reaging_suspected?: boolean | null
          remarks_codes?: string | null
          reported_first_delinquency?: string | null
          responsibility?: string | null
          statement_close_day?: number | null
          terms?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_accounts_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_disputes: {
        Row: {
          bureau: string
          certified_carrier: string | null
          certified_cost: number | null
          certified_delivered_date: string | null
          certified_mailed_date: string | null
          certified_notes: string | null
          certified_tracking_number: string | null
          created_at: string
          credit_account_id: string | null
          dispute_reason: string
          draft_letter_body: string | null
          draft_letter_subject: string | null
          escalation_channel: string
          explanation: string | null
          household_id: string
          id: string
          label_purchase_id: string | null
          label_rate: number | null
          label_url: string | null
          metro2_violation: string | null
          next_action_date: string | null
          next_action_type: string | null
          outcome: string | null
          outcome_notes: string | null
          parent_dispute_id: string | null
          response_due_date: string | null
          response_received_date: string | null
          round: number
          status: string
          submitted_date: string | null
          updated_at: string
        }
        Insert: {
          bureau: string
          certified_carrier?: string | null
          certified_cost?: number | null
          certified_delivered_date?: string | null
          certified_mailed_date?: string | null
          certified_notes?: string | null
          certified_tracking_number?: string | null
          created_at?: string
          credit_account_id?: string | null
          dispute_reason: string
          draft_letter_body?: string | null
          draft_letter_subject?: string | null
          escalation_channel?: string
          explanation?: string | null
          household_id: string
          id?: string
          label_purchase_id?: string | null
          label_rate?: number | null
          label_url?: string | null
          metro2_violation?: string | null
          next_action_date?: string | null
          next_action_type?: string | null
          outcome?: string | null
          outcome_notes?: string | null
          parent_dispute_id?: string | null
          response_due_date?: string | null
          response_received_date?: string | null
          round?: number
          status?: string
          submitted_date?: string | null
          updated_at?: string
        }
        Update: {
          bureau?: string
          certified_carrier?: string | null
          certified_cost?: number | null
          certified_delivered_date?: string | null
          certified_mailed_date?: string | null
          certified_notes?: string | null
          certified_tracking_number?: string | null
          created_at?: string
          credit_account_id?: string | null
          dispute_reason?: string
          draft_letter_body?: string | null
          draft_letter_subject?: string | null
          escalation_channel?: string
          explanation?: string | null
          household_id?: string
          id?: string
          label_purchase_id?: string | null
          label_rate?: number | null
          label_url?: string | null
          metro2_violation?: string | null
          next_action_date?: string | null
          next_action_type?: string | null
          outcome?: string | null
          outcome_notes?: string | null
          parent_dispute_id?: string | null
          response_due_date?: string | null
          response_received_date?: string | null
          round?: number
          status?: string
          submitted_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_disputes_credit_account_id_fkey"
            columns: ["credit_account_id"]
            isOneToOne: false
            referencedRelation: "credit_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_disputes_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_disputes_parent_dispute_id_fkey"
            columns: ["parent_dispute_id"]
            isOneToOne: false
            referencedRelation: "credit_disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_documents: {
        Row: {
          bureau: string | null
          created_at: string
          dispute_id: string | null
          document_type: string
          file_name: string
          file_size: number | null
          household_id: string
          id: string
          notes: string | null
          storage_path: string
        }
        Insert: {
          bureau?: string | null
          created_at?: string
          dispute_id?: string | null
          document_type?: string
          file_name: string
          file_size?: number | null
          household_id: string
          id?: string
          notes?: string | null
          storage_path: string
        }
        Update: {
          bureau?: string | null
          created_at?: string
          dispute_id?: string | null
          document_type?: string
          file_name?: string
          file_size?: number | null
          household_id?: string
          id?: string
          notes?: string | null
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_documents_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "credit_disputes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_documents_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_inquiries: {
        Row: {
          bureau: string
          created_at: string
          creditor_name: string
          dispute_outcome: string | null
          dispute_status: string
          dispute_submitted_date: string | null
          household_id: string
          id: string
          inquiry_date: string
          inquiry_type: string
          is_authorized: boolean | null
          notes: string | null
          updated_at: string
        }
        Insert: {
          bureau: string
          created_at?: string
          creditor_name: string
          dispute_outcome?: string | null
          dispute_status?: string
          dispute_submitted_date?: string | null
          household_id: string
          id?: string
          inquiry_date: string
          inquiry_type?: string
          is_authorized?: boolean | null
          notes?: string | null
          updated_at?: string
        }
        Update: {
          bureau?: string
          created_at?: string
          creditor_name?: string
          dispute_outcome?: string | null
          dispute_status?: string
          dispute_submitted_date?: string | null
          household_id?: string
          id?: string
          inquiry_date?: string
          inquiry_type?: string
          is_authorized?: boolean | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      daily_progress: {
        Row: {
          actual_spent: number
          created_at: string
          date: string
          household_id: string
          id: string
          mode: string
          safe_to_spend: number
          within_budget: boolean
        }
        Insert: {
          actual_spent?: number
          created_at?: string
          date: string
          household_id: string
          id?: string
          mode?: string
          safe_to_spend?: number
          within_budget?: boolean
        }
        Update: {
          actual_spent?: number
          created_at?: string
          date?: string
          household_id?: string
          id?: string
          mode?: string
          safe_to_spend?: number
          within_budget?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "daily_progress_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      data_quality_issues: {
        Row: {
          created_at: string
          description: string | null
          detected_at: string
          household_id: string
          id: string
          issue_type: string
          payload: Json
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          detected_at?: string
          household_id: string
          id?: string
          issue_type: string
          payload?: Json
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          detected_at?: string
          household_id?: string
          id?: string
          issue_type?: string
          payload?: Json
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_quality_issues_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      debt_items: {
        Row: {
          account_id: string | null
          balance: number
          business_name: string | null
          business_split_pct: number
          created_at: string
          deferred_until: string | null
          due_date: string | null
          due_day: number | null
          forgiveness_date: string | null
          forgiveness_eligible: boolean
          forgiveness_note: string | null
          id: string
          in_settlement_plan: boolean
          interest_rate: number
          minimum_payment: number
          name: string
          plan_id: string
          sort_order: number
          target_payoff_date: string | null
        }
        Insert: {
          account_id?: string | null
          balance?: number
          business_name?: string | null
          business_split_pct?: number
          created_at?: string
          deferred_until?: string | null
          due_date?: string | null
          due_day?: number | null
          forgiveness_date?: string | null
          forgiveness_eligible?: boolean
          forgiveness_note?: string | null
          id?: string
          in_settlement_plan?: boolean
          interest_rate?: number
          minimum_payment?: number
          name: string
          plan_id: string
          sort_order?: number
          target_payoff_date?: string | null
        }
        Update: {
          account_id?: string | null
          balance?: number
          business_name?: string | null
          business_split_pct?: number
          created_at?: string
          deferred_until?: string | null
          due_date?: string | null
          due_day?: number | null
          forgiveness_date?: string | null
          forgiveness_eligible?: boolean
          forgiveness_note?: string | null
          id?: string
          in_settlement_plan?: boolean
          interest_rate?: number
          minimum_payment?: number
          name?: string
          plan_id?: string
          sort_order?: number
          target_payoff_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "debt_items_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debt_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "debt_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      debt_plans: {
        Row: {
          created_at: string
          extra_payment: number
          household_id: string
          id: string
          is_active: boolean
          name: string
          strategy: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          extra_payment?: number
          household_id: string
          id?: string
          is_active?: boolean
          name?: string
          strategy?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          extra_payment?: number
          household_id?: string
          id?: string
          is_active?: boolean
          name?: string
          strategy?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "debt_plans_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      debt_validation_requests: {
        Row: {
          account_reference: string | null
          amount_claimed: number | null
          collector_name: string
          created_at: string
          credit_account_id: string | null
          dv_letter_sent_date: string | null
          dv_response_deadline: string | null
          first_contact_date: string | null
          household_id: string
          id: string
          notes: string | null
          original_creditor: string | null
          response_received_date: string | null
          response_type: string | null
          sol_state: string | null
          sol_years: number | null
          status: string
          statute_of_limitations_date: string | null
          updated_at: string
          validated: boolean | null
        }
        Insert: {
          account_reference?: string | null
          amount_claimed?: number | null
          collector_name: string
          created_at?: string
          credit_account_id?: string | null
          dv_letter_sent_date?: string | null
          dv_response_deadline?: string | null
          first_contact_date?: string | null
          household_id: string
          id?: string
          notes?: string | null
          original_creditor?: string | null
          response_received_date?: string | null
          response_type?: string | null
          sol_state?: string | null
          sol_years?: number | null
          status?: string
          statute_of_limitations_date?: string | null
          updated_at?: string
          validated?: boolean | null
        }
        Update: {
          account_reference?: string | null
          amount_claimed?: number | null
          collector_name?: string
          created_at?: string
          credit_account_id?: string | null
          dv_letter_sent_date?: string | null
          dv_response_deadline?: string | null
          first_contact_date?: string | null
          household_id?: string
          id?: string
          notes?: string | null
          original_creditor?: string | null
          response_received_date?: string | null
          response_type?: string | null
          sol_state?: string | null
          sol_years?: number | null
          status?: string
          statute_of_limitations_date?: string | null
          updated_at?: string
          validated?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "debt_validation_requests_credit_account_id_fkey"
            columns: ["credit_account_id"]
            isOneToOne: false
            referencedRelation: "credit_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_assets: {
        Row: {
          asset_type: string
          beneficiary: string | null
          created_at: string
          has_2fa: boolean
          household_id: string
          id: string
          name: string
          provider: string | null
          recovery_notes: string | null
          updated_at: string
          username: string | null
          vault_location: string | null
        }
        Insert: {
          asset_type?: string
          beneficiary?: string | null
          created_at?: string
          has_2fa?: boolean
          household_id: string
          id?: string
          name: string
          provider?: string | null
          recovery_notes?: string | null
          updated_at?: string
          username?: string | null
          vault_location?: string | null
        }
        Update: {
          asset_type?: string
          beneficiary?: string | null
          created_at?: string
          has_2fa?: boolean
          household_id?: string
          id?: string
          name?: string
          provider?: string | null
          recovery_notes?: string | null
          updated_at?: string
          username?: string | null
          vault_location?: string | null
        }
        Relationships: []
      }
      dispute_escalation_log: {
        Row: {
          action: string
          channel: string
          created_at: string
          dispute_id: string
          document_url: string | null
          household_id: string
          id: string
          notes: string | null
          outcome: string | null
          response_date: string | null
          round: number
          sent_date: string | null
          updated_at: string
        }
        Insert: {
          action: string
          channel?: string
          created_at?: string
          dispute_id: string
          document_url?: string | null
          household_id: string
          id?: string
          notes?: string | null
          outcome?: string | null
          response_date?: string | null
          round: number
          sent_date?: string | null
          updated_at?: string
        }
        Update: {
          action?: string
          channel?: string
          created_at?: string
          dispute_id?: string
          document_url?: string | null
          household_id?: string
          id?: string
          notes?: string | null
          outcome?: string | null
          response_date?: string | null
          round?: number
          sent_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispute_escalation_log_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "credit_disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      estate_planning_checklist: {
        Row: {
          completed_at: string | null
          created_at: string
          document_url: string | null
          household_id: string
          id: string
          is_complete: boolean
          item_key: string
          next_review_date: string | null
          notes: string | null
          professional_name: string | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          document_url?: string | null
          household_id: string
          id?: string
          is_complete?: boolean
          item_key: string
          next_review_date?: string | null
          notes?: string | null
          professional_name?: string | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          document_url?: string | null
          household_id?: string
          id?: string
          is_complete?: boolean
          item_key?: string
          next_review_date?: string | null
          notes?: string | null
          professional_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estate_planning_checklist_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      ethical_wills: {
        Row: {
          blessings_md: string | null
          created_at: string
          household_id: string
          id: string
          lessons_md: string | null
          updated_at: string
          user_id: string
          values_md: string | null
          wisdom_md: string | null
        }
        Insert: {
          blessings_md?: string | null
          created_at?: string
          household_id: string
          id?: string
          lessons_md?: string | null
          updated_at?: string
          user_id: string
          values_md?: string | null
          wisdom_md?: string | null
        }
        Update: {
          blessings_md?: string | null
          created_at?: string
          household_id?: string
          id?: string
          lessons_md?: string | null
          updated_at?: string
          user_id?: string
          values_md?: string | null
          wisdom_md?: string | null
        }
        Relationships: []
      }
      family_beneficiaries: {
        Row: {
          allocation_pct: number | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          date_of_birth: string | null
          deleted_at: string | null
          household_id: string
          id: string
          is_contingent: boolean
          linked_account_id: string | null
          name: string
          notes: string | null
          relationship: string | null
          updated_at: string
        }
        Insert: {
          allocation_pct?: number | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          date_of_birth?: string | null
          deleted_at?: string | null
          household_id: string
          id?: string
          is_contingent?: boolean
          linked_account_id?: string | null
          name: string
          notes?: string | null
          relationship?: string | null
          updated_at?: string
        }
        Update: {
          allocation_pct?: number | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          date_of_birth?: string | null
          deleted_at?: string | null
          household_id?: string
          id?: string
          is_contingent?: boolean
          linked_account_id?: string | null
          name?: string
          notes?: string | null
          relationship?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_beneficiaries_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      family_cfo_reports: {
        Row: {
          cash_flow: number | null
          created_at: string
          debt_reduction: number | null
          emailed_at: string | null
          household_id: string
          id: string
          investment_growth: number | null
          legacy_worth: number | null
          legacy_worth_delta: number | null
          net_worth: number | null
          report_month: string
          sections: Json
        }
        Insert: {
          cash_flow?: number | null
          created_at?: string
          debt_reduction?: number | null
          emailed_at?: string | null
          household_id: string
          id?: string
          investment_growth?: number | null
          legacy_worth?: number | null
          legacy_worth_delta?: number | null
          net_worth?: number | null
          report_month: string
          sections?: Json
        }
        Update: {
          cash_flow?: number | null
          created_at?: string
          debt_reduction?: number | null
          emailed_at?: string | null
          household_id?: string
          id?: string
          investment_growth?: number | null
          legacy_worth?: number | null
          legacy_worth_delta?: number | null
          net_worth?: number | null
          report_month?: string
          sections?: Json
        }
        Relationships: [
          {
            foreignKeyName: "family_cfo_reports_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      family_constitutions: {
        Row: {
          created_at: string
          deleted_at: string | null
          family_name: string
          household_id: string
          id: string
          is_published: boolean
          published_at: string | null
          sections: Json
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          family_name?: string
          household_id: string
          id?: string
          is_published?: boolean
          published_at?: string | null
          sections?: Json
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          family_name?: string
          household_id?: string
          id?: string
          is_published?: boolean
          published_at?: string | null
          sections?: Json
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "family_constitutions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      family_legacy_trusts: {
        Row: {
          annual_contribution: number | null
          created_at: string
          current_assets: number | null
          deleted_at: string | null
          funding_target: number | null
          household_id: string
          id: string
          life_insurance_funding: number | null
          name: string
          notes: string | null
          readiness_score: number | null
          successor_trustee: string | null
          trust_type: string | null
          trustee: string | null
          updated_at: string
        }
        Insert: {
          annual_contribution?: number | null
          created_at?: string
          current_assets?: number | null
          deleted_at?: string | null
          funding_target?: number | null
          household_id: string
          id?: string
          life_insurance_funding?: number | null
          name?: string
          notes?: string | null
          readiness_score?: number | null
          successor_trustee?: string | null
          trust_type?: string | null
          trustee?: string | null
          updated_at?: string
        }
        Update: {
          annual_contribution?: number | null
          created_at?: string
          current_assets?: number | null
          deleted_at?: string | null
          funding_target?: number | null
          household_id?: string
          id?: string
          life_insurance_funding?: number | null
          name?: string
          notes?: string | null
          readiness_score?: number | null
          successor_trustee?: string | null
          trust_type?: string | null
          trustee?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_legacy_trusts_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      family_wealth_events: {
        Row: {
          amount: number | null
          created_at: string
          deleted_at: string | null
          description: string | null
          event_date: string
          event_type: string
          generation: number | null
          household_id: string
          id: string
          is_projected: boolean
          title: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          event_date: string
          event_type: string
          generation?: number | null
          household_id: string
          id?: string
          is_projected?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          event_date?: string
          event_type?: string
          generation?: number | null
          household_id?: string
          id?: string
          is_projected?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_wealth_events_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_goals: {
        Row: {
          color: string | null
          created_at: string
          current_amount: number
          goal_type: string
          household_id: string
          icon: string | null
          id: string
          is_completed: boolean
          name: string
          notes: string | null
          target_amount: number
          target_date: string | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          current_amount?: number
          goal_type?: string
          household_id: string
          icon?: string | null
          id?: string
          is_completed?: boolean
          name: string
          notes?: string | null
          target_amount?: number
          target_date?: string | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          current_amount?: number
          goal_type?: string
          household_id?: string
          icon?: string | null
          id?: string
          is_completed?: boolean
          name?: string
          notes?: string | null
          target_amount?: number
          target_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_goals_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_insights: {
        Row: {
          created_at: string
          household_id: string
          id: string
          insight_type: string
          is_read: boolean
          message: string
          metadata: Json | null
          severity: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          insight_type?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          severity?: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          insight_type?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_insights_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_mode_settings: {
        Row: {
          buffer_last_computed_at: string | null
          buffer_mode: string
          buffer_percent: number
          buffer_triggers: Json
          created_at: string
          current_mode: string
          greenlight_unlocked: boolean
          household_id: string
          id: string
          updated_at: string
        }
        Insert: {
          buffer_last_computed_at?: string | null
          buffer_mode?: string
          buffer_percent?: number
          buffer_triggers?: Json
          created_at?: string
          current_mode?: string
          greenlight_unlocked?: boolean
          household_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          buffer_last_computed_at?: string | null
          buffer_mode?: string
          buffer_percent?: number
          buffer_triggers?: Json
          created_at?: string
          current_mode?: string
          greenlight_unlocked?: boolean
          household_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_mode_settings_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: true
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      funding_scenarios: {
        Row: {
          amount: number
          created_at: string
          household_id: string
          id: string
          interest_rate: number
          monthly_payment: number
          name: string
          notes: string | null
          parameters: Json | null
          scenario_type: string
          term_months: number
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          household_id: string
          id?: string
          interest_rate?: number
          monthly_payment?: number
          name: string
          notes?: string | null
          parameters?: Json | null
          scenario_type?: string
          term_months?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          household_id?: string
          id?: string
          interest_rate?: number
          monthly_payment?: number
          name?: string
          notes?: string | null
          parameters?: Json | null
          scenario_type?: string
          term_months?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "funding_scenarios_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      goodwill_campaigns: {
        Row: {
          attempt_number: number
          campaign_type: string
          contact_email: string | null
          contact_method: string | null
          created_at: string
          credit_account_id: string | null
          creditor_name: string
          executive_name: string | null
          executive_title: string | null
          followup_due_date: string | null
          household_id: string
          id: string
          notes: string | null
          offer_amount: number | null
          response_date: string | null
          response_notes: string | null
          response_type: string | null
          sent_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempt_number?: number
          campaign_type?: string
          contact_email?: string | null
          contact_method?: string | null
          created_at?: string
          credit_account_id?: string | null
          creditor_name: string
          executive_name?: string | null
          executive_title?: string | null
          followup_due_date?: string | null
          household_id: string
          id?: string
          notes?: string | null
          offer_amount?: number | null
          response_date?: string | null
          response_notes?: string | null
          response_type?: string | null
          sent_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempt_number?: number
          campaign_type?: string
          contact_email?: string | null
          contact_method?: string | null
          created_at?: string
          credit_account_id?: string | null
          creditor_name?: string
          executive_name?: string | null
          executive_title?: string | null
          followup_due_date?: string | null
          household_id?: string
          id?: string
          notes?: string | null
          offer_amount?: number | null
          response_date?: string | null
          response_notes?: string | null
          response_type?: string | null
          sent_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goodwill_campaigns_credit_account_id_fkey"
            columns: ["credit_account_id"]
            isOneToOne: false
            referencedRelation: "credit_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      guardrail_category_limits: {
        Row: {
          category_id: string
          created_at: string
          guardrail_id: string
          id: string
          weekly_limit: number
        }
        Insert: {
          category_id: string
          created_at?: string
          guardrail_id: string
          id?: string
          weekly_limit?: number
        }
        Update: {
          category_id?: string
          created_at?: string
          guardrail_id?: string
          id?: string
          weekly_limit?: number
        }
        Relationships: [
          {
            foreignKeyName: "guardrail_category_limits_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardrail_category_limits_guardrail_id_fkey"
            columns: ["guardrail_id"]
            isOneToOne: false
            referencedRelation: "guardrail_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      guardrail_pending_purchases: {
        Row: {
          amount: number
          created_at: string
          description: string
          expires_at: string
          household_id: string
          id: string
          multi_use_score: number | null
          resolved_at: string | null
          status: string
        }
        Insert: {
          amount?: number
          created_at?: string
          description?: string
          expires_at?: string
          household_id: string
          id?: string
          multi_use_score?: number | null
          resolved_at?: string | null
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          expires_at?: string
          household_id?: string
          id?: string
          multi_use_score?: number | null
          resolved_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "guardrail_pending_purchases_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      guardrail_settings: {
        Row: {
          cooling_off_hours: number
          cooling_off_threshold: number | null
          created_at: string
          daily_limit: number | null
          household_id: string
          id: string
          is_enabled: boolean
          multi_use_check_enabled: boolean
          updated_at: string
          weekly_limit: number | null
        }
        Insert: {
          cooling_off_hours?: number
          cooling_off_threshold?: number | null
          created_at?: string
          daily_limit?: number | null
          household_id: string
          id?: string
          is_enabled?: boolean
          multi_use_check_enabled?: boolean
          updated_at?: string
          weekly_limit?: number | null
        }
        Update: {
          cooling_off_hours?: number
          cooling_off_threshold?: number | null
          created_at?: string
          daily_limit?: number | null
          household_id?: string
          id?: string
          is_enabled?: boolean
          multi_use_check_enabled?: boolean
          updated_at?: string
          weekly_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "guardrail_settings_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: true
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      health_achievements: {
        Row: {
          badge_key: string
          created_at: string
          deleted_at: string | null
          earned_on: string
          household_id: string
          id: string
          label: string
          updated_at: string
        }
        Insert: {
          badge_key: string
          created_at?: string
          deleted_at?: string | null
          earned_on?: string
          household_id: string
          id?: string
          label: string
          updated_at?: string
        }
        Update: {
          badge_key?: string
          created_at?: string
          deleted_at?: string | null
          earned_on?: string
          household_id?: string
          id?: string
          label?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_achievements_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      health_coach_reports: {
        Row: {
          content: string
          created_at: string
          deleted_at: string | null
          household_id: string
          id: string
          metrics: Json | null
          period_label: string | null
          report_type: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          deleted_at?: string | null
          household_id: string
          id?: string
          metrics?: Json | null
          period_label?: string | null
          report_type?: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          household_id?: string
          id?: string
          metrics?: Json | null
          period_label?: string | null
          report_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_coach_reports_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      health_daily_logs: {
        Row: {
          active_minutes: number | null
          avoided_processed_carbs: boolean
          avoided_sugary_drinks: boolean
          created_at: string
          deleted_at: string | null
          energy_rating: number | null
          focus_rating: number | null
          fruit_servings: number
          household_id: string
          id: string
          log_date: string
          miles: number
          minutes_walked: number | null
          mood_rating: number | null
          notes: string | null
          protein_g: number
          revenue_amount: number | null
          sleep_hours: number | null
          steps: number | null
          stress_rating: number | null
          updated_at: string
          veg_servings: number
          water_oz: number
          weight: number | null
        }
        Insert: {
          active_minutes?: number | null
          avoided_processed_carbs?: boolean
          avoided_sugary_drinks?: boolean
          created_at?: string
          deleted_at?: string | null
          energy_rating?: number | null
          focus_rating?: number | null
          fruit_servings?: number
          household_id: string
          id?: string
          log_date?: string
          miles?: number
          minutes_walked?: number | null
          mood_rating?: number | null
          notes?: string | null
          protein_g?: number
          revenue_amount?: number | null
          sleep_hours?: number | null
          steps?: number | null
          stress_rating?: number | null
          updated_at?: string
          veg_servings?: number
          water_oz?: number
          weight?: number | null
        }
        Update: {
          active_minutes?: number | null
          avoided_processed_carbs?: boolean
          avoided_sugary_drinks?: boolean
          created_at?: string
          deleted_at?: string | null
          energy_rating?: number | null
          focus_rating?: number | null
          fruit_servings?: number
          household_id?: string
          id?: string
          log_date?: string
          miles?: number
          minutes_walked?: number | null
          mood_rating?: number | null
          notes?: string | null
          protein_g?: number
          revenue_amount?: number | null
          sleep_hours?: number | null
          steps?: number | null
          stress_rating?: number | null
          updated_at?: string
          veg_servings?: number
          water_oz?: number
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "health_daily_logs_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      health_meal_prep: {
        Row: {
          checklist: Json
          containers_packed: number
          created_at: string
          deleted_at: string | null
          grocery_cost: number | null
          household_id: string
          id: string
          meals_consumed: number
          notes: string | null
          prep_date: string
          shopping_list: Json
          updated_at: string
        }
        Insert: {
          checklist?: Json
          containers_packed?: number
          created_at?: string
          deleted_at?: string | null
          grocery_cost?: number | null
          household_id: string
          id?: string
          meals_consumed?: number
          notes?: string | null
          prep_date?: string
          shopping_list?: Json
          updated_at?: string
        }
        Update: {
          checklist?: Json
          containers_packed?: number
          created_at?: string
          deleted_at?: string | null
          grocery_cost?: number | null
          household_id?: string
          id?: string
          meals_consumed?: number
          notes?: string | null
          prep_date?: string
          shopping_list?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_meal_prep_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      health_meals: {
        Row: {
          calories: number | null
          carbs_g: number | null
          components: Json
          created_at: string
          deleted_at: string | null
          fat_g: number | null
          fiber_g: number | null
          household_id: string
          id: string
          is_template: boolean
          meal_date: string
          meal_type: string
          name: string | null
          protein_g: number | null
          updated_at: string
        }
        Insert: {
          calories?: number | null
          carbs_g?: number | null
          components?: Json
          created_at?: string
          deleted_at?: string | null
          fat_g?: number | null
          fiber_g?: number | null
          household_id: string
          id?: string
          is_template?: boolean
          meal_date?: string
          meal_type?: string
          name?: string | null
          protein_g?: number | null
          updated_at?: string
        }
        Update: {
          calories?: number | null
          carbs_g?: number | null
          components?: Json
          created_at?: string
          deleted_at?: string | null
          fat_g?: number | null
          fiber_g?: number | null
          household_id?: string
          id?: string
          is_template?: boolean
          meal_date?: string
          meal_type?: string
          name?: string | null
          protein_g?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_meals_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      health_medical_documents: {
        Row: {
          created_at: string
          deleted_at: string | null
          doc_type: string
          document_date: string | null
          file_name: string | null
          file_path: string
          file_size: number | null
          household_id: string
          id: string
          mime_type: string | null
          notes: string | null
          person: string | null
          preventive_care_id: string | null
          provider: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          doc_type?: string
          document_date?: string | null
          file_name?: string | null
          file_path: string
          file_size?: number | null
          household_id: string
          id?: string
          mime_type?: string | null
          notes?: string | null
          person?: string | null
          preventive_care_id?: string | null
          provider?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          doc_type?: string
          document_date?: string | null
          file_name?: string | null
          file_path?: string
          file_size?: number | null
          household_id?: string
          id?: string
          mime_type?: string | null
          notes?: string | null
          person?: string | null
          preventive_care_id?: string | null
          provider?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_medical_documents_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_medical_documents_preventive_care_id_fkey"
            columns: ["preventive_care_id"]
            isOneToOne: false
            referencedRelation: "health_preventive_care"
            referencedColumns: ["id"]
          },
        ]
      }
      health_milestones: {
        Row: {
          actual_date: string | null
          created_at: string
          deleted_at: string | null
          estimated_date: string | null
          household_id: string
          id: string
          reward: string | null
          reward_claimed: boolean
          sort_order: number
          updated_at: string
          weight_target: number
        }
        Insert: {
          actual_date?: string | null
          created_at?: string
          deleted_at?: string | null
          estimated_date?: string | null
          household_id: string
          id?: string
          reward?: string | null
          reward_claimed?: boolean
          sort_order?: number
          updated_at?: string
          weight_target: number
        }
        Update: {
          actual_date?: string | null
          created_at?: string
          deleted_at?: string | null
          estimated_date?: string | null
          household_id?: string
          id?: string
          reward?: string | null
          reward_claimed?: boolean
          sort_order?: number
          updated_at?: string
          weight_target?: number
        }
        Relationships: [
          {
            foreignKeyName: "health_milestones_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      health_preventive_care: {
        Row: {
          care_type: string
          cost_estimate: number
          covered_by_insurance: boolean
          created_at: string
          deleted_at: string | null
          frequency_months: number
          household_id: string
          id: string
          item_name: string
          last_completed_on: string | null
          next_due_on: string | null
          notes: string | null
          out_of_pocket: number
          person: string | null
          provider: string | null
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          care_type?: string
          cost_estimate?: number
          covered_by_insurance?: boolean
          created_at?: string
          deleted_at?: string | null
          frequency_months?: number
          household_id: string
          id?: string
          item_name: string
          last_completed_on?: string | null
          next_due_on?: string | null
          notes?: string | null
          out_of_pocket?: number
          person?: string | null
          provider?: string | null
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          care_type?: string
          cost_estimate?: number
          covered_by_insurance?: boolean
          created_at?: string
          deleted_at?: string | null
          frequency_months?: number
          household_id?: string
          id?: string
          item_name?: string
          last_completed_on?: string | null
          next_due_on?: string | null
          notes?: string | null
          out_of_pocket?: number
          person?: string | null
          provider?: string | null
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_preventive_care_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      health_profile: {
        Row: {
          birth_date: string | null
          body_fat_pct: number | null
          created_at: string
          current_weight: number
          daily_miles_goal: number
          deleted_at: string | null
          fruit_goal_servings: number
          goal_weight: number
          height_inches: number | null
          household_id: string
          id: string
          notes: string | null
          person_name: string
          protein_goal_g: number
          sex: string | null
          start_date: string
          start_weight: number
          target_date: string | null
          updated_at: string
          veg_goal_servings: number
          waist_inches: number | null
          walk_days_per_week: number
          water_goal_oz: number
        }
        Insert: {
          birth_date?: string | null
          body_fat_pct?: number | null
          created_at?: string
          current_weight?: number
          daily_miles_goal?: number
          deleted_at?: string | null
          fruit_goal_servings?: number
          goal_weight?: number
          height_inches?: number | null
          household_id: string
          id?: string
          notes?: string | null
          person_name?: string
          protein_goal_g?: number
          sex?: string | null
          start_date?: string
          start_weight?: number
          target_date?: string | null
          updated_at?: string
          veg_goal_servings?: number
          waist_inches?: number | null
          walk_days_per_week?: number
          water_goal_oz?: number
        }
        Update: {
          birth_date?: string | null
          body_fat_pct?: number | null
          created_at?: string
          current_weight?: number
          daily_miles_goal?: number
          deleted_at?: string | null
          fruit_goal_servings?: number
          goal_weight?: number
          height_inches?: number | null
          household_id?: string
          id?: string
          notes?: string | null
          person_name?: string
          protein_goal_g?: number
          sex?: string | null
          start_date?: string
          start_weight?: number
          target_date?: string | null
          updated_at?: string
          veg_goal_servings?: number
          waist_inches?: number | null
          walk_days_per_week?: number
          water_goal_oz?: number
        }
        Relationships: [
          {
            foreignKeyName: "health_profile_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      health_vitals: {
        Row: {
          a1c: number | null
          body_fat_pct: number | null
          created_at: string
          deleted_at: string | null
          diastolic: number | null
          glucose: number | null
          hdl: number | null
          household_id: string
          id: string
          ldl: number | null
          measured_on: string
          notes: string | null
          resting_heart_rate: number | null
          systolic: number | null
          total_cholesterol: number | null
          triglycerides: number | null
          updated_at: string
          waist_inches: number | null
        }
        Insert: {
          a1c?: number | null
          body_fat_pct?: number | null
          created_at?: string
          deleted_at?: string | null
          diastolic?: number | null
          glucose?: number | null
          hdl?: number | null
          household_id: string
          id?: string
          ldl?: number | null
          measured_on?: string
          notes?: string | null
          resting_heart_rate?: number | null
          systolic?: number | null
          total_cholesterol?: number | null
          triglycerides?: number | null
          updated_at?: string
          waist_inches?: number | null
        }
        Update: {
          a1c?: number | null
          body_fat_pct?: number | null
          created_at?: string
          deleted_at?: string | null
          diastolic?: number | null
          glucose?: number | null
          hdl?: number | null
          household_id?: string
          id?: string
          ldl?: number | null
          measured_on?: string
          notes?: string | null
          resting_heart_rate?: number | null
          systolic?: number | null
          total_cholesterol?: number | null
          triglycerides?: number | null
          updated_at?: string
          waist_inches?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "health_vitals_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      home_buying_coach_sessions: {
        Row: {
          answers: Json
          created_at: string
          household_id: string
          id: string
          report: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          household_id: string
          id?: string
          report?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          household_id?: string
          id?: string
          report?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      home_buying_scenarios: {
        Row: {
          created_at: string
          household_id: string
          id: string
          inputs: Json
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          inputs: Json
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          inputs?: Json
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      homebuyer_checklist: {
        Row: {
          created_at: string
          household_id: string
          id: string
          is_checked: boolean
          notes: string | null
          question_number: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          is_checked?: boolean
          notes?: string | null
          question_number: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          is_checked?: boolean
          notes?: string | null
          question_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homebuyer_checklist_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          household_id: string
          id: string
          invited_by: string
          status: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          household_id: string
          id?: string
          invited_by: string
          status?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          household_id?: string
          id?: string
          invited_by?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_invitations_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          created_at: string
          household_id: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      hp_coach_narratives: {
        Row: {
          content_md: string
          created_at: string
          generated_at: string
          household_id: string
          id: string
          month_index: number | null
          project_id: string
          section_key: string
          snapshot_hash: string
          updated_at: string
        }
        Insert: {
          content_md: string
          created_at?: string
          generated_at?: string
          household_id: string
          id?: string
          month_index?: number | null
          project_id: string
          section_key: string
          snapshot_hash: string
          updated_at?: string
        }
        Update: {
          content_md?: string
          created_at?: string
          generated_at?: string
          household_id?: string
          id?: string
          month_index?: number | null
          project_id?: string
          section_key?: string
          snapshot_hash?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hp_coach_narratives_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "hp_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      hp_documents: {
        Row: {
          created_at: string
          deleted_at: string | null
          doc_type: string
          expiration_date: string | null
          household_id: string
          id: string
          label: string | null
          notes: string | null
          project_id: string
          status: string
          storage_path: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          doc_type: string
          expiration_date?: string | null
          household_id: string
          id?: string
          label?: string | null
          notes?: string | null
          project_id: string
          status?: string
          storage_path?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          doc_type?: string
          expiration_date?: string | null
          household_id?: string
          id?: string
          label?: string | null
          notes?: string | null
          project_id?: string
          status?: string
          storage_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hp_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "hp_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      hp_milestones: {
        Row: {
          completion_pct: number
          created_at: string
          deleted_at: string | null
          dependencies: string[]
          description: string | null
          due_date: string | null
          household_id: string
          id: string
          month_index: number
          month_label: string
          project_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          completion_pct?: number
          created_at?: string
          deleted_at?: string | null
          dependencies?: string[]
          description?: string | null
          due_date?: string | null
          household_id: string
          id?: string
          month_index: number
          month_label: string
          project_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          completion_pct?: number
          created_at?: string
          deleted_at?: string | null
          dependencies?: string[]
          description?: string | null
          due_date?: string | null
          household_id?: string
          id?: string
          month_index?: number
          month_label?: string
          project_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hp_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "hp_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      hp_notes: {
        Row: {
          body: string
          category: string
          created_at: string
          deleted_at: string | null
          household_id: string
          id: string
          month_index: number | null
          project_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          body: string
          category?: string
          created_at?: string
          deleted_at?: string | null
          household_id: string
          id?: string
          month_index?: number | null
          project_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          deleted_at?: string | null
          household_id?: string
          id?: string
          month_index?: number | null
          project_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hp_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "hp_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      hp_projects: {
        Row: {
          created_at: string
          deleted_at: string | null
          down_payment_saved: number | null
          down_payment_source: string | null
          down_payment_target: number | null
          dpa_program_note: string | null
          emergency_fund_balance: number | null
          household_id: string
          id: string
          loan_type_preference: string | null
          max_monthly_payment: number | null
          name: string
          start_date: string
          status: string
          target_close_date: string
          target_price: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          down_payment_saved?: number | null
          down_payment_source?: string | null
          down_payment_target?: number | null
          dpa_program_note?: string | null
          emergency_fund_balance?: number | null
          household_id: string
          id?: string
          loan_type_preference?: string | null
          max_monthly_payment?: number | null
          name?: string
          start_date?: string
          status?: string
          target_close_date: string
          target_price?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          down_payment_saved?: number | null
          down_payment_source?: string | null
          down_payment_target?: number | null
          dpa_program_note?: string | null
          emergency_fund_balance?: number | null
          household_id?: string
          id?: string
          loan_type_preference?: string | null
          max_monthly_payment?: number | null
          name?: string
          start_date?: string
          status?: string
          target_close_date?: string
          target_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hp_projects_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      hp_risks: {
        Row: {
          created_at: string
          deleted_at: string | null
          household_id: string
          id: string
          impact: string
          mitigation: string | null
          owner: string | null
          probability: string
          project_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          household_id: string
          id?: string
          impact?: string
          mitigation?: string | null
          owner?: string | null
          probability?: string
          project_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          household_id?: string
          id?: string
          impact?: string
          mitigation?: string | null
          owner?: string | null
          probability?: string
          project_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hp_risks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "hp_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      hp_rules: {
        Row: {
          created_at: string
          deleted_at: string | null
          household_id: string
          id: string
          is_active: boolean
          label: string
          project_id: string
          rule_type: string
          updated_at: string
          value_numeric: number | null
          value_text: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          household_id: string
          id?: string
          is_active?: boolean
          label: string
          project_id: string
          rule_type: string
          updated_at?: string
          value_numeric?: number | null
          value_text?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          household_id?: string
          id?: string
          is_active?: boolean
          label?: string
          project_id?: string
          rule_type?: string
          updated_at?: string
          value_numeric?: number | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hp_rules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "hp_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      hp_scenarios: {
        Row: {
          computed: Json
          created_at: string
          deleted_at: string | null
          household_id: string
          id: string
          inputs: Json
          name: string
          project_id: string
          updated_at: string
        }
        Insert: {
          computed?: Json
          created_at?: string
          deleted_at?: string | null
          household_id: string
          id?: string
          inputs?: Json
          name: string
          project_id: string
          updated_at?: string
        }
        Update: {
          computed?: Json
          created_at?: string
          deleted_at?: string | null
          household_id?: string
          id?: string
          inputs?: Json
          name?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hp_scenarios_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "hp_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      hp_tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          deleted_at: string | null
          due_date: string | null
          estimated_hours: number | null
          household_id: string
          id: string
          milestone_id: string
          notes: string | null
          priority: string
          project_id: string
          status: string
          title: string
          updated_at: string
          week_index: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          household_id: string
          id?: string
          milestone_id: string
          notes?: string | null
          priority?: string
          project_id: string
          status?: string
          title: string
          updated_at?: string
          week_index?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          household_id?: string
          id?: string
          milestone_id?: string
          notes?: string | null
          priority?: string
          project_id?: string
          status?: string
          title?: string
          updated_at?: string
          week_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "hp_tasks_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "hp_milestones"
            referencedColumns: ["id"]
          },
        ]
      }
      hp_worksheets: {
        Row: {
          created_at: string
          data: Json
          deleted_at: string | null
          household_id: string
          id: string
          project_id: string
          updated_at: string
          worksheet_type: string
        }
        Insert: {
          created_at?: string
          data?: Json
          deleted_at?: string | null
          household_id: string
          id?: string
          project_id: string
          updated_at?: string
          worksheet_type: string
        }
        Update: {
          created_at?: string
          data?: Json
          deleted_at?: string | null
          household_id?: string
          id?: string
          project_id?: string
          updated_at?: string
          worksheet_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "hp_worksheets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "hp_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      hundred_year_scenarios: {
        Row: {
          created_at: string
          deleted_at: string | null
          horizon_years: number
          household_id: string
          id: string
          inputs: Json
          is_baseline: boolean
          name: string
          results: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          horizon_years?: number
          household_id: string
          id?: string
          inputs?: Json
          is_baseline?: boolean
          name?: string
          results?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          horizon_years?: number
          household_id?: string
          id?: string
          inputs?: Json
          is_baseline?: boolean
          name?: string
          results?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hundred_year_scenarios_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_coverage: {
        Row: {
          annual_premium: number | null
          beneficiary: string | null
          carrier: string | null
          coverage_amount: number | null
          created_at: string
          deleted_at: string | null
          household_id: string
          id: string
          kind: string
          notes: string | null
          policy_number: string | null
          renewal_date: string | null
          updated_at: string
        }
        Insert: {
          annual_premium?: number | null
          beneficiary?: string | null
          carrier?: string | null
          coverage_amount?: number | null
          created_at?: string
          deleted_at?: string | null
          household_id: string
          id?: string
          kind: string
          notes?: string | null
          policy_number?: string | null
          renewal_date?: string | null
          updated_at?: string
        }
        Update: {
          annual_premium?: number | null
          beneficiary?: string | null
          carrier?: string | null
          coverage_amount?: number | null
          created_at?: string
          deleted_at?: string | null
          household_id?: string
          id?: string
          kind?: string
          notes?: string | null
          policy_number?: string | null
          renewal_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_coverage_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_asset_tags: {
        Row: {
          amount_override: number | null
          asset_key: string
          created_at: string
          custom_label: string | null
          household_id: string
          id: string
          include_in_legacy: boolean
          notes: string | null
          plan_id: string
          tag: string
          updated_at: string
        }
        Insert: {
          amount_override?: number | null
          asset_key: string
          created_at?: string
          custom_label?: string | null
          household_id: string
          id?: string
          include_in_legacy?: boolean
          notes?: string | null
          plan_id: string
          tag?: string
          updated_at?: string
        }
        Update: {
          amount_override?: number | null
          asset_key?: string
          created_at?: string
          custom_label?: string | null
          household_id?: string
          id?: string
          include_in_legacy?: boolean
          notes?: string | null
          plan_id?: string
          tag?: string
          updated_at?: string
        }
        Relationships: []
      }
      investment_holdings: {
        Row: {
          account_id: string
          cost_basis: number | null
          created_at: string
          currency: string
          holding_type: string
          household_id: string
          id: string
          market_value: number
          name: string
          price: number
          provider_holding_id: string | null
          quantity: number
          return_1yr_pct: number | null
          return_ytd_pct: number | null
          symbol: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          cost_basis?: number | null
          created_at?: string
          currency?: string
          holding_type?: string
          household_id: string
          id?: string
          market_value?: number
          name: string
          price?: number
          provider_holding_id?: string | null
          quantity?: number
          return_1yr_pct?: number | null
          return_ytd_pct?: number | null
          symbol?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          cost_basis?: number | null
          created_at?: string
          currency?: string
          holding_type?: string
          household_id?: string
          id?: string
          market_value?: number
          name?: string
          price?: number
          provider_holding_id?: string | null
          quantity?: number
          return_1yr_pct?: number | null
          return_ytd_pct?: number | null
          symbol?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "investment_holdings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investment_holdings_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_legacy_goals: {
        Row: {
          advisors: Json
          beneficiaries: Json
          created_at: string
          excluded_account_ids: string[]
          has_poa: boolean
          has_trust: boolean
          has_will: boolean
          household_id: string
          id: string
          included_account_ids: string[]
          name: string
          notes: string | null
          plan_id: string
          target_amount: number
          target_year: number | null
          updated_at: string
        }
        Insert: {
          advisors?: Json
          beneficiaries?: Json
          created_at?: string
          excluded_account_ids?: string[]
          has_poa?: boolean
          has_trust?: boolean
          has_will?: boolean
          household_id: string
          id?: string
          included_account_ids?: string[]
          name?: string
          notes?: string | null
          plan_id: string
          target_amount?: number
          target_year?: number | null
          updated_at?: string
        }
        Update: {
          advisors?: Json
          beneficiaries?: Json
          created_at?: string
          excluded_account_ids?: string[]
          has_poa?: boolean
          has_trust?: boolean
          has_will?: boolean
          household_id?: string
          id?: string
          included_account_ids?: string[]
          name?: string
          notes?: string | null
          plan_id?: string
          target_amount?: number
          target_year?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "investment_legacy_goals_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investment_legacy_goals_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "investment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_milestones: {
        Row: {
          age: number
          completed_at: string | null
          created_at: string
          description: string | null
          household_id: string
          id: string
          is_completed: boolean
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          age: number
          completed_at?: string | null
          created_at?: string
          description?: string | null
          household_id: string
          id?: string
          is_completed?: boolean
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          age?: number
          completed_at?: string | null
          created_at?: string
          description?: string | null
          household_id?: string
          id?: string
          is_completed?: boolean
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      investment_money_rules: {
        Row: {
          amount: number | null
          amount_pct: number | null
          created_at: string
          destination: string | null
          frequency: string
          household_id: string
          id: string
          name: string
          notes: string | null
          plan_id: string | null
          reminder: boolean
          start_date: string | null
          status: string
          trigger_type: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          amount_pct?: number | null
          created_at?: string
          destination?: string | null
          frequency?: string
          household_id: string
          id?: string
          name: string
          notes?: string | null
          plan_id?: string | null
          reminder?: boolean
          start_date?: string | null
          status?: string
          trigger_type?: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          amount_pct?: number | null
          created_at?: string
          destination?: string | null
          frequency?: string
          household_id?: string
          id?: string
          name?: string
          notes?: string | null
          plan_id?: string | null
          reminder?: boolean
          start_date?: string | null
          status?: string
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "investment_money_rules_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investment_money_rules_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "investment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_pensions: {
        Row: {
          cola_pct: number
          created_at: string
          household_id: string
          id: string
          is_taxable: boolean
          lump_sum_amount: number | null
          monthly_amount: number
          notes: string | null
          owner: string
          plan_id: string
          provider: string
          start_age: number | null
          survivor_pct: number
          updated_at: string
          use_mode: string
        }
        Insert: {
          cola_pct?: number
          created_at?: string
          household_id: string
          id?: string
          is_taxable?: boolean
          lump_sum_amount?: number | null
          monthly_amount?: number
          notes?: string | null
          owner?: string
          plan_id: string
          provider: string
          start_age?: number | null
          survivor_pct?: number
          updated_at?: string
          use_mode?: string
        }
        Update: {
          cola_pct?: number
          created_at?: string
          household_id?: string
          id?: string
          is_taxable?: boolean
          lump_sum_amount?: number | null
          monthly_amount?: number
          notes?: string | null
          owner?: string
          plan_id?: string
          provider?: string
          start_age?: number | null
          survivor_pct?: number
          updated_at?: string
          use_mode?: string
        }
        Relationships: [
          {
            foreignKeyName: "investment_pensions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investment_pensions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "investment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_plan_spouse: {
        Row: {
          created_at: string
          current_age: number | null
          current_balance: number
          expected_return_pct: number
          household_id: string
          id: string
          monthly_employee_contribution: number
          monthly_employer_contribution: number
          name: string | null
          notes: string | null
          plan_id: string
          retirement_age: number | null
          ss_claiming_age: number | null
          ss_monthly_estimate: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_age?: number | null
          current_balance?: number
          expected_return_pct?: number
          household_id: string
          id?: string
          monthly_employee_contribution?: number
          monthly_employer_contribution?: number
          name?: string | null
          notes?: string | null
          plan_id: string
          retirement_age?: number | null
          ss_claiming_age?: number | null
          ss_monthly_estimate?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_age?: number | null
          current_balance?: number
          expected_return_pct?: number
          household_id?: string
          id?: string
          monthly_employee_contribution?: number
          monthly_employer_contribution?: number
          name?: string | null
          notes?: string | null
          plan_id?: string
          retirement_age?: number | null
          ss_claiming_age?: number | null
          ss_monthly_estimate?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "investment_plan_spouse_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investment_plan_spouse_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: true
            referencedRelation: "investment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_plans: {
        Row: {
          additional_monthly_amount: number | null
          additional_start_date: string | null
          annual_raise_pct: number
          created_at: string
          current_age: number | null
          current_balance: number
          current_monthly_income: number | null
          debt_payment_amount: number | null
          debt_payoff_date: string | null
          employer_match_pct: number | null
          expected_return_pct: number
          expense_ratio_pct: number | null
          household_id: string
          hsa_balance: number
          hsa_employer_contribution: number
          hsa_invested: boolean
          hsa_monthly_contribution: number
          hsa_return_pct: number
          id: string
          income_strategy: string
          inflation_pct: number
          is_active: boolean
          legacy_calculation_method: string
          legacy_goal_name: string
          legacy_percentage: number
          monthly_employee_contribution: number
          monthly_employer_contribution: number
          name: string
          notes: string | null
          raise_redirect_pct: number
          retirement_age: number | null
          spouse_deferred_comp_value: number
          spouse_pension_account_value: number
          spouse_pension_monthly: number
          ss_claiming_age: number | null
          ss_invest_pct: number
          ss_invest_while_working: boolean
          ss_monthly_estimate: number | null
          target_amount: number
          updated_at: string
          use_future_dollars: boolean
        }
        Insert: {
          additional_monthly_amount?: number | null
          additional_start_date?: string | null
          annual_raise_pct?: number
          created_at?: string
          current_age?: number | null
          current_balance?: number
          current_monthly_income?: number | null
          debt_payment_amount?: number | null
          debt_payoff_date?: string | null
          employer_match_pct?: number | null
          expected_return_pct?: number
          expense_ratio_pct?: number | null
          household_id: string
          hsa_balance?: number
          hsa_employer_contribution?: number
          hsa_invested?: boolean
          hsa_monthly_contribution?: number
          hsa_return_pct?: number
          id?: string
          income_strategy?: string
          inflation_pct?: number
          is_active?: boolean
          legacy_calculation_method?: string
          legacy_goal_name?: string
          legacy_percentage?: number
          monthly_employee_contribution?: number
          monthly_employer_contribution?: number
          name?: string
          notes?: string | null
          raise_redirect_pct?: number
          retirement_age?: number | null
          spouse_deferred_comp_value?: number
          spouse_pension_account_value?: number
          spouse_pension_monthly?: number
          ss_claiming_age?: number | null
          ss_invest_pct?: number
          ss_invest_while_working?: boolean
          ss_monthly_estimate?: number | null
          target_amount?: number
          updated_at?: string
          use_future_dollars?: boolean
        }
        Update: {
          additional_monthly_amount?: number | null
          additional_start_date?: string | null
          annual_raise_pct?: number
          created_at?: string
          current_age?: number | null
          current_balance?: number
          current_monthly_income?: number | null
          debt_payment_amount?: number | null
          debt_payoff_date?: string | null
          employer_match_pct?: number | null
          expected_return_pct?: number
          expense_ratio_pct?: number | null
          household_id?: string
          hsa_balance?: number
          hsa_employer_contribution?: number
          hsa_invested?: boolean
          hsa_monthly_contribution?: number
          hsa_return_pct?: number
          id?: string
          income_strategy?: string
          inflation_pct?: number
          is_active?: boolean
          legacy_calculation_method?: string
          legacy_goal_name?: string
          legacy_percentage?: number
          monthly_employee_contribution?: number
          monthly_employer_contribution?: number
          name?: string
          notes?: string | null
          raise_redirect_pct?: number
          retirement_age?: number | null
          spouse_deferred_comp_value?: number
          spouse_pension_account_value?: number
          spouse_pension_monthly?: number
          ss_claiming_age?: number | null
          ss_invest_pct?: number
          ss_invest_while_working?: boolean
          ss_monthly_estimate?: number | null
          target_amount?: number
          updated_at?: string
          use_future_dollars?: boolean
        }
        Relationships: []
      }
      investment_rule_executions: {
        Row: {
          executed_at: string
          household_id: string
          id: string
          notes: string | null
          rule_id: string
          status: string
        }
        Insert: {
          executed_at?: string
          household_id: string
          id?: string
          notes?: string | null
          rule_id: string
          status?: string
        }
        Update: {
          executed_at?: string
          household_id?: string
          id?: string
          notes?: string | null
          rule_id?: string
          status?: string
        }
        Relationships: []
      }
      investment_scenarios: {
        Row: {
          created_at: string
          household_id: string
          id: string
          inputs: Json
          name: string
          plan_id: string | null
          results: Json
          return_pct: number
          scenario_type: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          inputs?: Json
          name: string
          plan_id?: string | null
          results?: Json
          return_pct?: number
          scenario_type?: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          inputs?: Json
          name?: string
          plan_id?: string | null
          results?: Json
          return_pct?: number
          scenario_type?: string
        }
        Relationships: []
      }
      investment_watchlist: {
        Row: {
          alert_sent: boolean
          created_at: string
          current_price: number | null
          household_id: string
          id: string
          name: string | null
          notes: string | null
          price_updated_at: string | null
          symbol: string
          target_price: number | null
          updated_at: string
        }
        Insert: {
          alert_sent?: boolean
          created_at?: string
          current_price?: number | null
          household_id: string
          id?: string
          name?: string | null
          notes?: string | null
          price_updated_at?: string | null
          symbol: string
          target_price?: number | null
          updated_at?: string
        }
        Update: {
          alert_sent?: boolean
          created_at?: string
          current_price?: number | null
          household_id?: string
          id?: string
          name?: string | null
          notes?: string | null
          price_updated_at?: string | null
          symbol?: string
          target_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "investment_watchlist_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      kungfoo_plans: {
        Row: {
          ai_rationale: string | null
          computed_at: string
          context: Json
          created_at: string
          household_id: string
          id: string
          is_active: boolean
          next_action: string | null
          ordered_steps: Json
          updated_at: string
        }
        Insert: {
          ai_rationale?: string | null
          computed_at?: string
          context?: Json
          created_at?: string
          household_id: string
          id?: string
          is_active?: boolean
          next_action?: string | null
          ordered_steps?: Json
          updated_at?: string
        }
        Update: {
          ai_rationale?: string | null
          computed_at?: string
          context?: Json
          created_at?: string
          household_id?: string
          id?: string
          is_active?: boolean
          next_action?: string | null
          ordered_steps?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kungfoo_plans_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      legacy_letters: {
        Row: {
          attachment_name: string | null
          attachment_path: string | null
          body: string | null
          created_at: string
          household_id: string
          id: string
          recipient: string
          shared_with_trust_vault: boolean
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_path?: string | null
          body?: string | null
          created_at?: string
          household_id: string
          id?: string
          recipient: string
          shared_with_trust_vault?: boolean
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_path?: string | null
          body?: string | null
          created_at?: string
          household_id?: string
          id?: string
          recipient?: string
          shared_with_trust_vault?: boolean
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      legacy_trust_contributions: {
        Row: {
          amount: number
          contribution_date: string
          created_at: string
          household_id: string
          id: string
          note: string | null
          plan_id: string
          source_asset_key: string | null
          source_label: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          contribution_date?: string
          created_at?: string
          household_id: string
          id?: string
          note?: string | null
          plan_id: string
          source_asset_key?: string | null
          source_label?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          contribution_date?: string
          created_at?: string
          household_id?: string
          id?: string
          note?: string | null
          plan_id?: string
          source_asset_key?: string | null
          source_label?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      legacy_worth_snapshots: {
        Row: {
          created_at: string
          days_until_freedom: number | null
          factor_scores: Json
          fi_percentage: number | null
          household_id: string
          id: string
          life_stage: string | null
          net_worth: number | null
          passive_income_coverage: number | null
          projected_estate_at_85: number | null
          score: number
          snapshot_date: string
        }
        Insert: {
          created_at?: string
          days_until_freedom?: number | null
          factor_scores?: Json
          fi_percentage?: number | null
          household_id: string
          id?: string
          life_stage?: string | null
          net_worth?: number | null
          passive_income_coverage?: number | null
          projected_estate_at_85?: number | null
          score?: number
          snapshot_date?: string
        }
        Update: {
          created_at?: string
          days_until_freedom?: number | null
          factor_scores?: Json
          fi_percentage?: number | null
          household_id?: string
          id?: string
          life_stage?: string | null
          net_worth?: number | null
          passive_income_coverage?: number | null
          projected_estate_at_85?: number | null
          score?: number
          snapshot_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "legacy_worth_snapshots_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_readiness_items: {
        Row: {
          created_at: string
          document_key: string
          document_label: string
          household_id: string
          id: string
          is_uploaded: boolean
          notes: string | null
          updated_at: string
          uploaded_at: string | null
        }
        Insert: {
          created_at?: string
          document_key: string
          document_label: string
          household_id: string
          id?: string
          is_uploaded?: boolean
          notes?: string | null
          updated_at?: string
          uploaded_at?: string | null
        }
        Update: {
          created_at?: string
          document_key?: string
          document_label?: string
          household_id?: string
          id?: string
          is_uploaded?: boolean
          notes?: string | null
          updated_at?: string
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loan_readiness_items_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      medicaid_claims: {
        Row: {
          amount: number
          claim_number: string | null
          client_name: string
          created_at: string
          denial_reason: string | null
          household_id: string
          id: string
          notes: string | null
          payment_amount: number | null
          payment_date: string | null
          service_date: string
          status: string
          submission_date: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          claim_number?: string | null
          client_name: string
          created_at?: string
          denial_reason?: string | null
          household_id: string
          id?: string
          notes?: string | null
          payment_amount?: number | null
          payment_date?: string | null
          service_date: string
          status?: string
          submission_date?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          claim_number?: string | null
          client_name?: string
          created_at?: string
          denial_reason?: string | null
          household_id?: string
          id?: string
          notes?: string | null
          payment_amount?: number | null
          payment_date?: string | null
          service_date?: string
          status?: string
          submission_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medicaid_claims_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_normalizations: {
        Row: {
          created_at: string
          household_id: string | null
          id: string
          is_global: boolean
          normalized_name: string
          raw_pattern: string
        }
        Insert: {
          created_at?: string
          household_id?: string | null
          id?: string
          is_global?: boolean
          normalized_name: string
          raw_pattern: string
        }
        Update: {
          created_at?: string
          household_id?: string | null
          id?: string
          is_global?: boolean
          normalized_name?: string
          raw_pattern?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_normalizations_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      method_accounts: {
        Row: {
          account_id: string | null
          created_at: string
          entity_id: string
          household_id: string
          id: string
          mask: string | null
          method_account_id: string
          routing: string | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          entity_id: string
          household_id: string
          id?: string
          mask?: string | null
          method_account_id: string
          routing?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          entity_id?: string
          household_id?: string
          id?: string
          mask?: string | null
          method_account_id?: string
          routing?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "method_accounts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "method_accounts_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "method_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      method_autopay_rules: {
        Row: {
          created_at: string
          enabled: boolean
          fixed_amount: number | null
          household_id: string
          id: string
          lead_days: number
          liability_id: string
          max_amount_cap: number
          source_method_account_id: string
          strategy: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          fixed_amount?: number | null
          household_id: string
          id?: string
          lead_days?: number
          liability_id: string
          max_amount_cap?: number
          source_method_account_id: string
          strategy?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          fixed_amount?: number | null
          household_id?: string
          id?: string
          lead_days?: number
          liability_id?: string
          max_amount_cap?: number
          source_method_account_id?: string
          strategy?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "method_autopay_rules_liability_id_fkey"
            columns: ["liability_id"]
            isOneToOne: true
            referencedRelation: "method_liabilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "method_autopay_rules_source_method_account_id_fkey"
            columns: ["source_method_account_id"]
            isOneToOne: false
            referencedRelation: "method_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      method_entities: {
        Row: {
          capabilities: Json
          created_at: string
          household_id: string
          id: string
          kyc_email: string | null
          kyc_first_name: string | null
          kyc_last_name: string | null
          kyc_phone: string | null
          method_entity_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          capabilities?: Json
          created_at?: string
          household_id: string
          id?: string
          kyc_email?: string | null
          kyc_first_name?: string | null
          kyc_last_name?: string | null
          kyc_phone?: string | null
          method_entity_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          capabilities?: Json
          created_at?: string
          household_id?: string
          id?: string
          kyc_email?: string | null
          kyc_first_name?: string | null
          kyc_last_name?: string | null
          kyc_phone?: string | null
          method_entity_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      method_liabilities: {
        Row: {
          balance: number | null
          created_at: string
          entity_id: string
          household_id: string
          id: string
          last_synced_at: string | null
          liability_type: string | null
          mask: string | null
          mch_id: string | null
          merchant_name: string
          method_liability_id: string
          next_payment_due_date: string | null
          next_payment_minimum_amount: number | null
          recurring_transaction_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          balance?: number | null
          created_at?: string
          entity_id: string
          household_id: string
          id?: string
          last_synced_at?: string | null
          liability_type?: string | null
          mask?: string | null
          mch_id?: string | null
          merchant_name: string
          method_liability_id: string
          next_payment_due_date?: string | null
          next_payment_minimum_amount?: number | null
          recurring_transaction_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          balance?: number | null
          created_at?: string
          entity_id?: string
          household_id?: string
          id?: string
          last_synced_at?: string | null
          liability_type?: string | null
          mask?: string | null
          mch_id?: string | null
          merchant_name?: string
          method_liability_id?: string
          next_payment_due_date?: string | null
          next_payment_minimum_amount?: number | null
          recurring_transaction_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "method_liabilities_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "method_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "method_liabilities_recurring_transaction_id_fkey"
            columns: ["recurring_transaction_id"]
            isOneToOne: false
            referencedRelation: "recurring_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      method_payments: {
        Row: {
          amount: number
          created_at: string
          destination_method_liability_id: string
          error_code: string | null
          error_message: string | null
          estimated_completion_date: string | null
          household_id: string
          id: string
          idempotency_key: string
          initiated_by_user_id: string | null
          is_autopay: boolean
          method_payment_id: string | null
          source_method_account_id: string
          status: string
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          destination_method_liability_id: string
          error_code?: string | null
          error_message?: string | null
          estimated_completion_date?: string | null
          household_id: string
          id?: string
          idempotency_key: string
          initiated_by_user_id?: string | null
          is_autopay?: boolean
          method_payment_id?: string | null
          source_method_account_id: string
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          destination_method_liability_id?: string
          error_code?: string | null
          error_message?: string | null
          estimated_completion_date?: string | null
          household_id?: string
          id?: string
          idempotency_key?: string
          initiated_by_user_id?: string | null
          is_autopay?: boolean
          method_payment_id?: string | null
          source_method_account_id?: string
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "method_payments_destination_method_liability_id_fkey"
            columns: ["destination_method_liability_id"]
            isOneToOne: false
            referencedRelation: "method_liabilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "method_payments_source_method_account_id_fkey"
            columns: ["source_method_account_id"]
            isOneToOne: false
            referencedRelation: "method_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "method_payments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      metro2_findings: {
        Row: {
          created_at: string
          credit_account_id: string
          explanation: string
          household_id: string
          id: string
          is_resolved: boolean
          metro2_principle: string | null
          recommended_action: string | null
          scan_batch_id: string | null
          severity: string
          title: string
          violation_type: string
        }
        Insert: {
          created_at?: string
          credit_account_id: string
          explanation: string
          household_id: string
          id?: string
          is_resolved?: boolean
          metro2_principle?: string | null
          recommended_action?: string | null
          scan_batch_id?: string | null
          severity?: string
          title: string
          violation_type: string
        }
        Update: {
          created_at?: string
          credit_account_id?: string
          explanation?: string
          household_id?: string
          id?: string
          is_resolved?: boolean
          metro2_principle?: string | null
          recommended_action?: string | null
          scan_batch_id?: string | null
          severity?: string
          title?: string
          violation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "metro2_findings_credit_account_id_fkey"
            columns: ["credit_account_id"]
            isOneToOne: false
            referencedRelation: "credit_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metro2_findings_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      mh_duplex_units: {
        Row: {
          created_at: string
          deleted_at: string | null
          household_id: string
          id: string
          lease_expiration: string | null
          lease_type: string
          maintenance_cost: number
          monthly_expenses: number
          monthly_rent: number
          notes: string | null
          occupancy_pct: number
          sort_order: number
          tenant_type: string | null
          unit_label: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          household_id: string
          id?: string
          lease_expiration?: string | null
          lease_type?: string
          maintenance_cost?: number
          monthly_expenses?: number
          monthly_rent?: number
          notes?: string | null
          occupancy_pct?: number
          sort_order?: number
          tenant_type?: string | null
          unit_label: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          household_id?: string
          id?: string
          lease_expiration?: string | null
          lease_type?: string
          maintenance_cost?: number
          monthly_expenses?: number
          monthly_rent?: number
          notes?: string | null
          occupancy_pct?: number
          sort_order?: number
          tenant_type?: string | null
          unit_label?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mh_duplex_units_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      mh_employers: {
        Row: {
          address: string | null
          category: string | null
          city: string | null
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          contract_demand: string
          created_at: string
          deleted_at: string | null
          employee_count: number | null
          estimated_housing_demand: string
          has_fellowship: boolean
          has_residency: boolean
          household_id: string
          id: string
          med_school_affiliation: string | null
          name: string
          notes: string | null
          referral_status: string
          sort_order: number
          travel_nurse_demand: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          category?: string | null
          city?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          contract_demand?: string
          created_at?: string
          deleted_at?: string | null
          employee_count?: number | null
          estimated_housing_demand?: string
          has_fellowship?: boolean
          has_residency?: boolean
          household_id: string
          id?: string
          med_school_affiliation?: string | null
          name: string
          notes?: string | null
          referral_status?: string
          sort_order?: number
          travel_nurse_demand?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          category?: string | null
          city?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          contract_demand?: string
          created_at?: string
          deleted_at?: string | null
          employee_count?: number | null
          estimated_housing_demand?: string
          has_fellowship?: boolean
          has_residency?: boolean
          household_id?: string
          id?: string
          med_school_affiliation?: string | null
          name?: string
          notes?: string | null
          referral_status?: string
          sort_order?: number
          travel_nurse_demand?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mh_employers_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      mh_income_scenarios: {
        Row: {
          advertising: number
          annual_vacancy_pct: number
          bedrooms: number
          cash_invested: number
          cleaning: number
          created_at: string
          deleted_at: string | null
          furniture_reserve: number
          household_id: string
          id: string
          insurance: number
          internet: number
          is_active: boolean
          lawn_care: number
          maintenance_reserve: number
          market_label: string | null
          model_type: string
          monthly_rent: number
          mortgage: number
          name: string
          notes: string | null
          occupancy_pct: number
          other_expenses: number
          platform_fees: number
          property_management: number
          property_taxes: number
          rent_per_room: number
          snow_removal: number
          sort_order: number
          updated_at: string
          utilities: number
        }
        Insert: {
          advertising?: number
          annual_vacancy_pct?: number
          bedrooms?: number
          cash_invested?: number
          cleaning?: number
          created_at?: string
          deleted_at?: string | null
          furniture_reserve?: number
          household_id: string
          id?: string
          insurance?: number
          internet?: number
          is_active?: boolean
          lawn_care?: number
          maintenance_reserve?: number
          market_label?: string | null
          model_type?: string
          monthly_rent?: number
          mortgage?: number
          name: string
          notes?: string | null
          occupancy_pct?: number
          other_expenses?: number
          platform_fees?: number
          property_management?: number
          property_taxes?: number
          rent_per_room?: number
          snow_removal?: number
          sort_order?: number
          updated_at?: string
          utilities?: number
        }
        Update: {
          advertising?: number
          annual_vacancy_pct?: number
          bedrooms?: number
          cash_invested?: number
          cleaning?: number
          created_at?: string
          deleted_at?: string | null
          furniture_reserve?: number
          household_id?: string
          id?: string
          insurance?: number
          internet?: number
          is_active?: boolean
          lawn_care?: number
          maintenance_reserve?: number
          market_label?: string | null
          model_type?: string
          monthly_rent?: number
          mortgage?: number
          name?: string
          notes?: string | null
          occupancy_pct?: number
          other_expenses?: number
          platform_fees?: number
          property_management?: number
          property_taxes?: number
          rent_per_room?: number
          snow_removal?: number
          sort_order?: number
          updated_at?: string
          utilities?: number
        }
        Relationships: [
          {
            foreignKeyName: "mh_income_scenarios_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      mh_markets: {
        Row: {
          cautions: string[]
          city: string | null
          classification: string[]
          created_at: string
          deleted_at: string | null
          household_id: string
          id: string
          name: string
          notes: string | null
          price_high: number
          price_low: number
          priority: string
          recommendation: string | null
          region: string
          rent_expected: number | null
          rent_low: number | null
          rent_strong: number | null
          sort_order: number
          updated_at: string
          zip: string | null
        }
        Insert: {
          cautions?: string[]
          city?: string | null
          classification?: string[]
          created_at?: string
          deleted_at?: string | null
          household_id: string
          id?: string
          name: string
          notes?: string | null
          price_high?: number
          price_low?: number
          priority?: string
          recommendation?: string | null
          region?: string
          rent_expected?: number | null
          rent_low?: number | null
          rent_strong?: number | null
          sort_order?: number
          updated_at?: string
          zip?: string | null
        }
        Update: {
          cautions?: string[]
          city?: string | null
          classification?: string[]
          created_at?: string
          deleted_at?: string | null
          household_id?: string
          id?: string
          name?: string
          notes?: string | null
          price_high?: number
          price_low?: number
          priority?: string
          recommendation?: string | null
          region?: string
          rent_expected?: number | null
          rent_low?: number | null
          rent_strong?: number | null
          sort_order?: number
          updated_at?: string
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mh_markets_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      mh_milestones: {
        Row: {
          completed_at: string | null
          created_at: string
          deleted_at: string | null
          household_id: string
          id: string
          is_complete: boolean
          notes: string | null
          phase: string | null
          sort_order: number
          target_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          household_id: string
          id?: string
          is_complete?: boolean
          notes?: string | null
          phase?: string | null
          sort_order?: number
          target_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          household_id?: string
          id?: string
          is_complete?: boolean
          notes?: string | null
          phase?: string | null
          sort_order?: number
          target_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mh_milestones_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      mh_properties: {
        Row: {
          address: string | null
          bathrooms: number
          bedrooms: number
          city: string | null
          compliance_verified: boolean
          condition_notes: string | null
          created_at: string
          deleted_at: string | null
          furnished_rent: number
          hoa_restrictions: boolean
          household_id: string
          id: string
          label: string
          laundry: boolean
          longterm_rent: number
          major_repairs_unresolved: boolean
          market_id: string | null
          minutes_to_hospital: number | null
          notes: string | null
          off_street_parking: boolean
          purchase_price: number
          reserves_available: number
          score_bedrooms: number | null
          score_cash_flow: number | null
          score_condition: number | null
          score_furnished_rent: number | null
          score_hospital_proximity: number | null
          score_laundry: number | null
          score_longterm_rent: number | null
          score_management: number | null
          score_neighborhood: number | null
          score_overall_risk: number | null
          score_parking: number | null
          score_purchase_price: number | null
          score_resale: number | null
          score_reserves: number | null
          score_safety: number | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          bathrooms?: number
          bedrooms?: number
          city?: string | null
          compliance_verified?: boolean
          condition_notes?: string | null
          created_at?: string
          deleted_at?: string | null
          furnished_rent?: number
          hoa_restrictions?: boolean
          household_id: string
          id?: string
          label: string
          laundry?: boolean
          longterm_rent?: number
          major_repairs_unresolved?: boolean
          market_id?: string | null
          minutes_to_hospital?: number | null
          notes?: string | null
          off_street_parking?: boolean
          purchase_price?: number
          reserves_available?: number
          score_bedrooms?: number | null
          score_cash_flow?: number | null
          score_condition?: number | null
          score_furnished_rent?: number | null
          score_hospital_proximity?: number | null
          score_laundry?: number | null
          score_longterm_rent?: number | null
          score_management?: number | null
          score_neighborhood?: number | null
          score_overall_risk?: number | null
          score_parking?: number | null
          score_purchase_price?: number | null
          score_resale?: number | null
          score_reserves?: number | null
          score_safety?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          bathrooms?: number
          bedrooms?: number
          city?: string | null
          compliance_verified?: boolean
          condition_notes?: string | null
          created_at?: string
          deleted_at?: string | null
          furnished_rent?: number
          hoa_restrictions?: boolean
          household_id?: string
          id?: string
          label?: string
          laundry?: boolean
          longterm_rent?: number
          major_repairs_unresolved?: boolean
          market_id?: string | null
          minutes_to_hospital?: number | null
          notes?: string | null
          off_street_parking?: boolean
          purchase_price?: number
          reserves_available?: number
          score_bedrooms?: number | null
          score_cash_flow?: number | null
          score_condition?: number | null
          score_furnished_rent?: number | null
          score_hospital_proximity?: number | null
          score_laundry?: number | null
          score_longterm_rent?: number | null
          score_management?: number | null
          score_neighborhood?: number | null
          score_overall_risk?: number | null
          score_parking?: number | null
          score_purchase_price?: number | null
          score_resale?: number | null
          score_reserves?: number | null
          score_safety?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mh_properties_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mh_properties_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "mh_markets"
            referencedColumns: ["id"]
          },
        ]
      }
      mh_settings: {
        Row: {
          available_reserves: number
          created_at: string
          deleted_at: string | null
          forecast_appreciation_pct: number
          forecast_avg_cash_flow: number
          forecast_avg_occupancy: number
          forecast_avg_rent: number
          forecast_avg_value: number
          forecast_ltv_pct: number
          forecast_reserve_per_property: number
          household_id: string
          id: string
          target_startup_high: number
          target_startup_low: number
          updated_at: string
          village_allocation_pct: number
          village_custom_amount: number | null
          village_fund_balance: number
          village_funding_goal: number
        }
        Insert: {
          available_reserves?: number
          created_at?: string
          deleted_at?: string | null
          forecast_appreciation_pct?: number
          forecast_avg_cash_flow?: number
          forecast_avg_occupancy?: number
          forecast_avg_rent?: number
          forecast_avg_value?: number
          forecast_ltv_pct?: number
          forecast_reserve_per_property?: number
          household_id: string
          id?: string
          target_startup_high?: number
          target_startup_low?: number
          updated_at?: string
          village_allocation_pct?: number
          village_custom_amount?: number | null
          village_fund_balance?: number
          village_funding_goal?: number
        }
        Update: {
          available_reserves?: number
          created_at?: string
          deleted_at?: string | null
          forecast_appreciation_pct?: number
          forecast_avg_cash_flow?: number
          forecast_avg_occupancy?: number
          forecast_avg_rent?: number
          forecast_avg_value?: number
          forecast_ltv_pct?: number
          forecast_reserve_per_property?: number
          household_id?: string
          id?: string
          target_startup_high?: number
          target_startup_low?: number
          updated_at?: string
          village_allocation_pct?: number
          village_custom_amount?: number | null
          village_fund_balance?: number
          village_funding_goal?: number
        }
        Relationships: [
          {
            foreignKeyName: "mh_settings_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: true
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      mh_startup_scenarios: {
        Row: {
          appliances: number
          appraisal_cost: number
          closing_costs: number
          created_at: string
          deleted_at: string | null
          down_payment_pct: number
          emergency_reserve: number
          furniture: number
          household_id: string
          id: string
          initial_cleaning: number
          initial_repairs: number
          inspection_cost: number
          insurance_deposit: number
          internet_setup: number
          is_active: boolean
          kitchen_supplies: number
          licensing_permits: number
          linens: number
          maintenance_reserve: number
          marketing: number
          name: string
          notes: string | null
          paint_cosmetic: number
          purchase_price: number
          range_high: number | null
          range_low: number | null
          security_system: number
          sort_order: number
          updated_at: string
          utility_deposits: number
          vacancy_reserve: number
        }
        Insert: {
          appliances?: number
          appraisal_cost?: number
          closing_costs?: number
          created_at?: string
          deleted_at?: string | null
          down_payment_pct?: number
          emergency_reserve?: number
          furniture?: number
          household_id: string
          id?: string
          initial_cleaning?: number
          initial_repairs?: number
          inspection_cost?: number
          insurance_deposit?: number
          internet_setup?: number
          is_active?: boolean
          kitchen_supplies?: number
          licensing_permits?: number
          linens?: number
          maintenance_reserve?: number
          marketing?: number
          name: string
          notes?: string | null
          paint_cosmetic?: number
          purchase_price?: number
          range_high?: number | null
          range_low?: number | null
          security_system?: number
          sort_order?: number
          updated_at?: string
          utility_deposits?: number
          vacancy_reserve?: number
        }
        Update: {
          appliances?: number
          appraisal_cost?: number
          closing_costs?: number
          created_at?: string
          deleted_at?: string | null
          down_payment_pct?: number
          emergency_reserve?: number
          furniture?: number
          household_id?: string
          id?: string
          initial_cleaning?: number
          initial_repairs?: number
          inspection_cost?: number
          insurance_deposit?: number
          internet_setup?: number
          is_active?: boolean
          kitchen_supplies?: number
          licensing_permits?: number
          linens?: number
          maintenance_reserve?: number
          marketing?: number
          name?: string
          notes?: string | null
          paint_cosmetic?: number
          purchase_price?: number
          range_high?: number | null
          range_low?: number | null
          security_system?: number
          sort_order?: number
          updated_at?: string
          utility_deposits?: number
          vacancy_reserve?: number
        }
        Relationships: [
          {
            foreignKeyName: "mh_startup_scenarios_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      money_leaks: {
        Row: {
          annual_cost: number
          created_at: string
          detail: Json
          detected_at: string
          dismissed_at: string | null
          fixed_at: string | null
          household_id: string
          id: string
          leak_type: string
          merchant: string | null
          monthly_cost: number
          recommended_fix: string | null
          risk_level: string
          source_id: string | null
          source_type: string | null
          status: string
          suggested_redirect: string | null
          three_year_cost: number
          title: string
          updated_at: string
        }
        Insert: {
          annual_cost?: number
          created_at?: string
          detail?: Json
          detected_at?: string
          dismissed_at?: string | null
          fixed_at?: string | null
          household_id: string
          id?: string
          leak_type: string
          merchant?: string | null
          monthly_cost?: number
          recommended_fix?: string | null
          risk_level?: string
          source_id?: string | null
          source_type?: string | null
          status?: string
          suggested_redirect?: string | null
          three_year_cost?: number
          title: string
          updated_at?: string
        }
        Update: {
          annual_cost?: number
          created_at?: string
          detail?: Json
          detected_at?: string
          dismissed_at?: string | null
          fixed_at?: string | null
          household_id?: string
          id?: string
          leak_type?: string
          merchant?: string | null
          monthly_cost?: number
          recommended_fix?: string | null
          risk_level?: string
          source_id?: string | null
          source_type?: string | null
          status?: string
          suggested_redirect?: string | null
          three_year_cost?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "money_leaks_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_financial_reviews: {
        Row: {
          concerns: Json | null
          created_at: string
          household_id: string
          id: string
          metrics: Json | null
          model_used: string | null
          period_month: string
          recommendations: Json | null
          summary_md: string | null
          updated_at: string
          user_id: string
          wins: Json | null
        }
        Insert: {
          concerns?: Json | null
          created_at?: string
          household_id: string
          id?: string
          metrics?: Json | null
          model_used?: string | null
          period_month: string
          recommendations?: Json | null
          summary_md?: string | null
          updated_at?: string
          user_id: string
          wins?: Json | null
        }
        Update: {
          concerns?: Json | null
          created_at?: string
          household_id?: string
          id?: string
          metrics?: Json | null
          model_used?: string | null
          period_month?: string
          recommendations?: Json | null
          summary_md?: string | null
          updated_at?: string
          user_id?: string
          wins?: Json | null
        }
        Relationships: []
      }
      paycheck_deployment_rules: {
        Row: {
          ai_rationale: string | null
          created_at: string
          dynamic_priority: number | null
          fixed_max: number
          fixed_min: number
          fixed_target: number
          guiltfree_max: number
          guiltfree_min: number
          guiltfree_target: number
          household_id: string
          id: string
          invest_max: number
          invest_min: number
          invest_target: number
          investment_account_id: string | null
          kungfoo_step: string | null
          nag_enabled: boolean
          nag_hours: number
          savings_account_id: string | null
          savings_max: number
          savings_min: number
          savings_target: number
          updated_at: string
        }
        Insert: {
          ai_rationale?: string | null
          created_at?: string
          dynamic_priority?: number | null
          fixed_max?: number
          fixed_min?: number
          fixed_target?: number
          guiltfree_max?: number
          guiltfree_min?: number
          guiltfree_target?: number
          household_id: string
          id?: string
          invest_max?: number
          invest_min?: number
          invest_target?: number
          investment_account_id?: string | null
          kungfoo_step?: string | null
          nag_enabled?: boolean
          nag_hours?: number
          savings_account_id?: string | null
          savings_max?: number
          savings_min?: number
          savings_target?: number
          updated_at?: string
        }
        Update: {
          ai_rationale?: string | null
          created_at?: string
          dynamic_priority?: number | null
          fixed_max?: number
          fixed_min?: number
          fixed_target?: number
          guiltfree_max?: number
          guiltfree_min?: number
          guiltfree_target?: number
          household_id?: string
          id?: string
          invest_max?: number
          invest_min?: number
          invest_target?: number
          investment_account_id?: string | null
          kungfoo_step?: string | null
          nag_enabled?: boolean
          nag_hours?: number
          savings_account_id?: string | null
          savings_max?: number
          savings_min?: number
          savings_target?: number
          updated_at?: string
        }
        Relationships: []
      }
      paycheck_deployments: {
        Row: {
          applied_at: string | null
          bills_amount: number
          bills_breakdown: Json
          buffer_amount: number
          confidence: string
          created_at: string
          extra_debt_amount: number
          frequency: string
          household_id: string
          id: string
          investment_amount: number
          min_debt_amount: number
          net_amount: number
          pay_date: string
          rationale: string | null
          safe_to_spend_amount: number
          savings_amount: number
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          applied_at?: string | null
          bills_amount?: number
          bills_breakdown?: Json
          buffer_amount?: number
          confidence?: string
          created_at?: string
          extra_debt_amount?: number
          frequency?: string
          household_id: string
          id?: string
          investment_amount?: number
          min_debt_amount?: number
          net_amount?: number
          pay_date: string
          rationale?: string | null
          safe_to_spend_amount?: number
          savings_amount?: number
          source?: string
          status?: string
          updated_at?: string
        }
        Update: {
          applied_at?: string | null
          bills_amount?: number
          bills_breakdown?: Json
          buffer_amount?: number
          confidence?: string
          created_at?: string
          extra_debt_amount?: number
          frequency?: string
          household_id?: string
          id?: string
          investment_amount?: number
          min_debt_amount?: number
          net_amount?: number
          pay_date?: string
          rationale?: string | null
          safe_to_spend_amount?: number
          savings_amount?: number
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "paycheck_deployments_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      plaid_items: {
        Row: {
          consent_expiration: string | null
          created_at: string
          household_id: string
          id: string
          institution_id: string | null
          institution_name: string | null
          plaid_access_token: string
          plaid_item_id: string
          provider_type: string
          status: string
          updated_at: string
        }
        Insert: {
          consent_expiration?: string | null
          created_at?: string
          household_id: string
          id?: string
          institution_id?: string | null
          institution_name?: string | null
          plaid_access_token: string
          plaid_item_id: string
          provider_type?: string
          status?: string
          updated_at?: string
        }
        Update: {
          consent_expiration?: string | null
          created_at?: string
          household_id?: string
          id?: string
          institution_id?: string | null
          institution_name?: string | null
          plaid_access_token?: string
          plaid_item_id?: string
          provider_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plaid_items_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          currency: string
          display_name: string | null
          financial_journey: string | null
          fiscal_month_start_day: number
          id: string
          trial_started_at: string
          updated_at: string
          user_id: string
          weekly_digest_enabled: boolean
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          currency?: string
          display_name?: string | null
          financial_journey?: string | null
          fiscal_month_start_day?: number
          id?: string
          trial_started_at?: string
          updated_at?: string
          user_id: string
          weekly_digest_enabled?: boolean
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          currency?: string
          display_name?: string | null
          financial_journey?: string | null
          fiscal_month_start_day?: number
          id?: string
          trial_started_at?: string
          updated_at?: string
          user_id?: string
          weekly_digest_enabled?: boolean
        }
        Relationships: []
      }
      purchase_guard_checks: {
        Row: {
          amount: number
          classification: string | null
          created_at: string
          days_delayed_freedom: number | null
          decided_at: string | null
          decision: string | null
          fit_breakdown: Json
          fit_score: number | null
          fomo_detected: boolean
          fomo_signals: string[]
          future_you_answer: string | null
          household_id: string
          id: string
          is_emotional: boolean | null
          legacy_impact_ack: boolean | null
          legacy_worth_delta: number | null
          merchant: string | null
          needwant: string | null
          override_pattern_flag: boolean | null
          override_reason: string | null
          planned_goal_id: string | null
          planned_target_date: string | null
          post_review_completed_at: string | null
          post_review_due_at: string | null
          post_review_notes: string | null
          post_review_worth_it: boolean | null
          purpose: string | null
          strategic_proof: Json | null
          swap_subscription_id: string | null
          updated_at: string
          user_id: string
          wait_required_hours: number
          wait_until: string | null
        }
        Insert: {
          amount: number
          classification?: string | null
          created_at?: string
          days_delayed_freedom?: number | null
          decided_at?: string | null
          decision?: string | null
          fit_breakdown?: Json
          fit_score?: number | null
          fomo_detected?: boolean
          fomo_signals?: string[]
          future_you_answer?: string | null
          household_id: string
          id?: string
          is_emotional?: boolean | null
          legacy_impact_ack?: boolean | null
          legacy_worth_delta?: number | null
          merchant?: string | null
          needwant?: string | null
          override_pattern_flag?: boolean | null
          override_reason?: string | null
          planned_goal_id?: string | null
          planned_target_date?: string | null
          post_review_completed_at?: string | null
          post_review_due_at?: string | null
          post_review_notes?: string | null
          post_review_worth_it?: boolean | null
          purpose?: string | null
          strategic_proof?: Json | null
          swap_subscription_id?: string | null
          updated_at?: string
          user_id: string
          wait_required_hours?: number
          wait_until?: string | null
        }
        Update: {
          amount?: number
          classification?: string | null
          created_at?: string
          days_delayed_freedom?: number | null
          decided_at?: string | null
          decision?: string | null
          fit_breakdown?: Json
          fit_score?: number | null
          fomo_detected?: boolean
          fomo_signals?: string[]
          future_you_answer?: string | null
          household_id?: string
          id?: string
          is_emotional?: boolean | null
          legacy_impact_ack?: boolean | null
          legacy_worth_delta?: number | null
          merchant?: string | null
          needwant?: string | null
          override_pattern_flag?: boolean | null
          override_reason?: string | null
          planned_goal_id?: string | null
          planned_target_date?: string | null
          post_review_completed_at?: string | null
          post_review_due_at?: string | null
          post_review_notes?: string | null
          post_review_worth_it?: boolean | null
          purpose?: string | null
          strategic_proof?: Json | null
          swap_subscription_id?: string | null
          updated_at?: string
          user_id?: string
          wait_required_hours?: number
          wait_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_guard_checks_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliation_audits: {
        Row: {
          ai_narrative: string | null
          audit_month: string
          completed_at: string | null
          created_at: string
          findings: Json
          household_id: string
          id: string
          status: string
          summary: Json
          trigger_type: string
        }
        Insert: {
          ai_narrative?: string | null
          audit_month: string
          completed_at?: string | null
          created_at?: string
          findings?: Json
          household_id: string
          id?: string
          status?: string
          summary?: Json
          trigger_type?: string
        }
        Update: {
          ai_narrative?: string | null
          audit_month?: string
          completed_at?: string | null
          created_at?: string
          findings?: Json
          household_id?: string
          id?: string
          status?: string
          summary?: Json
          trigger_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_audits_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      recovery_plans: {
        Row: {
          applied_at: string | null
          category_id: string | null
          category_name: string | null
          created_at: string
          household_id: string
          id: string
          month: string
          overage_amount: number
          pattern_type: string | null
          plan_type: string
          prevention_rule: string | null
          status: string
          steps: Json
          summary: string | null
          target_amount: number
          title: string
          updated_at: string
        }
        Insert: {
          applied_at?: string | null
          category_id?: string | null
          category_name?: string | null
          created_at?: string
          household_id: string
          id?: string
          month: string
          overage_amount?: number
          pattern_type?: string | null
          plan_type: string
          prevention_rule?: string | null
          status?: string
          steps?: Json
          summary?: string | null
          target_amount?: number
          title: string
          updated_at?: string
        }
        Update: {
          applied_at?: string | null
          category_id?: string | null
          category_name?: string | null
          created_at?: string
          household_id?: string
          id?: string
          month?: string
          overage_amount?: number
          pattern_type?: string | null
          plan_type?: string
          prevention_rule?: string | null
          status?: string
          steps?: Json
          summary?: string | null
          target_amount?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recovery_plans_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recovery_plans_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_transactions: {
        Row: {
          account_id: string
          amount: number
          autopay_enabled: boolean
          biller_url: string | null
          business_category_id: string | null
          business_split_pct: number
          category_id: string | null
          created_at: string
          end_date: string | null
          frequency: string
          household_id: string
          id: string
          is_active: boolean
          last_paid_date: string | null
          merchant: string | null
          next_due_date: string
          notes: string | null
          reminder_days: number
          start_date: string
          updated_at: string
        }
        Insert: {
          account_id: string
          amount: number
          autopay_enabled?: boolean
          biller_url?: string | null
          business_category_id?: string | null
          business_split_pct?: number
          category_id?: string | null
          created_at?: string
          end_date?: string | null
          frequency?: string
          household_id: string
          id?: string
          is_active?: boolean
          last_paid_date?: string | null
          merchant?: string | null
          next_due_date: string
          notes?: string | null
          reminder_days?: number
          start_date: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          amount?: number
          autopay_enabled?: boolean
          biller_url?: string | null
          business_category_id?: string | null
          business_split_pct?: number
          category_id?: string | null
          created_at?: string
          end_date?: string | null
          frequency?: string
          household_id?: string
          id?: string
          is_active?: boolean
          last_paid_date?: string | null
          merchant?: string | null
          next_due_date?: string
          notes?: string | null
          reminder_days?: number
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_business_category_id_fkey"
            columns: ["business_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      retirement_allocation_events: {
        Row: {
          created_at: string
          default_allocation: Json
          deleted_at: string | null
          event_date: string
          event_label: string
          event_type: string
          household_id: string
          id: string
          is_active: boolean
          monthly_amount: number | null
          notes: string | null
          updated_at: string
          user_allocation: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          default_allocation?: Json
          deleted_at?: string | null
          event_date: string
          event_label: string
          event_type: string
          household_id: string
          id?: string
          is_active?: boolean
          monthly_amount?: number | null
          notes?: string | null
          updated_at?: string
          user_allocation?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          default_allocation?: Json
          deleted_at?: string | null
          event_date?: string
          event_label?: string
          event_type?: string
          household_id?: string
          id?: string
          is_active?: boolean
          monthly_amount?: number | null
          notes?: string | null
          updated_at?: string
          user_allocation?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      retirement_allocation_settings: {
        Row: {
          annual_raise_pct: number
          created_at: string
          current_ee_contribution: number
          current_er_contribution: number
          current_monthly_salary: number
          employer_contribution_rate: number
          household_id: string
          hsa_coverage: string
          hsa_eligible: boolean
          hsa_max_target: number
          id: string
          inflation_mode: string
          roth_pct_default: number
          ss_age70_estimate: number
          updated_at: string
        }
        Insert: {
          annual_raise_pct?: number
          created_at?: string
          current_ee_contribution?: number
          current_er_contribution?: number
          current_monthly_salary?: number
          employer_contribution_rate?: number
          household_id: string
          hsa_coverage?: string
          hsa_eligible?: boolean
          hsa_max_target?: number
          id?: string
          inflation_mode?: string
          roth_pct_default?: number
          ss_age70_estimate?: number
          updated_at?: string
        }
        Update: {
          annual_raise_pct?: number
          created_at?: string
          current_ee_contribution?: number
          current_er_contribution?: number
          current_monthly_salary?: number
          employer_contribution_rate?: number
          household_id?: string
          hsa_coverage?: string
          hsa_eligible?: boolean
          hsa_max_target?: number
          id?: string
          inflation_mode?: string
          roth_pct_default?: number
          ss_age70_estimate?: number
          updated_at?: string
        }
        Relationships: []
      }
      retirement_recommendations: {
        Row: {
          allocations: Json | null
          created_at: string
          employer_benefits: Json | null
          household_id: string
          hsa_analysis: Json | null
          id: string
          next_dollar_target: string | null
          reasoning_md: string | null
          roth_vs_trad: Json | null
          score: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          allocations?: Json | null
          created_at?: string
          employer_benefits?: Json | null
          household_id: string
          hsa_analysis?: Json | null
          id?: string
          next_dollar_target?: string | null
          reasoning_md?: string | null
          roth_vs_trad?: Json | null
          score?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          allocations?: Json | null
          created_at?: string
          employer_benefits?: Json | null
          household_id?: string
          hsa_analysis?: Json | null
          id?: string
          next_dollar_target?: string | null
          reasoning_md?: string | null
          roth_vs_trad?: Json | null
          score?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      roadmap_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          household_id: string
          id: string
          is_completed: boolean
          notes: string | null
          step_number: number
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          household_id: string
          id?: string
          is_completed?: boolean
          notes?: string | null
          step_number: number
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          household_id?: string
          id?: string
          is_completed?: boolean
          notes?: string | null
          step_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_progress_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_tax_responses: {
        Row: {
          created_at: string
          id: string
          question: string
          response: string
          tags: string[] | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          question: string
          response: string
          tags?: string[] | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          question?: string
          response?: string
          tags?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      score_scenarios: {
        Row: {
          actions: Json
          baseline_score: number
          created_at: string
          household_id: string
          id: string
          name: string
          notes: string | null
          projected_score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          actions?: Json
          baseline_score: number
          created_at?: string
          household_id: string
          id?: string
          name: string
          notes?: string | null
          projected_score: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          actions?: Json
          baseline_score?: number
          created_at?: string
          household_id?: string
          id?: string
          name?: string
          notes?: string | null
          projected_score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "score_scenarios_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      site_content: {
        Row: {
          key: string
          kind: string
          updated_at: string
          updated_by: string | null
          value: string | null
        }
        Insert: {
          key: string
          kind?: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          key?: string
          kind?: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Relationships: []
      }
      snaptrade_connections: {
        Row: {
          brokerage_authorization_id: string | null
          created_at: string
          household_id: string
          id: string
          institution_name: string | null
          snaptrade_user_id: string
          snaptrade_user_secret: string
          status: string
          updated_at: string
        }
        Insert: {
          brokerage_authorization_id?: string | null
          created_at?: string
          household_id: string
          id?: string
          institution_name?: string | null
          snaptrade_user_id: string
          snaptrade_user_secret: string
          status?: string
          updated_at?: string
        }
        Update: {
          brokerage_authorization_id?: string | null
          created_at?: string
          household_id?: string
          id?: string
          institution_name?: string | null
          snaptrade_user_id?: string
          snaptrade_user_secret?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "snaptrade_connections_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      spending_plans: {
        Row: {
          balance_sheet: Json
          buckets: Json
          created_at: string
          deleted_at: string | null
          household_id: string
          id: string
          income: Json
          name: string
          updated_at: string
        }
        Insert: {
          balance_sheet?: Json
          buckets?: Json
          created_at?: string
          deleted_at?: string | null
          household_id: string
          id?: string
          income?: Json
          name?: string
          updated_at?: string
        }
        Update: {
          balance_sheet?: Json
          buckets?: Json
          created_at?: string
          deleted_at?: string | null
          household_id?: string
          id?: string
          income?: Json
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "spending_plans_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      subcategories: {
        Row: {
          category_id: string
          color: string
          created_at: string
          household_id: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          category_id: string
          color?: string
          created_at?: string
          household_id: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          category_id?: string
          color?: string
          created_at?: string
          household_id?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcategories_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          account_id: string | null
          average_amount: number
          business_category_id: string | null
          business_split_pct: number
          cancel_reminder_date: string | null
          cancellation_confirmed_at: string | null
          cancellation_difficulty: string
          cancellation_notes: string | null
          cancellation_requested_at: string | null
          cancellation_status: string
          category_id: string | null
          created_at: string
          frequency: string
          household_id: string
          id: string
          is_active: boolean
          is_cancelled: boolean
          last_charge_date: string | null
          merchant: string
          next_expected_date: string | null
          normalized_merchant: string | null
          notes: string | null
          savings_reallocated_to: string | null
          updated_at: string
          usage_status: string
          user_usage_override: string | null
        }
        Insert: {
          account_id?: string | null
          average_amount?: number
          business_category_id?: string | null
          business_split_pct?: number
          cancel_reminder_date?: string | null
          cancellation_confirmed_at?: string | null
          cancellation_difficulty?: string
          cancellation_notes?: string | null
          cancellation_requested_at?: string | null
          cancellation_status?: string
          category_id?: string | null
          created_at?: string
          frequency?: string
          household_id: string
          id?: string
          is_active?: boolean
          is_cancelled?: boolean
          last_charge_date?: string | null
          merchant: string
          next_expected_date?: string | null
          normalized_merchant?: string | null
          notes?: string | null
          savings_reallocated_to?: string | null
          updated_at?: string
          usage_status?: string
          user_usage_override?: string | null
        }
        Update: {
          account_id?: string | null
          average_amount?: number
          business_category_id?: string | null
          business_split_pct?: number
          cancel_reminder_date?: string | null
          cancellation_confirmed_at?: string | null
          cancellation_difficulty?: string
          cancellation_notes?: string | null
          cancellation_requested_at?: string | null
          cancellation_status?: string
          category_id?: string | null
          created_at?: string
          frequency?: string
          household_id?: string
          id?: string
          is_active?: boolean
          is_cancelled?: boolean
          last_charge_date?: string | null
          merchant?: string
          next_expected_date?: string | null
          normalized_merchant?: string | null
          notes?: string | null
          savings_reallocated_to?: string | null
          updated_at?: string
          usage_status?: string
          user_usage_override?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_business_category_id_fkey"
            columns: ["business_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      thv_budgets: {
        Row: {
          contingency_pct: number
          cost_per_home: number
          created_at: string
          deleted_at: string | null
          funding_secured: number
          homes_count: number
          household_id: string
          id: string
          line_items: Json
          name: string
          notes: string | null
          scenario: string
          updated_at: string
        }
        Insert: {
          contingency_pct?: number
          cost_per_home?: number
          created_at?: string
          deleted_at?: string | null
          funding_secured?: number
          homes_count?: number
          household_id: string
          id?: string
          line_items?: Json
          name?: string
          notes?: string | null
          scenario?: string
          updated_at?: string
        }
        Update: {
          contingency_pct?: number
          cost_per_home?: number
          created_at?: string
          deleted_at?: string | null
          funding_secured?: number
          homes_count?: number
          household_id?: string
          id?: string
          line_items?: Json
          name?: string
          notes?: string | null
          scenario?: string
          updated_at?: string
        }
        Relationships: []
      }
      thv_documents: {
        Row: {
          created_at: string
          deleted_at: string | null
          doc_type: string
          external_url: string | null
          household_id: string
          id: string
          notes: string | null
          status: string
          storage_path: string | null
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          doc_type?: string
          external_url?: string | null
          household_id: string
          id?: string
          notes?: string | null
          status?: string
          storage_path?: string | null
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          doc_type?: string
          external_url?: string | null
          household_id?: string
          id?: string
          notes?: string | null
          status?: string
          storage_path?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      thv_funding: {
        Row: {
          application_date: string | null
          application_deadline: string | null
          category: string
          committed_amount: number
          contact_person: string | null
          created_at: string
          decision_date: string | null
          deleted_at: string | null
          follow_up_date: string | null
          household_id: string
          id: string
          is_inkind: boolean
          notes: string | null
          received_amount: number
          reporting_requirements: string | null
          requested_amount: number
          restrictions: string | null
          source: string
          status: string
          target_amount: number
          updated_at: string
        }
        Insert: {
          application_date?: string | null
          application_deadline?: string | null
          category?: string
          committed_amount?: number
          contact_person?: string | null
          created_at?: string
          decision_date?: string | null
          deleted_at?: string | null
          follow_up_date?: string | null
          household_id: string
          id?: string
          is_inkind?: boolean
          notes?: string | null
          received_amount?: number
          reporting_requirements?: string | null
          requested_amount?: number
          restrictions?: string | null
          source: string
          status?: string
          target_amount?: number
          updated_at?: string
        }
        Update: {
          application_date?: string | null
          application_deadline?: string | null
          category?: string
          committed_amount?: number
          contact_person?: string | null
          created_at?: string
          decision_date?: string | null
          deleted_at?: string | null
          follow_up_date?: string | null
          household_id?: string
          id?: string
          is_inkind?: boolean
          notes?: string | null
          received_amount?: number
          reporting_requirements?: string | null
          requested_amount?: number
          restrictions?: string | null
          source?: string
          status?: string
          target_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      thv_impact: {
        Row: {
          created_at: string
          deleted_at: string | null
          household_id: string
          id: string
          metrics: Json
          notes: string | null
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          household_id: string
          id?: string
          metrics?: Json
          notes?: string | null
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          household_id?: string
          id?: string
          metrics?: Json
          notes?: string | null
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      thv_operating_budget: {
        Row: {
          created_at: string
          expenses: Json
          homes_count: number
          household_id: string
          id: string
          income: Json
          notes: string | null
          reserve_months: number
          residents_count: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          expenses?: Json
          homes_count?: number
          household_id: string
          id?: string
          income?: Json
          notes?: string | null
          reserve_months?: number
          residents_count?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          expenses?: Json
          homes_count?: number
          household_id?: string
          id?: string
          income?: Json
          notes?: string | null
          reserve_months?: number
          residents_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      thv_partners: {
        Row: {
          agreement_status: string | null
          category: string
          contact_person: string | null
          created_at: string
          date_contacted: string | null
          deleted_at: string | null
          email: string | null
          financial_commitment: number | null
          follow_up_date: string | null
          household_id: string
          id: string
          inkind_commitment: string | null
          notes: string | null
          organization: string
          phone: string | null
          proposed_contribution: string | null
          role: string | null
          status: string
          updated_at: string
          volunteer_commitment: string | null
        }
        Insert: {
          agreement_status?: string | null
          category?: string
          contact_person?: string | null
          created_at?: string
          date_contacted?: string | null
          deleted_at?: string | null
          email?: string | null
          financial_commitment?: number | null
          follow_up_date?: string | null
          household_id: string
          id?: string
          inkind_commitment?: string | null
          notes?: string | null
          organization: string
          phone?: string | null
          proposed_contribution?: string | null
          role?: string | null
          status?: string
          updated_at?: string
          volunteer_commitment?: string | null
        }
        Update: {
          agreement_status?: string | null
          category?: string
          contact_person?: string | null
          created_at?: string
          date_contacted?: string | null
          deleted_at?: string | null
          email?: string | null
          financial_commitment?: number | null
          follow_up_date?: string | null
          household_id?: string
          id?: string
          inkind_commitment?: string | null
          notes?: string | null
          organization?: string
          phone?: string | null
          proposed_contribution?: string | null
          role?: string | null
          status?: string
          updated_at?: string
          volunteer_commitment?: string | null
        }
        Relationships: []
      }
      thv_programs: {
        Row: {
          capacity: number | null
          completion_rate: number | null
          created_at: string
          deleted_at: string | null
          description: string | null
          est_cost: number | null
          frequency: string | null
          funding_source: string | null
          household_id: string
          id: string
          name: string
          notes: string | null
          owner: string | null
          participation_rate: number | null
          partner: string | null
          sort_order: number
          status: string
          success_measure: string | null
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          completion_rate?: number | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          est_cost?: number | null
          frequency?: string | null
          funding_source?: string | null
          household_id: string
          id?: string
          name: string
          notes?: string | null
          owner?: string | null
          participation_rate?: number | null
          partner?: string | null
          sort_order?: number
          status?: string
          success_measure?: string | null
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          completion_rate?: number | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          est_cost?: number | null
          frequency?: string | null
          funding_source?: string | null
          household_id?: string
          id?: string
          name?: string
          notes?: string | null
          owner?: string | null
          participation_rate?: number | null
          partner?: string | null
          sort_order?: number
          status?: string
          success_measure?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      thv_residents: {
        Row: {
          created_at: string
          credit_improved: boolean
          deleted_at: string | null
          emergency_savings: number
          employed: boolean
          enrolled_education: boolean
          expected_exit_date: string | null
          finished_financial_ed: boolean
          has_bank_account: boolean
          household_id: string
          housing_model: string | null
          id: string
          mentor_assigned: boolean
          move_in_date: string | null
          notes: string | null
          readiness_score: number
          reliable_transportation: boolean
          resident_code: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credit_improved?: boolean
          deleted_at?: string | null
          emergency_savings?: number
          employed?: boolean
          enrolled_education?: boolean
          expected_exit_date?: string | null
          finished_financial_ed?: boolean
          has_bank_account?: boolean
          household_id: string
          housing_model?: string | null
          id?: string
          mentor_assigned?: boolean
          move_in_date?: string | null
          notes?: string | null
          readiness_score?: number
          reliable_transportation?: boolean
          resident_code: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credit_improved?: boolean
          deleted_at?: string | null
          emergency_savings?: number
          employed?: boolean
          enrolled_education?: boolean
          expected_exit_date?: string | null
          finished_financial_ed?: boolean
          has_bank_account?: boolean
          household_id?: string
          housing_model?: string | null
          id?: string
          mentor_assigned?: boolean
          move_in_date?: string | null
          notes?: string | null
          readiness_score?: number
          reliable_transportation?: boolean
          resident_code?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      thv_risks: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          financial_impact: string
          household_id: string
          id: string
          mitigation_plan: string | null
          overall_rating: string
          owner: string | null
          probability: string
          program_impact: string
          review_date: string | null
          risk: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          financial_impact?: string
          household_id: string
          id?: string
          mitigation_plan?: string | null
          overall_rating?: string
          owner?: string | null
          probability?: string
          program_impact?: string
          review_date?: string | null
          risk: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          financial_impact?: string
          household_id?: string
          id?: string
          mitigation_plan?: string | null
          overall_rating?: string
          owner?: string | null
          probability?: string
          program_impact?: string
          review_date?: string | null
          risk?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      thv_settings: {
        Row: {
          allocation_fixed_annual: number
          allocation_mode: string
          allocation_percent: number
          allocation_refi_percent: number
          allocation_sale_percent: number
          approvals_completed: number
          community_partners: number
          created_at: string
          current_phase: string
          est_construction_cost: number
          est_land_cost: number
          est_total_cost: number
          funding_pending: number
          funding_secured: number
          household_id: string
          housing_models: Json
          id: string
          mh_annual_net_profit: number
          mission: string
          next_milestone: string
          notes: string | null
          planned_homes: number
          progress: Json
          residency_rules: Json
          residents_served: number
          responsible_owner: string
          risk_rating: string
          target_location: string
          target_opening_date: string | null
          updated_at: string
          village_fund_balance: number
        }
        Insert: {
          allocation_fixed_annual?: number
          allocation_mode?: string
          allocation_percent?: number
          allocation_refi_percent?: number
          allocation_sale_percent?: number
          approvals_completed?: number
          community_partners?: number
          created_at?: string
          current_phase?: string
          est_construction_cost?: number
          est_land_cost?: number
          est_total_cost?: number
          funding_pending?: number
          funding_secured?: number
          household_id: string
          housing_models?: Json
          id?: string
          mh_annual_net_profit?: number
          mission?: string
          next_milestone?: string
          notes?: string | null
          planned_homes?: number
          progress?: Json
          residency_rules?: Json
          residents_served?: number
          responsible_owner?: string
          risk_rating?: string
          target_location?: string
          target_opening_date?: string | null
          updated_at?: string
          village_fund_balance?: number
        }
        Update: {
          allocation_fixed_annual?: number
          allocation_mode?: string
          allocation_percent?: number
          allocation_refi_percent?: number
          allocation_sale_percent?: number
          approvals_completed?: number
          community_partners?: number
          created_at?: string
          current_phase?: string
          est_construction_cost?: number
          est_land_cost?: number
          est_total_cost?: number
          funding_pending?: number
          funding_secured?: number
          household_id?: string
          housing_models?: Json
          id?: string
          mh_annual_net_profit?: number
          mission?: string
          next_milestone?: string
          notes?: string | null
          planned_homes?: number
          progress?: Json
          residency_rules?: Json
          residents_served?: number
          responsible_owner?: string
          risk_rating?: string
          target_location?: string
          target_opening_date?: string | null
          updated_at?: string
          village_fund_balance?: number
        }
        Relationships: []
      }
      thv_sites: {
        Row: {
          acreage: number | null
          approval_status: string
          asking_price: number | null
          city: string | null
          county: string | null
          created_at: string
          current_use: string | null
          deleted_at: string | null
          demolition_required: string | null
          dist_education: number | null
          dist_employers: number | null
          dist_grocery: number | null
          dist_healthcare: number | null
          dist_social_services: number | null
          electric_access: boolean
          environmental_concerns: string | null
          est_infrastructure_cost: number | null
          gas_access: boolean
          government_support: string | null
          homes_allowed: number | null
          household_id: string
          id: string
          internet_access: boolean
          name: string
          neighborhood_support: string | null
          notes: string | null
          parcel_number: string | null
          road_access: string | null
          scores: Json
          sewer_access: boolean
          site_prep_required: string | null
          street_address: string | null
          transit_access: string | null
          updated_at: string
          water_access: boolean
          zoning_classification: string | null
        }
        Insert: {
          acreage?: number | null
          approval_status?: string
          asking_price?: number | null
          city?: string | null
          county?: string | null
          created_at?: string
          current_use?: string | null
          deleted_at?: string | null
          demolition_required?: string | null
          dist_education?: number | null
          dist_employers?: number | null
          dist_grocery?: number | null
          dist_healthcare?: number | null
          dist_social_services?: number | null
          electric_access?: boolean
          environmental_concerns?: string | null
          est_infrastructure_cost?: number | null
          gas_access?: boolean
          government_support?: string | null
          homes_allowed?: number | null
          household_id: string
          id?: string
          internet_access?: boolean
          name: string
          neighborhood_support?: string | null
          notes?: string | null
          parcel_number?: string | null
          road_access?: string | null
          scores?: Json
          sewer_access?: boolean
          site_prep_required?: string | null
          street_address?: string | null
          transit_access?: string | null
          updated_at?: string
          water_access?: boolean
          zoning_classification?: string | null
        }
        Update: {
          acreage?: number | null
          approval_status?: string
          asking_price?: number | null
          city?: string | null
          county?: string | null
          created_at?: string
          current_use?: string | null
          deleted_at?: string | null
          demolition_required?: string | null
          dist_education?: number | null
          dist_employers?: number | null
          dist_grocery?: number | null
          dist_healthcare?: number | null
          dist_social_services?: number | null
          electric_access?: boolean
          environmental_concerns?: string | null
          est_infrastructure_cost?: number | null
          gas_access?: boolean
          government_support?: string | null
          homes_allowed?: number | null
          household_id?: string
          id?: string
          internet_access?: boolean
          name?: string
          neighborhood_support?: string | null
          notes?: string | null
          parcel_number?: string | null
          road_access?: string | null
          scores?: Json
          sewer_access?: boolean
          site_prep_required?: string | null
          street_address?: string | null
          transit_access?: string | null
          updated_at?: string
          water_access?: boolean
          zoning_classification?: string | null
        }
        Relationships: []
      }
      thv_tasks: {
        Row: {
          created_at: string
          deleted_at: string | null
          due_date: string | null
          household_id: string
          id: string
          notes: string | null
          owner: string | null
          phase: number
          sort_order: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          due_date?: string | null
          household_id: string
          id?: string
          notes?: string | null
          owner?: string | null
          phase?: number
          sort_order?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          due_date?: string | null
          household_id?: string
          id?: string
          notes?: string | null
          owner?: string | null
          phase?: number
          sort_order?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      transaction_splits: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          id: string
          notes: string | null
          transaction_id: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          transaction_id: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_splits_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_splits_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          category_id: string | null
          created_at: string
          date: string
          deleted_at: string | null
          household_id: string
          id: string
          is_transfer: boolean
          merchant: string | null
          needs_review: boolean
          normalized_merchant: string | null
          notes: string | null
          provider_transaction_id: string | null
          receipt_url: string | null
          tags: string[] | null
          transfer_pair_id: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          amount: number
          category_id?: string | null
          created_at?: string
          date: string
          deleted_at?: string | null
          household_id: string
          id?: string
          is_transfer?: boolean
          merchant?: string | null
          needs_review?: boolean
          normalized_merchant?: string | null
          notes?: string | null
          provider_transaction_id?: string | null
          receipt_url?: string | null
          tags?: string[] | null
          transfer_pair_id?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          amount?: number
          category_id?: string | null
          created_at?: string
          date?: string
          deleted_at?: string | null
          household_id?: string
          id?: string
          is_transfer?: boolean
          merchant?: string | null
          needs_review?: boolean
          normalized_merchant?: string | null
          notes?: string | null
          provider_transaction_id?: string | null
          receipt_url?: string | null
          tags?: string[] | null
          transfer_pair_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_transfer_pair_id_fkey"
            columns: ["transfer_pair_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_progression: {
        Row: {
          belt_earned_at: string
          celebration_seen: boolean
          created_at: string
          current_belt: string
          history: Json
          household_id: string
          id: string
          milestones_completed: Json
          next_requirements: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          belt_earned_at?: string
          celebration_seen?: boolean
          created_at?: string
          current_belt?: string
          history?: Json
          household_id: string
          id?: string
          milestones_completed?: Json
          next_requirements?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          belt_earned_at?: string
          celebration_seen?: boolean
          created_at?: string
          current_belt?: string
          history?: Json
          household_id?: string
          id?: string
          milestones_completed?: Json
          next_requirements?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_progression_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      ab_experiment_results: {
        Row: {
          click_through_rate: number | null
          clicks: number | null
          conversion_rate: number | null
          conversions: number | null
          experiment_id: string | null
          experiment_name: string | null
          impressions: number | null
          is_control: boolean | null
          status: string | null
          variant_id: string | null
          variant_key: string | null
          variant_name: string | null
        }
        Relationships: []
      }
      plaid_items_safe: {
        Row: {
          consent_expiration: string | null
          created_at: string | null
          household_id: string | null
          id: string | null
          institution_id: string | null
          institution_name: string | null
          plaid_item_id: string | null
          status: string | null
          updated_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_household_invitation: {
        Args: { _invitation_id: string }
        Returns: string
      }
      create_household_for_user: { Args: { _name?: string }; Returns: string }
      get_plaid_items_safe: {
        Args: never
        Returns: {
          consent_expiration: string
          created_at: string
          household_id: string
          id: string
          institution_id: string
          institution_name: string
          plaid_item_id: string
          status: string
          updated_at: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_household_member: {
        Args: { _household_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      account_type:
        | "checking"
        | "savings"
        | "credit"
        | "investment"
        | "loan"
        | "other"
      app_role: "founder" | "admin" | "user"
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
      account_type: [
        "checking",
        "savings",
        "credit",
        "investment",
        "loan",
        "other",
      ],
      app_role: ["founder", "admin", "user"],
    },
  },
} as const
