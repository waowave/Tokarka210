import { create } from 'zustand';
import { LatheState, Point } from './types';

interface StoreState extends LatheState {
  past: Omit<LatheState, 'hoveredPointId'>[];
  future: Omit<LatheState, 'hoveredPointId'>[];

  setHoveredPoint: (id: string | null) => void;
  updateState: (newState: Partial<Omit<LatheState, 'hoveredPointId'>>) => void;
  undo: () => void;
  redo: () => void;
  addPoint: (index: number) => void;
  updatePoint: (id: string, updates: Partial<Point>) => void;
  removePoint: (id: string) => void;
  loadPreset: (points: Point[]) => void;
}

const defaultState: Omit<LatheState, 'hoveredPointId'> = {
  language: 'ru',
  projectName: 'my-part', // Default project name for saving files
  // Default to Chess Pawn preset
  points: [
    { id: '1', z: 65, x: 5, r: 0 },
    { id: '2', z: 60, x: 5, r: 5 },
    { id: '3', z: 50, x: 15, r: 0 },
    { id: '4', z: 40, x: 15, r: 10 },
    { id: '5', z: 20, x: 8, r: 2 },
    { id: '6', z: 10, x: 20, r: 0 },
    { id: '7', z: 0, x: 20, r: 0 },
  ],
  stock: { diameter: 22, length: 65, safeDistance: 2 }, // length is auto-calculated from profile max Z
  tool: { radius: 0.4, angle: 90, clearanceAngle: 5, roughingAllowance: 0.5 },
  speeds: { roughingFeed: 100, finishingFeed: 50, spindleSpeed: 1000, constantSurfaceSpeed: false }, // G96 disabled by default
  operations: {
    facing: false, // Disabled by default - usually not used
    roughing: true,
    roughingDepthOfCut: 0.5, // 0.5mm on diameter
    finishing: true,
    parting: false,
    partingWidth: 2,
  },
  gcodeSettings: {
    header: 'G21 G90 (Metric, Absolute)',
    footer: 'G0 X30 Z70 (Safe retract)\nM30 (End Program)',
  },
};

export const useStore = create<StoreState>((set, get) => ({
  ...defaultState,
  past: [],
  future: [],
  hoveredPointId: null,

  setHoveredPoint: (id) => set({ hoveredPointId: id }),

  updateState: (newState) => {
    const { past, future, hoveredPointId, setHoveredPoint, updateState, undo, redo, addPoint, updatePoint, removePoint, loadPreset, ...currentState } = get();
    set({
      ...newState,
      past: [...past, currentState],
      future: [],
    });
  },

  undo: () => {
    const { past, future, hoveredPointId, setHoveredPoint, updateState, undo, redo, addPoint, updatePoint, removePoint, loadPreset, ...currentState } = get();
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    set({
      ...previous,
      past: past.slice(0, past.length - 1),
      future: [currentState, ...future],
    });
  },

  redo: () => {
    const { past, future, hoveredPointId, setHoveredPoint, updateState, undo, redo, addPoint, updatePoint, removePoint, loadPreset, ...currentState } = get();
    if (future.length === 0) return;
    const next = future[0];
    set({
      ...next,
      past: [...past, currentState],
      future: future.slice(1),
    });
  },

  addPoint: (index) => {
    const points = [...get().points];
    const prev = points[index];
    const id = Math.random().toString(36).substr(2, 9);
    points.splice(index + 1, 0, { id, z: prev.z - 5, x: prev.x, r: 0 });
    get().updateState({ points });
  },

  updatePoint: (id, updates) => {
    const points = get().points.map((p) => (p.id === id ? { ...p, ...updates } : p));
    get().updateState({ points });
  },

  removePoint: (id) => {
    const points = get().points.filter((p) => p.id !== id);
    if (points.length < 2) return; // Keep at least 2 points
    get().updateState({ points });
  },

  loadPreset: (points) => {
    get().updateState({ points });
  },
}));
