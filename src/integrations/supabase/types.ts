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
      accounts: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          balance: number
          created_at: string
          currency: string
          household_id: string
          id: string
          institution: string | null
          is_active: boolean
          last_synced_at: string | null
          name: string
          provider_account_id: string | null
          provider_type: string | null
          updated_at: string
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"]
          balance?: number
          created_at?: string
          currency?: string
          household_id: string
          id?: string
          institution?: string | null
          is_active?: boolean
          last_synced_at?: string | null
          name: string
          provider_account_id?: string | null
          provider_type?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          balance?: number
          created_at?: string
          currency?: string
          household_id?: string
          id?: string
          institution?: string | null
          is_active?: boolean
          last_synced_at?: string | null
          name?: string
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
          group_id: string
          household_id: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          color?: string
          created_at?: string
          group_id: string
          household_id: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          color?: string
          created_at?: string
          group_id?: string
          household_id?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: [
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
          high_balance: number | null
          household_id: string
          id: string
          monthly_payment: number | null
          notes: string | null
          payment_history: string | null
          remarks_codes: string | null
          responsibility: string | null
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
          high_balance?: number | null
          household_id: string
          id?: string
          monthly_payment?: number | null
          notes?: string | null
          payment_history?: string | null
          remarks_codes?: string | null
          responsibility?: string | null
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
          high_balance?: number | null
          household_id?: string
          id?: string
          monthly_payment?: number | null
          notes?: string | null
          payment_history?: string | null
          remarks_codes?: string | null
          responsibility?: string | null
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
          created_at: string
          credit_account_id: string | null
          dispute_reason: string
          explanation: string | null
          household_id: string
          id: string
          metro2_violation: string | null
          outcome: string | null
          outcome_notes: string | null
          response_due_date: string | null
          response_received_date: string | null
          status: string
          submitted_date: string | null
          updated_at: string
        }
        Insert: {
          bureau: string
          created_at?: string
          credit_account_id?: string | null
          dispute_reason: string
          explanation?: string | null
          household_id: string
          id?: string
          metro2_violation?: string | null
          outcome?: string | null
          outcome_notes?: string | null
          response_due_date?: string | null
          response_received_date?: string | null
          status?: string
          submitted_date?: string | null
          updated_at?: string
        }
        Update: {
          bureau?: string
          created_at?: string
          credit_account_id?: string | null
          dispute_reason?: string
          explanation?: string | null
          household_id?: string
          id?: string
          metro2_violation?: string | null
          outcome?: string | null
          outcome_notes?: string | null
          response_due_date?: string | null
          response_received_date?: string | null
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
        ]
      }
      debt_items: {
        Row: {
          account_id: string | null
          balance: number
          created_at: string
          id: string
          interest_rate: number
          minimum_payment: number
          name: string
          plan_id: string
          sort_order: number
        }
        Insert: {
          account_id?: string | null
          balance?: number
          created_at?: string
          id?: string
          interest_rate?: number
          minimum_payment?: number
          name: string
          plan_id: string
          sort_order?: number
        }
        Update: {
          account_id?: string | null
          balance?: number
          created_at?: string
          id?: string
          interest_rate?: number
          minimum_payment?: number
          name?: string
          plan_id?: string
          sort_order?: number
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
          updated_at?: string
          user_id?: string
          weekly_digest_enabled?: boolean
        }
        Relationships: []
      }
      recurring_transactions: {
        Row: {
          account_id: string
          amount: number
          category_id: string | null
          created_at: string
          end_date: string | null
          frequency: string
          household_id: string
          id: string
          is_active: boolean
          merchant: string | null
          next_due_date: string
          notes: string | null
          start_date: string
          updated_at: string
        }
        Insert: {
          account_id: string
          amount: number
          category_id?: string | null
          created_at?: string
          end_date?: string | null
          frequency?: string
          household_id: string
          id?: string
          is_active?: boolean
          merchant?: string | null
          next_due_date: string
          notes?: string | null
          start_date: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          amount?: number
          category_id?: string | null
          created_at?: string
          end_date?: string | null
          frequency?: string
          household_id?: string
          id?: string
          is_active?: boolean
          merchant?: string | null
          next_due_date?: string
          notes?: string | null
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
          average_amount: number
          cancel_reminder_date: string | null
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
          updated_at: string
        }
        Insert: {
          average_amount?: number
          cancel_reminder_date?: string | null
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
          updated_at?: string
        }
        Update: {
          average_amount?: number
          cancel_reminder_date?: string | null
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
          updated_at?: string
        }
        Relationships: [
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
    }
    Views: {
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
    },
  },
} as const
