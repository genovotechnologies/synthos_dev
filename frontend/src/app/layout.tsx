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
        {process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && (
          <div className="fixed top-0 left-0 w-full bg-yellow-400 text-black text-center py-2 z-50">
            Demo Mode: All data is mock and authentication is bypassed.
          </div>
        )}
        {children}
      </body>
    </html>
  );
}