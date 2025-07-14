"use client";

import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber';
import { Text, Box, Sphere, OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';

interface DataPoint {
  id: string;
  value: number;
  label: string;
  color: string;
  position: [number, number, number];
}

// Individual data cube component
function DataCube({ 
  dataPoint, 
  onClick,
  isSelected 
}: { 
  dataPoint: DataPoint;
  onClick: (dataPoint: DataPoint) => void;
  isSelected: boolean;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (ref.current) {
      // Gentle floating animation
      ref.current.position.y = dataPoint.position[1] + Math.sin(state.clock.elapsedTime + dataPoint.value) * 0.1;
      
      // Scale based on selection/hover state
      const targetScale = isSelected ? 1.3 : hovered ? 1.1 : 1;
      ref.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    }
  });

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onClick(dataPoint);
  };

  return (
    <group position={dataPoint.position}>
      <Box
        ref={ref}
        args={[1, dataPoint.value * 2, 1]}
        onClick={handleClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <meshStandardMaterial 
          color={dataPoint.color}
          transparent
          opacity={isSelected ? 0.9 : hovered ? 0.8 : 0.7}
          roughness={0.2}
          metalness={0.8}
        />
      </Box>
      
      {/* Data label */}
      <Html position={[0, dataPoint.value + 1, 0]} center>
        <div className={`
          bg-black/80 text-white px-2 py-1 rounded text-xs whitespace-nowrap
          transform transition-all duration-200 
          ${hovered || isSelected ? 'scale-110 opacity-100' : 'scale-100 opacity-80'}
        `}>
          {dataPoint.label}: {dataPoint.value.toFixed(1)}
        </div>
      </Html>
    </group>
  );
}

// Main 3D scene with data visualization
function DataScene({ 
  data, 
  onDataPointClick,
  selectedDataPoint 
}: {
  data: DataPoint[];
  onDataPointClick: (dataPoint: DataPoint) => void;
  selectedDataPoint: DataPoint | null;
}) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -5]} intensity={0.5} color="#3b82f6" />
      
      {/* Grid floor */}
      <gridHelper args={[20, 10, '#333333', '#666666']} position={[0, -3, 0]} />
      
      {/* Data visualization */}
      {data.map((dataPoint) => (
        <DataCube
          key={dataPoint.id}
          dataPoint={dataPoint}
          onClick={onDataPointClick}
          isSelected={selectedDataPoint?.id === dataPoint.id}
        />
      ))}
      
      {/* Title */}
      <Text
        position={[0, 8, 0]}
        fontSize={1}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        Synthetic Data Generation Analytics
      </Text>
      
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={50}
        maxPolarAngle={Math.PI / 2}
      />
    </>
  );
}

// Main component interface
interface DataVisualization3DProps {
  className?: string;
  title?: string;
  data?: DataPoint[];
  onDataPointSelect?: (dataPoint: DataPoint | null) => void;
}

export default function DataVisualization3D({
  className = "",
  title = "Data Visualization",
  data,
  onDataPointSelect
}: DataVisualization3DProps) {
  const [selectedDataPoint, setSelectedDataPoint] = useState<DataPoint | null>(null);

  // Sample data if none provided
  const defaultData: DataPoint[] = useMemo(() => [
    {
      id: '1',
      value: 2.5,
      label: 'Generated Rows',
      color: '#3b82f6',
      position: [-6, 0, -3]
    },
    {
      id: '2', 
      value: 1.8,
      label: 'Processing Speed',
      color: '#10b981',
      position: [-3, 0, -1]
    },
    {
      id: '3',
      value: 3.2,
      label: 'Data Quality',
      color: '#f59e0b',
      position: [0, 0, 1]
    },
    {
      id: '4',
      value: 2.1,
      label: 'Model Accuracy',
      color: '#ef4444',
      position: [3, 0, -2]
    },
    {
      id: '5',
      value: 2.8,
      label: 'User Satisfaction',
      color: '#8b5cf6',
      position: [6, 0, 0]
    }
  ], []);

  const visualizationData = data || defaultData;

  const handleDataPointClick = (dataPoint: DataPoint) => {
    const newSelection = selectedDataPoint?.id === dataPoint.id ? null : dataPoint;
    setSelectedDataPoint(newSelection);
    onDataPointSelect?.(newSelection);
  };

  return (
    <div className={`w-full h-96 bg-gradient-to-br from-gray-900 to-black rounded-lg overflow-hidden ${className}`}>
      <Canvas
        camera={{ position: [10, 5, 10], fov: 60 }}
        gl={{ 
          alpha: true, 
          antialias: true,
          powerPreference: "high-performance"
        }}
        dpr={[1, 2]}
      >
        <DataScene
          data={visualizationData}
          onDataPointClick={handleDataPointClick}
          selectedDataPoint={selectedDataPoint}
        />
      </Canvas>
      
      {/* Info panel */}
      {selectedDataPoint && (
        <div className="absolute top-4 left-4 bg-black/80 text-white p-4 rounded-lg max-w-xs">
          <h3 className="font-semibold text-lg mb-2">{selectedDataPoint.label}</h3>
          <p className="text-sm text-gray-300 mb-1">Value: {selectedDataPoint.value.toFixed(2)}</p>
          <p className="text-xs text-gray-400">Click elsewhere to deselect</p>
        </div>
      )}
    </div>
  );
}

// Export types for external use
export type { DataPoint, DataVisualization3DProps }; 