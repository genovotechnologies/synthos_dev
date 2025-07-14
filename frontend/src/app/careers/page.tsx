'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function CareersPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to contact page after a short delay
    const timeout = setTimeout(() => {
      router.push('/contact');
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
                <CardTitle className="text-2xl">Join Our Team</CardTitle>
                <CardDescription>
                  We're building the future of synthetic data. Exciting opportunities are coming soon!
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  While we prepare our careers page, feel free to reach out directly about potential opportunities.
                </p>
                <div className="flex flex-col gap-2">
                  <Button asChild>
                    <Link href="/contact">Contact Us</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/about">Learn About Us</Link>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Redirecting to contact page in 3 seconds...
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
} 