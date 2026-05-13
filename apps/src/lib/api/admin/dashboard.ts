import type { AdminDashboardData, ApiResponse } from '@saloo/types'
import { invoke } from '../_invoke'

export function getAdminDashboard(token: string): Promise<ApiResponse<AdminDashboardData>> {
  return invoke('admin-dashboard-get', {}, token)
}
