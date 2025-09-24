// src/tasm/generator.ts
import type { CellContent } from '../types';

// TODO: Optimize the generated TASM code by grouping consecutive characters 
// with the same attribute into strings for `int 21h, ah=09h` calls.
// This will reduce the number of instructions and improve performance.
// Note: '$' characters cannot be part of these strings as they terminate the 
// DOS string.

// TODO: Split the generation logic into smaller, testable functions for 
// better maintainability.


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

export function generateTASMCode(gridData: (CellContent | null)[][]): string {
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
                        // currentMiddleCode += `\tcolorz ${currentAttribute.toString(16).padStart(2, '0')}h, ${textSegmentChars.length}\n`;
                        currentMiddleCode += `\tcolorz ${currentAttribute.toString(10)}, ${textSegmentChars.length}\n`;
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
                currentMiddleCode += `\trenderc ${renderChar.toString(10)}, 0, ${renderAttribute.toString(16).padStart(2, '0')}h, ${consecutiveRenderCount}\n`;
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