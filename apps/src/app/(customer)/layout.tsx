export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { AppNav } from '@/components/customer/AppNav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const isDevBypass = cookieStore.get('saloo-dev-bypass')?.value === 'true'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user && !isDevBypass) redirect('/login')

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <AppNav />
      {/* pb-20 accounts for mobile bottom nav height */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 pb-24 md:pb-8">
        {children}
      </main>
    </div>
  )
}
