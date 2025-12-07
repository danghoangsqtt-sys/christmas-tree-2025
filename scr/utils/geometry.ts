import * as THREE from 'three';

// --- Particle Generation ---

export const generateTreePositions = (count: number): Float32Array => {
  const positions = new Float32Array(count * 3);
  const height = 16;
  const maxBaseRadius = 7.5;

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    
    // Organic Tree Logic:
    const hRand = Math.pow(Math.random(), 1.5); 
    const y = hRand * height - (height / 2); // Range -8 to 8, denser at -8.

    // Normalized height (0 at bottom, 1 at top) for radius calc
    const yNorm = (y + height / 2) / height;
    
    // Cone radius at this height with a curve
    const coneRadius = (1 - Math.pow(yNorm, 0.8)) * maxBaseRadius;
    
    // Add "Layers" to the tree branches using sine wave
    const layerEffect = Math.sin(yNorm * Math.PI * 10) * 0.5 + 0.5; // Oscillates
    
    // Spiral angle
    const spiralAngle = y * 2.5 + (Math.random() * Math.PI * 2);
    
    // Final Radius:
    // Base cone * random scattering * layer effect
    const r = coneRadius * (0.6 + 0.4 * Math.random()) + (layerEffect * 1.5 * Math.random());
    
    const finalR = Math.max(0, r);
    
    const x = finalR * Math.cos(spiralAngle);
    const z = finalR * Math.sin(spiralAngle);

    positions[i3] = x;
    positions[i3 + 1] = y;
    positions[i3 + 2] = z;
  }
  return positions;
};

export const generateSpherePositions = (count: number): Float32Array => {
  const positions = new Float32Array(count * 3);
  const maxRadius = 8.0;
  const minRadius = 1.5; // Create a hollow center for the Star to shine

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    
    // Organic Sphere (Magical Core / Galaxy / Nebula)
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    
    // Radius distribution:
    const rand = Math.random();
    let rNorm;
    
    // Create a distribution that fills the volume but respects the hollow center
    // We want density to fall off as we go out, but start after minRadius
    
    if (rand < 0.4) {
        // Inner shell (dense near minRadius)
        rNorm = Math.random() * 0.3; 
    } else {
        // Outer volume
        rNorm = 0.3 + Math.random() * 0.7;
    }
    
    // Map 0..1 to minRadius..maxRadius
    const r = minRadius + (rNorm * (maxRadius - minRadius));

    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);

    positions[i3] = x;
    positions[i3 + 1] = y;
    positions[i3 + 2] = z;
  }
  return positions;
};

// --- Star Shape ---

export const createStarGeometry = (innerRadius: number, outerRadius: number, points: number, thickness: number): THREE.BufferGeometry => {
  const geometry = new THREE.BufferGeometry();
  const vertices: number[] = [];
  const indices: number[] = [];

  // Define Center points (Front and Back)
  // Index 0: Front Center
  vertices.push(0, 0, thickness);
  // Index 1: Back Center
  vertices.push(0, 0, -thickness);

  // Define Perimeter points (Tips and Valleys)
  // Indices 2 to (points*2 + 1)
  const numPerimeterPoints = points * 2;
  
  for (let i = 0; i < numPerimeterPoints; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    // Start angle at PI/2 so the first point (tip) is pointing up
    const angle = (i / numPerimeterPoints) * Math.PI * 2 + (Math.PI / 2);
    
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const z = 0; // Perimeter is on the Z=0 plane
    
    vertices.push(x, y, z);
  }

  // Generate Faces
  for (let i = 0; i < numPerimeterPoints; i++) {
    const current = 2 + i;
    const next = 2 + ((i + 1) % numPerimeterPoints);

    // Front Face (Connect 0 -> Current -> Next)
    indices.push(0, current, next);

    // Back Face (Connect 1 -> Next -> Current)
    indices.push(1, next, current);
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
};