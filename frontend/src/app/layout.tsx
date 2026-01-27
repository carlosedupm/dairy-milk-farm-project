import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/layout/Providers'
import { ConditionalHeader } from '@/components/layout/ConditionalHeader'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CeialMilk - Gestão de Fazendas Leiteiras',
  description: 'Sistema completo de gestão para fazendas leiteiras',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen bg-background">
            <ConditionalHeader />
            {children}
          </div>
        </Providers>
      </body>
    </html>
  )
}