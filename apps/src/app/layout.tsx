import type { Metadata, Viewport } from 'next'
import { Syne, DM_Sans, Playfair_Display } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { SwRegister } from './sw-register'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  weight: ['400', '500', '600', '700', '800', '900'],
})

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  weight: ['400', '500', '600', '700', '800'],
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['300', '400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'LooksOn — Book Your Barber',
  description: 'India\'s premier barber & beauty booking platform. Find top barbers and salons near you, book instantly, pay securely.',
  applicationName: 'LooksOn',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'LooksOn',
  },
  openGraph: {
    title: 'LooksOn — Book Your Barber',
    description: 'India\'s premier barber & beauty booking platform.',
    type: 'website',
    images: ['/looks-on-logo.png'],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#F4EEE3',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${syne.variable} ${dmSans.variable}`}>
      <body>
        <Providers>{children}</Providers>
        <SwRegister />
      </body>
    </html>
  )
}
