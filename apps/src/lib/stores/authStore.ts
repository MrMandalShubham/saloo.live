import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Tables } from '@saloo/types'

type Role = Tables<'users'>['role']

interface AuthStore {
  userId: string | null
  role: Role | null
  accessToken: string | null
  setAuth: (userId: string, role: Role, accessToken: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      userId: null,
      role: null,
      accessToken: null,
      setAuth: (userId, role, accessToken) => set({ userId, role, accessToken }),
      clearAuth: () => set({ userId: null, role: null, accessToken: null }),
    }),
    { name: 'ono-auth' }
  )
)
