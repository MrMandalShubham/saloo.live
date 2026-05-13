import type { HoldSlotPayload, HoldSlotResponse, BookingDetail, CancelBookingPayload, CancelBookingResponse, ApiResponse } from '@saloo/types'
// import type { Tables } from '@saloo/types'
import { invoke } from '../_invoke'

export function holdSlot(payload: HoldSlotPayload, token: string): Promise<ApiResponse<HoldSlotResponse>> {
  return invoke('bookings-hold', payload, token)
}

export function getBooking(bookingId: string, token: string): Promise<ApiResponse<BookingDetail>> {
  return invoke('bookings-get', { booking_id: bookingId }, token)
}

export function listBookings(
  params: { status?: string; page?: number; limit?: number },
  token: string,
): Promise<ApiResponse<{ bookings: BookingDetail[]; total: number }>> {
  return invoke('bookings-list', params, token)
}

export function cancelBooking(bookingId: string, payload: CancelBookingPayload, token: string): Promise<ApiResponse<CancelBookingResponse>> {
  return invoke('bookings-cancel', { booking_id: bookingId, ...payload }, token)
}
