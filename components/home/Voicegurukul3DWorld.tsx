'use client';

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    THREE: any;
  }
}

interface Voicegurukul3DWorldProps {
  opacity?: number;
  className?: string;
}

export default function Voicegurukul3DWorld({
  opacity = 0.85,
  className = '',
}: Voicegurukul3DWorldProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let renderer: any = null;
    let scene: any = null;
    let camera: any = null;
    let animId: number = 0;
    let isDisposed = false;

    // =========================================================================
    // RIGHT MANDALA TEXTURE 1: Authentic Indian Lotus Core
    // =========================================================================
    const generateInnerMandalaCanvas = (size = 1024): HTMLCanvasElement => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return canvas;

      const cx = size / 2;
      const cy = size / 2;

      const goldGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, size * 0.45);
      goldGrad.addColorStop(0, '#fef08a');
      goldGrad.addColorStop(0.35, '#f59e0b');
      goldGrad.addColorStop(0.7, '#d97706');
      goldGrad.addColorStop(1, '#b45309');

      ctx.strokeStyle = goldGrad;
      ctx.fillStyle = goldGrad;
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // 1. Central Core Bindu & Concentric Rings
      ctx.beginPath();
      ctx.arc(cx, cy, 18, 0, Math.PI * 2);
      ctx.fill();

      [35, 52, 70].forEach((r) => {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      });

      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(ang) * 18, cy + Math.sin(ang) * 18);
        ctx.lineTo(cx + Math.cos(ang) * 52, cy + Math.sin(ang) * 52);
        ctx.stroke();
      }

      // 2. Tier 1: 8 Classical Indian Lotus Petals
      const p1Count = 8;
      for (let i = 0; i < p1Count; i++) {
        const ang = (i / p1Count) * Math.PI * 2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(ang);

        ctx.beginPath();
        ctx.moveTo(0, 52);
        ctx.quadraticCurveTo(42, 110, 0, 155);
        ctx.quadraticCurveTo(-42, 110, 0, 52);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, 68);
        ctx.quadraticCurveTo(26, 110, 0, 140);
        ctx.quadraticCurveTo(-26, 110, 0, 68);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, 75);
        ctx.lineTo(0, 130);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 155, 4.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // Dividing Ring with beads
      ctx.beginPath();
      ctx.arc(cx, cy, 168, 0, Math.PI * 2);
      ctx.stroke();

      for (let i = 0; i < 32; i++) {
        const ang = (i / 32) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(ang) * 168, cy + Math.sin(ang) * 168, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. Tier 2: 16 Ornate Scalloped Lotus Petals
      const p2Count = 16;
      for (let i = 0; i < p2Count; i++) {
        const ang = (i / p2Count) * Math.PI * 2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(ang);

        ctx.beginPath();
        ctx.moveTo(0, 168);
        ctx.quadraticCurveTo(46, 230, 0, 290);
        ctx.quadraticCurveTo(-46, 230, 0, 168);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, 195);
        ctx.quadraticCurveTo(24, 235, 0, 268);
        ctx.quadraticCurveTo(-24, 235, 0, 195);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 235, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      [295, 308].forEach((r) => {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      });

      return canvas;
    };

    // =========================================================================
    // RIGHT MANDALA TEXTURE 2: Outer Grand Lotus Chakra Rim
    // =========================================================================
    const generateOuterMandalaCanvas = (size = 1536): HTMLCanvasElement => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return canvas;

      const cx = size / 2;
      const cy = size / 2;

      const goldGrad = ctx.createRadialGradient(cx, cy, 100, cx, cy, size * 0.48);
      goldGrad.addColorStop(0, '#fef08a');
      goldGrad.addColorStop(0.3, '#f59e0b');
      goldGrad.addColorStop(0.65, '#d97706');
      goldGrad.addColorStop(1, '#92400e');

      ctx.strokeStyle = goldGrad;
      ctx.fillStyle = goldGrad;
      ctx.lineWidth = 3.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      [315, 335].forEach((r) => {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Traditional Jali (Lace Mesh)
      const jaliCount = 48;
      for (let i = 0; i < jaliCount; i++) {
        const ang1 = (i / jaliCount) * Math.PI * 2;
        const ang2 = ((i + 1) / jaliCount) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(ang1) * 315, cy + Math.sin(ang1) * 315);
        ctx.lineTo(cx + Math.cos(ang2) * 335, cy + Math.sin(ang2) * 335);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(ang2) * 315, cy + Math.sin(ang2) * 315);
        ctx.lineTo(cx + Math.cos(ang1) * 335, cy + Math.sin(ang1) * 335);
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(cx, cy, 350, 0, Math.PI * 2);
      ctx.stroke();

      // 24 Grand Indian Temple Lotus Petals
      const p3Count = 24;
      for (let i = 0; i < p3Count; i++) {
        const ang = (i / p3Count) * Math.PI * 2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(ang);

        ctx.beginPath();
        ctx.moveTo(-28, 350);
        ctx.bezierCurveTo(-50, 420, -10, 485, 0, 520);
        ctx.bezierCurveTo(10, 485, 50, 420, 28, 350);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, 375);
        ctx.quadraticCurveTo(22, 440, 0, 485);
        ctx.quadraticCurveTo(-22, 440, 0, 375);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 435, 5.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(0, 522, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      ctx.beginPath();
      ctx.arc(cx, cy, 538, 0, Math.PI * 2);
      ctx.stroke();

      for (let i = 0; i < 96; i++) {
        const ang = (i / 96) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(ang) * 538, cy + Math.sin(ang) * 538, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // 48 Radiant Sunburst Rays
      const rayCount = 48;
      for (let i = 0; i < rayCount; i++) {
        const ang = (i / rayCount) * Math.PI * 2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(ang);

        ctx.beginPath();
        ctx.moveTo(0, 545);
        ctx.lineTo(i % 2 === 0 ? 0 : 4, i % 2 === 0 ? 595 : 578);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, i % 2 === 0 ? 598 : 581, i % 2 === 0 ? 4 : 2.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      ctx.beginPath();
      ctx.arc(cx, cy, 612, 0, Math.PI * 2);
      ctx.stroke();

      return canvas;
    };

    // =========================================================================
    // LEFT MANDALA TEXTURE: Sacred Surya Sun Chakra / Sri Yantra (Different Pattern!)
    // =========================================================================
    const generateLeftMandalaCanvas = (size = 1536): HTMLCanvasElement => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return canvas;

      const cx = size / 2;
      const cy = size / 2;

      // Warm Saffron-Amber Gold Gradient for Left Wheel
      const sunGrad = ctx.createRadialGradient(cx, cy, 30, cx, cy, size * 0.49);
      sunGrad.addColorStop(0, '#fef3c7');
      sunGrad.addColorStop(0.3, '#f59e0b');
      sunGrad.addColorStop(0.65, '#ea580c');
      sunGrad.addColorStop(1, '#7c2d12');

      ctx.strokeStyle = sunGrad;
      ctx.fillStyle = sunGrad;
      ctx.lineWidth = 3.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // 1. Central 12-Ray Star Core
      ctx.beginPath();
      ctx.arc(cx, cy, 26, 0, Math.PI * 2);
      ctx.fill();

      [45, 68, 92].forEach((r) => {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      });

      // 12 Sacred Radiant Needles
      for (let i = 0; i < 12; i++) {
        const ang = (i / 12) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(ang) * 26, cy + Math.sin(ang) * 26);
        ctx.lineTo(cx + Math.cos(ang) * 68, cy + Math.sin(ang) * 68);
        ctx.stroke();
      }

      // 2. Tier 1: 12 Sharp Sculpted Sun Lotus Petals (Geometric & Pointed)
      const s1Count = 12;
      for (let i = 0; i < s1Count; i++) {
        const ang = (i / s1Count) * Math.PI * 2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(ang);

        // Pointed Chevron Petal
        ctx.beginPath();
        ctx.moveTo(0, 92);
        ctx.lineTo(38, 165);
        ctx.lineTo(0, 215);
        ctx.lineTo(-38, 165);
        ctx.closePath();
        ctx.stroke();

        // Inner Leaf Vein Line
        ctx.beginPath();
        ctx.moveTo(0, 95);
        ctx.lineTo(0, 205);
        ctx.stroke();

        // Stamen Pearl
        ctx.beginPath();
        ctx.arc(0, 215, 4.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // Concentric Border with 48 Beads
      ctx.beginPath();
      ctx.arc(cx, cy, 230, 0, Math.PI * 2);
      ctx.stroke();

      for (let i = 0; i < 48; i++) {
        const ang = (i / 48) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(ang) * 230, cy + Math.sin(ang) * 230, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. Tier 2: 16 Grand Archway Crowns with Triple Crest Finials
      const s2Count = 16;
      for (let i = 0; i < s2Count; i++) {
        const ang = (i / s2Count) * Math.PI * 2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(ang);

        // Elegant Arched Temple Dome
        ctx.beginPath();
        ctx.moveTo(-35, 245);
        ctx.quadraticCurveTo(-55, 335, 0, 395);
        ctx.quadraticCurveTo(55, 335, 35, 245);
        ctx.stroke();

        // Inner Sacred Teardrop Motif
        ctx.beginPath();
        ctx.moveTo(0, 260);
        ctx.quadraticCurveTo(24, 320, 0, 360);
        ctx.quadraticCurveTo(-24, 320, 0, 260);
        ctx.stroke();

        // Center Medallion
        ctx.beginPath();
        ctx.arc(0, 310, 5, 0, Math.PI * 2);
        ctx.fill();

        // Triple Crest Finial (Trident Lotus Finial)
        ctx.beginPath();
        ctx.arc(0, 400, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(-12, 388, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(12, 388, 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // 4. Intermediate Double Band with Concentric Diamond Lattice
      [420, 442].forEach((r) => {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      });

      const latticeCount = 64;
      for (let i = 0; i < latticeCount; i++) {
        const a1 = (i / latticeCount) * Math.PI * 2;
        const a2 = ((i + 1) / latticeCount) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a1) * 420, cy + Math.sin(a1) * 420);
        ctx.lineTo(cx + Math.cos(a2) * 442, cy + Math.sin(a2) * 442);
        ctx.stroke();
      }

      // 5. Tier 3: 64 Radiant Surya Sun Needles with Alternating Pearls
      const s3Count = 64;
      for (let i = 0; i < s3Count; i++) {
        const ang = (i / s3Count) * Math.PI * 2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(ang);

        const isLong = i % 2 === 0;
        ctx.beginPath();
        ctx.moveTo(0, 452);
        ctx.lineTo(0, isLong ? 545 : 510);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, isLong ? 548 : 513, isLong ? 4.2 : 2.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // Outermost Scalloped Solar Halo
      ctx.beginPath();
      ctx.arc(cx, cy, 565, 0, Math.PI * 2);
      ctx.stroke();

      for (let i = 0; i < 96; i++) {
        const ang = (i / 96) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(ang) * 565, cy + Math.sin(ang) * 565, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }

      return canvas;
    };

    const initThreeScene = () => {
      const THREE = window.THREE;
      if (!THREE || !mountRef.current || isDisposed) return;

      const container = mountRef.current;
      const width = window.innerWidth;
      const height = window.innerHeight;

      // 1. Scene
      scene = new THREE.Scene();

      // 2. Camera
      camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 1000);
      camera.position.set(0, 0, 18);

      // 3. Renderer with transparent background
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      container.innerHTML = '';
      container.appendChild(renderer.domElement);

      // 4. Sacred Devotional Warm Lighting
      const ambientLight = new THREE.AmbientLight(0xfff7ed, 1.4);
      scene.add(ambientLight);

      const sunLight = new THREE.DirectionalLight(0xf59e0b, 2.4);
      sunLight.position.set(6, 10, 14);
      scene.add(sunLight);

      const leftLight = new THREE.PointLight(0xfbbf24, 1.8, 60);
      leftLight.position.set(-8, 4, 8);
      scene.add(leftLight);

      // =========================================================================
      // 5A. RIGHT SACRED MANDALA WHEEL (Traditional Indian Lotus Pattern)
      // =========================================================================
      const rightMandalaGroup = new THREE.Group();
      rightMandalaGroup.position.set(3.6, 0.3, -2.0);
      scene.add(rightMandalaGroup);

      const innerCanvas = generateInnerMandalaCanvas(1024);
      const innerTexture = new THREE.CanvasTexture(innerCanvas);
      innerTexture.anisotropy = 16;

      const outerCanvas = generateOuterMandalaCanvas(1536);
      const outerTexture = new THREE.CanvasTexture(outerCanvas);
      outerTexture.anisotropy = 16;

      const rightInnerMat = new THREE.MeshBasicMaterial({
        map: innerTexture,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        side: THREE.DoubleSide,
      });

      const rightOuterMat = new THREE.MeshBasicMaterial({
        map: outerTexture,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
        side: THREE.DoubleSide,
      });

      const rightInnerGeo = new THREE.PlaneGeometry(6.2, 6.2);
      const rightInnerMesh = new THREE.Mesh(rightInnerGeo, rightInnerMat);
      rightInnerMesh.position.z = 0.05;
      rightMandalaGroup.add(rightInnerMesh);

      const rightOuterGeo = new THREE.PlaneGeometry(12.5, 12.5);
      const rightOuterMesh = new THREE.Mesh(rightOuterGeo, rightOuterMat);
      rightMandalaGroup.add(rightOuterMesh);

      // Right Center 3D Jewel
      const jewelGeo = new THREE.IcosahedronGeometry(0.32, 1);
      const jewelMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        metalness: 0.9,
        roughness: 0.2,
        emissive: 0xd97706,
        emissiveIntensity: 0.2,
        transparent: true,
        opacity: 0.35,
      });
      const rightJewelMesh = new THREE.Mesh(jewelGeo, jewelMat);
      rightJewelMesh.position.z = 0.12;
      rightMandalaGroup.add(rightJewelMesh);

      // =========================================================================
      // 5B. LEFT SACRED MANDALA WHEEL (Larger Surya Sun Chakra Pattern)
      // =========================================================================
      const leftMandalaGroup = new THREE.Group();
      // Positioned on the far left flank with clean separation from right wheel
      leftMandalaGroup.position.set(-8.2, -0.3, -2.8);
      scene.add(leftMandalaGroup);

      const leftCanvas = generateLeftMandalaCanvas(1536);
      const leftTexture = new THREE.CanvasTexture(leftCanvas);
      leftTexture.anisotropy = 16;

      const leftMat = new THREE.MeshBasicMaterial({
        map: leftTexture,
        transparent: true,
        opacity: 0.19,
        depthWrite: false,
        side: THREE.DoubleSide,
      });

      // Sized "little bigger" (~14.8 units vs right's 12.5)
      const leftGeo = new THREE.PlaneGeometry(14.8, 14.8);
      const leftMesh = new THREE.Mesh(leftGeo, leftMat);
      leftMandalaGroup.add(leftMesh);

      // Left Center 3D Jewel (Octahedron Star)
      const leftJewelGeo = new THREE.OctahedronGeometry(0.42, 1);
      const leftJewelMesh = new THREE.Mesh(leftJewelGeo, jewelMat);
      leftJewelMesh.position.z = 0.15;
      leftMandalaGroup.add(leftJewelMesh);

      // Delicate Left Metallic Rim
      const leftRimGeo = new THREE.TorusGeometry(7.2, 0.032, 16, 96);
      const leftRimMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        metalness: 0.88,
        roughness: 0.22,
        transparent: true,
        opacity: 0.3,
      });
      const leftRimMesh = new THREE.Mesh(leftRimGeo, leftRimMat);
      leftMandalaGroup.add(leftRimMesh);

      // -----------------------------------------------------------------------
      // 6. Floating Delicate Golden Stardust (Soft Cosmic Dust)
      // -----------------------------------------------------------------------
      const particleCount = 650;
      const particleGeo = new THREE.BufferGeometry();
      const posArray = new Float32Array(particleCount * 3);
      const colorArray = new Float32Array(particleCount * 3);

      for (let i = 0; i < particleCount * 3; i += 3) {
        // Distribute across both left and right wheels
        const isLeft = Math.random() < 0.5;
        const targetX = isLeft ? -4.2 : 3.6;
        const angle = Math.random() * Math.PI * 2;
        const dist = 1.8 + Math.random() * 6.5;

        posArray[i] = targetX + Math.cos(angle) * dist;
        posArray[i + 1] = Math.sin(angle) * dist;
        posArray[i + 2] = (Math.random() - 0.5) * 8 - 2;

        const rand = Math.random();
        if (rand < 0.7) {
          colorArray[i] = 0.98;
          colorArray[i + 1] = 0.78;
          colorArray[i + 2] = 0.22;
        } else {
          colorArray[i] = 0.96;
          colorArray[i + 1] = 0.52;
          colorArray[i + 2] = 0.18;
        }
      }

      particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
      particleGeo.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));

      const particleMat = new THREE.PointsMaterial({
        size: 0.18,
        vertexColors: true,
        transparent: true,
        opacity: 0.55,
        blending: THREE.NormalBlending,
      });
      const particleSystem = new THREE.Points(particleGeo, particleMat);
      scene.add(particleSystem);

      // 7. Interactive Mouse Tracking
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

      // 8. Animation Loop
      let clock = new THREE.Clock();

      const animate = () => {
        if (isDisposed) return;
        animId = requestAnimationFrame(animate);

        const elapsedTime = clock.getElapsedTime();

        // Mouse smooth easing
        mouseX += (targetMouseX - mouseX) * 0.05;
        mouseY += (targetMouseY - mouseY) * 0.05;

        // Page Scroll progress (0.0 to 1.0)
        const scrollY = window.scrollY || window.pageYOffset || 0;
        const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        const progress = Math.min(Math.max(scrollY / maxScroll, 0), 1);

        const isMobile = window.innerWidth < 1024;
        const rightBaseX = isMobile ? 4.5 : 7.2;
        const rightBaseScale = isMobile ? 0.55 : 0.88;

        const leftBaseX = isMobile ? -4.5 : -7.8;
        const leftBaseScale = isMobile ? 0.65 : 1.05;

        // =====================================================================
        // RIGHT MANDALA WHEEL: COUNTER-ROTATION (Faster, visible spin)
        // =====================================================================
        rightInnerMesh.rotation.z = elapsedTime * 0.095;
        rightOuterMesh.rotation.z = -elapsedTime * 0.052;
        rightJewelMesh.rotation.x = elapsedTime * 0.45;
        rightJewelMesh.rotation.y = elapsedTime * 0.55;

        rightMandalaGroup.scale.set(rightBaseScale, rightBaseScale, rightBaseScale);
        rightMandalaGroup.rotation.x = mouseY * 0.22;
        rightMandalaGroup.rotation.y = mouseX * 0.25;

        // =====================================================================
        // LEFT MANDALA WHEEL: HARMONIZED COUNTER-ROTATION (Faster, visible spin)
        // =====================================================================
        leftMesh.rotation.z = -elapsedTime * 0.042;
        leftJewelMesh.rotation.x = -elapsedTime * 0.4;
        leftJewelMesh.rotation.y = elapsedTime * 0.5;

        leftMandalaGroup.scale.set(leftBaseScale, leftBaseScale, leftBaseScale);
        leftMandalaGroup.rotation.x = mouseY * 0.2;
        leftMandalaGroup.rotation.y = mouseX * 0.22;

        // Scroll Progression: Both mandalas gracefully drift & frame the outer flanks
        if (progress < 0.25) {
          rightMandalaGroup.position.x = rightBaseX + mouseX * 0.35;
          rightMandalaGroup.position.y = 0.3 + mouseY * 0.25;
          rightMandalaGroup.position.z = -2.0;

          leftMandalaGroup.position.x = leftBaseX + mouseX * 0.3;
          leftMandalaGroup.position.y = -0.3 + mouseY * 0.2;
          leftMandalaGroup.position.z = -2.8;
        } else if (progress >= 0.25 && progress < 0.60) {
          const pSub = (progress - 0.25) / 0.35;
          rightMandalaGroup.position.x = rightBaseX - pSub * 1.5 + mouseX * 0.35;
          rightMandalaGroup.position.y = 0.3 + Math.sin(pSub * Math.PI) * 1.0 + mouseY * 0.25;
          rightMandalaGroup.position.z = -2.0 - pSub * 2.2;

          leftMandalaGroup.position.x = leftBaseX - pSub * 1.2 + mouseX * 0.3;
          leftMandalaGroup.position.y = -0.3 - Math.sin(pSub * Math.PI) * 0.8 + mouseY * 0.2;
          leftMandalaGroup.position.z = -2.8 - pSub * 2.0;
        } else {
          rightMandalaGroup.position.x = 4.8 + mouseX * 0.25;
          rightMandalaGroup.position.y = 0.6 + mouseY * 0.2;
          rightMandalaGroup.position.z = -4.5;

          leftMandalaGroup.position.x = -5.5 + mouseX * 0.25;
          leftMandalaGroup.position.y = -0.5 + mouseY * 0.2;
          leftMandalaGroup.position.z = -4.8;
        }

        // Swirl cosmic stardust
        particleSystem.rotation.z = elapsedTime * 0.035;

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
    <div
      ref={mountRef}
      style={{ opacity }}
      className={`fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden ${className}`}
    />
  );
}
