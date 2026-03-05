import { SignInButton } from '@/components/auth/SignInButton'

export const metadata = {
  title: 'Sign In — HiFinder',
  description: 'Sign in to HiFinder to save your gear collection and get personalized recommendations.',
}

const features = [
  'Save your gear collection',
  'Build and compare audio stacks',
  'Track used market prices',
  'Get price drop alerts',
]

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>
}) {
  const { callbackUrl } = await searchParams

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--background-primary)',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          backgroundColor: 'var(--background-secondary)',
          borderRadius: '16px',
          border: '1px solid var(--border-subtle)',
          padding: '40px 32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
        }}
      >
        {/* Branding */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: '40px',
              lineHeight: 1,
              marginBottom: '8px',
            }}
          >
            🎧
          </div>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '24px',
              fontWeight: 700,
              color: 'var(--accent-primary)',
            }}
          >
            HiFinder
          </span>
        </div>

        {/* Heading */}
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '20px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            margin: 0,
            textAlign: 'center',
          }}
        >
          Sign in to HiFinder
        </h1>

        {/* Value props */}
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {features.map((feature) => (
            <li
              key={feature}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '15px',
                color: 'var(--text-secondary)',
              }}
            >
              <span
                style={{
                  color: 'var(--accent-primary)',
                  fontWeight: 700,
                  fontSize: '16px',
                  flexShrink: 0,
                }}
              >
                ✓
              </span>
              {feature}
            </li>
          ))}
        </ul>

        {/* Sign-in button */}
        <div style={{ width: '100%', marginTop: '8px' }}>
          <SignInButton callbackUrl={callbackUrl} />
        </div>

        {/* Trust note */}
        <p
          style={{
            fontSize: '12px',
            color: 'var(--text-tertiary)',
            textAlign: 'center',
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          We only use Google for authentication. We never post on your behalf.
        </p>
      </div>
    </div>
  )
}
