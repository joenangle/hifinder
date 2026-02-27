'use client'

import { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  children?: ReactNode
  className?: string
  sticky?: boolean
}

export function PageHeader({ 
  title, 
  children, 
  className = '', 
  sticky = true 
}: PageHeaderProps) {
  const stickyClasses = sticky ? 'sticky top-16 z-10' : ''
  
  return (
    <div className={`bg-primary border-b ${stickyClasses}`}>
      <div className={`max-w-7xl mx-auto px-6 md:px-8 lg:px-12 ${className}`}>
        <div className="h-14 flex items-center justify-between">
          <h1 className="text-xl font-semibold" style={{color: 'var(--text-primary)'}}>
            {title}
          </h1>
          {children && (
            <div className="flex items-center">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}