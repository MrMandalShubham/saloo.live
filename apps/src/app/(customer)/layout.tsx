export const dynamic = 'force-dynamic'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { AppNav } from '@/components/customer/AppNav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const isDevBypass = cookieStore.get('saloo-dev-bypass')?.value === 'true'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Allow guests — no redirect to /login
  const isGuest = !user && !isDevBypass

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col relative overflow-x-clip selection:bg-saloo-teal/20 selection:text-saloo-dark">
      {/* Background floating textures - subtle smoky blobs */}
      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-saloo-teal/[0.04] blur-[80px] mix-blend-multiply pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-saloo-teal/[0.03] blur-[100px] mix-blend-multiply pointer-events-none z-0" />

      <div className="relative z-10 flex flex-col w-full">
        <AppNav isGuest={isGuest} />
        {/* pb-24 accounts for mobile bottom nav height */}
        <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 pb-24 md:pb-8">
          {children}
        </main>
      </div>
    </div>
  )
}
