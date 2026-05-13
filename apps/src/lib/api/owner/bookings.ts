import type { OwnerBookingListItem, UpdateBookingStatusPayload, ApiResponse } from '@saloo/types'
import { invoke } from '../_invoke'

export function listOwnerBookings(
  params: { date?: string; status?: string; barber_id?: string; page?: number },
  token: string,
): Promise<ApiResponse<{ bookings: OwnerBookingListItem[]; total: number }>> {
  return invoke('owner-bookings-list', params, token)
}

export function updateBookingStatus(
  bookingId: string,
  payload: UpdateBookingStatusPayload,
  token: string,
): Promise<ApiResponse<{ updated: boolean }>> {
  return invoke('owner-bookings-update', { booking_id: bookingId, ...payload }, token)
}
