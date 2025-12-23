import type { CellContent } from '../types';
import { decodeCellData, BACKGROUND_PALETTE } from '../color';

/**
 * Generate DB-style sprite declaration lines from grid data.
 *
 * Each row becomes a DB '...|' line and the final row ends with '$' instead of '|'.
 * Cells with no data produce '.' (dot). Cells with an attribute map their background
 * color to a single letter according to `letterMap` (one letter per palette entry).
 *
 * Example output:
 *   SPRITE_5    DB '....KKK....|'
 *               DB '..WWWWW....|'
 *               DB '................$'
 */

export function generateSpriteDB(
    gridData: (CellContent | null)[][],
    label = 'SPRITE'
): string {
    // Letters mapped to BACKGROUND_PALETTE indices (0..7).
    // K=Black, B=Blue, G=Green, C=Cyan, R=Red, M=Magenta, Y=Yellow, W=White
    const letterMap = ['K', 'B', 'G', 'C', 'R', 'M', 'Y', 'W'];

    const escapeSingle = (s: string): string => s.replace(/'/g, "''");

    const rows: string[] = [];
    for (let r = 0; r < gridData.length; r++) {
        let line = '';
        for (let c = 0; c < gridData[r].length; c++) {
            const cell = gridData[r][c];
            if (!cell) {
                line += '.';
                continue;
            }

            if (cell.attribute !== null) {
                const decoded = decodeCellData(cell.attribute);
                const bgIndex = Math.max(0, BACKGROUND_PALETTE.indexOf(decoded.backgroundColor));
                const letter = letterMap[bgIndex] ?? '?';
                line += letter;
            } else {
                line += '.';
            }
        }

        const terminator = r === gridData.length - 1 ? '$' : '|';

        // First row gets the label; following rows only emit "DB '...'"
        if (r === 0) {
            rows.push(`${label}\tDB '${escapeSingle(line + terminator)}'`);
        } else {
            rows.push(`\t\tDB '${escapeSingle(line + terminator)}'`);
        }
    }

    if (rows.length === 0) return '';

    return rows.join('\n') + '\n';
}