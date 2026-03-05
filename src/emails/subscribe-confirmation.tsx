import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Link,
  Hr,
  Preview,
} from '@react-email/components'

interface SubscribeConfirmationProps {
  confirmUrl: string
}

export function SubscribeConfirmation({ confirmUrl }: SubscribeConfirmationProps) {
  return (
    <Html>
      <Head />
      <Preview>Confirm your HiFinder subscription</Preview>
      <Body style={{ backgroundColor: '#f4f4f5', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
          <Section style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '24px' }}>
            <Text style={{ fontSize: '20px', fontWeight: 'bold', color: '#18181b', margin: '0 0 4px' }}>
              Confirm your email
            </Text>
            <Text style={{ fontSize: '14px', color: '#71717a', margin: '0 0 24px' }}>
              Thanks for subscribing! Click below to confirm your email and start
              receiving gear picks from HiFinder.
            </Text>
            <Link
              href={confirmUrl}
              style={{
                display: 'inline-block',
                backgroundColor: '#6366f1',
                color: '#ffffff',
                padding: '10px 20px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                textDecoration: 'none',
              }}
            >
              Confirm Subscription
            </Link>
          </Section>

          <Section style={{ padding: '16px 0', textAlign: 'center' as const }}>
            <Hr style={{ borderColor: '#e4e4e7', margin: '0 0 16px' }} />
            <Text style={{ fontSize: '12px', color: '#a1a1aa', margin: '0 0 4px' }}>
              You received this because you signed up on{' '}
              <Link href="https://hifinder.app" style={{ color: '#a1a1aa' }}>
                HiFinder
              </Link>
              .
            </Text>
            <Text style={{ fontSize: '12px', color: '#a1a1aa', margin: '0' }}>
              If you didn&apos;t sign up, you can safely ignore this email.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
