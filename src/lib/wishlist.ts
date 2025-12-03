import { WishlistItem } from '@/types/auth'

export async function addToWishlist(userId: string, componentId: string): Promise<WishlistItem | null> {
  try {
    const response = await fetch('/api/wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ componentId })
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Error adding to wishlist:', error)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Error adding to wishlist:', error)
    return null
  }
}

export async function removeFromWishlist(userId: string, componentId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/wishlist?componentId=${componentId}`, {
      method: 'DELETE'
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Error removing from wishlist:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error removing from wishlist:', error)
    return false
  }
}

export async function getUserWishlist(userId: string): Promise<WishlistItem[]> {
  try {
    const response = await fetch('/api/wishlist')

    if (!response.ok) {
      const error = await response.json()
      console.error('Error fetching wishlist:', error)
      return []
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching wishlist:', error)
    return []
  }
}

export async function isInWishlist(userId: string, componentId: string): Promise<boolean> {
  try {
    const wishlist = await getUserWishlist(userId)
    return wishlist.some(item => item.component_id === componentId)
  } catch (error) {
    console.error('Error checking wishlist:', error)
    return false
  }
}
