'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'

export function Header() {
  const { user, logout } = useAuth()

  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-semibold">
            CeialMilk
          </Link>
          <Link href="/fazendas" className="text-sm text-muted-foreground hover:text-foreground">
            Fazendas
          </Link>
          {user && user.email === 'dev@ceial.com' && (
            <Link href="/dev-studio" className="text-sm text-muted-foreground hover:text-foreground">
              Dev Studio
            </Link>
          )}
        </div>
        <div className="flex items-center gap-2">
          {user && (
            <span className="text-sm text-muted-foreground">{user.email}</span>
          )}
          <Button variant="outline" size="sm" onClick={logout}>
            Sair
          </Button>
        </div>
      </div>
    </header>
  )
}
