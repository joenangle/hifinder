'use client'

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
    <div className="border-b border-subtle bg-primary">
      <div className="max-w-[1100px] mx-auto px-6">
        <div className="flex items-center justify-between h-14">
          {/* Left: Eyebrow + Title */}
          <div className="flex items-center gap-4">
            <p className="text-xs font-medium tracking-widest uppercase text-accent m-0">
              My Gear
            </p>
          </div>

          {/* Desktop: Pipe-divided stats */}
          <div className="hidden lg:flex items-center text-[0.8125rem]">
            {[
              { label: 'Items', value: `${stats.totalItems}` },
              { label: 'Value', value: formatCurrency(stats.currentValue) },
              { label: 'Invested', value: formatCurrency(stats.totalInvested) },
              {
                label: 'Depreciation',
                value: `${stats.depreciation >= 0 ? '+' : ''}${formatCurrency(Math.abs(stats.depreciation))}`,
                color: stats.depreciation >= 0 ? 'var(--error)' : 'var(--success)',
              },
            ].map((stat, i) => (
              <span key={stat.label} className="flex items-center">
                {i > 0 && (
                  <span className="text-tertiary mx-3 opacity-40">
                    |
                  </span>
                )}
                <span className="text-secondary">{stat.label}</span>
                <span
                  className="font-semibold tracking-tight ml-1"
                  style={stat.color ? { color: stat.color } : undefined}
                >
                  {stat.value}
                </span>
              </span>
            ))}
          </div>

          {/* Mobile: Compressed stats */}
          <div className="flex lg:hidden items-center text-[0.8125rem] text-secondary">
            <span>{stats.totalItems} items</span>
            <span className="mx-1.5 opacity-40">|</span>
            <span className="font-semibold text-primary tracking-tight">
              {formatCurrency(stats.currentValue)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
