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

interface AlertMatch {
  listing_title: string
  listing_price: number
  listing_condition: string
  listing_source: string
  listing_url: string
  triggered_at: string
}

interface AlertEmailProps {
  matches: AlertMatch[]
  alertName: string
  unsubscribeUrl: string
}

export function AlertEmail({ matches, alertName, unsubscribeUrl }: AlertEmailProps) {
  const isDigest = matches.length > 1
  const subject = isDigest
    ? `${matches.length} new matches for "${alertName}"`
    : `Price alert: ${matches[0].listing_title}`

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price)

  return (
    <Html>
      <Head />
      <Preview>{subject}</Preview>
      <Body style={{ backgroundColor: '#f4f4f5', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
          <Section style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '24px' }}>
            <Text style={{ fontSize: '20px', fontWeight: 'bold', color: '#18181b', margin: '0 0 4px' }}>
              {isDigest ? `${matches.length} New Matches` : 'New Match Found'}
            </Text>
            <Text style={{ fontSize: '14px', color: '#71717a', margin: '0 0 24px' }}>
              Alert: {alertName}
            </Text>

            {matches.map((match, i) => (
              <Section key={i}>
                {i > 0 && <Hr style={{ borderColor: '#e4e4e7', margin: '16px 0' }} />}
                <Text style={{ fontSize: '16px', fontWeight: '600', color: '#18181b', margin: '0 0 4px' }}>
                  {match.listing_title}
                </Text>
                <Text style={{ fontSize: '14px', color: '#71717a', margin: '0 0 12px' }}>
                  {formatPrice(match.listing_price)} · {match.listing_condition} · {match.listing_source}
                </Text>
                <Link
                  href={match.listing_url}
                  style={{
                    display: 'inline-block',
                    backgroundColor: '#18181b',
                    color: '#ffffff',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    textDecoration: 'none',
                  }}
                >
                  View Listing
                </Link>
              </Section>
            ))}
          </Section>

          <Section style={{ padding: '16px 0', textAlign: 'center' as const }}>
            <Text style={{ fontSize: '12px', color: '#a1a1aa', margin: '0' }}>
              You received this because you have email alerts enabled on{' '}
              <Link href="https://hifinder.app/dashboard" style={{ color: '#a1a1aa' }}>
                HiFinder
              </Link>
              .
            </Text>
            <Link
              href={unsubscribeUrl}
              style={{ fontSize: '12px', color: '#a1a1aa' }}
            >
              Unsubscribe from this alert
            </Link>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
