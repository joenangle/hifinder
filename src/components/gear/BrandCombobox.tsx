'use client'

import { useState, useEffect } from 'react'

// Helper function for string similarity
function findSimilarStrings(target: string, strings: string[], threshold: number): string[] {
  const targetLower = target.toLowerCase()
  return strings.filter(str => {
    const strLower = str.toLowerCase()
    // Simple similarity check - contains or length similarity
    if (strLower.includes(targetLower) || targetLower.includes(strLower)) {
      return true
    }
    // Basic character overlap
    const overlap = [...targetLower].filter(char => strLower.includes(char)).length
    return overlap / targetLower.length >= threshold
  })
}

interface BrandComboboxProps {
  value: string
  onChange: (value: string) => void
  availableBrands: string[]
  placeholder?: string
  className?: string
  style?: React.CSSProperties
}

export function BrandCombobox({ value, onChange, availableBrands, placeholder, className, style }: BrandComboboxProps) {
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [filteredBrands, setFilteredBrands] = useState<string[]>([])
  const [similarBrands, setSimilarBrands] = useState<string[]>([])

  useEffect(() => {
    if (value.length > 0) {
      // Filter brands that contain the typed text
      const filtered = availableBrands.filter(brand =>
        brand.toLowerCase().includes(value.toLowerCase())
      )
      setFilteredBrands(filtered)

      // Find similar brands for typo detection
      const similar = findSimilarStrings(value, availableBrands, 0.6)
      setSimilarBrands(similar)
    } else {
      setFilteredBrands(availableBrands.slice(0, 10)) // Show first 10 brands
      setSimilarBrands([])
    }
  }, [value, availableBrands])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    setShowSuggestions(true)
  }

  const handleBrandSelect = (brand: string) => {
    onChange(brand)
    setShowSuggestions(false)
  }

  const handleInputFocus = () => {
    setShowSuggestions(true)
  }

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow clicking on them
    setTimeout(() => setShowSuggestions(false), 150)
  }

  return (
    <div className={`relative ${showSuggestions && (filteredBrands.length > 0 || similarBrands.length > 0) ? 'mb-16' : ''}`}>
      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        className={className}
        style={style}
        placeholder={placeholder}
      />

      {/* Suggestions Dropdown */}
      {showSuggestions && (filteredBrands.length > 0 || similarBrands.length > 0) && (
        <div
          className="absolute z-[60] w-full mt-1 rounded-md border shadow-lg max-h-60 overflow-y-auto"
          style={{
            backgroundColor: 'var(--background-secondary)',
            borderColor: 'var(--border-default)',
            top: '100%',
            left: 0,
            right: 0
          }}
        >
          {/* Exact/partial matches */}
          {filteredBrands.length > 0 && (
            <div>
              {filteredBrands.slice(0, 8).map((brand) => (
                <div
                  key={brand}
                  className="px-3 py-2 cursor-pointer hover:bg-tertiary transition-colors text-sm"
                  style={{color: 'var(--text-primary)'}}
                  onMouseDown={(e) => e.preventDefault()} // Prevent input blur
                  onClick={() => handleBrandSelect(brand)}
                >
                  {brand}
                </div>
              ))}
            </div>
          )}

          {/* Similar brands warning */}
          {similarBrands.length > 0 && !filteredBrands.some(b => b.toLowerCase() === value.toLowerCase()) && (
            <div className="border-t" style={{borderColor: 'var(--border-default)'}}>
              <div className="px-3 py-2 text-xs font-medium" style={{color: 'var(--text-secondary)'}}>
                Did you mean?
              </div>
              {similarBrands.slice(0, 3).map((brand) => (
                <div
                  key={brand}
                  className="px-3 py-2 cursor-pointer hover:bg-tertiary transition-colors text-sm"
                  style={{color: 'var(--warning)'}}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleBrandSelect(brand)}
                >
                  {brand}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}