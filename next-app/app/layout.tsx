import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import QueryClientProvider from './QueryClientProvider'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Mess-and-jar-chat',
  description: 'Chat app',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-900`}>
        {/* Prevent errors on browsers (e.g., Brave iOS) where window.ethereum is undefined */}
        <Script id="ethereum-stub" strategy="beforeInteractive">
          {`
            if (typeof window !== 'undefined' && typeof window.ethereum === 'undefined') {
              window.ethereum = {};
            }
          `}
        </Script>
        <QueryClientProvider>{children}</QueryClientProvider>
      </body>
    </html>
  )
}
