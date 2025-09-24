// src/grid/grid.ts

import * as state from '../state/appState';
import { saveGridState, loadGridData } from '../storage/persistence';
import { gridContainer } from '../ui/dom';
import { decodeCellData, encodeCellData, BACKGROUND_PALETTE, FOREGROUND_PALETTE } from '../color';
import { getUnicodeCharFromCP437 } from '../mappings';
import type { CellContent } from '../types';
import { STORAGE_KEY_GRID_DATA } from '../storage/constants';

/**
 * Renders a single cell's appearance based on its stored data.
 * This is a "pure" view function; it does not modify the global state.
 */
export function renderCell(cell: HTMLDivElement, cellContent: CellContent | null): void {
    // Reset styles
    cell.style.backgroundColor = '';
    cell.style.color = '';
    cell.style.borderColor = '#555';
    cell.classList.remove('blinking');
    cell.textContent = '';

    if (cellContent !== null && (cellContent.attribute !== null || cellContent.charCode !== null)) {
        let attribute = cellContent.attribute;
        if (attribute === null && cellContent.charCode !== null) {
            attribute = 0x07; // Default: White on black
        }

        if (attribute !== null) {
            const decoded = decodeCellData(attribute);
            cell.style.backgroundColor = decoded.backgroundColor;
            cell.style.color = decoded.foregroundColor;
            cell.classList.toggle('blinking', decoded.isBlinking);
        }

        if (cellContent.charCode !== null) {
            cell.textContent = getUnicodeCharFromCP437(cellContent.charCode);
        } else if (cellContent.attribute !== null) {
            cell.textContent = getUnicodeCharFromCP437(0x20); // Default space for colored blocks
        }
    }
}

/**
 * Updates the data model and re-renders a cell based on the current tool.
 * This function reads the global tool state and updates the grid data.
 */
export function applyDrawing(cell: HTMLDivElement): void {
    const row: number = parseInt(cell.dataset.row!);
    const col: number = parseInt(cell.dataset.col!);
    
    // Get a mutable copy of the grid data
    const newGridData = state.getGridData();
    let currentCellContent: CellContent = newGridData[row][col] || { charCode: null, attribute: null };
    let hasChanged = false;

    if (state.isErasing()) {
        newGridData[row][col] = null;
        hasChanged = true;
    } else if (state.isBlinkEnabled() && !state.isDrawing() && currentCellContent.attribute !== null) {
        // This is for toggling blink on an existing cell
        const decoded = decodeCellData(currentCellContent.attribute);
        currentCellContent.attribute = encodeCellData({
            bgIndex: BACKGROUND_PALETTE.indexOf(decoded.backgroundColor),
            fgIndex: FOREGROUND_PALETTE.indexOf(decoded.foregroundColor),
            isBlinking: !decoded.isBlinking
        });
        newGridData[row][col] = currentCellContent;
        hasChanged = true;
    } else if (state.isDrawing()) {
        currentCellContent.attribute = encodeCellData({
            bgIndex: state.getCurrentBgIndex(),
            fgIndex: state.getCurrentFgIndex(),
            isBlinking: state.isBlinkEnabled()
        });
        newGridData[row][col] = currentCellContent;
        hasChanged = true;
    }

    if (hasChanged) {
        // We don't call setGridData here because mousemove would fire it excessively.
        // The event listener will be responsible for batching saves if necessary.
        // For simplicity now, we save on every application.
        renderCell(cell, newGridData[row][col]);
        saveGridState(state.getGridRows(), state.getGridCols(), newGridData);
    }
}

/**
 * Manages which cell is currently active for text input and keyboard navigation.
 */
export function focusCell(row: number, col: number): void {
    if (row < 0 || row >= state.getGridRows() || col < 0 || col >= state.getGridCols()) {
        return;
    }

    const currentActiveCell = state.getActiveCell();
    if (currentActiveCell) {
        currentActiveCell.classList.remove('active');
        // Re-render the previously active cell to its normal state
        const oldRow = parseInt(currentActiveCell.dataset.row!);
        const oldCol = parseInt(currentActiveCell.dataset.col!);
        renderCell(currentActiveCell, state.getGridData()[oldRow][oldCol]);
    }
    
    const newActiveCell = state.getCellElements()[row][col];
    newActiveCell.classList.add('active');
    renderCell(newActiveCell, state.getGridData()[row][col]); // Render with active styles if any
    newActiveCell.focus();

    // Update the state to reflect the new active cell
    state.setActiveCell(newActiveCell);
}


/**
 * Initializes or re-initializes the entire grid, building the DOM and data structures.
 */
export function createGrid(rows: number, cols: number): void {
    state.setGridDimensions(rows, cols);

    gridContainer.innerHTML = '';
    gridContainer.style.setProperty('--grid-cols', String(cols));
    gridContainer.style.setProperty('--grid-rows', String(rows));

    const savedData = loadGridData(rows, cols);

    const newCellElements: HTMLDivElement[][] = [];
    const newGridData: (CellContent | null)[][] = [];

    for (let i = 0; i < rows; i++) {
        newGridData[i] = [];
        newCellElements[i] = [];
        for (let j = 0; j < cols; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = String(i);
            cell.dataset.col = String(j);
            cell.tabIndex = 0;

            gridContainer.appendChild(cell);
            newCellElements[i][j] = cell;

            const loadedCellContent = savedData?.[i]?.[j] ?? null;
            if (loadedCellContent && (loadedCellContent.charCode !== null || loadedCellContent.attribute !== null)) {
                 newGridData[i][j] = {
                    charCode: loadedCellContent.charCode,
                    attribute: loadedCellContent.attribute
                };
            } else {
                newGridData[i][j] = null;
            }
           
            renderCell(cell, newGridData[i][j]);
        }
    }
    
    // Set the state once after the new grid is fully constructed
    state.setCellElements(newCellElements);
    state.setGridData(newGridData);
    
    console.log(`Grid created with ${rows} rows and ${cols} columns.`);
    saveGridState(rows, cols, newGridData);
}