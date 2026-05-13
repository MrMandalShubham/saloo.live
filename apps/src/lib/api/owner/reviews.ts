import type { OwnerReviewItem, RespondToReviewPayload, ApiResponse } from '@saloo/types'
import { invoke } from '../_invoke'

export function listOwnerReviews(
  params: { page?: number; rating?: number; responded?: boolean },
  token: string,
): Promise<ApiResponse<{ reviews: OwnerReviewItem[]; total: number; avg_rating: number }>> {
  return invoke('owner-reviews-list', params, token)
}

export function respondToReview(payload: RespondToReviewPayload, token: string): Promise<ApiResponse<{ updated: boolean }>> {
  return invoke('owner-reviews-respond', payload, token)
}
