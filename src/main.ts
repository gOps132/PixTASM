// src/main.ts

import './style.css';
import { app, setupUI, initializeDOMElements, gridContainer, bgColorPanel, fgColorPanel } from './ui/dom';
import { createColorPanel } from './ui/colorPalette';
import { createGrid } from './grid/grid';
import { loadGridDimensions } from './storage/persistence';
import { initializeEventListeners } from './events/listeners';
import { BACKGROUND_PALETTE, FOREGROUND_PALETTE } from './color';
import * as state from './state/appState';
import { rowsInput, colsInput } from './ui/dom'; // Import input elements

// 1. Create the HTML structure
setupUI();

// 2. NOW that the HTML exists, find and assign the element variables
initializeDOMElements();

// 3. Load initial state and update UI inputs
const { rows, cols } = loadGridDimensions();
state.setGridDimensions(rows, cols);
rowsInput.value = String(rows);
colsInput.value = String(cols);

// 4. Create the grid based on the initial state
createGrid(state.getGridRows(), state.getGridCols());
app.appendChild(gridContainer);

// 5. Create UI components like color palettes
createColorPanel(
    bgColorPanel, // This variable is now correctly assigned and not null
    BACKGROUND_PALETTE,
    state.getCurrentBgIndex(),
    (selectedIndex) => state.setCurrentBgIndex(selectedIndex)
);

createColorPanel(
    fgColorPanel, // This variable is also correct now
    FOREGROUND_PALETTE,
    state.getCurrentFgIndex(),
    (selectedIndex) => state.setCurrentFgIndex(selectedIndex)
);

// 6. Attach all event listeners to make the app interactive
initializeEventListeners();

console.log('Application initialized.');