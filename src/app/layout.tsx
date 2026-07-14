import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter'
import ThemeRegistry from '@/components/ui/theme-registry'
import CookieBanner from '@/components/ui/cookie-banner'
import ScrollToTop from '@/components/ui/scroll-to-top'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

export const dynamic = 'force-dynamic'

export const viewport: Viewport = {
  themeColor: '#16a34a',
}

export const metadata: Metadata = {
  title: 'aveum',
  description: 'Torneios de canto de pássaro',
  manifest: '/manifest.json',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body>
        <AppRouterCacheProvider>
          <ThemeRegistry>
            {children}
            <ScrollToTop />
            <CookieBanner />
          </ThemeRegistry>
        </AppRouterCacheProvider>
      </body>
    </html>
  )
}
