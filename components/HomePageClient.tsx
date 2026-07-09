'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ShoppingBag, Search, Eye, Filter, ArrowRight } from 'lucide-react'
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
  variations: Record<string, any>
  is_featured: boolean
}

interface Category {
  id: string
  name: string
  slug: string
  description: string
}

interface HomePageClientProps {
  initialProducts: Product[]
  initialCategories: Category[]
}

export default function HomePageClient({ initialProducts, initialCategories }: HomePageClientProps) {
  const { addToCart } = useCart()
  const [products] = useState<Product[]>(initialProducts)
  const [categories] = useState<Category[]>(initialCategories)
  
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [cartDrawerOpen, setCartDrawerOpen] = useState<boolean>(false)

  // Filter products based on search and category
  const filteredProducts = products.filter((product) => {
    const productCatIds: string[] = Array.isArray(product.variations?.category_ids)
      ? product.variations.category_ids
      : product.category_id ? [product.category_id] : []
      
    if (product.is_featured && !productCatIds.includes('c0000000-0000-0000-0000-000000000008')) {
      productCatIds.push('c0000000-0000-0000-0000-000000000008')
    }

    const matchesCategory = selectedCategoryId === 'all' || productCatIds.includes(selectedCategoryId)
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  // Quick add to cart (for products with no variations)
  const handleQuickAdd = (product: Product, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Check if variations exist (and have options)
    const hasVariations = product.variations && Object.keys(product.variations).filter(k => k !== 'category_ids').length > 0

    if (hasVariations) {
      // If variations exist, redirect to detail page to select options
      window.location.href = `/product/${product.slug}`
      return
    }

    addToCart({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: Number(product.price),
      image: product.images[0] || 'https://images.unsplash.com/photo-1522069169874-c58ec4b76be5',
      selectedVariations: {}
    }, 1)
    
    // Open cart drawer on add
    setCartDrawerOpen(true)
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar onCartToggle={() => setCartDrawerOpen(true)} />
      
      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-slate-900 text-white py-24 sm:py-32">
        <div className="absolute inset-0 z-0 opacity-40 bg-[url('https://images.unsplash.com/photo-1544551763-46a013bb70d5?q=80&w=1600')] bg-cover bg-center"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/90 to-transparent z-0"></div>
        
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-400 ring-1 ring-inset ring-emerald-500/20 mb-6">
              Premium Aquascaping Shop
            </span>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-white">
              Create Your Own <span className="text-emerald-400">Underwater Paradise</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-300">
              Explore our curated selection of high-clarity rimless aquariums, smart filtration systems, full-spectrum lights, and natural plants. 
              Get delivery all over Bangladesh via Pathao Courier and pay securely with bKash.
            </p>
            <div className="mt-10 flex items-center gap-x-6">
              <Link
                href="#categories"
                className="rounded-md bg-emerald-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-emerald-500 transition-all duration-200"
              >
                Browse Shop
              </Link>
              <Link href="/category/featured" className="text-sm font-semibold leading-6 text-white hover:text-emerald-400 flex items-center gap-1 transition">
                View Featured <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* SHOP SECTION */}
      <main id="categories" className="flex-1 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        
        {/* Search & Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-8 border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-950">Shop Our Catalog</h2>
            <p className="mt-1 text-sm text-slate-500">Showing {filteredProducts.length} items</p>
          </div>
          
          {/* Search Bar */}
          <div className="relative w-full md:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm outline-none ring-slate-100 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
            />
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 py-8 overflow-x-auto">
          <button
            onClick={() => setSelectedCategoryId('all')}
            className={`rounded-full px-4 py-2 text-xs font-semibold tracking-wide transition-all border ${
              selectedCategoryId === 'all'
                ? 'bg-emerald-600 text-white border-transparent shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
            }`}
          >
            All Products
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategoryId(category.id)}
              className={`rounded-full px-4 py-2 text-xs font-semibold tracking-wide transition-all border ${
                selectedCategoryId === category.id
                  ? 'bg-emerald-600 text-white border-transparent shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* PRODUCTS GRID */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg border border-dashed border-slate-300">
            <Filter className="h-10 w-10 text-slate-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-slate-900">No products found</p>
            <p className="mt-1 text-sm text-slate-500">Try matching a different category or refining your search term.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {filteredProducts.map((product) => {
              const hasVariations = product.variations && Object.keys(product.variations).filter(k => k !== 'category_ids').length > 0
              
              return (
                <div 
                  key={product.id} 
                  className="group relative flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white hover:shadow-lg transition-all duration-300"
                >
                  {/* Image wrapper */}
                  <div className="relative aspect-square w-full overflow-hidden bg-slate-100 group-hover:opacity-90">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={product.images[0] || 'https://images.unsplash.com/photo-1522069169874-c58ec4b76be5'}
                      alt={product.name}
                      className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    />
                    
                    {product.old_price > 0 && (
                      <span className="absolute top-3 left-3 rounded-full bg-red-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                        Sale
                      </span>
                    )}

                    {/* Quick View Overlay Button */}
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/20 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link
                        href={`/product/${product.slug}`}
                        className="rounded-full bg-white p-3 text-slate-700 hover:text-emerald-600 hover:scale-110 shadow-lg transition-all"
                        title="View Details"
                      >
                        <Eye className="h-5 w-5" />
                      </Link>
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="flex flex-1 flex-col p-4">
                    <p className="text-[10px] font-bold text-emerald-600 tracking-wider uppercase mb-1">
                      {(() => {
                        const productCatIds: string[] = Array.isArray(product.variations?.category_ids)
                          ? product.variations.category_ids
                          : product.category_id ? [product.category_id] : []
                        if (product.is_featured && !productCatIds.includes('c0000000-0000-0000-0000-000000000008')) {
                          productCatIds.push('c0000000-0000-0000-0000-000000000008')
                        }
                        return categories
                          .filter((c) => productCatIds.includes(c.id))
                          .map((c) => c.name)
                          .join(', ')
                      })()}
                    </p>
                    <h3 className="text-sm font-semibold text-slate-900 line-clamp-1">
                      <Link href={`/product/${product.slug}`} className="hover:underline">
                        {product.name}
                      </Link>
                    </h3>
                    <p className="mt-2 text-xs text-slate-500 line-clamp-2 flex-grow">
                      {product.description}
                    </p>

                    {/* Price & Cart button */}
                    <div className="mt-4 flex items-center justify-between">
                      <div>
                        {product.old_price > 0 && (
                          <span className="text-xs text-slate-400 line-through mr-1">
                            ৳{Number(product.old_price).toLocaleString()}
                          </span>
                        )}
                        <span className="text-sm font-bold text-slate-950">
                          ৳{Number(product.price).toLocaleString()}
                        </span>
                      </div>
                      
                      {product.stock > 0 ? (
                        <button
                          onClick={(e) => handleQuickAdd(product, e)}
                          className="flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 transition-colors"
                        >
                          <ShoppingBag className="h-3.5 w-3.5" />
                          <span>{hasVariations ? 'Options' : 'Add'}</span>
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-red-500 bg-red-50 px-2 py-1 rounded">
                          Out of stock
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-slate-900 text-slate-400 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <p className="text-lg font-bold tracking-wider text-white">VERDANT AQUATICS</p>
          <p className="text-sm">Premium Aquariums, Accessories & Aquatic Plants in Bangladesh.</p>
          <div className="flex justify-center gap-6 text-xs text-slate-500 py-4">
            <p>Fast Pathao Delivery</p>
            <p>•</p>
            <p>bKash Tokenized Checkout</p>
            <p>•</p>
            <p>Cash on Delivery Supported</p>
          </div>
          <p className="text-xs text-slate-600">© {new Date().getFullYear()} Verdant Aquatics. All rights reserved.</p>
        </div>
      </footer>

      {/* Cart side Drawer */}
      <CartDrawer isOpen={cartDrawerOpen} onClose={() => setCartDrawerOpen(false)} />
    </div>
  )
}
