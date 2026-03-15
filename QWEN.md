# LatheCAM 210 - Project Context

## Project Overview

**LatheCAM 210** is a web-based CNC lathe G-code generator. It allows users to design rotational part profiles using a point-based system, configure machining parameters, and generate complete G-code programs.

### Purpose
- Design turned parts visually using Z/X coordinates with optional fillet radii
- Configure machining operations (facing, roughing, finishing, parting)
- Generate Fanuc-compatible G-code
- Visualize parts in 2D and 3D
- Simulate the machining process with material removal animation

### Technology Stack

| Category | Technology |
|----------|------------|
| Framework | React 19.2.3 |
| Language | TypeScript 5.9.3 (strict mode) |
| Build Tool | Vite 7.2.4 |
| Styling | Tailwind CSS 4.1.17 |
| State Management | Zustand 5.0.11 |
| 3D Rendering | Three.js 0.183.2 + @react-three/fiber + @react-three/drei |
| Icons | Lucide React |
| Output | Single HTML file (vite-plugin-singlefile) |

## Architecture

```
src/
├── App.tsx              # Main component, layout, navigation, save/load
├── store.ts             # Zustand state with undo/redo history
├── types.ts             # TypeScript interfaces (Point, Stock, Tool, etc.)
├── components/
│   ├── ProfileEditor.tsx    # Left sidebar: point table with inline editing
│   ├── PointEditor.tsx      # Modal: advanced number editor with numpad
│   ├── SettingsPanel.tsx    # Right sidebar: machining parameters
│   ├── View2D.tsx           # 2D profile visualization with SVG
│   ├── View3D.tsx           # 3D preview and simulation with Three.js
│   ├── ProfilePlot.tsx      # (legacy/unused)
│   └── Preview3D.tsx        # (legacy/unused)
├── lib/
│   └── i18n.ts              # Translation system (EN/RU)
└── utils/
    ├── gcode.ts             # G-code generation logic
    ├── geometry.ts          # Fillet resolution, polyline offsetting
    └── cn.ts                # className utility (clsx + tailwind-merge)
```

### Key Data Flow

1. **State** (Zustand store) holds:
   - `points[]` - Profile definition (Z position, X diameter, R fillet radius)
   - `stock` - Stock dimensions (diameter, length, safeDistance)
   - `tool` - Tool parameters (radius, angles, roughingAllowance)
   - `speeds` - Feeds and spindle (roughingFeed, finishingFeed, spindleSpeed, constantSurfaceSpeed)
   - `operations` - Enabled operations (facing, roughing, finishing, parting)
   - `gcodeSettings` - Header/footer G-code text
   - `projectName` - Name for saved files
   - `language` - 'en' or 'ru'
   - `past[]` / `future[]` - Undo/redo history

2. **G-code Generation** (`utils/gcode.ts`):
   - `resolveFillets()` converts points with radii to smooth polylines
   - `offsetPolyline()` creates offset profiles for roughing allowance
   - `generateGcode()` produces complete CNC program with all operations

3. **Visualization**:
   - View2D: SVG-based 2D drawing with interactive point markers
   - View3D: Three.js canvas with lathe geometry and toolpath lines
   - Simulation: Material removal animation synchronized with G-code display

## Building and Running

### Development
```bash
npm run dev
```
Starts Vite dev server (typically at http://localhost:5173)

### Production Build
```bash
npm run build
```
Creates optimized single HTML file (via vite-plugin-singlefile)

### Preview Production Build
```bash
npm run preview
```

### Type Checking
```bash
npx tsc --noEmit
```

## Development Conventions

### TypeScript
- Strict mode enabled (`strict: true`)
- No unused locals/parameters (`noUnusedLocals`, `noUnusedParameters`)
- No fallthrough in switch cases
- Path alias: `@/` resolves to `src/`

### Code Style
- Components: PascalCase (e.g., `ProfileEditor.tsx`)
- Utilities: camelCase (e.g., `gcode.ts`)
- Interfaces: PascalCase with descriptive names
- X values are **diameters** (industry standard for CNC lathes)
- R values are **radii** (for fillets)

### State Management
- Always use `updateState()` for changes to maintain undo/redo history
- Direct state mutation is not allowed
- `hoveredPointId` is excluded from history

### Component Patterns
- All components are functional React components
- Use Zustand hooks for state access: `const { points, updateState } = useStore()`
- Memoize expensive calculations with `useMemo()`
- Support bilingual UI via `t(key, language)` from `src/lib/i18n.ts`

### Key Implementation Details

**Point Editor Modal** (`PointEditor.tsx`):
- Supports whole numbers and decimals (up to 0.01mm precision)
- Keyboard shortcuts: Tab/. /, toggle decimal mode, Enter saves, Escape cancels
- Mouse wheel adjusts value by ±0.1mm
- Numpad layout: 3 columns (1-9, CLR-0-., Backspace)

**G-code Output**:
- X values in diameters (multiplied by 2 internally)
- G96 constant surface speed is optional (disabled by default)
- Facing operation is optional (disabled by default)

**Profile Direction**:
- Points ordered from Z max (right, away from chuck) to Z=0 (chuck side)
- Stock length auto-calculated from profile max Z

**Default Values** (from `store.ts`):
- Stock: Ø22mm diameter
- Tool nose radius: 0.4mm
- Roughing depth of cut: 0.5mm (on diameter)
- Roughing feed: 100 mm/min
- Finishing feed: 50 mm/min
- Spindle speed: 1000 RPM

## File Formats

### Project File (.json)
```json
{
  "version": "1.0",
  "name": "my-part",
  "points": [{ "id": "1", "z": 17, "x": 17.5, "r": 0 }],
  "stock": { "diameter": 22, "length": 17, "safeDistance": 2 },
  "tool": { "radius": 0.4, ... },
  "speeds": { "roughingFeed": 100, ... },
  "operations": { "facing": false, "roughing": true, ... },
  "gcodeSettings": { "header": "...", "footer": "..." },
  "exportedAt": "2026-03-15T..."
}
```

### G-code File (.nc)
Standard Fanuc-compatible format with G21/G90/G96/M-codes.

## Testing

No formal test suite configured. Manual testing via:
1. Load presets (Chess Pawn, Simple Cone)
2. Verify G-code output in G-code tab
3. Check simulation animation
4. Test save/load project functionality

## Common Tasks

### Adding a new setting
1. Add field to appropriate interface in `types.ts`
2. Add default value in `store.ts`
3. Add UI control in `SettingsPanel.tsx`
4. Use value in `gcode.ts` generation logic

### Modifying G-code output
Edit `src/utils/gcode.ts`:
- `generateGcode()` function contains all generation logic
- Operations are generated in order: facing → roughing → finishing → parting

### Changing default values
Edit `defaultState` in `src/store.ts`

### Adding translations
Edit `translations` object in `src/lib/i18n.ts` (both `en` and `ru` sections)
