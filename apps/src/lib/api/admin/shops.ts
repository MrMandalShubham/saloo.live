import type { AdminShopListItem, UpdateShopStatusPayload, ApiResponse } from '@saloo/types'
import { invoke } from '../_invoke'

export function listAdminShops(
  params: { status?: string; city?: string; page?: number; limit?: number },
  token: string,
): Promise<ApiResponse<{ shops: AdminShopListItem[]; total: number }>> {
  return invoke('admin-shops-list', params, token)
}

export function updateShopStatus(payload: UpdateShopStatusPayload, token: string): Promise<ApiResponse<{ updated: boolean }>> {
  return invoke('admin-shops-update', payload, token)
}
