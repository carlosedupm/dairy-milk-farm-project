'use client'

import { cn } from '@/lib/utils'

type PageContainerVariant = 'default' | 'narrow' | 'wide' | 'centered'

type PageContainerProps = {
  variant?: PageContainerVariant
  className?: string
  children: React.ReactNode
}

const variantClasses: Record<PageContainerVariant, string> = {
  default: 'mx-auto max-w-5xl px-4 sm:px-6 py-6',
  narrow: 'mx-auto max-w-2xl px-4 sm:px-6 py-6',
  wide: 'container mx-auto max-w-6xl px-4 sm:px-6 py-6',
  centered:
    'flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-4 py-6',
}

export function PageContainer({
  variant = 'default',
  className,
  children,
}: PageContainerProps) {
  return (
    <main className={cn(variantClasses[variant], className)}>{children}</main>
  )
}
