# PixTASM - Technology Stack

## Programming Languages
- **TypeScript 5.8.3** - Primary development language with strict type checking
- **HTML5** - Semantic markup for web application structure
- **CSS3** - Styling with modern layout techniques

## Build System and Tooling
- **Vite 7.1.2** - Fast build tool and development server
- **Node.js** - Runtime environment for development tools
- **npm** - Package management and script execution

## Development Dependencies
```json
{
  "typescript": "~5.8.3",
  "vite": "^7.1.2"
}
```

## Browser Technologies
- **DOM API** - Direct DOM manipulation for grid and UI components
- **localStorage** - Client-side data persistence
- **Canvas/Grid System** - Custom grid implementation using DOM elements
- **Event System** - Native browser event handling

## Development Commands

### Start Development Server
```bash
npm run dev
```
- Launches Vite development server with hot reload
- Serves application on local development port
- Provides real-time TypeScript compilation

### Build for Production
```bash
npm run build
```
- Compiles TypeScript to JavaScript
- Bundles and optimizes assets with Vite
- Generates production-ready static files

### Preview Production Build
```bash
npm run preview
```
- Serves the production build locally
- Allows testing of optimized build before deployment

## Project Configuration

### TypeScript Configuration (`tsconfig.json`)
- Strict type checking enabled
- Modern ES module support
- DOM library types included

### Vite Configuration
- ES module build target
- TypeScript integration
- Static asset handling

## Architecture Decisions

### No External UI Framework
- Pure TypeScript/DOM implementation for maximum control
- Lightweight bundle size
- Direct manipulation of grid elements for performance

### Module System
- ES6 modules for clean dependency management
- Tree-shaking support for optimal bundle size
- Clear import/export boundaries

### Type Safety
- Comprehensive TypeScript interfaces for all data structures
- Strict null checks and type assertions
- Compile-time error prevention

## Development Environment
- Modern browser support (ES2020+)
- Hot module replacement during development
- Source map support for debugging
- Fast refresh for rapid iteration