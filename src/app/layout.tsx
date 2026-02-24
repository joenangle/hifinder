import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AuthProvider } from "@/components/AuthProvider";
import { Header } from "@/components/navigation/Header";
import { GoogleAnalytics } from '@next/third-parties/google';
import { Analytics as CustomAnalytics } from '@/components/Analytics';
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: 'swap', // Show fallback font immediately, swap when Inter loads
});

export const metadata: Metadata = {
  title: "HiFinder - Audio System Builder",
  description: "Build your perfect audio system with personalized recommendations based on your budget, preferences, and existing gear.",
  keywords: "audio, headphones, DAC, amplifier, IEM, recommendations, gear management, hifi, audiophile",
  authors: [{ name: "HiFinder" }],
  creator: "HiFinder",
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
    description: "Build your perfect audio system with personalized recommendations based on your budget, preferences, and existing gear.",
    url: 'https://hifinder.app',
    siteName: 'HiFinder',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: "HiFinder - Audio System Builder",
    description: "Build your perfect audio system with personalized recommendations based on your budget, preferences, and existing gear.",
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
        {/* Preload critical resources — only on desktop where hero image is visible */}
        <link rel="preload" href="/images/hero-headphones.webp" as="image" type="image/webp" media="(min-width: 1024px)" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body
        className={`${inter.variable} font-sans antialiased`}
        style={{
          backgroundColor: 'var(--background-primary)',
          color: 'var(--text-primary)',
        }}
      >
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
          
          <main id="main-content" role="main">
            {children}
          </main>
        </AuthProvider>
        
        {/* Google Analytics */}
        {process.env.NEXT_PUBLIC_GA_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        )}
      </body>
    </html>
  );
}
