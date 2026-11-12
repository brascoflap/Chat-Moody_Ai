import React, { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { 
  Box, 
  Upload, 
  Camera, 
  Download, 
  Layers, 
  RefreshCw, 
  FileCode, 
  FileText, 
  Eye, 
  Maximize2,
  Trash2,
  Check,
  Sparkles
} from 'lucide-react';
import { 
  extractVectorFromCanvas, 
  generateOBJFromDepthGrid, 
  generateStandaloneHTML3DViewer 
} from '../lib/sketch3dEngine';

interface Simple3DStudioProps {
  isHighContrast?: boolean;
}

export const Simple3DStudio: React.FC<Simple3DStudioProps> = ({ isHighContrast = false }) => {
  const [activeMode, setActiveMode] = useState<'draw' | 'upload'>('draw');
  const [wireframeMode, setWireframeMode] = useState(false);
  const [extrusionDepth, setExtrusionDepth] = useState(6);
  const [activeMaterial, setActiveMaterial] = useState<'metallic' | 'matte' | 'neon'>('metallic');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // Canvas drawing ref
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Three.js 3D viewport ref
  const viewport3DRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const wireMeshRef = useRef<THREE.Mesh | null>(null);

  // Extracted data state
  const [currentDepthGrid, setCurrentDepthGrid] = useState<number[][] | null>(null);
  const [svgVectorPreview, setSvgVectorPreview] = useState<string | null>(null);

  // 1. Initialize Drawing Canvas with simple initial sketch
  useEffect(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Default white background with sample curved geometric vase/shield sketch
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Sample initial sketch: smooth contoured form
    ctx.beginPath();
    ctx.arc(140, 140, 70, 0, Math.PI * 2);
    ctx.moveTo(100, 140);
    ctx.lineTo(180, 140);
    ctx.moveTo(140, 100);
    ctx.lineTo(140, 180);
    ctx.stroke();

    // Trigger initial 3D generation
    convertCanvasTo3D();
  }, []);

  // 2. Initialize Three.js interactive viewport
  useEffect(() => {
    const container = viewport3DRef.current;
    if (!container) return;

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 350;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070b14);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 24, 38);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting setup
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(15, 30, 20);
    scene.add(keyLight);

    const hemiLight = new THREE.HemisphereLight(0x34d399, 0x070b14, 0.9);
    scene.add(hemiLight);

    // Mouse drag rotation controls
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouse = { x: e.clientX, y: e.clientY };
    };
    const onMouseUp = () => { isDragging = false; };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging || !meshRef.current) return;
      meshRef.current.rotation.y += (e.clientX - prevMouse.x) * 0.012;
      meshRef.current.rotation.x += (e.clientY - prevMouse.y) * 0.012;
      if (wireMeshRef.current) {
        wireMeshRef.current.rotation.y = meshRef.current.rotation.y;
        wireMeshRef.current.rotation.x = meshRef.current.rotation.x;
      }
      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);

    // Animation Loop
    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (!isDragging && meshRef.current) {
        meshRef.current.rotation.y += 0.005;
        if (wireMeshRef.current) wireMeshRef.current.rotation.y = meshRef.current.rotation.y;
      }
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  // Update 3D Geometry in Three.js when canvas is processed
  const update3DGeometry = (depthGrid: number[][]) => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (meshRef.current) scene.remove(meshRef.current);
    if (wireMeshRef.current) scene.remove(wireMeshRef.current);

    const rows = depthGrid.length;
    const cols = depthGrid[0]?.length || 0;
    if (rows === 0 || cols === 0) return;

    const geometry = new THREE.PlaneGeometry(24, 24, cols - 1, rows - 1);
    geometry.rotateX(-Math.PI / 2);

    const pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = i % cols;
      const y = Math.floor(i / cols);
      const height = (depthGrid[y][x] || 0) * extrusionDepth;
      pos.setY(i, height);
    }
    geometry.computeVertexNormals();

    // Material selection
    let mat: THREE.Material;
    if (activeMaterial === 'metallic') {
      mat = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        metalness: 0.85,
        roughness: 0.25,
      });
    } else if (activeMaterial === 'neon') {
      mat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.4,
        roughness: 0.1,
      });
    } else {
      mat = new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        metalness: 0.1,
        roughness: 0.8,
      });
    }

    const mesh = new THREE.Mesh(geometry, mat);
    meshRef.current = mesh;
    scene.add(mesh);

    // Wireframe overlay
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x34d399,
      wireframe: true,
      transparent: true,
      opacity: wireframeMode ? 0.7 : 0.15,
    });
    const wireMesh = new THREE.Mesh(geometry, wireMat);
    wireMeshRef.current = wireMesh;
    scene.add(wireMesh);
  };

  const convertCanvasTo3D = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;

    setIsProcessing(true);
    const { paths, svgString, depthGrid } = extractVectorFromCanvas(canvas);
    setCurrentDepthGrid(depthGrid);
    setSvgVectorPreview(svgString);
    update3DGeometry(depthGrid);
    setIsProcessing(false);
  };

  // Drawing mouse handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    draw(e);
  };
  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      convertCanvasTo3D();
    }
  };
  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clearCanvas = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    convertCanvasTo3D();
  };

  // Upload photo handler
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = drawCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        convertCanvasTo3D();
        setStatusNotice(`Foto "${file.name}" omgezet naar 3D vectormodel!`);
        setTimeout(() => setStatusNotice(null), 3500);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Exporters
  const exportOBJ = () => {
    if (!currentDepthGrid) return;
    const objData = generateOBJFromDepthGrid(currentDepthGrid, extrusionDepth);
    const blob = new Blob([objData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `moody_3d_model_${Date.now()}.obj`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusNotice('OBJ 3D Model gedownload (geschikt voor Blender, CAD, 3D Printen).');
    setTimeout(() => setStatusNotice(null), 3500);
  };

  const exportHTML3D = () => {
    if (!currentDepthGrid) return;
    const htmlData = generateStandaloneHTML3DViewer(currentDepthGrid, 'Moody 3D Creation');
    const blob = new Blob([htmlData], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `moody_3d_interactive_${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusNotice('Interactieve HTML 3D viewer gedownload.');
    setTimeout(() => setStatusNotice(null), 3500);
  };

  const exportPDFVector = () => {
    if (!svgVectorPreview) return;
    // Download as printable/vector printable SVG or vector data
    const blob = new Blob([svgVectorPreview], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `moody_vector_blueprint_${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusNotice('Vector 2D/3D blueprint (SVG/PDF compatible) gedownload.');
    setTimeout(() => setStatusNotice(null), 3500);
  };

  return (
    <div className={`p-4 md:p-6 max-w-5xl mx-auto space-y-5 ${isHighContrast ? 'text-black dark:text-white' : 'text-slate-900 dark:text-slate-100'}`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-300 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold tracking-tight flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <Box className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Moody.Ai 3D Creation Studio (Schets/Foto → Vector 3D & Export)
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Teken een schets of upload een foto om deze direct om te zetten naar een interactief 3D-model, exporteerbaar als OBJ, HTML 3D of Vector PDF.
          </p>
        </div>

        {/* Quick export actions */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={exportOBJ}
            className="btn-neon px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            title="Download als 3D model (.OBJ voor Blender / CAD)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exporteer .OBJ</span>
          </button>
          <button
            onClick={exportHTML3D}
            className="btn-neon px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
            title="Download als standalone HTML 3D webpagina"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Exporteer HTML 3D</span>
          </button>
          <button
            onClick={exportPDFVector}
            className="btn-neon px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
            title="Exporteer vector contour"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Vector Blauwdruk</span>
          </button>
        </div>
      </div>

      {statusNotice && (
        <div className="p-2.5 rounded-lg text-xs font-medium bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusNotice}</span>
        </div>
      )}

      {/* Workspace Grid: Left = Canvas / Photo Input, Right = 3D Interactive Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Input (Draw or Upload) */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
              <Camera className="w-4 h-4 text-emerald-600" />
              <span>Invoer: Teken Schets of Upload Foto</span>
            </div>

            <div className="flex items-center gap-2">
              <label className="cursor-pointer btn-neon px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded font-medium flex items-center gap-1 hover:bg-slate-100">
                <Upload className="w-3 h-3" />
                <span>Upload Foto</span>
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
              <button
                onClick={clearCanvas}
                className="p-1 text-slate-400 hover:text-rose-500 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
                title="Canvas wissen"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Interactive Drawing Pad */}
          <div className="flex items-center justify-center p-2 bg-slate-200 dark:bg-slate-950 rounded-lg border border-slate-300 dark:border-slate-800 overflow-hidden">
            <canvas
              ref={drawCanvasRef}
              width={280}
              height={280}
              onMouseDown={startDrawing}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onMouseMove={draw}
              className="bg-white rounded cursor-crosshair shadow-inner"
            />
          </div>

          {/* Extrusion & Depth Controls */}
          <div className="space-y-2 pt-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">3D Reliëf / Diepte:</span>
              <span className="font-mono font-bold text-emerald-600">{extrusionDepth}x</span>
            </div>
            <input
              type="range"
              min="1"
              max="15"
              step="0.5"
              value={extrusionDepth}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setExtrusionDepth(val);
                if (currentDepthGrid) update3DGeometry(currentDepthGrid);
              }}
              className="w-full accent-emerald-500"
            />
          </div>
        </div>

        {/* Right: Live Interactive Three.js 3D Viewport */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
              <Box className="w-4 h-4 text-emerald-600" />
              <span>Real-Time WebGL 3D Weergave</span>
            </div>

            {/* View toggles */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  const next = !wireframeMode;
                  setWireframeMode(next);
                  if (wireMeshRef.current) (wireMeshRef.current.material as any).opacity = next ? 0.7 : 0.15;
                }}
                className={`btn-neon px-2 py-0.5 rounded text-[11px] font-semibold border ${
                  wireframeMode ? 'btn-neon-active' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                Draadmodel
              </button>
            </div>
          </div>

          {/* Three.js Canvas Container */}
          <div
            ref={viewport3DRef}
            className="w-full h-72 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-800 shadow-inner relative flex items-center justify-center bg-slate-950"
          >
            {/* Overlay hint */}
            <div className="absolute top-2 left-2 z-10 text-[10px] font-mono text-emerald-400 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
              Draaien: Muis verslepen | 3D PBR Shaders
            </div>
          </div>

          {/* Material Finishes */}
          <div className="flex items-center justify-between pt-1 text-xs">
            <span className="text-slate-600 dark:text-slate-400">Materiaal Finish:</span>
            <div className="flex items-center gap-1">
              {(['metallic', 'matte', 'neon'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => {
                    setActiveMaterial(m);
                    if (currentDepthGrid) update3DGeometry(currentDepthGrid);
                  }}
                  className={`btn-neon px-2.5 py-1 rounded text-xs capitalize transition ${
                    activeMaterial === m ? 'btn-neon-active font-bold' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span className={`led-sq mr-1 ${activeMaterial === m ? 'led-sq-active' : 'led-sq-inactive'}`} />
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
