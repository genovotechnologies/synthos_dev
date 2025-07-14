'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

interface DataPoint {
  id: number
  x: number
  y: number
  z: number
  value: number
  label: string
  color: string
}

export default function DataVisualization3D() {
  const mountRef = useRef<HTMLDivElement>(null)
  const [selectedPoint, setSelectedPoint] = useState<DataPoint | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const sceneRef = useRef<THREE.Scene>()
  const rendererRef = useRef<THREE.WebGLRenderer>()
  const cameraRef = useRef<THREE.PerspectiveCamera>()
  const animationRef = useRef<number>()
  const raycasterRef = useRef<THREE.Raycaster>()
  const mouseRef = useRef<THREE.Vector2>()
  const dataPointsRef = useRef<{ mesh: THREE.Mesh; data: DataPoint }[]>([])

  useEffect(() => {
    if (!mountRef.current) return

    try {
      // Scene setup
      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(75, 400 / 300, 0.1, 1000)
      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
      
      renderer.setSize(400, 300)
      renderer.setClearColor(0x000000, 0)
      mountRef.current.appendChild(renderer.domElement)
      
      sceneRef.current = scene
      rendererRef.current = renderer
      cameraRef.current = camera
      raycasterRef.current = new THREE.Raycaster()
      mouseRef.current = new THREE.Vector2()

      // Generate sample data
      const dataPoints: DataPoint[] = []
      for (let i = 0; i < 50; i++) {
        dataPoints.push({
          id: i,
          x: (Math.random() - 0.5) * 10,
          y: (Math.random() - 0.5) * 10,
          z: (Math.random() - 0.5) * 10,
          value: Math.random() * 100,
          label: `Data Point ${i + 1}`,
          color: `hsl(${Math.random() * 360}, 70%, 60%)`
        })
      }

      // Create 3D data points
      const dataPointMeshes: { mesh: THREE.Mesh; data: DataPoint }[] = []
      
      dataPoints.forEach((point) => {
        const geometry = new THREE.SphereGeometry(0.2, 16, 16)
        const material = new THREE.MeshPhongMaterial({
          color: point.color,
          transparent: true,
          opacity: 0.8
        })
        const mesh = new THREE.Mesh(geometry, material)
        
        mesh.position.set(point.x, point.y, point.z)
        mesh.userData = { dataPoint: point }
        
        scene.add(mesh)
        dataPointMeshes.push({ mesh, data: point })
      })
      
      dataPointsRef.current = dataPointMeshes

      // Add grid
      const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222)
      scene.add(gridHelper)

      // Add axes
      const axesHelper = new THREE.AxesHelper(10)
      scene.add(axesHelper)

      // Lighting
      const ambientLight = new THREE.AmbientLight(0x404040, 0.6)
      scene.add(ambientLight)
      
      const pointLight = new THREE.PointLight(0xffffff, 1, 100)
      pointLight.position.set(10, 10, 10)
      scene.add(pointLight)

      // Camera position
      camera.position.set(15, 15, 15)
      camera.lookAt(0, 0, 0)

      // Mouse interaction
      const handleMouseMove = (event: MouseEvent) => {
        const rect = renderer.domElement.getBoundingClientRect()
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
        const y = -((event.clientY - rect.top) / rect.height) * 2 + 1
        
        if (mouseRef.current) {
          mouseRef.current.x = x
          mouseRef.current.y = y
        }
      }

      const handleMouseClick = () => {
        if (!raycasterRef.current || !mouseRef.current || !cameraRef.current) return
        
        raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current)
        const intersects = raycasterRef.current.intersectObjects(
          dataPointMeshes.map(dp => dp.mesh)
        )
        
        if (intersects.length > 0) {
          const clickedMesh = intersects[0].object as THREE.Mesh
          const dataPoint = clickedMesh.userData.dataPoint as DataPoint
          setSelectedPoint(dataPoint)
          
          // Highlight selected point
          dataPointMeshes.forEach(({ mesh }) => {
            const material = mesh.material as THREE.MeshPhongMaterial
            material.emissive.setHex(0x000000)
          })
          
          const selectedMaterial = clickedMesh.material as THREE.MeshPhongMaterial
          selectedMaterial.emissive.setHex(0x444444)
        }
      }

      renderer.domElement.addEventListener('mousemove', handleMouseMove)
      renderer.domElement.addEventListener('click', handleMouseClick)

      // Animation loop
      let time = 0
      const animate = () => {
        time += 0.01
        
        // Rotate camera around scene
        camera.position.x = Math.cos(time * 0.1) * 15
        camera.position.z = Math.sin(time * 0.1) * 15
        camera.lookAt(0, 0, 0)
        
        // Animate data points
        dataPointMeshes.forEach(({ mesh, data }, index) => {
          mesh.position.y = data.y + Math.sin(time + index * 0.1) * 0.5
          mesh.rotation.x += 0.01
          mesh.rotation.y += 0.01
        })
        
        // Update raycaster for hover effects
        if (raycasterRef.current && mouseRef.current && cameraRef.current) {
          raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current)
          const intersects = raycasterRef.current.intersectObjects(
            dataPointMeshes.map(dp => dp.mesh)
          )
          
          // Reset all materials
          dataPointMeshes.forEach(({ mesh }) => {
            const material = mesh.material as THREE.MeshPhongMaterial
            material.opacity = 0.8
            mesh.scale.setScalar(1)
          })
          
          // Highlight hovered point
          if (intersects.length > 0) {
            const hoveredMesh = intersects[0].object as THREE.Mesh
            const material = hoveredMesh.material as THREE.MeshPhongMaterial
            material.opacity = 1
            hoveredMesh.scale.setScalar(1.2)
            renderer.domElement.style.cursor = 'pointer'
          } else {
            renderer.domElement.style.cursor = 'default'
          }
        }
        
        renderer.render(scene, camera)
        animationRef.current = requestAnimationFrame(animate)
      }

      animate()
      setIsLoaded(true)

      // Cleanup
      return () => {
        renderer.domElement.removeEventListener('mousemove', handleMouseMove)
        renderer.domElement.removeEventListener('click', handleMouseClick)
        
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current)
        }
        
        if (mountRef.current && renderer.domElement) {
          mountRef.current.removeChild(renderer.domElement)
        }
        
        renderer.dispose()
      }
    } catch (error) {
      console.error('3D Visualization failed, falling back to 2D:', error)
      setIsLoaded(false)
    }
  }, [])

  if (!isLoaded) {
    return (
      <div className="w-full h-[300px] bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-lg border flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading interactive visualization...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <div ref={mountRef} className="w-full rounded-lg overflow-hidden border" />
      
      {selectedPoint && (
        <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm border rounded-lg p-3 shadow-lg">
          <h4 className="font-semibold text-sm">{selectedPoint.label}</h4>
          <p className="text-xs text-muted-foreground">Value: {selectedPoint.value.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">
            Position: ({selectedPoint.x.toFixed(1)}, {selectedPoint.y.toFixed(1)}, {selectedPoint.z.toFixed(1)})
          </p>
        </div>
      )}
      
      <div className="absolute bottom-4 left-4 text-xs text-muted-foreground">
        <p>🖱️ Click points to select • Auto-rotating camera</p>
      </div>
    </div>
  )
}
