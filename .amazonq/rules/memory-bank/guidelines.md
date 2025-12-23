# PixTASM - Development Guidelines

## Code Quality Standards

### File Organization and Imports
- **Consistent import grouping**: External imports first, then internal imports organized by module type
- **Explicit file extensions**: Use `.ts` extensions in import paths for TypeScript files
- **Asset imports**: SVG and static assets imported using absolute paths from `/public`
- **Type-only imports**: Use `import type` for TypeScript interfaces and types

### Naming Conventions
- **camelCase**: Variables, functions, and properties (`gridContainer`, `getCurrentBgIndex`)
- **PascalCase**: Interfaces and types (`CellContent`, `HTMLButtonElement`)
- **SCREAMING_SNAKE_CASE**: Constants and configuration values (`BACKGROUND_PALETTE`, `STORAGE_KEY_GRID_DATA`)
- **Descriptive prefixes**: Event handlers prefixed with action (`addEventListener`, `initializeEventListeners`)

### Function and Variable Declarations
- **Explicit typing**: All function parameters and return types explicitly typed
- **Null safety**: Consistent use of `| null` union types for optional values
- **Non-null assertions**: Use `!` operator only when element existence is guaranteed (e.g., `dataset.row!`)
- **Default parameters**: Provide sensible defaults for optional parameters (`label = 'SPRITE'`)

### Error Handling Patterns
- **Early returns**: Use guard clauses to handle invalid states early
- **Boundary checks**: Validate array indices and grid boundaries before access
- **Graceful degradation**: Provide fallback values for missing data (`?? 0x07`, `|| { charCode: null, attribute: null }`)
- **User feedback**: Alert users for clipboard operations and validation errors

## Semantic Patterns

### State Management Architecture
- **Centralized state**: All application state managed through `appState.ts` module
- **Getter/setter pattern**: State access through dedicated functions (`getCurrentBgIndex()`, `setGridDimensions()`)
- **Immutable updates**: State modifications create new objects rather than mutating existing ones
- **Persistence integration**: State changes automatically trigger localStorage saves

### Event-Driven Architecture
- **Event delegation**: Use container-level event listeners with target checking
- **Prevent defaults**: Consistently prevent default browser behavior for custom interactions
- **State-based behavior**: Event handlers check current tool state before applying actions
- **Cleanup patterns**: Remove visual states when switching tools (`exitTextModeVisuals()`)

### DOM Manipulation Patterns
- **Element caching**: Store frequently accessed DOM elements in module-level variables
- **Dataset attributes**: Use `data-*` attributes for storing row/column indices
- **CSS custom properties**: Dynamic grid sizing using CSS variables (`--grid-cols`, `--grid-rows`)
- **Class-based styling**: State changes reflected through CSS class additions/removals

### Data Transformation Patterns
- **Encoding/decoding**: Consistent color attribute encoding/decoding through utility functions
- **Mapping tables**: Use lookup objects for character code translations (`cp437ToUnicodeMap`)
- **Template generation**: String-based code generation with proper escaping (`escapeSingle()`)
- **Batch processing**: Process grid data in chunks for optimization opportunities

## Internal API Usage Patterns

### Grid Data Management
```typescript
// Standard cell content structure
const cellContent: CellContent = {
    charCode: number | null,
    attribute: number | null
};

// Grid data access pattern
const gridData = state.getGridData();
const cell = gridData[row][col] || { charCode: null, attribute: null };
```

### Color Attribute Handling
```typescript
// Encoding color attributes
const attribute = encodeCellData({
    bgIndex: state.getCurrentBgIndex(),
    fgIndex: state.getCurrentFgIndex(),
    isBlinking: state.isBlinkEnabled()
});

// Decoding for display
const decoded = decodeCellData(cell.attribute);
element.style.backgroundColor = decoded.backgroundColor;
```

### Event Listener Registration
```typescript
// Standard event listener pattern
element.addEventListener('event', (e) => {
    e.preventDefault();
    // State checks before action
    if (state.isDrawing()) {
        // Apply changes
        // Save state
        saveGridState(rows, cols, gridData);
    }
});
```

### Tool State Management
```typescript
// Tool activation pattern
state.setToolState('draw');
drawBtn.classList.add('active');
otherBtn.classList.remove('active');
exitPreviousToolVisuals();
```

## Frequently Used Code Idioms

### Safe Element Access
```typescript
const cell = (e.target as HTMLElement).closest('.cell') as HTMLDivElement;
if (!cell) return;
```

### Grid Boundary Validation
```typescript
if (row < 0 || row >= state.getGridRows() || col < 0 || col >= state.getGridCols()) {
    return;
}
```

### Clipboard Operations
```typescript
navigator.clipboard.writeText(data).then(() => {
    alert('Data copied to clipboard!');
}).catch(err => {
    console.error('Failed to copy:', err);
    alert('Failed to copy. Check console for details.');
});
```

### String Escaping for Assembly
```typescript
const escapeSingle = (s: string): string => s.replace(/'/g, "''");
const stringLiteral = char === '"' ? '""' : char;
```

## Popular Annotations and Comments

### TODO Comments
- **Optimization notes**: `// TODO: Optimize the generated TASM code by grouping consecutive characters`
- **Feature planning**: `// TODO: Add copy paste`, `// TODO: Add fill`
- **Technical debt**: `// TODO: Split the generation logic into smaller, testable functions`

### Inline Documentation
- **Parameter explanations**: Document complex parameters and their constraints
- **Algorithm descriptions**: Explain multi-step processes like string segment formation
- **Fallback behavior**: Document when and why fallback paths are taken

### Type Annotations
- **Explicit null handling**: `CellContent | null` for optional grid cells
- **DOM element typing**: Specific element types (`HTMLButtonElement`, `HTMLDivElement`)
- **Function signatures**: Complete parameter and return type annotations

## Development Standards

### Module Boundaries
- **Single responsibility**: Each module handles one aspect of functionality
- **Clean interfaces**: Export only necessary functions and types
- **Dependency direction**: UI depends on state, state doesn't depend on UI

### Performance Considerations
- **Batch operations**: Group DOM updates and state saves when possible
- **Event throttling**: Prevent excessive saves during mouse drag operations
- **Memory management**: Clean up event listeners and DOM references appropriately

### Testing Readiness
- **Pure functions**: Separate data transformation from side effects
- **Dependency injection**: Pass dependencies as parameters where possible
- **Predictable state**: State changes through well-defined functions