'use client'

import React from 'react'
import Link from 'next/link'
import { X, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react'
import { useCart } from '@/context/CartContext'

interface CartDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { cartItems, updateQuantity, removeFromCart, cartTotal } = useCart()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
      <div className="absolute inset-0 overflow-hidden">
        {/* Background Overlay */}
        <div 
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
        ></div>

        <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
          <div className="pointer-events-auto w-screen max-w-md">
            <div className="flex h-full flex-col overflow-y-scroll bg-white shadow-2xl">
              
              {/* HEADER */}
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-6 sm:px-6">
                <h2 className="text-lg font-semibold text-slate-900" id="slide-over-title">
                  Shopping Cart
                </h2>
                <button
                  onClick={onClose}
                  className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-500 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* CART CONTENT */}
              <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
                {cartItems.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <div className="rounded-full bg-slate-100 p-6 text-slate-400 mb-4">
                      <ShoppingBag className="h-12 w-12" />
                    </div>
                    <p className="text-base font-medium text-slate-900">Your cart is empty</p>
                    <p className="mt-1 text-sm text-slate-500">Add some aquariums or accessories to get started.</p>
                    <button
                      onClick={onClose}
                      className="mt-6 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 transition"
                    >
                      Continue Shopping
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {cartItems.map((item) => (
                      <div 
                        key={`${item.id}-${JSON.stringify(item.selectedVariations)}`}
                        className="flex py-4 border-b border-slate-100"
                      >
                        <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border border-slate-200">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.image || 'https://images.unsplash.com/photo-1522069169874-c58ec4b76be5'}
                            alt={item.name}
                            className="h-full w-full object-cover object-center"
                          />
                        </div>

                        <div className="ml-4 flex flex-1 flex-col">
                          <div>
                            <div className="flex justify-between text-base font-semibold text-slate-900">
                              <h3>
                                <Link 
                                  href={`/product/${item.slug}`}
                                  onClick={onClose}
                                  className="hover:text-emerald-600 transition"
                                >
                                  {item.name}
                                </Link>
                              </h3>
                              <p className="ml-4">৳{(item.price * item.quantity).toLocaleString()}</p>
                            </div>
                            {/* Selected variations */}
                            {Object.entries(item.selectedVariations).map(([key, value]) => (
                              <p key={key} className="mt-1 text-xs text-slate-500 capitalize">
                                {key}: {value}
                              </p>
                            ))}
                          </div>
                          
                          <div className="flex flex-1 items-end justify-between text-sm">
                            {/* Quantity Selector */}
                            <div className="flex items-center border border-slate-200 rounded-md bg-slate-50">
                              <button
                                onClick={() => updateQuantity(item.id, item.selectedVariations, item.quantity - 1)}
                                className="p-1 hover:bg-slate-100 rounded-l-md transition"
                              >
                                <Minus className="h-3 w-3 text-slate-500" />
                              </button>
                              <span className="px-2 text-xs text-slate-800 font-semibold">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.id, item.selectedVariations, item.quantity + 1)}
                                className="p-1 hover:bg-slate-100 rounded-r-md transition"
                              >
                                <Plus className="h-3 w-3 text-slate-500" />
                              </button>
                            </div>

                            {/* Remove button */}
                            <button
                              onClick={() => removeFromCart(item.id, item.selectedVariations)}
                              className="flex items-center text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* FOOTER */}
              {cartItems.length > 0 && (
                <div className="border-t border-slate-200 px-4 py-6 sm:px-6 bg-slate-50">
                  <div className="flex justify-between text-base font-semibold text-slate-900">
                    <p>Subtotal</p>
                    <p>৳{cartTotal.toLocaleString()}</p>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Shipping calculated at checkout. Prepaid bKash shipping fee required for COD.
                  </p>
                  <div className="mt-6">
                    <Link
                      href="/checkout"
                      onClick={onClose}
                      className="flex items-center justify-center rounded-md border border-transparent bg-emerald-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-emerald-500 transition-all duration-200"
                    >
                      Proceed to Checkout
                    </Link>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
