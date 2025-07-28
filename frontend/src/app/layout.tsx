import '../styles/globals.css'; 
import { Metadata } from 'next';
import { Providers } from './providers';
import React from 'react';
import ThreeBackgroundClient from './ThreeBackgroundClient';

export const metadata: Metadata = {
  title: 'Synthos - AI Data Platform',
  description: 'Generate high-quality synthetic data with ease.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Accept className from next-themes for dark mode
  // @ts-ignore: next-themes injects className prop
  return (
    <html lang="en" suppressHydrationWarning {...(typeof window === 'undefined' ? {} : { className: undefined })}>
      <body>
        <Providers>
          <ThreeBackgroundClient />
          <a href="#main-content" className="sr-only focus:not-sr-only absolute top-2 left-2 z-50 bg-primary text-primary-foreground px-4 py-2 rounded shadow-lg transition-all duration-200">Skip to main content</a>
          <main id="main-content">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}