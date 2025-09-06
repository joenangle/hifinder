'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Component } from '@/types'

interface MissingHeadphoneHandlerProps {
  brand: string
  model: string
  onHeadphoneAdded?: (headphone: Component) => void
  onCancel?: () => void
}

export default function MissingHeadphoneHandler({
  brand,
  model,
  onHeadphoneAdded: _onHeadphoneAdded, // Prefixed to indicate intentionally unused
  onCancel
}: MissingHeadphoneHandlerProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [additionalInfo, setAdditionalInfo] = useState('')

  const handleSubmitRequest = async () => {
    if (!userEmail.trim()) {
      alert('Please provide an email for follow-up')
      return
    }

    setIsSubmitting(true)
    
    try {
      // Store the missing headphone request
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { error } = await supabase
        .from('missing_headphone_requests')
        .insert([{
          brand: brand,
          model: model,
          requested_by_email: userEmail,
          additional_info: additionalInfo,
          status: 'pending',
          created_at: new Date().toISOString()
        }])

      if (error) {
        console.error('Error submitting request:', error)
        alert('Failed to submit request. Please try again.')
        return
      }

      alert('Thank you! We\'ll research and add this headphone to our database. You\'ll receive an email when it\'s available.')
      onCancel?.()
      
    } catch (err) {
      console.error('Submission error:', err)
      alert('Failed to submit request. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-surface-elevated border border-border rounded-lg p-6 space-y-4">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 bg-accent-subtle rounded-full flex items-center justify-center mx-auto">
          <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-foreground">Headphone Not Found</h3>
        <p className="text-muted">
          We don&apos;t have <span className="font-medium">{brand} {model}</span> in our database yet.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
            Email for updates
          </label>
          <input
            id="email"
            type="email"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            required
          />
        </div>

        <div>
          <label htmlFor="info" className="block text-sm font-medium text-foreground mb-2">
            Additional information (optional)
          </label>
          <textarea
            id="info"
            value={additionalInfo}
            onChange={(e) => setAdditionalInfo(e.target.value)}
            placeholder="Any additional details about this headphone (where you heard about it, specific variant, etc.)"
            rows={3}
            className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
          />
        </div>

        <div className="bg-accent-subtle border border-accent rounded-md p-3">
          <div className="flex items-start space-x-2">
            <svg className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-accent">
              <p className="font-medium">What happens next?</p>
              <ul className="mt-1 space-y-1 text-accent">
                <li>• We&apos;ll research this headphone&apos;s specifications and pricing</li>
                <li>• Add it to our database with accurate information</li>
                <li>• Email you when it&apos;s available in recommendations</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 text-muted hover:text-foreground border border-border rounded-md transition-colors"
          disabled={isSubmitting}
        >
          Skip for now
        </button>
        <button
          onClick={handleSubmitRequest}
          disabled={isSubmitting}
          className="flex-1 bg-accent hover:bg-accent-hover text-accent-foreground px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Submitting...' : 'Request Addition'}
        </button>
      </div>
    </div>
  )
}