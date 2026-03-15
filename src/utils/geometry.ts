import { Point } from '../types';

export interface Vec2 {
  x: number;
  z: number;
}

export function distance(a: Vec2, b: Vec2) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

export function normalize(v: Vec2): Vec2 {
  const len = Math.hypot(v.x, v.z);
  if (len === 0) return { x: 0, z: 0 };
  return { x: v.x / len, z: v.z / len };
}

// Generate high resolution polyline with fillets
// Input points: X is DIAMETER, R is RADIUS
export function resolveFillets(points: Point[]): Vec2[] {
  if (points.length < 2) return [];
  const result: Vec2[] = [];

  for (let i = 0; i < points.length; i++) {
    const curr = points[i];

    // First or last point, or no radius - just add the point
    // Convert X from diameter to radius
    if (i === 0 || i === points.length - 1 || !curr.r || curr.r === 0) {
      result.push({ x: curr.x / 2, z: curr.z }); // X/2 to convert diameter to radius
      continue;
    }

    const prev = points[i - 1];
    const next = points[i + 1];

    // Vectors from current point to prev and next (using radius for X)
    const vPrev = normalize({ x: prev.x / 2 - curr.x / 2, z: prev.z - curr.z });
    const vNext = normalize({ x: next.x / 2 - curr.x / 2, z: next.z - curr.z });

    // Angle between segments
    const angle = Math.acos(vPrev.x * vNext.x + vPrev.z * vNext.z);

    if (angle < 0.01 || angle > Math.PI - 0.01) {
      result.push({ x: curr.x / 2, z: curr.z });
      continue;
    }

    // Distance from corner to tangent points (r is already radius)
    const distToTangent = curr.r / Math.tan(angle / 2);

    const maxPrevDist = distance({ x: curr.x / 2, z: curr.z }, { x: prev.x / 2, z: prev.z }) / 2;
    const maxNextDist = distance({ x: curr.x / 2, z: curr.z }, { x: next.x / 2, z: next.z }) / 2;

    const actualDist = Math.min(distToTangent, maxPrevDist, maxNextDist);
    const actualR = actualDist * Math.tan(angle / 2); // Effective radius

    const p1 = {
      x: curr.x / 2 + vPrev.x * actualDist,
      z: curr.z + vPrev.z * actualDist
    };

    const p2 = {
      x: curr.x / 2 + vNext.x * actualDist,
      z: curr.z + vNext.z * actualDist
    };

    // Center of the arc
    const midTangentVec = normalize({
      x: (vPrev.x + vNext.x) / 2,
      z: (vPrev.z + vNext.z) / 2
    });

    const distToCenter = Math.hypot(actualDist, actualR);
    const center = {
      x: curr.x / 2 + midTangentVec.x * distToCenter,
      z: curr.z + midTangentVec.z * distToCenter
    };

    // Generate arc points
    const steps = Math.max(5, Math.ceil(actualR * angle * 2));
    const startAngle = Math.atan2(p1.x - center.x, p1.z - center.z);
    let endAngle = Math.atan2(p2.x - center.x, p2.z - center.z);

    // Ensure we go the short way around
    let delta = endAngle - startAngle;
    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;

    for (let j = 0; j <= steps; j++) {
      const t = j / steps;
      const a = startAngle + delta * t;
      result.push({
        x: center.x + Math.sin(a) * actualR,
        z: center.z + Math.cos(a) * actualR
      });
    }
  }

  return result;
}

// Simple offset for finishing allowance and basic TNRC
export function offsetPolyline(points: Vec2[], offset: number): Vec2[] {
  if (points.length < 2) return points;
  if (offset === 0) return points;

  const result: Vec2[] = [];
  
  for (let i = 0; i < points.length; i++) {
    const curr = points[i];
    
    let nx = 0, nz = 0;
    
    if (i === 0) {
      const next = points[1];
      const dir = normalize({ x: next.x - curr.x, z: next.z - curr.z });
      nx = -dir.z;
      nz = dir.x;
    } else if (i === points.length - 1) {
      const prev = points[i - 1];
      const dir = normalize({ x: curr.x - prev.x, z: curr.z - prev.z });
      nx = -dir.z;
      nz = dir.x;
    } else {
      const prev = points[i - 1];
      const next = points[i + 1];
      const dir1 = normalize({ x: curr.x - prev.x, z: curr.z - prev.z });
      const dir2 = normalize({ x: next.x - curr.x, z: next.z - curr.z });
      
      const avgDir = normalize({ x: dir1.x + dir2.x, z: dir1.z + dir2.z });
      nx = -avgDir.z;
      nz = avgDir.x;
    }

    // Since we are turning from Right to Left, cutting tool is on the outside (positive X).
    result.push({
      x: curr.x + nx * offset,
      z: curr.z + nz * offset
    });
  }

  return result;
}
