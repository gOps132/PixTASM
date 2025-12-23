# PixTASM - Project Structure

## Directory Organization

### `/src/` - Core Application Source
- **`main.ts`** - Application entry point, initialization and setup
- **`types.ts`** - TypeScript type definitions for grid cells and data structures
- **`color.ts`** - Color palette definitions and color decoding utilities
- **`constants.ts`** - Application-wide constants and configuration values
- **`style.css`** - Global application styling

### `/src/events/` - Event Handling
- **`listeners.ts`** - Event listener setup and user interaction handling

### `/src/grid/` - Grid System
- **`grid.ts`** - Grid creation, rendering, and cell management logic

### `/src/state/` - Application State
- **`appState.ts`** - Centralized state management for grid dimensions, colors, and tools

### `/src/storage/` - Data Persistence
- **`constants.ts`** - Storage-related constants and keys
- **`persistence.ts`** - Save/load functionality for grid data and settings

### `/src/tasm/` - Assembly Export
- **`generator.ts`** - TASM code generation from grid data
- **`mappings.ts`** - Color and character mappings for assembly output
- **`spritedb_generator.ts`** - DB-style sprite declaration generation

### `/src/ui/` - User Interface
- **`dom.ts`** - DOM element creation and UI component management
- **`colorPalette.ts`** - Color palette UI component creation

### `/public/` - Static Assets
- **`favicon_io/`** - Favicon files in multiple formats
- **SVG icons** - Tool icons (draw, erase, fill, etc.)

## Core Components and Relationships

### State Management Flow
```
appState.ts ← → main.ts ← → UI Components
     ↓              ↓
persistence.ts   grid.ts
     ↓              ↓
localStorage    DOM Updates
```

### Export Pipeline
```
Grid Data → generator.ts → TASM Output
    ↓           ↓
mappings.ts  spritedb_generator.ts
    ↓           ↓
Color Maps   DB Declarations
```

### UI Component Hierarchy
```
app (main container)
├── Grid Container (gridContainer)
├── Color Panels (bgColorPanel, fgColorPanel)
├── Tool Controls
└── Export Controls
```

## Architectural Patterns

### Module-Based Architecture
- Clear separation of concerns with dedicated modules for each major feature
- Functional programming approach with pure functions for data transformation
- Event-driven architecture for user interactions

### State Centralization
- Single source of truth in `appState.ts` for application state
- Immutable state updates with getter/setter pattern
- Persistence layer abstraction for data storage

### Export Strategy
- Pluggable export system with separate generators for different output formats
- Mapping-based approach for color and character translation
- Template-based code generation for assembly output