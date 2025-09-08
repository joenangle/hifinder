'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { MoreVertical } from 'lucide-react'

interface OverflowMenuItem {
  id: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
  onClick: () => void
  disabled?: boolean
}

interface OverflowMenuProps {
  items: OverflowMenuItem[]
  className?: string
}

export function OverflowMenu({ items, className = '' }: OverflowMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const handleItemClick = (item: OverflowMenuItem) => {
    item.onClick()
    setIsOpen(false)
  }

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-md bg-secondary hover:bg-tertiary text-secondary hover:text-primary transition-colors ${className}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="More options"
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {mounted && isOpen && createPortal(
        <div
          ref={menuRef}
          className="fixed w-48 bg-surface-elevated bg-opacity-95 backdrop-blur-lg border border-border-default rounded-lg shadow-lg z-50"
          style={{ 
            top: buttonRef.current ? buttonRef.current.getBoundingClientRect().bottom + window.scrollY + 8 : 0,
            right: buttonRef.current ? window.innerWidth - buttonRef.current.getBoundingClientRect().right : 0
          }}
        >
          <div className="p-2">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                disabled={item.disabled}
                className={`w-full text-left px-3 py-2 text-sm rounded transition-colors flex items-center gap-3 ${
                  item.disabled
                    ? 'text-text-tertiary cursor-not-allowed'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                }`}
              >
                {item.icon && <item.icon className="w-4 h-4 flex-shrink-0" />}
                {item.label}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}