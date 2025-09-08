'use client'

import { ArrowLeft, Plus, Download, Grid3X3, List, Layers } from 'lucide-react'
import Link from 'next/link'
import { OverflowMenu } from '@/components/ui/OverflowMenu'

interface GearStats {
  totalItems: number
  totalInvested: number
  currentValue: number
  depreciation: number
}

interface GearPageHeaderProps {
  stats: GearStats
  viewMode: 'grid' | 'list' | 'stacks'
  onAddGear: () => void
  onExport: () => void
  onViewModeChange: (mode: 'grid' | 'list' | 'stacks') => void
}

export function GearPageHeader({ 
  stats, 
  viewMode,
  onAddGear, 
  onExport, 
  onViewModeChange 
}: GearPageHeaderProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="bg-background-primary border-b border-border-default sticky top-16 z-10">
      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        <div className="h-14 flex items-center justify-between">
          {/* Left: Back Arrow + Title */}
          <div className="flex items-center gap-3">
            <Link href="/" className="text-secondary hover:text-primary transition-colors flex items-center justify-center">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-semibold" style={{color: 'var(--text-primary)'}}>
              My Gear
            </h1>
          </div>
          
          {/* Center: Inline Stats (Desktop) */}
          <div className="hidden lg:flex items-center gap-6">
            <div className="flex items-center gap-1 text-sm">
              <span className="text-secondary" style={{color: 'var(--text-secondary)'}}>Items:</span>
              <span className="font-semibold" style={{color: 'var(--text-primary)'}}>{stats.totalItems}</span>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <span className="text-secondary" style={{color: 'var(--text-secondary)'}}>Value:</span>
              <span className="font-semibold" style={{color: 'var(--text-primary)'}}>
                {formatCurrency(stats.currentValue)}
              </span>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <span className="text-secondary" style={{color: 'var(--text-secondary)'}}>Invested:</span>
              <span className="font-semibold" style={{color: 'var(--success)'}}>
                {formatCurrency(stats.totalInvested)}
              </span>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <span className="text-secondary" style={{color: 'var(--text-secondary)'}}>Depreciation:</span>
              <span className="font-semibold" style={{color: stats.depreciation >= 0 ? 'var(--error)' : 'var(--success)'}}>
                {stats.depreciation >= 0 ? '+' : ''}{formatCurrency(Math.abs(stats.depreciation))}
              </span>
            </div>
          </div>
          
          {/* Medium: Compressed Stats */}
          <div className="hidden md:flex lg:hidden items-center text-sm" style={{color: 'var(--text-secondary)'}}>
            <span>{stats.totalItems} items • {formatCurrency(stats.currentValue)}</span>
          </div>
          
          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={onExport}
                className="p-2 rounded-md bg-secondary hover:bg-tertiary text-secondary hover:text-primary transition-colors"
                title="Export Collection"
              >
                <Download className="w-4 h-4" />
              </button>
              <div className="flex rounded-md overflow-hidden bg-secondary">
                <button
                  onClick={() => onViewModeChange('grid')}
                  className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-accent text-white' : 'text-secondary hover:text-primary hover:bg-tertiary'}`}
                  title="Grid View"
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onViewModeChange('list')}
                  className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-accent text-white' : 'text-secondary hover:text-primary hover:bg-tertiary'}`}
                  title="List View"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onViewModeChange('stacks')}
                  className={`p-2 transition-colors ${viewMode === 'stacks' ? 'bg-accent text-white' : 'text-secondary hover:text-primary hover:bg-tertiary'}`}
                  title="Stacks View"
                >
                  <Layers className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Add Button */}
            <button
              onClick={onAddGear}
              className="flex items-center gap-2 px-3 py-1.5 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Gear</span>
            </button>
            
            {/* Mobile Overflow Menu */}
            <div className="md:hidden">
              <OverflowMenu
                items={[
                  {
                    id: 'export',
                    label: 'Export Collection',
                    icon: Download,
                    onClick: onExport
                  },
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
                ]}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}