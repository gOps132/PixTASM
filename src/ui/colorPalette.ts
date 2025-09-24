// src/ui/colorPalette.ts
import { app } from './dom';
import { BACKGROUND_PALETTE } from '../color';

export function createColorPanel(
    panel: HTMLDivElement,
    palette: readonly string[],
    initialSelectedIndex: number,
    onColorSelect: (index: number) => void
): void {
    panel.innerHTML = '';
    palette.forEach((color, index) => {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.backgroundColor = color;
        swatch.dataset.colorIndex = String(index);

        if (index === initialSelectedIndex) {
            swatch.classList.add('selected');
        }

        swatch.addEventListener('click', () => {
            onColorSelect(index);

            panel.querySelectorAll('.color-swatch').forEach(sw => sw.classList.remove('selected'));
            swatch.classList.add('selected');

            if (palette === BACKGROUND_PALETTE) { // Check if it's the background palette
                 app?.style.setProperty('--change-color', BACKGROUND_PALETTE[index]);
            }
        });
        panel.appendChild(swatch);
    });
}