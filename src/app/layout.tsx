import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AuthProvider } from "@/components/AuthProvider";
import { AuthButton } from "@/components/AuthButton";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "HiFinder - Audio System Builder",
  description: "Build your perfect audio system with personalized recommendations based on your budget, preferences, and existing gear.",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <script
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
      <body
        className={`${inter.variable} font-sans antialiased`}
        style={{
          backgroundColor: 'var(--background-primary)',
          color: 'var(--text-primary)',
        }}
      >
        <AuthProvider>
          <a 
            href="#main-content" 
            className="skip-link"
            aria-label="Skip to main content"
          >
            Skip to main content
          </a>
          
          <div 
            style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 50 }}
            role="banner"
            aria-label="Site controls"
            className="flex items-center gap-2"
          >
            <AuthButton />
            <ThemeToggle />
          </div>
          
          <main id="main-content" role="main">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
