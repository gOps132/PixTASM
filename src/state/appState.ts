// src/state/appState.ts

import type { CellContent } from '../types';

// --- Internal State Variables (Not Exported) ---
let _gridRows: number = 10;
let _gridCols: number = 10;
let _isErasing: boolean = false;
let _isDrawing: boolean = false;
let _isTextMode: boolean = false;
let _isMouseDown: boolean = false;
let _currentBgIndex: number = 0;
let _currentFgIndex: number = 7;
let _isBlinkEnabled: boolean = false;
let _cellElements: HTMLDivElement[][] = [];
let _gridData: (CellContent | null)[][] = [];
let _activeCell: HTMLDivElement | null = null;

// --- Getters (Exported) ---
// These functions provide read-only access to the state.
export const getGridRows = (): number => _gridRows;
export const getGridCols = (): number => _gridCols;
export const isErasing = (): boolean => _isErasing;
export const isDrawing = (): boolean => _isDrawing;
export const isTextMode = (): boolean => _isTextMode;
export const isMouseDown = (): boolean => _isMouseDown;
export const getCurrentBgIndex = (): number => _currentBgIndex;
export const getCurrentFgIndex = (): number => _currentFgIndex;
export const isBlinkEnabled = (): boolean => _isBlinkEnabled;
export const getCellElements = (): HTMLDivElement[][] => _cellElements;
export const getGridData = (): (CellContent | null)[][] => _gridData;
export const getActiveCell = (): HTMLDivElement | null => _activeCell;

// --- Setters / Mutations (Exported) ---
// These functions are the ONLY way to modify the state.

export function setGridDimensions(rows: number, cols: number): void {
    _gridRows = rows;
    _gridCols = cols;
}

export function setIsMouseDown(value: boolean): void {
    _isMouseDown = value;
}

export function setCurrentBgIndex(index: number): void {
    _currentBgIndex = index;
}

export function setCurrentFgIndex(index: number): void {
    _currentFgIndex = index;
}

export function setIsBlinkEnabled(value: boolean): void {
    _isBlinkEnabled = value;
}

export function setCellElements(elements: HTMLDivElement[][]): void {
    _cellElements = elements;
}

export function setGridData(data: (CellContent | null)[][]): void {
    _gridData = data;
}

export function setActiveCell(cell: HTMLDivElement | null): void {
    _activeCell = cell;
}

/**
 * A higher-level setter to manage mutually exclusive tool states.
 */
export function setToolState(tool: 'draw' | 'erase' | 'text' | 'none'): void {
    _isDrawing = tool === 'draw';
    _isErasing = tool === 'erase';
    _isTextMode = tool === 'text';
}