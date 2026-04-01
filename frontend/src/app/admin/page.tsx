'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { RequireAdminRoute } from '@/components/layout/RequireAdminRoute'
import { PageContainer } from '@/components/layout/PageContainer'

export default function AdminPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/admin/usuarios')
  }, [router])

  return (
    <RequireAdminRoute>
      <PageContainer variant="centered">
        <p className="text-muted-foreground">Redirecionando…</p>
      </PageContainer>
    </RequireAdminRoute>
  )
}
