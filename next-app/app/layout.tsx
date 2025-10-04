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
  metadataBase: new URL('https://chat.tohr.xyz'), // change to your real domain
  title: 'Encrypted Chat',
  description: 'Encrypted cloud chat with rooms',
  keywords: ['chat', 'encrypted', 'secure messaging', 'cloud chat', 'chat rooms'],
  authors: [{ name: 'tohrxyz', url: 'https://github.com/tohrxyz' }],
  icons: {
    icon: '/logo.jpg',
    shortcut: '/logo.jpg',
    apple: '/logo.jpg',
  },
  openGraph: {
    title: 'Encrypted Chat',
    description: 'Encrypted chat with cloud rooms',
    url: 'https://chat.tohr.xyz',
    siteName: 'Encrypted Chat',
    images: [
      {
        url: '/logo.jpg',
        width: 512,
        height: 512,
        alt: 'Chat App Logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Chat – Encrypted Cloud Chat',
    description: 'Join secure chat rooms with client-side encryption.',
    images: ['/logo.jpg'],
    creator: '@tohrxyz',
  },
  category: 'communication',
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
      <head>
        <link rel="icon" href="/logo.jpg" />
      </head>
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
