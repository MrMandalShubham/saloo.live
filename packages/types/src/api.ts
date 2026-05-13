import type { Tables } from './database'
export type { BookingStatus } from './database'

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface RequestOtpPayload { phone: string }
export interface RequestOtpResponse { message: string }

export interface VerifyOtpPayload { phone: string; otp: string }
export interface VerifyOtpResponse { access_token: string; refresh_token: string; user: Tables<'users'> }

// ─── Shops ───────────────────────────────────────────────────────────────────

export interface ShopWithDistance extends Tables<'shops'> {
  distance_km: number
  is_open_now: boolean
  wait_estimate_min: number | null
}

export interface ShopProfile extends Tables<'shops'> {
  hours: Tables<'shop_hours'>[]
  breaks: Tables<'shop_breaks'>[]
  barbers: Array<Tables<'barbers'> & { hours: Tables<'barber_hours'>[] }>
  services: Tables<'services'>[]
  promotions: Tables<'promotions'>[]
  latest_reviews: ReviewWithUser[]
  is_favourite: boolean
  distance_km: number | null
}

export interface NearbyShopsParams {
  lat: number
  lng: number
  radius_km?: number
  open_now?: boolean
  min_rating?: number
  max_price?: number
  features?: string[]
  sort_by?: 'nearest' | 'top_rated' | 'fastest' | 'cheapest'
  page?: number
  limit?: number
}

export interface AvailabilityParams {
  shop_id: string
  barber_id?: string
  date: string  // YYYY-MM-DD
}

export interface TimeSlot {
  start_time: string  // HH:MM
  end_time: string
  barber_id: string
  is_available: boolean
  is_popular: boolean
}

export interface AvailabilityResponse {
  date: string
  slots: TimeSlot[]
}

// ─── Bookings ────────────────────────────────────────────────────────────────

export interface HoldSlotPayload {
  shop_id: string
  barber_id: string
  date: string
  start_time: string
  service_ids: string[]
  addon_ids?: string[]
}

export interface HoldSlotResponse {
  hold_id: string
  expires_at: string
  total_duration_min: number
  total_amount: number
  advance_amount: number
}

export interface CreateBookingPayload {
  hold_id: string
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
  instructions?: string
}

export interface BookingDetail extends Tables<'bookings'> {
  shop: Pick<Tables<'shops'>, 'id' | 'name' | 'address' | 'phone' | 'photos'>
  barber: Pick<Tables<'barbers'>, 'id' | 'name' | 'avatar_url'> | null
  services: Tables<'services'>[]
  payment: Tables<'payments'> | null
  review: Tables<'reviews'> | null
  dispute: Tables<'disputes'> | null
}

export interface CancelBookingPayload {
  reason?: string
}

export interface CancelBookingResponse {
  refund_amount: number
  refund_type: 'full' | 'partial' | 'none'
  message: string
}

// ─── Payments ────────────────────────────────────────────────────────────────

export interface CreateOrderPayload { hold_id: string }
export interface CreateOrderResponse {
  razorpay_order_id: string
  amount: number      // in paise
  currency: 'INR'
  key_id: string
}

// ─── Reviews ─────────────────────────────────────────────────────────────────

export interface ReviewWithUser extends Tables<'reviews'> {
  user: Pick<Tables<'users'>, 'name' | 'avatar_url'>
}

export interface CreateReviewPayload {
  booking_id: string
  rating: number
  barber_rating?: number
  wait_rating?: number
  cleanliness_rating?: number
  text?: string
  photos?: string[]  // base64 or storage paths
}

// ─── Loyalty ─────────────────────────────────────────────────────────────────

export interface LoyaltyData {
  points: number
  tier: 'bronze' | 'silver' | 'gold' | 'platinum'
  points_to_next_tier: number
  next_tier: 'silver' | 'gold' | 'platinum' | null
  transactions: Tables<'loyalty_transactions'>[]
  total_visits: number
}

// ─── Notifications ───────────────────────────────────────────────────────────

export type NotificationFilter = 'all' | 'transactional' | 'promotions' | 'loyalty'

// ─── Disputes ────────────────────────────────────────────────────────────────

export interface CreateDisputePayload {
  booking_id: string
  reason: Tables<'disputes'>['reason']
  description: string
  photos?: string[]
}

// ─── API Response wrapper ────────────────────────────────────────────────────

export interface ApiSuccess<T> { data: T; error: null }
export interface ApiError { data: null; error: { message: string; code?: string } }
export type ApiResponse<T> = ApiSuccess<T> | ApiError

// ─── Owner: Dashboard ────────────────────────────────────────────────────────

export interface OwnerDashboardData {
  today_bookings: number
  today_revenue: number
  pending_confirmations: number
  upcoming_today: Array<{
    id: string
    booking_ref: string
    start_time: string
    end_time: string
    status: string
    customer_name: string
    service_names: string[]
    barber_name: string | null
  }>
  weekly_revenue: number
  total_reviews: number
  avg_rating: number
  active_disputes: number
}

// ─── Owner: Shop ─────────────────────────────────────────────────────────────

export interface OwnerShopProfile extends Tables<'shops'> {
  hours: Tables<'shop_hours'>[]
  breaks: Tables<'shop_breaks'>[]
  barbers: Array<Tables<'barbers'> & { hours: Tables<'barber_hours'>[] }>
  services: Tables<'services'>[]
  promotions: Tables<'promotions'>[]
}

export interface UpdateShopPayload {
  name?: string
  description?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  features?: string[]
  specialties?: string[]
  gst_number?: string
  social_instagram?: string
  social_facebook?: string
}

export interface UpdateShopHoursPayload {
  hours: Array<{
    day_of_week: number    // 0=Sun … 6=Sat
    open_time: string      // HH:MM
    close_time: string
    is_closed: boolean
  }>
  breaks: Array<{
    day_of_week: number
    start_time: string
    end_time: string
  }>
}

// ─── Owner: Bookings ─────────────────────────────────────────────────────────

export interface OwnerBookingListItem {
  id: string
  booking_ref: string
  date: string
  start_time: string
  end_time: string
  status: string
  total_amount: number
  advance_amount: number
  instructions: string | null
  customer: { name: string | null; phone: string; avatar_url: string | null }
  barber: { id: string; name: string; avatar_url: string | null } | null
  service_names: string[]
  has_dispute: boolean
}

export interface UpdateBookingStatusPayload {
  status: 'confirmed' | 'in_chair' | 'completed' | 'no_show'
}

// ─── Owner: Team (Barbers) ────────────────────────────────────────────────────

export interface InviteBarberPayload {
  phone: string
  name: string
  specialties?: string[]
  bio?: string
}

export interface UpdateBarberPayload {
  name?: string
  specialties?: string[]
  bio?: string
  is_active?: boolean
}

// ─── Owner: Services ──────────────────────────────────────────────────────────

export interface UpsertServicePayload {
  id?: string
  name: string
  category: string
  duration_min: number
  price: number
  description?: string
  is_addon?: boolean
  is_active?: boolean
}

// ─── Owner: Slot Blocks ───────────────────────────────────────────────────────

export interface CreateBlockPayload {
  barber_id?: string | null
  date: string
  start_time: string
  end_time: string
  reason?: string
}

// ─── Owner: Analytics ────────────────────────────────────────────────────────

export interface OwnerAnalyticsData {
  period: '7d' | '30d' | '90d'
  total_bookings: number
  total_revenue: number
  avg_booking_value: number
  completion_rate: number
  cancellation_rate: number
  no_show_rate: number
  avg_rating: number
  new_customers: number
  repeat_customers: number
  top_services: Array<{ name: string; count: number; revenue: number }>
  top_barbers: Array<{ name: string; bookings: number; rating: number }>
  revenue_by_day: Array<{ date: string; revenue: number; bookings: number }>
}

// ─── Owner: Promotions ────────────────────────────────────────────────────────

export interface UpsertPromotionPayload {
  id?: string
  title: string
  type: Tables<'promotions'>['type']
  discount_value: number
  min_order_amount?: number
  valid_from: string
  valid_until: string
  applicable_days?: number[]
  start_time?: string
  end_time?: string
  is_active?: boolean
}

// ─── Owner: Reviews ───────────────────────────────────────────────────────────

export interface OwnerReviewItem extends ReviewWithUser {
  booking_ref: string
  barber_name: string | null
  responded_at: string | null
}

export interface RespondToReviewPayload {
  review_id: string
  response: string
}

// ─── Admin: Dashboard ─────────────────────────────────────────────────────────

export interface AdminDashboardData {
  total_shops: number
  pending_approval: number
  suspended_shops: number
  total_users: number
  new_users_today: number
  bookings_today: number
  revenue_today: number
  revenue_mtd: number
  open_disputes: number
  escalated_disputes: number
  platform_completion_rate: number
  platform_avg_rating: number
}

// ─── Admin: Shops ─────────────────────────────────────────────────────────────

export interface AdminShopListItem {
  id: string
  name: string
  owner_name: string
  owner_phone: string
  city: string
  status: string
  rating: number
  review_count: number
  total_bookings: number
  total_revenue: number
  created_at: string
}

export interface UpdateShopStatusPayload {
  shop_id: string
  status: 'verified' | 'suspended' | 'pending'
  reason?: string
}

// ─── Admin: Users ─────────────────────────────────────────────────────────────

export interface AdminUserListItem {
  id: string
  phone: string
  full_name: string | null
  role: string
  loyalty_tier: string
  loyalty_points: number
  no_show_count: number
  total_bookings: number
  is_suspended: boolean
  created_at: string
}

export interface UpdateUserPayload {
  user_id: string
  role?: 'customer' | 'shop_owner' | 'admin'
  is_suspended?: boolean
}

// ─── Admin: Disputes ──────────────────────────────────────────────────────────

export interface AdminDisputeListItem {
  id: string
  booking_ref: string
  customer_name: string
  shop_name: string
  reason: string
  status: string
  amount_at_stake: number
  in_escrow: boolean
  created_at: string
  sla_deadline: string | null
}

export interface ResolveDisputePayload {
  dispute_id: string
  resolution: 'refund_customer' | 'pay_shop' | 'split' | 'dismissed'
  resolution_note: string
  refund_amount?: number
}

// ─── Admin: Analytics ────────────────────────────────────────────────────────

export interface AdminAnalyticsData {
  period: '7d' | '30d' | '90d'
  total_revenue: number
  total_bookings: number
  total_new_users: number
  total_new_shops: number
  avg_booking_value: number
  platform_completion_rate: number
  revenue_by_day: Array<{ date: string; revenue: number; bookings: number }>
  bookings_by_status: Array<{ status: string; count: number }>
  top_cities: Array<{ city: string; bookings: number; revenue: number }>
  top_shops: Array<{ name: string; bookings: number; revenue: number; rating: number }>
}

// ─── Admin: Notifications ────────────────────────────────────────────────────

export interface SendNotificationPayload {
  title: string
  body: string
  target: 'all' | 'customers' | 'shop_owners' | 'specific'
  user_ids?: string[]
  data?: Record<string, string>
}

// ─── Admin: Audit Log ─────────────────────────────────────────────────────────

export interface AdminActionLog {
  id: string
  admin_id: string
  action_type: string
  target_type: 'shop' | 'user' | 'dispute' | 'booking'
  target_id: string
  details: Record<string, unknown>
  created_at: string
}
