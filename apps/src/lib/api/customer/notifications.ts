import type { NotificationFilter, ApiResponse } from '@saloo/types'
import type { Tables } from '@saloo/types'
import { invoke } from '../_invoke'

export function listNotifications(
  params: { filter?: NotificationFilter; page?: number },
  token: string,
): Promise<ApiResponse<{ notifications: Tables<'notifications'>[]; unread_count: number }>> {
  return invoke('notifications-list', params, token)
}

export function markNotificationsRead(ids: string[], token: string): Promise<ApiResponse<{ updated: number }>> {
  return invoke('notifications-read', { ids }, token)
}
