import '../styles/globals.css'; 
import { Metadata } from 'next';
import { Providers } from './providers';

// Use system fonts instead of Google Fonts to avoid network timeouts
const fontClass = 'font-sans'; // Uses Tailwind's default font stack

export const metadata: Metadata = {
  title: 'Synthos - AI Data Platform',
  description: 'Generate high-quality synthetic data with ease.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${fontClass} bg-background text-foreground antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}