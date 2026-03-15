export interface Point {
  id: string;
  z: number;  // Z position (mm)
  x: number;  // X DIAMETER (mm) - not radius
  r?: number; // Fillet RADIUS (mm)
}

export interface Stock {
  diameter: number;
  length: number;
  safeDistance: number;
}

export interface Tool {
  radius: number;
  angle: number;
  clearanceAngle: number;
  roughingAllowance: number;
}

export interface Speeds {
  roughingFeed: number;
  finishingFeed: number;
  spindleSpeed: number;
  constantSurfaceSpeed: boolean; // G96
}

export interface Operations {
  facing: boolean;
  roughing: boolean;
  roughingDepthOfCut: number;
  finishing: boolean;
  parting: boolean;
  partingWidth: number;
}

export interface GcodeSettings {
  header: string;
  footer: string;
}

import { Language } from './lib/i18n';

export interface LatheState {
  language: Language;
  projectName: string; // Name used for saving files
  points: Point[];
  stock: Stock;
  tool: Tool;
  speeds: Speeds;
  operations: Operations;
  gcodeSettings: GcodeSettings;
  hoveredPointId: string | null;
}
