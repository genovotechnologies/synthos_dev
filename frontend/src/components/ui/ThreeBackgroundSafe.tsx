"use client";

import React, { useRef, useMemo, useCallback, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial, Float, Sphere, Box, Torus, Environment } from '@react-three/drei';
import * as THREE from 'three';
import ErrorBoundary from './ErrorBoundary';

// Simplified particles component with better error handling
function SafeParticles() {
  const ref = useRef<THREE.Points>(null);
  
  const [positions, colors] = useMemo(() => {
    const particleCount = 5000; // Reduced for better performance
    const positionsArray = new Float32Array(particleCount * 3);
    const colorsArray = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      // Create distribution
      const radius = Math.random() * 40 + 15;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      positionsArray[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positionsArray[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positionsArray[i3 + 2] = radius * Math.cos(phi);
      
      // Safe color assignment
      const normalizedY = Math.max(0, Math.min(1, (positionsArray[i3 + 1] + 40) / 80));
      colorsArray[i3] = 0.4 + normalizedY * 0.4; // Red
      colorsArray[i3 + 1] = 0.6 + normalizedY * 0.3; // Green  
      colorsArray[i3 + 2] = 0.9 + normalizedY * 0.1; // Blue
    }
    
    return [positionsArray, colorsArray];
  }, []);

  useFrame((state, delta) => {
    if (ref.current) {
      const time = state.clock.elapsedTime;
      ref.current.rotation.x = Math.sin(time * 0.1) * 0.1;
      ref.current.rotation.y += delta * 0.05;
    }
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#60a5fa"
        size={0.6}
        sizeAttenuation={true}
        depthWrite={false}
      />
    </Points>
  );
}

// Safe geometric shapes component
function SafeFloatingShapes() {
  const shapes = useMemo(() => [
    { 
      type: 'sphere' as const, 
      position: [-3, 0, 0] as [number, number, number], 
      color: '#3b82f6',
      args: [0.8, 16, 16] as [number, number, number],
      speed: 1.2
    },
    { 
      type: 'box' as const, 
      position: [3, 1, -1] as [number, number, number], 
      color: '#10b981',
      args: [1, 1, 1] as [number, number, number],
      speed: 1.0
    },
    { 
      type: 'torus' as const, 
      position: [0, -2, -1] as [number, number, number], 
      color: '#f59e0b',
      args: [0.8, 0.2, 8, 16] as [number, number, number, number],
      speed: 1.4
    }
  ], []);

  return (
    <>
      {shapes.map((shape, index) => (
        <Float 
          key={`${shape.type}-${index}`}
          speed={shape.speed} 
          rotationIntensity={1} 
          floatIntensity={1}
        >
          {shape.type === 'sphere' && (
            <Sphere args={shape.args as [number, number, number]} position={shape.position}>
              <meshStandardMaterial 
                color={shape.color} 
                transparent 
                opacity={0.6}
                roughness={0.2}
                metalness={0.8}
              />
            </Sphere>
          )}
          {shape.type === 'box' && (
            <Box args={shape.args as [number, number, number]} position={shape.position}>
              <meshStandardMaterial 
                color={shape.color} 
                transparent 
                opacity={0.6}
                roughness={0.2}
                metalness={0.8}
              />
            </Box>
          )}
          {shape.type === 'torus' && (
            <Torus args={shape.args as [number, number, number, number]} position={shape.position}>
              <meshStandardMaterial 
                color={shape.color} 
                transparent 
                opacity={0.6}
                roughness={0.2}
                metalness={0.8}
              />
            </Torus>
          )}
        </Float>
      ))}
    </>
  );
}

// Safe lighting component
function SafeLighting() {
  return (
    <>
      <ambientLight intensity={0.4} color="#ffffff" />
      <pointLight 
        position={[10, 10, 10]} 
        intensity={1} 
        color="#ffffff"
      />
      <pointLight 
        position={[-10, -10, -10]} 
        intensity={0.6} 
        color="#3b82f6" 
      />
    </>
  );
}

// Main scene component
function SafeScene() {
  return (
    <Suspense fallback={null}>
      <Environment preset="night" />
      <fog attach="fog" args={['#000011', 20, 80]} />
      <SafeLighting />
      <SafeParticles />
      <SafeFloatingShapes />
    </Suspense>
  );
}

// 2D Fallback component
function FallbackBackground({ className }: { className?: string }) {
  return (
    <div className={`fixed inset-0 -z-10 ${className}`}>
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-blue-900 to-black animate-pulse" />
      
      {/* Floating particles simulation with CSS */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-blue-400 rounded-full opacity-60 animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>
      
      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/40 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/50 pointer-events-none" />
    </div>
  );
}

// Main component interface
interface ThreeBackgroundSafeProps {
  className?: string;
  interactive?: boolean;
  quality?: 'low' | 'medium' | 'high';
}

export default function ThreeBackgroundSafe({ 
  className = "", 
  interactive = false,
  quality = 'high'
}: ThreeBackgroundSafeProps) {
  const pixelRatio = useMemo((): [number, number] => {
    switch (quality) {
      case 'low': return [0.5, 1];
      case 'medium': return [1, 1.5];
      case 'high': return [1, 2];
      default: return [1, 2];
    }
  }, [quality]);

  // Fallback component for when 3D fails
  const ThreeFallback = useCallback(({ error }: { error?: Error }) => {
    console.warn('Three.js fallback activated:', error?.message);
    return <FallbackBackground className={className} />;
  }, [className]);

  return (
    <ErrorBoundary fallback={ThreeFallback}>
      <div className={`fixed inset-0 -z-10 ${className}`}>
        <Canvas
          camera={{ 
            position: [0, 0, 15], 
            fov: 75,
            near: 0.1,
            far: 100
          }}
          gl={{ 
            alpha: true, 
            antialias: quality !== 'low',
            powerPreference: "high-performance",
            stencil: false,
            depth: true
          }}
          dpr={pixelRatio}
          frameloop={interactive ? "always" : "demand"}
          performance={{ min: 0.5 }}
          onCreated={({ gl }) => {
            gl.setClearColor('#000011', 0);
          }}
        >
          <SafeScene />
        </Canvas>
        
        {/* Enhanced gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/10 via-transparent to-black/30 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/40 pointer-events-none" />
      </div>
    </ErrorBoundary>
  );
}

// CSS for floating animation (add to globals.css)
export const floatingAnimationCSS = `
@keyframes float {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  33% { transform: translateY(-10px) rotate(120deg); }
  66% { transform: translateY(5px) rotate(240deg); }
}

.animate-float {
  animation: float linear infinite;
}
`; 