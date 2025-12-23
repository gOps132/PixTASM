// src/ui/dom.ts

import drawSVG from '/draw.svg';
import eraseSVG from '/erase.svg';
import textSVG from '/text.svg';
import winkSVG from '/wink.svg';
import codeSVG from '/code.svg';
import panSVG from '/pan.svg';
import fillSVG from '/fill.svg';
import undoSVG from '/undo.svg';
import saveSVG from '/save.svg';
import loadSVG from '/load.svg';
import deleteSVG from '/delete.svg';
import eraseAllSVG from '/erase-all.svg';
import shareSVG from '/share.svg';

export const app: HTMLElement = document.getElementById('app')!;
if (!app) throw new Error('Failed to find the app element');

export function setupUI(): void {
    app.innerHTML = `
    <header class="header">
        <div class="logo">PixTASM</div>
        <div class="header-controls">
        <button id="play-btn" class="btn primary" aria-label="Run Code" title="Run Code">
            ▶ Run
        </button>
            <button id="toggle-sidebar-btn" class="btn" aria-label="Toggle Sidebar" title="Toggle Sidebar">
                ☰
            </button>
        </div>
    </header>
    
    <div class="main-content">
        <aside id="sidebar" class="sidebar">
            <div class="section">
                <h3 class="section-title collapsible" data-section="file">
                    File
                    <span class="collapse-icon">▼</span>
                </h3>
                <div class="section-content" data-section="file">
                    <div class="export-actions file-actions">
                        <button id="new-btn" class="btn" aria-label="New Project" title="New Project (Ctrl+N)">
                            ➕
                        </button>
                        <button id="save-btn" class="btn" aria-label="Save Project" title="Save Project (Ctrl+S)">
                            <img src=${saveSVG} class="btn-icon"/>
                        </button>
                        <button id="load-btn" class="btn" aria-label="Load Project" title="Load Project">
                            <img src=${loadSVG} class="btn-icon"/>
                        </button>
                        <button id="delete-btn" class="btn" aria-label="Delete Project" title="Delete Project (Ctrl+Backspace)">
                            <img src=${deleteSVG} class="btn-icon"/>
                        </button>
                        <button id="share-btn" class="btn" aria-label="Share Project" title="Share Project">
                            <img src=${shareSVG} class="btn-icon"/>
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <h3 class="section-title collapsible" data-section="grid">
                    Grid Settings
                    <span class="collapse-icon">▼</span>
                </h3>
                <div class="section-content" data-section="grid">
                    <div class="grid-controls">
                        <div class="input-group">
                            <label class="input-label">Rows</label>
                            <input type="number" id="rows-input" class="size-input" value="10" min="1" max="25">
                        </div>
                        <div class="input-group">
                            <label class="input-label">Cols</label>
                            <input type="number" id="cols-input" class="size-input" value="10" min="1" max="80">
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <h3 class="section-title collapsible" data-section="tools">
                    Tools
                    <span class="collapse-icon">▼</span>
                </h3>
                <div class="section-content" data-section="tools">
                    <div class="tool-grid">
                        <button id="draw-btn" class="btn" aria-label="Draw" title="Draw (D)">
                            <img src=${drawSVG} class="btn-icon"/>
                        </button>
                        <button id="erase-btn" class="btn" aria-label="Erase" title="Erase (E)">
                            <img src=${eraseSVG} class="btn-icon"/>
                        </button>
                        <button id="text-btn" class="btn" aria-label="Text Mode" title="Text Mode (T)">
                            <img src=${textSVG} class="btn-icon"/>
                        </button>
                        <button id="blink-btn" class="btn" aria-label="Toggle Blinking" title="Toggle Blinking (B)">
                            <img src=${winkSVG} class="btn-icon"/>
                        </button>
                        <button id="fill-btn" class="btn" aria-label="Fill" title="Fill (F)">
                            <img src=${fillSVG} class="btn-icon"/>
                        </button>
                        <button id="clear-btn" class="btn" aria-label="Clear All" title="Clear All">
                            <img src=${eraseAllSVG} class="btn-icon"/>
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <h3 class="section-title collapsible" data-section="view">
                    View
                    <span class="collapse-icon">▼</span>
                </h3>
                <div class="section-content" data-section="view">
                    <div class="tool-grid">
                        <button id="zoom-in-btn" class="btn" aria-label="Zoom In" title="Zoom In">
                            +
                        </button>
                        <button id="zoom-out-btn" class="btn" aria-label="Zoom Out" title="Zoom Out">
                            -
                        </button>
                        <button id="zoom-reset-btn" class="btn" aria-label="Reset Zoom" title="Reset Zoom">
                            1:1
                        </button>
                        <button id="pan-reset-btn" class="btn" aria-label="Reset Pan" title="Reset Pan">
                            ⌖
                        </button>
                        <button id="pan-btn" class="btn" aria-label="Pan Mode" title="Pan Mode (P)">
                            <img src=${panSVG} class="btn-icon"/>
                        </button>
                        <button id="undo-btn" class="btn" aria-label="Undo" title="Undo (Ctrl+Z)">
                            <img src=${undoSVG} class="btn-icon"/>
                        </button>
                        <button id="redo-btn" class="btn" aria-label="Redo" title="Redo (Ctrl+Y)">
                            <img src=${undoSVG} class="btn-icon" style="transform: scaleX(-1)"/>
                        </button>
                        <span id="zoom-level" class="zoom-indicator">100%</span>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <h3 class="section-title collapsible" data-section="bg-colors">
                    Background Colors
                    <span class="collapse-icon">▼</span>
                </h3>
                <div class="section-content" data-section="bg-colors">
                    <div id="bg-color-panel" class="color-panel"></div>
                </div>
            </div>
            
            <div class="section">
                <h3 class="section-title collapsible" data-section="fg-colors">
                    Foreground Colors
                    <span class="collapse-icon">▼</span>
                </h3>
                <div class="section-content" data-section="fg-colors">
                    <div id="fg-color-panel" class="color-panel"></div>
                </div>
            </div>
            
            <div class="section">
                <h3 class="section-title collapsible" data-section="export">
                    Export
                    <span class="collapse-icon">▼</span>
                </h3>
                <div class="section-content" data-section="export">
                    <div class="export-actions">
                        <button id="render-btn" class="btn" aria-label="Export TASM Code" title="Copy TASM Code">
                            <img src=${codeSVG} class="btn-icon"/>
                        </button>
                        <button id="export-db-btn" class="btn" aria-label="Export DB Format" title="Export DB Format">
                            DB
                        </button>
                    </div>
                </div>
            </div>
        </aside>
        
        <main class="canvas-area">
            <div class="grid-container"></div>
        </main>
    </div>
    
    <!-- Save/Load Modal -->
    <div id="save-modal" class="modal hidden">
        <div class="modal-content">
            <div class="modal-header">
                <h3 id="save-modal-title">Save Project</h3>
                <button id="save-modal-close" class="btn">×</button>
            </div>
            <div class="modal-body">
                <input type="text" id="save-name-input" class="text-input" placeholder="Enter save name..." maxlength="50">
                <div id="save-list" class="save-list"></div>
            </div>
            <div class="modal-footer">
                <button id="save-confirm-btn" class="btn primary">Save</button>
                <button id="save-cancel-btn" class="btn">Cancel</button>
            </div>
        </div>
    </div>
    
    <!-- DOS Emulator Modal -->
    <div id="dos-modal" class="dos-modal hidden">
        <div class="dos-modal-content">
            <div class="dos-modal-header">
                <h3>DOS Emulator</h3>
                <button id="stop-dos-btn" class="btn">
                    ■ Stop
                </button>
            </div>
            <div id="dos-container" class="dos-container"></div>
        </div>
    </div>
    `;
}

// --- Exported DOM Element References ---
export let newBtn: HTMLButtonElement;
export let saveBtn: HTMLButtonElement;
export let loadBtn: HTMLButtonElement;
export let deleteBtn: HTMLButtonElement;
export let shareBtn: HTMLButtonElement;

export let drawBtn: HTMLButtonElement;
export let eraseBtn: HTMLButtonElement;
export let blinkBtn: HTMLButtonElement;
export let textBtn: HTMLButtonElement;
export let renderBtn: HTMLButtonElement;
export let exportDbBtn: HTMLButtonElement;

export let playBtn: HTMLButtonElement;
export let stopDosBtn: HTMLButtonElement;

export let toggleSidebarBtn: HTMLButtonElement;
export let fillBtn: HTMLButtonElement;
export let panBtn: HTMLButtonElement;
export let panResetBtn: HTMLButtonElement;
export let clearBtn: HTMLButtonElement;

export let undoBtn: HTMLButtonElement;
export let redoBtn: HTMLButtonElement;

export let zoomInBtn: HTMLButtonElement;
export let zoomOutBtn: HTMLButtonElement;
export let zoomResetBtn: HTMLButtonElement;
export let zoomLevel: HTMLSpanElement;

export let rowsInput: HTMLInputElement;
export let colsInput: HTMLInputElement;

export let bgColorPanel: HTMLDivElement;
export let fgColorPanel: HTMLDivElement;

export const gridContainer: HTMLDivElement = document.createElement('div');
gridContainer.className = 'grid-container';


/**
 * Finds and assigns the DOM elements to their respective variables.
 * MUST be called after setupUI().
 */
export function initializeDOMElements(): void {
    newBtn = document.getElementById('new-btn') as HTMLButtonElement;
    saveBtn = document.getElementById('save-btn') as HTMLButtonElement;
    loadBtn = document.getElementById('load-btn') as HTMLButtonElement;
    deleteBtn = document.getElementById('delete-btn') as HTMLButtonElement;
    shareBtn = document.getElementById('share-btn') as HTMLButtonElement;

    playBtn = document.getElementById('play-btn') as HTMLButtonElement;
    stopDosBtn = document.getElementById('stop-dos-btn') as HTMLButtonElement;

    toggleSidebarBtn = document.getElementById('toggle-sidebar-btn') as HTMLButtonElement;
    fillBtn = document.getElementById('fill-btn') as HTMLButtonElement;
    panBtn = document.getElementById('pan-btn') as HTMLButtonElement;
    panResetBtn = document.getElementById('pan-reset-btn') as HTMLButtonElement;
    clearBtn = document.getElementById('clear-btn') as HTMLButtonElement;

    drawBtn = document.getElementById('draw-btn') as HTMLButtonElement;
    eraseBtn = document.getElementById('erase-btn') as HTMLButtonElement;
    blinkBtn = document.getElementById('blink-btn') as HTMLButtonElement;
    textBtn = document.getElementById('text-btn') as HTMLButtonElement;
    renderBtn = document.getElementById('render-btn') as HTMLButtonElement;
    exportDbBtn = document.getElementById('export-db-btn') as HTMLButtonElement;

    undoBtn = document.getElementById('undo-btn') as HTMLButtonElement;
    redoBtn = document.getElementById('redo-btn') as HTMLButtonElement;

    zoomInBtn = document.getElementById('zoom-in-btn') as HTMLButtonElement;
    zoomOutBtn = document.getElementById('zoom-out-btn') as HTMLButtonElement;
    zoomResetBtn = document.getElementById('zoom-reset-btn') as HTMLButtonElement;
    zoomLevel = document.getElementById('zoom-level') as HTMLSpanElement;

    rowsInput = document.getElementById('rows-input') as HTMLInputElement;
    colsInput = document.getElementById('cols-input') as HTMLInputElement;

    bgColorPanel = document.getElementById('bg-color-panel') as HTMLDivElement;
    fgColorPanel = document.getElementById('fg-color-panel') as HTMLDivElement;

    // Find the grid container in the new structure
    const gridContainerElement = document.querySelector('.grid-container') as HTMLDivElement;
    if (gridContainerElement) {
        // Replace the created gridContainer with the one from DOM
        gridContainer.className = gridContainerElement.className;
        gridContainerElement.parentNode?.replaceChild(gridContainer, gridContainerElement);
    }

    // Initialize collapsible sections
    initializeCollapsibleSections();

    // Quick check to ensure they were found
    if (!bgColorPanel || !drawBtn) {
        throw new Error("Failed to initialize DOM elements after UI setup.");
    }
}

/**
 * Initialize collapsible section functionality
 */
function initializeCollapsibleSections(): void {
    const collapsibleTitles = document.querySelectorAll('.section-title.collapsible');

    collapsibleTitles.forEach(title => {
        title.addEventListener('click', () => {
            const sectionName = title.getAttribute('data-section');
            const content = document.querySelector(`.section-content[data-section="${sectionName}"]`) as HTMLElement;

            if (content) {
                const isCollapsed = title.classList.contains('collapsed');

                if (isCollapsed) {
                    // Expand
                    title.classList.remove('collapsed');
                    content.classList.remove('collapsed');
                    content.style.maxHeight = content.scrollHeight + 'px';
                } else {
                    // Collapse
                    title.classList.add('collapsed');
                    content.classList.add('collapsed');
                    content.style.maxHeight = '0';
                }
            }
        });
    });

    // Set initial max-height for all sections
    const allSectionContents = document.querySelectorAll('.section-content');
    allSectionContents.forEach(content => {
        const element = content as HTMLElement;
        element.style.maxHeight = element.scrollHeight + 'px';
    });
}
