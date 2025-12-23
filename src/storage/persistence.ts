// src/storage/persistence.ts
import { STORAGE_KEY_AUTOSAVE_DATA, STORAGE_KEY_AUTOSAVE_ROWS, STORAGE_KEY_AUTOSAVE_COLS } from './constants';

import type { CellContent } from '../types';

// Autosave functions - separate from project saves
export function saveAutosaveState(rows: number, cols: number, data: (CellContent | null)[][]): void {
    try {
        localStorage.setItem(STORAGE_KEY_AUTOSAVE_ROWS, String(rows));
        localStorage.setItem(STORAGE_KEY_AUTOSAVE_COLS, String(cols));
        localStorage.setItem(STORAGE_KEY_AUTOSAVE_DATA, JSON.stringify(data));
    } catch (error) {
        console.error('Failed to save autosave state to localStorage:', error);
    }
}

export function loadAutosaveDimensions(): { rows: number, cols: number } {
    const savedRows = localStorage.getItem(STORAGE_KEY_AUTOSAVE_ROWS);
    const savedCols = localStorage.getItem(STORAGE_KEY_AUTOSAVE_COLS);

    const rows = savedRows ? parseInt(savedRows, 10) : 10;
    const cols = savedCols ? parseInt(savedCols, 10) : 10;

    return { rows, cols };
}

export function loadAutosaveData(): (CellContent | null)[][] | null {
    const savedDataJSON = localStorage.getItem(STORAGE_KEY_AUTOSAVE_DATA);
    if (!savedDataJSON) return null;

    try {
        return JSON.parse(savedDataJSON);
    } catch (e) {
        console.error("Failed to parse autosave data.", e);
        return null;
    }
}

// Legacy functions for backward compatibility - now just aliases
export function saveGridState(rows: number, cols: number, data: (CellContent | null)[][]): void {
    saveAutosaveState(rows, cols, data);
}

export function loadGridDimensions(): { rows: number, cols: number } {
    return loadAutosaveDimensions();
}

export function loadGridData(): (CellContent | null)[][] | null {
    return loadAutosaveData();
}