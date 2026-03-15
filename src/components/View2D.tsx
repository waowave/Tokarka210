import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { resolveFillets } from '../utils/geometry';
import { t } from '../lib/i18n';
import { PointEditor } from './PointEditor';

export function View2D() {
  const { points, stock, hoveredPointId, setHoveredPoint, updatePoint, language } = useStore();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValues, setEditValues] = useState({ z: 0, x: 0, r: 0 });

  const openEditor = (index: number) => {
    const p = points[index];
    setEditValues({ z: p.z, x: p.x, r: p.r || 0 });
    setEditingIndex(index);
  };

  const handleSaveEdit = (z: number, x: number, r: number) => {
    if (editingIndex !== null) {
      const p = points[editingIndex];
      updatePoint(p.id, { z, x, r });
      setEditingIndex(null);
    }
  };

  const width = 800;
  const height = 400;

  // Calculate stock length from profile max Z
  const maxProfileZ = Math.max(...points.map(p => p.z));
  const stockLength = maxProfileZ;

  // Find safe boundaries for scaling
  const maxZ = stockLength + stock.safeDistance + 5;
  const maxX = (stock.diameter / 2) + stock.safeDistance + 5;

  const scale = Math.min((width - 60) / maxZ, (height / 2 - 30) / maxX);
  const cx = 40; // X offset for Z=0
  const cy = height / 2; // Centerline

  const toPx = (z: number, x: number) => ({
    x: cx + z * scale,
    y: cy - x * scale
  });

  const pathStr = useMemo(() => {
    const smoothed = resolveFillets(points);
    if (smoothed.length < 2) return '';
    // resolveFillets already returns radius values
    const start = toPx(smoothed[0].z, smoothed[0].x);
    let d = `M ${start.x} ${start.y} `;
    for (let i = 1; i < smoothed.length; i++) {
      const p = toPx(smoothed[i].z, smoothed[i].x);
      d += `L ${p.x} ${p.y} `;
    }
    return d;
  }, [points, scale]);

  return (
    <div className="w-full h-full bg-[#1e293b] flex items-center justify-center overflow-hidden">
      <svg width={width} height={height} className="max-w-full max-h-full drop-shadow-md">
        <defs>
          <pattern id="grid" width={10 * scale} height={10 * scale} patternUnits="userSpaceOnUse">
            <path d={`M ${10 * scale} 0 L 0 0 0 ${10 * scale}`} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
          </pattern>
        </defs>

        {/* Grid */}
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Centerline */}
        <line x1={0} y1={cy} x2={width} y2={cy} stroke="#475569" strokeWidth="1" strokeDasharray="5,5" />

        {/* Chuck */}
        <rect x={cx - 30} y={cy - (stock.diameter/2 * scale) - 10} width={30} height={(stock.diameter * scale) + 20} fill="#334155" stroke="#0f172a" />
        <text x={cx - 15} y={cy} fill="#94a3b8" fontSize="10" textAnchor="middle" transform={`rotate(-90 ${cx - 15} ${cy})`}>{t('view2d.chuck', language)}</text>

        {/* Stock - length from profile max Z */}
        <rect
          x={cx}
          y={cy - (stock.diameter/2 * scale)}
          width={stockLength * scale}
          height={stock.diameter * scale}
          fill="rgba(56, 189, 248, 0.1)"
          stroke="rgba(56, 189, 248, 0.3)"
          strokeDasharray="4,4"
        />

        {/* Profile Path */}
        <path d={pathStr} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Original Points */}
        {points.map((p, i) => {
          // Convert diameter to radius for display (points are stored as diameters)
          const pt = toPx(p.z, p.x / 2);
          const isHovered = hoveredPointId === p.id;

          return (
            <g 
              key={p.id} 
              onMouseEnter={() => setHoveredPoint(p.id)} 
              onMouseLeave={() => setHoveredPoint(null)}
              onClick={() => openEditor(i)}
              className="cursor-pointer"
            >
              {/* Invisible larger circle for easier hover */}
              <circle cx={pt.x} cy={pt.y} r={15} fill="transparent" />
              <circle
                cx={pt.x}
                cy={pt.y}
                r={isHovered ? 6 : 4}
                fill={isHovered ? "#fbbf24" : "#ffffff"}
                stroke={isHovered ? "#d97706" : "#2563eb"}
                strokeWidth={2}
                className="transition-all duration-200"
              />
              {isHovered && (
                <text x={pt.x} y={pt.y - 12} fill="#fbbf24" fontSize="11" textAnchor="middle" className="font-mono bg-slate-900 px-1 py-0.5 rounded shadow">
                  Ø{p.x.toFixed(1)} Z{p.z.toFixed(1)}
                  {p.r ? ` R${p.r}` : ''}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Point Editor Modal */}
      {editingIndex !== null && (
        <PointEditor
          z={editValues.z}
          x={editValues.x}
          r={editValues.r}
          index={editingIndex}
          isOpen={true}
          onSave={handleSaveEdit}
          onClose={() => setEditingIndex(null)}
        />
      )}
    </div>
  );
}
