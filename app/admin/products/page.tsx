import { createAdminClient } from '@/utils/supabase/server'
import AdminProductsClient from '@/components/AdminProductsClient'

export const revalidate = 0 // Disable cache for live inventory lists

export default async function AdminProductsPage() {
  const supabase = createAdminClient()

  // Fetch products
  const { data: products } = await supabase
    .from('products')
    .select('*, categories(name)')
    .order('created_at', { ascending: false })

  // Fetch categories for product creation select dropdown
  let { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('name')

  // Automatically seed Featured Products category if missing
  const hasFeatured = categories?.some((c) => c.slug === 'featured')
  if (!hasFeatured && categories) {
    const { data: newCat } = await supabase
      .from('categories')
      .insert({
        id: 'c0000000-0000-0000-0000-000000000008',
        name: 'Featured Products',
        slug: 'featured',
        description: 'Special selection of featured products.'
      })
      .select()
      .single()

    if (newCat) {
      categories = [...categories, newCat].sort((a, b) => a.name.localeCompare(b.name))
    }
  }

  return (
    <AdminProductsClient 
      initialProducts={products || []} 
      initialCategories={categories || []} 
    />
  )
}
