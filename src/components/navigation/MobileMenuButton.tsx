'use client'

import { Menu, X } from 'lucide-react'

interface MobileMenuButtonProps {
  isOpen: boolean
  onClick: () => void
}

export function MobileMenuButton({ isOpen, onClick }: MobileMenuButtonProps) {
  return (
    <button
      onClick={onClick}
      className="md:hidden p-2 rounded-lg bg-surface-hover hover:bg-surface-elevated transition-colors"
      aria-label={isOpen ? 'Close menu' : 'Open menu'}
      aria-expanded={isOpen}
    >
      <div className="relative w-5 h-5">
        <Menu 
          className={`absolute inset-0 w-5 h-5 text-text-primary transition-all duration-300 ${
            isOpen ? 'rotate-90 opacity-0' : 'rotate-0 opacity-100'
          }`} 
        />
        <X 
          className={`absolute inset-0 w-5 h-5 text-text-primary transition-all duration-300 ${
            isOpen ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0'
          }`} 
        />
      </div>
    </button>
  )
}