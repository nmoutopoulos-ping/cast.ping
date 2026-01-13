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
      entities: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          notes: string | null
          updated_at: string
          user_id: string
          wallet_address: string | null
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
          user_id: string
          wallet_address?: string | null
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
          wallet_address?: string | null
        }
        Relationships: []
      }
      entity_tags: {
        Row: {
          created_at: string
          entity_id: string
          id: string
          tag_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          id?: string
          tag_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          id?: string
          tag_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_tags_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_wallets: {
        Row: {
          created_at: string
          entity_id: string
          id: string
          user_id: string
          wallet_address: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          id?: string
          user_id: string
          wallet_address: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          id?: string
          user_id?: string
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_wallets_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      paxg_snapshots: {
        Row: {
          as_of_date: string
          as_of_time: string
          captured_at: string
          coingecko_id: string
          id: string
          inserted_at: string
          market_cap_usd: number | null
          price_usd: number
          ticker: string
        }
        Insert: {
          as_of_date: string
          as_of_time: string
          captured_at?: string
          coingecko_id: string
          id?: string
          inserted_at?: string
          market_cap_usd?: number | null
          price_usd: number
          ticker: string
        }
        Update: {
          as_of_date?: string
          as_of_time?: string
          captured_at?: string
          coingecko_id?: string
          id?: string
          inserted_at?: string
          market_cap_usd?: number | null
          price_usd?: number
          ticker?: string
        }
        Relationships: []
      }
      saved_queries: {
        Row: {
          created_at: string
          description: string | null
          dune_query_id: string
          id: string
          name: string
          search_type: string
          updated_at: string
          user_id: string | null
          wallet_address: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          dune_query_id: string
          id?: string
          name: string
          search_type?: string
          updated_at?: string
          user_id?: string | null
          wallet_address?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          dune_query_id?: string
          id?: string
          name?: string
          search_type?: string
          updated_at?: string
          user_id?: string | null
          wallet_address?: string | null
        }
        Relationships: []
      }
      saved_views: {
        Row: {
          active_filters: Json
          created_at: string
          filter_mode: string
          hidden_columns: string[]
          id: string
          method_filters: string[]
          name: string
          saved_query_id: string
          tag_filter_mode: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active_filters?: Json
          created_at?: string
          filter_mode?: string
          hidden_columns?: string[]
          id?: string
          method_filters?: string[]
          name: string
          saved_query_id: string
          tag_filter_mode?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active_filters?: Json
          created_at?: string
          filter_mode?: string
          hidden_columns?: string[]
          id?: string
          method_filters?: string[]
          name?: string
          saved_query_id?: string
          tag_filter_mode?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_views_saved_query_id_fkey"
            columns: ["saved_query_id"]
            isOneToOne: false
            referencedRelation: "saved_queries"
            referencedColumns: ["id"]
          },
        ]
      }
      stablecoin_snapshots: {
        Row: {
          as_of_date: string
          as_of_time: string
          captured_at: string
          coingecko_id: string
          id: string
          inserted_at: string
          market_cap_usd: number | null
          price_usd: number
          ticker: string
        }
        Insert: {
          as_of_date: string
          as_of_time: string
          captured_at?: string
          coingecko_id: string
          id?: string
          inserted_at?: string
          market_cap_usd?: number | null
          price_usd: number
          ticker: string
        }
        Update: {
          as_of_date?: string
          as_of_time?: string
          captured_at?: string
          coingecko_id?: string
          id?: string
          inserted_at?: string
          market_cap_usd?: number | null
          price_usd?: number
          ticker?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string
          contract_address: string | null
          created_at: string
          decimals: number | null
          id: string
          name: string
          token_name: string | null
          token_symbol: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          contract_address?: string | null
          created_at?: string
          decimals?: number | null
          id?: string
          name: string
          token_name?: string | null
          token_symbol?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          contract_address?: string | null
          created_at?: string
          decimals?: number | null
          id?: string
          name?: string
          token_name?: string | null
          token_symbol?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          block_number: number | null
          block_time: string | null
          created_at: string
          direction: string | null
          from_address: string | null
          gas_price: number | null
          gas_used: number | null
          id: string
          method: string | null
          nonce: number | null
          saved_query_id: string
          success: boolean | null
          to_address: string | null
          token_amount: number | null
          token_amount_raw: string | null
          token_contract: string | null
          token_direction: string | null
          token_from: string | null
          token_name: string | null
          token_symbol: string | null
          token_to: string | null
          transaction_index: number | null
          tx_fee_eth: number | null
          tx_hash: string
          user_id: string
          value_eth: number | null
        }
        Insert: {
          block_number?: number | null
          block_time?: string | null
          created_at?: string
          direction?: string | null
          from_address?: string | null
          gas_price?: number | null
          gas_used?: number | null
          id?: string
          method?: string | null
          nonce?: number | null
          saved_query_id: string
          success?: boolean | null
          to_address?: string | null
          token_amount?: number | null
          token_amount_raw?: string | null
          token_contract?: string | null
          token_direction?: string | null
          token_from?: string | null
          token_name?: string | null
          token_symbol?: string | null
          token_to?: string | null
          transaction_index?: number | null
          tx_fee_eth?: number | null
          tx_hash: string
          user_id: string
          value_eth?: number | null
        }
        Update: {
          block_number?: number | null
          block_time?: string | null
          created_at?: string
          direction?: string | null
          from_address?: string | null
          gas_price?: number | null
          gas_used?: number | null
          id?: string
          method?: string | null
          nonce?: number | null
          saved_query_id?: string
          success?: boolean | null
          to_address?: string | null
          token_amount?: number | null
          token_amount_raw?: string | null
          token_contract?: string | null
          token_direction?: string | null
          token_from?: string | null
          token_name?: string | null
          token_symbol?: string | null
          token_to?: string | null
          transaction_index?: number | null
          tx_fee_eth?: number | null
          tx_hash?: string
          user_id?: string
          value_eth?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_saved_query_id_fkey"
            columns: ["saved_query_id"]
            isOneToOne: false
            referencedRelation: "saved_queries"
            referencedColumns: ["id"]
          },
        ]
      }
      user_ticker_colors: {
        Row: {
          color: string
          created_at: string
          id: string
          ticker: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color: string
          created_at?: string
          id?: string
          ticker: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          ticker?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  public: {
    Enums: {},
  },
} as const
