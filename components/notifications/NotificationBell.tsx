'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function NotificationBell({userId}:{userId:string}){
  const [count,setCount]=useState(0)
  useEffect(()=>{
    async function load(){
      const {count}=await supabase.from('notifications')
        .select('*',{count:'exact',head:true})
        .eq('user_id',userId)
        .eq('is_read',false)
        .eq('is_archived',false)
      setCount(count||0)
    }
    load()
  },[userId])
  return (
    <Link href="/business/dashboard/notifications" className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5">
      🔔
      {count>0 && <span className="absolute -right-1 -top-1 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">{count}</span>}
    </Link>
  )
}
