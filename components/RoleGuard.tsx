'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Role = 'owner' | 'manager' | 'staff'

export default function RoleGuard({
  allowedRoles,
  children,
}: {
  allowedRoles: Role[]
  children: React.ReactNode
}) {
  const [role, setRole] = useState<Role | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadRole() {
      const { data: userData } = await supabase.auth.getUser()

      if (!userData.user?.email) {
        setRole(null)
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from('staff_users')
        .select('role')
        .eq('email', userData.user.email)
        .limit(1)

      setRole((data?.[0]?.role as Role) || null)
      setLoading(false)
    }

    loadRole()
  }, [])

  if (loading) {
    return <div className="text-slate-400">Checking permissions...</div>
  }

  if (!role || !allowedRoles.includes(role)) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8">
        <h1 className="text-3xl font-bold mb-3">Access restricted</h1>
        <p className="text-slate-400">
          You do not have permission to view this page.
        </p>
      </div>
    )
  }

  return <>{children}</>
}