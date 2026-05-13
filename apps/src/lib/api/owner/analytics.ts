import type { OwnerDashboardData, OwnerAnalyticsData, ApiResponse } from '@saloo/types'
import { invoke } from '../_invoke'

export function getOwnerDashboard(token: string): Promise<ApiResponse<OwnerDashboardData>> {
  return invoke('owner-dashboard-get', {}, token)
}

export function getOwnerAnalytics(period: '7d' | '30d' | '90d', token: string): Promise<ApiResponse<OwnerAnalyticsData>> {
  return invoke('owner-analytics-get', { period }, token)
}
