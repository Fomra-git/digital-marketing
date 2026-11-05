export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          changes: NonNullable<Json>;
          company_id: string | null;
          created_at: string;
          entity_id: string | null;
          entity_type: string;
          id: string;
          organization_id: string;
          project_id: string | null;
          summary: string | null;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor_id?: string | null;
          changes?: NonNullable<Json>;
          company_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type: string;
          id?: string;
          organization_id: string;
          project_id?: string | null;
          summary?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          changes?: NonNullable<Json>;
          company_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string;
          id?: string;
          organization_id?: string;
          project_id?: string | null;
          summary?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "activity_logs_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activity_logs_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activity_logs_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activity_logs_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      ad_accounts: {
        Row: {
          company_id: string;
          connection_id: string | null;
          created_at: string;
          created_by: string | null;
          currency: string;
          data_source: string;
          deleted_at: string | null;
          external_account_id: string | null;
          id: string;
          is_manager_account: boolean;
          last_synced_at: string | null;
          name: string;
          parent_account_id: string | null;
          platform: string;
          project_id: string | null;
          status: string;
          sync_enabled: boolean;
          timezone: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          company_id: string;
          connection_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          data_source?: string;
          deleted_at?: string | null;
          external_account_id?: string | null;
          id?: string;
          is_manager_account?: boolean;
          last_synced_at?: string | null;
          name: string;
          parent_account_id?: string | null;
          platform: string;
          project_id?: string | null;
          status?: string;
          sync_enabled?: boolean;
          timezone?: string | null;
          updated_at?: string;
        };
        Update: {
          company_id?: string;
          connection_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          data_source?: string;
          deleted_at?: string | null;
          external_account_id?: string | null;
          id?: string;
          is_manager_account?: boolean;
          last_synced_at?: string | null;
          name?: string;
          parent_account_id?: string | null;
          platform?: string;
          project_id?: string | null;
          status?: string;
          sync_enabled?: boolean;
          timezone?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ad_accounts_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ad_accounts_connection_id_fkey";
            columns: ["connection_id"];
            isOneToOne: false;
            referencedRelation: "ad_platform_connections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ad_accounts_parent_account_id_fkey";
            columns: ["parent_account_id"];
            isOneToOne: false;
            referencedRelation: "ad_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ad_accounts_project_id_company_id_fkey";
            columns: ["project_id", "company_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id", "company_id"];
          },
        ];
      };
      ad_alerts: {
        Row: {
          acknowledged_by: string | null;
          ad_account_id: string | null;
          alert_type: string;
          campaign_id: string | null;
          company_id: string;
          created_at: string;
          details: NonNullable<Json>;
          detected_at: string;
          id: string;
          message: string | null;
          platform: string | null;
          project_id: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          severity: string;
          status: string;
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          acknowledged_by?: string | null;
          ad_account_id?: string | null;
          alert_type: string;
          campaign_id?: string | null;
          company_id: string;
          created_at?: string;
          details?: NonNullable<Json>;
          detected_at?: string;
          id?: string;
          message?: string | null;
          platform?: string | null;
          project_id?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          severity?: string;
          status?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          acknowledged_by?: string | null;
          ad_account_id?: string | null;
          alert_type?: string;
          campaign_id?: string | null;
          company_id?: string;
          created_at?: string;
          details?: NonNullable<Json>;
          detected_at?: string;
          id?: string;
          message?: string | null;
          platform?: string | null;
          project_id?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          severity?: string;
          status?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ad_alerts_ad_account_id_fkey";
            columns: ["ad_account_id"];
            isOneToOne: false;
            referencedRelation: "ad_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ad_alerts_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "ad_campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ad_alerts_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ad_alerts_project_id_company_id_fkey";
            columns: ["project_id", "company_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id", "company_id"];
          },
        ];
      };
      ad_campaign_metrics: {
        Row: {
          breakdown_type: string;
          breakdown_value: string;
          campaign_id: string;
          clicks: number;
          conversion_value: number;
          conversions: number;
          created_at: string;
          entity_external_id: string;
          entity_name: string | null;
          id: string;
          impressions: number;
          leads: number;
          level: string;
          link_clicks: number | null;
          metric_date: string;
          purchases: number | null;
          reach: number | null;
          recorded_by: string | null;
          source: string;
          spend: number;
          sync_log_id: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          breakdown_type?: string;
          breakdown_value?: string;
          campaign_id: string;
          clicks?: number;
          conversion_value?: number;
          conversions?: number;
          created_at?: string;
          entity_external_id?: string;
          entity_name?: string | null;
          id?: string;
          impressions?: number;
          leads?: number;
          level?: string;
          link_clicks?: number | null;
          metric_date: string;
          purchases?: number | null;
          reach?: number | null;
          recorded_by?: string | null;
          source?: string;
          spend?: number;
          sync_log_id?: string | null;
          updated_at?: string;
        };
        Update: {
          breakdown_type?: string;
          breakdown_value?: string;
          campaign_id?: string;
          clicks?: number;
          conversion_value?: number;
          conversions?: number;
          created_at?: string;
          entity_external_id?: string;
          entity_name?: string | null;
          id?: string;
          impressions?: number;
          leads?: number;
          level?: string;
          link_clicks?: number | null;
          metric_date?: string;
          purchases?: number | null;
          reach?: number | null;
          recorded_by?: string | null;
          source?: string;
          spend?: number;
          sync_log_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ad_campaign_metrics_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "ad_campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ad_campaign_metrics_sync_log_fk";
            columns: ["sync_log_id"];
            isOneToOne: false;
            referencedRelation: "ad_sync_logs";
            referencedColumns: ["id"];
          },
        ];
      };
      ad_campaigns: {
        Row: {
          ad_account_id: string;
          campaign_type: string | null;
          company_id: string;
          created_at: string;
          created_by: string | null;
          currency: string;
          daily_budget: number | null;
          data_source: string;
          deleted_at: string | null;
          effective_status: string | null;
          end_date: string | null;
          external_campaign_id: string | null;
          id: string;
          last_synced_at: string | null;
          lifetime_budget: number | null;
          name: string;
          objective: string | null;
          platform: string;
          project_id: string | null;
          start_date: string | null;
          status: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          ad_account_id: string;
          campaign_type?: string | null;
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          daily_budget?: number | null;
          data_source?: string;
          deleted_at?: string | null;
          effective_status?: string | null;
          end_date?: string | null;
          external_campaign_id?: string | null;
          id?: string;
          last_synced_at?: string | null;
          lifetime_budget?: number | null;
          name: string;
          objective?: string | null;
          platform: string;
          project_id?: string | null;
          start_date?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          ad_account_id?: string;
          campaign_type?: string | null;
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          daily_budget?: number | null;
          data_source?: string;
          deleted_at?: string | null;
          effective_status?: string | null;
          end_date?: string | null;
          external_campaign_id?: string | null;
          id?: string;
          last_synced_at?: string | null;
          lifetime_budget?: number | null;
          name?: string;
          objective?: string | null;
          platform?: string;
          project_id?: string | null;
          start_date?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ad_campaigns_ad_account_id_fkey";
            columns: ["ad_account_id"];
            isOneToOne: false;
            referencedRelation: "ad_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ad_campaigns_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ad_campaigns_project_id_company_id_fkey";
            columns: ["project_id", "company_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id", "company_id"];
          },
        ];
      };
      ad_platform_connections: {
        Row: {
          connected_at: string | null;
          connected_by: string | null;
          created_at: string;
          created_by: string | null;
          credential_id: string | null;
          external_business_id: string | null;
          external_user_id: string | null;
          id: string;
          last_error: string | null;
          last_synced_at: string | null;
          name: string;
          organization_id: string;
          platform: string;
          status: string;
          token_expires_at: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          connected_at?: string | null;
          connected_by?: string | null;
          created_at?: string;
          created_by?: string | null;
          credential_id?: string | null;
          external_business_id?: string | null;
          external_user_id?: string | null;
          id?: string;
          last_error?: string | null;
          last_synced_at?: string | null;
          name: string;
          organization_id: string;
          platform: string;
          status?: string;
          token_expires_at?: string | null;
          updated_at?: string;
        };
        Update: {
          connected_at?: string | null;
          connected_by?: string | null;
          created_at?: string;
          created_by?: string | null;
          credential_id?: string | null;
          external_business_id?: string | null;
          external_user_id?: string | null;
          id?: string;
          last_error?: string | null;
          last_synced_at?: string | null;
          name?: string;
          organization_id?: string;
          platform?: string;
          status?: string;
          token_expires_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ad_platform_connections_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      ad_sync_logs: {
        Row: {
          ad_account_id: string | null;
          connection_id: string | null;
          date_from: string | null;
          date_to: string | null;
          error_code: string | null;
          error_message: string | null;
          finished_at: string | null;
          id: string;
          next_retry_at: string | null;
          records_synced: number;
          retry_count: number;
          started_at: string;
          status: string;
          sync_type: string;
          trigger_type: string;
          triggered_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          ad_account_id?: string | null;
          connection_id?: string | null;
          date_from?: string | null;
          date_to?: string | null;
          error_code?: string | null;
          error_message?: string | null;
          finished_at?: string | null;
          id?: string;
          next_retry_at?: string | null;
          records_synced?: number;
          retry_count?: number;
          started_at?: string;
          status?: string;
          sync_type: string;
          trigger_type?: string;
          triggered_by?: string | null;
        };
        Update: {
          ad_account_id?: string | null;
          connection_id?: string | null;
          date_from?: string | null;
          date_to?: string | null;
          error_code?: string | null;
          error_message?: string | null;
          finished_at?: string | null;
          id?: string;
          next_retry_at?: string | null;
          records_synced?: number;
          retry_count?: number;
          started_at?: string;
          status?: string;
          sync_type?: string;
          trigger_type?: string;
          triggered_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ad_sync_logs_ad_account_id_fkey";
            columns: ["ad_account_id"];
            isOneToOne: false;
            referencedRelation: "ad_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ad_sync_logs_connection_id_fkey";
            columns: ["connection_id"];
            isOneToOne: false;
            referencedRelation: "ad_platform_connections";
            referencedColumns: ["id"];
          },
        ];
      };
      companies: {
        Row: {
          address: string | null;
          contact_email: string | null;
          contact_name: string | null;
          contact_phone: string | null;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          description: string | null;
          id: string;
          industry: string | null;
          logo_url: string | null;
          name: string;
          organization_id: string;
          slug: string;
          status: string;
          updated_at: string;
          website_url: string | null;
        };
        ComputedFields: never;
        Insert: {
          address?: string | null;
          contact_email?: string | null;
          contact_name?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          description?: string | null;
          id?: string;
          industry?: string | null;
          logo_url?: string | null;
          name: string;
          organization_id: string;
          slug: string;
          status?: string;
          updated_at?: string;
          website_url?: string | null;
        };
        Update: {
          address?: string | null;
          contact_email?: string | null;
          contact_name?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          description?: string | null;
          id?: string;
          industry?: string | null;
          logo_url?: string | null;
          name?: string;
          organization_id?: string;
          slug?: string;
          status?: string;
          updated_at?: string;
          website_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "companies_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      company_members: {
        Row: {
          company_id: string;
          created_at: string;
          created_by: string | null;
          id: string;
          title: string | null;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          title?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          title?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "company_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      company_settings: {
        Row: {
          brand_guidelines_url: string | null;
          brand_primary_color: string | null;
          brand_secondary_color: string | null;
          company_id: string;
          created_at: string;
          creative_approval_required: boolean;
          default_timezone: string | null;
          settings: NonNullable<Json>;
          social_approval_required: boolean;
          updated_at: string;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          brand_guidelines_url?: string | null;
          brand_primary_color?: string | null;
          brand_secondary_color?: string | null;
          company_id: string;
          created_at?: string;
          creative_approval_required?: boolean;
          default_timezone?: string | null;
          settings?: NonNullable<Json>;
          social_approval_required?: boolean;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          brand_guidelines_url?: string | null;
          brand_primary_color?: string | null;
          brand_secondary_color?: string | null;
          company_id?: string;
          created_at?: string;
          creative_approval_required?: boolean;
          default_timezone?: string | null;
          settings?: NonNullable<Json>;
          social_approval_required?: boolean;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "company_settings_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: true;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      creative_approvals: {
        Row: {
          decided_at: string;
          decided_by: string;
          decision: string;
          feedback: string | null;
          id: string;
          request_id: string;
          revision_id: string | null;
          stage: string;
        };
        ComputedFields: never;
        Insert: {
          decided_at?: string;
          decided_by?: string;
          decision: string;
          feedback?: string | null;
          id?: string;
          request_id: string;
          revision_id?: string | null;
          stage?: string;
        };
        Update: {
          decided_at?: string;
          decided_by?: string;
          decision?: string;
          feedback?: string | null;
          id?: string;
          request_id?: string;
          revision_id?: string | null;
          stage?: string;
        };
        Relationships: [
          {
            foreignKeyName: "creative_approvals_decided_by_fkey";
            columns: ["decided_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "creative_approvals_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "creative_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "creative_approvals_revision_id_fkey";
            columns: ["revision_id"];
            isOneToOne: false;
            referencedRelation: "creative_revisions";
            referencedColumns: ["id"];
          },
        ];
      };
      creative_files: {
        Row: {
          created_at: string;
          duration_seconds: number | null;
          file_name: string;
          file_role: string;
          height: number | null;
          id: string;
          mime_type: string | null;
          request_id: string;
          revision_id: string | null;
          size_bytes: number | null;
          storage_path: string;
          uploaded_by: string;
          width: number | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          duration_seconds?: number | null;
          file_name: string;
          file_role?: string;
          height?: number | null;
          id?: string;
          mime_type?: string | null;
          request_id: string;
          revision_id?: string | null;
          size_bytes?: number | null;
          storage_path: string;
          uploaded_by?: string;
          width?: number | null;
        };
        Update: {
          created_at?: string;
          duration_seconds?: number | null;
          file_name?: string;
          file_role?: string;
          height?: number | null;
          id?: string;
          mime_type?: string | null;
          request_id?: string;
          revision_id?: string | null;
          size_bytes?: number | null;
          storage_path?: string;
          uploaded_by?: string;
          width?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "creative_files_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "creative_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "creative_files_revision_id_fkey";
            columns: ["revision_id"];
            isOneToOne: false;
            referencedRelation: "creative_revisions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "creative_files_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      creative_requests: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          brand_guidelines: string | null;
          calendar_id: string | null;
          company_id: string;
          completed_at: string | null;
          content_type: string;
          created_at: string;
          created_by: string | null;
          creative_size: string | null;
          cta: string | null;
          current_version: number;
          deadline: string | null;
          deleted_at: string | null;
          description: string | null;
          designer_id: string | null;
          id: string;
          is_ai_generated: boolean;
          platform: string | null;
          priority: string;
          project_id: string | null;
          reference_links: string[];
          request_number: number;
          required_text: string | null;
          status: string;
          task_id: string | null;
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          brand_guidelines?: string | null;
          calendar_id?: string | null;
          company_id: string;
          completed_at?: string | null;
          content_type?: string;
          created_at?: string;
          created_by?: string | null;
          creative_size?: string | null;
          cta?: string | null;
          current_version?: number;
          deadline?: string | null;
          deleted_at?: string | null;
          description?: string | null;
          designer_id?: string | null;
          id?: string;
          is_ai_generated?: boolean;
          platform?: string | null;
          priority?: string;
          project_id?: string | null;
          reference_links?: string[];
          request_number?: never;
          required_text?: string | null;
          status?: string;
          task_id?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          brand_guidelines?: string | null;
          calendar_id?: string | null;
          company_id?: string;
          completed_at?: string | null;
          content_type?: string;
          created_at?: string;
          created_by?: string | null;
          creative_size?: string | null;
          cta?: string | null;
          current_version?: number;
          deadline?: string | null;
          deleted_at?: string | null;
          description?: string | null;
          designer_id?: string | null;
          id?: string;
          is_ai_generated?: boolean;
          platform?: string | null;
          priority?: string;
          project_id?: string | null;
          reference_links?: string[];
          request_number?: never;
          required_text?: string | null;
          status?: string;
          task_id?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "creative_requests_approved_by_fkey";
            columns: ["approved_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "creative_requests_calendar_id_fkey";
            columns: ["calendar_id"];
            isOneToOne: false;
            referencedRelation: "social_media_calendar";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "creative_requests_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "creative_requests_designer_id_fkey";
            columns: ["designer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "creative_requests_project_id_company_id_fkey";
            columns: ["project_id", "company_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id", "company_id"];
          },
          {
            foreignKeyName: "creative_requests_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      creative_revisions: {
        Row: {
          id: string;
          notes: string | null;
          request_id: string;
          status: string;
          submitted_at: string;
          submitted_by: string;
          version_number: number;
        };
        ComputedFields: never;
        Insert: {
          id?: string;
          notes?: string | null;
          request_id: string;
          status?: string;
          submitted_at?: string;
          submitted_by?: string;
          version_number: number;
        };
        Update: {
          id?: string;
          notes?: string | null;
          request_id?: string;
          status?: string;
          submitted_at?: string;
          submitted_by?: string;
          version_number?: number;
        };
        Relationships: [
          {
            foreignKeyName: "creative_revisions_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "creative_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "creative_revisions_submitted_by_fkey";
            columns: ["submitted_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_report_attachments: {
        Row: {
          created_at: string;
          daily_report_id: string;
          file_name: string;
          id: string;
          mime_type: string | null;
          size_bytes: number | null;
          storage_path: string;
          uploaded_by: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          daily_report_id: string;
          file_name: string;
          id?: string;
          mime_type?: string | null;
          size_bytes?: number | null;
          storage_path: string;
          uploaded_by?: string;
        };
        Update: {
          created_at?: string;
          daily_report_id?: string;
          file_name?: string;
          id?: string;
          mime_type?: string | null;
          size_bytes?: number | null;
          storage_path?: string;
          uploaded_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "daily_report_attachments_daily_report_id_fkey";
            columns: ["daily_report_id"];
            isOneToOne: false;
            referencedRelation: "daily_reports";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "daily_report_attachments_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_report_comments: {
        Row: {
          author_id: string;
          body: string;
          created_at: string;
          daily_report_id: string;
          id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          author_id?: string;
          body: string;
          created_at?: string;
          daily_report_id: string;
          id?: string;
          updated_at?: string;
        };
        Update: {
          author_id?: string;
          body?: string;
          created_at?: string;
          daily_report_id?: string;
          id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "daily_report_comments_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "daily_report_comments_daily_report_id_fkey";
            columns: ["daily_report_id"];
            isOneToOne: false;
            referencedRelation: "daily_reports";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_reports: {
        Row: {
          challenges: string | null;
          company_id: string;
          completed_activities: string | null;
          created_at: string;
          hours_worked: number | null;
          id: string;
          pending_activities: string | null;
          project_id: string | null;
          report_date: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: string;
          submitted_at: string | null;
          tomorrow_plan: string | null;
          updated_at: string;
          user_id: string;
          work_in_progress: string | null;
        };
        ComputedFields: never;
        Insert: {
          challenges?: string | null;
          company_id: string;
          completed_activities?: string | null;
          created_at?: string;
          hours_worked?: number | null;
          id?: string;
          pending_activities?: string | null;
          project_id?: string | null;
          report_date?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: string;
          submitted_at?: string | null;
          tomorrow_plan?: string | null;
          updated_at?: string;
          user_id?: string;
          work_in_progress?: string | null;
        };
        Update: {
          challenges?: string | null;
          company_id?: string;
          completed_activities?: string | null;
          created_at?: string;
          hours_worked?: number | null;
          id?: string;
          pending_activities?: string | null;
          project_id?: string | null;
          report_date?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: string;
          submitted_at?: string | null;
          tomorrow_plan?: string | null;
          updated_at?: string;
          user_id?: string;
          work_in_progress?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "daily_reports_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "daily_reports_project_id_company_id_fkey";
            columns: ["project_id", "company_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id", "company_id"];
          },
          {
            foreignKeyName: "daily_reports_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "daily_reports_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      departments: {
        Row: {
          color: string;
          created_at: string;
          created_by: string | null;
          description: string | null;
          head_user_id: string | null;
          id: string;
          is_active: boolean;
          key: string;
          name: string;
          organization_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          color?: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          head_user_id?: string | null;
          id?: string;
          is_active?: boolean;
          key: string;
          name: string;
          organization_id: string;
          updated_at?: string;
        };
        Update: {
          color?: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          head_user_id?: string | null;
          id?: string;
          is_active?: boolean;
          key?: string;
          name?: string;
          organization_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "departments_head_user_id_fkey";
            columns: ["head_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "departments_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      integration_sync_logs: {
        Row: {
          company_id: string | null;
          connection_id: string | null;
          details: NonNullable<Json>;
          error_code: string | null;
          error_message: string | null;
          finished_at: string | null;
          id: string;
          integration_type: string;
          job_name: string;
          next_retry_at: string | null;
          organization_id: string;
          records_processed: number;
          retry_count: number;
          started_at: string;
          status: string;
          triggered_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          company_id?: string | null;
          connection_id?: string | null;
          details?: NonNullable<Json>;
          error_code?: string | null;
          error_message?: string | null;
          finished_at?: string | null;
          id?: string;
          integration_type: string;
          job_name: string;
          next_retry_at?: string | null;
          organization_id: string;
          records_processed?: number;
          retry_count?: number;
          started_at?: string;
          status?: string;
          triggered_by?: string | null;
        };
        Update: {
          company_id?: string | null;
          connection_id?: string | null;
          details?: NonNullable<Json>;
          error_code?: string | null;
          error_message?: string | null;
          finished_at?: string | null;
          id?: string;
          integration_type?: string;
          job_name?: string;
          next_retry_at?: string | null;
          organization_id?: string;
          records_processed?: number;
          retry_count?: number;
          started_at?: string;
          status?: string;
          triggered_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "integration_sync_logs_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "integration_sync_logs_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_preferences: {
        Row: {
          email: boolean;
          in_app: boolean;
          notification_type: string;
          push: boolean;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          email?: boolean;
          in_app?: boolean;
          notification_type: string;
          push?: boolean;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          email?: boolean;
          in_app?: boolean;
          notification_type?: string;
          push?: boolean;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          actor_id: string | null;
          body: string | null;
          company_id: string | null;
          created_at: string;
          email_sent_at: string | null;
          entity_id: string | null;
          entity_type: string | null;
          id: string;
          link: string | null;
          organization_id: string | null;
          project_id: string | null;
          push_sent_at: string | null;
          read_at: string | null;
          title: string;
          type: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          actor_id?: string | null;
          body?: string | null;
          company_id?: string | null;
          created_at?: string;
          email_sent_at?: string | null;
          entity_id?: string | null;
          entity_type?: string | null;
          id?: string;
          link?: string | null;
          organization_id?: string | null;
          project_id?: string | null;
          push_sent_at?: string | null;
          read_at?: string | null;
          title: string;
          type: string;
          user_id: string;
        };
        Update: {
          actor_id?: string | null;
          body?: string | null;
          company_id?: string | null;
          created_at?: string;
          email_sent_at?: string | null;
          entity_id?: string | null;
          entity_type?: string | null;
          id?: string;
          link?: string | null;
          organization_id?: string | null;
          project_id?: string | null;
          push_sent_at?: string | null;
          read_at?: string | null;
          title?: string;
          type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      organization_members: {
        Row: {
          created_at: string;
          department_id: string | null;
          id: string;
          invited_by: string | null;
          is_owner: boolean;
          joined_at: string;
          organization_id: string;
          reports_to: string | null;
          status: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          department_id?: string | null;
          id?: string;
          invited_by?: string | null;
          is_owner?: boolean;
          joined_at?: string;
          organization_id: string;
          reports_to?: string | null;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          department_id?: string | null;
          id?: string;
          invited_by?: string | null;
          is_owner?: boolean;
          joined_at?: string;
          organization_id?: string;
          reports_to?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_members_department_id_fkey";
            columns: ["department_id"];
            isOneToOne: false;
            referencedRelation: "departments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "organization_members_reports_to_fkey";
            columns: ["reports_to"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "organization_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          created_at: string;
          created_by: string | null;
          currency: string;
          id: string;
          logo_url: string | null;
          name: string;
          primary_color: string;
          settings: NonNullable<Json>;
          slug: string;
          timezone: string;
          updated_at: string;
          website_url: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          id?: string;
          logo_url?: string | null;
          name: string;
          primary_color?: string;
          settings?: NonNullable<Json>;
          slug: string;
          timezone?: string;
          updated_at?: string;
          website_url?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          id?: string;
          logo_url?: string | null;
          name?: string;
          primary_color?: string;
          settings?: NonNullable<Json>;
          slug?: string;
          timezone?: string;
          updated_at?: string;
          website_url?: string | null;
        };
        Relationships: [];
      };
      permissions: {
        Row: {
          action: string;
          created_at: string;
          description: string | null;
          key: string;
          label: string;
          module: string;
          sort_order: number;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          created_at?: string;
          description?: string | null;
          key: string;
          label: string;
          module: string;
          sort_order?: number;
        };
        Update: {
          action?: string;
          created_at?: string;
          description?: string | null;
          key?: string;
          label?: string;
          module?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string;
          full_name: string | null;
          id: string;
          is_active: boolean;
          job_title: string | null;
          last_seen_at: string | null;
          phone: string | null;
          timezone: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email: string;
          full_name?: string | null;
          id: string;
          is_active?: boolean;
          job_title?: string | null;
          last_seen_at?: string | null;
          phone?: string | null;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string;
          full_name?: string | null;
          id?: string;
          is_active?: boolean;
          job_title?: string | null;
          last_seen_at?: string | null;
          phone?: string | null;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      project_members: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          project_id: string;
          title: string | null;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          project_id: string;
          title?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          project_id?: string;
          title?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      project_settings: {
        Row: {
          created_at: string;
          creative_approval_required: boolean | null;
          monthly_ad_budget: number | null;
          project_id: string;
          settings: NonNullable<Json>;
          social_approval_required: boolean | null;
          target_cpl: number | null;
          updated_at: string;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          creative_approval_required?: boolean | null;
          monthly_ad_budget?: number | null;
          project_id: string;
          settings?: NonNullable<Json>;
          social_approval_required?: boolean | null;
          target_cpl?: number | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          created_at?: string;
          creative_approval_required?: boolean | null;
          monthly_ad_budget?: number | null;
          project_id?: string;
          settings?: NonNullable<Json>;
          social_approval_required?: boolean | null;
          target_cpl?: number | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "project_settings_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: true;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: {
          category: string | null;
          company_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          description: string | null;
          end_date: string | null;
          id: string;
          image_url: string | null;
          manager_id: string | null;
          name: string;
          slug: string;
          start_date: string | null;
          status: string;
          updated_at: string;
          website_url: string | null;
        };
        ComputedFields: never;
        Insert: {
          category?: string | null;
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          description?: string | null;
          end_date?: string | null;
          id?: string;
          image_url?: string | null;
          manager_id?: string | null;
          name: string;
          slug: string;
          start_date?: string | null;
          status?: string;
          updated_at?: string;
          website_url?: string | null;
        };
        Update: {
          category?: string | null;
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          description?: string | null;
          end_date?: string | null;
          id?: string;
          image_url?: string | null;
          manager_id?: string | null;
          name?: string;
          slug?: string;
          start_date?: string | null;
          status?: string;
          updated_at?: string;
          website_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "projects_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "projects_manager_id_fkey";
            columns: ["manager_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      role_permissions: {
        Row: {
          created_at: string;
          created_by: string | null;
          permission_key: string;
          role_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          permission_key: string;
          role_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          permission_key?: string;
          role_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_key_fkey";
            columns: ["permission_key"];
            isOneToOne: false;
            referencedRelation: "permissions";
            referencedColumns: ["key"];
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
        ];
      };
      roles: {
        Row: {
          color: string;
          created_at: string;
          created_by: string | null;
          description: string | null;
          grants_all: boolean;
          id: string;
          is_system: boolean;
          key: string;
          name: string;
          organization_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          color?: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          grants_all?: boolean;
          id?: string;
          is_system?: boolean;
          key: string;
          name: string;
          organization_id: string;
          updated_at?: string;
        };
        Update: {
          color?: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          grants_all?: boolean;
          id?: string;
          is_system?: boolean;
          key?: string;
          name?: string;
          organization_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "roles_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      seo_backlinks: {
        Row: {
          acquired_on: string | null;
          acquisition_type: string;
          anchor_text: string | null;
          cost: number | null;
          created_at: string;
          created_by: string | null;
          domain_authority: number | null;
          id: string;
          last_checked_at: string | null;
          link_type: string;
          notes: string | null;
          source_url: string;
          status: string;
          target_url: string;
          updated_at: string;
          website_id: string;
        };
        ComputedFields: never;
        Insert: {
          acquired_on?: string | null;
          acquisition_type?: string;
          anchor_text?: string | null;
          cost?: number | null;
          created_at?: string;
          created_by?: string | null;
          domain_authority?: number | null;
          id?: string;
          last_checked_at?: string | null;
          link_type?: string;
          notes?: string | null;
          source_url: string;
          status?: string;
          target_url: string;
          updated_at?: string;
          website_id: string;
        };
        Update: {
          acquired_on?: string | null;
          acquisition_type?: string;
          anchor_text?: string | null;
          cost?: number | null;
          created_at?: string;
          created_by?: string | null;
          domain_authority?: number | null;
          id?: string;
          last_checked_at?: string | null;
          link_type?: string;
          notes?: string | null;
          source_url?: string;
          status?: string;
          target_url?: string;
          updated_at?: string;
          website_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "seo_backlinks_website_id_fkey";
            columns: ["website_id"];
            isOneToOne: false;
            referencedRelation: "seo_websites";
            referencedColumns: ["id"];
          },
        ];
      };
      seo_integrations: {
        Row: {
          connected_at: string | null;
          connected_by: string | null;
          created_at: string;
          credential_id: string | null;
          external_property_id: string | null;
          id: string;
          last_error: string | null;
          last_synced_at: string | null;
          provider: string;
          status: string;
          updated_at: string;
          website_id: string;
        };
        ComputedFields: never;
        Insert: {
          connected_at?: string | null;
          connected_by?: string | null;
          created_at?: string;
          credential_id?: string | null;
          external_property_id?: string | null;
          id?: string;
          last_error?: string | null;
          last_synced_at?: string | null;
          provider: string;
          status?: string;
          updated_at?: string;
          website_id: string;
        };
        Update: {
          connected_at?: string | null;
          connected_by?: string | null;
          created_at?: string;
          credential_id?: string | null;
          external_property_id?: string | null;
          id?: string;
          last_error?: string | null;
          last_synced_at?: string | null;
          provider?: string;
          status?: string;
          updated_at?: string;
          website_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "seo_integrations_website_id_fkey";
            columns: ["website_id"];
            isOneToOne: false;
            referencedRelation: "seo_websites";
            referencedColumns: ["id"];
          },
        ];
      };
      seo_keyword_rankings: {
        Row: {
          checked_on: string;
          created_at: string;
          id: string;
          keyword_id: string;
          position: number | null;
          ranking_url: string | null;
          recorded_by: string | null;
          source: string;
        };
        ComputedFields: never;
        Insert: {
          checked_on?: string;
          created_at?: string;
          id?: string;
          keyword_id: string;
          position?: number | null;
          ranking_url?: string | null;
          recorded_by?: string | null;
          source?: string;
        };
        Update: {
          checked_on?: string;
          created_at?: string;
          id?: string;
          keyword_id?: string;
          position?: number | null;
          ranking_url?: string | null;
          recorded_by?: string | null;
          source?: string;
        };
        Relationships: [
          {
            foreignKeyName: "seo_keyword_rankings_keyword_id_fkey";
            columns: ["keyword_id"];
            isOneToOne: false;
            referencedRelation: "seo_keywords";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "seo_keyword_rankings_recorded_by_fkey";
            columns: ["recorded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      seo_keywords: {
        Row: {
          best_rank: number | null;
          created_at: string;
          created_by: string | null;
          current_rank: number | null;
          device: string;
          id: string;
          is_primary: boolean;
          keyword: string;
          keyword_difficulty: number | null;
          language: string;
          last_checked_at: string | null;
          location: string;
          previous_rank: number | null;
          search_engine: string;
          search_volume: number | null;
          status: string;
          target_url: string | null;
          updated_at: string;
          website_id: string;
        };
        ComputedFields: never;
        Insert: {
          best_rank?: number | null;
          created_at?: string;
          created_by?: string | null;
          current_rank?: number | null;
          device?: string;
          id?: string;
          is_primary?: boolean;
          keyword: string;
          keyword_difficulty?: number | null;
          language?: string;
          last_checked_at?: string | null;
          location?: string;
          previous_rank?: number | null;
          search_engine?: string;
          search_volume?: number | null;
          status?: string;
          target_url?: string | null;
          updated_at?: string;
          website_id: string;
        };
        Update: {
          best_rank?: number | null;
          created_at?: string;
          created_by?: string | null;
          current_rank?: number | null;
          device?: string;
          id?: string;
          is_primary?: boolean;
          keyword?: string;
          keyword_difficulty?: number | null;
          language?: string;
          last_checked_at?: string | null;
          location?: string;
          previous_rank?: number | null;
          search_engine?: string;
          search_volume?: number | null;
          status?: string;
          target_url?: string | null;
          updated_at?: string;
          website_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "seo_keywords_website_id_fkey";
            columns: ["website_id"];
            isOneToOne: false;
            referencedRelation: "seo_websites";
            referencedColumns: ["id"];
          },
        ];
      };
      seo_reports: {
        Row: {
          created_at: string;
          created_by: string | null;
          highlights: string | null;
          id: string;
          metrics: NonNullable<Json>;
          next_steps: string | null;
          period_end: string;
          period_start: string;
          period_type: string;
          status: string;
          storage_path: string | null;
          submitted_at: string | null;
          submitted_by: string | null;
          summary: string | null;
          updated_at: string;
          website_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          highlights?: string | null;
          id?: string;
          metrics?: NonNullable<Json>;
          next_steps?: string | null;
          period_end: string;
          period_start: string;
          period_type: string;
          status?: string;
          storage_path?: string | null;
          submitted_at?: string | null;
          submitted_by?: string | null;
          summary?: string | null;
          updated_at?: string;
          website_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          highlights?: string | null;
          id?: string;
          metrics?: NonNullable<Json>;
          next_steps?: string | null;
          period_end?: string;
          period_start?: string;
          period_type?: string;
          status?: string;
          storage_path?: string | null;
          submitted_at?: string | null;
          submitted_by?: string | null;
          summary?: string | null;
          updated_at?: string;
          website_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "seo_reports_website_id_fkey";
            columns: ["website_id"];
            isOneToOne: false;
            referencedRelation: "seo_websites";
            referencedColumns: ["id"];
          },
        ];
      };
      seo_tasks: {
        Row: {
          activity_type: string;
          assignee_id: string | null;
          category: string;
          company_id: string;
          completed_at: string | null;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          description: string | null;
          due_date: string | null;
          id: string;
          page_url: string | null;
          priority: string;
          project_id: string | null;
          status: string;
          task_id: string | null;
          title: string;
          updated_at: string;
          website_id: string;
        };
        ComputedFields: never;
        Insert: {
          activity_type: string;
          assignee_id?: string | null;
          category: string;
          company_id: string;
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          page_url?: string | null;
          priority?: string;
          project_id?: string | null;
          status?: string;
          task_id?: string | null;
          title: string;
          updated_at?: string;
          website_id: string;
        };
        Update: {
          activity_type?: string;
          assignee_id?: string | null;
          category?: string;
          company_id?: string;
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          page_url?: string | null;
          priority?: string;
          project_id?: string | null;
          status?: string;
          task_id?: string | null;
          title?: string;
          updated_at?: string;
          website_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "seo_tasks_assignee_id_fkey";
            columns: ["assignee_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "seo_tasks_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "seo_tasks_project_id_company_id_fkey";
            columns: ["project_id", "company_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id", "company_id"];
          },
          {
            foreignKeyName: "seo_tasks_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "seo_tasks_website_id_fkey";
            columns: ["website_id"];
            isOneToOne: false;
            referencedRelation: "seo_websites";
            referencedColumns: ["id"];
          },
        ];
      };
      seo_website_metrics: {
        Row: {
          average_position: number | null;
          cls: number | null;
          crawl_errors: number | null;
          created_at: string;
          id: string;
          indexed_pages: number | null;
          inp_ms: number | null;
          lcp_ms: number | null;
          metric_date: string;
          organic_clicks: number | null;
          organic_conversions: number | null;
          organic_impressions: number | null;
          organic_sessions: number | null;
          organic_users: number | null;
          pagespeed_desktop: number | null;
          pagespeed_mobile: number | null;
          recorded_by: string | null;
          source: string;
          updated_at: string;
          website_id: string;
        };
        ComputedFields: never;
        Insert: {
          average_position?: number | null;
          cls?: number | null;
          crawl_errors?: number | null;
          created_at?: string;
          id?: string;
          indexed_pages?: number | null;
          inp_ms?: number | null;
          lcp_ms?: number | null;
          metric_date: string;
          organic_clicks?: number | null;
          organic_conversions?: number | null;
          organic_impressions?: number | null;
          organic_sessions?: number | null;
          organic_users?: number | null;
          pagespeed_desktop?: number | null;
          pagespeed_mobile?: number | null;
          recorded_by?: string | null;
          source?: string;
          updated_at?: string;
          website_id: string;
        };
        Update: {
          average_position?: number | null;
          cls?: number | null;
          crawl_errors?: number | null;
          created_at?: string;
          id?: string;
          indexed_pages?: number | null;
          inp_ms?: number | null;
          lcp_ms?: number | null;
          metric_date?: string;
          organic_clicks?: number | null;
          organic_conversions?: number | null;
          organic_impressions?: number | null;
          organic_sessions?: number | null;
          organic_users?: number | null;
          pagespeed_desktop?: number | null;
          pagespeed_mobile?: number | null;
          recorded_by?: string | null;
          source?: string;
          updated_at?: string;
          website_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "seo_website_metrics_recorded_by_fkey";
            columns: ["recorded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "seo_website_metrics_website_id_fkey";
            columns: ["website_id"];
            isOneToOne: false;
            referencedRelation: "seo_websites";
            referencedColumns: ["id"];
          },
        ];
      };
      seo_websites: {
        Row: {
          cms: string | null;
          company_id: string;
          competitors: string[];
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          id: string;
          name: string;
          project_id: string | null;
          seo_executive_id: string | null;
          seo_start_date: string | null;
          status: string;
          updated_at: string;
          url: string;
        };
        ComputedFields: never;
        Insert: {
          cms?: string | null;
          company_id: string;
          competitors?: string[];
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          name: string;
          project_id?: string | null;
          seo_executive_id?: string | null;
          seo_start_date?: string | null;
          status?: string;
          updated_at?: string;
          url: string;
        };
        Update: {
          cms?: string | null;
          company_id?: string;
          competitors?: string[];
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          name?: string;
          project_id?: string | null;
          seo_executive_id?: string | null;
          seo_start_date?: string | null;
          status?: string;
          updated_at?: string;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "seo_websites_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "seo_websites_project_id_company_id_fkey";
            columns: ["project_id", "company_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id", "company_id"];
          },
          {
            foreignKeyName: "seo_websites_seo_executive_id_fkey";
            columns: ["seo_executive_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      social_accounts: {
        Row: {
          account_name: string;
          company_id: string;
          connection_status: string;
          created_at: string;
          created_by: string | null;
          credential_id: string | null;
          deleted_at: string | null;
          external_account_id: string | null;
          handle: string | null;
          id: string;
          is_active: boolean;
          platform: string;
          profile_url: string | null;
          project_id: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          account_name: string;
          company_id: string;
          connection_status?: string;
          created_at?: string;
          created_by?: string | null;
          credential_id?: string | null;
          deleted_at?: string | null;
          external_account_id?: string | null;
          handle?: string | null;
          id?: string;
          is_active?: boolean;
          platform: string;
          profile_url?: string | null;
          project_id?: string | null;
          updated_at?: string;
        };
        Update: {
          account_name?: string;
          company_id?: string;
          connection_status?: string;
          created_at?: string;
          created_by?: string | null;
          credential_id?: string | null;
          deleted_at?: string | null;
          external_account_id?: string | null;
          handle?: string | null;
          id?: string;
          is_active?: boolean;
          platform?: string;
          profile_url?: string | null;
          project_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "social_accounts_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "social_accounts_project_id_company_id_fkey";
            columns: ["project_id", "company_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id", "company_id"];
          },
        ];
      };
      social_media_approvals: {
        Row: {
          calendar_id: string;
          comment: string | null;
          content_id: string | null;
          decided_at: string;
          decided_by: string;
          decision: string;
          id: string;
          step: string;
        };
        ComputedFields: never;
        Insert: {
          calendar_id: string;
          comment?: string | null;
          content_id?: string | null;
          decided_at?: string;
          decided_by?: string;
          decision: string;
          id?: string;
          step: string;
        };
        Update: {
          calendar_id?: string;
          comment?: string | null;
          content_id?: string | null;
          decided_at?: string;
          decided_by?: string;
          decision?: string;
          id?: string;
          step?: string;
        };
        Relationships: [
          {
            foreignKeyName: "social_media_approvals_calendar_id_fkey";
            columns: ["calendar_id"];
            isOneToOne: false;
            referencedRelation: "social_media_calendar";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "social_media_approvals_content_id_fkey";
            columns: ["content_id"];
            isOneToOne: false;
            referencedRelation: "social_media_content";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "social_media_approvals_decided_by_fkey";
            columns: ["decided_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      social_media_calendar: {
        Row: {
          approval_required: boolean;
          company_id: string;
          content_type: string;
          created_at: string;
          created_by: string | null;
          creative_request_id: string | null;
          current_content_id: string | null;
          deleted_at: string | null;
          designer_id: string | null;
          duplicated_from: string | null;
          external_post_id: string | null;
          id: string;
          planned_date: string;
          planned_time: string | null;
          platform: string;
          post_url: string | null;
          project_id: string | null;
          publish_error: string | null;
          published_at: string | null;
          published_by: string | null;
          publishing_status: string;
          social_account_id: string | null;
          social_manager_id: string | null;
          timezone: string;
          title: string;
          updated_at: string;
          workflow_status: string;
        };
        ComputedFields: never;
        Insert: {
          approval_required?: boolean;
          company_id: string;
          content_type?: string;
          created_at?: string;
          created_by?: string | null;
          creative_request_id?: string | null;
          current_content_id?: string | null;
          deleted_at?: string | null;
          designer_id?: string | null;
          duplicated_from?: string | null;
          external_post_id?: string | null;
          id?: string;
          planned_date: string;
          planned_time?: string | null;
          platform: string;
          post_url?: string | null;
          project_id?: string | null;
          publish_error?: string | null;
          published_at?: string | null;
          published_by?: string | null;
          publishing_status?: string;
          social_account_id?: string | null;
          social_manager_id?: string | null;
          timezone?: string;
          title: string;
          updated_at?: string;
          workflow_status?: string;
        };
        Update: {
          approval_required?: boolean;
          company_id?: string;
          content_type?: string;
          created_at?: string;
          created_by?: string | null;
          creative_request_id?: string | null;
          current_content_id?: string | null;
          deleted_at?: string | null;
          designer_id?: string | null;
          duplicated_from?: string | null;
          external_post_id?: string | null;
          id?: string;
          planned_date?: string;
          planned_time?: string | null;
          platform?: string;
          post_url?: string | null;
          project_id?: string | null;
          publish_error?: string | null;
          published_at?: string | null;
          published_by?: string | null;
          publishing_status?: string;
          social_account_id?: string | null;
          social_manager_id?: string | null;
          timezone?: string;
          title?: string;
          updated_at?: string;
          workflow_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "social_media_calendar_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "social_media_calendar_creative_request_fk";
            columns: ["creative_request_id"];
            isOneToOne: false;
            referencedRelation: "creative_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "social_media_calendar_current_content_fk";
            columns: ["current_content_id"];
            isOneToOne: false;
            referencedRelation: "social_media_content";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "social_media_calendar_designer_id_fkey";
            columns: ["designer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "social_media_calendar_duplicated_from_fkey";
            columns: ["duplicated_from"];
            isOneToOne: false;
            referencedRelation: "social_media_calendar";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "social_media_calendar_project_id_company_id_fkey";
            columns: ["project_id", "company_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id", "company_id"];
          },
          {
            foreignKeyName: "social_media_calendar_published_by_fkey";
            columns: ["published_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "social_media_calendar_social_account_id_fkey";
            columns: ["social_account_id"];
            isOneToOne: false;
            referencedRelation: "social_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "social_media_calendar_social_manager_id_fkey";
            columns: ["social_manager_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      social_media_content: {
        Row: {
          calendar_id: string;
          caption: string | null;
          created_at: string;
          created_by: string;
          creative_path: string | null;
          hashtags: string[];
          id: string;
          notes: string | null;
          version: number;
          video_path: string | null;
        };
        ComputedFields: never;
        Insert: {
          calendar_id: string;
          caption?: string | null;
          created_at?: string;
          created_by?: string;
          creative_path?: string | null;
          hashtags?: string[];
          id?: string;
          notes?: string | null;
          version?: number;
          video_path?: string | null;
        };
        Update: {
          calendar_id?: string;
          caption?: string | null;
          created_at?: string;
          created_by?: string;
          creative_path?: string | null;
          hashtags?: string[];
          id?: string;
          notes?: string | null;
          version?: number;
          video_path?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "social_media_content_calendar_id_fkey";
            columns: ["calendar_id"];
            isOneToOne: false;
            referencedRelation: "social_media_calendar";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "social_media_content_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      social_media_metrics: {
        Row: {
          calendar_id: string | null;
          clicks: number | null;
          comments: number | null;
          company_id: string;
          created_at: string;
          engagement: number | null;
          followers_gained: number | null;
          id: string;
          impressions: number | null;
          likes: number | null;
          metric_date: string;
          project_id: string | null;
          reach: number | null;
          recorded_by: string | null;
          saves: number | null;
          shares: number | null;
          social_account_id: string | null;
          source: string;
          updated_at: string;
          video_views: number | null;
        };
        ComputedFields: never;
        Insert: {
          calendar_id?: string | null;
          clicks?: number | null;
          comments?: number | null;
          company_id: string;
          created_at?: string;
          engagement?: number | null;
          followers_gained?: number | null;
          id?: string;
          impressions?: number | null;
          likes?: number | null;
          metric_date: string;
          project_id?: string | null;
          reach?: number | null;
          recorded_by?: string | null;
          saves?: number | null;
          shares?: number | null;
          social_account_id?: string | null;
          source?: string;
          updated_at?: string;
          video_views?: number | null;
        };
        Update: {
          calendar_id?: string | null;
          clicks?: number | null;
          comments?: number | null;
          company_id?: string;
          created_at?: string;
          engagement?: number | null;
          followers_gained?: number | null;
          id?: string;
          impressions?: number | null;
          likes?: number | null;
          metric_date?: string;
          project_id?: string | null;
          reach?: number | null;
          recorded_by?: string | null;
          saves?: number | null;
          shares?: number | null;
          social_account_id?: string | null;
          source?: string;
          updated_at?: string;
          video_views?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "social_media_metrics_calendar_id_fkey";
            columns: ["calendar_id"];
            isOneToOne: false;
            referencedRelation: "social_media_calendar";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "social_media_metrics_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "social_media_metrics_project_id_company_id_fkey";
            columns: ["project_id", "company_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id", "company_id"];
          },
          {
            foreignKeyName: "social_media_metrics_recorded_by_fkey";
            columns: ["recorded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "social_media_metrics_social_account_id_fkey";
            columns: ["social_account_id"];
            isOneToOne: false;
            referencedRelation: "social_accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      social_media_post_history: {
        Row: {
          action: string;
          actor_id: string | null;
          calendar_id: string;
          comment: string | null;
          created_at: string;
          from_value: string | null;
          id: string;
          to_value: string | null;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor_id?: string | null;
          calendar_id: string;
          comment?: string | null;
          created_at?: string;
          from_value?: string | null;
          id?: string;
          to_value?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          calendar_id?: string;
          comment?: string | null;
          created_at?: string;
          from_value?: string | null;
          id?: string;
          to_value?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "social_media_post_history_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "social_media_post_history_calendar_id_fkey";
            columns: ["calendar_id"];
            isOneToOne: false;
            referencedRelation: "social_media_calendar";
            referencedColumns: ["id"];
          },
        ];
      };
      task_activity_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          details: NonNullable<Json>;
          from_value: string | null;
          id: string;
          task_id: string;
          to_value: string | null;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          details?: NonNullable<Json>;
          from_value?: string | null;
          id?: string;
          task_id: string;
          to_value?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          details?: NonNullable<Json>;
          from_value?: string | null;
          id?: string;
          task_id?: string;
          to_value?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "task_activity_logs_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_activity_logs_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      task_assignees: {
        Row: {
          assigned_at: string;
          assigned_by: string | null;
          task_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          assigned_at?: string;
          assigned_by?: string | null;
          task_id: string;
          user_id: string;
        };
        Update: {
          assigned_at?: string;
          assigned_by?: string | null;
          task_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "task_assignees_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_assignees_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      task_attachments: {
        Row: {
          comment_id: string | null;
          created_at: string;
          file_name: string;
          id: string;
          mime_type: string | null;
          size_bytes: number | null;
          storage_path: string;
          task_id: string;
          uploaded_by: string;
        };
        ComputedFields: never;
        Insert: {
          comment_id?: string | null;
          created_at?: string;
          file_name: string;
          id?: string;
          mime_type?: string | null;
          size_bytes?: number | null;
          storage_path: string;
          task_id: string;
          uploaded_by?: string;
        };
        Update: {
          comment_id?: string | null;
          created_at?: string;
          file_name?: string;
          id?: string;
          mime_type?: string | null;
          size_bytes?: number | null;
          storage_path?: string;
          task_id?: string;
          uploaded_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "task_attachments_comment_id_fkey";
            columns: ["comment_id"];
            isOneToOne: false;
            referencedRelation: "task_comments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_attachments_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_attachments_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      task_comments: {
        Row: {
          author_id: string;
          body: string;
          created_at: string;
          deleted_at: string | null;
          id: string;
          is_revision_request: boolean;
          mentions: string[];
          parent_comment_id: string | null;
          task_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          author_id?: string;
          body: string;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          is_revision_request?: boolean;
          mentions?: string[];
          parent_comment_id?: string | null;
          task_id: string;
          updated_at?: string;
        };
        Update: {
          author_id?: string;
          body?: string;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          is_revision_request?: boolean;
          mentions?: string[];
          parent_comment_id?: string | null;
          task_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "task_comments_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_comments_parent_comment_id_fkey";
            columns: ["parent_comment_id"];
            isOneToOne: false;
            referencedRelation: "task_comments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_comments_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      task_dependencies: {
        Row: {
          created_at: string;
          created_by: string | null;
          depends_on_task_id: string;
          task_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          depends_on_task_id: string;
          task_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          depends_on_task_id?: string;
          task_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "task_dependencies_depends_on_task_id_fkey";
            columns: ["depends_on_task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_dependencies_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      tasks: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          category: string;
          company_id: string;
          completed_at: string | null;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          department_id: string | null;
          description: string | null;
          due_date: string | null;
          estimated_hours: number | null;
          id: string;
          parent_task_id: string | null;
          priority: string;
          project_id: string | null;
          requires_approval: boolean;
          reviewer_id: string | null;
          sort_order: number;
          source_id: string | null;
          source_type: string | null;
          start_date: string | null;
          started_at: string | null;
          status: string;
          submitted_at: string | null;
          task_number: number;
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          category?: string;
          company_id: string;
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          department_id?: string | null;
          description?: string | null;
          due_date?: string | null;
          estimated_hours?: number | null;
          id?: string;
          parent_task_id?: string | null;
          priority?: string;
          project_id?: string | null;
          requires_approval?: boolean;
          reviewer_id?: string | null;
          sort_order?: number;
          source_id?: string | null;
          source_type?: string | null;
          start_date?: string | null;
          started_at?: string | null;
          status?: string;
          submitted_at?: string | null;
          task_number?: never;
          title: string;
          updated_at?: string;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          category?: string;
          company_id?: string;
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          department_id?: string | null;
          description?: string | null;
          due_date?: string | null;
          estimated_hours?: number | null;
          id?: string;
          parent_task_id?: string | null;
          priority?: string;
          project_id?: string | null;
          requires_approval?: boolean;
          reviewer_id?: string | null;
          sort_order?: number;
          source_id?: string | null;
          source_type?: string | null;
          start_date?: string | null;
          started_at?: string | null;
          status?: string;
          submitted_at?: string | null;
          task_number?: never;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_department_id_fkey";
            columns: ["department_id"];
            isOneToOne: false;
            referencedRelation: "departments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey";
            columns: ["parent_task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_project_id_company_id_fkey";
            columns: ["project_id", "company_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id", "company_id"];
          },
          {
            foreignKeyName: "tasks_reviewer_id_fkey";
            columns: ["reviewer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_role_assignments: {
        Row: {
          company_id: string | null;
          created_at: string;
          created_by: string | null;
          expires_at: string | null;
          id: string;
          organization_id: string;
          project_id: string | null;
          role_id: string;
          scope: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          company_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          expires_at?: string | null;
          id?: string;
          organization_id: string;
          project_id?: string | null;
          role_id: string;
          scope?: never;
          user_id: string;
        };
        Update: {
          company_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          expires_at?: string | null;
          id?: string;
          organization_id?: string;
          project_id?: string | null;
          role_id?: string;
          scope?: never;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_role_assignments_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_role_assignments_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_role_assignments_project_id_company_id_fkey";
            columns: ["project_id", "company_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id", "company_id"];
          },
          {
            foreignKeyName: "user_role_assignments_role_id_organization_id_fkey";
            columns: ["role_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id", "organization_id"];
          },
          {
            foreignKeyName: "user_role_assignments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      video_assets: {
        Row: {
          asset_type: string;
          created_at: string;
          duration_seconds: number | null;
          file_name: string;
          id: string;
          is_approved: boolean;
          mime_type: string | null;
          size_bytes: number | null;
          storage_path: string;
          updated_at: string;
          upload_status: string;
          uploaded_by: string;
          version: number;
          video_task_id: string;
        };
        ComputedFields: never;
        Insert: {
          asset_type: string;
          created_at?: string;
          duration_seconds?: number | null;
          file_name: string;
          id?: string;
          is_approved?: boolean;
          mime_type?: string | null;
          size_bytes?: number | null;
          storage_path: string;
          updated_at?: string;
          upload_status?: string;
          uploaded_by?: string;
          version?: number;
          video_task_id: string;
        };
        Update: {
          asset_type?: string;
          created_at?: string;
          duration_seconds?: number | null;
          file_name?: string;
          id?: string;
          is_approved?: boolean;
          mime_type?: string | null;
          size_bytes?: number | null;
          storage_path?: string;
          updated_at?: string;
          upload_status?: string;
          uploaded_by?: string;
          version?: number;
          video_task_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "video_assets_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "video_assets_video_task_id_fkey";
            columns: ["video_task_id"];
            isOneToOne: false;
            referencedRelation: "video_tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      video_production_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          asset_id: string | null;
          comment: string | null;
          created_at: string;
          from_status: string | null;
          id: string;
          to_status: string | null;
          video_task_id: string;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor_id?: string | null;
          asset_id?: string | null;
          comment?: string | null;
          created_at?: string;
          from_status?: string | null;
          id?: string;
          to_status?: string | null;
          video_task_id: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          asset_id?: string | null;
          comment?: string | null;
          created_at?: string;
          from_status?: string | null;
          id?: string;
          to_status?: string | null;
          video_task_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "video_production_logs_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "video_production_logs_asset_id_fkey";
            columns: ["asset_id"];
            isOneToOne: false;
            referencedRelation: "video_assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "video_production_logs_video_task_id_fkey";
            columns: ["video_task_id"];
            isOneToOne: false;
            referencedRelation: "video_tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      video_scripts: {
        Row: {
          content: string | null;
          created_at: string;
          created_by: string;
          id: string;
          storage_path: string | null;
          title: string | null;
          version: number;
          video_task_id: string;
        };
        ComputedFields: never;
        Insert: {
          content?: string | null;
          created_at?: string;
          created_by?: string;
          id?: string;
          storage_path?: string | null;
          title?: string | null;
          version?: number;
          video_task_id: string;
        };
        Update: {
          content?: string | null;
          created_at?: string;
          created_by?: string;
          id?: string;
          storage_path?: string | null;
          title?: string | null;
          version?: number;
          video_task_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "video_scripts_video_task_id_fkey";
            columns: ["video_task_id"];
            isOneToOne: false;
            referencedRelation: "video_tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      video_tasks: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          calendar_id: string | null;
          company_id: string;
          created_at: string;
          created_by: string | null;
          creator_id: string | null;
          deleted_at: string | null;
          description: string | null;
          editing_deadline: string | null;
          editor_id: string | null;
          id: string;
          priority: string;
          project_id: string | null;
          published_at: string | null;
          published_url: string | null;
          reference_links: string[];
          shooting_date: string | null;
          shooting_location: string | null;
          shooting_time: string | null;
          status: string;
          task_id: string | null;
          title: string;
          updated_at: string;
          video_number: number;
          video_type: string;
        };
        ComputedFields: never;
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          calendar_id?: string | null;
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          creator_id?: string | null;
          deleted_at?: string | null;
          description?: string | null;
          editing_deadline?: string | null;
          editor_id?: string | null;
          id?: string;
          priority?: string;
          project_id?: string | null;
          published_at?: string | null;
          published_url?: string | null;
          reference_links?: string[];
          shooting_date?: string | null;
          shooting_location?: string | null;
          shooting_time?: string | null;
          status?: string;
          task_id?: string | null;
          title: string;
          updated_at?: string;
          video_number?: never;
          video_type?: string;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          calendar_id?: string | null;
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          creator_id?: string | null;
          deleted_at?: string | null;
          description?: string | null;
          editing_deadline?: string | null;
          editor_id?: string | null;
          id?: string;
          priority?: string;
          project_id?: string | null;
          published_at?: string | null;
          published_url?: string | null;
          reference_links?: string[];
          shooting_date?: string | null;
          shooting_location?: string | null;
          shooting_time?: string | null;
          status?: string;
          task_id?: string | null;
          title?: string;
          updated_at?: string;
          video_number?: never;
          video_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "video_tasks_approved_by_fkey";
            columns: ["approved_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "video_tasks_calendar_id_fkey";
            columns: ["calendar_id"];
            isOneToOne: false;
            referencedRelation: "social_media_calendar";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "video_tasks_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "video_tasks_creator_id_fkey";
            columns: ["creator_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "video_tasks_editor_id_fkey";
            columns: ["editor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "video_tasks_project_id_company_id_fkey";
            columns: ["project_id", "company_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id", "company_id"];
          },
          {
            foreignKeyName: "video_tasks_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      ad_campaign_daily_stats: {
        Row: {
          ad_account_id: string;
          campaign_id: string;
          clicks: number | null;
          company_id: string;
          conversion_value: number | null;
          conversions: number | null;
          cost_per_conversion: number | null;
          cpc: number | null;
          cpl: number | null;
          cpm: number | null;
          ctr: number | null;
          impressions: number | null;
          leads: number | null;
          link_clicks: number | null;
          metric_date: string;
          platform: string;
          project_id: string | null;
          reach: number | null;
          roas: number | null;
          source: string;
          spend: number | null;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "ad_campaign_metrics_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "ad_campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ad_campaigns_ad_account_id_fkey";
            columns: ["ad_account_id"];
            isOneToOne: false;
            referencedRelation: "ad_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ad_campaigns_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ad_campaigns_project_id_company_id_fkey";
            columns: ["project_id", "company_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id", "company_id"];
          },
        ];
      };
    };
    Functions: {
      create_organization: {
        Args: { p_name: string; p_slug?: string };
        Returns: string;
      };
      get_my_grants: {
        Args: Record<PropertyKey, never>;
        Returns: {
          company_id: string;
          organization_id: string;
          permission_key: string;
          project_id: string;
        }[];
      };
      global_search: {
        Args: { p_limit?: number; p_query: string };
        Returns: {
          company_id: string;
          entity_type: string;
          id: string;
          project_id: string;
          rank: number;
          subtitle: string;
          title: string;
          url: string;
        }[];
      };
      has_permission: {
        Args: {
          p_company_id?: string;
          p_organization_id?: string;
          p_permission: string;
          p_project_id?: string;
        };
        Returns: boolean;
      };
      organization_bootstrap_open: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      slugify: { Args: { value: string }; Returns: string };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
