// src/ui/colorPalette.ts
import { app } from './dom';
import { BACKGROUND_PALETTE } from '../color';

export function createColorPanel(
    panel: HTMLDivElement,
    palette: readonly string[],
    initialSelectedIndex: number | null,
    onColorSelect: (index: number | null) => void,
    panelType?: 'bg' | 'fg'
): void {
    panel.innerHTML = '';
    
    // Add appropriate class for layout
    if (panelType === 'bg') {
        panel.classList.add('bg-colors');
    } else if (panelType === 'fg') {
        panel.classList.add('fg-colors');
    }
    
    palette.forEach((color, index) => {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.backgroundColor = color;
        swatch.dataset.colorIndex = String(index);

        if (index === initialSelectedIndex) {
            swatch.classList.add('selected');
        }

        swatch.addEventListener('click', () => {
            const isCurrentlySelected = swatch.classList.contains('selected');
            
            panel.querySelectorAll('.color-swatch').forEach(sw => sw.classList.remove('selected'));
            
            if (isCurrentlySelected) {
                onColorSelect(null); // Deselect
            } else {
                swatch.classList.add('selected');
                onColorSelect(index);
            }

            if (palette === BACKGROUND_PALETTE && index !== null) {
                 app?.style.setProperty('--change-color', BACKGROUND_PALETTE[index]);
            }
        });
        panel.appendChild(swatch);
    });
}