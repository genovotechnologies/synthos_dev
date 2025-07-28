"use client";

import React, { Suspense, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';

// Dynamically import ThreeBackground with no SSR to avoid React compatibility issues
const ThreeBackground = dynamic(() => import('./ThreeBackground'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900" />
});

interface ThreeBackgroundSafeProps {
  className?: string;
  interactive?: boolean;
  quality?: 'low' | 'medium' | 'high';
  theme?: string;
  fallback?: React.ReactNode;
  particleCount?: number;
}

// CSS-only animated background component as fallback
function AnimatedBackground({ className, theme = 'dark' }: { className?: string; theme?: string }) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const isDark = theme === 'dark';
  const bgGradient = isDark 
    ? 'from-gray-900 via-blue-900 to-indigo-900' 
    : 'from-blue-50 via-indigo-100 to-purple-100';
  const particleColor = isDark ? 'bg-blue-400' : 'bg-indigo-500';
  const shapeColor = isDark ? 'bg-blue-500' : 'bg-indigo-400';

  return (
    <div className={`fixed inset-0 -z-10 overflow-hidden ${className}`}>
      {/* Animated gradient background */}
      <div 
        className={`absolute inset-0 bg-gradient-to-br ${bgGradient} transition-all duration-1000`}
        style={{
          transform: `translate(${mousePosition.x * 20}px, ${mousePosition.y * 20}px)`,
        }}
      />
      
      {/* Floating particles */}
      <div className="absolute inset-0">
        {Array.from({ length: 150 }).map((_, i) => (
          <div
            key={i}
            className={`absolute w-1 h-1 ${particleColor} rounded-full opacity-60 animate-float`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
              transform: `translate(${mousePosition.x * 10}px, ${mousePosition.y * 10}px)`,
            }}
          />
        ))}
      </div>
      
      {/* Animated shapes */}
      <div className="absolute inset-0">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={`shape-${i}`}
            className={`absolute rounded-full opacity-20 animate-pulse ${shapeColor}`}
            style={{
              left: `${20 + (i * 8)}%`,
              top: `${30 + (i * 6)}%`,
              width: `${100 + i * 20}px`,
              height: `${100 + i * 20}px`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${4 + i}s`,
              transform: `translate(${mousePosition.x * 30}px, ${mousePosition.y * 30}px)`,
            }}
          />
        ))}
      </div>
      
      {/* Gradient overlays */}
      <div className={`absolute inset-0 ${
        isDark 
          ? 'bg-gradient-to-br from-black/20 via-transparent to-black/40' 
          : 'bg-gradient-to-br from-white/10 via-transparent to-white/20'
      } pointer-events-none`} />
      
      {/* Enhanced floating elements for light mode */}
      {!isDark && (
        <div className="absolute inset-0">
          {Array.from({ length: 25 }).map((_, i) => (
            <motion.div
              key={`enhanced-${i}`}
              className={`absolute ${
                i % 4 === 0 ? 'w-3 h-3 bg-gradient-to-r from-blue-400/50 to-cyan-400/50 rounded-lg' :
                i % 4 === 1 ? 'w-2 h-4 bg-gradient-to-r from-purple-400/50 to-pink-400/50 rounded-sm' :
                i % 4 === 2 ? 'w-4 h-2 bg-gradient-to-r from-green-400/50 to-emerald-400/50 rounded-sm' :
                'w-2 h-2 bg-gradient-to-r from-orange-400/50 to-red-400/50 rounded-full'
              }`}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -40, 0],
                x: [0, Math.random() * 30 - 15, 0],
                opacity: [0.3, 0.8, 0.3],
                scale: [1, 1.3, 1],
                rotate: [0, 180, 360],
              }}
              transition={{
                duration: 6 + Math.random() * 3,
                repeat: Infinity,
                delay: Math.random() * 3,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>
      )}
      
      {/* Additional special elements for both themes */}
      <div className="absolute inset-0">
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={`special-${i}`}
            className={`absolute ${
              i % 3 === 0 ? 'w-4 h-4 bg-gradient-to-r from-blue-500/30 to-purple-500/30 transform rotate-45' :
              i % 3 === 1 ? 'w-3 h-6 bg-gradient-to-r from-green-500/30 to-emerald-500/30 rounded-lg' :
              'w-6 h-3 bg-gradient-to-r from-orange-500/30 to-red-500/30 rounded-lg'
            }`}
            style={{
              left: `${15 + (i * 12)}%`,
              top: `${25 + (i * 10)}%`,
            }}
            animate={{
              y: [0, -60, 0],
              x: [0, Math.random() * 40 - 20, 0],
              opacity: [0.2, 0.7, 0.2],
              scale: [1, 1.5, 1],
              rotate: [0, 360, 720],
            }}
            transition={{
              duration: 8 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function ThreeBackgroundSafe({
  className = "",
  interactive = false,
  quality = 'high',
  theme = 'dark',
  fallback,
  particleCount = 10000
}: ThreeBackgroundSafeProps) {
  const [isClient, setIsClient] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [useThreeJS, setUseThreeJS] = useState(true);

  useEffect(() => {
    setIsClient(true);
    
    // Check if WebGL is supported
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        console.warn('WebGL not supported, falling back to CSS animations');
        setUseThreeJS(false);
      }
    } catch (error) {
      console.warn('WebGL check failed, falling back to CSS animations');
      setUseThreeJS(false);
    }
  }, []);

  // Error boundary for React Three.js compatibility issues
  if (!isClient) {
    return (
      <div className={`w-full h-full bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 ${className}`}>
        {fallback}
      </div>
    );
  }

  if (hasError || !useThreeJS) {
    return (
      <div className="relative">
        <AnimatedBackground className={className} theme={theme} />
        {fallback && (
          <div className="relative z-10">
            {fallback}
          </div>
        )}
      </div>
    );
  }

  return (
    <ErrorBoundary onError={() => setHasError(true)}>
      <Suspense fallback={
        <div className={`w-full h-full bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 ${className}`}>
          {fallback}
        </div>
      }>
        <ThreeBackground
          className={className}
          interactive={interactive}
          quality={quality}
          theme={theme}
          particleCount={particleCount}
        />
      </Suspense>
    </ErrorBoundary>
  );
}

// Simple error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: () => void },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; onError: () => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
          <div className="flex items-center justify-center h-full">
            <div className="text-white text-center">
              <div className="text-4xl mb-4">🌟</div>
              <div className="text-lg font-semibold">Synthos</div>
              <div className="text-sm opacity-75">Enterprise Synthetic Data Platform</div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
} 