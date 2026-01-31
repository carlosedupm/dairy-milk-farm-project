'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { RequireAdminRoute } from '@/components/layout/RequireAdminRoute'

export default function AdminPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/admin/usuarios')
  }, [router])

  return (
    <RequireAdminRoute>
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Redirecionando…</p>
      </div>
    </RequireAdminRoute>
  )
}
