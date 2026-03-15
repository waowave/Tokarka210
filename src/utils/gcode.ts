import { LatheState } from '../types';
import { resolveFillets, offsetPolyline } from './geometry';

export interface PathSegment {
  type: 'G0' | 'G1';
  x: number;
  z: number;
}

export function generateGcode(state: LatheState): { gcode: string; paths: PathSegment[] } {
  const { stock, tool, speeds, operations, gcodeSettings } = state;

  // resolveFillets returns radius values (X/2)
  const rawPoints = resolveFillets(state.points);

  // Sort points to go from Z max (right) to Z min (left/chuck)
  const profile = [...rawPoints].sort((a, b) => b.z - a.z);

  if (profile.length < 2) return { gcode: '', paths: [] };

  const lines: string[] = [];
  const paths: PathSegment[] = [];

  const addCode = (code: string) => lines.push(code);
  const addPath = (type: 'G0' | 'G1', xRadius: number, z: number, codeSuffix = '') => {
    paths.push({ type, x: xRadius, z });
    // Output as DIAMETER (X is diameter in G-code)
    if (type === 'G0') addCode(`G0 X${(xRadius * 2).toFixed(3)} Z${z.toFixed(3)} ${codeSuffix}`);
    if (type === 'G1') addCode(`G1 X${(xRadius * 2).toFixed(3)} Z${z.toFixed(3)} ${codeSuffix}`);
  };

  // Use max Z from profile as the starting Z (stock length)
  const startZ = profile[0].z; // Rightmost point = max Z
  const startX = stock.diameter / 2; // Convert to radius
  const safeZ = startZ + stock.safeDistance;
  const safeX = startX + stock.safeDistance;

  // Header
  addCode(gcodeSettings.header);
  addCode(`G92 X${stock.diameter.toFixed(3)} Z${startZ.toFixed(3)} (Set current pos to stock top-right)`);
  addCode(`S${speeds.spindleSpeed} M3`);
  if (speeds.constantSurfaceSpeed) addCode('G96');

  // 1. Facing
  if (operations.facing) {
    addCode('');
    addCode('(*** FACING ***)');
    addPath('G0', safeX, startZ);
    addPath('G1', -0.5, startZ, `F${speeds.roughingFeed}`); // Go slightly past center
    addPath('G0', safeX, safeZ);
  } else {
    addPath('G0', safeX, safeZ);
  }

  // Find max X at a given Z for the roughing profile
  const roughingProfile = offsetPolyline(profile, tool.roughingAllowance);

  // Get profile boundaries  
  const maxProfileZ = roughingProfile[0].z; // Rightmost point (sorted by Z desc)
  const minProfileZ = roughingProfile[roughingProfile.length - 1].z;
  const maxProfileX = Math.max(...roughingProfile.map(p => p.x));
  const minProfileX = Math.min(...roughingProfile.map(p => p.x));

  // 2. Roughing
  if (operations.roughing) {
    addCode('');
    addCode('(*** ROUGHING ***)');
    const radialDoC = operations.roughingDepthOfCut / 2; // user specifies DoC on diameter
    
    // Calculate number of roughing passes needed
    const totalRadialStock = startX - minProfileX;
    const roughingPasses = Math.max(1, Math.ceil(totalRadialStock / radialDoC));
    const actualRadialDoC = totalRadialStock / roughingPasses;
    
    // Generate roughing passes following the profile
    for (let pass = roughingPasses; pass >= 1; pass--) {
      const remainingStock = pass * actualRadialDoC;
      const offsetProfile = offsetPolyline(profile, remainingStock);
      
      addCode(`(*** PASS ${roughingPasses - pass + 1}/${roughingPasses} - Stock: ${(remainingStock * 2).toFixed(2)}mm ***)`);
      addPath('G0', offsetProfile[0].x, safeZ);
      
      for (let i = 0; i < offsetProfile.length; i++) {
        const p = offsetProfile[i];
        if (i === 0) {
          addPath('G1', p.x, p.z, `F${speeds.roughingFeed}`);
        } else {
          addPath('G1', p.x, p.z);
        }
      }
      // Retract
      addPath('G0', safeX, safeZ);
    }
  }

  // 3. Finishing
  if (operations.finishing) {
    addCode('');
    addCode('(*** FINISHING ***)');
    addPath('G0', safeX, safeZ);
    addPath('G0', profile[0].x, safeZ);
    
    let first = true;
    for (const p of profile) {
      if (first) {
        addPath('G1', p.x, p.z, `F${speeds.finishingFeed}`);
        first = false;
      } else {
        addPath('G1', p.x, p.z);
      }
    }
    // Retract
    addPath('G1', profile[profile.length-1].x + 1, profile[profile.length-1].z);
    addPath('G0', safeX, safeZ);
  }

  // 4. Parting
  if (operations.parting) {
    addCode('');
    addCode('(*** PARTING ***)');
    const partZ = 0; // Assuming Z=0 is the parting line, with width to the left (negative Z).
    addPath('G0', safeX, partZ);
    addPath('G1', -0.5, partZ, `F${speeds.roughingFeed / 2}`); // slower feed for parting
    addPath('G0', safeX, partZ);
  }

  // Footer
  addCode('');
  addCode('(*** END ***)');
  addCode(gcodeSettings.footer);

  return { gcode: lines.join('\n'), paths };
}
