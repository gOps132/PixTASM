/**
 * @file color.ts
 * @brief Color palette definitions and attribute encoding/decoding functions
 */

/** Bitmask for blinking attribute */
export const BLINK_MASK = 0b10000000;
/** Bitmask for background color bits */
export const BACKGROUND_MASK = 0b01110000;
/** Bitmask for foreground color bits */
export const FOREGROUND_MASK = 0b00001111;

/** 8-color background palette (CGA colors) */
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

/** 16-color foreground palette (CGA + bright colors) */
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

/**
 * @brief Decodes a cell attribute byte into color and blink information
 * @param value The attribute byte to decode
 * @return Object containing blink state, color indices, and color values
 */
export function decodeCellData(value: number) {
  const isBlinking = (value & BLINK_MASK) !== 0;
  const bgIndex = (value & BACKGROUND_MASK) >> 4;
  const fgIndex = value & FOREGROUND_MASK;
  return {
    isBlinking,
    bgIndex,
    fgIndex,
    backgroundColor: BACKGROUND_PALETTE[bgIndex],
    foregroundColor: FOREGROUND_PALETTE[fgIndex],
  };
}

/**
 * @brief Encodes color and blink information into a cell attribute byte
 * @param bgIndex Background color index (0-7)
 * @param fgIndex Foreground color index (0-15)
 * @param isBlinking Whether the cell should blink
 * @return Encoded attribute byte
 */
export function encodeCellData({ bgIndex, fgIndex, isBlinking }: { bgIndex: number, fgIndex: number, isBlinking: boolean }): number {
  const background = bgIndex << 4;
  const blink = isBlinking ? BLINK_MASK : 0;

  return blink | background | fgIndex;
}