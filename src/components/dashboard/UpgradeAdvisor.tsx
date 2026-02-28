'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, ChevronRight, Zap, Cpu, ArrowUpRight } from 'lucide-react'

interface GearSuggestion {
  type: 'missing_amp' | 'missing_dac' | 'tier_upgrade' | 'bottleneck'
  priority: 'high' | 'medium' | 'low'
  message: string
  currentItem?: { brand: string; name: string; price: number | null; category: string }
  suggestedItems?: { id: number; brand: string; name: string; category: string; price_new: number | null; price_used_min: number | null; price_used_max: number | null }[]
}

const typeIcons: Record<string, React.ReactNode> = {
  missing_amp: <Zap className="w-5 h-5 text-amber-500" />,
  missing_dac: <Cpu className="w-5 h-5 text-blue-500" />,
  tier_upgrade: <ArrowUpRight className="w-5 h-5 text-green-500" />,
  bottleneck: <TrendingUp className="w-5 h-5 text-orange-500" />,
}

export function UpgradeAdvisor() {
  const [suggestions, setSuggestions] = useState<GearSuggestion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/user/upgrade-suggestions')
      .then(res => res.json())
      .then(data => setSuggestions(data.suggestions || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading || suggestions.length === 0) return null

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-accent" />
        <h3 className="text-lg font-semibold text-foreground">Upgrade Suggestions</h3>
      </div>
      <div className="space-y-3">
        {suggestions.map((suggestion, i) => (
          <div key={i} className="p-4 border border-border rounded-lg">
            <div className="flex items-start gap-3">
              {typeIcons[suggestion.type]}
              <div className="flex-1">
                <p className="text-foreground font-medium">{suggestion.message}</p>
                {suggestion.suggestedItems && suggestion.suggestedItems.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {suggestion.suggestedItems.map(item => (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <span className="text-foreground">
                          {item.brand} {item.name}
                        </span>
                        <span className="text-muted">
                          {item.price_used_min && item.price_used_max
                            ? `$${item.price_used_min}–$${item.price_used_max} used`
                            : item.price_new ? `$${item.price_new} new` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-muted flex-shrink-0 mt-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
