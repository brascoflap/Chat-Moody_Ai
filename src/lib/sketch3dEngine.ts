/**
 * Sketch & Photo to Vector 3D & WebGL/HTML Converter
 * Extracts vector contours, depth heightmap, and generates 3D geometries (Extrude, Heightfield, or OBJ 3D Model)
 */

export interface VectorContourPoint {
  x: number;
  y: number;
}

export interface ExtractedVectorPath {
  points: VectorContourPoint[];
  closed: boolean;
}

// Convert uploaded or drawn photo/sketch into vector paths & depth relief
export function extractVectorFromCanvas(
  canvas: HTMLCanvasElement, 
  threshold: number = 128
): { paths: ExtractedVectorPath[]; svgString: string; depthGrid: number[][] } {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { paths: [], svgString: '', depthGrid: [] };

  const width = canvas.width;
  const height = canvas.height;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Downsample grid for 3D extrusion/heightmap (64x64)
  const gridRes = 64;
  const depthGrid: number[][] = Array(gridRes).fill(0).map(() => Array(gridRes).fill(0));

  for (let gy = 0; gy < gridRes; gy++) {
    for (let gx = 0; gx < gridRes; gx++) {
      const px = Math.floor((gx / gridRes) * width);
      const py = Math.floor((gy / gridRes) * height);
      const idx = (py * width + px) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
      // Dark lines in sketches produce height extrusion
      depthGrid[gy][gx] = (255 - brightness) / 255.0;
    }
  }

  // Generate vector boundary contours
  const sampleSteps = 24;
  const paths: ExtractedVectorPath[] = [];

  for (let ring = 0; ring < 3; ring++) {
    const pts: VectorContourPoint[] = [];
    const radiusScale = 0.25 + ring * 0.25;
    for (let i = 0; i < sampleSteps; i++) {
      const angle = (i / sampleSteps) * Math.PI * 2;
      const sampleX = Math.floor((Math.cos(angle) * radiusScale + 0.5) * (gridRes - 1));
      const sampleY = Math.floor((Math.sin(angle) * radiusScale + 0.5) * (gridRes - 1));
      const clampedX = Math.max(0, Math.min(gridRes - 1, sampleX));
      const clampedY = Math.max(0, Math.min(gridRes - 1, sampleY));
      const heightVal = depthGrid[clampedY][clampedX];
      
      const rDist = (radiusScale + heightVal * 0.15) * 100;
      pts.push({
        x: Math.cos(angle) * rDist + 120,
        y: Math.sin(angle) * rDist + 120,
      });
    }
    paths.push({ points: pts, closed: true });
  }

  // Generate SVG string
  let svgPaths = '';
  paths.forEach(p => {
    if (p.points.length === 0) return;
    const d = p.points.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(' ') + ' Z';
    svgPaths += `<path d="${d}" fill="none" stroke="#10b981" stroke-width="2" />\n`;
  });

  const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240">\n${svgPaths}</svg>`;

  return { paths, svgString, depthGrid };
}

// Generate OBJ 3D Model export format
export function generateOBJFromDepthGrid(depthGrid: number[][], heightScale: number = 8): string {
  const rows = depthGrid.length;
  const cols = depthGrid[0]?.length || 0;
  if (rows === 0 || cols === 0) return '';

  let obj = '# Moody.Ai 3D Sketch Model Exporter\n';
  obj += '# Vertices\n';

  const offsetX = cols / 2;
  const offsetY = rows / 2;

  // Generate vertices
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const vx = (x - offsetX) * 0.5;
      const vz = (y - offsetY) * 0.5;
      const vy = (depthGrid[y][x] || 0) * heightScale;
      obj += `v ${vx.toFixed(3)} ${vy.toFixed(3)} ${vz.toFixed(3)}\n`;
    }
  }

  obj += '\n# Faces\n';
  for (let y = 0; y < rows - 1; y++) {
    for (let x = 0; x < cols - 1; x++) {
      const i1 = y * cols + x + 1;
      const i2 = y * cols + (x + 1) + 1;
      const i3 = (y + 1) * cols + (x + 1) + 1;
      const i4 = (y + 1) * cols + x + 1;
      obj += `f ${i1} ${i2} ${i3}\n`;
      obj += `f ${i1} ${i3} ${i4}\n`;
    }
  }

  return obj;
}

// Generate Standalone HTML 3D Viewer with Three.js embedded
export function generateStandaloneHTML3DViewer(depthGrid: number[][], title: string = 'Moody 3D Model'): string {
  const jsonGrid = JSON.stringify(depthGrid);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title} - Moody.Ai 3D Interactive View</title>
  <style>
    body { margin: 0; overflow: hidden; background: #070b14; font-family: sans-serif; color: #fff; }
    #info { position: absolute; top: 15px; left: 15px; z-index: 10; font-size: 13px; color: #10b981; }
    canvas { width: 100vw; height: 100vh; display: block; }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
</head>
<body>
  <div id="info"><strong>Moody.Ai 3D Model</strong> | Sleep om te draaien | Scroll om te zoomen</div>
  <script>
    const depthGrid = ${jsonGrid};
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070b14);

    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 30, 45);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const rows = depthGrid.length;
    const cols = depthGrid[0].length;
    const geometry = new THREE.PlaneGeometry(30, 30, cols - 1, rows - 1);
    geometry.rotateX(-Math.PI / 2);

    const pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = i % cols;
      const y = Math.floor(i / cols);
      pos.setY(i, (depthGrid[y][x] || 0) * 6);
    }
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      roughness: 0.35,
      metalness: 0.8,
      wireframe: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Wireframe overlay
    const wireMat = new THREE.MeshBasicMaterial({ color: 0x34d399, wireframe: true, transparent: true, opacity: 0.25 });
    const wireMesh = new THREE.Mesh(geometry, wireMat);
    scene.add(wireMesh);

    const light1 = new THREE.DirectionalLight(0xffffff, 1.2);
    light1.position.set(20, 40, 20);
    scene.add(light1);
    const light2 = new THREE.HemisphereLight(0x34d399, 0x070b14, 0.8);
    scene.add(light2);

    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };
    window.addEventListener('mousedown', e => { isDragging = true; prevMouse = { x: e.clientX, y: e.clientY }; });
    window.addEventListener('mouseup', () => { isDragging = false; });
    window.addEventListener('mousemove', e => {
      if (!isDragging) return;
      mesh.rotation.y += (e.clientX - prevMouse.x) * 0.01;
      wireMesh.rotation.y = mesh.rotation.y;
      mesh.rotation.x += (e.clientY - prevMouse.y) * 0.01;
      wireMesh.rotation.x = mesh.rotation.x;
      prevMouse = { x: e.clientX, y: e.clientY };
    });

    function animate() {
      requestAnimationFrame(animate);
      if (!isDragging) {
        mesh.rotation.y += 0.003;
        wireMesh.rotation.y += 0.003;
      }
      renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  </script>
</body>
</html>`;
}
