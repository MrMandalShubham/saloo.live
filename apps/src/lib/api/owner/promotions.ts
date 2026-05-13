import type { UpsertPromotionPayload, ApiResponse } from '@saloo/types'
import type { Tables } from '@saloo/types'
import { invoke } from '../_invoke'

export function listPromotions(token: string): Promise<ApiResponse<Tables<'promotions'>[]>> {
  return invoke('owner-promotions-list', {}, token)
}

export function upsertPromotion(payload: UpsertPromotionPayload, token: string): Promise<ApiResponse<Tables<'promotions'>>> {
  return invoke('owner-promotions-upsert', payload, token)
}

export function deletePromotion(promotionId: string, token: string): Promise<ApiResponse<{ deleted: boolean }>> {
  return invoke('owner-promotions-delete', { promotion_id: promotionId }, token)
}
