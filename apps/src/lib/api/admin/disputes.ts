import type { AdminDisputeListItem, ResolveDisputePayload, ApiResponse } from '@saloo/types'
import { invoke } from '../_invoke'

export function listAdminDisputes(
  params: { status?: string; page?: number },
  token: string,
): Promise<ApiResponse<{ disputes: AdminDisputeListItem[]; total: number }>> {
  return invoke('admin-disputes-list', params, token)
}

export function resolveDispute(payload: ResolveDisputePayload, token: string): Promise<ApiResponse<{ resolved: boolean }>> {
  return invoke('admin-disputes-resolve', payload, token)
}
