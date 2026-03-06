import Link from 'next/link'

const productLinks = [
  { href: '/recommendations', label: 'Recommendations' },
  { href: '/marketplace', label: 'Used Market' },
  { href: '/price-history', label: 'Price History' },
  { href: '/learn', label: 'Learn' },
]

const companyLinks = [
  { href: '/about', label: 'About' },
  { href: 'https://github.com/joenangle/hifinder', label: 'GitHub', external: true },
  { href: 'mailto:hello@hifinder.app', label: 'Contact', external: true },
]

const footerLinkClass = 'text-sm transition-colors duration-150 text-secondary hover:text-primary'

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer
      style={{
        borderTop: '1px solid var(--border-subtle)',
        background: 'var(--background-secondary)',
      }}
    >
      <div
        className="mx-auto px-6"
        style={{ maxWidth: '1100px' }}
      >
        {/* Main footer content */}
        <div
          className="grid grid-cols-2 sm:grid-cols-3 gap-8 sm:gap-12"
          style={{ paddingTop: '48px', paddingBottom: '40px' }}
        >
          {/* Brand column */}
          <div className="col-span-2 sm:col-span-1">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-lg tracking-tight hover:opacity-80 transition-opacity"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}
            >
              <span className="text-xl" aria-hidden>🎧</span>
              <span style={{ color: 'var(--accent-secondary)' }}>HiFinder</span>
            </Link>
            <p
              className="text-sm mt-3"
              style={{
                color: 'var(--text-tertiary)',
                lineHeight: 1.6,
                maxWidth: '260px',
              }}
            >
              Build your perfect audio system with data-driven recommendations. Free, no account required.
            </p>
          </div>

          {/* Product column */}
          <div>
            <h4
              className="text-xs font-semibold mb-4"
              style={{
                color: 'var(--text-tertiary)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Product
            </h4>
            <ul className="space-y-2.5">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={footerLinkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company column */}
          <div>
            <h4
              className="text-xs font-semibold mb-4"
              style={{
                color: 'var(--text-tertiary)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Company
            </h4>
            <ul className="space-y-2.5">
              {companyLinks.map((link) => (
                <li key={link.href}>
                  {link.external ? (
                    <a
                      href={link.href}
                      target={link.href.startsWith('mailto:') ? undefined : '_blank'}
                      rel={link.href.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
                      className={footerLinkClass}
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link href={link.href} className={footerLinkClass}>
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-3"
          style={{
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '20px',
            paddingBottom: '20px',
          }}
        >
          <p className="text-xs text-tertiary">
            &copy; {year} HiFinder. Expert data from{' '}
            <a
              href="https://crinacle.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-tertiary hover:underline"
            >
              Crinacle
            </a>{' '}
            &amp;{' '}
            <a
              href="https://www.audiosciencereview.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-tertiary hover:underline"
            >
              Audio Science Review
            </a>
          </p>
          <p className="text-xs text-tertiary">
            Not affiliated with any manufacturer or retailer
          </p>
        </div>
      </div>
    </footer>
  )
}
