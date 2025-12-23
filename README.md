# PixTASM

A web-based pixel art editor specifically designed for creating graphics that can be exported to TASM (Turbo Assembler) format.

## Features

- Grid-based drawing with customizable dimensions
- Color palette system with background and foreground colors
- ASCII character support with CP437 encoding
- TASM assembly code generation
- DOS emulator integration for testing generated code
- Undo/redo system with persistent history
- Project save/load functionality
- Blinking text support
- Zoom and pan controls

## Development

### Prerequisites

- Node.js
- Doxygen (for documentation generation)
  - macOS: `brew install doxygen`
  - Ubuntu/Debian: `sudo apt-get install doxygen`
  - Windows: Download from [doxygen.nl](https://www.doxygen.nl/download.html)

### Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Generate documentation
npm run docs

# Serve documentation locally
npm run docs:serve

# Alternative ways to serve documentation:
# Using Python 3
cd docs/html && python -m http.server 8080

# Using Node.js (if you have http-server installed)
npx http-server docs/html -p 8080

# Using PHP
cd docs/html && php -S localhost:8080
```

## Documentation

The project uses Doxygen for code documentation. All functions, classes, and modules are documented using Doxygen-style comments.

To generate the documentation:

```bash
npm run docs
```

This will create HTML documentation in the `docs/html` directory. You can serve it locally with any of these methods:

```bash
# Using the npm script (Python required)
npm run docs:serve

# Using Node.js http-server
npx http-server docs/html -p 8080

# Using Python directly
cd docs/html && python -m http.server 8080

# Using PHP
cd docs/html && php -S localhost:8080
```

Then visit `http://localhost:8080` to view the documentation.

### Hosting Online

To host Doxygen documentation online:

1. **GitHub Pages**: Push `docs/html` contents to `gh-pages` branch
2. **Netlify**: Drag and drop `docs/html` folder to Netlify
3. **Vercel**: Deploy `docs/html` as static site
4. **Any static hosting**: Upload `docs/html` contents

## Architecture

- **Canvas Grid System**: High-performance rendering with viewport culling
- **State Management**: Centralized application state with persistence
- **Event System**: Modular event handling for tools and interactions
- **TASM Generation**: Optimized assembly code output with string grouping
- **DOS Integration**: Real TASM compilation using js-dos emulator

## License

MIT