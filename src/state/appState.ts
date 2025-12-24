// src/state/appState.ts

import type { CellContent } from '../types';

// --- Internal State Variables (Not Exported) ---
let _gridRows: number = 10;
let _gridCols: number = 10;
let _isErasing: boolean = false;
let _isDrawing: boolean = false;
let _isTextMode: boolean = false;
let _isFilling: boolean = false;
let _isSelecting: boolean = false;
let _isMouseDown: boolean = false;
let _selectionStart: { row: number; col: number } | null = null;
let _selectionEnd: { row: number; col: number } | null = null;
let _currentBgIndex: number | null = 0;
let _currentFgIndex: number | null = 7;
let _isBlinkEnabled: boolean = false;
let _gridData: (CellContent | null)[][] = [];
let _currentProjectName: string = 'Untitled Project';
let _savedProjectState: {
    name: string;
    rows: number;
    cols: number;
    gridData: (CellContent | null)[][];
} | null = null;

// --- Getters (Exported) ---
// These functions provide read-only access to the state.
export const getGridRows = (): number => _gridRows;
export const getGridCols = (): number => _gridCols;
export const isErasing = (): boolean => _isErasing;
export const isDrawing = (): boolean => _isDrawing;
export const isTextMode = (): boolean => _isTextMode;
export const isFilling = (): boolean => _isFilling;
export const isSelecting = (): boolean => _isSelecting;
export const isMouseDown = (): boolean => _isMouseDown;
export const getSelectionStart = (): { row: number; col: number } | null => _selectionStart;
export const getSelectionEnd = (): { row: number; col: number } | null => _selectionEnd;
export const getCurrentBgIndex = (): number | null => _currentBgIndex;
export const getCurrentFgIndex = (): number | null => _currentFgIndex;
export const isBlinkEnabled = (): boolean => _isBlinkEnabled;
export const getGridData = (): (CellContent | null)[][] => _gridData;
export const getCurrentProjectName = (): string => _currentProjectName;
export const hasUnsavedChanges = (): boolean => {
    if (!_savedProjectState) return true;
    
    // Compare current state with saved state
    if (_currentProjectName !== _savedProjectState.name ||
        _gridRows !== _savedProjectState.rows ||
        _gridCols !== _savedProjectState.cols) {
        return true;
    }
    
    // Deep compare grid data
    for (let i = 0; i < _gridRows; i++) {
        for (let j = 0; j < _gridCols; j++) {
            const current = _gridData[i]?.[j];
            const saved = _savedProjectState.gridData[i]?.[j];
            
            if (current?.charCode !== saved?.charCode ||
                current?.attribute !== saved?.attribute) {
                return true;
            }
        }
    }
    
    return false;
};

// --- Setters / Mutations (Exported) ---
// These functions are the ONLY way to modify the state.

export function setGridDimensions(rows: number, cols: number): void {
    _gridRows = rows;
    _gridCols = cols;
}

export function setIsMouseDown(value: boolean): void {
    _isMouseDown = value;
}

export function setCurrentBgIndex(index: number | null): void {
    _currentBgIndex = index;
}

export function setCurrentFgIndex(index: number | null): void {
    _currentFgIndex = index;
}

export function setIsBlinkEnabled(value: boolean): void {
    _isBlinkEnabled = value;
}

export function setGridData(data: (CellContent | null)[][]): void {
    _gridData = data;
}

export function setCurrentProjectName(name: string): void {
    _currentProjectName = name;
    updateProjectNameDisplay();
}

export function markAsSaved(): void {
    _savedProjectState = {
        name: _currentProjectName,
        rows: _gridRows,
        cols: _gridCols,
        gridData: _gridData.map(row => row.map(cell => 
            cell ? { charCode: cell.charCode, attribute: cell.attribute } : null
        ))
    };
}

function updateProjectNameDisplay(): void {
    const titleElement = document.querySelector('.logo');
    if (titleElement) {
        titleElement.textContent = `PixTASM - ${_currentProjectName}`;
    }
}

/**
 * A higher-level setter to manage mutually exclusive tool states.
 */
export function setToolState(tool: 'draw' | 'erase' | 'text' | 'fill' | 'select' | 'none'): void {
    _isDrawing = tool === 'draw';
    _isErasing = tool === 'erase';
    _isTextMode = tool === 'text';
    _isFilling = tool === 'fill';
    _isSelecting = tool === 'select';
}

export function setSelection(start: { row: number; col: number } | null, end: { row: number; col: number } | null): void {
    _selectionStart = start;
    _selectionEnd = end;
}

export function hasSelection(): boolean {
    return _selectionStart !== null && _selectionEnd !== null;
}