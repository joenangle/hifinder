'use client'

import { useSession } from 'next-auth/react'
import { Heart } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { addToWishlist, removeFromWishlist, isInWishlist } from '@/lib/wishlist'

interface WishlistButtonProps {
  componentId: string
  className?: string
  showText?: boolean
}

export function WishlistButton({ componentId, className = '', showText = false }: WishlistButtonProps) {
  const { data: session } = useSession()
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [loading, setLoading] = useState(false)

  const checkWishlistStatus = useCallback(async () => {
    if (!session?.user?.id) return
    
    const inWishlist = await isInWishlist(session.user.id, componentId)
    setIsWishlisted(inWishlist)
  }, [session?.user?.id, componentId])

  useEffect(() => {
    if (session?.user?.id) {
      checkWishlistStatus()
    }
  }, [session?.user?.id, componentId, checkWishlistStatus])

  const handleToggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!session?.user?.id) {
      // TODO: Open login modal
      return
    }

    setLoading(true)
    
    if (isWishlisted) {
      const success = await removeFromWishlist(session.user.id, componentId)
      if (success) {
        setIsWishlisted(false)
      }
    } else {
      const result = await addToWishlist(session.user.id, componentId)
      if (result) {
        setIsWishlisted(true)
      }
    }
    
    setLoading(false)
  }

  if (!session) {
    return (
      <button
        onClick={handleToggleWishlist}
        className={`flex items-center gap-2 px-3 py-2 border border-border hover:border-accent rounded-md transition-colors ${className}`}
        title="Sign in to save to wishlist"
      >
        <Heart className="w-4 h-4" aria-hidden="true" />
        {showText && <span>Save</span>}
      </button>
    )
  }

  return (
    <button
      onClick={handleToggleWishlist}
      disabled={loading}
      className={`flex items-center gap-2 px-3 py-2 border rounded-md transition-colors ${
        isWishlisted
          ? 'border-accent bg-accent-subtle text-accent hover:bg-orange-100'
          : 'border-border hover:border-accent'
      } ${loading ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      title={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
      aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
    >
      <Heart className={`w-4 h-4 transition-[color,transform] duration-200 ${isWishlisted ? 'fill-current scale-110' : ''}`} aria-hidden="true" />
      {showText && (
        <span>{isWishlisted ? 'Saved' : 'Save'}</span>
      )}
    </button>
  )
}