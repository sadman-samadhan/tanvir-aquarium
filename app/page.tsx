import { createAdminClient } from '@/utils/supabase/server'
import HomePageClient from '@/components/HomePageClient'

export const revalidate = 0 // Disable cache to get live inventory status

export default async function HomePage() {
  const supabase = createAdminClient()

  // Fetch Categories
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

  // Fetch Products
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <HomePageClient 
      initialProducts={products || []} 
      initialCategories={categories || []} 
    />
  )
}
