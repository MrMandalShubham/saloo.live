// Auto-generated from Supabase schema — matches FULL_REBUILD.sql
// Regenerate: pnpm supabase gen types typescript --local > packages/types/src/database.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string | null
          phone: string | null
          name: string | null
          avatar_url: string | null
          role: 'customer' | 'admin'
          loyalty_points: number
          loyalty_tier: 'bronze' | 'silver' | 'gold' | 'platinum'
          no_show_count: number
          date_of_birth: string | null
          gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null
          address: string | null
          city: string | null
          pincode: string | null
          preferred_language: string
          fcm_token: string | null
          is_active: boolean
          is_suspended: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          phone?: string | null
          name?: string | null
          avatar_url?: string | null
          role?: 'customer' | 'admin'
          loyalty_points?: number
          loyalty_tier?: 'bronze' | 'silver' | 'gold' | 'platinum'
          no_show_count?: number
          date_of_birth?: string | null
          gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null
          address?: string | null
          city?: string | null
          pincode?: string | null
          preferred_language?: string
          fcm_token?: string | null
          is_active?: boolean
          is_suspended?: boolean
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
          email: string | null
          address: string
          city: string
          state: string
          pincode: string
          lat: number | null
          lng: number | null
          status: 'pending' | 'verified' | 'rejected' | 'suspended'
          photos: string[]
          features: string[]
          specialties: string[]
          social_instagram: string | null
          social_facebook: string | null
          gst_number: string | null
          razorpay_account_id: string | null
          advance_percentage: number
          auto_confirm_bookings: boolean
          slot_buffer_min: number
          rating: number
          review_count: number
          is_featured: boolean
          rejection_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          slug?: string | null
          description?: string | null
          phone: string
          email?: string | null
          address: string
          city: string
          state: string
          pincode: string
          lat?: number | null
          lng?: number | null
          status?: 'pending' | 'verified' | 'rejected' | 'suspended'
          photos?: string[]
          features?: string[]
          specialties?: string[]
          social_instagram?: string | null
          social_facebook?: string | null
          gst_number?: string | null
          razorpay_account_id?: string | null
          advance_percentage?: number
          auto_confirm_bookings?: boolean
          slot_buffer_min?: number
          rating?: number
          review_count?: number
          is_featured?: boolean
          rejection_reason?: string | null
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
        Insert: {
          id?: string
          shop_id: string
          day_of_week: number
          open_time: string
          close_time: string
          is_closed?: boolean
        }
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
        Insert: {
          id?: string
          shop_id: string
          day_of_week?: number | null
          start_time: string
          end_time: string
          label?: string | null
        }
        Update: Partial<Database['public']['Tables']['shop_breaks']['Insert']>
        Relationships: []
      }
      favourites: {
        Row: {
          user_id: string
          shop_id: string
          created_at: string
        }
        Insert: {
          user_id: string
          shop_id: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['favourites']['Insert']>
        Relationships: []
      }
      barbers: {
        Row: {
          id: string
          shop_id: string
          user_id: string | null
          name: string
          phone: string | null
          email: string | null
          avatar_url: string | null
          bio: string | null
          specialties: string[]
          rating: number
          review_count: number
          is_active: boolean
          invite_status: 'pending' | 'accepted' | 'declined'
          invite_token: string | null
          invite_expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          user_id?: string | null
          name: string
          phone?: string | null
          email?: string | null
          avatar_url?: string | null
          bio?: string | null
          specialties?: string[]
          rating?: number
          review_count?: number
          is_active?: boolean
          invite_status?: 'pending' | 'accepted' | 'declined'
          invite_token?: string | null
          invite_expires_at?: string | null
          created_at?: string
          updated_at?: string
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
        Insert: {
          id?: string
          barber_id: string
          day_of_week: number
          open_time: string
          close_time: string
          is_off?: boolean
        }
        Update: Partial<Database['public']['Tables']['barber_hours']['Insert']>
        Relationships: []
      }
      services: {
        Row: {
          id: string
          shop_id: string
          name: string
          category: 'hair' | 'beard' | 'skin' | 'combo' | 'kids' | 'other'
          duration_min: number
          price: number
          description: string | null
          image_url: string | null
          is_active: boolean
          is_addon: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          name: string
          category: 'hair' | 'beard' | 'skin' | 'combo' | 'kids' | 'other'
          duration_min: number
          price: number
          description?: string | null
          image_url?: string | null
          is_active?: boolean
          is_addon?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
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
          day_of_week: number | null
          start_time: string
          end_time: string
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          barber_id?: string | null
          block_date?: string | null
          day_of_week?: number | null
          start_time: string
          end_time: string
          reason?: string | null
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
          service_ids: string[]
          addon_ids: string[]
          expires_at: string
          booking_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          barber_id: string
          user_id: string
          hold_date: string
          start_time: string
          end_time: string
          service_ids: string[]
          addon_ids?: string[]
          expires_at?: string
          booking_id?: string | null
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
          cancelled_by: 'customer' | 'shop' | 'system' | 'admin' | null
          no_show_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          booking_ref?: string
          user_id: string
          shop_id: string
          barber_id?: string | null
          service_ids: string[]
          addon_ids?: string[]
          date: string
          start_time: string
          end_time: string
          status?: BookingStatus
          total_amount: number
          advance_amount: number
          instructions?: string | null
          reference_photo_url?: string | null
          cancel_reason?: string | null
          cancelled_by?: 'customer' | 'shop' | 'system' | 'admin' | null
          no_show_at?: string | null
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
          type: 'advance' | 'balance' | 'refund' | 'compensation'
          method: 'razorpay' | 'cash' | 'wallet' | 'loyalty' | null
          status: 'pending' | 'captured' | 'failed' | 'refunded'
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          refund_id: string | null
          failure_reason: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          user_id: string
          amount: number
          type: 'advance' | 'balance' | 'refund' | 'compensation'
          method?: 'razorpay' | 'cash' | 'wallet' | 'loyalty' | null
          status?: 'pending' | 'captured' | 'failed' | 'refunded'
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          refund_id?: string | null
          failure_reason?: string | null
          metadata?: Json
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
          shop_response_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          user_id: string
          shop_id: string
          barber_id?: string | null
          rating: number
          barber_rating?: number | null
          wait_rating?: number | null
          cleanliness_rating?: number | null
          text?: string | null
          photos?: string[]
          is_visible?: boolean
          shop_response?: string | null
          shop_response_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['reviews']['Insert']>
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: 'booking_confirmed' | 'booking_cancelled' | 'booking_reminder' | 'booking_completed' | 'loyalty_earned' | 'loyalty_redeemed' | 'promotion' | 'no_show' | 'review_request' | 'dispute_update' | 'shop_approved' | 'shop_rejected' | 'shop_suspended' | 'system'
          title: string
          body: string
          data: Json
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: Database['public']['Tables']['notifications']['Row']['type']
          title: string
          body: string
          data?: Json
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
          type: 'earn' | 'redeem' | 'bonus' | 'expire' | 'adjust'
          description: string
          balance_after: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          booking_id?: string | null
          points: number
          type: 'earn' | 'redeem' | 'bonus' | 'expire' | 'adjust'
          description: string
          balance_after: number
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['loyalty_transactions']['Insert']>
        Relationships: []
      }
      promotions: {
        Row: {
          id: string
          shop_id: string
          type: 'flat_discount' | 'percentage_discount' | 'combo' | 'happy_hour' | 'new_customer' | 'loyalty_bonus'
          title: string
          discount_value: number
          max_discount_amount: number | null
          service_ids: string[] | null
          applicable_hours_start: string | null
          applicable_hours_end: string | null
          min_booking_amount: number | null
          new_customers_only: boolean
          usage_limit: number | null
          usage_count: number
          valid_from: string
          valid_to: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          type: 'flat_discount' | 'percentage_discount' | 'combo' | 'happy_hour' | 'new_customer' | 'loyalty_bonus'
          title: string
          discount_value: number
          max_discount_amount?: number | null
          service_ids?: string[] | null
          applicable_hours_start?: string | null
          applicable_hours_end?: string | null
          min_booking_amount?: number | null
          new_customers_only?: boolean
          usage_limit?: number | null
          usage_count?: number
          valid_from?: string
          valid_to?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['promotions']['Insert']>
        Relationships: []
      }
      disputes: {
        Row: {
          id: string
          booking_id: string
          user_id: string
          shop_id: string
          reason: 'service_not_delivered' | 'quality_poor' | 'wrong_charge' | 'barber_no_show' | 'other'
          description: string
          photos: string[]
          status: 'open' | 'shop_responded' | 'under_review' | 'resolved_refund' | 'resolved_no_refund' | 'dismissed'
          shop_response: string | null
          shop_responded_at: string | null
          admin_decision: string | null
          admin_notes: string | null
          refund_amount: number | null
          sla_deadline: string
          resolved_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          user_id: string
          shop_id: string
          reason: 'service_not_delivered' | 'quality_poor' | 'wrong_charge' | 'barber_no_show' | 'other'
          description: string
          photos?: string[]
          status?: 'open' | 'shop_responded' | 'under_review' | 'resolved_refund' | 'resolved_no_refund' | 'dismissed'
          shop_response?: string | null
          shop_responded_at?: string | null
          admin_decision?: string | null
          admin_notes?: string | null
          refund_amount?: number | null
          sla_deadline?: string
          resolved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['disputes']['Insert']>
        Relationships: []
      }
      admin_actions: {
        Row: {
          id: string
          admin_id: string
          action_type: string
          target_type: 'shop' | 'user' | 'dispute' | 'booking' | 'barber'
          target_id: string
          notes: string | null
          details: Json
          created_at: string
        }
        Insert: {
          id?: string
          admin_id: string
          action_type: string
          target_type: 'shop' | 'user' | 'dispute' | 'booking' | 'barber'
          target_id: string
          notes?: string | null
          details?: Json
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['admin_actions']['Insert']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      get_user_role: {
        Args: Record<string, never>
        Returns: string
      }
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      is_own_shop: {
        Args: { p_shop_id: string }
        Returns: boolean
      }
      get_owner_shop_id: {
        Args: Record<string, never>
        Returns: string | null
      }
      get_role_by_email: {
        Args: { p_email: string }
        Returns: string | null
      }
      ensure_user_profile: {
        Args: Record<string, never>
        Returns: string
      }
      promote_to_admin: {
        Args: { p_email: string }
        Returns: undefined
      }
      atomic_hold_slot: {
        Args: {
          p_shop_id: string
          p_barber_id: string
          p_user_id: string
          p_hold_date: string
          p_start_time: string
          p_end_time: string
          p_service_ids: string[]
          p_addon_ids?: string[]
        }
        Returns: Json
      }
      increment_no_show_count: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      shops_nearby: {
        Args: {
          p_lat: number
          p_lng: number
          p_radius_km?: number
          p_open_now?: boolean
          p_min_rating?: number
          p_max_price?: number
          p_features?: string[]
          p_sort_by?: string
          p_limit?: number
          p_offset?: number
        }
        Returns: Array<{
          id: string
          name: string
          slug: string
          address: string
          city: string
          lat: number
          lng: number
          photos: string[]
          features: string[]
          specialties: string[]
          rating: number
          review_count: number
          is_featured: boolean
          distance_km: number
          is_open_now: boolean
          min_price: number
        }>
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
