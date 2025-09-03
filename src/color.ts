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

// export function encodeCellData({ bgIndex, fgIndex, isBlinking }: { bgIndex: number, fgIndex: number, isBlinking: boolean }): number {
//   let value = 0;
//   if (isBlinking) value |= BLINK_MASK;
//   value |= (bgIndex << 4) & BACKGROUND_MASK;
//   value |= fgIndex & FOREGROUND_MASK;
//   return value;
// }

export function encodeCellData({ bgIndex, fgIndex, isBlinking }: { bgIndex: number, fgIndex: number, isBlinking: boolean }): number {
  const background = bgIndex << 4;
  const blink = isBlinking ? BLINK_MASK : 0;

  return blink | background | fgIndex;
}