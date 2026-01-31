'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

type BackLinkProps = {
  href: string
  children?: React.ReactNode
}

export function BackLink({ href, children = '← Voltar' }: BackLinkProps) {
  return (
    <Button variant="ghost" size="sm" asChild>
      <Link href={href}>{children}</Link>
    </Button>
  )
}
