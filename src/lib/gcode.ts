export type Point = { z: number, x: number, fillet?: number };

export type Settings = {
  stockDiameter: number;
  stockLength: number;
  depthOfCut: number;
  feedRate: number;
  clearance: number;
  finishAllowance: number;
};

export function interpolateProfile(points: Point[]): Point[] {
  if (points.length < 3) return points.map(p => ({ z: p.z, x: p.x }));

  const result: Point[] = [];
  result.push({ z: points[0].z, x: points[0].x });

  for (let i = 1; i < points.length - 1; i++) {
    const pPrev = result[result.length - 1]; // Use last inserted point to allow consecutive fillets
    const p = points[i];
    const pNext = points[i + 1];

    if (!p.fillet || p.fillet <= 0) {
      result.push({ z: p.z, x: p.x });
      continue;
    }

    const r = p.fillet;

    // Vectors from P to Prev and Next
    const v1z = pPrev.z - p.z;
    const v1x = pPrev.x - p.x;
    const len1 = Math.sqrt(v1z * v1z + v1x * v1x);

    const v2z = pNext.z - p.z;
    const v2x = pNext.x - p.x;
    const len2 = Math.sqrt(v2z * v2z + v2x * v2x);

    if (len1 === 0 || len2 === 0) {
      result.push({ z: p.z, x: p.x });
      continue;
    }

    const n1z = v1z / len1;
    const n1x = v1x / len1;
    const n2z = v2z / len2;
    const n2x = v2x / len2;

    // Dot product and angle
    const dot = n1z * n2z + n1x * n2x;
    // Clamped to avoid NaN
    const angle = Math.acos(Math.max(-1, Math.min(1, dot)));

    if (angle < 0.01 || Math.abs(angle - Math.PI) < 0.01) {
      // Lines are collinear
      result.push({ z: p.z, x: p.x });
      continue;
    }

    // Distance from P to tangent points
    const d = r / Math.tan(angle / 2);

    // If fillet is too large for segments, clamp it
    const maxD = Math.min(len1 * 0.49, len2 * 0.49);
    let actualD = d;
    let actualR = r;
    if (d > maxD) {
      actualD = maxD;
      actualR = actualD * Math.tan(angle / 2);
    }

    const t1z = p.z + n1z * actualD;
    const t1x = p.x + n1x * actualD;

    const t2z = p.z + n2z * actualD;
    const t2x = p.x + n2x * actualD;

    // Find center of the arc
    const bisectorZ = n1z + n2z;
    const bisectorX = n1x + n2x;
    const bisectorLen = Math.sqrt(bisectorZ * bisectorZ + bisectorX * bisectorX);
    
    // Distance from P to center of circle
    const distToCenter = Math.sqrt(actualD * actualD + actualR * actualR);
    
    let cz = p.z;
    let cx = p.x;
    
    if (bisectorLen > 0.001) {
      cz = p.z + (bisectorZ / bisectorLen) * distToCenter;
      cx = p.x + (bisectorX / bisectorLen) * distToCenter;
    }

    // Start and end angles
    // Atan2 takes (y, x), but here let's map X=x, Y=z
    let a1 = Math.atan2(t1x - cx, t1z - cz);
    let a2 = Math.atan2(t2x - cx, t2z - cz);

    // Make sure we traverse the shortest arc
    let diff = a2 - a1;
    if (diff > Math.PI) a2 -= 2 * Math.PI;
    if (diff < -Math.PI) a2 += 2 * Math.PI;

    // Insert arc points
    const steps = Math.max(4, Math.ceil(Math.abs(diff) * actualR * 2)); // Dynamic resolution
    for (let j = 0; j <= steps; j++) {
      const a = a1 + diff * (j / steps);
      result.push({ z: cz + Math.cos(a) * actualR, x: cx + Math.sin(a) * actualR });
    }
  }

  result.push({ z: points[points.length - 1].z, x: points[points.length - 1].x });
  return result;
}

export function generateGCode(rawPoints: Point[], settings: Settings): string {
  const points = interpolateProfile(rawPoints);
  if (points.length < 2) return "(Not enough points to generate G-code)";

  let gcode: string[] = [];
  gcode.push(`(Generated for Lathe Weisan 210)`);
  gcode.push(`G21 (Metric)`);
  gcode.push(`G90 (Absolute)`);
  gcode.push(`G94 (Feed per min)`);
  
  // Устанавливаем текущие координаты - резец коснулся заготовки справа (X = D, Z = L)
  gcode.push(`G92 X${settings.stockDiameter.toFixed(3)} Z${settings.stockLength.toFixed(3)}`);

  const clearanceX = settings.stockDiameter + settings.clearance * 2;
  const clearanceZ = settings.stockLength + settings.clearance;

  gcode.push(`G0 X${clearanceX.toFixed(3)} Z${clearanceZ.toFixed(3)} (Move to safe distance)`);

  let currentRadius = (settings.stockDiameter / 2) - settings.depthOfCut;
  const finishAllowance = settings.finishAllowance;

  function getIntersectionZ(pts: Point[], r: number): number {
    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i+1];
      
      // Если обе точки строго выше R, значит деталь толще, мы упёрлись в неё
      if (p1.x > r && p2.x > r) {
        return p1.z;
      }
      
      // Если отрезок пересекает R (или уходит выше R)
      if ((p1.x <= r && p2.x > r) || (p1.x > r && p2.x <= r)) {
        if (p1.x === p2.x) return Math.max(p1.z, p2.z); // Остановка перед стенкой
        const t = (r - p1.x) / (p2.x - p1.x);
        return p1.z + t * (p2.z - p1.z);
      }
    }
    // Если дошли до конца и деталь тоньше нашего R, идем до самого левого края
    return pts[pts.length - 1].z;
  }

  let passNum = 1;
  while (currentRadius > 0) {
    const passRadius = currentRadius + finishAllowance;
    const targetZ = getIntersectionZ(points, passRadius);

    gcode.push(`(Roughing Pass ${passNum})`);
    gcode.push(`G0 X${(passRadius * 2).toFixed(3)} Z${clearanceZ.toFixed(3)}`);
    gcode.push(`G1 Z${targetZ.toFixed(3)} F${settings.feedRate}`);
    // Retract at 45 degrees
    gcode.push(`G1 X${(passRadius * 2 + 1).toFixed(3)} Z${(targetZ + 0.5).toFixed(3)} F${settings.feedRate * 2}`);
    gcode.push(`G0 Z${clearanceZ.toFixed(3)}`);

    currentRadius -= settings.depthOfCut;
    passNum++;
  }

  gcode.push(`(Finishing Pass)`);
  gcode.push(`G0 X${clearanceX.toFixed(3)} Z${clearanceZ.toFixed(3)}`);
  
  const pStart = points[0];
  gcode.push(`G0 X${(pStart.x * 2).toFixed(3)} Z${clearanceZ.toFixed(3)}`);
  gcode.push(`G1 Z${pStart.z.toFixed(3)} F${Math.floor(settings.feedRate * 0.5)}`); 

  for (let i = 1; i < points.length; i++) {
    gcode.push(`G1 X${(points[i].x * 2).toFixed(3)} Z${points[i].z.toFixed(3)}`);
  }

  const lastP = points[points.length - 1];
  gcode.push(`G1 X${clearanceX.toFixed(3)} Z${lastP.z.toFixed(3)}`);
  gcode.push(`G0 Z${clearanceZ.toFixed(3)}`);
  gcode.push(`G0 X${clearanceX.toFixed(3)} Z${clearanceZ.toFixed(3)}`);

  gcode.push(`M30 (End of program)`);
  return gcode.join('\n');
}
