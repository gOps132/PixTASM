/**
 * TODO:
 *  [/] basic drawing functionality
 *  [/] grid size selection
 *  [X] grid size persistence (fixed inconsistencies)
 *  [/] erasing functionality
 *  [/] color selection
 *  [ ] save/load functionality (grid data persistence is done, full save/load UI not yet)
 *  [/] export functionality (tasm)
 *  [ ] Add blinking (actually important for intensity)
 *  [X] Add ascii characters to blocks (finally can use the foreground color)
 *      * maybe a toggle button to switch between ascii and block mode
 */

import './style.css';
import { decodeCellData, encodeCellData, BACKGROUND_PALETTE, FOREGROUND_PALETTE } from './color';
import { STORAGE_KEY_GRID_DATA, STORAGE_KEY_GRID_ROWS, STORAGE_KEY_GRID_COLS } from './storage';
import { getUnicodeCharFromCP437 } from './mappings'; // cp437ToUnicodeMap is not directly used here, only the function

import drawSVG from '/draw.svg';
import eraseSVG from '/erase.svg';
import textSVG from '/text.svg';
import winkSVG from '/wink.svg';
import codeSVG from '/code.svg';
import resizeSVG from '/resize.svg'

// --- CONFIG & DOM ELEMENTS ---
const app: HTMLElement | null = document.getElementById('app')!;
if (!app) throw new Error('Failed to find the app element');

app.innerHTML = `
<div class="tools">
    <div id="color-palettes-container" class="color-palettes-container hidden">
        <div id="bg-color-panel" class="color-panel"></div>
        <div id="fg-color-panel" class="color-panel"></div>
    </div>    
    <div class="controls">
        <input type="number" id="rows-input" class="size-input" value="10" min="1" max="25">
        <input type="number" id="cols-input" class="size-input" value="10" min="1" max="80">
        <button id="resize-btn" class="control-btn">
            <img src=${resizeSVG} width="24" height="24" aria-label="Resize"/>
        </button>
        <button id="draw-btn" class="control-btn" aria-label="Draw">
            <img src=${drawSVG} width="24" height="24"/>
        </button>
        <button id="erase-btn" class="control-btn" aria-label="Erase">
            <img src=${eraseSVG} width="24" height="24"/>
        </button>
        <button id="text-btn" class="control-btn" aria-label="Text Mode">
            <img src=${textSVG} width="24" height="24"/>
        </button>
        <button id="blink-btn" class="control-btn" aria-label="Toggle Blinking">
            <img src=${winkSVG} width="24" height="24"/>
        </button>
        <button id="render-btn" class="control-btn" aria-label="Render and Copy TASM">
            <img src=${codeSVG} width="24" height="24"/>
        </button>
    </div>
</div>
`;

let macros: string = `
putc MACRO char
    mov ah, 02h
    mov dl, char
    int 21h
ENDM
renderc MACRO char, page, color, write
    mov ah, 09h 
    mov al, char
    mov bh, page
    mov bl, color
    mov cx, write
    int 10h
ENDM
setcursor MACRO row, col
    mov ah, 02h
    mov bh, 00h
    mov dh, row
    mov dl, col
    int 10h
ENDM
colorz MACRO color, write
    mov ah, 09h 
    mov bl, color
    mov cx, write
    int 10h
ENDM
.model small
.data
.code
`;

    const startCode: string = macros + `
.stack 100h
start :
    mov ax, @data
    mov ds, ax

    ; Set to video mode 
    mov ah, 00h
    mov al, 03h ; 80x25 color text mode
    int 10h\n
`; // EVERYTHING COMES AFTER HERE

    const endCode: string = `
    mov ah, 4Ch      ; DOS exit function
    mov al, 0        ; Return code 0
    int 21h          ; Call DOS interrupt
end start ; end program
`;

interface CellContent {
    charCode: number | null; // ASCII character code (0-255)
    attribute: number | null; // 8-bit color attribute
}

function generateTASMCode(gridData: (CellContent | null)[][]): string {
    let currentMiddleCode = '';
    let string_data_declarations = '';
    let stringCounter = 0;

    for (let row = 0; row < gridData.length; row++) {
        let col = 0;
        while (col < gridData[row].length) {
            const cell = gridData[row][col];

            if (cell === null || (cell.charCode === null && cell.attribute === null)) {
                col++;
                continue;
            }

            let segmentStartCol = col;
            let currentAttribute = cell.attribute !== null ? cell.attribute : 0x07;

            // --- Attempt to form a 'text string' sequence for DOS `int 21h, ah=09h` ---
            // A text string consists of consecutive cells with characters and the same attribute,
            // and importantly, no '$' characters which act as terminators for `int 21h, ah=09h`.
            if (cell.charCode !== null && cell.charCode !== 36) { // Don't start a string if the character is '$'
                let textSegmentChars: number[] = [];
                let currentSegmentCol = col;

                // Accumulate characters for the string segment
                while (currentSegmentCol < gridData[row].length) {
                    const nextCell = gridData[row][currentSegmentCol];
                    const nextCharCode = nextCell?.charCode;
                    const nextAttribute = nextCell && nextCell.attribute !== null ? nextCell.attribute : 0x07;

                    // Conditions to continue a text string:
                    // 1. A character exists (`nextCharCode !== null`).
                    // 2. The attribute matches the current segment's attribute (`nextAttribute === currentAttribute`).
                    // 3. The character is not '$' (ASCII 36), which would terminate the DOS string.
                    if (nextCharCode !== null && nextAttribute === currentAttribute && nextCharCode !== 36) {
                        if (nextCharCode !== undefined) {
                            textSegmentChars.push(nextCharCode);
                        }
                        currentSegmentCol++;
                    } else {
                        break; // Condition not met, string segment ends
                    }
                }

                if (textSegmentChars.length > 0) {
                    // We successfully found a text string segment
                    const label = `txt_${stringCounter++}_R${row}_C${segmentStartCol}`;
                    let stringLiteral = '';
                    for (const charCode of textSegmentChars) {
                        const char = String.fromCharCode(charCode);
                        if (char === '"') {
                            stringLiteral += '""'; // Escape double quotes for TASM string literals
                        } else {
                            stringLiteral += char;
                        }
                    }

                    string_data_declarations += `\t${label} db "${stringLiteral}",'$'\n`;

                    // Generate the TASM instructions to display this string
                    currentMiddleCode += `\n\tsetcursor ${row}, ${segmentStartCol}\n`;
                    if (currentAttribute !== 0x07) { // Only set color if it's not the default white on black
                        currentMiddleCode += `\tcolorz ${currentAttribute.toString(16).padStart(2, '0')}h, ${textSegmentChars.length}\n`;
                    }
                    currentMiddleCode += `\tmov ah, 09h\n`;
                    currentMiddleCode += `\tmov dx, offset ${label}\n`;
                    currentMiddleCode += `\tint 21h\n`;

                    col = currentSegmentCol; // Move 'col' past the processed string segment
                    continue; // Continue to the next part of the row
                }
            }

            // --- Fallback to 'renderc' macro for blocks or single problematic characters (like '$') ---
            // This path is taken if:
            // - The cell has no charCode (attribute-only block).
            // - The charCode is '$' (which terminates DOS strings, so we render it individually).
            // - A text string could not be formed for other reasons (e.g., attribute change).
            let renderChar = cell.charCode !== null ? cell.charCode : 0x20; // Use actual charCode or space (0x20) for blocks
            let renderAttribute = cell.attribute !== null ? cell.attribute : 0x07;

            let consecutiveRenderCount = 0;
            let currentRenderCol = col;

            // Find consecutive cells that can be rendered with the same char and attribute using `renderc`
            while (currentRenderCol < gridData[row].length) {
                const nextCell = gridData[row][currentRenderCol];
                // Determine charCode and attribute for comparison, defaulting to space/white-on-black if null
                const nextRenderChar = nextCell && nextCell.charCode !== null ? nextCell.charCode : 0x20;
                const nextRenderAttribute = nextCell && nextCell.attribute !== null ? nextCell.attribute : 0x07;

                // Check if the next cell matches the current 'renderc' segment's char and attribute
                if (nextRenderChar === renderChar && nextRenderAttribute === renderAttribute) {
                    consecutiveRenderCount++;
                    currentRenderCol++;
                } else {
                    break; // Mismatch, this 'renderc' segment ends
                }
            }

            if (consecutiveRenderCount > 0) {
                // Generate TASM instructions to render this block segment
                currentMiddleCode += `\n\tsetcursor ${row}, ${segmentStartCol}\n`;
                currentMiddleCode += `\trenderc ${renderChar.toString(16).padStart(2, '0')}h, 0, ${renderAttribute.toString(16).padStart(2, '0')}h, ${consecutiveRenderCount}\n`;
                col = currentRenderCol; // Move 'col' past the processed 'renderc' segment
            } else {
                col++; // Fallback, should ideally not be reached if logic is sound
            }
        }
    }

    // --- Assemble the final TASM code ---
    // The user's `startCode` already includes `macros`, `.model small`, `.code`, and `.data`.
    // We need to inject our generated `string_data_declarations` right after the `.data` directive.
    const dataDirectiveIndex = startCode.lastIndexOf('.data\n'); // Find the last `.data` directive

    let finalTASMCode = '';
    if (dataDirectiveIndex !== -1) {
        // Insert string declarations after the `.data` directive in the `startCode`
        finalTASMCode = startCode.substring(0, dataDirectiveIndex + '.data\n'.length);
        finalTASMCode += string_data_declarations;
        finalTASMCode += startCode.substring(dataDirectiveIndex + '.data\n'.length);
    } else {
        // Fallback: if `.data` directive is not found (unlikely with provided code), just append data
        finalTASMCode = startCode + string_data_declarations;
    }

    finalTASMCode += currentMiddleCode;
    finalTASMCode += endCode;          

    console.log('Generated TASM Code:\n', finalTASMCode);
    return finalTASMCode;
}

// --- STATE MANAGEMENT ---
let GRID_ROWS: number = 10;
let GRID_COLS: number = 10;

const MIN_ROWS: number = 1;
const MIN_COLS: number = 1;

const MAX_ROWS: number = 24;
const MAX_COLS: number = 80;

let isErasing: boolean = false;
let isDrawing: boolean = false;
let isTextMode: boolean = false;
let isMouseDown: boolean = false;

// 8-Bit "Color" State
let currentBgIndex: number = 1; // Default: black background
let currentFgIndex: number = 15; // Default: White foreground
let isBlinkEnabled: boolean = false; // Default: Steady

let cellElements: HTMLDivElement[][] = [];
let activeCell: HTMLDivElement | null = null;
let gridData: (CellContent | null)[][] = [];

function saveGridState(): void {
    try {
        localStorage.setItem(STORAGE_KEY_GRID_ROWS, String(GRID_ROWS));
        localStorage.setItem(STORAGE_KEY_GRID_COLS, String(GRID_COLS));
        localStorage.setItem(STORAGE_KEY_GRID_DATA, JSON.stringify(gridData));
        console.log('Grid state saved.');
    } catch (error) {
        console.error('Failed to save grid state to localStorage:', error);
    }
}

function loadGridState(): void {
    const savedRows = localStorage.getItem(STORAGE_KEY_GRID_ROWS);
    const savedCols = localStorage.getItem(STORAGE_KEY_GRID_COLS);

    if (savedRows && savedCols) {
        GRID_ROWS = parseInt(savedRows, 10) || 10;
        GRID_COLS = parseInt(savedCols, 10) || 10;
        console.log(`Loaded grid state: ${GRID_ROWS}x${GRID_COLS}`);
    }

    // Update input fields to reflect loaded or default values
    rowsInput.value = String(GRID_ROWS);
    colsInput.value = String(GRID_COLS);
}
// ------------------------

const gridContainer: HTMLDivElement = document.createElement('div');
gridContainer.className = 'grid-container';
gridContainer.style.setProperty('--grid-cols', String(GRID_COLS));
gridContainer.style.setProperty('--grid-rows', String(GRID_ROWS));

const drawBtn: HTMLElement = document.getElementById('draw-btn') as HTMLButtonElement;
const eraseBtn: HTMLElement = document.getElementById('erase-btn') as HTMLButtonElement;
const blinkBtn: HTMLElement = document.getElementById('blink-btn') as HTMLButtonElement;
const bgColorPanel: HTMLDivElement = document.getElementById('bg-color-panel') as HTMLDivElement;
const fgColorPanel: HTMLDivElement = document.getElementById('fg-color-panel') as HTMLDivElement;
const renderBtn: HTMLElement = document.getElementById('render-btn') as HTMLButtonElement;
const textBtn: HTMLElement = document.getElementById('text-btn') as HTMLButtonElement;

const rowsInput: HTMLInputElement = document.getElementById('rows-input') as HTMLInputElement;
const colsInput: HTMLInputElement = document.getElementById('cols-input') as HTMLInputElement;
const resizeBtn: HTMLElement = document.getElementById('resize-btn') as HTMLButtonElement;


function focusCell(row: number, col: number): void {
    if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) {
        return;
    }


    if (activeCell) {
        activeCell.classList.remove('active');
        // activeCell.classList.remove('active-text-cell'); 
        renderCell(activeCell, gridData[parseInt(activeCell.dataset.row!)][parseInt(activeCell.dataset.col!)]);
    }

    activeCell = cellElements[row][col];
    activeCell.classList.add('active');
    renderCell(activeCell, gridData[row][col]);
    activeCell.focus();
}


function createGrid(rows: number, cols: number): void {
    GRID_ROWS = rows;
    GRID_COLS = cols;

    gridContainer.innerHTML = '';

    cellElements = [];
    gridData = [];

    gridContainer.style.setProperty('--grid-cols', String(cols));
    gridContainer.style.setProperty('--grid-rows', String(rows));

    // Try to load the saved grid data
    const savedDataJSON = localStorage.getItem(STORAGE_KEY_GRID_DATA);
    let savedData: (CellContent | null)[][] | null = null; // Correct type for saved data
    if (savedDataJSON) {
        try {
            savedData = JSON.parse(savedDataJSON);
            // Basic validation to ensure saved data matches dimensions
            if (savedData?.length !== rows || (savedData.length > 0 && savedData[0]?.length !== cols)) {
                savedData = null; // Mismatch, treat as no saved data
                localStorage.removeItem(STORAGE_KEY_GRID_DATA); // Clean up invalid data
            }
        } catch (e) {
            console.error("Failed to parse saved grid data.", e);
            savedData = null;
        }
    }

    for (let i: number = 0; i < rows; i++) {
        gridData[i] = [];
        cellElements[i] = [];
        for (let j = 0; j < cols; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = String(i);
            cell.dataset.col = String(j);
            cell.tabIndex = 0; // Make cells focusable for keyboard navigation

            gridContainer.appendChild(cell);
            cellElements[i][j] = cell;

            // Initialize or load cell data
            // Ensure cellContent is always an object if it has any data from savedData
            const loadedCellContent = savedData?.[i]?.[j] ?? null;

            if (loadedCellContent && (loadedCellContent.charCode !== null || loadedCellContent.attribute !== null)) {
                 gridData[i][j] = { // Ensure it's always a new object to avoid mutation issues with savedData directly
                    charCode: loadedCellContent.charCode,
                    attribute: loadedCellContent.attribute
                };
            } else {
                gridData[i][j] = null;
            }
           
            renderCell(cell, gridData[i][j]); // Pass the CellContent object (or null)
        }
    }
    console.log(`Grid created with ${rows} rows and ${cols} columns.`);
    saveGridState(); // Save the newly initialized or loaded grid state
}

/**
 * Renders a single cell's appearance based on its stored data.
 */
function renderCell(cell: HTMLDivElement, cellContent: CellContent | null): void {
    // Reset styles
    cell.style.backgroundColor = '';
    cell.style.borderColor = '#555'; // Default border for empty cells
    cell.classList.remove('blinking');
    // cell.classList.remove('selected');
    cell.textContent = ''; // Clear existing text content before (re)rendering

    if (cellContent !== null && (cellContent.attribute !== null || cellContent.charCode !== null)) {
        // Cell has content (either attribute or character or both)
        let attribute = cellContent.attribute;

        // If a character exists but no explicit attribute is set, use a default
        // (e.g., white foreground on black background) so the character is visible.
        if (attribute === null && cellContent.charCode !== null) {
            attribute = 0x07; // White foreground, black background, non-blinking
        }

        if (attribute !== null) {
            const decoded = decodeCellData(attribute);
            cell.style.backgroundColor = decoded.backgroundColor;
            cell.style.color = decoded.foregroundColor;
            cell.classList.toggle('blinking', decoded.isBlinking);
        }

        // Display the character using the CP437 to Unicode mapping.
        if (cellContent.charCode !== null) {
            cell.textContent = getUnicodeCharFromCP437(cellContent.charCode);
        } else if (cellContent.attribute !== null) {
            // If the cell has an attribute (color) but no specific character,
            // display a CP437 space character (0x20) by default.
            cell.textContent = getUnicodeCharFromCP437(0x20); // CP437 for space
        }
    }
}

/**
 * Updates the data model and re-renders a cell based on the current tool.
 */
function applyDrawing(cell: HTMLDivElement): void {
    const row: number = parseInt(cell.dataset.row!);
    const col: number = parseInt(cell.dataset.col!);

    // Ensure we have an object to work with, even if the cell was previously null
    let currentCellContent: CellContent = gridData[row][col] || { charCode: null, attribute: null };

    if (isErasing) {
        currentCellContent.attribute = null; // Only erase the attribute
        // If charCode is also null, then the cell becomes completely empty
        if (currentCellContent.charCode === null) {
            gridData[row][col] = null;
        } else {
            gridData[row][col] = currentCellContent;
        }
    } else { // Drawing
        currentCellContent.attribute = encodeCellData({
            bgIndex: currentBgIndex,
            fgIndex: currentFgIndex,
            isBlinking: isBlinkEnabled
        });
        gridData[row][col] = currentCellContent;
    }

    renderCell(cell, gridData[row][col]); // Pass the CellContent object
    saveGridState();
}


// --- INITIALIZATION --- 
loadGridState();
createGrid(GRID_ROWS, GRID_COLS);
app.appendChild(gridContainer);
createColorPanel(bgColorPanel, BACKGROUND_PALETTE, currentBgIndex, (selectedIndex) => {
    currentBgIndex = selectedIndex;
    console.log(`Background color index set to: ${currentBgIndex}`);
});

createColorPanel(fgColorPanel, FOREGROUND_PALETTE, currentFgIndex, (selectedIndex) => {
    currentFgIndex = selectedIndex;
    console.log(`Foreground color index set to: ${currentFgIndex}`);
});

// ----------------------


// --- COLOR PANEL MANAGEMENT ---
function createColorPanel(
    panel: HTMLDivElement,
    palette: readonly string[],
    initialSelectedIndex: number, // Added this parameter
    onColorSelect: (index: number) => void) {

    panel.innerHTML = ''; // Clear any existing swatches

    palette.forEach((color, index) => {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.backgroundColor = color;
        swatch.dataset.colorIndex = String(index);

        // Set the initial selected swatch based on the new parameter
        if (index === initialSelectedIndex) {
            swatch.classList.add('selected');
        }

        swatch.addEventListener('click', () => {
            // Update the state by calling the callback
            onColorSelect(index);

            // Update the visual selection for this specific panel
            panel.querySelectorAll('.color-swatch').forEach((sw) => {
                sw.classList.remove('selected')
            });

            swatch.classList.add('selected');

            // Optionally, update the `--change-color` if this is the background panel
            if (panel === bgColorPanel) {
                app?.style.setProperty('--change-color', BACKGROUND_PALETTE[index]);
            }
        });

        panel.appendChild(swatch);
    });
}

// --- EVENT LISTENERS ---

resizeBtn.addEventListener('click', () => {
    const newRows: number = parseInt(rowsInput.value, 10);
    const newCols: number = parseInt(colsInput.value, 10);

    if (isNaN(newRows) || isNaN(newCols) || newRows < MIN_ROWS || newCols < MIN_COLS || MAX_COLS < newCols || MAX_ROWS < newRows) {
        alert(`Please set grid dimensions between (${MIN_ROWS}x${MIN_COLS}) and (${MAX_ROWS}x${MAX_COLS}) cells.`);
        return;
    }

    // Use STORAGE_KEY_ constants for consistency
    localStorage.setItem(STORAGE_KEY_GRID_ROWS, String(newRows));
    localStorage.setItem(STORAGE_KEY_GRID_COLS, String(newCols));

    localStorage.removeItem(STORAGE_KEY_GRID_DATA); 

    createGrid(newRows, newCols);
});

drawBtn.addEventListener('click', () => {
    if (!isDrawing) {
        isDrawing = true;
        isErasing = false;
        
        
        isTextMode = false; // Exit text mode when drawing
        
        drawBtn.classList.add('active');
        eraseBtn.classList.remove('active');
        textBtn.classList.remove('active');
        // Re-render all cells to clear any 'active-text-cell' styling
        cellElements.flat().forEach(cell => {
            const row = parseInt(cell.dataset.row!);
            const col = parseInt(cell.dataset.col!);
            renderCell(cell, gridData[row][col]);
            cell.classList.remove('active'); // Remove general active class too
        });
        if (activeCell) {
            activeCell = null;
        }
    } else {
        isDrawing = false;
        drawBtn.classList.remove('active');
    }
});

eraseBtn.addEventListener('click', () => {
    if (!isErasing) {
        isDrawing = false;
        isErasing = true;
        isTextMode = false; // Exit text mode when erasing
        eraseBtn.classList.add('active');
        drawBtn.classList.remove('active');
        textBtn.classList.remove('active');
        // Re-render all cells to clear any 'active-text-cell' styling
        cellElements.flat().forEach(cell => {
            const row = parseInt(cell.dataset.row!);
            const col = parseInt(cell.dataset.col!);
            renderCell(cell, gridData[row][col]);
            cell.classList.remove('active'); // Remove general active class too
        });
        if (activeCell) {
            activeCell = null;
        }
    } else {
        isErasing = false;
        eraseBtn.classList.remove('active');
    }
});

textBtn.addEventListener('click', () => {
    isTextMode = !isTextMode;
    textBtn.classList.toggle('active', isTextMode);

    if (isTextMode) {
        // Deactivate drawing/erasing when entering text mode
        isDrawing = false;
        isErasing = false;
        drawBtn.classList.remove('active');
        eraseBtn.classList.remove('active');

        // Re-render all cells to ensure they are in display mode and clear active states
        cellElements.flat().forEach(cell => {
            const row = parseInt(cell.dataset.row!);
            const col = parseInt(cell.dataset.col!);
            renderCell(cell, gridData[row][col]);
            cell.classList.remove('active'); // Clear any lingering 'active' state
        });

        // Set the first cell as active by default or keep current active if exists
        if (!activeCell) {
            activeCell = cellElements[0][0]; // Default to top-left cell
        }
        // Use focusCell to activate and highlight
        focusCell(parseInt(activeCell.dataset.row!), parseInt(activeCell.dataset.col!));

    } else {
        // Exit text mode
        if (activeCell) {
            activeCell.classList.remove('active');
            renderCell(activeCell, gridData[parseInt(activeCell.dataset.row!)][parseInt(activeCell.dataset.col!)]);
            activeCell = null;
        }
    }
});


blinkBtn.addEventListener('click', () => {
    isBlinkEnabled = !isBlinkEnabled;
    blinkBtn.classList.toggle('active');
});


gridContainer.addEventListener('mousedown', (e) => {
    if (!isDrawing || isTextMode) return;
    let cell: HTMLDivElement | null = e.target as HTMLDivElement;
    // Ensure we are clicking on a cell, not its children if any were added
    if (!cell.classList.contains('cell')) {
        cell = (e.target as HTMLElement).closest('.cell') as HTMLDivElement;
    }
    if (!cell) return;

    e.preventDefault(); // Prevent default browser drag behavior

    if (isTextMode) {
        const row = parseInt(cell.dataset.row!);
        const col = parseInt(cell.dataset.col!);
        focusCell(row, col); // Use the new focusCell helper
        isMouseDown = false; // Prevent dragging in text mode
    } else {
        // Handle drawing/erasing as before
        if (activeCell) { // Clear active state if switching modes or drawing over an active cell
            activeCell.classList.remove('active');
            renderCell(activeCell, gridData[parseInt(activeCell.dataset.row!)][parseInt(activeCell.dataset.col!)]);
            activeCell = null;
        }
        isMouseDown = true;
        applyDrawing(cell);
    }
});

document.addEventListener('keydown', (e) => {
    if (!isTextMode || !activeCell) {
        return;
    }

    e.preventDefault();

    const currentRow = parseInt(activeCell.dataset.row!);
    const currentCol = parseInt(activeCell.dataset.col!);

    let nextRow = currentRow;
    let nextCol = currentCol;
    let charTyped = false;

    switch (e.key) {
        case 'Backspace':
            let currentCellContentForBackspace = gridData[currentRow][currentCol];
            if (currentCellContentForBackspace) {
                currentCellContentForBackspace.charCode = null;
                if (currentCellContentForBackspace.attribute === null) {
                    gridData[currentRow][currentCol] = null;
                } else {
                    gridData[currentRow][currentCol] = currentCellContentForBackspace;
                }
                renderCell(activeCell, gridData[currentRow][currentCol]);
                saveGridState();
            }
            nextCol--;
            break;
        case 'Delete':
            let currentCellContentForDelete = gridData[currentRow][currentCol];
            if (currentCellContentForDelete) {
                currentCellContentForDelete.charCode = null;
                if (currentCellContentForDelete.attribute === null) {
                    gridData[currentRow][currentCol] = null;
                } else {
                    gridData[currentRow][currentCol] = currentCellContentForDelete;
                }
                renderCell(activeCell, gridData[currentRow][currentCol]);
                saveGridState();
            }
            // Do not change nextCol/nextRow, stay on the same cell
            break;
        case 'ArrowLeft':
            nextCol--;
            break;
        case 'ArrowRight':
            nextCol++;
            break;
        case 'ArrowUp':
            nextRow--;
            break;
        case 'ArrowDown':
            nextRow++;
            break;
        case 'Enter':
            nextCol++;
            break;
        case 'Home':
            nextCol = 0;
            break;
        case 'End':
            nextCol = GRID_COLS - 1;
            break;
        default:
            if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
                const charCode = e.key.charCodeAt(0);

                if (charCode >= 0 && charCode <= 255) {
                    let cellContent: CellContent = gridData[currentRow][currentCol] || { charCode: null, attribute: null };

                    if (cellContent.attribute === null) {
                        cellContent.attribute = encodeCellData({ bgIndex: currentBgIndex, fgIndex: currentFgIndex, isBlinking: isBlinkEnabled });
                    } else {
                         // If an attribute exists, decode it to preserve existing bg/blink settings
                         const decoded = decodeCellData(cellContent.attribute);
                         cellContent.attribute = encodeCellData({ bgIndex: currentBgIndex, fgIndex: currentFgIndex, isBlinking: decoded.isBlinking });
                    }

                    cellContent.charCode = charCode;
                    gridData[currentRow][currentCol] = cellContent;

                    // Update the active cell's text content using CP437 mapping
                    activeCell.textContent = getUnicodeCharFromCP437(charCode);
                    renderCell(activeCell, gridData[currentRow][currentCol]); // Re-render to show updated foreground color and character

                    saveGridState();
                    charTyped = true;
                }
            }
            break;
    }

    if (charTyped) {
        nextCol++;
    }

    // Handle grid boundary and wrap-around for navigation
    if (nextCol < 0) {
        nextCol = GRID_COLS - 1;
        nextRow--;
    } else if (nextCol >= GRID_COLS) {
        nextCol = 0;
        nextRow++;
    }

    if (nextRow < 0) {
        nextRow = GRID_ROWS - 1;
    } else if (nextRow >= GRID_ROWS) {
        nextRow = 0;
    }

    if (nextRow !== currentRow || nextCol !== currentCol || charTyped) {
        focusCell(nextRow, nextCol);
    }
});


renderBtn.addEventListener('click', () => {
    // Before generating, ensure the currently active cell's input is visually rendered
    if (isTextMode && activeCell) {
        const row = parseInt(activeCell.dataset.row!);
        const col = parseInt(activeCell.dataset.col!);
        // Force a re-render to ensure textContent matches gridData for the active cell
        renderCell(activeCell, gridData[row][col]); 
    }

    const tasmCode = generateTASMCode(gridData);
    navigator.clipboard.writeText(tasmCode).then(() => {
        alert('TASM code copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy TASM code:', err);
        alert('Failed to copy TASM code. Check console for details.');
    });
});

gridContainer.addEventListener('mousemove', (e) => {
    if (isTextMode || !isDrawing) return; // Prevent drawing if in text mode
    if (!isMouseDown || !(e.target instanceof HTMLDivElement)) return;
    e.preventDefault();
    // Ensure the target is a cell before applying drawing
    let cell: HTMLDivElement | null = e.target as HTMLDivElement;
    if (!cell.classList.contains('cell')) {
        cell = (e.target as HTMLElement).closest('.cell') as HTMLDivElement;
    }
    if (cell) {
        applyDrawing(cell);
    }
});

window.addEventListener('mouseup', () => {
    isMouseDown = false;
});