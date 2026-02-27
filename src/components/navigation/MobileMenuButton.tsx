'use client'

import { forwardRef } from 'react'
import { Menu, X } from 'lucide-react'

interface MobileMenuButtonProps {
  isOpen: boolean
  onClick: () => void
}

export const MobileMenuButton = forwardRef<HTMLButtonElement, MobileMenuButtonProps>(
  function MobileMenuButton({ isOpen, onClick }, ref) {
  return (
    <button
      ref={ref}
      onClick={onClick}
      className="lg:hidden p-2 min-w-[44px] min-h-[44px] rounded-lg bg-surface-hover hover:bg-surface-elevated transition-colors flex items-center justify-center"
      aria-label={isOpen ? 'Close menu' : 'Open menu'}
      aria-expanded={isOpen}
    >
      <div className="relative w-5 h-5">
        <Menu 
          className={`absolute inset-0 w-5 h-5 text-primary transition-[opacity,transform] duration-300 ${
            isOpen ? 'rotate-90 opacity-0' : 'rotate-0 opacity-100'
          }`} 
        />
        <X 
          className={`absolute inset-0 w-5 h-5 text-primary transition-[opacity,transform] duration-300 ${
            isOpen ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0'
          }`} 
        />
      </div>
    </button>
  )
})