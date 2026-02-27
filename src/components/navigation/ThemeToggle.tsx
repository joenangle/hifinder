'use client'

import { useState, useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'

interface ThemeToggleProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function ThemeToggle({ className = '', size = 'md' }: ThemeToggleProps) {
  const [theme, setTheme] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  // Wait until mounted to avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
    const savedTheme = localStorage.getItem('theme')
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    setTheme(savedTheme || systemTheme)
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
  }

  if (!mounted) {
    return (
      <button 
        className={`p-2 rounded-lg bg-surface-hover hover:bg-surface-elevated transition-colors ${className}`}
        disabled
      >
        <div className={`${size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'} animate-pulse bg-text-tertiary rounded`} />
      </button>
    )
  }

  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 24 : 20

  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-lg bg-surface-hover hover:bg-surface-elevated transition-all duration-200 hover:scale-105 active:scale-95 ${className}`}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <Sun size={iconSize} className="text-primary" />
      ) : (
        <Moon size={iconSize} className="text-primary" />
      )}
    </button>
  )
}