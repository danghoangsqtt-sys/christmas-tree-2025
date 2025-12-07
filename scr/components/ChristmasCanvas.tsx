
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { VisionService } from '../services/visionService';
import { generateTreePositions, generateSpherePositions, createStarGeometry } from '../utils/geometry';
import { VisionResult, AppMode } from '../types';

interface Props {
  targetMode: AppMode;
  onVisionUpdate: (result: VisionResult) => void;
}

// Helper to create a Snowman Group
const createSnowmanMesh = (scale: number = 1, glowMaterial?: THREE.SpriteMaterial): THREE.Group => {
  const group = new THREE.Group();
  
  // Material (Bright Neon White Snow)
  const snowMat = new THREE.MeshStandardMaterial({ 
    color: 0xffffff, 
    roughness: 0.2, 
    metalness: 0.2,
    emissive: 0xffffff, // Pure White Glow
    emissiveIntensity: 1.2, // High intensity for Neon look
  });

  // Body Parts
  const bottom = new THREE.Mesh(new THREE.SphereGeometry(0.6 * scale, 32, 32), snowMat);
  const middle = new THREE.Mesh(new THREE.SphereGeometry(0.4 * scale, 32, 32), snowMat);
  middle.position.y = 0.7 * scale;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.25 * scale, 32, 32), snowMat);
  head.position.y = 1.2 * scale;

  // Nose (Carrot - glowing slightly too)
  const noseGeo = new THREE.ConeGeometry(0.05 * scale, 0.25 * scale, 16);
  const noseMat = new THREE.MeshStandardMaterial({ 
    color: 0xff6600, 
    roughness: 0.6,
    emissive: 0xff4400,
    emissiveIntensity: 0.5
  });
  const nose = new THREE.Mesh(noseGeo, noseMat);
  nose.geometry.rotateX(Math.PI / 2);
  nose.position.set(0, 1.2 * scale, 0.25 * scale);

  // Eyes & Buttons (Coal - kept dark for contrast)
  const coalMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
  const eyeGeo = new THREE.SphereGeometry(0.03 * scale, 8, 8);
  
  const leftEye = new THREE.Mesh(eyeGeo, coalMat);
  leftEye.position.set(-0.1 * scale, 1.25 * scale, 0.22 * scale);
  const rightEye = new THREE.Mesh(eyeGeo, coalMat);
  rightEye.position.set(0.1 * scale, 1.25 * scale, 0.22 * scale);

  const button1 = new THREE.Mesh(eyeGeo, coalMat);
  button1.position.set(0, 0.75 * scale, 0.38 * scale);
  const button2 = new THREE.Mesh(eyeGeo, coalMat);
  button2.position.set(0, 0.60 * scale, 0.39 * scale);

  // Arms (Sticks)
  const stickMat = new THREE.MeshStandardMaterial({ color: 0x5C4033, roughness: 1 });
  const armGeo = new THREE.CylinderGeometry(0.02 * scale, 0.02 * scale, 0.6 * scale);
  const leftArm = new THREE.Mesh(armGeo, stickMat);
  leftArm.position.set(-0.45 * scale, 0.7 * scale, 0);
  leftArm.rotation.z = Math.PI / 3;
  
  const rightArm = new THREE.Mesh(armGeo, stickMat);
  rightArm.position.set(0.45 * scale, 0.7 * scale, 0);
  rightArm.rotation.z = -Math.PI / 3;

  group.add(bottom, middle, head, nose, leftEye, rightEye, button1, button2, leftArm, rightArm);

  // Add Neon Glow Aura
  if (glowMaterial) {
    const glow = new THREE.Sprite(glowMaterial.clone());
    glow.material.color.setHex(0xaaffff); // Cool white/cyan glow
    glow.scale.set(4 * scale, 4 * scale, 1);
    glow.material.opacity = 0.5;
    group.add(glow);
  }

  return group;
};

const ChristmasCanvas: React.FC<Props> = ({ targetMode, onVisionUpdate }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(document.createElement("video"));
  
  // Scene Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const zoomTarget = useRef(30); // Initial camera Z
  
  // Object Refs
  const pivotRef = useRef<THREE.Group | null>(null); // Main Group
  const reflectionPivotRef = useRef<THREE.Group | null>(null); // Mirror Group
  
  const bgGroupRef = useRef<THREE.Group | null>(null); 
  const snowSystemRef = useRef<THREE.Points | null>(null); 
  const particlesRef = useRef<THREE.Points | null>(null);
  const freeSnowmanRef = useRef<THREE.Group | null>(null); 
  
  // Star Refs
  const starGroupRef = useRef<THREE.Group | null>(null); 
  const starMeshRef = useRef<THREE.Mesh | null>(null);
  const reflectionStarGroupRef = useRef<THREE.Group | null>(null); 

  const decorationsGroupRef = useRef<THREE.Group | null>(null);
  const reflectionDecGroupRef = useRef<THREE.Group | null>(null);
  
  // Data Refs
  const treePositionsRef = useRef<Float32Array | null>(null);
  const spherePositionsRef = useRef<Float32Array | null>(null);
  const morphState = useRef({ value: 0 }); // 0 = Tree, 1 = Sphere

  useEffect(() => {
    // 1. Initialize Vision
    const initVision = async () => {
      try {
        const vision = VisionService.getInstance();
        await vision.initialize();
        
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 30 }
          } 
        });
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        vision.start(videoRef.current);
      } catch (e) {
        console.error("Failed to start vision/camera", e);
      }
    };
    initVision();

    // 2. Initialize Three.js
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x010108, 0.02); 
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 0, 30);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x010108, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const spriteMaterial = new THREE.SpriteMaterial({ 
      map: new THREE.TextureLoader().load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/sprites/spark1.png'), 
      color: 0xffffff, 
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.6
    });

    // --- MIRROR FLOOR ---
    const floorY = -9;
    const floorGeo = new THREE.PlaneGeometry(200, 200);
    const floorMat = new THREE.MeshStandardMaterial({ 
        color: 0x050510,
        roughness: 0.1,
        metalness: 0.5,
        transparent: true, 
        opacity: 0.8
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = floorY;
    scene.add(floor);

    // --- PIVOT GROUP (Main Scene) ---
    const pivot = new THREE.Group();
    scene.add(pivot);
    pivotRef.current = pivot;

    // --- REFLECTION PIVOT (Mirrored Scene) ---
    // Positioned at (2 * floorY) and scaled Y = -1 to act as a reflection
    const reflectionPivot = new THREE.Group();
    reflectionPivot.position.y = floorY * 2;
    reflectionPivot.scale.y = -1;
    scene.add(reflectionPivot);
    reflectionPivotRef.current = reflectionPivot;


    // A. Particles (Tree/Sphere)
    const particleCount = 2500;
    treePositionsRef.current = generateTreePositions(particleCount);
    spherePositionsRef.current = generateSpherePositions(particleCount);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(treePositionsRef.current), 3));
    
    // --- TEXTURE CREATION: CIRCULAR BULB ---
    const bulbCanvas = document.createElement('canvas');
    bulbCanvas.width = 32;
    bulbCanvas.height = 32;
    const bulbCtx = bulbCanvas.getContext('2d');
    if (bulbCtx) {
      // Create a soft-edged circle
      const gradient = bulbCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)'); // Bright center
      gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.9)'); 
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)'); // Fade out
      bulbCtx.fillStyle = gradient;
      bulbCtx.fillRect(0,0,32,32);
    }
    const bulbTexture = new THREE.CanvasTexture(bulbCanvas);

    // --- COLOR DISTRIBUTION ---
    const colors = new Float32Array(particleCount * 3);
    
    // Dominant Green (Forest/Emerald Green)
    const mainColor = new THREE.Color(0x2E8B57); 
    
    // Accent Colors
    const accentColors = [
      new THREE.Color(0xFFD700), // Gold
      new THREE.Color(0xE0115F), // Ruby
      new THREE.Color(0x00FFFF), // Cyan
      new THREE.Color(0xFFFAF0), // Warm White
      new THREE.Color(0xFF3333), // Bright Red
    ];

    for (let i = 0; i < particleCount; i++) {
      let color;
      
      // 70% Chance to be Green (The Tree Body)
      if (Math.random() < 0.7) {
          // Add slight variation to green for realism
          color = mainColor.clone().offsetHSL(0, 0, (Math.random() - 0.5) * 0.1); 
      } else {
          // 30% Chance to be an ornament/light
          color = accentColors[Math.floor(Math.random() * accentColors.length)];
      }

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.45, // Slightly larger to look like bulbs
      map: bulbTexture, // Use Circular Texture
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    });

    // Main Particles
    const particles = new THREE.Points(geometry, material);
    pivot.add(particles);
    particlesRef.current = particles;

    // Reflection Particles (Share geometry, so morphing updates both!)
    const reflectParticles = new THREE.Points(geometry, material.clone());
    reflectParticles.material.opacity = 0.4; // Faded reflection
    reflectionPivot.add(reflectParticles);


    // B. 3D Star (Reverted from Cube)
    const starGroup = new THREE.Group();
    starGroup.position.set(0, 7.8, 0); 
    pivot.add(starGroup);
    starGroupRef.current = starGroup;

    // Reflection Star Group
    const reflectStarGroup = new THREE.Group();
    reflectStarGroup.position.set(0, 7.8, 0);
    reflectionPivot.add(reflectStarGroup);
    reflectionStarGroupRef.current = reflectStarGroup;

    // Star Mesh
    const starGeo = createStarGeometry(0.8, 2.0, 5, 0.6);
    // Use MeshBasicMaterial or high-emissive Standard to avoid dark borders
    const starMat = new THREE.MeshStandardMaterial({ 
      color: 0xFFD700,
      roughness: 0.1,
      metalness: 0.1, // Low metalness to prevent dark reflections
      emissive: 0xFFD700, // Emit own color strongly
      emissiveIntensity: 1.5,
    });
    const starMesh = new THREE.Mesh(starGeo, starMat);
    starGroup.add(starMesh);
    starMeshRef.current = starMesh;

    // Reflection Star Mesh
    const reflectStarMesh = new THREE.Mesh(starGeo, starMat.clone());
    reflectStarMesh.material.emissiveIntensity = 0.5;
    reflectStarGroup.add(reflectStarMesh);
    
    // Star Light (Main Only)
    const starLight = new THREE.PointLight(0xFFAA00, 3.5, 60);
    starLight.decay = 2;
    starMesh.add(starLight);

    // Star Glow
    const starGlowSprite = new THREE.Sprite(spriteMaterial.clone());
    starGlowSprite.material.color.setHex(0xFFD700);
    starGlowSprite.scale.set(10, 10, 1);
    starMesh.add(starGlowSprite);

    // Reflection Glow
    const reflectGlow = starGlowSprite.clone();
    reflectGlow.material.opacity = 0.2;
    reflectStarMesh.add(reflectGlow);


    // C. Decorations Group
    const decGroup = new THREE.Group();
    pivot.add(decGroup); 
    decorationsGroupRef.current = decGroup;
    decGroup.scale.set(0, 0, 0);

    // Reflection Dec Group
    const reflectDecGroup = new THREE.Group();
    reflectionPivot.add(reflectDecGroup);
    reflectionDecGroupRef.current = reflectDecGroup;
    reflectDecGroup.scale.set(0,0,0);


    const createDecoration = (isReflection: boolean) => {
      const type = Math.random();
      let mesh: THREE.Group | THREE.Mesh;
      let hasGlow = true;
      let glowColor = 0xffffff;
      
      if (type < 0.33) {
        // Gift
        const geo = new THREE.BoxGeometry(1, 1, 1);
        const isRed = Math.random() > 0.5;
        const color = isRed ? 0xFF0033 : 0x00FF33; 
        glowColor = color;

        const mat = new THREE.MeshStandardMaterial({ 
          color: color, 
          roughness: 0.2,
          metalness: 0.3,
          emissive: color,
          emissiveIntensity: isReflection ? 0.3 : 0.6
        });
        mesh = new THREE.Mesh(geo, mat);
        
        const ribbonMat = new THREE.MeshStandardMaterial({ 
            color: 0xFFD700, metalness: 0.8, roughness: 0.2, 
            emissive: 0xCCAA00, emissiveIntensity: isReflection ? 0.15 : 0.3 
        });
        const ribbon1 = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.05, 8, 30), ribbonMat);
        const ribbon2 = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.05, 8, 30), ribbonMat);
        ribbon2.rotation.y = Math.PI / 2;
        mesh.add(ribbon1);
        mesh.add(ribbon2);

      } else if (type < 0.66) {
        // Bauble
        const geo = new THREE.SphereGeometry(0.6, 32, 32);
        const baubleColors = [0xFFD700, 0xFF0066, 0x00CCFF, 0xAA00FF, 0x00FF66];
        const color = baubleColors[Math.floor(Math.random() * baubleColors.length)];
        glowColor = color;

        const mat = new THREE.MeshPhongMaterial({ 
          color: color,
          shininess: 200,
          specular: 0xffffff,
          emissive: color,
          emissiveIntensity: isReflection ? 0.35 : 0.7 
        });
        mesh = new THREE.Mesh(geo, mat);
      } else {
        // Snowman (Floating)
        mesh = createSnowmanMesh(1.0, spriteMaterial); 
        hasGlow = false; 
      }
      
      const radius = 4 + Math.random() * 6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      mesh.position.x = radius * Math.sin(phi) * Math.cos(theta);
      mesh.position.y = radius * Math.sin(phi) * Math.sin(theta);
      mesh.position.z = radius * Math.cos(phi);
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      
      if (hasGlow) {
          const glow = new THREE.Sprite(spriteMaterial.clone());
          glow.material.color.setHex(glowColor);
          glow.scale.set(3, 3, 1);
          glow.material.opacity = isReflection ? 0.2 : 0.4;
          mesh.add(glow);
      }

      return mesh;
    };

    // Create 40 decorations and their reflections
    for(let i=0; i<40; i++) {
        const dec = createDecoration(false);
        decGroup.add(dec);
        const reflectDec = dec.clone(); 
        reflectDecGroup.add(reflectDec);
    }


    // --- FREE ROAMING SNOWMAN ---
    const freeSnowman = createSnowmanMesh(1.8, spriteMaterial); 
    scene.add(freeSnowman);
    freeSnowmanRef.current = freeSnowman;
    freeSnowman.position.set(10, -8, 0);

    // --- BACKGROUND ---
    const bgGroup = new THREE.Group();
    scene.add(bgGroup);
    bgGroupRef.current = bgGroup;

    const bgParticleCount = 800;
    const bgGeo = new THREE.BufferGeometry();
    const bgPos = new Float32Array(bgParticleCount * 3);

    for (let i = 0; i < bgParticleCount; i++) {
      const r = 60 + Math.random() * 90; 
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      bgPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      bgPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      bgPos[i * 3 + 2] = r * Math.cos(phi);
    }
    bgGeo.setAttribute('position', new THREE.BufferAttribute(bgPos, 3));
    const bgMat = new THREE.PointsMaterial({
      size: 0.3,
      color: 0xaaccff,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    bgGroup.add(new THREE.Points(bgGeo, bgMat));


    // --- SNOW ---
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext('2d');
    if (context) {
      context.beginPath();
      context.arc(16, 16, 14, 0, 2 * Math.PI);
      context.fillStyle = '#ffffff';
      context.fill();
    }
    const snowTexture = new THREE.CanvasTexture(canvas);

    const snowCount = 300; 
    const snowGeo = new THREE.BufferGeometry();
    const snowPos = new Float32Array(snowCount * 3);
    const snowVelocities = new Float32Array(snowCount); 

    for (let i = 0; i < snowCount; i++) {
        snowPos[i * 3] = (Math.random() - 0.5) * 100;
        snowPos[i * 3 + 1] = (Math.random() - 0.5) * 80; 
        snowPos[i * 3 + 2] = (Math.random() - 0.5) * 100;
        snowVelocities[i] = 0.02 + Math.random() * 0.05; 
    }
    snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
    const snowMat = new THREE.PointsMaterial({
        color: 0xffffff,
        map: snowTexture,
        size: 0.5, 
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });
    const snowSystem = new THREE.Points(snowGeo, snowMat);
    snowSystemRef.current = snowSystem;
    snowSystem.userData = { velocities: snowVelocities };
    scene.add(snowSystem);

    // Lights
    scene.add(new THREE.AmbientLight(0x222222)); 
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight); 
    
    // 3. Animation Loop
    let animationId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

      // Vision Check
      const vision = VisionService.getInstance();
      const result = vision.detect();
      onVisionUpdate(result);

      // Camera Zoom Smoothing
      if (cameraRef.current) {
         cameraRef.current.position.z += (zoomTarget.current - cameraRef.current.position.z) * 0.1;
      }

      // Auto Rotation (Main Pivot)
      if (pivotRef.current) {
        pivotRef.current.rotation.y = time * 0.1; 
        pivotRef.current.rotation.x = Math.sin(time * 0.5) * 0.03; 
        
        // Sync Reflection Pivot
        if (reflectionPivotRef.current) {
            reflectionPivotRef.current.rotation.y = pivotRef.current.rotation.y;
            reflectionPivotRef.current.rotation.x = pivotRef.current.rotation.x;
        }
      }

      // Background Drift
      if (bgGroupRef.current) {
        bgGroupRef.current.rotation.y = -time * 0.02;
      }

      // Snow
      if (snowSystemRef.current) {
         const positions = snowSystemRef.current.geometry.attributes.position.array as Float32Array;
         const velocities = snowSystemRef.current.userData.velocities as Float32Array;
         for(let i = 0; i < snowCount; i++) {
             positions[i * 3 + 1] -= velocities[i];
             if (positions[i * 3 + 1] < -40) {
                 positions[i * 3 + 1] = 40;
             }
         }
         snowSystemRef.current.geometry.attributes.position.needsUpdate = true;
         snowSystemRef.current.rotation.y = Math.sin(time * 0.1) * 0.1;
      }

      // Morph Logic with ORGANIC BREATHING
      if (particlesRef.current && treePositionsRef.current && spherePositionsRef.current) {
        const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
        const currentMorph = morphState.current.value;

        for (let i = 0; i < particleCount; i++) {
          const i3 = i * 3;
          
          // 1. Linear Interpolation of Base Positions
          const targetX = treePositionsRef.current[i3] * (1 - currentMorph) + spherePositionsRef.current[i3] * currentMorph;
          const targetY = treePositionsRef.current[i3 + 1] * (1 - currentMorph) + spherePositionsRef.current[i3 + 1] * currentMorph;
          const targetZ = treePositionsRef.current[i3 + 2] * (1 - currentMorph) + spherePositionsRef.current[i3 + 2] * currentMorph;
          
          // 2. Add "Breathing" / Organic Motion
          // We add a sine wave perturbation based on position and time to make it feel alive
          const noiseFreq = 0.5;
          const noiseAmp = 0.15;
          const timeOffset = time * 1.5;

          const breatheX = Math.sin(targetY * noiseFreq + timeOffset) * noiseAmp;
          const breatheY = Math.cos(targetX * noiseFreq + timeOffset * 0.8) * noiseAmp * 0.5;
          const breatheZ = Math.sin(targetY * noiseFreq + timeOffset * 1.2) * noiseAmp;

          positions[i3] = targetX + breatheX;
          positions[i3 + 1] = targetY + breatheY;
          positions[i3 + 2] = targetZ + breatheZ;
        }
        particlesRef.current.geometry.attributes.position.needsUpdate = true;
      }

      // Decorations with Twinkle Effect
      if (decorationsGroupRef.current) {
        decorationsGroupRef.current.rotation.y = time * 0.08;
        
        // Iterate through decorations to apply Twinkle
        decorationsGroupRef.current.children.forEach((child, i) => {
            // Calculate a unique phase for each item so they don't twinkle in unison
            const phase = i * 13.0 + child.position.x;
            
            // 1. Mesh Emissive Twinkle (Gifts, Baubles)
            if (child.type === 'Mesh') {
               const mesh = child as THREE.Mesh;
               if (mesh.material && (mesh.material as THREE.MeshStandardMaterial).emissive) {
                   // Combined sine waves for natural irregularity
                   const twinkle = Math.sin(time * 2 + phase) * 0.15 + Math.cos(time * 5.3 + phase) * 0.05;
                   // Base intensity 0.7 + twinkle
                   (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.7 + twinkle;
               }
            }
            
            // 2. Glow Sprite Twinkle (Attached to Gifts/Baubles/Snowmen)
            // Look for Sprite children
            child.children.forEach(grandChild => {
                if (grandChild.type === 'Sprite') {
                     const sprite = grandChild as THREE.Sprite;
                     const opacityTwinkle = Math.sin(time * 2.5 + phase) * 0.1;
                     // Base opacity ~0.4 + twinkle
                     sprite.material.opacity = 0.4 + opacityTwinkle;
                }
            });
        });
      }
      
      if (reflectionDecGroupRef.current) {
        reflectionDecGroupRef.current.rotation.y = time * 0.08;
      }

      // Free Snowman
      if (freeSnowmanRef.current) {
          const orbitRadius = 11;
          const orbitSpeed = 0.4;
          const angle = time * orbitSpeed;
          freeSnowmanRef.current.position.x = Math.cos(angle) * orbitRadius;
          freeSnowmanRef.current.position.z = Math.sin(angle) * orbitRadius;
          freeSnowmanRef.current.position.y = -7 + Math.abs(Math.sin(time * 3)) * 0.5;
          const nextX = Math.cos(angle + 0.1) * orbitRadius;
          const nextZ = Math.sin(angle + 0.1) * orbitRadius;
          freeSnowmanRef.current.lookAt(nextX, -7, nextZ);
      }
      
      // Star Animation Loop 
      if (starMeshRef.current) {
         // Subtle idle bobbing
         starMeshRef.current.rotation.z = Math.sin(time * 2) * 0.1;
         starMeshRef.current.rotation.x = Math.cos(time * 1.5) * 0.1;

         // Star Twinkle: Pulse + Random Flicker
         const pulse = Math.sin(time * 2.5) * 0.2 + 1.5;
         const flicker = (Math.random() - 0.5) * 0.3; // Random fluctuation
         const totalIntensity = pulse + flicker;

         (starMeshRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = totalIntensity;
         
         // Sync Reflection Star Material Intensity
         if (reflectionStarGroupRef.current && reflectionStarGroupRef.current.children[0]) {
             const refMesh = reflectionStarGroupRef.current.children[0] as THREE.Mesh;
             if (refMesh.material) {
                (refMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = totalIntensity * 0.3;
             }
         }
      }
      
      // Sync Reflection Star
      if (reflectionStarGroupRef.current && starGroupRef.current) {
         reflectionStarGroupRef.current.position.copy(starGroupRef.current.position);
         reflectionStarGroupRef.current.rotation.copy(starGroupRef.current.rotation); 
         
         const reflectMesh = reflectionStarGroupRef.current.children[0];
         if (reflectMesh && starMeshRef.current) {
             reflectMesh.rotation.copy(starMeshRef.current.rotation);
         }
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (containerRef.current && cameraRef.current && rendererRef.current) {
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        cameraRef.current.aspect = w / h;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(w, h);
      }
    };
    window.addEventListener('resize', handleResize);
    
    // Zoom Handler
    const handleWheel = (e: WheelEvent) => {
        zoomTarget.current += e.deltaY * 0.02;
        zoomTarget.current = Math.max(10, Math.min(60, zoomTarget.current));
    };
    window.addEventListener('wheel', handleWheel);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('wheel', handleWheel);
      cancelAnimationFrame(animationId);
      if (containerRef.current) containerRef.current.innerHTML = '';
      if (videoRef.current.srcObject) {
         const stream = videoRef.current.srcObject as MediaStream;
         stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [onVisionUpdate]);

  // Handle Mode Changes via GSAP
  useEffect(() => {
    // TREE MODE
    if (targetMode === AppMode.TREE) {
      gsap.to(morphState.current, { value: 0, duration: 2.2, ease: "power2.inOut" });
      
      // Smooth Star Transition to Top
      if (starGroupRef.current) {
         // 1. Move up with smoother easing
         gsap.to(starGroupRef.current.position, { 
             x: 0, 
             y: 7.8, 
             z: 0, 
             duration: 2.2, 
             ease: "power3.inOut" 
         });
         
         // 2. Rotate the group while moving for a dynamic feel
         gsap.to(starGroupRef.current.rotation, { 
            y: starGroupRef.current.rotation.y + Math.PI * 2, 
            duration: 2.2, 
            ease: "power2.inOut" 
         });

         // 3. Scale pop
         gsap.fromTo(starGroupRef.current.scale, 
             { x: 1, y: 1, z: 1 },
             { x: 1.3, y: 1.3, z: 1.3, duration: 0.8, yoyo: true, repeat: 1, ease: "sine.inOut" }
         );
      }

      // Decorations (Hide)
      if (decorationsGroupRef.current) {
        gsap.to(decorationsGroupRef.current.scale, { x: 0, y: 0, z: 0, duration: 1, ease: "power2.in" });
      }
      if (reflectionDecGroupRef.current) {
        gsap.to(reflectionDecGroupRef.current.scale, { x: 0, y: 0, z: 0, duration: 1, ease: "power2.in" });
      }

    // SPHERE MODE
    } else {
      gsap.to(morphState.current, { value: 1, duration: 2.2, ease: "power2.inOut" });

      // Smooth Star Transition to Center
      if (starGroupRef.current) {
         // 1. Move to center
         gsap.to(starGroupRef.current.position, { 
             x: 0, 
             y: 0, 
             z: 0, 
             duration: 2.2, 
             ease: "power3.inOut" 
         });

         // 2. Counter-Rotate
         gsap.to(starGroupRef.current.rotation, { 
            y: starGroupRef.current.rotation.y - Math.PI * 2, 
            duration: 2.2, 
            ease: "power2.inOut" 
         });

         // 3. Scale pop (BIGGER for Sphere Center Highlight)
         gsap.fromTo(starGroupRef.current.scale, 
             { x: 1, y: 1, z: 1 },
             { x: 2.2, y: 2.2, z: 2.2, duration: 0.8, yoyo: true, repeat: 1, ease: "sine.inOut" } // Increased max scale
         );
      }

      // Decorations (Show)
      if (decorationsGroupRef.current) {
        gsap.to(decorationsGroupRef.current.scale, { x: 1, y: 1, z: 1, duration: 1.5, delay: 0.5, ease: "elastic.out(1, 0.75)" });
      }
      if (reflectionDecGroupRef.current) {
        gsap.to(reflectionDecGroupRef.current.scale, { x: 1, y: 1, z: 1, duration: 1.5, delay: 0.5, ease: "elastic.out(1, 0.75)" });
      }
    }
  }, [targetMode]);

  return <div ref={containerRef} className="w-full h-full" />;
};

export default ChristmasCanvas;
