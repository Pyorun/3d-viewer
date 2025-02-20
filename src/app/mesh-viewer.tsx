import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

interface Vertex {
  x: number;
  y: number;
  z: number;
}

interface Normal {
  x: number;
  y: number;
  z: number;
}

interface Face {
  vertices: Vertex[];
  normal: Normal;
}

interface Object3D {
  faces: Face[];
  name?: string;
}

interface SceneData {
  objects: Object3D[];
}

interface MouseControls {
  isMouseDown: boolean;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
}

export const MeshViewer = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const mouseControlsRef = useRef<MouseControls>({
    isMouseDown: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
  });
  
  const [jsonInput, setJsonInput] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 5;
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Grid helper setup
    const size = 10;
    const divisions = 10;
    const gridHelper = new THREE.GridHelper(size, divisions, 0x888888, 0x444444);
    scene.add(gridHelper);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      cameraRef.current.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (containerRef.current && rendererRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, []);

  // Custom orbit controls implementation
  useEffect(() => {
    if (!containerRef.current) return;

    const handleMouseDown = (e: MouseEvent) => {
      mouseControlsRef.current.isMouseDown = true;
      mouseControlsRef.current.startX = e.clientX;
      mouseControlsRef.current.startY = e.clientY;
      mouseControlsRef.current.lastX = e.clientX;
      mouseControlsRef.current.lastY = e.clientY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!mouseControlsRef.current.isMouseDown || !cameraRef.current) return;

      const deltaX = e.clientX - mouseControlsRef.current.lastX;
      const deltaY = e.clientY - mouseControlsRef.current.lastY;

      const rotationSpeed = 0.01;
      
      cameraRef.current.position.x = cameraRef.current.position.x * Math.cos(deltaX * rotationSpeed) 
                                   - cameraRef.current.position.z * Math.sin(deltaX * rotationSpeed);
      cameraRef.current.position.z = cameraRef.current.position.x * Math.sin(deltaX * rotationSpeed) 
                                   + cameraRef.current.position.z * Math.cos(deltaX * rotationSpeed);

      const currentRadius = Math.sqrt(
        cameraRef.current.position.z * cameraRef.current.position.z +
        cameraRef.current.position.y * cameraRef.current.position.y
      );
      
      const currentAngle = Math.atan2(cameraRef.current.position.y, cameraRef.current.position.z);
      const newAngle = currentAngle + deltaY * rotationSpeed;
      
      cameraRef.current.position.y = currentRadius * Math.sin(newAngle);
      cameraRef.current.position.z = currentRadius * Math.cos(newAngle);

      cameraRef.current.lookAt(0, 0, 0);

      mouseControlsRef.current.lastX = e.clientX;
      mouseControlsRef.current.lastY = e.clientY;
    };

    const handleMouseUp = () => {
      mouseControlsRef.current.isMouseDown = false;
    };

    const handleWheel = (e: WheelEvent) => {
      if (!cameraRef.current) return;
      
      const zoomSpeed = 0.1;
      const minDistance = 0.1;
      const maxDistance = 100;
      
      const delta = e.deltaY > 0 ? 1 + zoomSpeed : 1 / (1 + zoomSpeed);
      const currentDistance = cameraRef.current.position.length();
      const newDistance = Math.max(minDistance, Math.min(maxDistance, currentDistance * delta));
      
      cameraRef.current.position.normalize().multiplyScalar(newDistance);
      cameraRef.current.lookAt(0, 0, 0);
    };

    containerRef.current.addEventListener('mousedown', handleMouseDown);
    containerRef.current.addEventListener('mousemove', handleMouseMove);
    containerRef.current.addEventListener('mouseup', handleMouseUp);
    containerRef.current.addEventListener('mouseleave', handleMouseUp);
    containerRef.current.addEventListener('wheel', handleWheel);

    return () => {
      if (containerRef.current) {
        containerRef.current.removeEventListener('mousedown', handleMouseDown);
        containerRef.current.removeEventListener('mousemove', handleMouseMove);
        containerRef.current.removeEventListener('mouseup', handleMouseUp);
        containerRef.current.removeEventListener('mouseleave', handleMouseUp);
        containerRef.current.removeEventListener('wheel', handleWheel);
      }
    };
  }, []);

  const generateColor = (index: number) => {
    const hue = (index * 137.508) % 360;
    const saturation = 70;
    const lightness = 60;
    
    const h = hue / 360;
    const s = saturation / 100;
    const l = lightness / 100;
    
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
    
    const r = Math.round(hue2rgb(p, q, h + 1/3) * 255);
    const g = Math.round(hue2rgb(p, q, h) * 255);
    const b = Math.round(hue2rgb(p, q, h - 1/3) * 255);
    
    return new THREE.Color(r/255, g/255, b/255);
  };

  const createMeshFromObject = (object: Object3D): THREE.Group => {
    const geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const normals: number[] = [];
    const indices: number[] = [];
    let vertexIndex = 0;

    object.faces.forEach(face => {
      if (face.vertices.length === 4) {
        // Add vertices for the rectangular face
        face.vertices.forEach(vertex => {
          vertices.push(vertex.x, vertex.y, vertex.z);
          normals.push(face.normal.x, face.normal.y, face.normal.z);
        });

        // Create two triangles for the rectangular face
        indices.push(
          vertexIndex, vertexIndex + 1, vertexIndex + 2,  // First triangle
          vertexIndex, vertexIndex + 2, vertexIndex + 3   // Second triangle
        );
        vertexIndex += 4;
      } else if (face.vertices.length === 3) {
        // Add vertices for the triangular face
        face.vertices.forEach(vertex => {
          vertices.push(vertex.x, vertex.y, vertex.z);
          normals.push(face.normal.x, face.normal.y, face.normal.z);
        });

        // Create one triangle
        indices.push(vertexIndex, vertexIndex + 1, vertexIndex + 2);
        vertexIndex += 3;
      }
    });

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setIndex(indices);
    
    const color = generateColor(object.name ? parseInt(object.name, 36) : Math.random() * 1000);
    
    // Create semi-transparent face material
    const faceMaterial = new THREE.MeshPhongMaterial({
      color: color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
      flatShading: true,
      shininess: 50,
      depthWrite: false
    });

    // Create wireframe edges
    const edgesGeometry = new THREE.EdgesGeometry(geometry);
    const edgesMaterial = new THREE.LineBasicMaterial({ 
      color: 0x000000,
      linewidth: 1
    });
    
    const wireframe = new THREE.LineSegments(edgesGeometry, edgesMaterial);
    const mesh = new THREE.Mesh(geometry, faceMaterial);
    
    const group = new THREE.Group();
    group.add(mesh);
    group.add(wireframe);
    
    return group;
  };

  const handleJsonSubmit = () => {
    if (!sceneRef.current) return;
    
    try {
      const data: SceneData = JSON.parse(jsonInput);
      
      // Clear existing meshes
      while (sceneRef.current.children.length > 0) {
        sceneRef.current.remove(sceneRef.current.children[0]);
      }

      // Re-add lights and grid
      const ambientLight = new THREE.AmbientLight(0x404040);
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
      directionalLight.position.set(1, 1, 1);
      const gridHelper = new THREE.GridHelper(10, 10, 0x888888, 0x444444);
      
      sceneRef.current.add(ambientLight);
      sceneRef.current.add(directionalLight);
      sceneRef.current.add(gridHelper);

      // Add new meshes
      data.objects.forEach((obj, index) => {
        const mesh = createMeshFromObject({...obj, name: obj.name || `object${index}`});
        sceneRef.current?.add(mesh);
      });

      setError('');
    } catch (err) {
      setError('Invalid JSON format. Please check your input.');
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="p-4 bg-gray-100">
        <textarea
          className="w-full h-32 p-2 border rounded"
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          placeholder="Paste your 3D object JSON here..."
        />
        <button
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={handleJsonSubmit}
        >
          Load Objects
        </button>
        {error && <div className="mt-2 text-red-500">{error}</div>}
      </div>
      <div ref={containerRef} className="flex-1" />
      </div>
  );
};
