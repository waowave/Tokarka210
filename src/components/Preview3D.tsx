import { useMemo, useState, useEffect } from 'react';
import { Canvas, extend, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls as OrbitControlsImpl } from 'three/addons/controls/OrbitControls.js';
import { Point, Settings, interpolateProfile } from '../lib/gcode';
import { Play, Pause } from 'lucide-react';

extend({ OrbitControls: OrbitControlsImpl });

function CameraControls() {
  const { camera, gl } = useThree();
  // @ts-ignore
  return <orbitControls args={[camera, gl.domElement]} makeDefault />;
}

interface Preview3DProps {
  points: Point[];
  settings: Settings;
  gcode: string;
  showToolpath: boolean;
}

export function Preview3D({ points, settings, gcode, showToolpath }: Preview3DProps) {
  // Generate the lathe geometry points
  const lathePoints = useMemo(() => {
    const interpolated = interpolateProfile(points);
    const p = [];
    
    // Front face (from center to first point)
    if (interpolated.length > 0 && interpolated[0].x > 0) {
      p.push(new THREE.Vector2(0, interpolated[0].z));
    }
    
    // Profile
    for (const pt of interpolated) {
      p.push(new THREE.Vector2(pt.x, pt.z));
    }
    
    // Back face (from last point back to center)
    if (interpolated.length > 0) {
      const last = interpolated[interpolated.length - 1];
      p.push(new THREE.Vector2(0, last.z));
    }
    
    return p;
  }, [points]);

  const [simStep, setSimStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Parse G-code to create toolpath lines
  const toolpath = useMemo(() => {
    const lines = gcode.split('\n');
    let currentX = settings.stockDiameter / 2;
    let currentZ = settings.stockLength;
    
    const segments: { start: THREE.Vector3, end: THREE.Vector3, isG0: boolean }[] = [];
    
    for (const line of lines) {
      if (line.startsWith('G92')) {
        const xMatch = line.match(/X([\d.-]+)/);
        const zMatch = line.match(/Z([\d.-]+)/);
        if (xMatch) currentX = parseFloat(xMatch[1]) / 2;
        if (zMatch) currentZ = parseFloat(zMatch[1]);
      }
      else if (line.startsWith('G0') || line.startsWith('G1')) {
        const isG0 = line.startsWith('G0');
        const xMatch = line.match(/X([\d.-]+)/);
        const zMatch = line.match(/Z([\d.-]+)/);
        
        // GCode X is diameter, so radius is X / 2
        let nextX = currentX;
        let nextZ = currentZ;
        
        if (xMatch) nextX = parseFloat(xMatch[1]) / 2;
        if (zMatch) nextZ = parseFloat(zMatch[1]);
        
        // Add segment (Mapped to X, 0, Z)
        segments.push({
          start: new THREE.Vector3(currentX, 0, currentZ),
          end: new THREE.Vector3(nextX, 0, nextZ),
          isG0
        });
        
        currentX = nextX;
        currentZ = nextZ;
      }
    }
    return segments;
  }, [gcode, settings.stockDiameter, settings.stockLength]);

  useEffect(() => {
    if (!showToolpath) {
      setIsPlaying(false);
      return;
    }
    setSimStep(toolpath.length); // auto show end on first load
  }, [showToolpath, toolpath.length]);

  useEffect(() => {
    let timer: number;
    if (isPlaying && simStep < toolpath.length) {
      timer = window.setTimeout(() => setSimStep(s => s + 1), 50);
    } else if (simStep >= toolpath.length) {
      setIsPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, simStep, toolpath.length]);

  const simulatedLathePoints = useMemo(() => {
    if (!showToolpath) return lathePoints;

    // Simulate 1D stock profile mapping Z to Radius (X)
    const Z_RES = 0.05; // 0.05mm resolution
    const length = settings.stockLength;
    const arraySize = Math.ceil(length / Z_RES) + 1;
    const stockProfile = new Float32Array(arraySize).fill(settings.stockDiameter / 2);

    for (let i = 0; i < simStep; i++) {
      const seg = toolpath[i];
      if (!seg) break;
      if (seg.isG0) continue; // Only cut on G1

      // Sort points of the segment by Z
      let p1 = seg.start;
      let p2 = seg.end;
      
      const zMin = Math.max(0, Math.min(p1.z, p2.z));
      const zMax = Math.min(length, Math.max(p1.z, p2.z));
      const idxMin = Math.max(0, Math.floor(zMin / Z_RES));
      const idxMax = Math.min(arraySize - 1, Math.ceil(zMax / Z_RES));

      for (let j = idxMin; j <= idxMax; j++) {
        const currentZ = j * Z_RES;
        // Interpolate X for current Z
        let t = 0;
        if (p2.z !== p1.z) {
          t = (currentZ - p1.z) / (p2.z - p1.z);
        }
        // Clamp t to [0,1] just in case
        t = Math.max(0, Math.min(1, t));
        const currentX = p1.x + t * (p2.x - p1.x);

        // Update profile (take the minimum radius)
        if (currentX < stockProfile[j]) {
          stockProfile[j] = currentX;
        }
      }
    }

    // Convert stockProfile back to Vector2 array
    const pts: THREE.Vector2[] = [];
    pts.push(new THREE.Vector2(0, length)); // start at Z=Length, X=0
    for (let j = arraySize - 1; j >= 0; j--) {
      pts.push(new THREE.Vector2(stockProfile[j], j * Z_RES));
    }
    pts.push(new THREE.Vector2(0, 0)); // end at Z=0, X=0
    
    // Reverse because lathe geometry works best Z-increasing or continuous
    return pts.reverse();
  }, [showToolpath, lathePoints, toolpath, simStep, settings]);

  const currentToolPos = simStep > 0 && toolpath[simStep - 1] ? toolpath[simStep - 1].end : toolpath[0]?.start;

  return (
    <div className="absolute inset-0 flex flex-col">
      <div className="flex-1 relative">
        <Canvas camera={{ position: [30, 20, 30], fov: 45 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <directionalLight position={[-10, -10, -5]} intensity={0.5} />
      
      {/* 3D Part */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        {/* The solid part */}
        <latheGeometry args={[simulatedLathePoints, 64]} />
        <meshStandardMaterial color="#b0c4de" metalness={0.8} roughness={0.3} side={THREE.DoubleSide} />
      </mesh>

      {/* Origin/Chuck Grid on X-Y plane because Z is our spindle */}
      <gridHelper 
        args={[100, 10]} 
        position={[0, 0, 0]} 
        rotation={[Math.PI / 2, 0, 0]} 
      />

      {/* Axes Helper: Red=X, Green=Y, Blue=Z */}
      <axesHelper args={[40]} />

      {/* Toolpath */}
      {showToolpath && (
        <group>
          {toolpath.slice(0, simStep).map((seg, i) => {
            const geometry = new THREE.BufferGeometry().setFromPoints([seg.start, seg.end]);
            const material = new THREE.LineBasicMaterial({
              color: seg.isG0 ? '#ff3333' : '#33ff33',
              depthTest: false,
              linewidth: 2,
              transparent: true,
              opacity: 0.8,
            });
            const lineObj = new THREE.Line(geometry, material);
            return <primitive key={i} object={lineObj} />;
          })}
          
          {/* Tool bit representation */}
          {currentToolPos && (
            <mesh position={currentToolPos}>
              <sphereGeometry args={[0.5, 16, 16]} />
              <meshBasicMaterial color="#ffff00" depthTest={false} />
            </mesh>
          )}
        </group>
      )}

      {/* Stock Outline (ghost) */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, settings.stockLength / 2]}>
        <cylinderGeometry args={[settings.stockDiameter / 2, settings.stockDiameter / 2, settings.stockLength, 32]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.1} wireframe />
      </mesh>

      <CameraControls />
    </Canvas>
      </div>
      
      {/* Timeline Slider for Simulation */}
      {showToolpath && (
        <div className="absolute bottom-4 left-4 right-4 bg-gray-900/90 backdrop-blur border border-gray-700 p-3 rounded-lg flex items-center gap-4 z-10 shadow-xl">
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-8 h-8 flex items-center justify-center bg-blue-600 hover:bg-blue-500 rounded text-white transition shadow-lg shadow-blue-500/20"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>
          <input 
            type="range" 
            min="0" 
            max={toolpath.length} 
            value={simStep} 
            onChange={(e) => {
              setIsPlaying(false);
              setSimStep(Number(e.target.value));
            }}
            className="flex-1 cursor-pointer accent-blue-500"
          />
          <div className="text-xs text-gray-400 min-w-[60px] text-right font-mono">
            {simStep} / {toolpath.length}
          </div>
        </div>
      )}
    </div>
  );
}
