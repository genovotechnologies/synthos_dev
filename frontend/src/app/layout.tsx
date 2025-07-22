import '../styles/globals.css'; 
import { Metadata } from 'next';
import { Providers } from './providers';

// Use system fonts instead of Google Fonts to avoid network timeouts
const fontClass = 'font-sans'; // Uses Tailwind's default font stack

export const metadata: Metadata = {
  title: 'Synthos - AI Data Platform',
  description: 'Generate high-quality synthetic data with ease.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="sr-only focus:not-sr-only absolute top-2 left-2 z-50 bg-primary text-primary-foreground px-4 py-2 rounded shadow-lg transition-all duration-200">Skip to main content</a>
        <main id="main-content">
          {children}
        </main>
      </body>
    </html>
  );
}