export const BLINK_MASK = 0b10000000;
export const BACKGROUND_MASK = 0b01110000;
export const FOREGROUND_MASK = 0b00001111;
export const BACKGROUND_PALETTE = [
    '#000',
    '#00A',
    '#0A0',
    '#0AA',
    '#A00',
    '#A0A',
    '#AA0',
    '#AAA'
];
export const FOREGROUND_PALETTE = [
    '#000',
    '#00A',
    '#0A0',
    '#0AA',
    '#A00',
    '#A0A',
    '#AA0',
    '#AAA',
    '#555',
    '#55F',
    '#5F5',
    '#5FF',
    '#F55',
    '#F5A',
    '#FF5',
    '#FFF'
];

export function decodeCellData(value: number) {
  const isBlinking = (value & BLINK_MASK) !== 0;
  const bgIndex = (value & BACKGROUND_MASK) >> 4;
  const fgIndex = value & FOREGROUND_MASK;
  return {
    isBlinking,
    backgroundColor: BACKGROUND_PALETTE[bgIndex],
    foregroundColor: FOREGROUND_PALETTE[fgIndex],
  };
}

export function encodeCellData({ bgIndex, fgIndex, isBlinking }: { bgIndex: number, fgIndex: number, isBlinking: boolean }): number {
  let value = 0;
  if (isBlinking) value |= BLINK_MASK;
  value |= (bgIndex << 4) & BACKGROUND_MASK;
  value |= fgIndex & FOREGROUND_MASK;
  return value;
}

// export interface CellData {
//     value : number | null; // holds the 8 bit number
//     modified: number | null;
// }

// export function renderCell(cell : HTMLDivElement, value : number) {
//     if (value === null) {
//         cell.style.backgroundColor = '';
//         cell.style.borderColor = '#555'; // Use border for foreground
//         cell.classList.remove('blinking');
//         return;
//     }

//     const decoded = decodeCellData(value);
//     cell.style.backgroundColor = decoded.backgroundColor;
    
//     // We don't have text, so let's use the border to show foreground color
//     cell.style.borderColor = decoded.foregroundColor;
    
//     // Add/remove a CSS class for blinking
//     if (decoded.isBlinking) {
//         cell.classList.add('blinking');
//     } else {
//         cell.classList.remove('blinking');
//     }
// }


/**
 * Converts a 24-bit hex color string to its nearest 16-bit (5-6-5) equivalent.
 * @param {string} hex - The input color, e.g., '#A7C5F9'.
 * @returns {string} The snapped 16-bit color, e.g., '#A5C6F7'.
 */
/*
export function snapTo16BitColor(hex : string) {
  // 1. Remove '#' and parse the hex string into R, G, B integers (0-255)
  const r = parseInt(hex.substring(1, 3), 16);
  const g = parseInt(hex.substring(3, 5), 16);
  const b = parseInt(hex.substring(5, 7), 16);

  // 2. Convert each 8-bit channel to its 5- or 6-bit equivalent
  // We divide by 255 to get a value between 0-1, then multiply by the max value for that bit depth.
  const r5 = Math.round(r / 255 * 31); // 31 is the max value for 5 bits (2^5 - 1)
  const g6 = Math.round(g / 255 * 63); // 63 is the max value for 6 bits (2^6 - 1)
  const b5 = Math.round(b / 255 * 31); // 31 is the max value for 5 bits

  // 3. Convert the 5- and 6-bit values back to the 8-bit range (0-255)
  const r8 = Math.round(r5 / 31 * 255);
  const g8 = Math.round(g6 / 63 * 255);
  const b8 = Math.round(b5 / 31 * 255);

  // 4. Convert the new 8-bit RGB values back to a hex string
  const rHex = r8.toString(16).padStart(2, '0');
  const gHex = g8.toString(16).padStart(2, '0');
  const bHex = b8.toString(16).padStart(2, '0');

  return `#${rHex}${gHex}${bHex}`;
}
  */