// src/storage/saveLoad.ts

import * as state from '../state/appState';
import type { CellContent } from '../types';

interface SaveData {
    name: string;
    timestamp: number;
    rows: number;
    cols: number;
    gridData: (CellContent | null)[][];
}

const SAVES_KEY = 'pixtasm_saves';

export function getSavesList(): SaveData[] {
    try {
        const saves = localStorage.getItem(SAVES_KEY);
        return saves ? JSON.parse(saves) : [];
    } catch (error) {
        console.error('Failed to load saves list:', error);
        return [];
    }
}

export function saveProject(name: string): void {
    const saves = getSavesList();
    const saveData: SaveData = {
        name,
        timestamp: Date.now(),
        rows: state.getGridRows(),
        cols: state.getGridCols(),
        gridData: state.getGridData()
    };
    
    // Remove existing save with same name
    const existingIndex = saves.findIndex(save => save.name === name);
    if (existingIndex >= 0) {
        saves[existingIndex] = saveData;
    } else {
        saves.push(saveData);
    }
    
    // Sort by timestamp (newest first)
    saves.sort((a, b) => b.timestamp - a.timestamp);
    
    try {
        localStorage.setItem(SAVES_KEY, JSON.stringify(saves));
    } catch (error) {
        console.error('Failed to save project:', error);
        throw new Error('Failed to save project');
    }
}

export function loadProject(name: string): SaveData | null {
    const saves = getSavesList();
    return saves.find(save => save.name === name) || null;
}

export function deleteProject(name: string): void {
    const saves = getSavesList();
    const filtered = saves.filter(save => save.name !== name);
    
    try {
        localStorage.setItem(SAVES_KEY, JSON.stringify(filtered));
    } catch (error) {
        console.error('Failed to delete project:', error);
        throw new Error('Failed to delete project');
    }
}