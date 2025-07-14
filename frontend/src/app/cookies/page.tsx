'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function CookiesPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to privacy page after a short delay
    const timeout = setTimeout(() => {
      router.push('/privacy');
    }, 3000);

    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-md mx-auto">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Cookie Policy</CardTitle>
                <CardDescription>
                  Our cookie policy is included in our comprehensive privacy policy.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  For detailed information about how we use cookies and similar technologies, please review our privacy policy.
                </p>
                <div className="flex flex-col gap-2">
                  <Button asChild>
                    <Link href="/privacy">View Privacy Policy</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/contact">Contact Us</Link>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Redirecting to privacy policy in 3 seconds...
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
} 