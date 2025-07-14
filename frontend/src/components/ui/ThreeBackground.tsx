"use client";

import React, { useRef, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Points, PointMaterial, Float, Sphere, Box, Torus, useTexture, Environment } from '@react-three/drei';
import * as THREE from 'three';

// Type definitions for 3D shapes
type SphereArgs = [radius?: number, widthSegments?: number, heightSegments?: number, phiStart?: number, phiLength?: number, thetaStart?: number, thetaLength?: number];
type BoxArgs = [width?: number, height?: number, depth?: number, widthSegments?: number, heightSegments?: number, depthSegments?: number];
type TorusArgs = [radius?: number, tube?: number, radialSegments?: number, tubularSegments?: number, arc?: number];

interface Shape {
  type: 'sphere' | 'box' | 'torus';
  position: [number, number, number];
  color: string;
  args: SphereArgs | BoxArgs | TorusArgs;
  speed: number;
}

// Enhanced particles component with better performance
function Particles(props: any) {
  const ref = useRef<THREE.Points>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  
  const [positions, colors] = useMemo(() => {
    const particleCount = 8000;
    const positionsArray = new Float32Array(particleCount * 3);
    const colorsArray = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      // Create more sophisticated distribution
      const radius = Math.random() * 50 + 20;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      positionsArray[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positionsArray[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positionsArray[i3 + 2] = radius * Math.cos(phi);
      
      // Gradient colors based on position (with safety checks)
      const normalizedY = Math.max(0, Math.min(1, (positionsArray[i3 + 1] + 50) / 100));
      colorsArray[i3] = Math.max(0, Math.min(1, 0.5 + normalizedY * 0.5)); // Red
      colorsArray[i3 + 1] = Math.max(0, Math.min(1, 0.3 + normalizedY * 0.4)); // Green  
      colorsArray[i3 + 2] = Math.max(0, Math.min(1, 0.8 + normalizedY * 0.2)); // Blue
    }
    
    return [positionsArray, colorsArray];
  }, []);

  useFrame((state, delta) => {
    if (ref.current) {
      const time = state.clock.elapsedTime;
      
      // Smooth rotation with time-based animation
      ref.current.rotation.x = Math.sin(time * 0.2) * 0.2;
      ref.current.rotation.y += delta * 0.1;
      ref.current.rotation.z = Math.cos(time * 0.15) * 0.1;
      
      // Mouse interaction effect
      const targetRotationX = mouseRef.current.y * 0.2;
      const targetRotationY = mouseRef.current.x * 0.2;
      ref.current.rotation.x += (targetRotationX - ref.current.rotation.x) * 0.02;
      ref.current.rotation.y += (targetRotationY - ref.current.rotation.y) * 0.02;
    }
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false} {...props}>
      <PointMaterial
        transparent
        vertexColors
        size={0.8}
        sizeAttenuation={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
      {colors && colors.length > 0 && (
      <bufferAttribute
        attach="attributes-color"
        args={[colors, 3]}
      />
      )}
    </Points>
  );
}

// Enhanced floating geometric shapes with better materials
function FloatingShapes() {
  const shapes = useMemo((): Shape[] => [
    { 
      type: 'sphere', 
      position: [-4, 0, 0], 
      color: '#3b82f6',
      args: [1, 32, 32] as SphereArgs,
      speed: 1.4
    },
    { 
      type: 'box', 
      position: [4, 2, -2], 
      color: '#10b981',
      args: [1.5, 1.5, 1.5] as BoxArgs,
      speed: 1.2
    },
    { 
      type: 'torus', 
      position: [0, -3, -1], 
      color: '#f59e0b',
      args: [1, 0.3, 16, 100] as TorusArgs,
      speed: 1.6
    },
    { 
      type: 'sphere', 
      position: [6, -2, -3], 
      color: '#ef4444',
      args: [0.8, 32, 32] as SphereArgs,
      speed: 1.1
    },
    { 
      type: 'box', 
      position: [-6, 1, -1], 
      color: '#8b5cf6',
      args: [1, 2, 1] as BoxArgs,
      speed: 1.3
    }
  ], []);

  return (
    <>
      {shapes.filter(shape => shape && shape.type && shape.color && shape.args && shape.position).map((shape, index) => (
        <Float 
          key={index}
          speed={shape.speed || 1.0} 
          rotationIntensity={1.5} 
          floatIntensity={2}
        >
          {shape.type === 'sphere' ? (
            <Sphere args={shape.args as SphereArgs} position={shape.position}>
              <meshPhysicalMaterial 
                color={shape.color || '#ffffff'} 
                transparent 
                opacity={0.7}
                roughness={0.1}
                metalness={0.5}
                clearcoat={1}
                clearcoatRoughness={0.1}
              />
            </Sphere>
          ) : shape.type === 'torus' ? (
            <Torus args={shape.args as TorusArgs} position={shape.position}>
              <meshPhysicalMaterial 
                color={shape.color || '#ffffff'} 
                transparent 
                opacity={0.7}
                roughness={0.1}
                metalness={0.5}
                clearcoat={1}
                clearcoatRoughness={0.1}
              />
            </Torus>
          ) : (
            <Box args={shape.args as BoxArgs} position={shape.position}>
              <meshPhysicalMaterial 
                color={shape.color || '#ffffff'} 
                transparent 
                opacity={0.7}
                roughness={0.1}
                metalness={0.5}
                clearcoat={1}
                clearcoatRoughness={0.1}
              />
            </Box>
          )}
        </Float>
      ))}
    </>
  );
}

// Enhanced lighting setup
function Lighting() {
  const lightRef = useRef<THREE.PointLight>(null);
  
  useFrame((state) => {
    if (lightRef.current) {
      const time = state.clock.elapsedTime;
      lightRef.current.position.x = Math.sin(time * 0.5) * 10;
      lightRef.current.position.z = Math.cos(time * 0.5) * 10;
    }
  });

  return (
    <>
      <ambientLight intensity={0.3} color="#ffffff" />
      <pointLight 
        ref={lightRef}
        position={[10, 10, 10]} 
        intensity={1.5} 
        color="#ffffff"
        castShadow
      />
      <pointLight 
        position={[-10, -10, -10]} 
        intensity={0.8} 
        color="#8b5cf6" 
      />
      <spotLight
        position={[0, 20, 0]}
        angle={0.3}
        penumbra={1}
        intensity={0.5}
        color="#60a5fa"
        castShadow
      />
    </>
  );
}

// Main 3D scene component
function Scene() {
  const { size, gl } = useThree();
  
  // Mouse tracking for interactive effects
  const handleMouseMove = useCallback((event: MouseEvent) => {
    const x = (event.clientX / size.width) * 2 - 1;
    const y = -(event.clientY / size.height) * 2 + 1;
    // Store mouse position for use in particle animation
  }, [size]);

  React.useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  return (
    <>
      <Environment preset="night" />
      <fog attach="fog" args={['#000000', 30, 100]} />
      <Lighting />
      <Particles />
      <FloatingShapes />
    </>
  );
}

// Main ThreeBackground component with enhanced features
interface ThreeBackgroundProps {
  className?: string;
  interactive?: boolean;
  quality?: 'low' | 'medium' | 'high';
}

export default function ThreeBackground({ 
  className = "", 
  interactive = false,
  quality = 'high'
}: ThreeBackgroundProps) {
  const pixelRatio = useMemo((): [number, number] => {
    switch (quality) {
      case 'low': return [0.5, 1];
      case 'medium': return [1, 1.5];
      case 'high': return [1, 2];
      default: return [1, 2];
    }
  }, [quality]);

  return (
    <div className={`fixed inset-0 -z-10 ${className}`}>
      <Canvas
        camera={{ 
          position: [0, 0, 20], 
          fov: 75,
          near: 0.1,
          far: 200
        }}
        gl={{ 
          alpha: true, 
          antialias: true,
          powerPreference: "high-performance",
          stencil: false,
          depth: true
        }}
        dpr={pixelRatio}
        frameloop={interactive ? "always" : "demand"}
        shadows
        performance={{ min: 0.5 }}
      >
        <Scene />
      </Canvas>
      
      {/* Enhanced gradient overlay with better visual hierarchy */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/10 via-transparent to-black/20 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/30 pointer-events-none" />
    </div>
  );
} 