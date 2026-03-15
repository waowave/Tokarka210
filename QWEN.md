# LatheCAM 210 - CNC Lathe G-Code Generator

## Project Overview

**LatheCAM 210** (Токарка 210) is a web-based CNC lathe profile editor and G-code generator. It allows users to design rotational part profiles using a point-based system with fillet support, configure machining parameters, and generate complete G-code programs including facing, roughing, finishing, and parting operations.

### Key Features

- **2D Profile Editor**: Point-based profile definition with Z/X coordinates and optional fillet radii
- **3D Visualization**: Real-time 3D preview of the designed part using Three.js
- **Machining Simulation**: Animated toolpath simulation showing material removal
- **G-Code Generation**: Complete CNC program generation with configurable operations
- **Bilingual UI**: English and Russian language support

### Technology Stack

| Category | Technology |
|----------|------------|
| Framework | React 19.2.3 |
| Language | TypeScript 5.9.3 |
| Build Tool | Vite 7.2.4 |
| Styling | Tailwind CSS 4.1.17 |
| State Management | Zustand 5.0.11 |
| 3D Rendering | Three.js 0.183.2 + @react-three/fiber + @react-three/drei |
| Icons | Lucide React |
| Utilities | clsx, tailwind-merge |

### Architecture

```
src/
├── App.tsx              # Main application component, layout, navigation
├── store.ts             # Zustand state management (undo/redo, points, settings)
├── types.ts             # TypeScript interfaces (Point, Stock, Tool, LatheState)
├── components/
│   ├── ProfileEditor.tsx    # Left sidebar: point table editor
│   ├── SettingsPanel.tsx    # Right sidebar: machining parameters
│   ├── View2D.tsx           # 2D profile visualization
│   ├── View3D.tsx           # 3D preview and simulation
│   └── Preview3D.tsx        # (legacy/unused)
├── lib/
│   ├── i18n.ts              # Translation system (EN/RU)
│   └── gcode.ts             # (legacy/unused)
└── utils/
    ├── gcode.ts             # G-code generation logic
    └── geometry.ts          # Fillet resolution, polyline offsetting
```

## Building and Running

### Development

```bash
npm run dev
```

Starts Vite development server (typically at `http://localhost:5173`)

### Production Build

```bash
npm run build
```

Creates optimized single-file build using `vite-plugin-singlefile`

### Preview Production Build

```bash
npm run preview
```

## State Management

The application uses **Zustand** for global state with built-in undo/redo functionality:

```typescript
interface LatheState {
  language: 'en' | 'ru';
  points: Point[];           // Profile definition points
  stock: Stock;              // Raw stock dimensions
  tool: Tool;                // Cutting tool parameters
  speeds: Speeds;            // Feeds and spindle settings
  operations: Operations;    // Enabled operations (facing, roughing, etc.)
  gcodeSettings: GcodeSettings;
  hoveredPointId: string | null;
}
```

### Key Store Actions

- `updateState(newState)` - Update state with undo history
- `undo()` / `redo()` - Navigate history
- `addPoint(index)` - Insert new profile point
- `updatePoint(id, updates)` - Modify point coordinates
- `removePoint(id)` - Delete point (min 2 required)
- `loadPreset(points)` - Load predefined profiles

## G-Code Generation

The `generateGcode()` function in `src/utils/gcode.ts` produces CNC programs with:

1. **Facing**: Face the stock end (Z=0)
2. **Roughing**: Multiple passes with configurable depth of cut
3. **Finishing**: Single finishing pass along the profile
4. **Parting**: Cut off the finished part

### Machining Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| Roughing Feed | 100 mm/min | Material removal feedrate (F value) |
| Finishing Feed | 50 mm/min | Surface finish feedrate |
| Spindle Speed | 1000 RPM | Base spindle speed (S value) |
| Constant Surface Speed | true | Enable G96 CSS mode |
| Roughing Depth of Cut | 0.5mm | Material removed per pass (on diameter) |
| Finishing Allowance | 0.5mm | Stock left for finishing |

## Geometry Processing

### Fillet Resolution (`resolveFillets`)

Converts point-based profile with radii into high-resolution polylines using tangent arc calculations.

### Polyline Offsetting (`offsetPolyline`)

Offsets profile for roughing allowance and tool nose radius compensation.

## Development Conventions

- **TypeScript**: Strict mode enabled, no implicit any
- **Path Aliases**: `@/` resolves to `src/`
- **Component Naming**: PascalCase for components, camelCase for utilities
- **State Updates**: Always use `updateState()` for undo/redo support
- **Translations**: Use `t('key', language)` from `src/lib/i18n.ts`

## File Output

The application builds as a **single HTML file** (via `vite-plugin-singlefile`), making it portable and deployable without a server.
