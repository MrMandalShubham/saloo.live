import type { InviteBarberPayload, UpdateBarberPayload, ApiResponse } from '@saloo/types'
import type { Tables } from '@saloo/types'
import { invoke } from '../_invoke'

export function listTeam(token: string): Promise<ApiResponse<Tables<'barbers'>[]>> {
  return invoke('owner-team-list', {}, token)
}

export function inviteBarber(payload: InviteBarberPayload, token: string): Promise<ApiResponse<Tables<'barbers'>>> {
  return invoke('owner-team-invite', payload, token)
}

export function updateBarber(barberId: string, payload: UpdateBarberPayload, token: string): Promise<ApiResponse<Tables<'barbers'>>> {
  return invoke('owner-team-update', { barber_id: barberId, ...payload }, token)
}
