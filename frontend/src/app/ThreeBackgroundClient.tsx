"use client";
import React from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";

const ThreeBackground = dynamic(() => import("@/components/ui/ThreeBackground"), { 
  ssr: false,
  loading: () => <div className="fixed inset-0 -z-10 bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900" />
});

const ThreeBackgroundSafe = dynamic(() => import("@/components/ui/ThreeBackgroundSafe"), { 
  ssr: false,
  loading: () => <div className="fixed inset-0 -z-10 bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900" />
});

export default function ThreeBackgroundClient() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-indigo-500/10 animate-pulse" />
      </div>
    );
  }

  return (
    <React.Suspense 
      fallback={
        <div className="fixed inset-0 -z-10 bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-indigo-500/10 animate-pulse" />
        </div>
      }
    > 
      <ThreeBackground 
        className="" 
        quality="high" 
        interactive={true}
        theme={resolvedTheme || 'dark'} 
        particleCount={8000}
      />
    </React.Suspense>
  );
} 