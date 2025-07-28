"use client";

import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';

interface ThreeBackgroundProps {
  className?: string;
  interactive?: boolean;
  quality?: 'low' | 'medium' | 'high';
  theme?: string;
  particleCount?: number;
}

// Enhanced particle system with better performance and visual effects
class ParticleSystem {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  private particles!: THREE.Points;
  private geometry!: THREE.BufferGeometry;
  private material!: THREE.PointsMaterial;
  private positions!: Float32Array;
  private colors!: Float32Array;
  private velocities!: Float32Array;
  private sizes!: Float32Array;
  private mouse: THREE.Vector2;
  private raycaster: THREE.Raycaster;
  private clock: THREE.Clock;
  private isDestroyed: boolean = false;
  private handleResize: (() => void) | null = null;
  private handleMouseMove: ((event: MouseEvent) => void) | null = null;

  constructor(container: HTMLElement, particleCount: number = 8000) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: "high-performance",
      stencil: false,
      depth: false
    });
    this.mouse = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.clock = new THREE.Clock();

    this.setupRenderer();
    this.setupCamera();
    this.setupParticles(particleCount);
    this.setupLights();
    this.setupEventListeners();
  }

  private setupRenderer() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
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
    this.renderer.domElement.style.zIndex = '-1';
  }

  private setupCamera() {
    this.camera.position.z = 50;
    this.camera.fov = 60;
    this.camera.updateProjectionMatrix();
  }

  private setupParticles(count: number) {
    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    this.velocities = new Float32Array(count * 3);
    this.sizes = new Float32Array(count);

    // Create particles in multiple layers for depth
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      // Create different distribution patterns
      let x, y, z;
      
      if (i < count * 0.3) {
        // Spherical distribution
        const radius = Math.random() * 60 + 20;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        
        x = radius * Math.sin(phi) * Math.cos(theta);
        y = radius * Math.sin(phi) * Math.sin(theta);
        z = radius * Math.cos(phi);
      } else if (i < count * 0.6) {
        // Cylindrical distribution
        const radius = Math.random() * 40 + 10;
        const angle = Math.random() * Math.PI * 2;
        const height = (Math.random() - 0.5) * 80;
        
        x = radius * Math.cos(angle);
        y = radius * Math.sin(angle);
        z = height;
      } else {
        // Random distribution
        x = (Math.random() - 0.5) * 100;
        y = (Math.random() - 0.5) * 100;
        z = (Math.random() - 0.5) * 100;
      }
      
      this.positions[i3] = x;
      this.positions[i3 + 1] = y;
      this.positions[i3 + 2] = z;

      // Smooth velocities
      this.velocities[i3] = (Math.random() - 0.5) * 0.05;
      this.velocities[i3 + 1] = (Math.random() - 0.5) * 0.05;
      this.velocities[i3 + 2] = (Math.random() - 0.5) * 0.05;

      // Enhanced color scheme
      const hue = (i / count) * 360;
      const saturation = 0.7 + Math.random() * 0.3;
      const lightness = 0.5 + Math.random() * 0.3;
      const rgb = this.hslToRgb(hue / 360, saturation, lightness);
      
      this.colors[i3] = rgb[0] / 255;
      this.colors[i3 + 1] = rgb[1] / 255;
      this.colors[i3 + 2] = rgb[2] / 255;

      // Varied sizes
      this.sizes[i] = Math.random() * 3 + 0.5;
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    this.material = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      map: this.createParticleTexture()
    });

    this.particles = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.particles);
  }

  private createParticleTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    
    // Create gradient particle
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private setupLights() {
    // Ambient light for overall illumination
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    this.scene.add(ambientLight);

    // Multiple colored point lights for dynamic effect
    const light1 = new THREE.PointLight(0x0066ff, 1, 100);
    light1.position.set(30, 30, 30);
    this.scene.add(light1);

    const light2 = new THREE.PointLight(0xff6600, 0.8, 100);
    light2.position.set(-30, -30, -30);
    this.scene.add(light2);

    const light3 = new THREE.PointLight(0x00ff66, 0.6, 100);
    light3.position.set(0, 50, 0);
    this.scene.add(light3);
  }

  private setupEventListeners() {
    const handleResize = this.onWindowResize.bind(this);
    const handleMouseMove = this.onMouseMove.bind(this);
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    
    // Store references for cleanup
    this.handleResize = handleResize;
    this.handleMouseMove = handleMouseMove;
  }

  private onWindowResize() {
    if (this.isDestroyed) return;
    
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onMouseMove(event: MouseEvent) {
    if (this.isDestroyed) return;
    
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  private hslToRgb(h: number, s: number, l: number): [number, number, number] {
    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  public animate() {
    if (this.isDestroyed) return;
    
    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    // Update particle positions with smooth movement
    for (let i = 0; i < this.positions.length; i += 3) {
      this.positions[i] += this.velocities[i] * delta * 15;
      this.positions[i + 1] += this.velocities[i + 1] * delta * 15;
      this.positions[i + 2] += this.velocities[i + 2] * delta * 15;

      // Wrap around boundaries with smooth transition
      if (Math.abs(this.positions[i]) > 120) {
        this.positions[i] *= -0.95;
        this.velocities[i] *= 0.9;
      }
      if (Math.abs(this.positions[i + 1]) > 120) {
        this.positions[i + 1] *= -0.95;
        this.velocities[i + 1] *= 0.9;
      }
      if (Math.abs(this.positions[i + 2]) > 120) {
        this.positions[i + 2] *= -0.95;
        this.velocities[i + 2] *= 0.9;
      }
    }

    // Update geometry
    this.geometry.attributes.position.needsUpdate = true;

    // Smooth camera rotation based on mouse
    this.particles.rotation.x += (this.mouse.y * 0.3 - this.particles.rotation.x) * 0.02;
    this.particles.rotation.y += (this.mouse.x * 0.3 - this.particles.rotation.y) * 0.02;

    // Add subtle automatic rotation
    this.particles.rotation.z = Math.sin(time * 0.05) * 0.05;

    // Animate lights
    const light1 = this.scene.children.find(child => child instanceof THREE.PointLight && child.position.x > 0);
    const light2 = this.scene.children.find(child => child instanceof THREE.PointLight && child.position.x < 0);
    
    if (light1 && light2) {
      (light1 as THREE.PointLight).position.x = Math.sin(time * 0.5) * 40;
      (light1 as THREE.PointLight).position.y = Math.cos(time * 0.3) * 40;
      (light2 as THREE.PointLight).position.x = Math.sin(time * 0.7) * -40;
      (light2 as THREE.PointLight).position.y = Math.cos(time * 0.4) * -40;
    }

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
    if (this.renderer) {
      this.renderer.dispose();
    }
    if (this.geometry) {
      this.geometry.dispose();
    }
    if (this.material) {
      this.material.dispose();
    }
    if (this.material.map) {
      this.material.map.dispose();
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

export default function ThreeBackground({
  className = "",
  interactive = true,
  quality = 'high',
  theme = 'dark',
  particleCount = 8000
}: ThreeBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const particleSystemRef = useRef<ParticleSystem | null>(null);
  const animationFrameRef = useRef<number>();
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    try {
      // Create particle system
      particleSystemRef.current = new ParticleSystem(containerRef.current, particleCount);
      setIsLoaded(true);
      setError(null);

      // Animation loop
      const animate = () => {
        if (particleSystemRef.current && !particleSystemRef.current.getDestroyed()) {
          particleSystemRef.current.animate();
        }
        animationFrameRef.current = requestAnimationFrame(animate);
      };

      animate();

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        if (particleSystemRef.current) {
          particleSystemRef.current.dispose();
        }
      };
    } catch (error) {
      console.error('Three.js initialization error:', error);
      setError('Failed to initialize 3D background');
      setIsLoaded(false);
    }
  }, [particleCount]);

  // Fallback for when Three.js fails or is not supported
  if (error || !isLoaded) {
    return (
      <div className={`fixed inset-0 -z-10 ${className}`}>
        <div 
          className="w-full h-full"
          style={{ 
            background: theme === 'dark' 
              ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)'
              : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)'
          }}
        >
          {/* Theme-aware gradient overlay */}
          <div className={`absolute inset-0 ${
            theme === 'dark' 
              ? 'bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-indigo-500/10' 
              : 'bg-gradient-to-br from-blue-400/5 via-indigo-400/5 to-purple-400/5'
          } animate-pulse`} />
          
          {/* Floating particles effect */}
          <div className="absolute inset-0 overflow-hidden">
            {Array.from({ length: 50 }).map((_, i) => (
              <div
                key={i}
                className={`absolute w-1 h-1 rounded-full animate-pulse ${
                  theme === 'dark' ? 'bg-white/20' : 'bg-blue-500/30'
                }`}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${2 + Math.random() * 3}s`
                }}
              />
            ))}
          </div>
          
          {/* Additional animated shapes for light mode */}
          {theme === 'light' && (
            <div className="absolute inset-0 overflow-hidden">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={`shape-${i}`}
                  className="absolute rounded-full bg-gradient-to-r from-blue-400/20 to-indigo-400/20 animate-pulse"
                  style={{
                    left: `${20 + (i * 10)}%`,
                    top: `${30 + (i * 8)}%`,
                    width: `${100 + i * 20}px`,
                    height: `${100 + i * 20}px`,
                    animationDelay: `${i * 0.5}s`,
                    animationDuration: `${4 + i}s`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className={`fixed inset-0 -z-10 ${className}`}
    />
  );
} 