import './style.css'
import typescriptLogo from './typescript.svg'
import viteLogo from '/vite.svg'
import { setupCounter } from './counter.ts'

import colorSVG from '../public/color.svg'

/**
 * TODO:
 *  [ ] basic drawing functionality
 *  [ ] grid size selection
 *  [ ] grid size persistence
 *  [ ] erasing functionality
 *  [ ] color selection
 *  [ ] save/load functionality
 *  [ ] export functionality (tasm)
 */

const app = document.getElementById('app')!
if (!app) {
  throw new Error('Failed to find the app element')
}

app.innerHTML = `
<div>
  <div class="controls">
    <button id="draw-btn" class="control-btn active" aria-label="Draw">
      <!-- Paste Pencil SVG Here -->
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
    </button>
    <button id="erase-btn" class="control-btn" aria-label="Erase">
      <!-- Paste Eraser SVG Here -->
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.49 4.51a2.828 2.828 0 1 1-4 4L8.5 16.51 4 21l-1.5-1.5L7.5 15l-4-4 4-4Z"/><path d="m15 5 4 4"/></svg>
    </button>
  </div>
</div>
`;

const GRID_ROWS = 20;
const GRID_COLS = 20;
const gridContainer = document.createElement('div')
gridContainer.className = 'grid-container'
gridContainer.style.setProperty('--grid-cols', String(GRID_COLS));
gridContainer.style.setProperty('--grid-rows', String(GRID_ROWS));

// button elements
const drawBtn = document.getElementById('draw-btn') as HTMLButtonElement;
const eraseBtn = document.getElementById('erase-btn') as HTMLButtonElement;

drawBtn.addEventListener('click', () => {
  // Set the state
  isDrawing = true;
  isErasing = false;
  
  // Update the UI
  drawBtn.classList.add('active');
  eraseBtn.classList.remove('active');
});

eraseBtn.addEventListener('click', () => {
  // Set the state
  isDrawing = false;
  isErasing = true;
  
  // Update the UI
  eraseBtn.classList.add('active');
  drawBtn.classList.remove('active');
});

// State variables for drawing
let isErasing     : Boolean = false;
let isDrawing     : Boolean = true;

let isMouseDown   : Boolean = false;

// mouse down and mouse move work together to allow click and drag drawing
gridContainer.addEventListener('mousedown', (e) => {
  isMouseDown = true;
  e.preventDefault();
  const target = e.target as HTMLDivElement;
  if (target.classList.contains('cell')) {
    if (isErasing && target.classList.contains('selected')) {
      target.classList.remove('selected');
    } else if (isDrawing && !target.classList.contains('selected')) {
      target.classList.add('selected');
    }
  }
});

gridContainer.addEventListener('mousemove', (e) => {
  if (!isMouseDown) return;
  e.preventDefault();
  const target = e.target as HTMLDivElement;
  if (target.classList.contains('cell')) {
    if (isErasing && target.classList.contains('selected')) {
      target.classList.remove('selected');
    } else if (isDrawing && !target.classList.contains('selected')) {
      target.classList.add('selected');
    }
  }
});

gridContainer.addEventListener('mouseup', () => {
  isMouseDown = false;
});

// Create and append grid cells
for (let i = 0; i < GRID_ROWS; i++) {
  for (let j = 0; j < GRID_COLS; j++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.row = String(i);
    cell.dataset.col = String(j);
    gridContainer.appendChild(cell);
  }
}

app.appendChild(gridContainer);
