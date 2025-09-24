// src/storage/persistence.ts
import { STORAGE_KEY_GRID_DATA, STORAGE_KEY_GRID_ROWS, STORAGE_KEY_GRID_COLS } from './constants';

import type { CellContent } from '../types';

export function saveGridState(rows: number, cols: number, data: (CellContent | null)[][]): void {
    try {
        localStorage.setItem(STORAGE_KEY_GRID_ROWS, String(rows));
        localStorage.setItem(STORAGE_KEY_GRID_COLS, String(cols));
        localStorage.setItem(STORAGE_KEY_GRID_DATA, JSON.stringify(data));
    } catch (error) {
        console.error('Failed to save grid state to localStorage:', error);
    }
}

export function loadGridDimensions(): { rows: number, cols: number } {
    const savedRows = localStorage.getItem(STORAGE_KEY_GRID_ROWS);
    const savedCols = localStorage.getItem(STORAGE_KEY_GRID_COLS);

    const rows = savedRows ? parseInt(savedRows, 10) : 10;
    const cols = savedCols ? parseInt(savedCols, 10) : 10;

    return { rows, cols };
}

export function loadGridData(rows: number, cols: number): (CellContent | null)[][] | null {
    const savedDataJSON = localStorage.getItem(STORAGE_KEY_GRID_DATA);
    if (!savedDataJSON) return null;

    try {
        const savedData = JSON.parse(savedDataJSON);
        if (savedData?.length === rows && savedData[0]?.length === cols) {
            return savedData;
        }
        // Data dimensions mismatch, discard it
        localStorage.removeItem(STORAGE_KEY_GRID_DATA);
        return null;
    } catch (e) {
        console.error("Failed to parse saved grid data.", e);
        return null;
    }
}