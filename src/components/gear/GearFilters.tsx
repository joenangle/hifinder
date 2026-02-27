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
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
            style={{
              backgroundColor: selectedCategory === 'all' ? 'var(--accent-primary)' : 'var(--surface-hover)',
              color: selectedCategory === 'all' ? 'white' : 'var(--text-secondary)',
            }}
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
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
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
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'white',
              }}
            >
              <span>+ Add to Collection</span>
            </button>
          )}

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-2">
            {onExport && (
              <button
                onClick={onExport}
                className="px-3 py-1.5 rounded-md transition-colors"
                style={{
                  backgroundColor: 'var(--surface-hover)',
                  color: 'var(--text-secondary)',
                }}
                title="Export Collection"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
            {viewMode && onViewModeChange && (
              <div className="flex items-center gap-2">
                {/* View Mode Selector with Labels */}
                <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
                  <button
                    onClick={() => onViewModeChange('grid')}
                    className="px-3 py-1.5 transition-colors flex items-center gap-1.5 text-sm font-medium"
                    style={{
                      backgroundColor: viewMode === 'grid' ? 'var(--accent-primary)' : 'var(--surface-card)',
                      color: viewMode === 'grid' ? 'white' : 'var(--text-secondary)',
                    }}
                    title="Grid View"
                  >
                    <Grid3X3 className="w-4 h-4" />
                    <span className="hidden lg:inline">Grid</span>
                  </button>
                  <button
                    onClick={() => onViewModeChange('list')}
                    className="px-3 py-1.5 transition-colors flex items-center gap-1.5 text-sm font-medium"
                    style={{
                      borderLeft: '1px solid var(--border-default)',
                      borderRight: '1px solid var(--border-default)',
                      backgroundColor: viewMode === 'list' ? 'var(--accent-primary)' : 'var(--surface-card)',
                      color: viewMode === 'list' ? 'white' : 'var(--text-secondary)',
                    }}
                    title="List View"
                  >
                    <List className="w-4 h-4" />
                    <span className="hidden lg:inline">List</span>
                  </button>
                  <button
                    onClick={() => onViewModeChange('stacks')}
                    className="px-3 py-1.5 transition-colors flex items-center gap-1.5 text-sm font-medium"
                    style={{
                      backgroundColor: viewMode === 'stacks' ? 'var(--accent-primary)' : 'var(--surface-card)',
                      color: viewMode === 'stacks' ? 'white' : 'var(--text-secondary)',
                    }}
                    title="Stack Builder - Organize your gear into purposeful setups"
                  >
                    <Layers className="w-4 h-4" />
                    <span className="hidden lg:inline font-semibold">Stacks</span>
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
