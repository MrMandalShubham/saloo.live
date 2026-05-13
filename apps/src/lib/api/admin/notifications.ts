import type { SendNotificationPayload, ApiResponse } from '@saloo/types'
import { invoke } from '../_invoke'

export function sendNotification(payload: SendNotificationPayload, token: string): Promise<ApiResponse<{ sent: number }>> {
  return invoke('admin-notifications-send', payload, token)
}
