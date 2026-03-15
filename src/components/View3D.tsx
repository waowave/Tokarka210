import { useMemo, useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../store';
import { resolveFillets } from '../utils/geometry';
import { generateGcode } from '../utils/gcode';
import { Play, Pause } from 'lucide-react';
import { t } from '../lib/i18n';

function LathePart({ simulate, paths, progress }: { simulate: boolean, paths: any[], progress: number }) {
  const { points, stock } = useStore();

  // Calculate stock length from profile max Z
  const stockLength = Math.max(...points.map(p => p.z));

  const lathePoints = useMemo(() => {
    const raw = resolveFillets(points);
    // resolveFillets already returns radius values
    return raw.map(p => new THREE.Vector2(p.x, p.z));
  }, [points]);

  const simulatedLathePoints = useMemo(() => {
    if (!simulate || paths.length === 0) return lathePoints;

    // Use same resolution as profile for consistency
    const rawProfile = resolveFillets(points);
    const profileZs = rawProfile.map(p => p.z);
    const minZ = 0;
    const maxZ = Math.max(...profileZs, stockLength);
    const Z_RES = 0.2; // Higher resolution for smoother simulation
    const arraySize = Math.ceil(maxZ / Z_RES) + 1;
    const stockProfile = new Float32Array(arraySize).fill(stock.diameter / 2);

    // Apply stock boundary
    for (let j = 0; j < arraySize; j++) {
      const currentZ = j * Z_RES;
      if (currentZ > stockLength) {
        stockProfile[j] = stock.diameter / 2;
      }
    }

    for (let i = 1; i <= progress; i++) {
      const p1 = paths[i - 1];
      const p2 = paths[i];
      if (!p1 || !p2) break;
      if (p2.type === 'G0') continue; // Only cut on G1
      
      // Skip retract moves (45 degree exit - both X and Z increase)
      const isRetract = p2.x > p1.x && p2.z > p1.z;
      if (isRetract) continue;

      // For cutting moves, find the Z range and update stock profile
      // Cutting moves go from higher Z to lower Z (right to left)
      const zStart = Math.max(p1.z, p2.z);
      const zEnd = Math.min(p1.z, p2.z);
      
      if (zStart === zEnd) continue; // Vertical cut, skip for now
      
      const idxStart = Math.max(0, Math.floor(zEnd / Z_RES));
      const idxEnd = Math.min(arraySize - 1, Math.ceil(zStart / Z_RES));

      for (let j = idxStart; j <= idxEnd; j++) {
        const currentZ = j * Z_RES;
        // Linear interpolation: X = X1 + (X2-X1) * (Z-Z1) / (Z2-Z1)
        const interpolatedX = p1.x + (p2.x - p1.x) * (currentZ - p1.z) / (p2.z - p1.z);
        
        if (interpolatedX < stockProfile[j]) {
          stockProfile[j] = interpolatedX;
        }
      }
    }

    const pts: THREE.Vector2[] = [];
    pts.push(new THREE.Vector2(0, maxZ));
    for (let j = arraySize - 1; j >= 0; j--) {
      const z = j * Z_RES;
      if (z <= maxZ) {
        pts.push(new THREE.Vector2(stockProfile[j], z));
      }
    }
    pts.push(new THREE.Vector2(0, 0));

    return pts;
  }, [simulate, points, paths, progress, stock]);

  const currentPath = paths.slice(0, progress + 1);
  const currentPos = currentPath[currentPath.length - 1];

  return (
    <group rotation={[Math.PI, 0, -Math.PI / 2]}> {/* Rotate so Z is to the right, X is up */}

      {/* Raw Stock Wireframe */}
      <mesh position={[0, stockLength / 2, 0]}>
        <cylinderGeometry args={[stock.diameter / 2, stock.diameter / 2, stockLength, 32]} />
        <meshStandardMaterial color="#475569" transparent opacity={0.15} wireframe />
      </mesh>

      {/* Dynamic/Finished Part */}
      <mesh>
        <latheGeometry args={[simulate ? simulatedLathePoints : lathePoints, 32]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.7} roughness={0.3} side={THREE.DoubleSide} />
      </mesh>

      {/* Chuck representation */}
      <mesh position={[0, -20, 0]}>
        <cylinderGeometry args={[stock.diameter / 1.5, stock.diameter / 1.5, 40, 16]} />
        <meshStandardMaterial color="#334155" metalness={0.5} roughness={0.5} />
      </mesh>

      {/* Tool Path Lines (Optimized) */}
      {simulate && (
        <group>
          {useMemo(() => {
            if (paths.length < 2) return null;
            
            // Collect points and colors for LineSegments
            const positions: number[] = [];
            const colors: number[] = [];
            
            const colorG0 = new THREE.Color('#ef4444');
            const colorG1 = new THREE.Color('#22c55e');

            // Build all segments up to current progress
            for (let i = 1; i <= progress; i++) {
              const prev = paths[i - 1];
              const p = paths[i];
              if (!p || !prev) continue;
              
              positions.push(prev.x, prev.z, 0);
              positions.push(p.x, p.z, 0);
              
              const c = p.type === 'G0' ? colorG0 : colorG1;
              colors.push(c.r, c.g, c.b);
              colors.push(c.r, c.g, c.b);
            }
            
            if (positions.length === 0) return null;

            return (
              <lineSegments>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    args={[new Float32Array(positions), 3]}
                    count={positions.length / 3}
                  />
                  <bufferAttribute
                    attach="attributes-color"
                    args={[new Float32Array(colors), 3]}
                    count={colors.length / 3}
                  />
                </bufferGeometry>
                <lineBasicMaterial vertexColors={true} depthTest={false} />
              </lineSegments>
            );
          }, [paths, progress])}
          
          {/* Tool Tip */}
          {currentPos && (
            <mesh position={[currentPos.x, currentPos.z, 0]}>
              <circleGeometry args={[0.5, 16]} />
              <meshBasicMaterial color="yellow" depthTest={false} side={THREE.DoubleSide} />
            </mesh>
          )}
        </group>
      )}

    </group>
  );
}

export function View3D({ mode }: { mode: '3d' | 'simulate' }) {
  const stock = useStore(state => state.stock);
  const points = useStore(state => state.points);
  const operations = useStore(state => state.operations);
  const tool = useStore(state => state.tool);
  const speeds = useStore(state => state.speeds);
  const gcodeSettings = useStore(state => state.gcodeSettings);
  const language = useStore(state => state.language);

  const { gcode, paths } = useMemo(() => generateGcode({ stock, points, operations, tool, speeds, gcodeSettings } as any), [stock, points, operations, tool, speeds, gcodeSettings]);

  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showGcode, setShowGcode] = useState(true); // Show G-code by default

  // Ref for G-code panel scrolling
  const gcodePanelRef = useRef<HTMLDivElement>(null);
  const highlightedLineRef = useRef<HTMLDivElement>(null);

  // Auto-play / slider control
  useEffect(() => {
    if (mode !== 'simulate') {
      setIsPlaying(false);
      return;
    }
    let timer: number;
    if (isPlaying && progress < paths.length - 1) {
      timer = window.setTimeout(() => setProgress(p => p + 1), 30); // 30ms per step
    } else if (progress >= paths.length - 1) {
      setIsPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, progress, paths.length, mode]);

  // Generate G-code lines array with path index mapping
  const gcodeData = useMemo(() => {
    const lines = gcode.split('\n');
    const lineToPath: number[] = []; // Maps G-code line index to path index
    let pathIndex = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('G0') || line.startsWith('G1')) {
        lineToPath[i] = pathIndex;
        pathIndex++;
      }
    }
    
    // Also create reverse mapping
    const pathToLine: number[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (lineToPath[i] !== undefined) {
        pathToLine[lineToPath[i]] = i;
      }
    }
    
    return { lines, lineToPath, pathToLine };
  }, [gcode]);

  // Calculate current G-code line based on progress
  const currentGcodeLine = gcodeData.pathToLine[progress] ?? -1;

  // Auto-scroll G-code panel to highlighted line
  useEffect(() => {
    if (showGcode && highlightedLineRef.current && gcodePanelRef.current) {
      highlightedLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentGcodeLine, showGcode]);

  // Handle click on G-code line
  const handleGcodeLineClick = (lineIndex: number) => {
    const pathIndex = gcodeData.lineToPath[lineIndex];
    if (pathIndex !== undefined) {
      setProgress(pathIndex);
      setIsPlaying(false);
    }
  };

  return (
    <div className="w-full h-full bg-[#0f172a] relative">
      <Canvas camera={{ position: [50, 50, 100], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 10]} intensity={1.5} />
        <directionalLight position={[-10, -10, -10]} intensity={0.5} />
        
        <LathePart simulate={mode === 'simulate'} paths={paths} progress={progress} />
        
        <Grid 
          infiniteGrid 
          fadeDistance={200} 
          sectionColor="#334155" 
          cellColor="#1e293b" 
          position={[0, -(stock?.diameter || 50), 0]} 
        />
        <OrbitControls makeDefault />
      </Canvas>

      {/* Timeline Controls */}
      {mode === 'simulate' && paths.length > 0 && (
        <>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-xl bg-slate-900/90 p-3 rounded-lg border border-slate-700 backdrop-blur shadow-2xl flex items-center gap-4">
            <button
              onClick={() => {
                if (progress >= paths.length - 1) setProgress(0);
                setIsPlaying(!isPlaying);
              }}
              className="w-10 h-10 flex items-center justify-center bg-blue-600 hover:bg-blue-500 rounded-full text-white transition-colors flex-shrink-0 shadow-lg"
              title={isPlaying ? t('sim.pause', language) : t('sim.play', language)}
            >
              {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-1" />}
            </button>

            <div className="flex-1 flex flex-col gap-1">
              <input
                type="range"
                min="0"
                max={paths.length - 1}
                value={progress}
                onChange={(e) => {
                  setIsPlaying(false);
                  setProgress(Number(e.target.value));
                }}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-xs text-slate-400 font-mono">
                <span>Step: {progress} / {paths.length - 1}</span>
                <span>{paths[progress]?.type || 'IDLE'}</span>
              </div>
            </div>

            <button
              onClick={() => setShowGcode(!showGcode)}
              className={`px-3 py-2 rounded text-xs font-medium transition-colors ${showGcode ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
            >
              {showGcode ? 'Hide G-code' : 'Show G-code'}
            </button>
          </div>

          {/* G-code Display Panel */}
          {showGcode && (
            <div className="absolute top-4 right-4 w-80 max-h-[60vh] bg-slate-900/95 border border-slate-700 rounded-lg shadow-2xl overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700 bg-slate-800">
                <span className="text-xs font-semibold text-slate-300 uppercase">G-code Program</span>
                <button onClick={() => setShowGcode(false)} className="text-slate-400 hover:text-white">
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              <div 
                ref={gcodePanelRef}
                className="flex-1 overflow-y-auto p-2 font-mono text-xs custom-scrollbar"
              >
                {gcodeData.lines.map((line, i) => {
                  const isHighlighted = i === currentGcodeLine;
                  const isComment = line.startsWith('(') || line.startsWith(';');
                  const isMove = line.startsWith('G0') || line.startsWith('G1');
                  const hasPathIndex = gcodeData.lineToPath[i] !== undefined;
                  
                  return (
                    <div
                      key={i}
                      ref={isHighlighted ? highlightedLineRef : null}
                      onClick={() => hasPathIndex && handleGcodeLineClick(i)}
                      className={`px-2 py-0.5 rounded transition-colors ${
                        isHighlighted 
                          ? 'bg-yellow-600/50 text-yellow-100 font-semibold' 
                          : isComment 
                            ? 'text-slate-500' 
                            : isMove 
                              ? 'text-green-400 cursor-pointer hover:bg-slate-800' 
                              : 'text-slate-300'
                      } ${hasPathIndex ? 'cursor-pointer' : ''}`}
                    >
                      <span className="text-slate-600 select-none mr-2">{(i + 1).toString().padStart(3, '0')}</span>
                      {line || '\u00A0'}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
