import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '@/app/globals.css'
import { CartProvider } from '@/context/CartContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Verdant Aquatics - Premium Aquariums & Accessories',
  description: 'Your one-stop shop for beautiful aquariums, filtration, lighting, live plants, and accessories in Bangladesh.',
  icons: {
    icon: '/logo.jpeg',
    shortcut: '/logo.jpeg',
    apple: '/logo.jpeg',
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-50 text-slate-900 antialiased`}>
        <CartProvider>
          {children}
        </CartProvider>
      </body>
    </html>
  )
}
