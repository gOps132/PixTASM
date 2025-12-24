/**
 * @file copyPaste.ts
 * @brief ASCII art copy and paste functionality
 */

import * as state from '../state/appState';
import { renderGrid, saveToHistory } from '../grid/canvasGrid';
import { saveGridState } from '../storage/persistence';
import { encodeCellData } from '../color';
import type { CellContent } from '../types';

/**
 * @brief Cuts selected area to clipboard and clears it from grid
 */
export async function cutSelection(): Promise<void> {
    if (!state.hasSelection()) {
        alert('No selection to cut');
        return;
    }
    
    // Copy first
    await copyASCII();
    
    // Then clear the selection
    const gridData = state.getGridData();
    const selStart = state.getSelectionStart()!;
    const selEnd = state.getSelectionEnd()!;
    
    const minRow = Math.min(selStart.row, selEnd.row);
    const maxRow = Math.max(selStart.row, selEnd.row);
    const minCol = Math.min(selStart.col, selEnd.col);
    const maxCol = Math.max(selStart.col, selEnd.col);
    
    saveToHistory();
    
    for (let row = minRow; row <= maxRow; row++) {
        for (let col = minCol; col <= maxCol; col++) {
            gridData[row][col] = null;
        }
    }
    
    state.setGridData(gridData);
    renderGrid();
    saveGridState(state.getGridRows(), state.getGridCols(), gridData);
}

/**
 * @brief Copies selected area or entire grid as ASCII art to clipboard
 */
export async function copyASCII(): Promise<void> {
    const gridData = state.getGridData();
    let startRow = 0, endRow = state.getGridRows() - 1;
    let startCol = 0, endCol = state.getGridCols() - 1;
    
    // If there's a selection, use it
    if (state.hasSelection()) {
        const selStart = state.getSelectionStart()!;
        const selEnd = state.getSelectionEnd()!;
        startRow = Math.min(selStart.row, selEnd.row);
        endRow = Math.max(selStart.row, selEnd.row);
        startCol = Math.min(selStart.col, selEnd.col);
        endCol = Math.max(selStart.col, selEnd.col);
    }
    
    let asciiText = '';
    
    for (let row = startRow; row <= endRow; row++) {
        let line = '';
        for (let col = startCol; col <= endCol; col++) {
            const cell = gridData[row][col];
            if (cell && cell.charCode !== null) {
                line += String.fromCharCode(cell.charCode);
            } else {
                line += ' ';
            }
        }
        line = line.trimEnd();
        asciiText += line + '\n';
    }
    
    asciiText = asciiText.trimEnd();
    
    try {
        await navigator.clipboard.writeText(asciiText);
        // alert('ASCII art copied to clipboard!');
    } catch (error) {
        console.error('Failed to copy ASCII art:', error);
        alert('Failed to copy ASCII art to clipboard');
    }
}

/**
 * @brief Pastes ASCII art from clipboard at selection or active cell
 */
export async function pasteASCII(): Promise<void> {
    try {
        const text = await navigator.clipboard.readText();
        if (!text.trim()) {
            alert('Clipboard is empty');
            return;
        }
        
        const lines = text.split('\n');
        let startRow = 0, startCol = 0;
        let maxRows = state.getGridRows();
        let maxCols = state.getGridCols();
        
        // Determine paste position and bounds
        if (state.hasSelection()) {
            const selStart = state.getSelectionStart()!;
            const selEnd = state.getSelectionEnd()!;
            startRow = Math.min(selStart.row, selEnd.row);
            startCol = Math.min(selStart.col, selEnd.col);
            
            // If multi-cell selection, constrain to selection bounds
            if (selStart.row !== selEnd.row || selStart.col !== selEnd.col) {
                maxRows = Math.max(selStart.row, selEnd.row) + 1;
                maxCols = Math.max(selStart.col, selEnd.col) + 1;
            }
        } else {
            // Check if there's an active cell from text mode
            const { getActiveCell } = await import('../grid/canvasGrid');
            const activeCell = getActiveCell();
            if (activeCell) {
                startRow = activeCell.row;
                startCol = activeCell.col;
            }
        }
        
        // Save current state for undo
        saveToHistory();
        
        const gridData = state.getGridData();
        
        // Paste ASCII art within bounds
        for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
            const line = lines[lineIdx];
            const targetRow = startRow + lineIdx;
            
            if (targetRow >= maxRows) break;
            
            for (let charIdx = 0; charIdx < line.length; charIdx++) {
                const targetCol = startCol + charIdx;
                
                if (targetCol >= maxCols) break;
                
                const char = line[charIdx];
                const charCode = char.charCodeAt(0);
                
                if (charCode >= 0 && charCode <= 255) {
                    const attribute = encodeCellData({
                        bgIndex: state.getCurrentBgIndex() || 0,
                        fgIndex: state.getCurrentFgIndex() || 7,
                        isBlinking: false
                    });
                    
                    gridData[targetRow][targetCol] = {
                        charCode: charCode,
                        attribute: attribute
                    };
                }
            }
        }
        
        state.setGridData(gridData);
        renderGrid();
        saveGridState(maxRows, maxCols, gridData);
    } catch (error) {
        console.error('Failed to paste ASCII art:', error);
        alert('Failed to read from clipboard');
    }
}