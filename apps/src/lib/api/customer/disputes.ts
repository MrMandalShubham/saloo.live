import type { CreateDisputePayload, ApiResponse } from '@saloo/types'
import type { Tables } from '@saloo/types'
import { invoke } from '../_invoke'

export function createDispute(payload: CreateDisputePayload, token: string): Promise<ApiResponse<Tables<'disputes'>>> {
  return invoke('disputes-create', payload, token)
}
