// src/types.ts

/**
 * Represents the content of a single cell in the grid.
 */
export interface CellContent {
    charCode: number | null; // ASCII character code (0-255)
    attribute: number | null; // 8-bit color attribute
}