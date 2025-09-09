'use client'

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface GearStats {
  totalItems: number
  totalInvested: number
  currentValue: number
  depreciation: number
}

interface GearPageHeaderProps {
  stats: GearStats
}

export function GearPageHeader({ stats }: GearPageHeaderProps) {
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
      <div className="max-w-7xl mx-auto" style={{paddingLeft: '24px', paddingRight: '24px'}}>
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
          <div className="flex lg:hidden items-center text-sm" style={{color: 'var(--text-secondary)'}}>
            <span>{stats.totalItems} items • {formatCurrency(stats.currentValue)}</span>
          </div>
          
        </div>
      </div>
    </div>
  )
}