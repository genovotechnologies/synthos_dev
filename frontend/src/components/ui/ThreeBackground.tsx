'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function ThreeBackground() {
  const mountRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene>()
  const rendererRef = useRef<THREE.WebGLRenderer>()
  const animationRef = useRef<number>()

  useEffect(() => {
    if (!mountRef.current) return

    // Scene setup
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor(0x000000, 0)
    mountRef.current.appendChild(renderer.domElement)
    
    sceneRef.current = scene
    rendererRef.current = renderer

    // Create animated geometry groups
    const geometryGroup = new THREE.Group()
    const particleGroup = new THREE.Group()
    scene.add(geometryGroup, particleGroup)

    // Animated geometric shapes
    const shapes: THREE.Mesh[] = []
    
    // Floating cubes with different materials
    for (let i = 0; i < 8; i++) {
      const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5)
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(i * 0.125, 0.6, 0.5),
        transparent: true,
        opacity: 0.3,
        wireframe: true
      })
      const cube = new THREE.Mesh(geometry, material)
      
      cube.position.set(
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20
      )
      
      cube.userData = {
        rotationSpeed: {
          x: (Math.random() - 0.5) * 0.02,
          y: (Math.random() - 0.5) * 0.02,
          z: (Math.random() - 0.5) * 0.02
        },
        orbitRadius: Math.random() * 10 + 5,
        orbitSpeed: (Math.random() - 0.5) * 0.01
      }
      
      shapes.push(cube)
      geometryGroup.add(cube)
    }

    // Floating spheres
    for (let i = 0; i < 6; i++) {
      const geometry = new THREE.SphereGeometry(0.3, 16, 16)
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL((i * 0.167 + 0.5) % 1, 0.8, 0.6),
        transparent: true,
        opacity: 0.4
      })
      const sphere = new THREE.Mesh(geometry, material)
      
      sphere.position.set(
        (Math.random() - 0.5) * 25,
        (Math.random() - 0.5) * 25,
        (Math.random() - 0.5) * 25
      )
      
      sphere.userData = {
        rotationSpeed: {
          x: (Math.random() - 0.5) * 0.03,
          y: (Math.random() - 0.5) * 0.03,
          z: (Math.random() - 0.5) * 0.03
        },
        floatAmplitude: Math.random() * 2 + 1,
        floatSpeed: Math.random() * 0.02 + 0.01
      }
      
      shapes.push(sphere)
      geometryGroup.add(sphere)
    }

    // Particle system
    const particleGeometry = new THREE.BufferGeometry()
    const particleCount = 200
    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)
    const velocities = new Float32Array(particleCount * 3)
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3
      
      positions[i3] = (Math.random() - 0.5) * 50
      positions[i3 + 1] = (Math.random() - 0.5) * 50
      positions[i3 + 2] = (Math.random() - 0.5) * 50
      
      const hue = Math.random()
      const color = new THREE.Color().setHSL(hue, 0.7, 0.8)
      colors[i3] = color.r
      colors[i3 + 1] = color.g
      colors[i3 + 2] = color.b
      
      velocities[i3] = (Math.random() - 0.5) * 0.02
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.02
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.02
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    })
    
    const particles = new THREE.Points(particleGeometry, particleMaterial)
    particleGroup.add(particles)

    // Camera setup
    camera.position.z = 15
    camera.position.y = 5

    // Mouse interaction
    let mouseX = 0
    let mouseY = 0
    
    const handleMouseMove = (event: MouseEvent) => {
      mouseX = (event.clientX / window.innerWidth) * 2 - 1
      mouseY = -(event.clientY / window.innerHeight) * 2 + 1
    }
    
    window.addEventListener('mousemove', handleMouseMove)

    // Animation loop
    const animate = (time: number) => {
      // Animate shapes
      shapes.forEach((shape, index) => {
        const { rotationSpeed, orbitRadius, orbitSpeed, floatAmplitude, floatSpeed } = shape.userData
        
        // Rotation
        shape.rotation.x += rotationSpeed.x
        shape.rotation.y += rotationSpeed.y
        shape.rotation.z += rotationSpeed.z
        
        // Orbital movement for cubes
        if (orbitRadius && orbitSpeed) {
          shape.position.x = Math.cos(time * orbitSpeed + index) * orbitRadius
          shape.position.z = Math.sin(time * orbitSpeed + index) * orbitRadius
        }
        
        // Floating movement for spheres
        if (floatAmplitude && floatSpeed) {
          shape.position.y += Math.sin(time * floatSpeed + index) * 0.01
        }
        
        // Scale pulsing
        const scale = 1 + Math.sin(time * 0.001 + index) * 0.2
        shape.scale.setScalar(scale)
      })

      // Animate particles
      const positions = particles.geometry.attributes.position.array as Float32Array
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3
        
        positions[i3] += velocities[i3]
        positions[i3 + 1] += velocities[i3 + 1]
        positions[i3 + 2] += velocities[i3 + 2]
        
        // Boundary wrapping
        if (Math.abs(positions[i3]) > 25) velocities[i3] *= -1
        if (Math.abs(positions[i3 + 1]) > 25) velocities[i3 + 1] *= -1
        if (Math.abs(positions[i3 + 2]) > 25) velocities[i3 + 2] *= -1
      }
      particles.geometry.attributes.position.needsUpdate = true

      // Camera movement based on mouse and time
      camera.position.x += (mouseX * 2 - camera.position.x) * 0.02
      camera.position.y += (mouseY * 2 - camera.position.y) * 0.02
      
      // Auto camera rotation
      camera.position.x += Math.sin(time * 0.0005) * 0.1
      camera.position.z += Math.cos(time * 0.0003) * 0.1
      camera.lookAt(0, 0, 0)

      // Rotate entire scene slowly
      geometryGroup.rotation.y += 0.002
      particleGroup.rotation.x += 0.001
      particleGroup.rotation.y -= 0.0005

      renderer.render(scene, camera)
      animationRef.current = requestAnimationFrame(animate)
    }

    animate(0)

    // Handle resize
    const handleResize = () => {
      if (!camera || !renderer) return
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }

    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('resize', handleResize)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement)
      }
      renderer.dispose()
    }
  }, [])

  return <div ref={mountRef} className="fixed inset-0 -z-10" />
} 