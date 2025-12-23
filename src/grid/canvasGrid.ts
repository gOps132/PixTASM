/**
 * @file canvasGrid.ts
 * @brief Canvas-based grid rendering system with zoom, pan, and undo/redo functionality
 */

import * as state from '../state/appState';
import { saveGridState, loadGridData } from '../storage/persistence';
import { STORAGE_KEY_UNDO_STACK, STORAGE_KEY_REDO_STACK } from '../storage/constants';
import { decodeCellData, encodeCellData } from '../color';
import { getUnicodeCharFromCP437 } from '../tasm/mappings';
import { MIN_ROWS, MIN_COLS, MAX_ROWS, MAX_COLS } from '../constants';
import type { CellContent } from '../types';

/** Canvas element for grid rendering */
let canvas: HTMLCanvasElement;
/** 2D rendering context */
let ctx: CanvasRenderingContext2D;
/** Base cell width in pixels */
let cellWidth: number = 16;
/** Base cell height in pixels */
let cellHeight: number = 24;
/** Current zoom level multiplier */
let zoomLevel: number = 1;
/** Currently active row for text mode */
let activeRow: number = -1;
/** Currently active column for text mode */
let activeCol: number = -1;
/** Pan offset X coordinate */
let panX: number = 0;
/** Pan offset Y coordinate */
let panY: number = 0;
/** Whether pan mode is enabled */
let isPanning: boolean = false;
/** Last pan X coordinate for drag calculation */
let lastPanX: number = 0;
/** Last pan Y coordinate for drag calculation */
let lastPanY: number = 0;
/** Whether resize mode is active */
let isResizing: boolean = false;
/** Grid rows when resize started */
let resizeStartRows: number = 0;
/** Grid columns when resize started */
let resizeStartCols: number = 0;
/** Current blink animation state */
let blinkState: boolean = true;
/** Blink animation interval ID */
let blinkInterval: number | null = null;

/** Undo history stack */
let undoStack: (CellContent | null)[][][] = [];
/** Redo history stack */
let redoStack: (CellContent | null)[][][] = [];
/** Maximum history entries to keep */
const MAX_HISTORY = 50;
/** Callback to update undo/redo button states */
let updateButtonsCallback: (() => void) | null = null;

/**
 * @brief Sets the callback function for updating undo/redo button states
 * @param callback Function to call when button states need updating
 */
export function setUpdateButtonsCallback(callback: () => void): void {
    updateButtonsCallback = callback;
}

/**
 * @brief Initializes the canvas element and sets up rendering context
 * @param container HTML element to contain the canvas
 * @return The created canvas element
 */
export function initializeCanvas(container: HTMLElement): HTMLCanvasElement {
    canvas = document.createElement('canvas');
    canvas.style.border = '1px solid var(--border)';
    canvas.style.borderRadius = '8px';
    canvas.style.cursor = 'crosshair';
    canvas.style.backgroundColor = 'var(--bg-primary)';
    canvas.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.3)';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    
    ctx = canvas.getContext('2d')!;
    ctx.font = '16px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    container.appendChild(canvas);
    
    resizeCanvasToContainer();
    
    const resizeObserver = new ResizeObserver(() => {
        resizeCanvasToContainer();
        renderGrid();
    });
    resizeObserver.observe(container);
    
    startBlinkAnimation();
    
    return canvas;
}

/**
 * @brief Gets the canvas element
 * @return The canvas element
 */
export function getCanvas(): HTMLCanvasElement {
    return canvas;
}

/**
 * @brief Creates a deep copy of the grid data structure
 * @param grid The grid to copy
 * @return Deep copy of the grid
 */
function deepCopyGrid(grid: (CellContent | null)[][]): (CellContent | null)[][] {
    return grid.map(row => row.map(cell => 
        cell ? { charCode: cell.charCode, attribute: cell.attribute } : null
    ));
}

/**
 * @brief Saves current grid state to undo history
 */
export function saveToHistory(): void {
    const currentGrid = deepCopyGrid(state.getGridData());
    undoStack.push(currentGrid);
    if (undoStack.length > MAX_HISTORY) {
        undoStack.shift();
    }
    redoStack.length = 0;
    saveHistoryToStorage();
    updateButtonsCallback?.();
}

/**
 * @brief Undoes the last action
 */
export function undo(): void {
    if (undoStack.length === 0) return;
    
    const currentGrid = deepCopyGrid(state.getGridData());
    redoStack.push(currentGrid);
    
    const previousGrid = undoStack.pop()!;
    state.setGridData(previousGrid);
    renderGrid();
    saveGridState(state.getGridRows(), state.getGridCols(), previousGrid);
    saveHistoryToStorage();
    updateButtonsCallback?.();
}

/**
 * @brief Redoes the last undone action
 */
export function redo(): void {
    if (redoStack.length === 0) return;
    
    const currentGrid = deepCopyGrid(state.getGridData());
    undoStack.push(currentGrid);
    
    const nextGrid = redoStack.pop()!;
    state.setGridData(nextGrid);
    renderGrid();
    saveGridState(state.getGridRows(), state.getGridCols(), nextGrid);
    saveHistoryToStorage();
    updateButtonsCallback?.();
}

function saveHistoryToStorage(): void {
    try {
        localStorage.setItem(STORAGE_KEY_UNDO_STACK, JSON.stringify(undoStack));
        localStorage.setItem(STORAGE_KEY_REDO_STACK, JSON.stringify(redoStack));
    } catch (error) {
        console.error('Failed to save history to localStorage:', error);
    }
}

export function loadHistoryFromStorage(): void {
    try {
        const undoData = localStorage.getItem(STORAGE_KEY_UNDO_STACK);
        const redoData = localStorage.getItem(STORAGE_KEY_REDO_STACK);
        
        if (undoData) {
            undoStack = JSON.parse(undoData);
        }
        if (redoData) {
            redoStack = JSON.parse(redoData);
        }
    } catch (error) {
        console.error('Failed to load history from localStorage:', error);
        undoStack = [];
        redoStack = [];
    }
}

export function canUndo(): boolean {
    return undoStack.length > 0;
}

export function canRedo(): boolean {
    return redoStack.length > 0;
}

function resizeCanvasToContainer(): void {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    ctx.font = `${Math.max(12, 16 * zoomLevel)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
}

function resizeCanvas(rows: number, cols: number): void {
    resizeCanvasToContainer();
}

function renderCell(row: number, col: number, cellContent: CellContent | null): void {
    const scaledCellWidth = cellWidth * zoomLevel;
    const scaledCellHeight = cellHeight * zoomLevel;
    
    // Center the grid in the canvas
    const gridWidth = state.getGridCols() * scaledCellWidth;
    const gridHeight = state.getGridRows() * scaledCellHeight;
    const centerOffsetX = (canvas.width - gridWidth) / 2;
    const centerOffsetY = (canvas.height - gridHeight) / 2;
    
    const x = col * scaledCellWidth + panX + centerOffsetX;
    const y = row * scaledCellHeight + panY + centerOffsetY;
    
    // Clear cell
    ctx.fillStyle = '#222';
    ctx.fillRect(x, y, scaledCellWidth, scaledCellHeight);
    
    if (cellContent && (cellContent.attribute !== null || cellContent.charCode !== null)) {
        let attribute = cellContent.attribute;
        if (attribute === null && cellContent.charCode !== null) {
            attribute = 0x07; // Default: White on black
        }
        
        if (attribute !== null) {
            const decoded = decodeCellData(attribute);
            
            // Draw background
            ctx.fillStyle = decoded.backgroundColor;
            ctx.fillRect(x, y, scaledCellWidth, scaledCellHeight);
            
            // Draw character if present
            if (cellContent.charCode !== null) {
                // Handle blinking: only show character when blink state is true or not blinking
                if (!decoded.isBlinking || blinkState) {
                    ctx.fillStyle = decoded.foregroundColor;
                    const char = getUnicodeCharFromCP437(cellContent.charCode);
                    ctx.fillText(char, x + scaledCellWidth / 2, y + scaledCellHeight / 2);
                }
            }
        }
    }
    
    // Draw active cell border
    if (row === activeRow && col === activeCol) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = Math.max(1, 2 * zoomLevel);
        ctx.strokeRect(x + 1, y + 1, scaledCellWidth - 2, scaledCellHeight - 2);
    }
    
    // Draw grid lines
    ctx.strokeStyle = '#555';
    ctx.lineWidth = Math.max(0.5, zoomLevel * 0.5);
    ctx.strokeRect(x, y, scaledCellWidth, scaledCellHeight);
}

export function renderGrid(): void {
    const rows = state.getGridRows();
    const cols = state.getGridCols();
    const gridData = state.getGridData();
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Center the grid in the canvas
    const scaledCellWidth = cellWidth * zoomLevel;
    const scaledCellHeight = cellHeight * zoomLevel;
    const gridWidth = cols * scaledCellWidth;
    const gridHeight = rows * scaledCellHeight;
    const centerOffsetX = (canvas.width - gridWidth) / 2;
    const centerOffsetY = (canvas.height - gridHeight) / 2;
    
    // Only render cells that are visible in the viewport
    const startCol = Math.max(0, Math.floor(-(panX + centerOffsetX) / scaledCellWidth));
    const endCol = Math.min(cols, Math.ceil((canvas.width - panX - centerOffsetX) / scaledCellWidth));
    const startRow = Math.max(0, Math.floor(-(panY + centerOffsetY) / scaledCellHeight));
    const endRow = Math.min(rows, Math.ceil((canvas.height - panY - centerOffsetY) / scaledCellHeight));
    
    for (let row = startRow; row < endRow; row++) {
        for (let col = startCol; col < endCol; col++) {
            renderCell(row, col, gridData[row][col]);
        }
    }
    
    // Draw resize handle at bottom-right corner
    const gridRight = centerOffsetX + panX + gridWidth;
    const gridBottom = centerOffsetY + panY + gridHeight;
    const handleSize = 12;
    
    ctx.fillStyle = '#666';
    ctx.fillRect(gridRight - handleSize/2, gridBottom - handleSize/2, handleSize, handleSize);
    
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1;
    ctx.strokeRect(gridRight - handleSize/2, gridBottom - handleSize/2, handleSize, handleSize);
}

export function getCellFromCoordinates(x: number, y: number): { row: number, col: number } | null {
    const rect = canvas.getBoundingClientRect();
    const canvasX = x - rect.left;
    const canvasY = y - rect.top;
    
    // Account for centering offset
    const scaledCellWidth = cellWidth * zoomLevel;
    const scaledCellHeight = cellHeight * zoomLevel;
    const gridWidth = state.getGridCols() * scaledCellWidth;
    const gridHeight = state.getGridRows() * scaledCellHeight;
    const centerOffsetX = (canvas.width - gridWidth) / 2;
    const centerOffsetY = (canvas.height - gridHeight) / 2;
    
    const adjustedX = canvasX - panX - centerOffsetX;
    const adjustedY = canvasY - panY - centerOffsetY;
    
    const col = Math.floor(adjustedX / scaledCellWidth);
    const row = Math.floor(adjustedY / scaledCellHeight);
    
    if (row >= 0 && row < state.getGridRows() && col >= 0 && col < state.getGridCols()) {
        return { row, col };
    }
    return null;
}

export function getResizeHandle(x: number, y: number): 'resize' | null {
    const rect = canvas.getBoundingClientRect();
    const canvasX = x - rect.left;
    const canvasY = y - rect.top;
    
    const scaledCellWidth = cellWidth * zoomLevel;
    const scaledCellHeight = cellHeight * zoomLevel;
    const gridWidth = state.getGridCols() * scaledCellWidth;
    const gridHeight = state.getGridRows() * scaledCellHeight;
    const centerOffsetX = (canvas.width - gridWidth) / 2;
    const centerOffsetY = (canvas.height - gridHeight) / 2;
    
    const gridRight = centerOffsetX + panX + gridWidth;
    const gridBottom = centerOffsetY + panY + gridHeight;
    
    const handleSize = 20;
    
    // Check if mouse is in bottom-right corner resize handle
    if (canvasX >= gridRight - handleSize && canvasX <= gridRight + handleSize &&
        canvasY >= gridBottom - handleSize && canvasY <= gridBottom + handleSize) {
        return 'resize';
    }
    
    return null;
}

export function applyDrawing(row: number, col: number): void {
    const newGridData = state.getGridData();
    let currentCellContent: CellContent = newGridData[row][col] || { charCode: null, attribute: null };
    let hasChanged = false;

    if (state.isErasing()) {
        newGridData[row][col] = null;
        hasChanged = true;
    } else if (state.isBlinkEnabled() && !state.isDrawing() && currentCellContent.attribute !== null) {
        const decoded = decodeCellData(currentCellContent.attribute);
        currentCellContent.attribute = encodeCellData({
            bgIndex: decoded.bgIndex,
            fgIndex: decoded.fgIndex,
            isBlinking: !decoded.isBlinking
        });
        newGridData[row][col] = currentCellContent;
        hasChanged = true;
    } else if (state.isDrawing()) {
        const bgIndex = state.getCurrentBgIndex();
        const fgIndex = state.getCurrentFgIndex();
        
        if (bgIndex !== null || fgIndex !== null) {
            currentCellContent.attribute = encodeCellData({
                bgIndex: bgIndex ?? 0,
                fgIndex: fgIndex ?? 7,
                isBlinking: state.isBlinkEnabled()
            });
            newGridData[row][col] = currentCellContent;
            hasChanged = true;
        }
    }

    if (hasChanged) {
        renderCell(row, col, newGridData[row][col]);
        saveGridState(state.getGridRows(), state.getGridCols(), newGridData);
    }
}

export function focusCell(row: number, col: number): void {
    if (row < 0 || row >= state.getGridRows() || col < 0 || col >= state.getGridCols()) {
        return;
    }
    
    // Clear previous active cell
    if (activeRow >= 0 && activeCol >= 0) {
        renderCell(activeRow, activeCol, state.getGridData()[activeRow][activeCol]);
    }
    
    activeRow = row;
    activeCol = col;
    renderCell(row, col, state.getGridData()[row][col]);
    
    // Focus canvas for keyboard events
    canvas.focus();
}

export function getActiveCell(): { row: number, col: number } | null {
    if (activeRow >= 0 && activeCol >= 0) {
        return { row: activeRow, col: activeCol };
    }
    return null;
}

export function createGrid(rows: number, cols: number): void {
    state.setGridDimensions(rows, cols);
    resizeCanvas(rows, cols);
    
    const savedData = loadGridData();
    const newGridData: (CellContent | null)[][] = [];
    
    for (let i = 0; i < rows; i++) {
        newGridData[i] = [];
        for (let j = 0; j < cols; j++) {
            const loadedCellContent = savedData?.[i]?.[j] ?? null;
            if (loadedCellContent && (loadedCellContent.charCode !== null || loadedCellContent.attribute !== null)) {
                newGridData[i][j] = {
                    charCode: loadedCellContent.charCode,
                    attribute: loadedCellContent.attribute
                };
            } else {
                newGridData[i][j] = null;
            }
        }
    }
    
    state.setGridData(newGridData);
    loadHistoryFromStorage(); // Load undo/redo history
    renderGrid();
    
    saveGridState(rows, cols, newGridData);
}

export function setPanMode(enabled: boolean): void {
    isPanning = enabled;
    canvas.style.cursor = enabled ? 'grab' : 'crosshair';
}

export function startPan(x: number, y: number): void {
    lastPanX = x;
    lastPanY = y;
    canvas.style.cursor = 'grabbing';
}

export function updatePan(x: number, y: number): void {
    if (isPanning) {
        panX += x - lastPanX;
        panY += y - lastPanY;
        lastPanX = x;
        lastPanY = y;
        renderGrid();
    }
}

export function endPan(): void {
    canvas.style.cursor = isPanning ? 'grab' : 'crosshair';
}

export function isPanMode(): boolean {
    return isPanning;
}

export function floodFill(startRow: number, startCol: number): void {
    saveToHistory(); // Save state before flood fill
    
    const gridData = state.getGridData();
    const rows = state.getGridRows();
    const cols = state.getGridCols();
    
    if (startRow < 0 || startRow >= rows || startCol < 0 || startCol >= cols) return;
    
    const targetCell = gridData[startRow][startCol];
    const targetBg = targetCell?.attribute ? decodeCellData(targetCell.attribute).backgroundColor : null;
    const targetFg = targetCell?.attribute ? decodeCellData(targetCell.attribute).foregroundColor : null;
    const targetChar = targetCell?.charCode || null;
    
    const newBgIndex = state.getCurrentBgIndex();
    const newFgIndex = state.getCurrentFgIndex();
    
    if (newBgIndex === null && newFgIndex === null) return;
    
    const bgIndex = newBgIndex !== null ? newBgIndex : 0;
    const fgIndex = newFgIndex !== null ? newFgIndex : 7;
    
    const newAttribute = encodeCellData({
        bgIndex,
        fgIndex,
        isBlinking: state.isBlinkEnabled()
    });
    
    const visited = new Set<string>();
    const stack = [{row: startRow, col: startCol}];
    
    while (stack.length > 0) {
        const {row, col} = stack.pop()!;
        const key = `${row},${col}`;
        
        if (visited.has(key) || row < 0 || row >= rows || col < 0 || col >= cols) continue;
        
        const currentCell = gridData[row][col];
        const currentBg = currentCell?.attribute ? decodeCellData(currentCell.attribute).backgroundColor : null;
        const currentFg = currentCell?.attribute ? decodeCellData(currentCell.attribute).foregroundColor : null;
        const currentChar = currentCell?.charCode || null;
        
        if (currentBg !== targetBg || currentFg !== targetFg || currentChar !== targetChar) continue;
        
        visited.add(key);
        
        if (!gridData[row][col]) gridData[row][col] = { charCode: null, attribute: null };
        gridData[row][col]!.attribute = newAttribute;
        
        stack.push({row: row-1, col}, {row: row+1, col}, {row, col: col-1}, {row, col: col+1});
    }
    
    renderGrid();
    saveGridState(rows, cols, gridData);
}

export function resetPan(): void {
    panX = 0;
    panY = 0;
    renderGrid();
}

export function setZoom(newZoom: number): void {
    zoomLevel = Math.max(0.25, Math.min(4, newZoom));
    resizeCanvas(state.getGridRows(), state.getGridCols());
    renderGrid();
}

export function zoomIn(): void {
    setZoom(zoomLevel * 1.25);
}

export function zoomOut(): void {
    setZoom(zoomLevel / 1.25);
}

export function resetZoom(): void {
    setZoom(1);
}

export function getZoomLevel(): number {
    return zoomLevel;
}

export function startResize(): void {
    isResizing = true;
    resizeStartRows = state.getGridRows();
    resizeStartCols = state.getGridCols();
    canvas.style.cursor = 'nw-resize';
}

export function updateResize(x: number, y: number): void {
    if (!isResizing) return;
    
    const rect = canvas.getBoundingClientRect();
    const canvasX = x - rect.left;
    const canvasY = y - rect.top;
    
    const scaledCellWidth = cellWidth * zoomLevel;
    const scaledCellHeight = cellHeight * zoomLevel;
    const centerOffsetX = (canvas.width - (resizeStartCols * scaledCellWidth)) / 2;
    const centerOffsetY = (canvas.height - (resizeStartRows * scaledCellHeight)) / 2;
    
    const adjustedX = canvasX - panX - centerOffsetX;
    const adjustedY = canvasY - panY - centerOffsetY;
    
    const newCols = Math.max(MIN_COLS, Math.min(MAX_COLS, Math.ceil(adjustedX / scaledCellWidth)));
    const newRows = Math.max(MIN_ROWS, Math.min(MAX_ROWS, Math.ceil(adjustedY / scaledCellHeight)));
    
    if (newRows !== state.getGridRows() || newCols !== state.getGridCols()) {
        resizeGrid(newRows, newCols);
    }
}

export function endResize(): void {
    isResizing = false;
    canvas.style.cursor = isPanning ? 'grab' : 'crosshair';
}

function resizeGrid(newRows: number, newCols: number): void {
    const currentData = state.getGridData();
    const newData: (CellContent | null)[][] = [];
    
    // Copy existing data and expand with nulls
    for (let i = 0; i < newRows; i++) {
        newData[i] = [];
        for (let j = 0; j < newCols; j++) {
            newData[i][j] = currentData[i]?.[j] || null;
        }
    }
    
    state.setGridDimensions(newRows, newCols);
    state.setGridData(newData);
    
    // Update UI inputs
    const rowsInput = document.getElementById('rows-input') as HTMLInputElement;
    const colsInput = document.getElementById('cols-input') as HTMLInputElement;
    if (rowsInput) rowsInput.value = String(newRows);
    if (colsInput) colsInput.value = String(newCols);
    
    renderGrid();
    saveGridState(newRows, newCols, newData);
}

export function isResizeMode(): boolean {
    return isResizing;
}

export function exitTextModeVisuals(): void {
    if (activeRow >= 0 && activeCol >= 0) {
        renderCell(activeRow, activeCol, state.getGridData()[activeRow][activeCol]);
        activeRow = -1;
        activeCol = -1;
    }
}

function startBlinkAnimation(): void {
    if (blinkInterval) {
        clearInterval(blinkInterval);
    }
    blinkInterval = setInterval(() => {
        blinkState = !blinkState;
        renderGrid();
    }, 500); // Blink every 500ms
}