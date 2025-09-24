// src/ui/dom.ts

import drawSVG from '/draw.svg';
import eraseSVG from '/erase.svg';
import textSVG from '/text.svg';
import winkSVG from '/wink.svg';
import codeSVG from '/code.svg';
import resizeSVG from '/resize.svg'

export const app: HTMLElement = document.getElementById('app')!;
if (!app) throw new Error('Failed to find the app element');

export function setupUI(): void {
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
}

// --- Exported DOM Element References ---
export let drawBtn : HTMLButtonElement;
export let eraseBtn : HTMLButtonElement;
export let blinkBtn : HTMLButtonElement;
export let textBtn : HTMLButtonElement;
export let renderBtn : HTMLButtonElement;
export let resizeBtn : HTMLButtonElement;

export let rowsInput : HTMLInputElement;
export let colsInput : HTMLInputElement;

export let bgColorPanel : HTMLDivElement;
export let fgColorPanel : HTMLDivElement;

export const gridContainer: HTMLDivElement = document.createElement('div');
gridContainer.className = 'grid-container';


/**
 * Finds and assigns the DOM elements to their respective variables.
 * MUST be called after setupUI().
 */
export function initializeDOMElements(): void {
    drawBtn = document.getElementById('draw-btn') as HTMLButtonElement;
    eraseBtn = document.getElementById('erase-btn') as HTMLButtonElement;
    blinkBtn = document.getElementById('blink-btn') as HTMLButtonElement;
    textBtn = document.getElementById('text-btn') as HTMLButtonElement;
    renderBtn = document.getElementById('render-btn') as HTMLButtonElement;
    resizeBtn = document.getElementById('resize-btn') as HTMLButtonElement;

    rowsInput = document.getElementById('rows-input') as HTMLInputElement;
    colsInput = document.getElementById('cols-input') as HTMLInputElement;

    bgColorPanel = document.getElementById('bg-color-panel') as HTMLDivElement;
    fgColorPanel = document.getElementById('fg-color-panel') as HTMLDivElement;
    
    // Quick check to ensure they were found
    if (!bgColorPanel || !drawBtn) {
        throw new Error("Failed to initialize DOM elements after UI setup.");
    }
}
