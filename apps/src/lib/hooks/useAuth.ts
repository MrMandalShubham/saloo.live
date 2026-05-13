'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Session, User } from '@supabase/supabase-js'
import type { Tables } from '@saloo/types'

type Role = Tables<'users'>['role']

interface AuthState {
  user: User | null
  session: Session | null
  role: Role | null
  accessToken: string | null
  loading: boolean
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    role: null,
    accessToken: null,
    loading: true,
  })

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getSession().then(({ data: { session } }) => {
      setState({
        user: session?.user ?? null,
        session,
        role: (session?.user?.user_metadata?.role as Role) ?? null,
        accessToken: session?.access_token ?? null,
        loading: false,
      })
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({
        user: session?.user ?? null,
        session,
        role: (session?.user?.user_metadata?.role as Role) ?? null,
        accessToken: session?.access_token ?? null,
        loading: false,
      })
    })

    return () => subscription.unsubscribe()
  }, [])

  return state
}
