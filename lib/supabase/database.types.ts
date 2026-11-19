export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, Required extends keyof Row = never> = {
  Row: Row;
  Insert: Pick<Row, Required> & Partial<Omit<Row, Required>>;
  Update: Partial<Row>;
  Relationships: [];
};

type UsageLimit = { allowed: boolean; retry_after_seconds: number };
type UsageSummary = { tool_id: string; is_pro: boolean; used_count: number };

export type Database = {
  public: {
    Tables: {
      ai_ocr_rate_limits: Table<{ user_id: string; window_started_at: string; request_count: number }>;
      document_analysis_rate_limits: Table<{ user_id: string; window_started_at: string; request_count: number }>;
      form_extractor_rate_limits: Table<{ user_id: string; window_started_at: string; request_count: number }>;
      receipt_scanner_rate_limits: Table<{ user_id: string; window_started_at: string; request_count: number }>;
      tool_usage: Table<{ user_id: string; month_start: string; used_count: number }>;
      subscriptions: Table<{
        user_id: string;
        stripe_customer_id: string | null;
        stripe_subscription_id: string | null;
        status: string;
        price_id: string | null;
        current_period_end: string | null;
        cancel_at_period_end: boolean;
        created_at: string;
        updated_at: string;
      }, "user_id" | "status" | "cancel_at_period_end">;
      extractions: Table<{
        id: string;
        user_id: string;
        file_name: string;
        extracted_text: string;
        language: string;
        created_at: string;
      }, "user_id" | "file_name" | "extracted_text" | "language">;
      stripe_webhook_events: Table<{
        id: string;
        event_type: string;
        processed_at: string | null;
      }, "id" | "event_type" | "processed_at">;
      tool_history: Table<{
        id: string;
        user_id: string;
        tool_type: string;
        file_name: string;
        output_file_name: string | null;
        result_text: string | null;
        language: string | null;
        storage_path: string | null;
        mime_type: string | null;
        metadata: Json;
        created_at: string;
      }, "user_id" | "tool_type" | "file_name" | "metadata">;
      tool_usage_events: Table<{
        id: string;
        user_id: string;
        tool_id: string;
        status: string;
        created_at: string;
        completed_at: string | null;
        reservation_expires_at: string;
      }, "user_id" | "tool_id" | "status" | "reservation_expires_at">;
      contact_rate_limits: Table<{
        identifier: string;
        window_started_at: string;
        request_count: number;
      }, "identifier" | "window_started_at" | "request_count">;
    };
    Views: Record<string, never>;
    Functions: {
      reserve_tool_usage: {
        Args: { p_user_id: string; p_tool_id: string };
        Returns: { allowed: boolean; is_pro: boolean; used_count: number; reservation_id: string | null }[];
      };
      complete_tool_usage: { Args: { p_reservation_id: string }; Returns: boolean };
      release_tool_usage: { Args: { p_reservation_id: string }; Returns: boolean };
      get_my_tool_usage: { Args: Record<PropertyKey, never>; Returns: UsageSummary[] };
      consume_ai_ocr_request: { Args: Record<PropertyKey, never>; Returns: UsageLimit[] };
      consume_document_analysis_request: { Args: Record<PropertyKey, never>; Returns: UsageLimit[] };
      consume_form_extractor_request: { Args: Record<PropertyKey, never>; Returns: UsageLimit[] };
      consume_receipt_scanner_request: { Args: Record<PropertyKey, never>; Returns: UsageLimit[] };
      consume_tool_usage: { Args: Record<PropertyKey, never>; Returns: UsageLimit[] };
      get_tool_usage: { Args: Record<PropertyKey, never>; Returns: UsageSummary[] };
      save_extraction: {
        Args: { p_file_name: string; p_extracted_text: string; p_language?: string };
        Returns: string;
      };
      consume_contact_rate_limit: { Args: { p_identifier: string }; Returns: boolean };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
