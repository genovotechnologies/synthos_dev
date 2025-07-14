"use client";

import React, { useRef, useMemo, useState, useCallback, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Float, Environment, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { useTheme } from 'next-themes';
import ErrorBoundary from './ErrorBoundary';

// Interactive data point component
function DataPoint({ 
  position, 
  value, 
  color, 
  scale = 1, 
  onClick,
  isHovered,
  onHover,
  onUnhover
}: {
  position: [number, number, number];
  value: number;
  color: string;
  scale?: number;
  onClick?: () => void;
  isHovered?: boolean;
  onHover?: () => void;
  onUnhover?: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      const targetScale = (hovered || isHovered) ? scale * 1.5 : scale;
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
      
      // Gentle floating animation
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.1;
    }
  });

  const handlePointerOver = useCallback(() => {
    setHovered(true);
    onHover?.();
  }, [onHover]);

  const handlePointerOut = useCallback(() => {
    setHovered(false);
    onUnhover?.();
  }, [onUnhover]);

  return (
    <mesh
      ref={meshRef}
      position={position}
      onClick={onClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <sphereGeometry args={[Math.max(0.1, value * 0.5), 16, 16]} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={hovered || isHovered ? 0.9 : 0.7}
        roughness={0.2}
        metalness={0.8}
        emissive={color}
        emissiveIntensity={hovered || isHovered ? 0.3 : 0.1}
      />
      {(hovered || isHovered) && (
        <Text
          position={[0, value * 0.5 + 0.5, 0]}
          fontSize={0.3}
          color={color}
          anchorX="center"
          anchorY="middle"
          maxWidth={2}
        >
          {`Value: ${value.toFixed(2)}`}
        </Text>
      )}
    </mesh>
  );
}

// Animated grid component
function DataGrid({ theme }: { theme: string }) {
  const gridRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (gridRef.current) {
      gridRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.1;
    }
  });

  const gridColor = theme === 'dark' ? '#3b82f6' : '#1e40af';

  return (
    <group ref={gridRef}>
      {/* Grid lines */}
      {Array.from({ length: 11 }, (_, i) => (
        <React.Fragment key={i}>
          <line key={`x-${i}`}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={2}
                args={[new Float32Array([
                  -5 + i, 0, -5,
                  -5 + i, 0, 5
                ]), 3]}
              />
            </bufferGeometry>
            <lineBasicMaterial color={gridColor} opacity={0.3} transparent />
          </line>
          <line key={`z-${i}`}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={2}
                args={[new Float32Array([
                  -5, 0, -5 + i,
                  5, 0, -5 + i
                ]), 3]}
              />
            </bufferGeometry>
            <lineBasicMaterial color={gridColor} opacity={0.3} transparent />
          </line>
        </React.Fragment>
      ))}
    </group>
  );
}

// Main visualization scene
function VisualizationScene({ data, theme }: { data: any[], theme: string }) {
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  const dataPoints = useMemo(() => {
    return data.map((item, index) => {
      const value = typeof item === 'number' ? item : (item?.value || Math.random());
      const category = (item?.category || 'default') as string;
      
      // Create clusters based on category
      const categoryOffsets: Record<string, [number, number, number]> = {
        'Users': [-2, 0, -2],
        'Products': [2, 0, -2], 
        'Orders': [-2, 0, 2],
        'Reviews': [2, 0, 2],
        'Analytics': [-1, 0, 0],
        'Sales': [1, 0, 0],
        'Marketing': [0, 0, -1],
        'Support': [0, 0, 1],
        'default': [0, 0, 0]
      };
      const categoryOffset = categoryOffsets[category] || categoryOffsets['default'];
      
      const categoryColors: Record<string, string> = {
        'Users': '#3b82f6',
        'Products': '#ef4444', 
        'Orders': '#10b981',
        'Reviews': '#f59e0b',
        'Analytics': '#8b5cf6',
        'Sales': '#06b6d4',
        'Marketing': '#f97316',
        'Support': '#84cc16',
        'default': `hsl(${(index / data.length) * 360}, 70%, 60%)`
      };
      
      return {
        position: [
          categoryOffset[0] + (Math.random() - 0.5) * 3,
          value * 3 + Math.random() * 1,
          categoryOffset[2] + (Math.random() - 0.5) * 3
        ] as [number, number, number],
        value,
        color: categoryColors[category] || categoryColors['default'],
        category,
        label: item?.label || `Point ${index + 1}`,
        id: index
      };
    });
  }, [data]);

  const lightColor = theme === 'dark' ? '#ffffff' : '#f0f0f0';
  const ambientIntensity = theme === 'dark' ? 0.3 : 0.6;

  return (
    <Suspense fallback={null}>
      <PerspectiveCamera makeDefault position={[10, 8, 10]} fov={60} />
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={30}
        autoRotate={true}
        autoRotateSpeed={0.5}
      />
      
      {/* Lighting */}
      <ambientLight intensity={ambientIntensity} color={lightColor} />
      <pointLight position={[10, 10, 10]} intensity={1} color={lightColor} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#3b82f6" />
      
      {/* Environment */}
      <Environment preset={theme === 'dark' ? 'night' : 'dawn'} />
      
      {/* Grid */}
      <DataGrid theme={theme} />
      
      {/* Data points */}
      {dataPoints.map((point, index) => (
        <DataPoint
          key={point.id}
          position={point.position}
          value={point.value}
          color={point.color}
          scale={1}
          onClick={() => setSelectedPoint(selectedPoint === index ? null : index)}
          isHovered={hoveredPoint === index || selectedPoint === index}
          onHover={() => setHoveredPoint(index)}
          onUnhover={() => setHoveredPoint(null)}
        />
      ))}
      
      {/* Category labels */}
      <Text
        position={[-2, 4, -2]}
        fontSize={0.3}
        color="#3b82f6"
        anchorX="center"
        anchorY="middle"
      >
        Users
      </Text>
      <Text
        position={[2, 4, -2]}
        fontSize={0.3}
        color="#ef4444"
        anchorX="center"
        anchorY="middle"
      >
        Products
      </Text>
      <Text
        position={[-2, 4, 2]}
        fontSize={0.3}
        color="#10b981"
        anchorX="center"
        anchorY="middle"
      >
        Orders
      </Text>
      <Text
        position={[2, 4, 2]}
        fontSize={0.3}
        color="#f59e0b"
        anchorX="center"
        anchorY="middle"
      >
        Reviews
      </Text>

      {/* Floating title */}
      <Float speed={1} rotationIntensity={0.2} floatIntensity={0.5}>
        <Text
          position={[0, 6, 0]}
          fontSize={0.8}
          color={theme === 'dark' ? '#ffffff' : '#1f2937'}
          anchorX="center"
          anchorY="middle"
          maxWidth={10}
        >
          Synthetic Data Clusters
        </Text>
      </Float>
    </Suspense>
  );
}

// Loading fallback
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-sm text-muted-foreground">Loading 3D visualization...</p>
      </div>
    </div>
  );
}

// 2D Fallback visualization
function Fallback2D({ data, className }: { data: any[], className?: string }) {
  const { theme } = useTheme();
  
  return (
    <div className={`relative w-full h-full bg-gradient-to-br from-background via-background to-primary/5 ${className}`}>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="grid grid-cols-6 gap-4 p-8">
          {data.slice(0, 36).map((item, index) => {
            const value = typeof item === 'number' ? item : Math.random();
            const height = Math.max(20, value * 100);
            const hue = (index / 36) * 360;
            
            return (
              <div
                key={index}
                className="relative group"
                style={{ height: `${height}px` }}
              >
                <div
                  className="w-8 h-full rounded-t-lg transition-all duration-300 hover:scale-110 cursor-pointer"
                  style={{
                    background: `linear-gradient(to top, hsl(${hue}, 70%, 50%), hsl(${hue}, 70%, 70%))`,
                    boxShadow: `0 0 20px hsla(${hue}, 70%, 60%, 0.3)`
                  }}
                />
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                  {value.toFixed(2)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-center">
        <p className="text-sm text-muted-foreground">2D Data Visualization</p>
        <p className="text-xs text-muted-foreground/70">Hover over bars for details</p>
      </div>
    </div>
  );
}

// Main component interface
interface DataVisualization3DProps {
  data?: any[];
  className?: string;
  height?: string;
  interactive?: boolean;
  quality?: 'low' | 'medium' | 'high';
}

export default function DataVisualization3D({
  data = Array.from({ length: 50 }, (_, i) => ({ 
    value: Math.random(), 
    label: `Data Point ${i + 1}`,
    category: ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)]
  })),
  className = "",
  height = "400px",
  interactive = true,
  quality = 'medium'
}: DataVisualization3DProps) {
  const { theme } = useTheme();
  
  const pixelRatio = useMemo((): [number, number] => {
    switch (quality) {
      case 'low': return [0.5, 1];
      case 'medium': return [1, 1.5];
      case 'high': return [1, 2];
      default: return [1, 1.5];
    }
  }, [quality]);

  // Generate more interesting sample data if none provided
  const enrichedData = useMemo(() => {
    if (Array.isArray(data) && data.length > 0) {
      return data.map((item, i) => {
        if (typeof item === 'number') {
          return { 
            value: item, 
            label: `Point ${i + 1}`,
            category: ['Analytics', 'Sales', 'Marketing', 'Support'][Math.floor(Math.random() * 4)]
          };
        }
        return item;
      });
    }
    return Array.from({ length: 50 }, (_, i) => ({ 
      value: Math.random(), 
      label: `Synthetic Record ${i + 1}`,
      category: ['Users', 'Products', 'Orders', 'Reviews'][Math.floor(Math.random() * 4)],
      timestamp: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString()
    }));
  }, [data]);

  const Fallback3D = useCallback(({ error }: { error?: Error }) => {
    console.warn('3D visualization fallback activated:', error?.message);
    return <Fallback2D data={enrichedData} className={className} />;
  }, [enrichedData, className]);

  return (
    <ErrorBoundary fallback={Fallback3D}>
      <div className={`relative overflow-hidden rounded-xl ${className}`} style={{ height }}>
        <Canvas
          camera={{ position: [10, 8, 10], fov: 60 }}
          gl={{
            alpha: true,
            antialias: quality !== 'low',
            powerPreference: "high-performance"
          }}
          dpr={pixelRatio}
          frameloop={interactive ? "always" : "demand"}
          performance={{ min: 0.5 }}
        >
          <VisualizationScene data={enrichedData} theme={theme || 'dark'} />
        </Canvas>
        
        {/* Controls overlay */}
        <div className="absolute top-4 right-4 bg-black/20 backdrop-blur-sm rounded-lg p-2">
          <div className="text-xs text-white/80 space-y-1">
            <div>Click: Select point</div>
            <div>Drag: Rotate view</div>
            <div>Scroll: Zoom</div>
          </div>
        </div>
        
        {/* Data info overlay */}
        <div className="absolute bottom-4 left-4 bg-black/20 backdrop-blur-sm rounded-lg p-2">
          <div className="text-xs text-white/80">
            Data Points: {data.length}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
