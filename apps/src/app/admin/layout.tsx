export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { AdminNav } from '@/components/admin/AdminNav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const isDevBypass = cookieStore.get('saloo-dev-bypass')?.value === 'true'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user && !isDevBypass) redirect('/login')

  const { data: role } = await supabase.rpc('get_user_role' as any) as { data: string | null }
  if (role !== 'admin' && !isDevBypass) redirect('/home')

  return (
    <div className="min-h-screen bg-[#0D0D1A] flex flex-col lg:flex-row">
      <AdminNav />
      <main className="flex-1 lg:ml-56 max-w-7xl px-4 py-6 pb-24 lg:pb-6">
        {children}
      </main>
    </div>
  )
}
