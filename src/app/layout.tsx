import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeToggle } from "@/components/ThemeToggle";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "HiFinder - Audio System Builder",
  description: "Build your perfect audio system with personalized recommendations based on your budget, preferences, and existing gear.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} font-sans antialiased`}
      >
        <div style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 50 }}>
          <ThemeToggle />
        </div>
        {children}
      </body>
    </html>
  );
}
