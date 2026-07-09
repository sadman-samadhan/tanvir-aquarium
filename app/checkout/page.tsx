'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { ShoppingBag, ArrowLeft, Loader2, CreditCard, Truck, HelpCircle } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { useCart } from '@/context/CartContext'
import axios from 'axios'

interface PathaoItem {
  city_id?: number
  city_name?: string
  zone_id?: number
  zone_name?: string
  area_id?: number
  area_name?: string
}

export default function CheckoutPage() {
  const { cartItems, cartTotal, clearCart } = useCart()
  const [loading, setLoading] = useState(false)
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false)

  // Form Fields
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [shippingAddress, setShippingAddress] = useState('')

  // Pathao Locations
  const [cities, setCities] = useState<any[]>([])
  const [zones, setZones] = useState<any[]>([])
  const [areas, setAreas] = useState<any[]>([])

  const [selectedCity, setSelectedCity] = useState('')
  const [selectedZone, setSelectedZone] = useState('')
  const [selectedArea, setSelectedArea] = useState('')

  const [deliveryCharge, setDeliveryCharge] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'BKASH'>('COD')
  const [errorMessage, setErrorMessage] = useState('')

  // Fetch Cities on Mount
  useEffect(() => {
    async function loadCities() {
      try {
        const response = await axios.get('/api/pathao?action=cities')
        setCities(response.data)
      } catch (err) {
        console.error('Failed to load Pathao cities', err)
      }
    }
    loadCities()
  }, [])

  // Fetch Zones when City changes
  useEffect(() => {
    if (!selectedCity) {
      setZones([])
      setAreas([])
      setSelectedZone('')
      setSelectedArea('')
      setDeliveryCharge(0)
      return
    }

    async function loadZones() {
      try {
        const response = await axios.get(`/api/pathao?city_id=${selectedCity}`)
        setZones(response.data)
      } catch (err) {
        console.error('Failed to load zones', err)
      }
    }

    loadZones()

    // Determine delivery charge:
    // Usually City ID 1 is Dhaka City, which costs ৳60. Others cost ৳120.
    // Let's assume city_id 1 is Dhaka City (inside Dhaka).
    const isDhaka = Number(selectedCity) === 1 || selectedCity === '1'
    setDeliveryCharge(isDhaka ? 60 : 120)

  }, [selectedCity])

  // Fetch Areas when Zone changes
  useEffect(() => {
    if (!selectedZone) {
      setAreas([])
      setSelectedArea('')
      return
    }

    async function loadAreas() {
      try {
        const response = await axios.get(`/api/pathao?zone_id=${selectedZone}`)
        setAreas(response.data)
      } catch (err) {
        console.error('Failed to load areas', err)
      }
    }
    loadAreas()
  }, [selectedZone])

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')

    // Basic Validation
    if (!customerName || !customerPhone || !shippingAddress || !selectedCity || !selectedZone || !selectedArea) {
      setErrorMessage('Please fill in all the required fields.')
      return
    }

    if (customerPhone.length < 11) {
      setErrorMessage('Please enter a valid 11-digit mobile number.')
      return
    }

    if (shippingAddress.trim().length < 10) {
      setErrorMessage('Address must be at least 10 characters long (required for courier delivery).')
      return
    }

    if (cartItems.length === 0) {
      setErrorMessage('Your shopping cart is empty.')
      return
    }

    setLoading(true)

    try {
      const cityName = cities.find((c) => String(c.city_id) === String(selectedCity))?.city_name || ''
      const zoneName = zones.find((z) => String(z.zone_id) === String(selectedZone))?.zone_name || ''
      const areaName = areas.find((a) => String(a.area_id) === String(selectedArea))?.area_name || ''

      const payload = {
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail || null,
        shipping_address: shippingAddress,
        city_id: Number(selectedCity),
        zone_id: Number(selectedZone),
        area_id: Number(selectedArea),
        city_name: cityName,
        zone_name: zoneName,
        area_name: areaName,
        delivery_charge: deliveryCharge,
        total_price: cartTotal + deliveryCharge,
        payment_method: paymentMethod, // 'COD' or 'BKASH'
        cartItems: cartItems
      }

      const response = await axios.post('/api/bkash', payload)

      if (response.data?.checkoutUrl) {
        // Clear local cart storage, payment is in progress
        clearCart()
        // Redirect user to secure bKash checkout portal
        window.location.href = response.data.checkoutUrl
      } else {
        throw new Error('Failed to fetch payment portal link')
      }
    } catch (err: any) {
      console.error(err)
      setErrorMessage(err.response?.data?.error || err.message || 'Something went wrong during checkout. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800">
      <Navbar onCartToggle={() => setCartDrawerOpen(true)} />

      <main className="flex-grow mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center gap-2 mb-8">
          <Link href="/" className="text-sm font-semibold text-emerald-600 hover:text-emerald-500 flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Back to Store
          </Link>
        </div>

        <h1 className="text-3xl font-extrabold text-slate-950 mb-8 tracking-tight">Checkout Order</h1>

        {cartItems.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg border border-slate-200 shadow-sm">
            <ShoppingBag className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-slate-900">Your cart is empty</p>
            <p className="mt-1 text-sm text-slate-500">Go back and select some items to check out.</p>
            <Link href="/" className="mt-6 inline-block rounded-md bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 transition">
              Back to Catalog
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left side: Billing Address & Location selector */}
            <form onSubmit={handlePlaceOrder} className="lg:col-span-7 space-y-6">
              
              {/* Billing Information Section */}
              <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm space-y-4">
                <h2 className="text-lg font-bold text-slate-950 flex items-center gap-2 pb-3 border-b border-slate-100">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 text-xs font-bold">1</span>
                  Recipient Details
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Abir Rahman"
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Mobile Number (11 digits) *
                    </label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="e.g. 01712345678"
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="e.g. abir@example.com"
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                  />
                </div>
              </div>

              {/* Delivery Destination Section */}
              <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm space-y-4">
                <h2 className="text-lg font-bold text-slate-950 flex items-center gap-2 pb-3 border-b border-slate-100">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 text-xs font-bold">2</span>
                  Delivery Address (Pathao Courier)
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  
                  {/* City dropdown */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">City *</label>
                    <select
                      required
                      value={selectedCity}
                      onChange={(e) => setSelectedCity(e.target.value)}
                      className="w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                    >
                      <option value="">Select City</option>
                      {cities.map((city) => (
                        <option key={city.city_id} value={city.city_id}>
                          {city.city_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Zone dropdown */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Zone *</label>
                    <select
                      required
                      disabled={!selectedCity}
                      value={selectedZone}
                      onChange={(e) => setSelectedZone(e.target.value)}
                      className="w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-sm outline-none disabled:bg-slate-50 disabled:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                    >
                      <option value="">Select Zone</option>
                      {zones.map((zone) => (
                        <option key={zone.zone_id} value={zone.zone_id}>
                          {zone.zone_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Area dropdown */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Area *</label>
                    <select
                      required
                      disabled={!selectedZone}
                      value={selectedArea}
                      onChange={(e) => setSelectedArea(e.target.value)}
                      className="w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-sm outline-none disabled:bg-slate-50 disabled:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                    >
                      <option value="">Select Area</option>
                      {areas.map((area) => (
                        <option key={area.area_id} value={area.area_id}>
                          {area.area_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Street Address & House details *
                  </label>
                  <textarea
                    required
                    minLength={10}
                    rows={3}
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder="House number, Road, Village/Sector details (Min 10 characters)..."
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Note: Address must be at least 10 characters long (required by Pathao Courier).
                  </span>
                </div>
              </div>

              {/* Payment Method Selector Section */}
              <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm space-y-4">
                <h2 className="text-lg font-bold text-slate-950 flex items-center gap-2 pb-3 border-b border-slate-100">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 text-xs font-bold">3</span>
                  Payment Option
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* COD (Prepay Shipping fee) */}
                  <label className={`relative flex flex-col border rounded-lg p-4 cursor-pointer hover:bg-slate-50 transition ${
                    paymentMethod === 'COD' ? 'border-emerald-500 ring-2 ring-emerald-500/10 bg-emerald-50/20' : 'border-slate-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="radio"
                        name="payment_choice"
                        value="COD"
                        checked={paymentMethod === 'COD'}
                        onChange={() => setPaymentMethod('COD')}
                        className="h-4 w-4 text-emerald-600 border-slate-300 focus:ring-emerald-500"
                      />
                      <span className="text-sm font-bold text-slate-900 flex items-center gap-1">
                        <Truck className="h-4 w-4 text-slate-500" /> Cash on Delivery
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 leading-relaxed">
                      Prepay shipping fee of **৳{deliveryCharge || 120}** via bKash now. The product price (**৳{cartTotal.toLocaleString()}**) is paid upon delivery.
                    </span>
                  </label>

                  {/* Full Payment */}
                  <label className={`relative flex flex-col border rounded-lg p-4 cursor-pointer hover:bg-slate-50 transition ${
                    paymentMethod === 'BKASH' ? 'border-emerald-500 ring-2 ring-emerald-500/10 bg-emerald-50/20' : 'border-slate-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="radio"
                        name="payment_choice"
                        value="BKASH"
                        checked={paymentMethod === 'BKASH'}
                        onChange={() => setPaymentMethod('BKASH')}
                        className="h-4 w-4 text-emerald-600 border-slate-300 focus:ring-emerald-500"
                      />
                      <span className="text-sm font-bold text-slate-900 flex items-center gap-1">
                        <CreditCard className="h-4 w-4 text-slate-500" /> Full Prepaid bKash
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 leading-relaxed">
                      Pay the complete amount (**৳{(cartTotal + deliveryCharge).toLocaleString()}**) upfront via bKash checkout. COD will be set to ৳0.
                    </span>
                  </label>

                </div>

                {errorMessage && (
                  <p className="text-xs font-semibold text-red-500 pt-2">{errorMessage}</p>
                )}

                {/* Confirm Pay Button */}
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-6 py-3.5 text-base font-bold text-white shadow-sm hover:bg-emerald-500 disabled:bg-slate-400 transition-all duration-200 h-14"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Redirecting to bKash...
                      </>
                    ) : (
                      <>
                        <span>Confirm & Pay ৳{paymentMethod === 'COD' ? deliveryCharge : cartTotal + deliveryCharge} via bKash</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              
            </form>

            {/* Right side: Cart Summary review panel */}
            <div className="lg:col-span-5 bg-white rounded-lg border border-slate-200 p-6 shadow-sm space-y-6">
              <h2 className="text-lg font-bold text-slate-950 pb-3 border-b border-slate-100">
                Order Summary
              </h2>

              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-2">
                {cartItems.map((item) => (
                  <div key={`${item.id}-${JSON.stringify(item.selectedVariations)}`} className="flex py-3 gap-3">
                    <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded border border-slate-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.image} alt="" className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="text-xs font-semibold text-slate-900 line-clamp-1">{item.name}</p>
                      <p className="text-[10px] text-slate-500">Qty: {item.quantity}</p>
                      {Object.entries(item.selectedVariations).map(([k, v]) => (
                        <p key={k} className="text-[10px] text-slate-400 capitalize">{k}: {v}</p>
                      ))}
                    </div>
                    <span className="text-xs font-bold text-slate-950">৳{(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              {/* Subtotal listings */}
              <div className="border-t border-slate-200 pt-4 space-y-2 text-xs">
                <div className="flex justify-between font-medium">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="text-slate-800 font-semibold">৳{cartTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-slate-500 font-medium">Pathao Delivery</span>
                  <span className="text-slate-800 font-semibold">
                    {deliveryCharge > 0 ? `৳${deliveryCharge}` : 'Select City to calculate'}
                  </span>
                </div>
                
                <div className="border-t border-slate-100 pt-2 flex justify-between text-sm font-bold text-slate-950">
                  <span>Grand Total</span>
                  <span>৳{(cartTotal + deliveryCharge).toLocaleString()}</span>
                </div>
              </div>

              {/* Breakdown message depending on Payment Method */}
              <div className="bg-slate-50 rounded-md border border-slate-200 p-4 space-y-2 text-xs text-slate-600">
                {paymentMethod === 'COD' ? (
                  <>
                    <p className="font-bold text-slate-800">Payment Breakdown (COD Path):</p>
                    <div className="flex justify-between">
                      <span>Prepaid via bKash Now (Delivery fee):</span>
                      <span className="font-bold text-emerald-600">৳{deliveryCharge}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cash on Delivery (Remaining product cost):</span>
                      <span className="font-bold text-slate-900">৳{cartTotal.toLocaleString()}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="font-bold text-slate-800">Payment Breakdown (Full Prepay):</p>
                    <div className="flex justify-between">
                      <span>Prepaid via bKash Now (Full order):</span>
                      <span className="font-bold text-emerald-600">৳{(cartTotal + deliveryCharge).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cash on Delivery (At doorstep):</span>
                      <span className="font-bold text-slate-900">৳0</span>
                    </div>
                  </>
                )}
              </div>

            </div>

          </div>
        )}
      </main>
    </div>
  )
}
