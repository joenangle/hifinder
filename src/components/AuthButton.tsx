'use client'

import { useSession, signIn } from 'next-auth/react'
import { User } from 'lucide-react'

export function AuthButton() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div className="w-8 h-8 rounded-full bg-surface-hover animate-pulse" />
    )
  }

  if (session) {
    return null // User menu handles authenticated state
  }

  return (
    <button
      onClick={() => signIn()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        padding: '6px 10px',
        backgroundColor: '#E85A4F',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        fontWeight: '500',
        fontSize: '13px',
        lineHeight: '1',
        cursor: 'pointer',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        transition: 'all 0.2s ease',
        zIndex: '9999',
        position: 'relative',
        width: 'auto',
        height: '32px',
        whiteSpace: 'nowrap',
        flexShrink: '0',
        textDecoration: 'none',
        overflow: 'hidden'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#D84315'
        e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.15)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#E85A4F'
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
      }}
    >
      <User style={{ width: '16px', height: '16px', color: 'white' }} />
      <span style={{ color: 'white', fontWeight: '500' }}>Sign In</span>
    </button>
  )
}