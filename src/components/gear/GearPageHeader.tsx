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
    <div
      style={{
        borderBottom: '1px solid var(--border-subtle)',
        position: 'sticky',
        top: '64px',
        zIndex: 10,
        background: 'var(--background-primary)',
      }}
    >
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 var(--space-6)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '56px',
          }}
        >
          {/* Left: Eyebrow + Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <p
              style={{
                fontSize: '0.8rem',
                fontWeight: 500,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--accent-primary)',
                margin: 0,
              }}
            >
              My Gear
            </p>
          </div>

          {/* Desktop: Pipe-divided stats */}
          <div className="hidden lg:flex" style={{ alignItems: 'center', gap: 0, fontSize: '0.8125rem' }}>
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
              <span key={stat.label} style={{ display: 'flex', alignItems: 'center' }}>
                {i > 0 && (
                  <span
                    style={{
                      color: 'var(--text-tertiary)',
                      margin: '0 var(--space-3)',
                      opacity: 0.4,
                    }}
                  >
                    |
                  </span>
                )}
                <span style={{ color: 'var(--text-secondary)' }}>{stat.label}</span>
                <span
                  style={{
                    fontWeight: 600,
                    color: stat.color || 'var(--text-primary)',
                    letterSpacing: '-0.03em',
                    marginLeft: 'var(--space-1)',
                  }}
                >
                  {stat.value}
                </span>
              </span>
            ))}
          </div>

          {/* Mobile: Compressed stats */}
          <div
            className="flex lg:hidden"
            style={{ alignItems: 'center', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}
          >
            <span>{stats.totalItems} items</span>
            <span style={{ margin: '0 6px', opacity: 0.4 }}>|</span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
              {formatCurrency(stats.currentValue)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
