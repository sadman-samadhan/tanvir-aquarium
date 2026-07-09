'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { 
  BarChart3, ShoppingBag, Package, LogOut, Plus, Trash2, Edit,
  X, Check, Sparkles, AlertCircle, RefreshCw
} from 'lucide-react'

interface Category {
  id: string
  name: string
  slug: string
}

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
  variations: any
  created_at: string
  categories?: { name: string }
  is_featured?: boolean
}

interface AdminProductsProps {
  initialProducts: Product[]
  initialCategories: Category[]
}

export default function AdminProductsClient({ initialProducts, initialCategories }: AdminProductsProps) {
  const router = useRouter()
  const supabase = createClient()

  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [categories] = useState<Category[]>(initialCategories)
  const [showAddForm, setShowAddForm] = useState(false)
  const [loading, setLoading] = useState(false)

  // Form Fields
  const [name, setName] = useState('')
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [price, setPrice] = useState('')
  const [oldPrice, setOldPrice] = useState('')
  const [stock, setStock] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [variationsJson, setVariationsJson] = useState('{\n  "sizes": ["1.5 Feet", "2 Feet"]\n}')

  // Editing Fields
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editName, setEditName] = useState('')
  const [editCategoryIds, setEditCategoryIds] = useState<string[]>([])
  const [editPrice, setEditPrice] = useState('')
  const [editOldPrice, setEditOldPrice] = useState('')
  const [editStock, setEditStock] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editImageUrl, setEditImageUrl] = useState('')
  const [editVariationsJson, setEditVariationsJson] = useState('{}')

  const openEditModal = (product: Product) => {
    setEditingProduct(product)
    setEditName(product.name)
    
    // Resolve initial category ids
    let catIds: string[] = []
    if (product.variations && typeof product.variations === 'object' && Array.isArray(product.variations.category_ids)) {
      catIds = [...product.variations.category_ids]
    } else {
      catIds = [product.category_id]
    }
    // Also include featured ID if is_featured is true
    if (product.is_featured && !catIds.includes('c0000000-0000-0000-0000-000000000008')) {
      catIds.push('c0000000-0000-0000-0000-000000000008')
    }
    setEditCategoryIds(catIds)
    setEditPrice(String(product.price))
    setEditOldPrice(product.old_price ? String(product.old_price) : '')
    setEditStock(String(product.stock))
    setEditDescription(product.description || '')
    setEditImageUrl(product.images ? product.images.join(', ') : '')
    
    // Parse variations and remove category_ids so they don't see it in raw JSON edit
    let varsWithoutCats = { ...product.variations }
    if (varsWithoutCats && typeof varsWithoutCats === 'object') {
      delete varsWithoutCats.category_ids
    }
    setEditVariationsJson(JSON.stringify(varsWithoutCats, null, 2))
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // Create Product Submit
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Ensure at least one category selected
    if (selectedCategoryIds.length === 0) {
      alert('Please select at least one category.')
      setLoading(false)
      return
    }

    // Parse variations
    let parsedVariations: any = {}
    try {
      if (variationsJson.trim()) {
        parsedVariations = JSON.parse(variationsJson)
      }
    } catch (err) {
      alert('Invalid Variations JSON. Please correct the format.')
      setLoading(false)
      return
    }

    const primaryCategoryId = selectedCategoryIds[0]
    const isFeaturedCategorySelected = selectedCategoryIds.includes('c0000000-0000-0000-0000-000000000008')

    // Append category_ids list to parsedVariations
    const updatedVariations = {
      ...parsedVariations,
      category_ids: selectedCategoryIds
    }

    // Generate slug from name
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    
    // Split images
    const imagesArray = imageUrl.trim() ? imageUrl.split(',').map((img) => img.trim()) : []

    try {
      const payload = {
        name,
        slug,
        category_id: primaryCategoryId,
        is_featured: isFeaturedCategorySelected,
        price: Number(price),
        old_price: oldPrice ? Number(oldPrice) : 0,
        stock: Number(stock),
        description,
        images: imagesArray.length > 0 ? imagesArray : ['https://images.unsplash.com/photo-1522069169874-c58ec4b76be5'],
        variations: updatedVariations
      }

      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const resJson = await response.json()
      if (!response.ok) {
        throw new Error(resJson.error || 'Failed to insert product record.')
      }
      const data = resJson.data

      if (data) {
        // Find category name to append to local state
        const cat = categories.find((c) => c.id === primaryCategoryId)
        const newProductWithCategory = {
          ...data,
          categories: { name: cat ? cat.name : 'Unknown' }
        }

        // Update local state list
        setProducts((prev) => [newProductWithCategory, ...prev])
        
        // Reset form fields
        setName('')
        setSelectedCategoryIds([])
        setPrice('')
        setOldPrice('')
        setStock('')
        setDescription('')
        setImageUrl('')
        setVariationsJson('{\n  "sizes": ["1.5 Feet", "2 Feet"]\n}')
        setShowAddForm(false)
      }
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Failed to insert product record.')
    } finally {
      setLoading(false)
    }
  }

  // Update Product Submit
  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProduct) return
    setLoading(true)

    // Ensure at least one category selected
    if (editCategoryIds.length === 0) {
      alert('Please select at least one category.')
      setLoading(false)
      return
    }

    // Parse variations
    let parsedVariations = {}
    try {
      if (editVariationsJson.trim()) {
        parsedVariations = JSON.parse(editVariationsJson)
      }
    } catch (err) {
      alert('Invalid Variations JSON. Please correct the format.')
      setLoading(false)
      return
    }

    const primaryCategoryId = editCategoryIds[0]
    const isFeaturedCategorySelected = editCategoryIds.includes('c0000000-0000-0000-0000-000000000008')

    // Append category_ids list to parsedVariations
    const updatedVariations = {
      ...parsedVariations,
      category_ids: editCategoryIds
    }

    // Generate slug from name
    const slug = editName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const imagesArray = editImageUrl.trim() ? editImageUrl.split(',').map((img) => img.trim()) : []

    try {
      const payload = {
        id: editingProduct.id,
        name: editName,
        slug,
        category_id: primaryCategoryId,
        is_featured: isFeaturedCategorySelected,
        price: Number(editPrice),
        old_price: editOldPrice ? Number(editOldPrice) : 0,
        stock: Number(editStock),
        description: editDescription,
        images: imagesArray.length > 0 ? imagesArray : ['https://images.unsplash.com/photo-1522069169874-c58ec4b76be5'],
        variations: updatedVariations
      }

      const response = await fetch('/api/admin/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const resJson = await response.json()
      if (!response.ok) {
        throw new Error(resJson.error || 'Failed to update product.')
      }

      const updatedData = resJson.data
      if (updatedData) {
        // Resolve categories names or let local state list refresh/re-map
        const cat = categories.find((c) => c.id === primaryCategoryId)
        const updatedProductWithCategory = {
          ...updatedData,
          categories: { name: cat ? cat.name : 'Unknown' }
        }

        setProducts((prev) => 
          prev.map((p) => p.id === editingProduct.id ? updatedProductWithCategory : p)
        )
        setEditingProduct(null)
      }
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Failed to update product.')
    } finally {
      setLoading(false)
    }
  }

  // Delete Product
  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product? This action is permanent.')) return

    try {
      const response = await fetch('/api/admin/products', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: productId })
      })
      const resJson = await response.json()
      if (!response.ok) {
        throw new Error(resJson.error || 'Failed to delete product.')
      }

      // Update local state list
      setProducts((prev) => prev.filter((p) => p.id !== productId))
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Failed to delete product.')
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-800">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="hidden md:flex w-64 flex-col bg-slate-900 text-slate-400">
        <div className="flex h-16 items-center px-6 border-b border-slate-800 bg-slate-950">
          <Sparkles className="h-5 w-5 text-emerald-400 mr-2" />
          <span className="text-sm font-bold tracking-wider text-white">Verdant Aquatics Control</span>
        </div>
        <nav className="flex-1 space-y-1 px-4 py-6">
          <Link
            href="/admin"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 hover:text-white transition"
          >
            <BarChart3 className="h-4 w-4" />
            <span>Dashboard</span>
          </Link>
          <Link
            href="/admin/products"
            className="flex items-center gap-3 rounded-md bg-slate-800 px-3 py-2 text-sm font-semibold text-white transition"
          >
            <Package className="h-4 w-4" />
            <span>Manage Inventory</span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 hover:text-white transition"
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Storefront</span>
          </Link>
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-red-950 hover:text-red-400 transition"
          >
            <LogOut className="h-4 w-4" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* TOP BAR */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
          <h1 className="text-lg font-bold text-slate-950">Catalog Inventory</h1>
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-1.5 shadow"
          >
            {showAddForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            <span>{showAddForm ? 'Close Form' : 'Add Product'}</span>
          </button>
        </header>

        {/* WORKSPACE */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* ADD PRODUCT FORM PANEL */}
          {showAddForm && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-4 animate-fade-in-down">
              <h2 className="text-sm font-bold text-slate-950 pb-2 border-b border-slate-100 uppercase tracking-wide">
                Upload New Product to Catalogue
              </h2>
              
              <form onSubmit={handleCreateProduct} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="space-y-4">
                  
                  {/* Name */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-500 uppercase">Product Name *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Canister Filter 15W"
                      className="w-full rounded border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Category */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-500 uppercase">Categories (Select one or more) *</label>
                    <div className="border border-slate-200 rounded p-2.5 space-y-1.5 bg-slate-50 max-h-36 overflow-y-auto">
                      {categories.map((cat) => (
                        <label key={cat.id} className="flex items-center gap-2 text-xs text-slate-700 hover:text-slate-900 cursor-pointer font-medium">
                          <input
                            type="checkbox"
                            checked={selectedCategoryIds.includes(cat.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCategoryIds([...selectedCategoryIds, cat.id])
                              } else {
                                setSelectedCategoryIds(selectedCategoryIds.filter((id) => id !== cat.id))
                              }
                            }}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                          />
                          <span>{cat.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Price Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-500 uppercase">Sale Price (৳) *</label>
                      <input
                        type="number"
                        required
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="e.g. 1500"
                        className="w-full rounded border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-500 uppercase">Old Price (৳)</label>
                      <input
                        type="number"
                        value={oldPrice}
                        onChange={(e) => setOldPrice(e.target.value)}
                        placeholder="e.g. 1800"
                        className="w-full rounded border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Stock */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-500 uppercase">Initial Stock *</label>
                    <input
                      type="number"
                      required
                      value={stock}
                      onChange={(e) => setStock(e.target.value)}
                      placeholder="e.g. 50"
                      className="w-full rounded border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Image URL */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-500 uppercase">Image URLs (comma separated)</label>
                    <input
                      type="text"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/photo-..., https://..."
                      className="w-full rounded border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-emerald-500"
                    />
                  </div>

                </div>

                <div className="space-y-4">
                  {/* Description */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-500 uppercase">Description</label>
                    <textarea
                      rows={4}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Detailed specifications and descriptions..."
                      className="w-full rounded border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Variations JSON */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
                      Variations JSON Configuration 
                    </label>
                    <textarea
                      rows={5}
                      value={variationsJson}
                      onChange={(e) => setVariationsJson(e.target.value)}
                      className="w-full rounded border border-slate-200 px-3 py-1.5 text-xs font-mono outline-none bg-slate-50 focus:border-emerald-500"
                    />
                    <span className="text-[10px] text-slate-400 block">
                      Define choices as array lists. Example: {"{"}&quot;sizes&quot;: [&quot;Small&quot;, &quot;Large&quot;]{"}"}
                    </span>
                  </div>

                  {/* Action button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 shadow-md transition disabled:bg-slate-400"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Publishing Product...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          Add Product to Stock
                        </>
                      )}
                    </button>
                  </div>

                </div>

              </form>
            </div>
          )}

          {/* CATALOGUE LISTING TABLE */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200 bg-slate-50/50">
              <h2 className="text-base font-bold text-slate-950">Active Catalogue Items ({products.length})</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="p-4 w-16">Preview</th>
                    <th className="p-4">Product Details</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Price (৳)</th>
                    <th className="p-4">Stock Levels</th>
                    <th className="p-4">Variations</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500 font-medium">
                        The store catalogue has no products. Click &quot;Add Product&quot; to begin.
                      </td>
                    </tr>
                  ) : (
                    products.map((product) => (
                      <tr key={product.id} className="hover:bg-slate-50/50">
                        {/* Preview */}
                        <td className="p-4">
                          <div className="h-10 w-10 overflow-hidden rounded border border-slate-200">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={product.images[0] || 'https://images.unsplash.com/photo-1522069169874-c58ec4b76be5'}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          </div>
                        </td>

                        {/* Details */}
                        <td className="p-4 font-semibold text-slate-800">
                          {product.name}
                        </td>

                        {/* Category */}
                        <td className="p-4 text-slate-500">
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
                          })() || 'None'}
                        </td>

                        {/* Price */}
                        <td className="p-4 font-mono font-bold text-slate-900">
                          ৳{Number(product.price).toLocaleString()}
                        </td>

                        {/* Stock */}
                        <td className="p-4 font-mono">
                          <span className={`font-bold ${product.stock > 10 ? 'text-slate-800' : 'text-red-600'}`}>
                            {product.stock} items
                          </span>
                        </td>

                        {/* Variations */}
                        <td className="p-4 font-mono text-[10px] text-slate-500 max-w-xs truncate">
                          {product.variations && Object.keys(product.variations).length > 0 
                            ? JSON.stringify(product.variations) 
                            : 'None'}
                        </td>

                        {/* Actions */}
                        <td className="p-4 flex items-center justify-center gap-1.5 h-[72px]">
                          <button
                            onClick={() => openEditModal(product)}
                            className="text-slate-400 hover:text-emerald-600 p-1.5 rounded-full hover:bg-emerald-50 transition"
                            title="Edit product"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="text-slate-400 hover:text-red-500 p-1.5 rounded-full hover:bg-red-50 transition"
                            title="Delete product"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </main>
      </div>

      {/* EDIT PRODUCT MODAL DIALOG */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col animate-fade-in">
            {/* Modal Header */}
            <div className="flex h-14 items-center justify-between border-b border-slate-200 px-6 bg-slate-50 rounded-t-lg flex-shrink-0">
              <h3 className="text-sm font-bold text-slate-950 uppercase tracking-wide">Edit Product Details</h3>
              <button 
                onClick={() => setEditingProduct(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleUpdateProduct} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {/* Name */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-500 uppercase">Product Name *</label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full rounded border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Categories checkboxes */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-500 uppercase">Categories (Select one or more) *</label>
                    <div className="border border-slate-200 rounded p-2.5 space-y-1.5 bg-slate-50 max-h-36 overflow-y-auto">
                      {categories.map((cat) => (
                        <label key={cat.id} className="flex items-center gap-2 text-xs text-slate-700 hover:text-slate-900 cursor-pointer font-medium">
                          <input
                            type="checkbox"
                            checked={editCategoryIds.includes(cat.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditCategoryIds([...editCategoryIds, cat.id])
                              } else {
                                setEditCategoryIds(editCategoryIds.filter((id) => id !== cat.id))
                              }
                            }}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                          />
                          <span>{cat.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Price Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-500 uppercase">Sale Price (৳) *</label>
                      <input
                        type="number"
                        required
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        className="w-full rounded border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-500 uppercase">Old Price (৳)</label>
                      <input
                        type="number"
                        value={editOldPrice}
                        onChange={(e) => setEditOldPrice(e.target.value)}
                        className="w-full rounded border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Stock */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-500 uppercase">Stock *</label>
                    <input
                      type="number"
                      required
                      value={editStock}
                      onChange={(e) => setEditStock(e.target.value)}
                      className="w-full rounded border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Image URL */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-500 uppercase">Image URLs (comma separated)</label>
                    <input
                      type="text"
                      value={editImageUrl}
                      onChange={(e) => setEditImageUrl(e.target.value)}
                      className="w-full rounded border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Description */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-500 uppercase">Description</label>
                    <textarea
                      rows={6}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="w-full rounded border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Variations JSON */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-500 uppercase">Variations JSON Configuration</label>
                    <textarea
                      rows={6}
                      value={editVariationsJson}
                      onChange={(e) => setEditVariationsJson(e.target.value)}
                      className="w-full rounded border border-slate-200 px-3 py-1.5 text-xs font-mono outline-none bg-slate-50 focus:border-emerald-500"
                    />
                    <span className="text-[10px] text-slate-400 block">
                      Define choices as array lists. Example: {"{"}&quot;sizes&quot;: [&quot;Small&quot;, &quot;Large&quot;]{"}"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs px-4 py-2 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2 shadow-md disabled:bg-slate-400 transition"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Saving Changes...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Save Product
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
