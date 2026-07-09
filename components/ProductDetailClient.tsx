'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ShoppingBag, ChevronRight, Truck, Check, AlertCircle, ArrowLeft } from 'lucide-react'
import Navbar from '@/components/Navbar'
import CartDrawer from '@/components/CartDrawer'
import { useCart } from '@/context/CartContext'

interface Product {
  id: string
  category_id: string
  name: string
  slug: string
  description: string
  price: number
  old_price: number
  stock: number
  images: string[]
  variations: Record<string, string[]>
  is_featured: boolean
  categories?: { name: string }
}

interface Category {
  id: string
  name: string
  slug: string
}

interface ProductDetailClientProps {
  product: Product
  categories: Category[]
}

export default function ProductDetailClient({ product, categories }: ProductDetailClientProps) {
  const { addToCart } = useCart()
  const [selectedImage, setSelectedImage] = useState<string>(product.images[0] || 'https://images.unsplash.com/photo-1522069169874-c58ec4b76be5')
  const [quantity, setQuantity] = useState<number>(1)
  const [cartDrawerOpen, setCartDrawerOpen] = useState<boolean>(false)
  
  // Set default variations to the first option of each category
  const initialVariations: Record<string, string> = {}
  if (product.variations && typeof product.variations === 'object') {
    Object.entries(product.variations).forEach(([key, values]) => {
      if (key === 'category_ids') return
      if (Array.isArray(values) && values.length > 0) {
        initialVariations[key] = values[0]
      }
    })
  }
  
  const [selectedVariations, setSelectedVariations] = useState<Record<string, string>>(initialVariations)

  const handleVariationChange = (key: string, value: string) => {
    setSelectedVariations((prev) => ({ ...prev, [key]: value }))
  }

  const handleAddToCart = () => {
    addToCart({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: Number(product.price),
      image: product.images[0] || 'https://images.unsplash.com/photo-1522069169874-c58ec4b76be5',
      selectedVariations
    }, quantity)
    
    setCartDrawerOpen(true)
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar onCartToggle={() => setCartDrawerOpen(true)} />

      {/* BREADCRUMB */}
      <nav className="bg-slate-100 py-3">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center gap-2 text-xs text-slate-500 font-medium">
          <Link href="/" className="hover:text-emerald-600">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <Link href="/#categories" className="hover:text-emerald-600">Shop</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-800 line-clamp-1">{product.name}</span>
        </div>
      </nav>

      {/* PRODUCT INTERFACE */}
      <main className="flex-grow mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          
          {/* 1. IMAGES SECTION */}
          <div className="space-y-4">
            <div className="aspect-square w-full overflow-hidden rounded-lg border border-slate-200 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedImage}
                alt={product.name}
                className="h-full w-full object-cover object-center"
              />
            </div>
            
            {/* Thumbnails */}
            {product.images.length > 1 && (
              <div className="flex gap-4 overflow-x-auto py-2">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(img)}
                    className={`h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border-2 bg-white transition-all ${
                      selectedImage === img ? 'border-emerald-600 shadow' : 'border-slate-200'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt="" className="h-full w-full object-cover object-center" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. SPEC DETAILS */}
          <div className="flex flex-col space-y-6">
            <div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {(() => {
                  const productCatIds: string[] = Array.isArray(product.variations?.category_ids)
                    ? product.variations.category_ids
                    : product.category_id ? [product.category_id] : []
                  if (product.is_featured && !productCatIds.includes('c0000000-0000-0000-0000-000000000008')) {
                    productCatIds.push('c0000000-0000-0000-0000-000000000008')
                  }
                  return categories
                    .filter((cat) => productCatIds.includes(cat.id))
                    .map((cat) => (
                      <Link
                        key={cat.id}
                        href={`/category/${cat.slug}`}
                        className="inline-block rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100 transition-colors uppercase tracking-wider"
                      >
                        {cat.name}
                      </Link>
                    ))
                })()}
              </div>
              <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">{product.name}</h1>
            </div>

            {/* Price Box */}
            <div className="flex items-baseline gap-3 py-2 border-y border-slate-200">
              <span className="text-3xl font-bold text-slate-950">৳{Number(product.price).toLocaleString()}</span>
              {product.old_price > 0 && (
                <span className="text-lg text-slate-400 line-through">
                  ৳{Number(product.old_price).toLocaleString()}
                </span>
              )}
            </div>

            {/* Description */}
            <p className="text-sm text-slate-600 leading-relaxed">{product.description}</p>

            {/* Variations Selectors */}
            {product.variations && typeof product.variations === 'object' && Object.keys(product.variations).filter(k => k !== 'category_ids').length > 0 && (
              <div className="space-y-4">
                {Object.entries(product.variations).map(([key, values]) => {
                  if (key === 'category_ids') return null;
                  if (!Array.isArray(values)) return null;
                  return (
                    <div key={key} className="space-y-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Select {key}:
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {values.map((val) => (
                          <button
                            key={val}
                            onClick={() => handleVariationChange(key, val)}
                            className={`rounded-md border px-4 py-2 text-xs font-semibold transition ${
                              selectedVariations[key] === val
                                ? 'border-emerald-600 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-600/10'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                            }`}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Stock Alert */}
            <div className="flex items-center gap-2 text-sm font-medium">
              {product.stock > 0 ? (
                <>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <Check className="h-4 w-4" />
                  </span>
                  <span className="text-emerald-700 font-semibold">{product.stock} items available in stock</span>
                </>
              ) : (
                <>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-50 text-red-600">
                    <AlertCircle className="h-4 w-4" />
                  </span>
                  <span className="text-red-700 font-semibold">Out of stock</span>
                </>
              )}
            </div>

            {/* Actions: Quantity & Buy Button */}
            {product.stock > 0 && (
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                {/* Quantity */}
                <div className="flex items-center justify-between border border-slate-200 rounded-md bg-white w-full sm:w-32 h-12 px-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-1 hover:bg-slate-50 rounded"
                  >
                    -
                  </button>
                  <span className="text-sm font-semibold">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-1 hover:bg-slate-50 rounded"
                  >
                    +
                  </button>
                </div>
                
                {/* Add to Cart */}
                <button
                  onClick={handleAddToCart}
                  className="flex-1 flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-emerald-500 transition-all duration-200 h-12"
                >
                  <ShoppingBag className="h-5 w-5" />
                  Add to Shopping Cart
                </button>
              </div>
            )}

            {/* Shipping Policy Note */}
            <div className="rounded-lg bg-blue-50 border border-blue-100 p-4 mt-6 text-xs text-blue-800 space-y-2">
              <div className="flex items-center gap-1.5 font-bold">
                <Truck className="h-4 w-4" />
                <span>Delivery Policy Information</span>
              </div>
              <p className="leading-relaxed">
                Deliveries are dispatched via **Pathao Courier** across Bangladesh. 
                For Cash on Delivery, the delivery charge must be paid prepaid via **bKash** to confirm the order booking.
              </p>
            </div>

            {/* Go back Link */}
            <div className="pt-6">
              <Link href="/" className="text-xs font-semibold text-emerald-600 hover:text-emerald-500 flex items-center gap-1">
                <ArrowLeft className="h-4 w-4" /> Back to Catalog
              </Link>
            </div>

          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-slate-900 text-slate-400 py-12 mt-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <p className="text-lg font-bold tracking-wider text-white">VERDANT AQUATICS</p>
          <p className="text-sm">Premium Aquariums, Accessories & Aquatic Plants in Bangladesh.</p>
          <p className="text-xs text-slate-600">© {new Date().getFullYear()} Verdant Aquatics. All rights reserved.</p>
        </div>
      </footer>

      {/* Cart side Drawer */}
      <CartDrawer isOpen={cartDrawerOpen} onClose={() => setCartDrawerOpen(false)} />
    </div>
  )
}
