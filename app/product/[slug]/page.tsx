import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import ProductDetailClient from '@/components/ProductDetailClient'

interface PageProps {
  params: Promise<{ slug: string }>
}

export const revalidate = 0 // Get live stock status

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()

  // Fetch product by slug
  const { data: product } = await supabase
    .from('products')
    .select('*, categories(name, slug)')
    .eq('slug', slug)
    .single()

  if (!product) {
    notFound()
  }

  // Fetch all categories
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug')
    .order('name')

  return <ProductDetailClient product={product} categories={categories || []} />
}
