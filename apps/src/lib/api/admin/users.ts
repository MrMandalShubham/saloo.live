import type { AdminUserListItem, UpdateUserPayload, ApiResponse } from '@saloo/types'
import { invoke } from '../_invoke'

export function listAdminUsers(
  params: { role?: string; search?: string; page?: number; limit?: number },
  token: string,
): Promise<ApiResponse<{ users: AdminUserListItem[]; total: number }>> {
  return invoke('admin-users-list', params, token)
}

export function updateUser(payload: UpdateUserPayload, token: string): Promise<ApiResponse<{ updated: boolean }>> {
  return invoke('admin-users-update', payload, token)
}
