
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

// --- HELPERS ---

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

// Helper to create a Corgi
const createCorgiMesh = (scale: number = 1, glowSpriteMaterial?: THREE.SpriteMaterial): THREE.Group => {
  const group = new THREE.Group();

  // Materials - Glowing Light Brown / Golden
  const orangeFur = new THREE.MeshStandardMaterial({
    color: 0xFFAA33, // Light Golden Brown
    roughness: 0.5,
    emissive: 0xFF6600, // Orange Glow
    emissiveIntensity: 0.4
  });
  const whiteFur = new THREE.MeshStandardMaterial({
    color: 0xFFFFFF,
    roughness: 0.5,
    emissive: 0x444444, // Subtle White Glow
    emissiveIntensity: 0.2
  });
  const blackMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
  const pinkMat = new THREE.MeshStandardMaterial({
    color: 0xFF69B4,
    emissive: 0xFF1493, // Glowing Tongue
    emissiveIntensity: 0.5
  });

  // Body (The Loaf)
  const bodyGeo = new THREE.BoxGeometry(0.6 * scale, 0.5 * scale, 1.0 * scale);
  const body = new THREE.Mesh(bodyGeo, orangeFur);
  body.position.y = 0.4 * scale;

  // Butt (White patch at back)
  const buttGeo = new THREE.BoxGeometry(0.4 * scale, 0.3 * scale, 0.1 * scale);
  const butt = new THREE.Mesh(buttGeo, whiteFur);
  butt.position.set(0, 0.35 * scale, -0.51 * scale);

  // Tail stub (Corgi nub)
  const tailGeo = new THREE.SphereGeometry(0.1 * scale, 8, 8);
  const tail = new THREE.Mesh(tailGeo, orangeFur);
  tail.position.set(0, 0.55 * scale, -0.5 * scale);

  // Head Group
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.8 * scale, 0.55 * scale);

  const headGeo = new THREE.BoxGeometry(0.5 * scale, 0.5 * scale, 0.45 * scale);
  const head = new THREE.Mesh(headGeo, orangeFur);

  // Snout
  const snoutGeo = new THREE.BoxGeometry(0.25 * scale, 0.2 * scale, 0.25 * scale);
  const snout = new THREE.Mesh(snoutGeo, whiteFur);
  snout.position.set(0, -0.1 * scale, 0.3 * scale);

  // Nose
  const noseGeo = new THREE.SphereGeometry(0.06 * scale, 8, 8);
  const nose = new THREE.Mesh(noseGeo, blackMat);
  nose.position.set(0, 0, 0.15 * scale); // Relative to snout
  snout.add(nose);

  // Tongue (Sticking out)
  const tongueGeo = new THREE.BoxGeometry(0.12 * scale, 0.02 * scale, 0.2 * scale);
  const tongue = new THREE.Mesh(tongueGeo, pinkMat);
  tongue.position.set(0, -0.1 * scale, 0.15 * scale); // Relative to snout
  tongue.rotation.x = 0.2;
  tongue.name = "tongue"; // Identify for animation
  snout.add(tongue);

  // Ears (Large triangles)
  const earGeo = new THREE.ConeGeometry(0.12 * scale, 0.3 * scale, 4);
  const earL = new THREE.Mesh(earGeo, orangeFur);
  earL.position.set(-0.2 * scale, 0.35 * scale, 0);
  earL.rotation.set(0, 0, 0.4); // Tilt out

  const earR = new THREE.Mesh(earGeo, orangeFur);
  earR.position.set(0.2 * scale, 0.35 * scale, 0);
  earR.rotation.set(0, 0, -0.4);

  // Eyes
  const eyeGeo = new THREE.SphereGeometry(0.05 * scale, 8, 8);
  const eyeL = new THREE.Mesh(eyeGeo, blackMat);
  eyeL.position.set(-0.15 * scale, 0.05 * scale, 0.23 * scale);
  const eyeR = new THREE.Mesh(eyeGeo, blackMat);
  eyeR.position.set(0.15 * scale, 0.05 * scale, 0.23 * scale);

  headGroup.add(head, snout, earL, earR, eyeL, eyeR);

  // Legs (Stumps)
  const legGeo = new THREE.CylinderGeometry(0.08 * scale, 0.08 * scale, 0.3 * scale);
  const flLeg = new THREE.Mesh(legGeo, whiteFur);
  flLeg.position.set(-0.2 * scale, 0.15 * scale, 0.35 * scale);

  const frLeg = new THREE.Mesh(legGeo, whiteFur);
  frLeg.position.set(0.2 * scale, 0.15 * scale, 0.35 * scale);

  const blLeg = new THREE.Mesh(legGeo, whiteFur);
  blLeg.position.set(-0.2 * scale, 0.15 * scale, -0.35 * scale);

  const brLeg = new THREE.Mesh(legGeo, whiteFur);
  brLeg.position.set(0.2 * scale, 0.15 * scale, -0.35 * scale);

  group.add(body, butt, tail, headGroup, flLeg, frLeg, blLeg, brLeg);

  // Glow Sprite Aura
  if (glowSpriteMaterial) {
    const glow = new THREE.Sprite(glowSpriteMaterial.clone());
    glow.material.color.setHex(0xFF9900); // Golden Aura
    glow.scale.set(3.5 * scale, 3.5 * scale, 1);
    glow.material.opacity = 0.4;
    group.add(glow);
  }

  // Simple shadow
  const shadowGeo = new THREE.CircleGeometry(0.6 * scale, 16);
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, opacity: 0.3, transparent: true });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.05;
  group.add(shadow);

  return group;
};

// --- UPGRADED SANTA (Bigger, Detailed, Sharper) ---
const createSantaMesh = (scale: number = 1, glowSpriteMaterial?: THREE.SpriteMaterial): THREE.Group => {
  const group = new THREE.Group();

  // High Quality Materials
  const redMat = new THREE.MeshStandardMaterial({
    color: 0xE60000, // Vibrant Red
    roughness: 0.3,
    metalness: 0.1,
    emissive: 0x880000,
    emissiveIntensity: 0.3
  });
  const whiteMat = new THREE.MeshStandardMaterial({
    color: 0xFFFFFF,
    roughness: 0.8,
    emissive: 0xEEEEEE,
    emissiveIntensity: 0.5
  });
  const faceMat = new THREE.MeshStandardMaterial({
    color: 0xFFD1B3, // Skin tone
    roughness: 0.5
  });
  const blackMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4 });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xFFD700,
    metalness: 0.8,
    roughness: 0.2,
    emissive: 0xAA8800,
    emissiveIntensity: 0.4
  });
  const greenBagMat = new THREE.MeshStandardMaterial({
    color: 0x00AA44,
    roughness: 0.6,
    emissive: 0x004411,
    emissiveIntensity: 0.3
  });

  // Body (Fat Cylinder)
  const bodyGeo = new THREE.CylinderGeometry(0.45 * scale, 0.55 * scale, 0.75 * scale, 16);
  const body = new THREE.Mesh(bodyGeo, redMat);
  body.position.y = 0.5 * scale;

  // White Trim at bottom of coat
  const trimGeo = new THREE.TorusGeometry(0.52 * scale, 0.08 * scale, 8, 16);
  const trim = new THREE.Mesh(trimGeo, whiteMat);
  trim.rotation.x = Math.PI / 2;
  trim.position.y = 0.15 * scale;
  body.add(trim);

  // Belt
  const beltGeo = new THREE.CylinderGeometry(0.48 * scale, 0.52 * scale, 0.12 * scale, 16);
  const belt = new THREE.Mesh(beltGeo, blackMat);
  belt.position.y = 0.5 * scale;

  // Gold Buckle
  const buckleGeo = new THREE.BoxGeometry(0.15 * scale, 0.15 * scale, 0.1 * scale);
  const buckle = new THREE.Mesh(buckleGeo, goldMat);
  buckle.position.set(0, 0.5 * scale, 0.48 * scale);

  // Head
  const headGeo = new THREE.SphereGeometry(0.3 * scale, 16, 16);
  const head = new THREE.Mesh(headGeo, faceMat);
  head.position.y = 1.05 * scale;

  // Rosy Cheeks
  const cheekGeo = new THREE.SphereGeometry(0.06 * scale, 8, 8);
  const cheekMat = new THREE.MeshStandardMaterial({ color: 0xFF9999 });
  const lCheek = new THREE.Mesh(cheekGeo, cheekMat);
  lCheek.position.set(-0.12 * scale, 1.02 * scale, 0.25 * scale);
  const rCheek = new THREE.Mesh(cheekGeo, cheekMat);
  rCheek.position.set(0.12 * scale, 1.02 * scale, 0.25 * scale);

  // Beard (Fuller)
  const beardGeo = new THREE.SphereGeometry(0.3 * scale, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  const beard = new THREE.Mesh(beardGeo, whiteMat);
  beard.rotation.x = Math.PI; // Flip bowl shape down
  beard.position.set(0, 1.05 * scale, 0.05 * scale);
  beard.scale.set(1, 1, 0.8);

  // Moustache
  const stacheGeo = new THREE.CapsuleGeometry(0.06 * scale, 0.15 * scale, 4, 8);
  const lStache = new THREE.Mesh(stacheGeo, whiteMat);
  lStache.rotation.z = Math.PI / 3;
  lStache.rotation.y = -0.2;
  lStache.position.set(-0.08 * scale, 1.0 * scale, 0.28 * scale);

  const rStache = new THREE.Mesh(stacheGeo, whiteMat);
  rStache.rotation.z = -Math.PI / 3;
  rStache.rotation.y = 0.2;
  rStache.position.set(0.08 * scale, 1.0 * scale, 0.28 * scale);

  // Eyes
  const eyeGeo = new THREE.SphereGeometry(0.04 * scale, 8, 8);
  const lEye = new THREE.Mesh(eyeGeo, blackMat);
  lEye.position.set(-0.1 * scale, 1.12 * scale, 0.25 * scale);
  const rEye = new THREE.Mesh(eyeGeo, blackMat);
  rEye.position.set(0.1 * scale, 1.12 * scale, 0.25 * scale);

  // Hat
  const hatGeo = new THREE.ConeGeometry(0.3 * scale, 0.6 * scale, 16);
  const hat = new THREE.Mesh(hatGeo, redMat);
  hat.position.set(0, 1.35 * scale, 0);
  hat.rotation.x = -0.1; // Slight tilt back

  const hatTrimGeo = new THREE.TorusGeometry(0.3 * scale, 0.08 * scale, 8, 16);
  const hatTrim = new THREE.Mesh(hatTrimGeo, whiteMat);
  hatTrim.rotation.x = Math.PI / 2 - 0.1;
  hatTrim.position.set(0, 1.2 * scale, 0);

  const pomPomGeo = new THREE.SphereGeometry(0.1 * scale, 16, 16);
  const pomPom = new THREE.Mesh(pomPomGeo, whiteMat);
  pomPom.position.set(0, 1.65 * scale, -0.1 * scale);

  // Arms
  const armGeo = new THREE.CylinderGeometry(0.1 * scale, 0.1 * scale, 0.45 * scale);
  const lArm = new THREE.Mesh(armGeo, redMat);
  lArm.position.set(-0.5 * scale, 0.75 * scale, 0);
  lArm.rotation.z = Math.PI / 4;

  const rArm = new THREE.Mesh(armGeo, redMat);
  rArm.position.set(0.5 * scale, 0.75 * scale, 0);
  rArm.rotation.z = -Math.PI / 4;

  // Mittens
  const mittenGeo = new THREE.SphereGeometry(0.12 * scale, 8, 8);
  const lMit = new THREE.Mesh(mittenGeo, blackMat);
  lMit.position.set(0, -0.25 * scale, 0);
  lArm.add(lMit);
  const rMit = new THREE.Mesh(mittenGeo, blackMat);
  rMit.position.set(0, -0.25 * scale, 0);
  rArm.add(rMit);

  // Legs
  const legGeo = new THREE.CylinderGeometry(0.13 * scale, 0.13 * scale, 0.45 * scale);
  const lLeg = new THREE.Mesh(legGeo, redMat);
  lLeg.position.set(-0.22 * scale, 0.25 * scale, 0);
  const rLeg = new THREE.Mesh(legGeo, redMat);
  rLeg.position.set(0.22 * scale, 0.25 * scale, 0);

  const bootGeo = new THREE.BoxGeometry(0.18 * scale, 0.2 * scale, 0.25 * scale);
  const lBoot = new THREE.Mesh(bootGeo, blackMat);
  lBoot.position.set(-0.22 * scale, 0.1 * scale, 0.05 * scale);
  const rBoot = new THREE.Mesh(bootGeo, blackMat);
  rBoot.position.set(0.22 * scale, 0.1 * scale, 0.05 * scale);

  // Big Gift Bag
  const bagGeo = new THREE.DodecahedronGeometry(0.55 * scale);
  const bag = new THREE.Mesh(bagGeo, greenBagMat);
  bag.position.set(0.45 * scale, 0.8 * scale, -0.45 * scale);
  bag.rotation.z = 0.5;

  group.add(body, belt, buckle, head, beard, lStache, rStache, lCheek, rCheek, lEye, rEye, hat, hatTrim, pomPom, lArm, rArm, lLeg, rLeg, lBoot, rBoot, bag);

  // Shadow
  const shadowGeo = new THREE.CircleGeometry(0.7 * scale, 16);
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, opacity: 0.3, transparent: true });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.05;
  group.add(shadow);

  // Glow Sprite
  if (glowSpriteMaterial) {
    const glow = new THREE.Sprite(glowSpriteMaterial.clone());
    glow.material.color.setHex(0xFF2222);
    glow.scale.set(5 * scale, 5 * scale, 1);
    glow.material.opacity = 0.4;
    group.add(glow);
  }

  return group;
}

// --- NEW BACKGROUND: DREAMY SNOWY TOWN ---
const createDreamyTown = (): THREE.Group => {
  const townGroup = new THREE.Group();

  // 1. Snowy Ground (Endless)
  const groundGeo = new THREE.PlaneGeometry(300, 300, 32, 32);

  // Add some waviness to vertex positions for hills
  const posAttribute = groundGeo.attributes.position;
  for (let i = 0; i < posAttribute.count; i++) {
    const x = posAttribute.getX(i);
    const y = posAttribute.getY(i);
    // Z in plane geometry becomes Y in world
    const z = Math.sin(x * 0.05) * Math.cos(y * 0.05) * 2;
    posAttribute.setZ(i, z);
  }
  groundGeo.computeVertexNormals();

  const groundMat = new THREE.MeshStandardMaterial({
    color: 0xeefeff, // Icy white
    roughness: 0.9,
    metalness: 0.1
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -10; // Base level
  townGroup.add(ground);

  // 2. Houses Generation
  const houseColors = [0x5D4037, 0x455A64, 0x512DA8, 0x388E3C, 0xC62828];
  const numHouses = 24;
  const minRadius = 35;
  const maxRadius = 60;

  for (let i = 0; i < numHouses; i++) {
    const angle = (i / numHouses) * Math.PI * 2 + (Math.random() * 0.5);
    const radius = minRadius + Math.random() * (maxRadius - minRadius);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    // Simple Height map approx
    const y = -10 + (Math.sin(x * 0.05) * Math.cos(z * 0.05) * 2);

    const scale = 1.5 + Math.random() * 1.5;
    const houseColor = houseColors[Math.floor(Math.random() * houseColors.length)];

    const house = new THREE.Group();
    house.position.set(x, y + scale, z);
    house.lookAt(0, y + scale, 0); // Face center

    // Walls
    const wallGeo = new THREE.BoxGeometry(2 * scale, 2 * scale, 1.5 * scale);
    const wallMat = new THREE.MeshStandardMaterial({ color: houseColor });
    const walls = new THREE.Mesh(wallGeo, wallMat);
    house.add(walls);

    // Roof
    const roofGeo = new THREE.ConeGeometry(1.6 * scale, 1.5 * scale, 4);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x222222 }); // Dark roof
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 1.75 * scale;
    roof.rotation.y = Math.PI / 4;
    house.add(roof);

    // Snow on Roof
    const snowRoofGeo = new THREE.ConeGeometry(1.5 * scale, 0.5 * scale, 4);
    const snowMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x555555 });
    const snowRoof = new THREE.Mesh(snowRoofGeo, snowMat);
    snowRoof.position.y = 2.2 * scale;
    snowRoof.rotation.y = Math.PI / 4;
    house.add(snowRoof);

    // Windows (Glowing)
    const winGeo = new THREE.PlaneGeometry(0.5 * scale, 0.5 * scale);
    const winMat = new THREE.MeshBasicMaterial({ color: 0xFFD700 }); // Warm light
    const w1 = new THREE.Mesh(winGeo, winMat);
    w1.position.set(0.5 * scale, 0.2 * scale, 0.76 * scale);
    const w2 = new THREE.Mesh(winGeo, winMat);
    w2.position.set(-0.5 * scale, 0.2 * scale, 0.76 * scale);
    house.add(w1, w2);

    townGroup.add(house);
  }

  // 3. Trees Generation
  const numTrees = 50;
  for (let i = 0; i < numTrees; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = minRadius + Math.random() * 40; // Scattered further
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = -10 + (Math.sin(x * 0.05) * Math.cos(z * 0.05) * 2);

    const scale = 2 + Math.random() * 3;
    const treeGroup = new THREE.Group();
    treeGroup.position.set(x, y, z);

    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.2 * scale, 0.3 * scale, 1 * scale);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3E2723 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.5 * scale;
    treeGroup.add(trunk);

    // Leaves (Stacked cones)
    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x1B5E20 });
    const snowTipMat = new THREE.MeshStandardMaterial({ color: 0xffffff });

    const l1 = new THREE.Mesh(new THREE.ConeGeometry(1.2 * scale, 1.5 * scale, 8), leavesMat);
    l1.position.y = 1.2 * scale;
    const l2 = new THREE.Mesh(new THREE.ConeGeometry(0.9 * scale, 1.2 * scale, 8), leavesMat);
    l2.position.y = 2.0 * scale;
    const l3 = new THREE.Mesh(new THREE.ConeGeometry(0.6 * scale, 1.0 * scale, 8), leavesMat);
    l3.position.y = 2.8 * scale;

    // Snow Tips
    const s3 = new THREE.Mesh(new THREE.ConeGeometry(0.3 * scale, 0.4 * scale, 8), snowTipMat);
    s3.position.y = 3.1 * scale;

    treeGroup.add(l1, l2, l3, s3);
    townGroup.add(treeGroup);
  }

  return townGroup;
}

// Generate a smooth circular radial gradient texture
const createAuraTexture = (): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    // Smooth fade out from center to edge
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.6)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
  }
  return new THREE.CanvasTexture(canvas);
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

  const townRef = useRef<THREE.Group | null>(null);
  const snowSystemRef = useRef<THREE.Points | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);

  // Chase Group Refs
  const freeSnowmanRef = useRef<THREE.Group | null>(null);
  const corgiRef = useRef<THREE.Group | null>(null);
  const santaRef = useRef<THREE.Group | null>(null);

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
    // CHANGED: Fog to match the dreamy blue town night
    scene.fog = new THREE.FogExp2(0x0f0f2a, 0.015);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 5, 30); // Slight tilt up
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    // CHANGED: Clear color to Deep Blue Night
    renderer.setClearColor(0x0f0f2a, 1);
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

    // --- AURA MATERIAL (Perfect Circular Glow) ---
    const auraTexture = createAuraTexture();
    const auraMaterial = new THREE.SpriteMaterial({
      map: auraTexture,
      color: 0xffffff,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.6,
      depthWrite: false
    });

    // --- MIRROR FLOOR ---
    const floorY = -9;
    const floorGeo = new THREE.PlaneGeometry(200, 200);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x111122, // Darker blue reflection
      roughness: 0.1,
      metalness: 0.6,
      transparent: true,
      opacity: 0.7
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
      bulbCtx.fillRect(0, 0, 32, 32);
    }
    const bulbTexture = new THREE.CanvasTexture(bulbCanvas);

    // --- COLOR DISTRIBUTION ---
    const colors = new Float32Array(particleCount * 3);
    const mainColor = new THREE.Color(0x2E8B57);
    const accentColors = [
      new THREE.Color(0xFFD700), // Gold
      new THREE.Color(0xE0115F), // Ruby
      new THREE.Color(0x00FFFF), // Cyan
      new THREE.Color(0xFFFAF0), // Warm White
      new THREE.Color(0xFF3333), // Bright Red
    ];

    for (let i = 0; i < particleCount; i++) {
      let color;
      if (Math.random() < 0.7) {
        color = mainColor.clone().offsetHSL(0, 0, (Math.random() - 0.5) * 0.1);
      } else {
        color = accentColors[Math.floor(Math.random() * accentColors.length)];
      }
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.45,
      map: bulbTexture,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(geometry, material);
    pivot.add(particles);
    particlesRef.current = particles;

    const reflectParticles = new THREE.Points(geometry, material.clone());
    reflectParticles.material.opacity = 0.4;
    reflectionPivot.add(reflectParticles);


    // B. 3D Star
    const starGroup = new THREE.Group();
    starGroup.position.set(0, 7.8, 0);
    pivot.add(starGroup);
    starGroupRef.current = starGroup;

    const reflectStarGroup = new THREE.Group();
    reflectStarGroup.position.set(0, 7.8, 0);
    reflectionPivot.add(reflectStarGroup);
    reflectionStarGroupRef.current = reflectStarGroup;

    const starGeo = createStarGeometry(0.8, 2.0, 5, 0.6);
    const starMat = new THREE.MeshStandardMaterial({
      color: 0xFFD700,
      roughness: 0.1,
      metalness: 0.1,
      emissive: 0xFFD700,
      emissiveIntensity: 1.5,
    });
    const starMesh = new THREE.Mesh(starGeo, starMat);
    starGroup.add(starMesh);
    starMeshRef.current = starMesh;

    const reflectStarMesh = new THREE.Mesh(starGeo, starMat.clone());
    reflectStarMesh.material.emissiveIntensity = 0.5;
    reflectStarGroup.add(reflectStarMesh);

    const starLight = new THREE.PointLight(0xFFAA00, 3.5, 60);
    starLight.decay = 2;
    starMesh.add(starLight);

    const starGlowSprite = new THREE.Sprite(spriteMaterial.clone());
    starGlowSprite.material.color.setHex(0xFFD700);
    starGlowSprite.scale.set(10, 10, 1);
    starMesh.add(starGlowSprite);

    const reflectGlow = starGlowSprite.clone();
    reflectGlow.material.opacity = 0.2;
    reflectStarMesh.add(reflectGlow);


    // C. Decorations Group
    const decGroup = new THREE.Group();
    pivot.add(decGroup);
    decorationsGroupRef.current = decGroup;
    decGroup.scale.set(0, 0, 0);

    const reflectDecGroup = new THREE.Group();
    reflectionPivot.add(reflectDecGroup);
    reflectionDecGroupRef.current = reflectDecGroup;
    reflectDecGroup.scale.set(0, 0, 0);


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
        // Snowman (Floating) - Use Aura for floating ones too? Or keep standard
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

    for (let i = 0; i < 40; i++) {
      const dec = createDecoration(false);
      decGroup.add(dec);
      const reflectDec = dec.clone();
      reflectDecGroup.add(reflectDec);
    }


    // --- CHASE SEQUENCE: SANTA, SNOWMAN, CORGI ---
    // Use new auraMaterial for perfect circles

    // 1. Santa (Leader) - CHANGED: Larger Scale (2.2)
    const santa = createSantaMesh(2.2, auraMaterial);
    scene.add(santa);
    santaRef.current = santa;

    // 2. Snowman (Chaser 1)
    const freeSnowman = createSnowmanMesh(1.8, auraMaterial);
    scene.add(freeSnowman);
    freeSnowmanRef.current = freeSnowman;

    // 3. Corgi (Chaser 2)
    const corgi = createCorgiMesh(1.2, auraMaterial);
    scene.add(corgi);
    corgiRef.current = corgi;


    // --- BACKGROUND: DREAMY TOWN ---
    const town = createDreamyTown();
    scene.add(town);
    townRef.current = town;

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

    const snowCount = 500; // Increased snow
    const snowGeo = new THREE.BufferGeometry();
    const snowPos = new Float32Array(snowCount * 3);
    const snowVelocities = new Float32Array(snowCount);

    for (let i = 0; i < snowCount; i++) {
      snowPos[i * 3] = (Math.random() - 0.5) * 120;
      snowPos[i * 3 + 1] = (Math.random() - 0.5) * 80;
      snowPos[i * 3 + 2] = (Math.random() - 0.5) * 120;
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

    // Lights - Enhanced for Town Atmosphere
    scene.add(new THREE.AmbientLight(0x404060, 1.2)); // Blueish Ambient
    const dirLight = new THREE.DirectionalLight(0xffeebb, 0.8); // Moon/Streetlight warmth
    dirLight.position.set(20, 30, 20);
    scene.add(dirLight);

    // Blue backlight for depth
    const backLight = new THREE.DirectionalLight(0x4444ff, 0.5);
    backLight.position.set(-20, 10, -20);
    scene.add(backLight);


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

      // Town Rotation (Slow drift)
      if (townRef.current) {
        townRef.current.rotation.y = -time * 0.03;
      }

      // Snow
      if (snowSystemRef.current) {
        const positions = snowSystemRef.current.geometry.attributes.position.array as Float32Array;
        const velocities = snowSystemRef.current.userData.velocities as Float32Array;
        for (let i = 0; i < snowCount; i++) {
          positions[i * 3 + 1] -= velocities[i];
          if (positions[i * 3 + 1] < -40) {
            positions[i * 3 + 1] = 40;
          }
        }
        snowSystemRef.current.geometry.attributes.position.needsUpdate = true;
        // Wiggle snow
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

        decorationsGroupRef.current.children.forEach((child, i) => {
          const phase = i * 13.0 + child.position.x;
          if (child.type === 'Mesh') {
            const mesh = child as THREE.Mesh;
            if (mesh.material && (mesh.material as THREE.MeshStandardMaterial).emissive) {
              const twinkle = Math.sin(time * 2 + phase) * 0.15 + Math.cos(time * 5.3 + phase) * 0.05;
              (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.7 + twinkle;
            }
          }
          child.children.forEach(grandChild => {
            if (grandChild.type === 'Sprite') {
              const sprite = grandChild as THREE.Sprite;
              const opacityTwinkle = Math.sin(time * 2.5 + phase) * 0.1;
              sprite.material.opacity = 0.4 + opacityTwinkle;
            }
          });
        });
      }

      if (reflectionDecGroupRef.current) {
        reflectionDecGroupRef.current.rotation.y = time * 0.08;
      }

      // --- CHASE ANIMATION ---
      const orbitRadius = 13; // Increased slightly for larger Santa
      const orbitSpeed = 0.4;
      const angle = time * orbitSpeed;

      // 1. Santa (Leader) - Ahead
      if (santaRef.current) {
        const santaAngle = angle + 0.8;
        santaRef.current.position.x = Math.cos(santaAngle) * orbitRadius;
        santaRef.current.position.z = Math.sin(santaAngle) * orbitRadius;
        santaRef.current.position.y = -7 + Math.abs(Math.sin(time * 4)) * 0.3;

        const sNextX = Math.cos(santaAngle + 0.1) * orbitRadius;
        const sNextZ = Math.sin(santaAngle + 0.1) * orbitRadius;
        santaRef.current.lookAt(sNextX, -7, sNextZ);
        santaRef.current.rotateX(0.1);
      }

      // 2. Snowman (Middle)
      if (freeSnowmanRef.current) {
        freeSnowmanRef.current.position.x = Math.cos(angle) * orbitRadius;
        freeSnowmanRef.current.position.z = Math.sin(angle) * orbitRadius;
        freeSnowmanRef.current.position.y = -7 + Math.abs(Math.sin(time * 3)) * 0.5;

        const nextX = Math.cos(angle + 0.1) * orbitRadius;
        const nextZ = Math.sin(angle + 0.1) * orbitRadius;
        freeSnowmanRef.current.lookAt(nextX, -7, nextZ);
      }

      // 3. Corgi (Last)
      if (corgiRef.current) {
        const corgiAngle = angle - 0.8;
        corgiRef.current.position.x = Math.cos(corgiAngle) * orbitRadius;
        corgiRef.current.position.z = Math.sin(corgiAngle) * orbitRadius;
        corgiRef.current.position.y = -7.5 + Math.abs(Math.sin(time * 8)) * 0.2;

        const cNextX = Math.cos(corgiAngle + 0.1) * orbitRadius;
        const cNextZ = Math.sin(corgiAngle + 0.1) * orbitRadius;
        corgiRef.current.lookAt(cNextX, -7.5, cNextZ);

        corgiRef.current.rotateZ(Math.sin(time * 20) * 0.15);
        corgiRef.current.rotateY(Math.cos(time * 20) * 0.1);

        const tongue = corgiRef.current.getObjectByName("tongue");
        if (tongue) {
          tongue.rotation.x = 0.2 + Math.sin(time * 25) * 0.2;
        }
      }

      // Star Animation Loop 
      if (starMeshRef.current) {
        starMeshRef.current.rotation.z = Math.sin(time * 2) * 0.1;
        starMeshRef.current.rotation.x = Math.cos(time * 1.5) * 0.1;
        const pulse = Math.sin(time * 2.5) * 0.2 + 1.5;
        const flicker = (Math.random() - 0.5) * 0.3;
        const totalIntensity = pulse + flicker;
        (starMeshRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = totalIntensity;
        if (reflectionStarGroupRef.current && reflectionStarGroupRef.current.children[0]) {
          const refMesh = reflectionStarGroupRef.current.children[0] as THREE.Mesh;
          if (refMesh.material) {
            (refMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = totalIntensity * 0.3;
          }
        }
      }

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
        gsap.to(starGroupRef.current.position, {
          x: 0,
          y: 7.8,
          z: 0,
          duration: 2.2,
          ease: "power3.inOut"
        });
        gsap.to(starGroupRef.current.rotation, {
          y: starGroupRef.current.rotation.y + Math.PI * 2,
          duration: 2.2,
          ease: "power2.inOut"
        });
        gsap.fromTo(starGroupRef.current.scale,
          { x: 1, y: 1, z: 1 },
          { x: 1.3, y: 1.3, z: 1.3, duration: 0.8, yoyo: true, repeat: 1, ease: "sine.inOut" }
        );
      }
      if (decorationsGroupRef.current) {
        gsap.to(decorationsGroupRef.current.scale, { x: 0, y: 0, z: 0, duration: 1, ease: "power2.in" });
      }
      if (reflectionDecGroupRef.current) {
        gsap.to(reflectionDecGroupRef.current.scale, { x: 0, y: 0, z: 0, duration: 1, ease: "power2.in" });
      }

      // SPHERE MODE
    } else {
      gsap.to(morphState.current, { value: 1, duration: 2.2, ease: "power2.inOut" });
      if (starGroupRef.current) {
        gsap.to(starGroupRef.current.position, {
          x: 0,
          y: 0,
          z: 0,
          duration: 2.2,
          ease: "power3.inOut"
        });
        gsap.to(starGroupRef.current.rotation, {
          y: starGroupRef.current.rotation.y - Math.PI * 2,
          duration: 2.2,
          ease: "power2.inOut"
        });
        gsap.fromTo(starGroupRef.current.scale,
          { x: 1, y: 1, z: 1 },
          { x: 2.2, y: 2.2, z: 2.2, duration: 0.8, yoyo: true, repeat: 1, ease: "sine.inOut" }
        );
      }
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
