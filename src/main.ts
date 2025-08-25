/**
 * TODO:
 *  [/] basic drawing functionality
 *  [/] grid size selection
 *  [ ] grid size persistence
 *  [/] erasing functionality
 *  [/] color selection
 *  [ ] save/load functionality
 *  [/] export functionality (tasm)
 *  [ ] cells should be 2x1 (2 horizontal cells per character)
 *  [ ] Add ascii characters to blocks (finally can use the foreground color)
 *      * maybe a toggle button to switch between ascii and block mode
 */

import './style.css';
import { decodeCellData, encodeCellData, BACKGROUND_PALETTE } from './color';

// --- CONFIG & DOM ELEMENTS ---
const app = document.getElementById('app')!;
if (!app) throw new Error('Failed to find the app element');

app.innerHTML = `
<div>
    <div id="bg-color-panel" class="color-panel"></div>
    <div class="controls">
        <div class="grid-size-controls">
            <input type="number" id="rows-input" class="size-input" value="10" min="1" max="50">
            <input type="number" id="cols-input" class="size-input" value="10" min="1" max="50">
            <button id="resize-btn" class="control-btn">Resize</button>
        </div>
        <button id="draw-btn" class="control-btn" aria-label="Draw">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
        </button>
        <button id="erase-btn" class="control-btn" aria-label="Erase">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.49 4.51a2.828 2.828 0 1 1-4 4L8.5 16.51 4 21l-1.5-1.5L7.5 15l-4-4 4-4Z"/><path d="m15 5 4 4"/></svg>
        </button>
        <button id="render-btn" class="control-btn" aria-label="Render and Copy TASM">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
        </button>
    </div>
</div>
`;

let start = `
putc MACRO char
    mov ah, 02h
    mov dl, char
    int 21h
ENDM
renderc MACRO char
    mov AH, 09h 
    mov bl, char
    mov cx, 1 
    int 10h
    putc ' '
ENDM
.model small
.code
.stack 100h
start :
    ; Set to video mode 
    mov ah, 00h
    mov al, 03h
    int 10h\n
`;
let middle = ``
let end = `
    mov ax, 4c00h ; exit dos
    int 27h ; terminate
end start ; end program
`

function generateTASMCode(gridData: (number | null)[][]): string {
    let code = start;
    for (let row = 0; row < gridData.length; row++) {
        for (let col = 0; col < gridData[row].length; col++) {
            let cellValue = gridData[row][col];
            if (cellValue === null) cellValue = 0;
            // each cell is rendered twice for 2x1 aspect ratio
            let tmp = cellValue.toString(16);
            if (tmp == 'f') tmp = '0';
            middle += `\trenderc ${tmp}h\n`;
            middle += `\trenderc ${tmp}h\n`;
        }
        // add newline after each row
        middle += `\n\tputc 0ah\n\n`;
    }
    code += middle + end;
    // debug
    console.log('Generated TASM Code:\n', code);
    return code;
}

// --- STATE MANAGEMENT ---
let GRID_ROWS: number = 20;
let GRID_COLS: number = 20;

const MAX_GRID: number = 30*30;

const MIN_ROWS: number = 1;
const MIN_COLS: number = 1;

let isErasing: boolean = false;
let isDrawing: boolean = false;
let isMouseDown: boolean = false;

// 8-Bit "Color" State
let currentBgIndex = 1; // Default: black background
let currentFgIndex = 15; // Default: White foreground
let isBlinkEnabled = false; // Default: Steady

let cellElements: HTMLDivElement[][] = [];
let gridData: (number | null)[][] = [];
// ------------------------

const gridContainer = document.createElement('div');
gridContainer.className = 'grid-container';
gridContainer.style.setProperty('--grid-cols', String(GRID_COLS));
gridContainer.style.setProperty('--grid-rows', String(GRID_ROWS));

const drawBtn = document.getElementById('draw-btn') as HTMLButtonElement;
const eraseBtn = document.getElementById('erase-btn') as HTMLButtonElement;
const bgColorPanel = document.getElementById('bg-color-panel') as HTMLDivElement;
const renderBtn = document.getElementById('render-btn') as HTMLButtonElement;

const rowsInput = document.getElementById('rows-input') as HTMLInputElement;
const colsInput = document.getElementById('cols-input') as HTMLInputElement;
const resizeBtn = document.getElementById('resize-btn') as HTMLButtonElement;

function createGrid(rows: number, cols: number) {
    middle = '';
    GRID_ROWS = rows;
    GRID_COLS = cols;

    gridContainer.innerHTML = '';

    cellElements = [];
    gridData = [];

    gridContainer.style.setProperty('--grid-cols', String(cols));
    gridContainer.style.setProperty('--grid-rows', String(rows));

    for (let i = 0; i < rows; i++) {
        gridData[i] = [];
        cellElements[i] = [];
        for (let j = 0; j < cols; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = String(i);
            cell.dataset.col = String(j);

            gridContainer.appendChild(cell);
            cellElements[i][j] = cell;
            gridData[i][j] = null;
        }
    }

    console.log(`Grid created with ${rows} rows and ${cols} columns.`);

    // localStorage.removeItem(STORAGE_KEY);
}

/**
 * Renders a single cell's appearance based on its 8-bit value.
 */
function renderCell(cell: HTMLDivElement, value: number | null) {
    if (value === null) {
        // Style for an erased cell
        cell.style.backgroundColor = '';
        cell.style.borderColor = '#555';
        cell.classList.remove('blinking');
        cell.classList.remove('selected');
    } else {
        // Style for a drawn cell
        const decoded = decodeCellData(value);
        cell.style.backgroundColor = decoded.backgroundColor;
        cell.style.borderColor = decoded.foregroundColor; // Use border for foreground
        cell.classList.toggle('blinking', decoded.isBlinking);
        cell.classList.add('selected');
    }
}

/**
 * Updates the data model and re-renders a cell based on the current tool.
 */
function applyDrawing(cell: HTMLDivElement) {
    const row = parseInt(cell.dataset.row!);
    const col = parseInt(cell.dataset.col!);

    let newValue: number | null = null;

    if (isErasing) {
        newValue = null;
    } else {
        newValue = encodeCellData({
            bgIndex: currentBgIndex,
            fgIndex: currentFgIndex,
            isBlinking: isBlinkEnabled
        });
    }
    gridData[row][col] = newValue;
    renderCell(cell, newValue);
}


// --- INITIALIZATION --- 

createGrid(GRID_ROWS, GRID_COLS);
app.appendChild(gridContainer);
createColorPanel(bgColorPanel, BACKGROUND_PALETTE, (selectedIndex) => {
    currentBgIndex = selectedIndex;
    console.log(`Background color index set to: ${currentBgIndex}`);
});

// ----------------------


// --- COLOR PANEL MANAGEMENT ---
function createColorPanel(
    panel: HTMLDivElement,
    palette: readonly string[],
    onColorSelect: (index: number) => void) {

    panel.innerHTML = ''; // Clear any existing swatches

    palette.forEach((color, index) => {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.backgroundColor = color;
        swatch.dataset.colorIndex = String(index);

        // Set the initial selected swatch
        if (index === currentBgIndex) {
            swatch.classList.add('selected');
        }

        swatch.addEventListener('click', (e) => {
            // Update the state by calling the callback
            onColorSelect(index);

            // Update the visual selection
            panel.querySelectorAll('.color-swatch').forEach((sw) => {
                sw.classList.remove('selected')
            });

            swatch.classList.add('selected');

            // Hide the panel after selection
            panel.classList.remove('visible');
        });

        panel.appendChild(swatch);
    });
}

// close color panel when clicking outside
window.addEventListener('click', () => {
    if (bgColorPanel.classList.contains('visible')) {
        bgColorPanel.classList.remove('visible');
    }
});

// --- EVENT LISTENERS ---

resizeBtn.addEventListener('click', () => {
    const newRows = parseInt(rowsInput.value, 10);
    const newCols = parseInt(colsInput.value, 10);

    if (isNaN(newRows) || isNaN(newCols) || newRows < MIN_ROWS || newCols < MIN_COLS || newRows*newCols > MAX_GRID) {
        alert(`Please grid within (1-${MAX_GRID}) cells.`);
        return;
    }

    localStorage.setItem('gridRows', String(newRows));
    localStorage.setItem('gridCols', String(newCols));

    createGrid(newRows, newCols);
});

drawBtn.addEventListener('click', () => {
    isDrawing = true;
    isErasing = false;
    drawBtn.classList.add('active');
    eraseBtn.classList.remove('active');
});

eraseBtn.addEventListener('click', () => {
    isDrawing = false;
    isErasing = true;
    eraseBtn.classList.add('active');
    drawBtn.classList.remove('active');
});


gridContainer.addEventListener('mousedown', (e) => {
    if (!(e.target instanceof HTMLDivElement)) return;
    e.preventDefault();
    isMouseDown = true;
    applyDrawing(e.target);
});

renderBtn.addEventListener('click', () => {
    const tasmCode = generateTASMCode(gridData);
    navigator.clipboard.writeText(tasmCode).then(() => {
        alert('TASM code copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy TASM code:', err);
        alert('Failed to copy TASM code. Check console for details.');
    });
});

gridContainer.addEventListener('mousemove', (e) => {
    if (!isMouseDown || !(e.target instanceof HTMLDivElement)) return;
    e.preventDefault();
    applyDrawing(e.target);
});

window.addEventListener('mouseup', () => {
    isMouseDown = false;
});