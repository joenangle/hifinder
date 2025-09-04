'use client'

import { useState, useEffect } from 'react'

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light')
    
    setTheme(initialTheme)
    updateTheme(initialTheme)
  }, [])

  const updateTheme = (newTheme: 'light' | 'dark') => {
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('theme', newTheme)
  }

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    updateTheme(newTheme)
  }

  return (
    <button 
      onClick={toggleTheme}
      className="button button-ghost button-sm"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      aria-checked={theme === 'dark'}
      role="switch"
      title={`Current theme: ${theme}. Click to switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <span aria-hidden="true">
        {theme === 'light' ? '🌙' : '☀️'}
      </span>
      <span className="sr-only">
        {theme === 'light' ? 'Dark' : 'Light'} mode
      </span>
    </button>
  )
}