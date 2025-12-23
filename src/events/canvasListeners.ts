// src/events/canvasListeners.ts

import * as dom from '../ui/dom';
import * as state from '../state/appState';
import { createGrid, applyDrawing, focusCell, getCellFromCoordinates, getActiveCell, exitTextModeVisuals, getCanvas, renderGrid, zoomIn, zoomOut, resetZoom, getZoomLevel, setPanMode, startPan, updatePan, endPan, isPanMode, resetPan, floodFill, undo, redo, canUndo, canRedo, loadHistoryFromStorage, setUpdateButtonsCallback, saveToHistory, getResizeHandle, startResize, updateResize, endResize, isResizeMode } from '../grid/canvasGrid';
import { saveGridState } from '../storage/persistence';
import { MIN_ROWS, MIN_COLS, MAX_ROWS, MAX_COLS } from '../constants';
import { STORAGE_KEY_AUTOSAVE_ROWS, STORAGE_KEY_AUTOSAVE_COLS } from '../storage/constants';
import { generateTASMCode } from '../tasm/generator';
import { generateSpriteDB } from '../tasm/spritedb_generator';
import { encodeCellData, decodeCellData } from '../color';
import { runTASMCode, stopDosEmulator, preloadDosEmulator } from '../emulator/dosEmulator';
import { getSavesList, saveProject, deleteProject } from '../storage/saveLoad';
import { copyShareURL, loadFromURL } from '../sharing/share';
import type { CellContent } from '../types';

export function initializeCanvasEventListeners(): void {
    const canvas = getCanvas();
    
    // Tool button listeners (same as before)
    // Auto-resize on input change
    const handleGridResize = () => {
        const newRows = parseInt(dom.rowsInput.value, 10);
        const newCols = parseInt(dom.colsInput.value, 10);

        if (isNaN(newRows) || isNaN(newCols) || newRows < MIN_ROWS || newCols < MIN_COLS || newCols > MAX_COLS || newRows > MAX_ROWS) {
            return; // Invalid values, don't resize
        }

        // Use resizeGrid function instead of createGrid to preserve data
        const currentData = state.getGridData();
        const newData: (CellContent | null)[][] = [];
        
        for (let i = 0; i < newRows; i++) {
            newData[i] = [];
            for (let j = 0; j < newCols; j++) {
                newData[i][j] = currentData[i]?.[j] || null;
            }
        }
        
        state.setGridDimensions(newRows, newCols);
        state.setGridData(newData);
        localStorage.setItem(STORAGE_KEY_AUTOSAVE_ROWS, String(newRows));
        localStorage.setItem(STORAGE_KEY_AUTOSAVE_COLS, String(newCols));
        
        renderGrid();
        saveGridState(newRows, newCols, newData);
    };

    dom.rowsInput.addEventListener('input', handleGridResize);
    dom.colsInput.addEventListener('input', handleGridResize);

    dom.drawBtn.addEventListener('click', () => {
        if (state.isDrawing()) {
            state.setToolState('none');
            dom.drawBtn.classList.remove('active');
        } else {
            state.setToolState('draw');
            dom.drawBtn.classList.add('active');
            dom.eraseBtn.classList.remove('active');
            dom.textBtn.classList.remove('active');
            exitTextModeVisuals();
        }
    });

    dom.eraseBtn.addEventListener('click', () => {
        if (state.isErasing()) {
            state.setToolState('none');
            dom.eraseBtn.classList.remove('active');
        } else {
            state.setToolState('erase');
            dom.eraseBtn.classList.add('active');
            dom.drawBtn.classList.remove('active');
            dom.textBtn.classList.remove('active');
            exitTextModeVisuals();
        }
    });

    dom.textBtn.addEventListener('click', () => {
        if (state.isTextMode()) {
            state.setToolState('none');
            dom.textBtn.classList.remove('active');
            exitTextModeVisuals();
        } else {
            state.setToolState('text');
            dom.textBtn.classList.add('active');
            dom.drawBtn.classList.remove('active');
            dom.eraseBtn.classList.remove('active');
            
            // Focus top-left cell by default
            focusCell(0, 0);
        }
    });

    dom.blinkBtn.addEventListener('click', () => {
        state.setIsBlinkEnabled(!state.isBlinkEnabled());
        dom.blinkBtn.classList.toggle('active');
    });

    dom.fillBtn.addEventListener('click', () => {
        if (state.isFilling()) {
            state.setToolState('none');
            dom.fillBtn.classList.remove('active');
        } else {
            state.setToolState('fill');
            dom.fillBtn.classList.add('active');
            dom.drawBtn.classList.remove('active');
            dom.eraseBtn.classList.remove('active');
            dom.textBtn.classList.remove('active');
            dom.panBtn.classList.remove('active');
            setPanMode(false);
            exitTextModeVisuals();
        }
    });

    dom.renderBtn.addEventListener('click', () => {
        const tasmCode = generateTASMCode(state.getGridData());
        navigator.clipboard.writeText(tasmCode).then(() => {
            alert('TASM code copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy TASM code:', err);
            alert('Failed to copy TASM code. Check console for details.');
        });
    });

    dom.exportDbBtn.addEventListener('click', () => {
        const dbText = generateSpriteDB(state.getGridData(), 'SPRITE');
        navigator.clipboard.writeText(dbText).then(() => {
            alert('DB sprite copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy DB sprite:', err);
            alert('Failed to copy DB sprite. Check console for details.');
        });
    });

    // Play button - Run TASM code in DOS emulator
    dom.playBtn.addEventListener('click', async () => {
        const tasmCode = generateTASMCode(state.getGridData());
        try {
            await runTASMCode(tasmCode);
        } catch (error) {
            console.error('Failed to run TASM code:', error);
            alert('Failed to start DOS emulator');
        }
    });

    // Stop DOS emulator
    dom.stopDosBtn.addEventListener('click', () => {
        stopDosEmulator();
    });

    // Zoom controls
    dom.zoomInBtn.addEventListener('click', () => {
        zoomIn();
        dom.zoomLevel.textContent = `${Math.round(getZoomLevel() * 100)}%`;
    });

    dom.zoomOutBtn.addEventListener('click', () => {
        zoomOut();
        dom.zoomLevel.textContent = `${Math.round(getZoomLevel() * 100)}%`;
    });

    dom.zoomResetBtn.addEventListener('click', () => {
        resetZoom();
        dom.zoomLevel.textContent = '100%';
    });

    // Pan controls
    dom.panBtn.addEventListener('click', () => {
        const panMode = !isPanMode();
        setPanMode(panMode);
        dom.panBtn.classList.toggle('active', panMode);
        
        // Deactivate other tools
        if (panMode) {
            state.setToolState('none');
            dom.drawBtn.classList.remove('active');
            dom.eraseBtn.classList.remove('active');
            dom.textBtn.classList.remove('active');
            exitTextModeVisuals();
        }
    });

    dom.panResetBtn.addEventListener('click', () => {
        resetPan();
    });

    dom.clearBtn.addEventListener('click', () => {
        if (confirm('Clear all artwork? This cannot be undone.')) {
            saveToHistory(); // Save current state for undo
            const rows = state.getGridRows();
            const cols = state.getGridCols();
            const emptyData: (CellContent | null)[][] = [];
            
            for (let i = 0; i < rows; i++) {
                emptyData[i] = [];
                for (let j = 0; j < cols; j++) {
                    emptyData[i][j] = null;
                }
            }
            
            state.setGridData(emptyData);
            renderGrid();
            saveGridState(rows, cols, emptyData);
        }
    });

    // Save/Load controls
    dom.newBtn.addEventListener('click', () => {
        // Check for unsaved changes before creating new project
        if (state.hasUnsavedChanges()) {
            const save = confirm(`You have unsaved changes in "${state.getCurrentProjectName()}". Save before creating a new project?`);
            if (save) {
                // Try to save current project first
                const currentProject = state.getCurrentProjectName();
                if (currentProject !== 'Untitled Project') {
                    try {
                        saveProject(currentProject);
                        state.markAsSaved();
                    } catch (error) {
                        alert('Failed to save current project');
                        return;
                    }
                } else {
                    const saveName = prompt('Enter name for current project:');
                    if (saveName && saveName.trim()) {
                        try {
                            saveProject(saveName.trim());
                            state.markAsSaved();
                        } catch (error) {
                            alert('Failed to save current project');
                            return;
                        }
                    } else {
                        return; // User cancelled save
                    }
                }
            }
        }
        
        const name = prompt('Enter new project name:');
        if (name && name.trim()) {
            // Clear grid and create empty project
            const rows = 10;
            const cols = 10;
            const emptyData: (CellContent | null)[][] = [];
            
            for (let i = 0; i < rows; i++) {
                emptyData[i] = [];
                for (let j = 0; j < cols; j++) {
                    emptyData[i][j] = null;
                }
            }
            
            state.setGridDimensions(rows, cols);
            state.setGridData(emptyData);
            state.setCurrentProjectName(name.trim());
            dom.rowsInput.value = '10';
            dom.colsInput.value = '10';
            renderGrid();
            alert('New project created!');
        }
    });

    dom.saveBtn.addEventListener('click', () => {
        const currentProject = state.getCurrentProjectName();
        
        // If it's "Untitled Project", treat as new project
        if (currentProject === 'Untitled Project') {
            const name = prompt('Enter project name:');
            if (name && name.trim()) {
                state.setCurrentProjectName(name.trim());
                try {
                    saveProject(name.trim());
                    state.markAsSaved();
                    alert('Project saved successfully!');
                } catch (error) {
                    alert('Failed to save project');
                }
            }
        } else {
            // Confirm save to existing project
            if (confirm(`Save project "${currentProject}"?`)) {
                try {
                    saveProject(currentProject);
                    state.markAsSaved();
                    alert('Project saved successfully!');
                } catch (error) {
                    alert('Failed to save project');
                }
            }
        }
    });

    dom.deleteBtn.addEventListener('click', () => {
        const currentProject = state.getCurrentProjectName();
        
        if (currentProject === 'Untitled Project') {
            alert('No project to delete');
            return;
        }
        
        if (confirm(`Delete project "${currentProject}"? This cannot be undone.`)) {
            try {
                deleteProject(currentProject);
                state.setCurrentProjectName('Untitled Project');
                // Clear current grid
                const rows = 10;
                const cols = 10;
                state.setGridDimensions(rows, cols);
                dom.rowsInput.value = '10';
                dom.colsInput.value = '10';
                createGrid(rows, cols);
                alert('Project deleted successfully!');
            } catch (error) {
                alert('Failed to delete project');
            }
        }
    });

    dom.loadBtn.addEventListener('click', () => {
        // Check for unsaved changes before loading
        if (state.hasUnsavedChanges()) {
            const save = confirm(`You have unsaved changes in "${state.getCurrentProjectName()}". Save before loading another project?`);
            if (save) {
                // Try to save current project first
                const currentProject = state.getCurrentProjectName();
                if (currentProject !== 'Untitled Project') {
                    try {
                        saveProject(currentProject);
                        state.markAsSaved();
                    } catch (error) {
                        alert('Failed to save current project');
                        return;
                    }
                } else {
                    const name = prompt('Enter name for current project:');
                    if (name && name.trim()) {
                        try {
                            saveProject(name.trim());
                            state.markAsSaved();
                        } catch (error) {
                            alert('Failed to save current project');
                            return;
                        }
                    } else {
                        return; // User cancelled save
                    }
                }
            }
        }
        
        const saves = getSavesList();
        if (saves.length === 0) {
            alert('No saves found');
            return;
        }
        
        const options = saves.map((save, index) => `${index + 1}. ${save.name} (${new Date(save.timestamp).toLocaleString()})`);
        const message = 'Select a save to load:\n\n' + options.join('\n') + '\n\nEnter the number (1-' + saves.length + '):';
        const choice = prompt(message);
        
        if (choice) {
            const index = parseInt(choice) - 1;
            if (index >= 0 && index < saves.length) {
                const saveData = saves[index];
                state.setGridDimensions(saveData.rows, saveData.cols);
                state.setGridData(saveData.gridData);
                
                // Update UI inputs
                dom.rowsInput.value = String(saveData.rows);
                dom.colsInput.value = String(saveData.cols);
                
                state.setCurrentProjectName(saveData.name);
                renderGrid();
                alert('Project loaded successfully!');
            } else {
                alert('Invalid selection');
            }
        }
    });

    dom.shareBtn.addEventListener('click', async () => {
        await copyShareURL();
    });

    // Undo/Redo controls
    dom.undoBtn.addEventListener('click', () => {
        undo();
    });

    dom.redoBtn.addEventListener('click', () => {
        redo();
    });

    function updateUndoRedoButtons() {
        dom.undoBtn.disabled = !canUndo();
        dom.redoBtn.disabled = !canRedo();
    }

    // Set up callback for button updates
    setUpdateButtonsCallback(updateUndoRedoButtons);

    // Load history and update button states
    loadHistoryFromStorage();
    setTimeout(updateUndoRedoButtons, 0);
    
    // Preload DOS emulator in background
    preloadDosEmulator();

    // Sidebar toggle
    dom.toggleSidebarBtn.addEventListener('click', () => {
        const sidebar = document.getElementById('sidebar')!;
        const mainContent = document.querySelector('.main-content')!;
        sidebar.classList.toggle('collapsed');
        mainContent.classList.toggle('sidebar-collapsed');
    });

    // Canvas mouse events
    canvas.addEventListener('mousedown', (e) => {
        e.preventDefault();
        
        // Check for resize handle first
        const resizeHandle = getResizeHandle(e.clientX, e.clientY);
        if (resizeHandle === 'resize') {
            startResize();
            state.setIsMouseDown(true);
            return;
        }
        
        if (isPanMode()) {
            startPan(e.clientX, e.clientY);
            state.setIsMouseDown(true);
            return;
        }
        
        const cell = getCellFromCoordinates(e.clientX, e.clientY);
        if (!cell) return;

        state.setIsMouseDown(true);

        if (state.isTextMode()) {
            focusCell(cell.row, cell.col);
            state.setIsMouseDown(false);
            return;
        }

        if (state.isDrawing() || state.isErasing() || state.isFilling() || (state.isBlinkEnabled() && !state.isDrawing())) {
            // Save history at start of drag operation
            saveToHistory();
            
            if (state.isFilling()) {
                floodFill(cell.row, cell.col);
            } else {
                applyDrawing(cell.row, cell.col);
            }
        }
    });

    // Mouse wheel zoom
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (e.deltaY < 0) {
            zoomIn();
        } else {
            zoomOut();
        }
        dom.zoomLevel.textContent = `${Math.round(getZoomLevel() * 100)}%`;
    });

    canvas.addEventListener('mousemove', (e) => {
        // Update cursor based on position
        const resizeHandle = getResizeHandle(e.clientX, e.clientY);
        if (resizeHandle === 'resize' && !state.isMouseDown()) {
            canvas.style.cursor = 'nw-resize';
        } else if (!state.isMouseDown() && !isPanMode() && !isResizeMode()) {
            canvas.style.cursor = 'crosshair';
        }
        
        if (!state.isMouseDown()) return;
        
        if (isResizeMode()) {
            updateResize(e.clientX, e.clientY);
            return;
        }
        
        if (isPanMode()) {
            updatePan(e.clientX, e.clientY);
            return;
        }

        const cell = getCellFromCoordinates(e.clientX, e.clientY);
        if (!cell) return;
        
        e.preventDefault();

        if (state.isDrawing() || state.isErasing() || (state.isBlinkEnabled() && !state.isDrawing())) {
            applyDrawing(cell.row, cell.col);
        }
    });

    window.addEventListener('mouseup', () => {
        if (isResizeMode()) {
            endResize();
        } else if (isPanMode()) {
            endPan();
        }
        state.setIsMouseDown(false);
    });

    // Canvas keyboard events
    canvas.addEventListener('keydown', (e) => {
        const activeCell = getActiveCell();
        if (!state.isTextMode() || !activeCell) return;

        e.preventDefault();

        const { row: currentRow, col: currentCol } = activeCell;
        let nextRow = currentRow;
        let nextCol = currentCol;
        let charTyped = false;
        
        const gridData = state.getGridData();

        switch (e.key) {
            case 'Backspace': {
                let cellContent = gridData[currentRow][currentCol];
                if (cellContent) {
                    cellContent.charCode = null;
                    if (cellContent.attribute === null) gridData[currentRow][currentCol] = null;
                }
                renderGrid();
                nextCol--;
                break;
            }
            case 'Delete': {
                let cellContent = gridData[currentRow][currentCol];
                if (cellContent) {
                    cellContent.charCode = null;
                    if (cellContent.attribute === null) gridData[currentRow][currentCol] = null;
                }
                renderGrid();
                break;
            }
            case 'ArrowLeft': nextCol--; break;
            case 'ArrowRight': nextCol++; break;
            case 'ArrowUp': nextRow--; break;
            case 'ArrowDown': nextRow++; break;
            case 'Enter': nextRow++; nextCol = 0; break;
            case 'Home': nextCol = 0; break;
            case 'End': nextCol = state.getGridCols() - 1; break;

            default:
                if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
                    const charCode = e.key.charCodeAt(0);

                    if (charCode >= 0 && charCode <= 255) {
                        let cellContent: CellContent = gridData[currentRow][currentCol] || { charCode: null, attribute: null };
                        
                        const existingAttr = cellContent.attribute !== null ? decodeCellData(cellContent.attribute) : { bgIndex: state.getCurrentBgIndex(), isBlinking: state.isBlinkEnabled() };
                        cellContent.attribute = encodeCellData({
                            bgIndex: state.getCurrentBgIndex() || 0,
                            fgIndex: state.getCurrentFgIndex() || 7,
                            isBlinking: existingAttr.isBlinking
                        });

                        cellContent.charCode = charCode;
                        gridData[currentRow][currentCol] = cellContent;

                        renderGrid();
                        charTyped = true;
                    }
                }
                break;
        }

        if (['Backspace', 'Delete'].includes(e.key) || charTyped) {
            saveGridState(state.getGridRows(), state.getGridCols(), gridData);
        }

        if (charTyped) {
            nextCol++;
        }

        // Handle grid boundary and wrap-around
        if (nextCol < 0) {
            nextCol = state.getGridCols() - 1;
            nextRow--;
        } else if (nextCol >= state.getGridCols()) {
            nextCol = 0;
            nextRow++;
        }
        if (nextRow < 0) {
            nextRow = state.getGridRows() - 1;
        } else if (nextRow >= state.getGridRows()) {
            nextRow = 0;
        }

        if (nextRow !== currentRow || nextCol !== currentCol) {
            focusCell(nextRow, nextCol);
        }
    });

    // Make canvas focusable
    canvas.tabIndex = 0;

    // Global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Skip if typing in text mode
        if (state.isTextMode() && getActiveCell()) return;
        
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 'z':
                    e.preventDefault();
                    undo();
                    break;
                case 'y':
                    e.preventDefault();
                    redo();
                    break;
                case 'n':
                    e.preventDefault();
                    dom.newBtn.click();
                    break;
                case 's':
                    e.preventDefault();
                    dom.saveBtn.click();
                    break;
            }
        } else if (e.key === 'Backspace' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            dom.deleteBtn.click();
        } else {
            switch (e.key.toLowerCase()) {
                case 'd':
                    e.preventDefault();
                    dom.drawBtn.click();
                    break;
                case 'e':
                    e.preventDefault();
                    dom.eraseBtn.click();
                    break;
                case 't':
                    e.preventDefault();
                    dom.textBtn.click();
                    break;
                case 'f':
                    e.preventDefault();
                    dom.fillBtn.click();
                    break;
                case 'p':
                    e.preventDefault();
                    dom.panBtn.click();
                    break;
                case 'b':
                    e.preventDefault();
                    dom.blinkBtn.click();
                    break;
            }
        }
    });
    
    // Warn before closing tab with unsaved changes
    window.addEventListener('beforeunload', (e) => {
        if (state.hasUnsavedChanges()) {
            e.preventDefault();
            e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            return e.returnValue;
        }
    });
}

export function initializeProjectSystem(): void {
    const saves = getSavesList();
    if (saves.length === 0) {
        const createNew = confirm('No projects found. Would you like to create a new project?');
        if (createNew) {
            const name = prompt('Enter project name:') || 'My First Project';
            state.setCurrentProjectName(name);
        }
    } else {
        // Load the most recent project
        const mostRecent = saves[0];
        state.setCurrentProjectName(mostRecent.name);
    }
}