/**
 * @file main.ts
 * @brief Application entry point and initialization
 */

import './style.css';
import { setupUI, initializeDOMElements, gridContainer, bgColorPanel, fgColorPanel } from './ui/dom';
import { createColorPanel } from './ui/colorPalette';
import { createGrid, initializeCanvas } from './grid/canvasGrid';
import { loadGridDimensions } from './storage/persistence';
import { initializeCanvasEventListeners, initializeProjectSystem } from './events/canvasListeners';
import { loadFromURL } from './sharing/share';
import { BACKGROUND_PALETTE, FOREGROUND_PALETTE } from './color';
import * as state from './state/appState';
import { rowsInput, colsInput } from './ui/dom';

/**
 * @brief Initialize the PixTASM application
 */
async function initializeApplication(): Promise<void> {
    setupUI();
    initializeDOMElements();

    const { rows, cols } = loadGridDimensions();
    state.setGridDimensions(rows, cols);
    rowsInput.value = String(rows);
    colsInput.value = String(cols);

    initializeCanvas(gridContainer);
    createGrid(state.getGridRows(), state.getGridCols());

    // Check for shared project in URL
    const loadedFromURL = await loadFromURL();
    
    if (!loadedFromURL) {
        // Only create color panels if no shared project was loaded
        createColorPanel(
            bgColorPanel,
            BACKGROUND_PALETTE,
            state.getCurrentBgIndex(),
            (selectedIndex) => state.setCurrentBgIndex(selectedIndex),
            'bg'
        );

        createColorPanel(
            fgColorPanel,
            FOREGROUND_PALETTE,
            state.getCurrentFgIndex(),
            (selectedIndex) => state.setCurrentFgIndex(selectedIndex),
            'fg'
        );
        
        initializeProjectSystem();
    } else {
        // Recreate color panels for shared project
        createColorPanel(
            bgColorPanel,
            BACKGROUND_PALETTE,
            state.getCurrentBgIndex(),
            (selectedIndex) => state.setCurrentBgIndex(selectedIndex),
            'bg'
        );

        createColorPanel(
            fgColorPanel,
            FOREGROUND_PALETTE,
            state.getCurrentFgIndex(),
            (selectedIndex) => state.setCurrentFgIndex(selectedIndex),
            'fg'
        );
    }

    initializeCanvasEventListeners();
}

initializeApplication();