import type { UpsertServicePayload, ApiResponse } from '@saloo/types'
import type { Tables } from '@saloo/types'
import { invoke } from '../_invoke'

export function listServices(token: string): Promise<ApiResponse<Tables<'services'>[]>> {
  return invoke('owner-services-list', {}, token)
}

export function upsertService(payload: UpsertServicePayload, token: string): Promise<ApiResponse<Tables<'services'>>> {
  return invoke('owner-services-upsert', payload, token)
}

export function deleteService(serviceId: string, token: string): Promise<ApiResponse<{ deleted: boolean }>> {
  return invoke('owner-services-delete', { service_id: serviceId }, token)
}
