import type { NearbyShopsParams, ShopWithDistance, ShopProfile, AvailabilityParams, AvailabilityResponse, ApiResponse } from '@saloo/types'
import { invoke } from '../_invoke'

export function getNearbyShops(params: NearbyShopsParams, token?: string): Promise<ApiResponse<ShopWithDistance[]>> {
  return invoke('shops-nearby', params, token)
}

export function searchShops(query: string, params?: Partial<NearbyShopsParams>, token?: string): Promise<ApiResponse<ShopWithDistance[]>> {
  return invoke('shops-search', { query, ...params }, token)
}

export function getShop(shopId: string, token?: string): Promise<ApiResponse<ShopProfile>> {
  return invoke('shops-get', { shop_id: shopId }, token)
}

export function getShopAvailability(params: AvailabilityParams, token?: string): Promise<ApiResponse<AvailabilityResponse>> {
  return invoke('shops-availability', params, token)
}
