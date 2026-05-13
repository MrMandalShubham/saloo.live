import type { CreateReviewPayload, ApiResponse } from '@saloo/types'
import type { Tables } from '@saloo/types'
import { invoke } from '../_invoke'

export function createReview(payload: CreateReviewPayload, token: string): Promise<ApiResponse<Tables<'reviews'>>> {
  return invoke('reviews-create', payload, token)
}
