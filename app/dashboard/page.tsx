'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    async function checkUser() {
      const { data } = await supabase.auth.getUser()

      if (!data.user) {
        router.push('/login')
        return
      }

      setEmail(data.user.email ?? null)
    }

    checkUser()
  }, [router])

  return (
    <main className="min-h-screen bg-slate-950 text-white p-10">
      <h1 className="text-4xl font-bold mb-4">Dashboard</h1>
      <p className="text-slate-300 mb-6">
        Welcome to your booking platform dashboard.
      </p>

      {email && (
        <p className="text-slate-400">
          Logged in as: {email}
        </p>
      )}
    </main>
  )
}