'use client'

import { Headphones, Cpu, Speaker, Download, Grid3X3, List, Layers } from 'lucide-react'
import { OverflowMenu } from '@/components/ui/OverflowMenu'

type CategoryFilter = 'all' | 'headphones' | 'iems' | 'dacs' | 'amps' | 'combo'
type ViewMode = 'grid' | 'list' | 'stacks'

interface GearFiltersProps {
  selectedCategory: CategoryFilter
  onCategoryChange: (category: CategoryFilter) => void
  categoryCounts: Record<CategoryFilter, number>
  // Actions
  onAddGear?: () => void
  onExport?: () => void
  viewMode?: ViewMode
  onViewModeChange?: (mode: ViewMode) => void
}

export function GearFilters({ 
  selectedCategory, 
  onCategoryChange, 
  categoryCounts, 
  onAddGear, 
  onExport, 
  viewMode, 
  onViewModeChange 
}: GearFiltersProps) {
  const filterCategories = [
    { id: 'headphones' as const, label: 'Headphones', icon: Headphones },
    { id: 'iems' as const, label: 'IEMs', icon: Headphones },
    { id: 'dacs' as const, label: 'DACs', icon: Cpu },
    { id: 'amps' as const, label: 'Amplifiers', icon: Speaker },
    { id: 'combo' as const, label: 'Combos', icon: Speaker }
  ]

  return (
    <div className="flex items-center justify-between px-4 sm:px-0">
        {/* Left: Filter Pills including All Gear */}
        <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 flex-1 min-h-[2.5rem]">
          {/* All Gear Pill */}
          <button
            onClick={() => onCategoryChange('all')}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors
              ${selectedCategory === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }
            `}
          >
            <span>All Gear</span>
            {categoryCounts.all > 0 && (
              <span className="ml-1 opacity-70">
                {categoryCounts.all}
              </span>
            )}
          </button>
          
          {filterCategories.map((category) => {
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
                {count > 0 && (
                  <span className="ml-1 opacity-70">
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Right: Action Pills */}
        <div className="flex items-center gap-2 flex-shrink-0 min-h-[2.5rem]">
          {/* Add New Pill */}
          {onAddGear && (
            <button
              onClick={onAddGear}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors bg-green-600 text-white hover:bg-green-700"
            >
              <span>+ Add to Collection</span>
            </button>
          )}

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-2">
            {onExport && (
              <button
                onClick={onExport}
                className="px-3 py-1.5 rounded-md bg-surface-secondary hover:bg-surface-hover text-secondary hover:text-primary transition-colors"
                title="Export Collection"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
            {viewMode && onViewModeChange && (
              <div className="flex items-center gap-2">
                {/* View Mode Selector with Labels */}
                <div className="flex rounded-lg overflow-hidden border border-border">
                  <button
                    onClick={() => onViewModeChange('grid')}
                    className={`px-3 py-1.5 transition-colors flex items-center gap-1.5 text-sm font-medium ${
                      viewMode === 'grid'
                        ? 'bg-blue-600 text-white'
                        : 'bg-surface-card text-secondary hover:bg-surface-hover'
                    }`}
                    title="Grid View"
                  >
                    <Grid3X3 className="w-4 h-4" />
                    <span className="hidden lg:inline">Grid</span>
                  </button>
                  <button
                    onClick={() => onViewModeChange('list')}
                    className={`px-3 py-1.5 transition-colors flex items-center gap-1.5 text-sm font-medium border-x border-border ${
                      viewMode === 'list'
                        ? 'bg-blue-600 text-white'
                        : 'bg-surface-card text-secondary hover:bg-surface-hover'
                    }`}
                    title="List View"
                  >
                    <List className="w-4 h-4" />
                    <span className="hidden lg:inline">List</span>
                  </button>
                  <button
                    onClick={() => onViewModeChange('stacks')}
                    className={`px-3 py-1.5 transition-colors flex items-center gap-1.5 text-sm font-medium ${
                      viewMode === 'stacks'
                        ? 'bg-orange-600 text-white'
                        : 'bg-surface-card text-secondary hover:bg-surface-hover'
                    }`}
                    title="Stack Builder - Organize your gear into purposeful setups"
                  >
                    <Layers className="w-4 h-4" />
                    <span className="hidden lg:inline font-semibold">Stacks</span>
                    <span className="hidden xl:inline text-xs ml-1 px-1.5 py-0.5 bg-orange-500/20 text-orange-300 rounded">NEW</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Mobile Overflow Menu */}
          <div className="md:hidden">
            <OverflowMenu
              items={[
                ...(onExport ? [{
                  id: 'export',
                  label: 'Export Collection',
                  icon: Download,
                  onClick: onExport
                }] : []),
                ...(viewMode && onViewModeChange ? [
                  {
                    id: 'grid-view',
                    label: 'Grid View',
                    icon: Grid3X3,
                    onClick: () => onViewModeChange('grid')
                  },
                  {
                    id: 'list-view',
                    label: 'List View',
                    icon: List,
                    onClick: () => onViewModeChange('list')
                  },
                  {
                    id: 'stacks-view',
                    label: 'Stacks View',
                    icon: Layers,
                    onClick: () => onViewModeChange('stacks')
                  }
                ] : [])
              ]}
            />
          </div>
        </div>
    </div>
  )
}