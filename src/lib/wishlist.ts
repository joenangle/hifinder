import { supabase } from './supabase'
import { WishlistItem } from '@/types/auth'

export async function addToWishlist(userId: string, componentId: string): Promise<WishlistItem | null> {
  const { data, error } = await supabase
    .from('wishlists')
    .insert({
      user_id: userId,
      component_id: componentId
    })
    .select(`
      *,
      components (
        id,
        name,
        brand,
        category,
        type,
        price_new,
        price_used_min,
        price_used_max,
        image_url
      )
    `)
    .single()

  if (error) {
    console.error('Error adding to wishlist:', error)
    return null
  }

  return data as WishlistItem
}

export async function removeFromWishlist(userId: string, componentId: string): Promise<boolean> {
  const { error } = await supabase
    .from('wishlists')
    .delete()
    .eq('user_id', userId)
    .eq('component_id', componentId)

  if (error) {
    console.error('Error removing from wishlist:', error)
    return false
  }

  return true
}

export async function getUserWishlist(userId: string): Promise<WishlistItem[]> {
  const { data, error } = await supabase
    .from('wishlists')
    .select(`
      *,
      components (
        id,
        name,
        brand,
        category,
        type,
        price_new,
        price_used_min,
        price_used_max,
        image_url
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching wishlist:', error)
    return []
  }

  return data as WishlistItem[]
}

export async function isInWishlist(userId: string, componentId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('wishlists')
    .select('id')
    .eq('user_id', userId)
    .eq('component_id', componentId)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error checking wishlist:', error)
    return false
  }

  return !!data
}