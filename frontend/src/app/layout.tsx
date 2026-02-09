import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/layout/Providers'
import { ConditionalHeader } from '@/components/layout/ConditionalHeader'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CeialMilk - Gestão de Fazendas Leiteiras',
  description: 'Sistema completo de gestão para fazendas leiteiras',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CeialMilk',
  },
  icons: {
    icon: '/icons/icon-192.svg',
    apple: '/icons/icon-192.svg',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0f766e' },
    { media: '(prefers-color-scheme: dark)', color: '#0f766e' },
  ],
}

const themeScript = `
(function(){
  var k='ceialmilk_theme';
  var t=typeof localStorage!=='undefined'?localStorage.getItem(k):null;
  var d=(t==='dark'||t==='light')?t:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
  document.documentElement.classList.toggle('dark',d==='dark');
})();
`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
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