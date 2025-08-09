"use client";

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useTheme } from 'next-themes';
import ErrorBoundary from './ErrorBoundary';
import { BarChart3, TrendingUp, Activity, Database } from "lucide-react";
import * as THREE from 'three';

// Enhanced 3D Data Visualization Component
class DataVisualization3DEngine {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  private data: any[];
  private bars: THREE.Mesh[] = [];
  private clock: THREE.Clock;
  private isDestroyed: boolean = false;
  private handleResize: (() => void) | null = null;
  private handleMouseMove: (() => void) | null = null;

  constructor(container: HTMLElement, data: any[]) {
    this.container = container;
    this.data = data;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: "high-performance"
    });
    this.clock = new THREE.Clock();

    this.setupRenderer();
    this.setupCamera();
    this.setupLights();
    this.createDataVisualization();
    this.setupEventListeners();
  }

  private setupRenderer() {
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);
    
    // Style the canvas
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.top = '0';
    this.renderer.domElement.style.left = '0';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.pointerEvents = 'none';
  }

  private setupCamera() {
    this.camera.position.set(0, 5, 10);
    this.camera.lookAt(0, 0, 0);
  }

  private setupLights() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    this.scene.add(ambientLight);

    // Directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    this.scene.add(directionalLight);

    // Point lights for dramatic effect
    const light1 = new THREE.PointLight(0x0066ff, 0.5, 20);
    light1.position.set(-5, 5, 5);
    this.scene.add(light1);

    const light2 = new THREE.PointLight(0xff6600, 0.5, 20);
    light2.position.set(5, -5, -5);
    this.scene.add(light2);
  }

  private createDataVisualization() {
    if (!this.data || this.data.length === 0) return;

    const maxValue = Math.max(...this.data.map(d => typeof d.value === 'number' ? d.value : 0));
    const barWidth = 0.8;
    const barSpacing = 1.2;
    const totalWidth = (this.data.length - 1) * barSpacing;
    const startX = -totalWidth / 2;

    this.data.forEach((item, index) => {
      const value = typeof item.value === 'number' ? item.value : Math.random();
      const normalizedValue = maxValue > 0 ? value / maxValue : 0;
      const height = Math.max(0.1, normalizedValue * 8);

      // Create bar geometry
      const geometry = new THREE.BoxGeometry(barWidth, height, barWidth);
      
      // Create material with gradient effect
      const material = new THREE.MeshPhongMaterial({
        color: this.getColorForIndex(index),
        transparent: true,
        opacity: 0.8,
        shininess: 100
      });

      const bar = new THREE.Mesh(geometry, material);
      
      // Position bars
      bar.position.x = startX + index * barSpacing;
      bar.position.y = height / 2;
      bar.position.z = 0;

      // Store original position for animations
      bar.userData = {
        originalY: bar.position.y,
        targetY: bar.position.y,
        originalHeight: height,
        value: value
      };

      this.bars.push(bar);
      this.scene.add(bar);

      // Add value label (optional)
      this.createValueLabel(bar, value, index);
    });

    // Add grid
    this.createGrid();
  }

  private createValueLabel(bar: THREE.Mesh, value: number, index: number) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 256;
    canvas.height = 64;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(value.toFixed(2), canvas.width / 2, canvas.height / 2 + 8);
    
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    
    sprite.position.set(bar.position.x, bar.position.y + bar.userData.originalHeight / 2 + 1, 0);
    sprite.scale.set(2, 0.5, 1);
    
    this.scene.add(sprite);
  }

  private createGrid() {
    const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
    gridHelper.position.y = -0.1;
    this.scene.add(gridHelper);
  }

  private getColorForIndex(index: number): number {
    const colors = [
      0x3b82f6, // blue
      0xef4444, // red
      0x10b981, // green
      0xf59e0b, // yellow
      0x8b5cf6, // purple
      0x06b6d4, // cyan
      0xf97316, // orange
      0xec4899, // pink
    ];
    return colors[index % colors.length];
  }

  private setupEventListeners() {
    const handleResize = this.onWindowResize.bind(this);
    window.addEventListener('resize', handleResize);
    this.handleResize = handleResize;
  }

  private onWindowResize() {
    if (this.isDestroyed) return;
    
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  public animate() {
    if (this.isDestroyed) return;
    
    const time = this.clock.getElapsedTime();

    // Animate bars
    this.bars.forEach((bar, index) => {
      // Gentle floating animation
      bar.position.y = bar.userData.originalY + Math.sin(time * 2 + index * 0.5) * 0.1;
      
      // Rotate bars slightly
      bar.rotation.y = Math.sin(time * 0.5 + index * 0.3) * 0.1;
      
      // Pulse effect
      const scale = 1 + Math.sin(time * 3 + index * 0.2) * 0.05;
      bar.scale.set(scale, scale, scale);
    });

    // Rotate camera slowly
    this.camera.position.x = Math.sin(time * 0.2) * 8;
    this.camera.position.z = Math.cos(time * 0.2) * 8 + 8;
    this.camera.lookAt(0, 0, 0);

    this.renderer.render(this.scene, this.camera);
  }

  public dispose() {
    this.isDestroyed = true;
    
    // Remove event listeners
    if (this.handleResize) {
      window.removeEventListener('resize', this.handleResize);
    }
    if (this.handleMouseMove) {
      window.removeEventListener('mousemove', this.handleMouseMove);
    }
    
    // Dispose of Three.js objects
    this.bars.forEach(bar => {
      if (bar.geometry) bar.geometry.dispose();
      if (bar.material && Array.isArray(bar.material)) {
        bar.material.forEach(mat => mat.dispose());
      } else if (bar.material) {
        (bar.material as THREE.Material).dispose();
      }
    });
    
    if (this.renderer) {
      this.renderer.dispose();
    }
    
    // Remove canvas from DOM
    if (this.renderer && this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }

  public getDestroyed(): boolean {
    return this.isDestroyed;
  }
}

// Enhanced 2D Fallback visualization
function Fallback2D({ data, className }: { data: any[], className?: string }) {
  const { theme } = useTheme();
  
  return (
    <div className={`relative w-full h-full bg-gradient-to-br from-background via-background to-primary/5 ${className}`}>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="grid grid-cols-6 gap-4 p-8">
          {data.slice(0, 36).map((item, index) => {
            const value = typeof item === 'number' ? item : (typeof item.value === 'number' ? item.value : Math.random());
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
  data = [],
  className = "",
  height = "400px",
  interactive = true,
  quality = 'medium'
}: DataVisualization3DProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<DataVisualization3DEngine | null>(null);
  const animationFrameRef = useRef<number>();
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();

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
    
    // Generate sample data if no data provided
    return Array.from({ length: 12 }, (_, i) => ({
      value: Math.random() * 0.8 + 0.2,
      label: `Dataset ${i + 1}`,
      category: ['Analytics', 'Sales', 'Marketing', 'Support'][i % 4],
      timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
    }));
  }, [data]);

  useEffect(() => {
    if (!containerRef.current || enrichedData.length === 0) return;

    try {
      // Create 3D visualization engine
      engineRef.current = new DataVisualization3DEngine(containerRef.current, enrichedData);
      setIsLoaded(true);
      setError(null);

      // Animation loop
      const animate = () => {
        if (engineRef.current && !engineRef.current.getDestroyed()) {
          engineRef.current.animate();
        }
        animationFrameRef.current = requestAnimationFrame(animate);
      };

      animate();

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        if (engineRef.current) {
          engineRef.current.dispose();
        }
      };
    } catch (error) {
      console.error('3D visualization initialization error:', error);
      setError('Failed to initialize 3D visualization');
      setIsLoaded(false);
    }
  }, [enrichedData]);

  // Render the component
  const renderComponent = (): JSX.Element => {
    if (enrichedData.length === 0) {
      return (
        <div className={`relative overflow-hidden rounded-xl ${className}`} style={{ height }}>
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <Database className="h-16 w-16 mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">No data available for visualization.</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <ErrorBoundary fallback={() => <Fallback2D data={enrichedData} className={className} />}>
        <div className={`relative overflow-hidden rounded-xl ${className}`} style={{ height }}>
          {error || !isLoaded ? (
            <Fallback2D data={enrichedData} className={className} />
          ) : (
            <div ref={containerRef} className="w-full h-full" />
          )}
          
          {/* Overlay with data info */}
          <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg p-3 text-white">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4" />
              <span className="text-sm font-medium">Live Data</span>
            </div>
            <div className="text-xs text-gray-300 mt-1">
              {enrichedData.length} data points
            </div>
          </div>
        </div>
      </ErrorBoundary>
    );
  };

  return renderComponent();
}
