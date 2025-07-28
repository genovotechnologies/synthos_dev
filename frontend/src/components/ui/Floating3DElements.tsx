"use client";

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';

interface Floating3DElementsProps {
  className?: string;
  elementCount?: number;
  theme?: string;
}

class FloatingElementsEngine {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  private elements: THREE.Mesh[] = [];
  private clock: THREE.Clock;
  private isDestroyed: boolean = false;
  private theme: string = 'dark';
  private mousePosition: { x: number; y: number } = { x: 0, y: 0 };

  constructor(container: HTMLElement, elementCount: number = 25, theme: string = 'dark') {
    this.container = container;
    this.theme = theme;
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
    this.createFloatingElements(elementCount);
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
    this.renderer.domElement.style.zIndex = '0';
  }

  private setupCamera() {
    this.camera.position.set(0, 0, 15);
    this.camera.lookAt(0, 0, 0);
  }

  private setupLights() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(ambientLight);

    // Directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    this.scene.add(directionalLight);

    // Point lights for dramatic effect
    const light1 = new THREE.PointLight(0x0066ff, 0.6, 30);
    light1.position.set(-10, 10, 10);
    this.scene.add(light1);

    const light2 = new THREE.PointLight(0xff6600, 0.6, 30);
    light2.position.set(10, -10, -10);
    this.scene.add(light2);

    // Additional colored lights for more dynamic lighting
    const light3 = new THREE.PointLight(0x00ff88, 0.4, 25);
    light3.position.set(0, 15, 5);
    this.scene.add(light3);

    const light4 = new THREE.PointLight(0xff0088, 0.4, 25);
    light4.position.set(0, -15, -5);
    this.scene.add(light4);

    // Light mode specific lights
    if (this.theme === 'light') {
      const light5 = new THREE.PointLight(0x4f46e5, 0.3, 20);
      light5.position.set(15, 0, 10);
      this.scene.add(light5);

      const light6 = new THREE.PointLight(0x06b6d4, 0.3, 20);
      light6.position.set(-15, 0, -10);
      this.scene.add(light6);
    }
  }

  private createFloatingElements(count: number) {
    const shapes = [
      // Basic shapes
      () => new THREE.BoxGeometry(1, 1, 1),
      () => new THREE.SphereGeometry(0.5, 16, 16),
      () => new THREE.ConeGeometry(0.5, 1, 8),
      () => new THREE.TorusGeometry(0.5, 0.2, 8, 16),
      () => new THREE.OctahedronGeometry(0.5),
      () => new THREE.TetrahedronGeometry(0.5),
      () => new THREE.DodecahedronGeometry(0.4),
      () => new THREE.IcosahedronGeometry(0.4),
      
      // Special shapes - non-circular
      () => new THREE.BoxGeometry(0.8, 0.3, 0.8), // Flat box
      () => new THREE.ConeGeometry(0.4, 0.8, 6), // Hexagonal cone
      () => new THREE.TorusGeometry(0.3, 0.1, 6, 12), // Hexagonal torus
      () => new THREE.BoxGeometry(0.6, 0.6, 0.2), // Thin box
      () => new THREE.ConeGeometry(0.3, 0.6, 4), // Square cone
      () => new THREE.TorusGeometry(0.4, 0.15, 4, 8), // Square torus
      () => new THREE.BoxGeometry(0.4, 0.8, 0.4), // Tall box
      () => new THREE.ConeGeometry(0.5, 1.2, 10), // Decagonal cone
      
      // Database and table-related shapes
      () => new THREE.BoxGeometry(1.2, 0.8, 0.6), // Database server
      () => new THREE.CylinderGeometry(0.3, 0.3, 1.5, 8), // Database column
      () => new THREE.BoxGeometry(0.8, 0.2, 0.8), // Table row
      () => new THREE.BoxGeometry(0.2, 0.8, 0.8), // Table column
      () => new THREE.BoxGeometry(0.6, 0.6, 0.1), // Data sheet
      () => new THREE.CylinderGeometry(0.2, 0.4, 0.8, 6), // Data funnel
      () => new THREE.BoxGeometry(0.4, 0.4, 0.4), // Data cube
      () => new THREE.SphereGeometry(0.3, 8, 6), // Data node
      () => new THREE.BoxGeometry(1.0, 0.3, 0.3), // Data bar
      () => new THREE.ConeGeometry(0.2, 0.6, 4), // Data spike
      () => new THREE.TorusGeometry(0.2, 0.05, 4, 8), // Data ring
      () => new THREE.BoxGeometry(0.3, 0.3, 1.0), // Data pillar
      () => new THREE.CylinderGeometry(0.1, 0.1, 1.2, 4), // Data wire
      () => new THREE.BoxGeometry(0.8, 0.1, 0.8), // Data plane
      () => new THREE.SphereGeometry(0.25, 6, 4), // Data point
    ];

    for (let i = 0; i < count; i++) {
      const shapeIndex = i % shapes.length;
      const geometry = shapes[shapeIndex]();
      
      // Create material with different colors based on theme
      const material = new THREE.MeshPhongMaterial({
        color: this.getColorForIndex(i),
        transparent: true,
        opacity: this.theme === 'light' ? 0.9 : 0.8,
        shininess: 120,
        specular: 0x444444
      });

      const element = new THREE.Mesh(geometry, material);
      
      // Random position with better distribution
      element.position.x = (Math.random() - 0.5) * 35;
      element.position.y = (Math.random() - 0.5) * 35;
      element.position.z = (Math.random() - 0.5) * 25;

      // Store animation data with more complex parameters
      element.userData = {
        originalPosition: element.position.clone(),
        rotationSpeed: {
          x: (Math.random() - 0.5) * 0.05,
          y: (Math.random() - 0.5) * 0.05,
          z: (Math.random() - 0.5) * 0.05
        },
        floatSpeed: Math.random() * 0.025 + 0.012,
        floatAmplitude: Math.random() * 1.5 + 0.5,
        orbitRadius: Math.random() * 4 + 1,
        orbitSpeed: Math.random() * 0.035 + 0.018,
        scaleSpeed: Math.random() * 0.035 + 0.018,
        phase: Math.random() * Math.PI * 2,
        type: shapeIndex,
        isDataShape: shapeIndex >= 16 // Database and table shapes
      };

      this.elements.push(element);
      this.scene.add(element);
    }
  }

  private getColorForIndex(index: number): number {
    const colors = this.theme === 'dark' ? [
      0x3b82f6, // blue
      0xef4444, // red
      0x10b981, // green
      0xf59e0b, // yellow
      0x8b5cf6, // purple
      0x06b6d4, // cyan
      0xf97316, // orange
      0xec4899, // pink
      0x84cc16, // lime
      0x6366f1, // indigo
      0x14b8a6, // teal
      0xf43f5e, // rose
      0x06b6d4, // cyan
      0x8b5cf6, // purple
      0x10b981, // green
    ] : [
      0x1d4ed8, // darker blue
      0xdc2626, // darker red
      0x059669, // darker green
      0xd97706, // darker yellow
      0x7c3aed, // darker purple
      0x0891b2, // darker cyan
      0xea580c, // darker orange
      0xdb2777, // darker pink
      0x65a30d, // darker lime
      0x4f46e5, // darker indigo
      0x0f766e, // darker teal
      0xe11d48, // darker rose
      0x0891b2, // darker cyan
      0x7c3aed, // darker purple
      0x059669, // darker green
    ];
    return colors[index % colors.length];
  }

  private setupEventListeners() {
    const handleResize = this.onWindowResize.bind(this);
    const handleMouseMove = this.onMouseMove.bind(this);
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    
    this.handleResize = handleResize;
    this.handleMouseMove = handleMouseMove;
  }

  private onWindowResize() {
    if (this.isDestroyed) return;
    
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  private onMouseMove(event: MouseEvent) {
    this.mousePosition.x = (event.clientX / window.innerWidth - 0.5) * 2;
    this.mousePosition.y = (event.clientY / window.innerHeight - 0.5) * 2;
  }

  public animate() {
    if (this.isDestroyed) return;
    
    const time = this.clock.getElapsedTime();

    // Animate elements with more complex movements
    this.elements.forEach((element, index) => {
      const data = element.userData;
      
      // Complex floating animation with multiple sine waves
      const floatY = Math.sin(time * data.floatSpeed + data.phase) * data.floatAmplitude;
      const floatX = Math.cos(time * data.floatSpeed * 0.7 + data.phase) * data.floatAmplitude * 0.6;
      const floatZ = Math.sin(time * data.floatSpeed * 0.5 + data.phase) * data.floatAmplitude * 0.4;
      
      element.position.y = data.originalPosition.y + floatY;
      element.position.x = data.originalPosition.x + floatX;
      element.position.z = data.originalPosition.z + floatZ;
      
      // Enhanced rotation with varying speeds based on shape type
      const rotationMultiplier = data.isDataShape ? 2.0 : data.type >= 8 ? 1.5 : 1; // Data shapes rotate fastest
      element.rotation.x += data.rotationSpeed.x * rotationMultiplier * (1 + Math.sin(time * 0.5) * 0.3);
      element.rotation.y += data.rotationSpeed.y * rotationMultiplier * (1 + Math.cos(time * 0.7) * 0.3);
      element.rotation.z += data.rotationSpeed.z * rotationMultiplier * (1 + Math.sin(time * 0.3) * 0.3);
      
      // Dynamic scale animation - data shapes pulse more
      const scaleMultiplier = data.isDataShape ? 1.3 : 1;
      const scale = 1 + Math.sin(time * data.scaleSpeed + data.phase) * 0.2 * scaleMultiplier;
      element.scale.set(scale, scale, scale);
      
      // Orbit around center with mouse interaction
      const orbitX = Math.cos(time * data.orbitSpeed + data.phase) * data.orbitRadius;
      const orbitY = Math.sin(time * data.orbitSpeed + data.phase) * data.orbitRadius;
      
      element.position.x += orbitX * 0.15;
      element.position.y += orbitY * 0.15;
      
      // Mouse interaction - elements slightly follow mouse
      const mouseSensitivity = data.isDataShape ? 1.2 : 0.8; // Data shapes are more responsive
      element.position.x += this.mousePosition.x * mouseSensitivity;
      element.position.y -= this.mousePosition.y * mouseSensitivity;
    });

    // Enhanced camera movement
    this.camera.position.x = Math.sin(time * 0.1) * 4 + Math.sin(time * 0.05) * 2;
    this.camera.position.y = Math.cos(time * 0.15) * 3 + Math.cos(time * 0.08) * 1;
    this.camera.position.z = 15 + Math.sin(time * 0.12) * 3;
    this.camera.lookAt(0, 0, 0);

    this.renderer.render(this.scene, this.camera);
  }

  public updateTheme(newTheme: string) {
    this.theme = newTheme;
    // Update element colors based on new theme
    this.elements.forEach((element, index) => {
      if (element.material && !Array.isArray(element.material)) {
        const material = element.material as THREE.MeshPhongMaterial;
        material.color.setHex(this.getColorForIndex(index));
        material.opacity = newTheme === 'light' ? 0.9 : 0.8;
      }
    });
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
    this.elements.forEach(element => {
      if (element.geometry) element.geometry.dispose();
      if (element.material && Array.isArray(element.material)) {
        element.material.forEach(mat => mat.dispose());
      } else if (element.material) {
        (element.material as THREE.Material).dispose();
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

  private handleResize: (() => void) | null = null;
  private handleMouseMove: (() => void) | null = null;
}

export default function Floating3DElements({
  className = "",
  elementCount = 50,
  theme = 'dark'
}: Floating3DElementsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<FloatingElementsEngine | null>(null);
  const animationFrameRef = useRef<number>();
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!containerRef.current) return;

    try {
      // Create floating elements engine
      engineRef.current = new FloatingElementsEngine(containerRef.current, elementCount, resolvedTheme || theme);
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
      console.error('Floating elements initialization error:', error);
      setError('Failed to initialize floating elements');
      setIsLoaded(false);
    }
  }, [elementCount, resolvedTheme, theme]);

  // Update theme when it changes
  useEffect(() => {
    if (engineRef.current && resolvedTheme) {
      engineRef.current.updateTheme(resolvedTheme);
    }
  }, [resolvedTheme]);

  // Fallback for when Three.js fails or is not supported
  if (error || !isLoaded) {
    return (
      <div className={`absolute inset-0 ${className}`}>
        <div className="w-full h-full">
          {/* Animated gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-indigo-500/5 animate-pulse" />
          
          {/* Enhanced floating CSS elements */}
          <div className="absolute inset-0 overflow-hidden">
            {Array.from({ length: 50 }).map((_, i) => (
              <motion.div
                key={i}
                className={`absolute rounded-full ${
                  i % 4 === 0 ? 'w-3 h-3' : i % 3 === 0 ? 'w-2 h-2' : 'w-1 h-1'
                } ${
                  i % 6 === 0 ? 'bg-gradient-to-r from-blue-400/50 to-cyan-400/50' :
                  i % 6 === 1 ? 'bg-gradient-to-r from-purple-400/50 to-pink-400/50' :
                  i % 6 === 2 ? 'bg-gradient-to-r from-green-400/50 to-emerald-400/50' :
                  i % 6 === 3 ? 'bg-gradient-to-r from-orange-400/50 to-red-400/50' :
                  i % 6 === 4 ? 'bg-gradient-to-r from-indigo-400/50 to-blue-400/50' :
                  'bg-gradient-to-r from-teal-400/50 to-cyan-400/50'
                }`}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  y: [0, -50, 0],
                  x: [0, Math.random() * 40 - 20, 0],
                  opacity: [0.3, 0.9, 0.3],
                  scale: [1, 1.4, 1],
                  rotate: [0, 360],
                }}
                transition={{
                  duration: 6 + Math.random() * 4,
                  repeat: Infinity,
                  delay: Math.random() * 3,
                  ease: "easeInOut"
                }}
              />
            ))}
            
            {/* Database-themed special elements */}
            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div
                key={`data-${i}`}
                className={`absolute ${
                  i % 5 === 0 ? 'w-4 h-2 bg-gradient-to-r from-blue-500/60 to-purple-500/60 rounded-sm' : // Table row
                  i % 5 === 1 ? 'w-2 h-4 bg-gradient-to-r from-green-500/60 to-emerald-500/60 rounded-sm' : // Table column
                  i % 5 === 2 ? 'w-3 h-3 bg-gradient-to-r from-orange-500/60 to-red-500/60 transform rotate-45' : // Data cube
                  i % 5 === 3 ? 'w-2 h-6 bg-gradient-to-r from-indigo-500/60 to-blue-500/60 rounded-lg' : // Database column
                  'w-6 h-2 bg-gradient-to-r from-teal-500/60 to-cyan-500/60 rounded-sm' // Data bar
                }`}
                style={{
                  left: `${15 + (i * 5)}%`,
                  top: `${20 + (i * 4)}%`,
                }}
                animate={{
                  y: [0, -60, 0],
                  x: [0, Math.random() * 50 - 25, 0],
                  opacity: [0.4, 0.8, 0.4],
                  scale: [1, 1.5, 1],
                  rotate: [0, 180, 360],
                }}
                transition={{
                  duration: 8 + Math.random() * 3,
                  repeat: Infinity,
                  delay: Math.random() * 4,
                  ease: "easeInOut"
                }}
              />
            ))}
            
            {/* Additional data schema elements */}
            {Array.from({ length: 15 }).map((_, i) => (
              <motion.div
                key={`schema-${i}`}
                className={`absolute ${
                  i % 4 === 0 ? 'w-3 h-3 bg-gradient-to-r from-yellow-500/50 to-orange-500/50 rounded-full' : // Data node
                  i % 4 === 1 ? 'w-4 h-1 bg-gradient-to-r from-pink-500/50 to-red-500/50 rounded-full' : // Data wire
                  i % 4 === 2 ? 'w-1 h-4 bg-gradient-to-r from-cyan-500/50 to-blue-500/50 rounded-full' : // Data pillar
                  'w-2 h-2 bg-gradient-to-r from-lime-500/50 to-green-500/50 rounded-sm' // Data point
                }`}
                style={{
                  left: `${25 + (i * 6)}%`,
                  top: `${35 + (i * 5)}%`,
                }}
                animate={{
                  y: [0, -40, 0],
                  x: [0, Math.random() * 30 - 15, 0],
                  opacity: [0.3, 0.7, 0.3],
                  scale: [1, 1.3, 1],
                  rotate: [0, 90, 180, 270, 360],
                }}
                transition={{
                  duration: 7 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 5,
                  ease: "easeInOut"
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className={`absolute inset-0 ${className}`}
    />
  );
} 