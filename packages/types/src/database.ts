// Auto-generated from Supabase schema — DO NOT EDIT manually.
// Run: pnpm supabase gen types typescript --local > packages/types/src/database.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          phone: string
          name: string | null
          email: string | null
          avatar_url: string | null
          role: 'customer' | 'barber' | 'shop_owner' | 'admin'
          loyalty_points: number
          loyalty_tier: 'bronze' | 'silver' | 'gold' | 'platinum'
          no_show_count: number
          fcm_token: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'created_at' | 'updated_at'> & {
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['users']['Insert']>
        Relationships: []
      }
      shops: {
        Row: {
          id: string
          owner_id: string
          name: string
          slug: string | null
          description: string | null
          phone: string
          address: string
          city: string
          state: string
          pincode: string
          lat: number
          lng: number
          status: 'pending' | 'verified' | 'rejected' | 'suspended'
          photos: string[]
          features: string[]
          specialties: string[]
          social_instagram: string | null
          social_facebook: string | null
          gst_number: string | null
          razorpay_account_id: string | null
          rating: number
          review_count: number
          is_featured: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['shops']['Row'], 'created_at' | 'updated_at' | 'rating' | 'review_count'> & {
          rating?: number
          review_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['shops']['Insert']>
        Relationships: []
      }
      shop_hours: {
        Row: {
          id: string
          shop_id: string
          day_of_week: number
          open_time: string
          close_time: string
          is_closed: boolean
        }
        Insert: Omit<Database['public']['Tables']['shop_hours']['Row'], 'id'> & { id?: string }
        Update: Partial<Database['public']['Tables']['shop_hours']['Insert']>
        Relationships: []
      }
      shop_breaks: {
        Row: {
          id: string
          shop_id: string
          day_of_week: number | null
          start_time: string
          end_time: string
          label: string | null
        }
        Insert: Omit<Database['public']['Tables']['shop_breaks']['Row'], 'id'> & { id?: string }
        Update: Partial<Database['public']['Tables']['shop_breaks']['Insert']>
        Relationships: []
      }
      barbers: {
        Row: {
          id: string
          shop_id: string
          user_id: string | null
          name: string
          phone: string
          avatar_url: string | null
          specialties: string[]
          bio: string | null
          rating: number
          review_count: number
          is_active: boolean
          invite_status: 'pending' | 'accepted' | 'declined'
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['barbers']['Row'], 'created_at' | 'rating' | 'review_count'> & {
          id?: string
          rating?: number
          review_count?: number
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['barbers']['Insert']>
        Relationships: []
      }
      barber_hours: {
        Row: {
          id: string
          barber_id: string
          day_of_week: number
          open_time: string
          close_time: string
          is_off: boolean
        }
        Insert: Omit<Database['public']['Tables']['barber_hours']['Row'], 'id'> & { id?: string }
        Update: Partial<Database['public']['Tables']['barber_hours']['Insert']>
        Relationships: []
      }
      services: {
        Row: {
          id: string
          shop_id: string
          name: string
          category: 'hair' | 'beard' | 'skin' | 'combo' | 'kids'
          duration_min: 15 | 30 | 45 | 60 | 90
          price: number
          description: string | null
          is_active: boolean
          is_addon: boolean
          sort_order: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['services']['Row'], 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['services']['Insert']>
        Relationships: []
      }
      slot_blocks: {
        Row: {
          id: string
          shop_id: string
          barber_id: string | null
          block_date: string | null
          start_time: string
          end_time: string
          reason: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['slot_blocks']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['slot_blocks']['Insert']>
        Relationships: []
      }
      slot_holds: {
        Row: {
          id: string
          shop_id: string
          barber_id: string
          user_id: string
          hold_date: string
          start_time: string
          end_time: string
          expires_at: string
          booking_id: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['slot_holds']['Row'], 'id' | 'created_at' | 'expires_at'> & {
          id?: string
          expires_at?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['slot_holds']['Insert']>
        Relationships: []
      }
      bookings: {
        Row: {
          id: string
          booking_ref: string
          user_id: string
          shop_id: string
          barber_id: string | null
          service_ids: string[]
          addon_ids: string[]
          date: string
          start_time: string
          end_time: string
          status: BookingStatus
          total_amount: number
          advance_amount: number
          instructions: string | null
          reference_photo_url: string | null
          cancel_reason: string | null
          cancelled_by: 'customer' | 'shop' | 'system' | null
          no_show_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['bookings']['Row'], 'id' | 'booking_ref' | 'created_at' | 'updated_at'> & {
          id?: string
          booking_ref?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['bookings']['Insert']>
        Relationships: []
      }
      payments: {
        Row: {
          id: string
          booking_id: string
          user_id: string
          amount: number
          type: 'advance' | 'refund' | 'compensation'
          method: string | null
          status: 'pending' | 'captured' | 'failed' | 'refunded'
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          refund_id: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['payments']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['payments']['Insert']>
        Relationships: []
      }
      reviews: {
        Row: {
          id: string
          booking_id: string
          user_id: string
          shop_id: string
          barber_id: string | null
          rating: number
          barber_rating: number | null
          wait_rating: number | null
          cleanliness_rating: number | null
          text: string | null
          photos: string[]
          is_visible: boolean
          shop_response: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['reviews']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['reviews']['Insert']>
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: 'booking_confirmed' | 'booking_cancelled' | 'reminder' | 'loyalty' | 'promotion' | 'no_show' | 'review_request' | 'dispute'
          title: string
          body: string
          data: Json
          is_read: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at' | 'is_read'> & {
          id?: string
          is_read?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>
        Relationships: []
      }
      loyalty_transactions: {
        Row: {
          id: string
          user_id: string
          booking_id: string | null
          points: number
          type: 'earn' | 'redeem' | 'bonus' | 'expire'
          description: string
          balance_after: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['loyalty_transactions']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['loyalty_transactions']['Insert']>
        Relationships: []
      }
      promotions: {
        Row: {
          id: string
          shop_id: string
          type: 'flat_discount' | 'combo' | 'happy_hour' | 'new_customer' | 'loyalty_bonus'
          title: string
          discount_value: number
          service_id: string | null
          valid_from: string
          valid_to: string | null
          applicable_hours_start: string | null
          applicable_hours_end: string | null
          is_active: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['promotions']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['promotions']['Insert']>
        Relationships: []
      }
      favourites: {
        Row: {
          user_id: string
          shop_id: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['favourites']['Row'], 'created_at'> & { created_at?: string }
        Update: Partial<Database['public']['Tables']['favourites']['Insert']>
        Relationships: []
      }
      disputes: {
        Row: {
          id: string
          booking_id: string
          user_id: string
          shop_id: string
          reason: 'service_not_delivered' | 'quality_poor' | 'wrong_charge' | 'other'
          description: string
          photos: string[]
          status: 'open' | 'shop_responded' | 'escalated' | 'resolved_refund' | 'resolved_no_refund' | 'dismissed'
          payment_in_escrow: boolean
          admin_decision: string | null
          sla_deadline: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['disputes']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['disputes']['Insert']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      shops_nearby: {
        Args: {
          lat: number
          lng: number
          radius_km: number
          filter_open_now?: boolean
          filter_min_rating?: number
          filter_max_price?: number
          filter_features?: string[]
        }
        Returns: Array<Database['public']['Tables']['shops']['Row'] & { distance_km: number }>
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type BookingStatus =
  | 'pending_payment'
  | 'confirmed'
  | 'in_chair'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'disputed'
  | 'expired'

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
