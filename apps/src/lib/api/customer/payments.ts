import type { CreateOrderPayload, CreateOrderResponse, CreateBookingPayload, BookingDetail, ApiResponse } from '@saloo/types'
import { invoke } from '../_invoke'

export function createOrder(payload: CreateOrderPayload, token: string): Promise<ApiResponse<CreateOrderResponse>> {
  return invoke('payments-create-order', payload, token)
}

export function verifyPayment(payload: CreateBookingPayload, token: string): Promise<ApiResponse<BookingDetail>> {
  return invoke('payments-verify', payload, token)
}
