'use client';

import { useEffect, useRef, useState } from 'react';

// Declare global THREE for window.THREE loaded from CDN
declare global {
  interface Window {
    THREE: any;
  }
}

interface Lusion3DVirtualWorldProps {
  onStageChange?: (stage: number, stageName: string) => void;
}

export default function Lusion3DVirtualWorld({ onStageChange }: Lusion3DVirtualWorldProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [telemetry, setTelemetry] = useState({
    camZ: '18.0',
    camX: '0.0',
    speed: '1.0x',
    sector: 'OVERTURE',
  });

  useEffect(() => {
    let renderer: any = null;
    let scene: any = null;
    let camera: any = null;
    let animId: number = 0;
    let isDisposed = false;

    // Load Three.js dynamically
    const initThreeScene = () => {
      const THREE = window.THREE;
      if (!THREE || !mountRef.current || isDisposed) return;

      const container = mountRef.current;
      const width = window.innerWidth;
      const height = window.innerHeight;

      // 1. Scene setup
      scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x06070a, 0.018);

      // 2. Camera setup
      camera = new THREE.PerspectiveCamera(58, width / height, 0.1, 1000);
      camera.position.set(0, 0, 18);

      // 3. Renderer setup
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.3;

      container.innerHTML = '';
      container.appendChild(renderer.domElement);
      setIsLoaded(true);

      // 4. Lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);

      const light1 = new THREE.PointLight(0x00f0ff, 4, 60);
      light1.position.set(10, 12, 10);
      scene.add(light1);

      const light2 = new THREE.PointLight(0xc1ff00, 3.5, 60);
      light2.position.set(-12, -8, 8);
      scene.add(light2);

      const light3 = new THREE.PointLight(0x8832f7, 4, 80);
      light3.position.set(0, 0, -30);
      scene.add(light3);

      // 5. STAGE 1: Central Hero Morphing 3D Entity (Torus Knot & Wireframe Cage)
      const heroGroup = new THREE.Group();
      scene.add(heroGroup);

      // Inner iridescent crystal core
      const coreGeo = new THREE.TorusKnotGeometry(3.6, 1.1, 128, 32, 2, 3);
      const coreMat = new THREE.MeshStandardMaterial({
        color: 0x1a2ffb,
        metalness: 0.85,
        roughness: 0.15,
        emissive: 0x050833,
        wireframe: false,
      });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      heroGroup.add(coreMesh);

      // Outer cybernetic cage
      const cageGeo = new THREE.IcosahedronGeometry(6.2, 2);
      const cageMat = new THREE.MeshStandardMaterial({
        color: 0xc1ff00,
        wireframe: true,
        transparent: true,
        opacity: 0.28,
      });
      const cageMesh = new THREE.Mesh(cageGeo, cageMat);
      heroGroup.add(cageMesh);

      // 6. 3D Particle Constellation Dust (2,000 Floating stars)
      const particleCount = 2000;
      const particleGeo = new THREE.BufferGeometry();
      const posArray = new Float32Array(particleCount * 3);
      const colorArray = new Float32Array(particleCount * 3);

      for (let i = 0; i < particleCount * 3; i += 3) {
        // Distribute in a huge 3D cylinder/tunnel
        posArray[i] = (Math.random() - 0.5) * 160;
        posArray[i + 1] = (Math.random() - 0.5) * 80;
        posArray[i + 2] = (Math.random() - 0.5) * 350 - 50;

        // Mix between cyan, lime, and violet
        const rand = Math.random();
        if (rand < 0.33) {
          colorArray[i] = 0.0;
          colorArray[i + 1] = 0.94;
          colorArray[i + 2] = 1.0;
        } else if (rand < 0.66) {
          colorArray[i] = 0.75;
          colorArray[i + 1] = 1.0;
          colorArray[i + 2] = 0.0;
        } else {
          colorArray[i] = 0.53;
          colorArray[i + 1] = 0.2;
          colorArray[i + 2] = 0.97;
        }
      }

      particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
      particleGeo.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));

      const particleMat = new THREE.PointsMaterial({
        size: 0.35,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
      });
      const particleSystem = new THREE.Points(particleGeo, particleMat);
      scene.add(particleSystem);

      // 7. STAGE 3: HORIZONTAL 3D TRACK OBJECTS (4 Floating Spatial Stations)
      const stationsGroup = new THREE.Group();
      stationsGroup.position.set(0, 0, -60);
      scene.add(stationsGroup);

      const stationData = [
        { x: -35, color: 0x00f0ff, type: 'cylinder' },
        { x: -10, color: 0xf43f5e, type: 'octa' },
        { x: 15, color: 0x38bdf8, type: 'torus' },
        { x: 40, color: 0xc1ff00, type: 'dodeca' },
      ];

      const stationMeshes: any[] = [];

      stationData.forEach((st) => {
        const group = new THREE.Group();
        group.position.set(st.x, 0, 0);

        let geo: any;
        if (st.type === 'cylinder') geo = new THREE.CylinderGeometry(2, 2.8, 8, 8);
        else if (st.type === 'octa') geo = new THREE.OctahedronGeometry(4.2, 0);
        else if (st.type === 'torus') geo = new THREE.TorusGeometry(3.5, 1, 16, 40);
        else geo = new THREE.DodecahedronGeometry(3.8, 0);

        const mat = new THREE.MeshStandardMaterial({
          color: st.color,
          metalness: 0.7,
          roughness: 0.2,
          emissive: st.color,
          emissiveIntensity: 0.2,
          wireframe: true,
        });

        const mesh = new THREE.Mesh(geo, mat);
        group.add(mesh);

        // Surrounding orbital ring
        const ringGeo = new THREE.TorusGeometry(5.5, 0.08, 16, 64);
        const ringMat = new THREE.MeshBasicMaterial({
          color: st.color,
          transparent: true,
          opacity: 0.7,
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 2;
        group.add(ringMesh);

        stationsGroup.add(group);
        stationMeshes.push({ group, mesh, ringMesh });
      });

      // 8. STAGE 4: WARP TUNNEL RINGS (Speed Vortex)
      const tunnelGroup = new THREE.Group();
      tunnelGroup.position.set(0, 0, -180);
      scene.add(tunnelGroup);

      const tunnelRings: any[] = [];
      const ringCount = 28;
      for (let r = 0; r < ringCount; r++) {
        const tRingGeo = new THREE.TorusGeometry(8.5, 0.12, 16, 32);
        const tRingMat = new THREE.MeshBasicMaterial({
          color: r % 2 === 0 ? 0x00f0ff : 0xc1ff00,
          transparent: true,
          opacity: 0.55,
        });
        const tRing = new THREE.Mesh(tRingGeo, tRingMat);
        tRing.position.set(0, 0, -r * 6);
        tunnelGroup.add(tRing);
        tunnelRings.push(tRing);
      }

      // Mouse Parallax
      let mouseX = 0;
      let mouseY = 0;
      let targetMouseX = 0;
      let targetMouseY = 0;

      const handleMouseMove = (e: MouseEvent) => {
        targetMouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        targetMouseY = -(e.clientY / window.innerHeight - 0.5) * 2;
      };

      const handleResize = () => {
        if (!camera || !renderer) return;
        const w = window.innerWidth;
        const h = window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };

      window.addEventListener('mousemove', handleMouseMove, { passive: true });
      window.addEventListener('resize', handleResize);

      // Render Loop with Dynamic Scroll Camera Fly-Through
      let clock = new THREE.Clock();

      const animate = () => {
        if (isDisposed) return;
        animId = requestAnimationFrame(animate);

        const delta = clock.getDelta();
        const elapsedTime = clock.getElapsedTime();

        // Mouse smooth easing
        mouseX += (targetMouseX - mouseX) * 0.05;
        mouseY += (targetMouseY - mouseY) * 0.05;

        // Calculate scroll progress (0.0 to 1.0)
        const scrollY = window.scrollY || window.pageYOffset || 0;
        const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        const progress = Math.min(Math.max(scrollY / maxScroll, 0), 1);

        // STAGE MANAGEMENT & TELEMETRY
        let targetCamX = mouseX * 2;
        let targetCamY = mouseY * 1.5;
        let targetCamZ = 18;
        let targetLookZ = 0;
        let sector = 'OVERTURE';

        if (progress < 0.22) {
          // STAGE 1: Hero Orbit
          // Camera stays in front, hero object spins and reacts
          targetCamZ = 18 - progress * 35; // moves from 18 to 10
          targetCamX = mouseX * 2.5;
          targetCamY = mouseY * 2;
          targetLookZ = 0;
          sector = '01 // OVERTURE';

          heroGroup.rotation.x = elapsedTime * 0.3 + mouseY * 0.5;
          heroGroup.rotation.y = elapsedTime * 0.45 + mouseX * 0.5;
          cageMesh.rotation.z = -elapsedTime * 0.2;
          heroGroup.scale.set(1, 1, 1);
        } else if (progress >= 0.22 && progress < 0.65) {
          // STAGE 2 & 3: FLY-THROUGH INTO 3D HORIZONTAL REALM
          // Camera zooms deep and travels along X-axis through the 4 floating stations
          const subProgress = (progress - 0.22) / (0.65 - 0.22); // 0.0 to 1.0

          // Smooth curved camera path in 3D:
          targetCamZ = -60 + Math.sin(subProgress * Math.PI) * 8;
          targetCamX = -38 + subProgress * 78 + mouseX * 3; // travels horizontally along 3D X-axis!
          targetCamY = Math.cos(subProgress * Math.PI * 2) * 2 + mouseY * 2;
          targetLookZ = -60;

          // Hero expands away as we pass it
          heroGroup.scale.set(1 + subProgress * 4, 1 + subProgress * 4, 1 + subProgress * 4);
          heroGroup.position.z = subProgress * 20;

          sector = subProgress < 0.25 
            ? '02 // ASHRAM REALM' 
            : subProgress < 0.5 
            ? '03 // VEDIC MIND LAB' 
            : subProgress < 0.75 
            ? '04 // ETHICAL LEADERSHIP' 
            : '05 // NATIONWIDE MESH';

          // Animate station objects
          stationMeshes.forEach((st, idx) => {
            st.mesh.rotation.x = elapsedTime * (0.4 + idx * 0.1);
            st.mesh.rotation.y = elapsedTime * (0.5 + idx * 0.1);
            st.ringMesh.rotation.z = elapsedTime * 0.8;
          });
        } else if (progress >= 0.65 && progress < 0.88) {
          // STAGE 4: WARP TUNNEL / SPEED VORTEX
          const tunnelProgress = (progress - 0.65) / (0.88 - 0.65);
          targetCamX = mouseX * 1.5;
          targetCamY = mouseY * 1.5;
          targetCamZ = -160 - tunnelProgress * 100; // plunging deep through tunnel rings!
          targetLookZ = targetCamZ - 50;
          sector = '06 // VEDIC WARP TUNNEL';

          // Animate tunnel rings
          tunnelRings.forEach((ring, idx) => {
            ring.rotation.z = elapsedTime * 1.5 + idx * 0.2;
            const s = 1 + Math.sin(elapsedTime * 2 + idx) * 0.1;
            ring.scale.set(s, s, 1);
          });
        } else {
          // STAGE 5: GRAND CELESTIAL BEACON
          targetCamX = mouseX * 2;
          targetCamY = 3 + mouseY * 2;
          targetCamZ = -280;
          targetLookZ = -340;
          sector = '07 // INFINITE NEXUS';
        }

        // Camera smooth dampening
        camera.position.x += (targetCamX - camera.position.x) * 0.06;
        camera.position.y += (targetCamY - camera.position.y) * 0.06;
        camera.position.z += (targetCamZ - camera.position.z) * 0.06;
        camera.lookAt(targetCamX * 0.3, targetCamY * 0.3, targetLookZ);

        // Move lights dynamically with camera
        light1.position.set(camera.position.x + 8, camera.position.y + 6, camera.position.z - 5);
        light2.position.set(camera.position.x - 8, camera.position.y - 6, camera.position.z - 5);

        // Slowly rotate particle field
        particleSystem.rotation.y = elapsedTime * 0.02;
        particleSystem.rotation.z = elapsedTime * 0.01;

        // Update UI Telemetry every few frames
        if (Math.floor(elapsedTime * 10) % 3 === 0) {
          setTelemetry({
            camZ: camera.position.z.toFixed(1),
            camX: camera.position.x.toFixed(1),
            speed: (1.0 + progress * 2.5).toFixed(1) + 'x',
            sector,
          });
        }

        renderer.render(scene, camera);
      };

      animate();

      return () => {
        isDisposed = true;
        cancelAnimationFrame(animId);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('resize', handleResize);
        if (renderer && renderer.domElement && container) {
          container.innerHTML = '';
          renderer.dispose();
        }
      };
    };

    // Check if Three.js is already available, or inject CDN script
    if (typeof window !== 'undefined') {
      if (window.THREE) {
        initThreeScene();
      } else {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
        script.async = true;
        script.onload = () => {
          if (!isDisposed) initThreeScene();
        };
        document.head.appendChild(script);
      }
    }

    return () => {
      isDisposed = true;
    };
  }, []);

  return (
    <>
      {/* 3D WebGL Canvas Layer */}
      <div
        ref={mountRef}
        className="fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden"
      />

      {/* Real-time 3D Camera Telemetry HUD (Bottom Left) */}
      <div className="fixed bottom-6 left-6 z-40 hidden md:flex items-center space-x-3 px-4 py-2 rounded-full bg-black/60 border border-white/15 backdrop-blur-xl text-[11px] font-mono text-white/70 pointer-events-none">
        <span className="w-2 h-2 rounded-full bg-[#c1ff00] animate-pulse" />
        <span>3D SECTOR: <strong className="text-white">{telemetry.sector}</strong></span>
        <span className="text-white/30">•</span>
        <span>CAM Z: <strong className="text-[#00f0ff]">{telemetry.camZ}m</strong></span>
        <span className="text-white/30">•</span>
        <span>CAM X: <strong className="text-[#c1ff00]">{telemetry.camX}m</strong></span>
        <span className="text-white/30">•</span>
        <span>VELOCITY: <strong className="text-white">{telemetry.speed}</strong></span>
      </div>
    </>
  );
}
