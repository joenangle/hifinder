'use client'

import { Star } from 'lucide-react'
import { useState } from 'react'

interface StarRatingProps {
  rating: number
  onRate?: (rating: number) => void
  size?: 'sm' | 'md'
  interactive?: boolean
}

export function StarRating({ rating, onRate, size = 'md', interactive = false }: StarRatingProps) {
  const [hovered, setHovered] = useState(0)
  const starSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'

  return (
    <div className="flex gap-0.5" onMouseLeave={() => setHovered(0)}>
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => onRate?.(star)}
          onMouseEnter={() => interactive && setHovered(star)}
          className={interactive ? 'cursor-pointer' : 'cursor-default'}
        >
          <Star
            className={`${starSize} transition-colors ${
              star <= (hovered || rating)
                ? 'fill-amber-400 text-amber-400'
                : 'text-gray-300 dark:text-gray-600'
            }`}
          />
        </button>
      ))}
    </div>
  )
}
