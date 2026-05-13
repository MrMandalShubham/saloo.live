import type { LoyaltyData, ApiResponse } from '@saloo/types'
import { invoke } from '../_invoke'

export function getLoyalty(token: string): Promise<ApiResponse<LoyaltyData>> {
  return invoke('loyalty-get', {}, token)
}
