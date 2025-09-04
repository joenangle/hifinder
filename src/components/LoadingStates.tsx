'use client'

export function CardSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="skeleton h-6 w-3/4 mb-2"></div>
          
          <div className="flex flex-wrap gap-3 mb-3">
            <div className="skeleton h-4 w-16"></div>
            <div className="skeleton h-4 w-20"></div>
            <div className="skeleton h-4 w-12"></div>
            <div className="skeleton h-4 w-14"></div>
          </div>

          <div className="flex flex-wrap gap-3 mb-3">
            <div className="skeleton h-4 w-24"></div>
            <div className="skeleton h-4 w-32"></div>
          </div>
        </div>

        <div className="text-right ml-4">
          <div className="skeleton h-8 w-20 mb-2"></div>
          <div className="skeleton h-4 w-28 mb-2"></div>
          <div className="skeleton h-9 w-24"></div>
        </div>
      </div>
    </div>
  )
}

export function ButtonSkeleton({ size = 'default' }: { size?: 'sm' | 'default' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-8 w-20',
    default: 'h-10 w-24', 
    lg: 'h-12 w-32'
  }
  
  return (
    <div className={`skeleton ${sizeClasses[size]} rounded-lg animate-pulse`}></div>
  )
}

export function TextSkeleton({ 
  lines = 1, 
  className = '' 
}: { 
  lines?: number
  className?: string 
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }, (_, i) => (
        <div 
          key={i}
          className={`skeleton h-4 animate-pulse ${
            i === lines - 1 ? 'w-3/4' : 'w-full'
          }`}
        ></div>
      ))}
    </div>
  )
}

export function LoadingSpinner({ size = 'default' }: { size?: 'sm' | 'default' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    default: 'w-6 h-6',
    lg: 'w-8 h-8'
  }
  
  return (
    <div className={`${sizeClasses[size]} animate-spin`}>
      <div className={`${sizeClasses[size]} border-2 border-accent-subtle border-t-accent rounded-full`}></div>
    </div>
  )
}

export function PageLoading() {
  return (
    <div className="page-container">
      <div className="max-w-2xl w-full">
        <div className="text-center py-16">
          <LoadingSpinner size="lg" />
          <p className="text-secondary mt-4">Loading...</p>
        </div>
      </div>
    </div>
  )
}

export function ErrorState({ 
  title = "Something went wrong",
  message = "Please try again later",
  onRetry 
}: {
  title?: string
  message?: string
  onRetry?: () => void
}) {
  return (
    <div className="card p-8 text-center">
      <div className="text-4xl mb-4">⚠️</div>
      <h3 className="heading-3 mb-2 text-error">{title}</h3>
      <p className="text-secondary mb-6">{message}</p>
      {onRetry && (
        <button 
          onClick={onRetry}
          className="button button-primary"
        >
          Try Again
        </button>
      )}
    </div>
  )
}

export function EmptyState({
  icon = "🔍",
  title = "No results found",
  message = "Try adjusting your search criteria",
  action
}: {
  icon?: string
  title?: string  
  message?: string
  action?: React.ReactNode
}) {
  return (
    <div className="card p-12 text-center">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="heading-3 mb-2">{title}</h3>
      <p className="text-secondary mb-6">{message}</p>
      {action}
    </div>
  )
}