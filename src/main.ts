/**
 * TODO:
 *  [/] basic drawing functionality
 *  [/] grid size selection
 *  [ ] grid size persistence
 *  [/] erasing functionality
 *  [/] color selection
 *  [ ] save/load functionality
 *  [/] export functionality (tasm)
 *  [ ] Add blinking (actually important for intensity)
 *  [ ] cells should be 2x1 (2 horizontal cells per character)
 *  [ ] Add ascii characters to blocks (finally can use the foreground color)
 *      * maybe a toggle button to switch between ascii and block mode
 */

import './style.css';
import { decodeCellData, encodeCellData, BACKGROUND_PALETTE } from './color';

// --- CONFIG & DOM ELEMENTS ---
const app : HTMLElement | null = document.getElementById('app')!;
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
        <button id="blink-btn" class="control-btn" aria-label="Toggle Blinking">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10z"></path></svg>
        </button>
        <button id="render-btn" class="control-btn" aria-label="Render and Copy TASM">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
        </button>
    </div>
</div>
`;

let macros : string = `
putc MACRO char
    mov ah, 02h
    mov dl, char
    int 21h
ENDM
renderc MACRO char, page, color, write
    mov ah, 09h 
    mov al, char ; character to write
    mov bh, page ; page number
    mov bl, color
    mov cx, write; how many times to write
    int 10h
ENDM
setcursor MACRO row, col
    mov ah, 02h
    mov bh, 00h
    mov dh, row
    mov dl, col
    int 10h
ENDM
`;

let start : string = macros + `
.model small
.code
.stack 100h
start :
    ; Set to video mode 
    mov ah, 00h
    mov al, 03h
    int 10h\n
`;
let middle : string = ``
let end : string = `
    mov ah, 4Ch      ; DOS exit function
    mov al, 0        ; Return code 0
    int 21h          ; Call DOS interrupt
end start ; end program
`


function generateTASMCode(gridData: (number | null)[][]): string {
    middle = '';

    for (let row = 0; row < gridData.length; row++) {
        let has_cell_in_col : boolean = false;
        for (let col = 0; col < gridData[row].length; col++) {
            const cellValue = gridData[row][col];
            // Only generate code for cells that are not empty (not null)
            if (cellValue !== null) {
                let tmp : string = cellValue.toString(16);
                if (tmp == 'f') tmp = '0';
                const attribute : string = tmp + 'h';
                const screen_col : number = col * 2; // Each grid cell is 2 characters wide

                middle += `\tsetcursor ${row}, ${screen_col}\n`;
                middle += `\trenderc 20h, 0, ${attribute},2\n\n`;
                has_cell_in_col = true;
            }
            // TODO: Optimize further, putc in the middle of renders
            // if (col == gridData[row].length-1 && !has_cell_in_col)
            //     middle += `\tputc 0ah\n`
        }
    }

    const code: string = start + middle + end;
    console.log('Generated TASM Code:\n', code);
    return code;
}

// --- STATE MANAGEMENT ---
let GRID_ROWS: number = 20;
let GRID_COLS: number = 20;

const MIN_ROWS: number = 1;
const MIN_COLS: number = 1;

// 0-79, technically we lose one col here
const MAX_ROWS: number = 24;
const MAX_COLS: number = 39; 

let isErasing: boolean = false;
let isDrawing: boolean = false;
let isMouseDown: boolean = false;

// 8-Bit "Color" State
let currentBgIndex : number = 1; // Default: black background
let currentFgIndex : number = 15; // Default: White foreground
let isBlinkEnabled : boolean = false; // Default: Steady

let cellElements: HTMLDivElement[][] = [];
let gridData: (number | null)[][] = [];
// ------------------------

const gridContainer : HTMLDivElement = document.createElement('div');
gridContainer.className = 'grid-container';
gridContainer.style.setProperty('--grid-cols', String(GRID_COLS));
gridContainer.style.setProperty('--grid-rows', String(GRID_ROWS));

const drawBtn       : HTMLElement = document.getElementById('draw-btn') as HTMLButtonElement;
const eraseBtn      : HTMLElement = document.getElementById('erase-btn') as HTMLButtonElement;
const blinkBtn      : HTMLElement = document.getElementById('blink-btn') as HTMLButtonElement;
const bgColorPanel  : HTMLDivElement = document.getElementById('bg-color-panel') as HTMLDivElement;
const renderBtn     : HTMLElement = document.getElementById('render-btn') as HTMLButtonElement;

const rowsInput     : HTMLInputElement = document.getElementById('rows-input') as HTMLInputElement;
const colsInput     : HTMLInputElement = document.getElementById('cols-input') as HTMLInputElement;
const resizeBtn     : HTMLElement = document.getElementById('resize-btn') as HTMLButtonElement;

function createGrid(rows: number, cols: number) : void {
    middle = '';
    GRID_ROWS = rows;
    GRID_COLS = cols;

    gridContainer.innerHTML = '';

    cellElements = [];
    gridData = [];

    gridContainer.style.setProperty('--grid-cols', String(cols));
    gridContainer.style.setProperty('--grid-rows', String(rows));

    for (let i : number = 0; i < rows; i++) {
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
function renderCell(cell: HTMLDivElement, value: number | null) : void {
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
function applyDrawing(cell: HTMLDivElement) : void {
    const row : number = parseInt(cell.dataset.row!);
    const col : number = parseInt(cell.dataset.col!);

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
    const newRows : number = parseInt(rowsInput.value, 10);
    const newCols : number = parseInt(colsInput.value, 10);

    if (isNaN(newRows) || isNaN(newCols) || newRows < MIN_ROWS || newCols < MIN_COLS || MAX_COLS < newCols || MAX_ROWS < newRows) {
        alert(`Please grid within (${MAX_ROWS}x${MAX_COLS}) cells.`);
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

blinkBtn.addEventListener('click', () => {
    isBlinkEnabled = !isBlinkEnabled;
    blinkBtn.classList.toggle('active');
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