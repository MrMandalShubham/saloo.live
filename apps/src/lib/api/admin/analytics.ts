import type { AdminAnalyticsData, ApiResponse } from '@saloo/types'
import { invoke } from '../_invoke'

export function getAdminAnalytics(period: '7d' | '30d' | '90d', token: string): Promise<ApiResponse<AdminAnalyticsData>> {
  return invoke('admin-analytics-get', { period }, token)
}
