'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ShoppingBag, Menu, X, User, ShieldAlert } from 'lucide-react'
import { useCart } from '@/context/CartContext'

interface NavbarProps {
  onCartToggle: () => void
}

export default function Navbar({ onCartToggle }: NavbarProps) {
  const { cartCount } = useCart()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'Aquariums', href: '/#categories' },
    { name: 'Filters & Pumps', href: '/#categories' },
    { name: 'Accessories', href: '/#categories' },
  ]

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* LOGO */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpeg" alt="Logo" className="h-8 w-8 rounded-full object-cover border border-emerald-500/20" />
            <span className="text-xl font-bold tracking-tight text-emerald-700">
              Verdant <span className="text-emerald-500 font-medium">Aquatics</span>
            </span>
          </Link>
          
          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-sm font-medium text-slate-600 hover:text-emerald-600 transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </nav>
        </div>

        {/* Action Icons */}
        <div className="flex items-center gap-4">
          <Link
            href="/admin"
            className="flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-all"
            title="Admin Dashboard"
          >
            <ShieldAlert className="h-4 w-4 text-emerald-600" />
            <span className="hidden sm:inline">Admin</span>
          </Link>

          {/* Cart Icon */}
          <button
            onClick={onCartToggle}
            className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 transition-colors"
            id="cart-trigger"
          >
            <ShoppingBag className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white ring-2 ring-white animate-pulse">
                {cartCount}
              </span>
            )}
          </button>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 md:hidden"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav Menu */}
      {mobileMenuOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 md:hidden">
          <div className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-md px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-50 hover:text-emerald-600 transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  )
}
