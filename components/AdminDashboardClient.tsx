'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { 
  BarChart3, ShoppingBag, Truck, DollarSign, LogOut, Package, 
  Search, ShieldCheck, Play, CheckCircle2, AlertTriangle, ExternalLink 
} from 'lucide-react'

interface OrderItem {
  id: string
  product_id: string
  quantity: number
  price: number
  selected_variations: Record<string, string>
  products?: { name: string }
}

interface Order {
  id: string
  customer_name: string
  customer_phone: string
  customer_email: string | null
  shipping_address: string
  city_id: number
  zone_id: number
  area_id: number
  delivery_charge: number
  total_price: number
  payment_method: string
  payment_status: string
  payment_details: any
  pathao_consignment_id: string | null
  pathao_status: string | null
  created_at: string
  order_items?: OrderItem[]
}

interface DashboardProps {
  initialOrders: Order[]
}

export default function AdminDashboardClient({ initialOrders }: DashboardProps) {
  const router = useRouter()
  const supabase = createClient()
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [searchQuery, setSearchQuery] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Edit Order Modal States
  const [editingOrder, setEditingOrder] = useState<Order | null>(null)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editCity, setEditCity] = useState('')
  const [editZone, setEditZone] = useState('')
  const [editArea, setEditArea] = useState('')
  const [editDeliveryCharge, setEditDeliveryCharge] = useState(0)

  const [locationCities, setLocationCities] = useState<any[]>([])
  const [locationZones, setLocationZones] = useState<any[]>([])
  const [locationAreas, setLocationAreas] = useState<any[]>([])
  const [loadingLocations, setLoadingLocations] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)

  // Fetch Cities on Mount for editing
  useEffect(() => {
    async function loadCities() {
      try {
        const response = await fetch('/api/pathao?action=cities')
        const data = await response.json()
        setLocationCities(data)
      } catch (err) {
        console.error('Failed to load cities', err)
      }
    }
    loadCities()
  }, [])

  // Fetch Zones when editCity changes
  useEffect(() => {
    if (!editCity) {
      setLocationZones([])
      setLocationAreas([])
      return
    }
    // Don't trigger if it matches current editing order's values unless they explicitly changed it
    if (editingOrder && String(editingOrder.city_id) === String(editCity) && locationZones.length > 0) {
      return
    }

    async function loadZones() {
      setLoadingLocations(true)
      try {
        const response = await fetch(`/api/pathao?city_id=${editCity}`)
        const data = await response.json()
        setLocationZones(data)
      } catch (err) {
        console.error('Failed to load zones', err)
      } finally {
        setLoadingLocations(false)
      }
    }
    loadZones()
    const isDhaka = Number(editCity) === 1 || editCity === '1'
    setEditDeliveryCharge(isDhaka ? 60 : 120)
  }, [editCity])

  // Fetch Areas when editZone changes
  useEffect(() => {
    if (!editZone) {
      setLocationAreas([])
      return
    }
    if (editingOrder && String(editingOrder.zone_id) === String(editZone) && locationAreas.length > 0) {
      return
    }

    async function loadAreas() {
      setLoadingLocations(true)
      try {
        const response = await fetch(`/api/pathao?zone_id=${editZone}`)
        const data = await response.json()
        setLocationAreas(data)
      } catch (err) {
        console.error('Failed to load areas', err)
      } finally {
        setLoadingLocations(false)
      }
    }
    loadAreas()
  }, [editZone])

  const openEditModal = async (order: Order) => {
    setEditingOrder(order)
    setEditName(order.customer_name)
    setEditPhone(order.customer_phone)
    setEditAddress(order.shipping_address)
    setEditCity(String(order.city_id))
    
    // Fetch zones and areas of the order immediately so they display in select lists
    try {
      setLoadingLocations(true)
      const zoneRes = await fetch(`/api/pathao?city_id=${order.city_id}`)
      const zoneData = await zoneRes.json()
      setLocationZones(zoneData)
      setEditZone(String(order.zone_id))

      const areaRes = await fetch(`/api/pathao?zone_id=${order.zone_id}`)
      const areaData = await areaRes.json()
      setLocationAreas(areaData)
      setEditArea(String(order.area_id))
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingLocations(false)
    }

    setEditDeliveryCharge(order.delivery_charge)
  }

  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingOrder) return

    if (editPhone.length < 11) {
      alert('Please enter a valid 11-digit mobile number.')
      return
    }

    if (editAddress.trim().length < 10) {
      alert('Address must be at least 10 characters long (required for courier delivery).')
      return
    }

    setSaveLoading(true)
    try {
      const cityName = locationCities.find((c) => String(c.city_id) === String(editCity))?.city_name || ''
      const zoneName = locationZones.find((z) => String(z.zone_id) === String(editZone))?.zone_name || ''
      const areaName = locationAreas.find((a) => String(a.area_id) === String(editArea))?.area_name || ''

      const response = await fetch('/api/admin/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingOrder.id,
          customer_name: editName,
          customer_phone: editPhone,
          shipping_address: editAddress,
          city_id: Number(editCity),
          zone_id: Number(editZone),
          area_id: Number(editArea),
          city_name: cityName,
          zone_name: zoneName,
          area_name: areaName,
          delivery_charge: editDeliveryCharge
        })
      })

      const resJson = await response.json()
      if (!response.ok) {
        throw new Error(resJson.error || 'Failed to update order details.')
      }

      // Update local state list
      setOrders((prev) =>
        prev.map((o) => (o.id === editingOrder.id ? resJson.data : o))
      )
      setEditingOrder(null)
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Error saving order changes.')
    } finally {
      setSaveLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // Calculate statistics (Filtering out failed/pending payments for accurate accounting)
  const paidOrders = orders.filter(
    (o) => o.payment_status === 'FullyPaid' || o.payment_status === 'DeliveryChargePrePaid'
  )

  const totalSalesCount = paidOrders.length
  
  const totalRevenue = paidOrders.reduce((sum, o) => sum + Number(o.total_price), 0)
  
  const totalPrepaidShipping = paidOrders.reduce((sum, o) => sum + Number(o.delivery_charge), 0)
  
  const codToCollect = paidOrders.reduce((sum, o) => {
    if (o.payment_method === 'COD' && o.payment_status === 'DeliveryChargePrePaid') {
      return sum + (Number(o.total_price) - Number(o.delivery_charge))
    }
    return sum
  }, 0)

  // Filter orders by search
  const filteredOrders = orders.filter((order) => {
    const query = searchQuery.toLowerCase()
    return (
      order.customer_name.toLowerCase().includes(query) ||
      order.customer_phone.includes(query) ||
      order.id.toLowerCase().includes(query)
    )
  })

  // Manual consignment trigger
  const handleDispatch = async (orderId: string) => {
    setActionLoading(orderId)
    try {
      const response = await fetch('/api/admin/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId })
      })
      const data = await response.json()
      
      if (data.success) {
        // Update local state
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? { ...o, pathao_consignment_id: data.consignment_id, pathao_status: 'dispatched' }
              : o
          )
        )
      } else {
        alert(data.error || 'Courier booking failed.')
      }
    } catch (err) {
      console.error(err)
      alert('Error triggering Pathao API.')
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-800">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="hidden md:flex w-64 flex-col bg-slate-900 text-slate-400">
        <div className="flex h-16 items-center px-6 border-b border-slate-800 bg-slate-950">
          <ShieldCheck className="h-5 w-5 text-emerald-400 mr-2" />
          <span className="text-sm font-bold tracking-wider text-white">Verdant Aquatics Control</span>
        </div>
        <nav className="flex-1 space-y-1 px-4 py-6">
          <Link
            href="/admin"
            className="flex items-center gap-3 rounded-md bg-slate-800 px-3 py-2 text-sm font-semibold text-white transition"
          >
            <BarChart3 className="h-4 w-4" />
            <span>Dashboard</span>
          </Link>
          <Link
            href="/admin/products"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 hover:text-white transition"
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
          <h1 className="text-lg font-bold text-slate-950">Dashboard Overview</h1>
          <button 
            onClick={handleLogout}
            className="md:hidden flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-red-500"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </header>

        {/* WORKSPACE */}
        <main className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* ANALYTICS GRID */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            
            {/* Sales Card */}
            <div className="flex items-center bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
              <div className="rounded-full bg-emerald-50 p-3 text-emerald-600 mr-4">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Paid Orders</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{totalSalesCount}</p>
              </div>
            </div>

            {/* Revenue Card */}
            <div className="flex items-center bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
              <div className="rounded-full bg-blue-50 p-3 text-blue-600 mr-4">
                <DollarSign className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Total Sales Revenue</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">৳{totalRevenue.toLocaleString()}</p>
              </div>
            </div>

            {/* Prepaid shipping Card */}
            <div className="flex items-center bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
              <div className="rounded-full bg-indigo-50 p-3 text-indigo-600 mr-4">
                <Truck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Prepaid Shipping</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">৳{totalPrepaidShipping.toLocaleString()}</p>
              </div>
            </div>

            {/* COD Cash to Collect Card */}
            <div className="flex items-center bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
              <div className="rounded-full bg-amber-50 p-3 text-amber-600 mr-4">
                <ExternalLink className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">COD Collections (Pending)</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">৳{codToCollect.toLocaleString()}</p>
              </div>
            </div>

          </div>

          {/* ORDERS TABLE SECTION */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            
            {/* Header / Search */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 border-b border-slate-200 bg-slate-50/50">
              <h2 className="text-base font-bold text-slate-950">Recent Orders Queue</h2>
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search customer, phone or order..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-white py-1.5 pl-10 pr-4 text-xs outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="p-4">Order ID & Date</th>
                    <th className="p-4">Customer Details</th>
                    <th className="p-4">Address</th>
                    <th className="p-4">Amounts</th>
                    <th className="p-4">Payment</th>
                    <th className="p-4">Pathao Courier</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500 font-medium bg-white">
                        No orders matched the current query.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => {
                      const date = new Date(order.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })
                      const codAmount = order.payment_method === 'COD' 
                        ? Number(order.total_price) - Number(order.delivery_charge) 
                        : 0

                      return (
                        <tr key={order.id} className="hover:bg-slate-50/50">
                          {/* Order ID */}
                          <td className="p-4 font-mono">
                            <span className="font-bold text-slate-900 block truncate w-24" title={order.id}>
                              {order.id.slice(0, 8)}...
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">{date}</span>
                          </td>

                          {/* Customer */}
                          <td className="p-4">
                            <span className="font-semibold text-slate-800 block">{order.customer_name}</span>
                            <span className="text-slate-500 font-mono block mt-0.5">{order.customer_phone}</span>
                          </td>

                          {/* Address */}
                          <td className="p-4 max-w-xs" title={order.shipping_address}>
                            <span className="text-slate-800 font-medium block break-words">{order.shipping_address}</span>
                            {order.payment_details?.shipping_metadata ? (
                              <span className="text-[10px] text-slate-500 block mt-0.5 font-semibold">
                                {order.payment_details.shipping_metadata.area_name},{' '}
                                {order.payment_details.shipping_metadata.zone_name},{' '}
                                {order.payment_details.shipping_metadata.city_name}
                              </span>
                            ) : (
                              <span className="text-[10px] text-amber-600 block mt-0.5 italic">
                                Area ID: {order.area_id}, Zone ID: {order.zone_id}, City ID: {order.city_id}
                              </span>
                            )}
                          </td>

                          {/* Amounts */}
                          <td className="p-4">
                            <span className="font-bold text-slate-900 block">৳{Number(order.total_price).toLocaleString()}</span>
                            <span className="text-[10px] text-slate-500 block mt-0.5">
                              Shipping: ৳{order.delivery_charge}
                            </span>
                          </td>

                          {/* Payment */}
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              order.payment_status === 'FullyPaid' || order.payment_status === 'DeliveryChargePrePaid'
                                ? 'bg-emerald-50 text-emerald-700'
                                : order.payment_status === 'Pending'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-red-50 text-red-700'
                            }`}>
                              {order.payment_status === 'FullyPaid' && 'Fully Paid'}
                              {order.payment_status === 'DeliveryChargePrePaid' && 'Delivery Paid'}
                              {order.payment_status === 'Pending' && 'Pending'}
                              {order.payment_status === 'Failed' && 'Failed'}
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-1 uppercase font-semibold">
                              Method: {order.payment_method}
                            </span>
                          </td>

                          {/* Pathao */}
                          <td className="p-4 font-mono">
                            {order.pathao_consignment_id ? (
                              <div className="space-y-1">
                                <span className="bg-blue-50 border border-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold block w-fit">
                                  {order.pathao_consignment_id}
                                </span>
                                <span className="text-[10px] text-slate-400 block capitalize">
                                  COD Collect: ৳{codAmount.toLocaleString()}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Not booked</span>
                            )}
                          </td>

                          {/* Action dispatch */}
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {!order.pathao_consignment_id && (
                                <button
                                  onClick={() => openEditModal(order)}
                                  className="inline-flex items-center gap-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-[10px] px-2 py-1.5 shadow transition-colors"
                                >
                                  Edit
                                </button>
                              )}

                              <a
                                href={`/invoice/${order.id}?print=true`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-[10px] px-2 py-1.5 shadow transition-colors"
                              >
                                Invoice
                              </a>

                              {!order.pathao_consignment_id && 
                               (order.payment_status === 'FullyPaid' || order.payment_status === 'DeliveryChargePrePaid') ? (
                                <button
                                  onClick={() => handleDispatch(order.id)}
                                  disabled={actionLoading === order.id}
                                  className="inline-flex items-center gap-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[10px] px-2.5 py-1.5 shadow transition-colors disabled:bg-slate-400"
                                >
                                  {actionLoading === order.id ? (
                                    'Booking...'
                                  ) : (
                                    <>
                                      <Play className="h-3 w-3" />
                                      Dispatch
                                    </>
                                  )}
                                </button>
                              ) : order.pathao_consignment_id ? (
                                <span className="inline-flex items-center gap-1 text-emerald-600 text-[10px] font-bold">
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Booked
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-slate-400 text-[10px] whitespace-nowrap">
                                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Awaiting Payment
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

          </div>

        </main>
      </div>

      {/* EDIT MODAL DIALOG */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-950 uppercase tracking-wide">
                Edit Order Destination details
              </h3>
              <button 
                onClick={() => setEditingOrder(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                Close
              </button>
            </div>
            
            <form onSubmit={handleSaveOrder} className="p-6 space-y-4">
              {/* Customer Name */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-500 uppercase">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-emerald-500"
                />
              </div>

              {/* Customer Phone */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-500 uppercase">Phone Number *</label>
                <input
                  type="text"
                  required
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full rounded border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-emerald-500"
                />
              </div>

              {/* City, Zone, Area Grid */}
              <div className="grid grid-cols-3 gap-3">
                {/* City */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase">City *</label>
                  <select
                    required
                    value={editCity}
                    onChange={(e) => {
                      setEditCity(e.target.value)
                      setEditZone('')
                      setEditArea('')
                    }}
                    className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-emerald-500"
                  >
                    <option value="">Select City</option>
                    {locationCities.map((city) => (
                      <option key={city.city_id} value={city.city_id}>
                        {city.city_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Zone */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase">Zone *</label>
                  <select
                    required
                    disabled={!editCity}
                    value={editZone}
                    onChange={(e) => {
                      setEditZone(e.target.value)
                      setEditArea('')
                    }}
                    className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs outline-none disabled:bg-slate-50 disabled:text-slate-400 focus:border-emerald-500"
                  >
                    <option value="">Select Zone</option>
                    {locationZones.map((zone) => (
                      <option key={zone.zone_id} value={zone.zone_id}>
                        {zone.zone_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Area */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase">Area *</label>
                  <select
                    required
                    disabled={!editZone}
                    value={editArea}
                    onChange={(e) => setEditArea(e.target.value)}
                    className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs outline-none disabled:bg-slate-50 disabled:text-slate-400 focus:border-emerald-500"
                  >
                    <option value="">Select Area</option>
                    {locationAreas.map((area) => (
                      <option key={area.area_id} value={area.area_id}>
                        {area.area_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-500 uppercase">Street Address & House details *</label>
                <textarea
                  required
                  rows={2}
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full rounded border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-slate-400 block">Min 10 characters required for Pathao booking.</span>
              </div>

              {/* Delivery Charge Display */}
              <div className="bg-slate-50 rounded border border-slate-200 p-3 flex justify-between text-xs font-medium">
                <span className="text-slate-500">Recalculated Delivery Fee:</span>
                <span className="text-slate-950 font-bold">৳{editDeliveryCharge}</span>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="rounded border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveLoading || loadingLocations}
                  className="rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 disabled:bg-slate-400"
                >
                  {saveLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
