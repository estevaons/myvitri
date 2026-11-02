// Gerado pelo Supabase (generate_typescript_types). Não editar à mão.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      coupons: {
        Row: {
          brand: string
          code: string
          condition: string
          expires_at: string | null
          id: string
          kind: string
          position: number
          store_url: string
          value: number
          vitrine_id: string
          how_to: string
          logo_url: string
          starts_at: string | null
          color: Json
        }
        Insert: {
          brand: string
          code: string
          condition?: string
          expires_at?: string | null
          id: string
          kind: string
          position: number
          store_url?: string
          value: number
          vitrine_id: string
          how_to?: string
          logo_url?: string
          starts_at?: string | null
          color?: Json
        }
        Update: {
          brand?: string
          code?: string
          condition?: string
          expires_at?: string | null
          id?: string
          kind?: string
          position?: number
          store_url?: string
          value?: number
          vitrine_id?: string
          how_to?: string
          logo_url?: string
          starts_at?: string | null
          color?: Json
        }
        Relationships: [
          {
            foreignKeyName: "coupons_vitrine_id_fkey"
            columns: ["vitrine_id"]
            isOneToOne: false
            referencedRelation: "vitrines"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          id: number
          item_id: string | null
          kind: string
          vitrine_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          item_id?: string | null
          kind: string
          vitrine_id: string
        }
        Update: {
          created_at?: string
          id?: never
          item_id?: string | null
          kind?: string
          vitrine_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_vitrine_id_fkey"
            columns: ["vitrine_id"]
            isOneToOne: false
            referencedRelation: "vitrines"
            referencedColumns: ["id"]
          },
        ]
      }
      kits: {
        Row: {
          description: string
          id: string
          position: number
          product_ids: string[]
          signature: string
          style: Json
          name: string
          vitrine_id: string
        }
        Insert: {
          description?: string
          id: string
          position: number
          product_ids?: string[]
          signature?: string
          style?: Json
          name: string
          vitrine_id: string
        }
        Update: {
          description?: string
          id?: string
          position?: number
          product_ids?: string[]
          signature?: string
          style?: Json
          name?: string
          vitrine_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kits_vitrine_id_fkey"
            columns: ["vitrine_id"]
            isOneToOne: false
            referencedRelation: "vitrines"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand: string
          category: string
          coupon_id: string | null
          icon: string
          id: string
          image_url: string
          name: string
          position: number
          price: number
          url: string
          vitrine_id: string
          affiliate_url: string
          price_checked_at: string | null
          sold_out: boolean
          video_url: string
        }
        Insert: {
          brand?: string
          category?: string
          coupon_id?: string | null
          icon?: string
          id: string
          image_url?: string
          name: string
          position: number
          price?: number
          url?: string
          vitrine_id: string
          affiliate_url?: string
          price_checked_at?: string | null
          sold_out?: boolean
          video_url?: string
        }
        Update: {
          brand?: string
          category?: string
          coupon_id?: string | null
          icon?: string
          id?: string
          image_url?: string
          name?: string
          position?: number
          price?: number
          url?: string
          vitrine_id?: string
          affiliate_url?: string
          price_checked_at?: string | null
          sold_out?: boolean
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_vitrine_id_fkey"
            columns: ["vitrine_id"]
            isOneToOne: false
            referencedRelation: "vitrines"
            referencedColumns: ["id"]
          },
        ]
      }
      vitrine_drafts: {
        Row: {
          content: Json
          owner_id: string
          updated_at: string
        }
        Insert: {
          content: Json
          owner_id: string
          updated_at?: string
        }
        Update: {
          content?: Json
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      vitrines: {
        Row: {
          avatar_url: string
          created_at: string
          handle: string
          headline: string
          id: string
          look: Json
          name: string
          owner_id: string | null
          show: Json
          sub: string
          updated_at: string
          tracking: Json
        }
        Insert: {
          avatar_url?: string
          created_at?: string
          handle: string
          headline?: string
          id?: string
          look?: Json
          name: string
          owner_id?: string | null
          show?: Json
          sub?: string
          updated_at?: string
          tracking?: Json
        }
        Update: {
          avatar_url?: string
          created_at?: string
          handle?: string
          headline?: string
          id?: string
          look?: Json
          name?: string
          owner_id?: string | null
          show?: Json
          sub?: string
          updated_at?: string
          tracking?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      owns_vitrine: { Args: { v: string }; Returns: boolean }
      publish_vitrine: { Args: { content: Json }; Returns: string }
      vitrine_stats: { Args: { days?: number }; Returns: Json }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
