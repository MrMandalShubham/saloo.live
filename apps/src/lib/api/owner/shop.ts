import type { OwnerShopProfile, UpdateShopPayload, UpdateShopHoursPayload, ApiResponse } from '@saloo/types'
import { invoke } from '../_invoke'

export function getOwnerShop(token: string): Promise<ApiResponse<OwnerShopProfile>> {
  return invoke('owner-shop-get', {}, token)
}

export function updateShop(payload: UpdateShopPayload, token: string): Promise<ApiResponse<OwnerShopProfile>> {
  return invoke('owner-shop-update', payload, token)
}

export function updateShopHours(payload: UpdateShopHoursPayload, token: string): Promise<ApiResponse<{ updated: boolean }>> {
  return invoke('owner-shop-hours-update', payload, token)
}
