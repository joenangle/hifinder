import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { Header } from "@/components/navigation/Header";
import { Footer } from "@/components/navigation/Footer";
import { GoogleAnalytics } from '@next/third-parties/google';
import { Analytics as CustomAnalytics } from '@/components/Analytics';
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { NuqsAdapter } from 'nuqs/adapters/next';

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: 'swap',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["600", "700", "800"],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "HiFinder - Audio System Builder",
  description: "Find headphones, IEMs, DACs, and amps matched to your budget and how you listen. Free, no account required.",
  keywords: "audio, headphones, DAC, amplifier, IEM, recommendations, gear management, hifi, audiophile",
  authors: [{ name: "Joe Nangle", url: "https://joenangle.com" }],
  creator: "Joe Nangle",
  publisher: "HiFinder",
  metadataBase: new URL('https://hifinder.app'),
  verification: {
    other: {
      'impact-site-verification': 'ab752c49-e654-41e0-a0ee-abc6dc0eb30b',
    },
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "HiFinder - Audio System Builder",
    description: "Find headphones, IEMs, DACs, and amps matched to your budget and how you listen. Free, no account required.",
    url: 'https://hifinder.app',
    siteName: 'HiFinder',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: "HiFinder - Audio System Builder",
    description: "Find headphones, IEMs, DACs, and amps matched to your budget and how you listen. Free, no account required.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover' as const,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preconnect hints — establishes DNS + TLS early for external
            origins hit on the critical path. Saves 100-300ms on cold
            page loads. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Supabase: auth + client-side queries (dashboard, gear, alerts,
            wishlist, activity feed) + image CDN origin */}
        {process.env.NEXT_PUBLIC_SUPABASE_URL && (
          <link
            rel="preconnect"
            href={new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin}
            crossOrigin="anonymous"
          />
        )}
        {/* Vercel Speed Insights / Analytics */}
        <link rel="dns-prefetch" href="https://va.vercel-scripts.com" />
        <link rel="dns-prefetch" href="https://vitals.vercel-insights.com" />
        {/* Google Analytics — only matters if GA is configured */}
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
            <link rel="dns-prefetch" href="https://www.google-analytics.com" />
          </>
        )}
      </head>
      <body
        className={`${inter.variable} ${plusJakartaSans.variable} font-sans antialiased`}
        style={{
          backgroundColor: 'var(--background-primary)',
          color: 'var(--text-primary)',
        }}
      >
        <NuqsAdapter>
        <AuthProvider session={session}>
          <Script
            id="theme-script"
            strategy="beforeInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  const savedTheme = localStorage.getItem('theme');
                  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  const theme = savedTheme || (prefersDark ? 'dark' : 'light');
                  document.documentElement.setAttribute('data-theme', theme);
                })();
              `
            }}
          />
          <CustomAnalytics />
          <Analytics />
          <SpeedInsights />
          <a
            href="#main-content"
            className="skip-link"
            aria-label="Skip to main content"
          >
            Skip to main content
          </a>
          
          <Header initialSession={session} />
          
          <main id="main-content" role="main" className="pb-[env(safe-area-inset-bottom)]">
            {children}
          </main>
          <Footer />
        </AuthProvider>
        </NuqsAdapter>

        {/* Google Analytics */}
        {process.env.NEXT_PUBLIC_GA_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        )}
      </body>
    </html>
  );
}
