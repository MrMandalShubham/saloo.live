import type { CreateBlockPayload, ApiResponse } from '@saloo/types'
import type { Tables } from '@saloo/types'
import { invoke } from '../_invoke'

export function manageBlock(
  action: 'create' | 'delete',
  payload: CreateBlockPayload & { block_id?: string },
  token: string,
): Promise<ApiResponse<Tables<'slot_blocks'> | { deleted: boolean }>> {
  return invoke('owner-blocks-manage', { action, ...payload }, token)
}
