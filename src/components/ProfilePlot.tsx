import { Point, Settings, interpolateProfile } from '../lib/gcode';

interface ProfilePlotProps {
  points: Point[];
  settings: Settings;
  hoveredPointIndex: number | null;
  onHoverPoint: (index: number | null) => void;
}

export function ProfilePlot({ points, settings, hoveredPointIndex, onHoverPoint }: ProfilePlotProps) {
  const interpolatedPoints = interpolateProfile(points);
  const margin = 40;
  const width = 800;
  const height = 400;

  const zVals = points.map(p => p.z);
  const xVals = points.map(p => p.x);

  const minZ = -5; // Chuck at 0
  const maxZ = Math.max(settings.stockLength, ...zVals, settings.stockLength + settings.clearance) + 5;

  const minX = -10; // Show slightly below centerline
  const maxX = Math.max(settings.stockDiameter / 2, ...xVals) + 5;

  const rangeZ = maxZ - minZ;
  const rangeX = maxX - minX;

  const scale = Math.min((width - 2 * margin) / rangeZ, (height - 2 * margin) / rangeX);

  const offsetX = (width - 2 * margin - rangeZ * scale) / 2;
  const offsetY = (height - 2 * margin - rangeX * scale) / 2;

  const mapZ = (z: number) => margin + offsetX + (z - minZ) * scale;
  const mapX = (x: number) => height - margin - offsetY - (x - minX) * scale;

  const profilePath = interpolatedPoints.length > 0 
    ? interpolatedPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${mapZ(p.z)} ${mapX(p.x)}`).join(' ')
    : '';

  const mirroredPath = interpolatedPoints.length > 0 
    ? interpolatedPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${mapZ(p.z)} ${mapX(-p.x)}`).join(' ')
    : '';

  // Roughing passes preview (optional visual extra)
  const passes = [];
  let currentRadius = (settings.stockDiameter / 2) - settings.depthOfCut;
  while (currentRadius > 0) {
    passes.push(currentRadius);
    currentRadius -= settings.depthOfCut;
  }

  return (
    <div className="w-full h-full bg-gray-900 border border-gray-700 rounded-lg overflow-hidden flex items-center justify-center p-2">
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" className="bg-gray-800 rounded">
        {/* Centerline */}
        <line x1={mapZ(minZ)} y1={mapX(0)} x2={mapZ(maxZ)} y2={mapX(0)} stroke="#4b5563" strokeDasharray="5,5" strokeWidth="2" />
        
        {/* Stock Outline */}
        <rect 
          x={mapZ(0)} 
          y={mapX(settings.stockDiameter / 2)} 
          width={settings.stockLength * scale} 
          height={(settings.stockDiameter / 2) * scale} 
          fill="rgba(55, 65, 81, 0.5)" 
          stroke="#4b5563" 
          strokeWidth="1"
        />
        <rect 
          x={mapZ(0)} 
          y={mapX(0)} 
          width={settings.stockLength * scale} 
          height={(settings.stockDiameter / 2) * scale} 
          fill="rgba(55, 65, 81, 0.2)" 
          stroke="#4b5563" 
          strokeWidth="1"
          strokeDasharray="4,4"
        />

        {/* Roughing passes */}
        {passes.map((r, i) => (
          <line key={i} x1={mapZ(0)} y1={mapX(r)} x2={mapZ(settings.stockLength)} y2={mapX(r)} stroke="rgba(234, 179, 8, 0.2)" strokeWidth="1" />
        ))}

        {/* Profile */}
        <path d={profilePath} fill="none" stroke="#3b82f6" strokeWidth="3" />
        <path d={mirroredPath} fill="none" stroke="#1d4ed8" strokeWidth="2" strokeDasharray="4,4" />

        {/* Points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle 
              cx={mapZ(p.z)} 
              cy={mapX(p.x)} 
              r={i === hoveredPointIndex ? "8" : "5"} 
              fill={i === hoveredPointIndex ? "#fbbf24" : "#60a5fa"}
              stroke={i === hoveredPointIndex ? "#fff" : "none"}
              strokeWidth="2"
              className="transition-all cursor-pointer pointer-events-none"
            />
            {/* Invisible Hitbox */}
            <circle 
              cx={mapZ(p.z)} 
              cy={mapX(p.x)} 
              r="12" 
              fill="transparent" 
              className="cursor-pointer outline-none"
              onMouseEnter={() => onHoverPoint(i)}
              onMouseLeave={() => onHoverPoint(null)}
            >
              <title>{`Точка ${i}: Z=${p.z}, X=${p.x}${p.fillet ? `, R=${p.fillet}` : ''}`}</title>
            </circle>
          </g>
        ))}
        
        {/* Origin */}
        <circle cx={mapZ(0)} cy={mapX(0)} r="5" fill="#ef4444" />
        <text x={mapZ(0) - 40} y={mapX(0) + 15} fill="#ef4444" fontSize="12" fontWeight="bold">Z=0</text>
        
        {/* Spindle / Chuck visual */}
        <rect x={mapZ(-20)} y={mapX(settings.stockDiameter/2 + 5)} width={20 * scale} height={(settings.stockDiameter/2 + 5) * scale} fill="#6b7280" />
        <rect x={mapZ(-20)} y={mapX(0)} width={20 * scale} height={(settings.stockDiameter/2 + 5) * scale} fill="#4b5563" />
        <text x={mapZ(-18)} y={mapX(settings.stockDiameter/2 + 20)} fill="#d1d5db" fontSize="10">Патрон</text>

        {/* Start Point (Touch off) */}
        <circle cx={mapZ(settings.stockLength)} cy={mapX(settings.stockDiameter / 2)} r="4" fill="#22c55e" />
        <text x={mapZ(settings.stockLength) + 5} y={mapX(settings.stockDiameter / 2) - 5} fill="#22c55e" fontSize="12" fontWeight="bold">Касание (Z={settings.stockLength})</text>
        
        {/* Axes text */}
        <text x={mapZ(maxZ) - 20} y={mapX(0) - 10} fill="#9ca3af" fontSize="14">Z</text>
        <text x={mapZ(0) + 10} y={mapX(maxX) + 15} fill="#9ca3af" fontSize="14">X (R)</text>
        <line x1={mapZ(0)} y1={mapX(minX)} x2={mapZ(0)} y2={mapX(maxX)} stroke="#4b5563" strokeWidth="1" />
      </svg>
    </div>
  );
}
