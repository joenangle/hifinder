'use client'

import { Headphones, Cpu, Speaker, Cable } from 'lucide-react'

type CategoryFilter = 'all' | 'headphones' | 'iems' | 'dacs' | 'amps' | 'combo'

interface GearFiltersProps {
  selectedCategory: CategoryFilter
  onCategoryChange: (category: CategoryFilter) => void
  categoryCounts: Record<CategoryFilter, number>
}

export function GearFilters({ selectedCategory, onCategoryChange, categoryCounts }: GearFiltersProps) {
  const categories = [
    { id: 'all' as const, label: 'All Gear', icon: null },
    { id: 'headphones' as const, label: 'Headphones', icon: Headphones },
    { id: 'iems' as const, label: 'IEMs', icon: Headphones },
    { id: 'dacs' as const, label: 'DACs', icon: Cpu },
    { id: 'amps' as const, label: 'Amplifiers', icon: Speaker },
    { id: 'combo' as const, label: 'Combos', icon: Speaker }
  ]

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => {
        const IconComponent = category.icon
        const count = categoryCounts[category.id] || 0
        
        return (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors
              ${selectedCategory === category.id
                ? 'bg-accent text-white'
                : 'bg-secondary/10 text-secondary hover:bg-secondary/20'
              }
            `}
            style={{
              backgroundColor: selectedCategory === category.id ? 'var(--accent-primary)' : 'var(--surface-hover)',
              color: selectedCategory === category.id ? 'white' : 'var(--text-secondary)'
            }}
          >
            {IconComponent && <IconComponent className="w-3.5 h-3.5" />}
            <span>{category.label}</span>
            {(category.id === 'all' ? categoryCounts.all : count) > 0 && (
              <span className="ml-1 opacity-70">
                {category.id === 'all' ? categoryCounts.all : count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}