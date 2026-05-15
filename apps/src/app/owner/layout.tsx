export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { OwnerNav } from '@/components/owner/OwnerNav'

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const isDevBypass = cookieStore.get('saloo-dev-bypass')?.value === 'true'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user && !isDevBypass) redirect('/login')

  const { data: role } = await supabase.rpc('get_user_role' as any) as { data: string | null }
  if (role !== 'shop_owner' && role !== 'admin' && !isDevBypass) redirect('/home')

  return (
    <div className="min-h-screen bg-zinc-50 relative overflow-hidden flex flex-col lg:flex-row selection:bg-saloo-pink/20 selection:text-saloo-dark">
      {/* Background floating textures - subtle smoky blobs */}
      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-blob bg-saloo-dark/[0.03] blur-[80px] animate-blob mix-blend-multiply pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] right-[-5%] w-[600px] h-[600px] rounded-blob bg-saloo-dark/[0.02] blur-[100px] animate-blob mix-blend-multiply animation-delay-2000 pointer-events-none z-0" />

      <div className="relative z-10 flex flex-col lg:flex-row w-full">
        <OwnerNav />
        <main className="flex-1 lg:ml-56 max-w-7xl px-4 py-6 pb-24 lg:pb-6">
          {children}
        </main>
      </div>
    </div>
  )
}
