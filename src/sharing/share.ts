/**
 * @file share.ts
 * @brief Project sharing functionality via URL encoding
 */

import * as state from '../state/appState';
import { renderGrid } from '../grid/canvasGrid';
import type { CellContent } from '../types';

/**
 * @brief Uploads project data to dpaste and returns share ID
 * @return Promise resolving to share ID or null if failed
 */
async function uploadToCloud(projectData: any): Promise<string | null> {
    try {
        const formData = new FormData();
        formData.append('content', JSON.stringify(projectData));
        formData.append('syntax', 'json');
        formData.append('expiry_days', '365');
        
        const response = await fetch('https://dpaste.com/api/v2/', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const url = await response.text();
            return url.trim().split('/').pop()?.replace('.txt', '') || null;
        }
    } catch (error) {
        console.error('Failed to upload to cloud:', error);
    }
    return null;
}

/**
 * @brief Downloads project data from dpaste using share ID
 * @param shareId The share ID to fetch
 * @return Promise resolving to project data or null if failed
 */
async function downloadFromCloud(shareId: string): Promise<any | null> {
    try {
        const response = await fetch(`https://dpaste.com/${shareId}.txt`);
        if (response.ok) {
            const content = await response.text();
            return JSON.parse(content);
        }
    } catch (error) {
        console.error('Failed to download from cloud:', error);
    }
    return null;
}
/**
 * @brief Generates a shareable URL for the current project
 * @return Base64 encoded URL with project data
 */
export async function generateShareURL(): Promise<string> {
    const gridData = state.getGridData();
    const compressedCells: number[] = [];
    
    // Ultra-compressed format: pack multiple values into single numbers
    for (let row = 0; row < gridData.length; row++) {
        for (let col = 0; col < gridData[row].length; col++) {
            const cell = gridData[row][col];
            if (cell && (cell.charCode !== null || cell.attribute !== null)) {
                // Pack: row(8bits) + col(8bits) + char(8bits) + attr(8bits) = 32bits
                const packed = (row << 24) | (col << 16) | ((cell.charCode || 0) << 8) | (cell.attribute || 0);
                compressedCells.push(packed);
            }
        }
    }
    
    const projectData = {
        n: state.getCurrentProjectName().slice(0, 20), // Limit name length
        r: state.getGridRows(),
        c: state.getGridCols(),
        d: compressedCells
    };
    
    // Convert to minimal JSON then compress with LZString-like algorithm
    const jsonStr = JSON.stringify(projectData).replace(/"([^"]+)":/g, '$1:');
    const compressed = compressString(jsonStr);
    const encoded = btoa(compressed);
    const baseURL = window.location.origin + window.location.pathname;
    
    if (encoded.length > 1800) {
        // Use cloud storage for very large projects
        const shareId = await uploadToCloud(projectData);
        if (shareId) {
            return `${baseURL}?id=${shareId}`;
        }
        alert('Project too large to share. Try reducing artwork complexity.');
        return '';
    } else {
        // Use URL encoding for compressed projects
        return `${baseURL}?c=${encoded}`;
    }
}

/**
 * @brief Simple string compression using run-length encoding
 * @param str String to compress
 * @return Compressed string
 */
function compressString(str: string): string {
    let compressed = '';
    let i = 0;
    
    while (i < str.length) {
        let count = 1;
        const char = str[i];
        
        // Count consecutive identical characters
        while (i + count < str.length && str[i + count] === char && count < 255) {
            count++;
        }
        
        if (count > 3) {
            // Use run-length encoding for sequences > 3
            compressed += `~${count.toString(36)}${char}`;
        } else {
            // Just add the characters
            compressed += char.repeat(count);
        }
        
        i += count;
    }
    
    return compressed;
}

/**
 * @brief Decompresses a run-length encoded string
 * @param str Compressed string
 * @return Decompressed string
 */
function decompressString(str: string): string {
    let decompressed = '';
    let i = 0;
    
    while (i < str.length) {
        if (str[i] === '~') {
            // Run-length encoded sequence
            let countStr = '';
            i++; // Skip ~
            
            // Read count in base36
            while (i < str.length && str[i] !== str[i].match(/[^0-9a-z]/)?.[0]) {
                if ('0123456789abcdefghijklmnopqrstuvwxyz'.includes(str[i])) {
                    countStr += str[i];
                    i++;
                } else {
                    break;
                }
            }
            
            const count = parseInt(countStr, 36);
            const char = str[i];
            decompressed += char.repeat(count);
            i++;
        } else {
            decompressed += str[i];
            i++;
        }
    }
    
    return decompressed;
}

/**
 * @brief Loads a project from URL parameters if present
 * @return True if project was loaded from URL, false otherwise
 */
export async function loadFromURL(): Promise<boolean> {
    const urlParams = new URLSearchParams(window.location.search);
    const shareData = urlParams.get('s') || urlParams.get('share');
    const compressedData = urlParams.get('c');
    const cloudId = urlParams.get('id');
    
    // Check if there's a share to load
    if (!shareData && !compressedData && !cloudId) {
        return false;
    }
    
    // Check for unsaved changes before loading shared project
    if (state.hasUnsavedChanges()) {
        const save = confirm(`You have unsaved changes in "${state.getCurrentProjectName()}". Save before loading shared project?`);
        if (save) {
            // Try to save current project first
            const currentProject = state.getCurrentProjectName();
            if (currentProject !== 'Untitled Project') {
                try {
                    const { saveProject } = await import('../storage/saveLoad');
                    saveProject(currentProject);
                    state.markAsSaved();
                } catch (error) {
                    alert('Failed to save current project');
                    return false;
                }
            } else {
                const saveName = prompt('Enter name for current project:');
                if (saveName && saveName.trim()) {
                    try {
                        const { saveProject } = await import('../storage/saveLoad');
                        saveProject(saveName.trim());
                        state.markAsSaved();
                    } catch (error) {
                        alert('Failed to save current project');
                        return false;
                    }
                } else {
                    return false; // User cancelled save
                }
            }
        }
    }
    
    let decoded: any = null;
    
    if (cloudId) {
        // Load from cloud storage
        decoded = await downloadFromCloud(cloudId);
        if (!decoded) {
            alert('Failed to load shared project from cloud.');
            return false;
        }
    } else if (compressedData) {
        // Load from compressed URL encoding
        try {
            const decompressed = decompressString(atob(compressedData));
            decoded = JSON.parse(decompressed);
        } catch (error) {
            console.error('Failed to decompress share data:', error);
            return false;
        }
    } else if (shareData) {
        // Load from old URL encoding
        try {
            decoded = JSON.parse(atob(shareData));
        } catch (error) {
            console.error('Failed to decode share data:', error);
            return false;
        }
    } else {
        return false;
    }
    
    try {
        // Support both old and new format
        const rows = decoded.r || decoded.rows;
        const cols = decoded.c || decoded.cols;
        const name = decoded.n || decoded.name;
        const cellData = decoded.d || decoded.gridData;
        
        if (!rows || !cols) {
            throw new Error('Invalid share data structure');
        }
        
        // Reconstruct grid from compressed data
        const gridData: (CellContent | null)[][] = [];
        for (let i = 0; i < rows; i++) {
            gridData[i] = [];
            for (let j = 0; j < cols; j++) {
                gridData[i][j] = null;
            }
        }
        
        // Fill in non-empty cells
        if (Array.isArray(cellData)) {
            if (cellData.length > 0 && typeof cellData[0] === 'number') {
                // New ultra-compressed format (packed integers)
                cellData.forEach((packed: number) => {
                    const row = (packed >> 24) & 0xFF;
                    const col = (packed >> 16) & 0xFF;
                    const charCode = (packed >> 8) & 0xFF;
                    const attribute = packed & 0xFF;
                    
                    if (row < rows && col < cols) {
                        gridData[row][col] = {
                            charCode: charCode || null,
                            attribute: attribute || null
                        };
                    }
                });
            } else if (cellData.length > 0 && Array.isArray(cellData[0])) {
                // Old compressed format (arrays)
                cellData.forEach(([row, col, charCode, attribute]) => {
                    if (row < rows && col < cols) {
                        gridData[row][col] = { charCode, attribute };
                    }
                });
            } else {
                // Very old full grid format
                for (let i = 0; i < Math.min(rows, cellData.length); i++) {
                    for (let j = 0; j < Math.min(cols, cellData[i]?.length || 0); j++) {
                        gridData[i][j] = cellData[i][j];
                    }
                }
            }
        }
        
        // Load the shared project (keep current project name)
        state.setGridDimensions(rows, cols);
        state.setGridData(gridData);
        // Don't change the project name - keep the current one
        
        // Update UI
        const rowsInput = document.getElementById('rows-input') as HTMLInputElement;
        const colsInput = document.getElementById('cols-input') as HTMLInputElement;
        if (rowsInput) rowsInput.value = String(rows);
        if (colsInput) colsInput.value = String(cols);
        
        renderGrid();
        
        // Clear URL to prevent reloading on refresh
        window.history.replaceState({}, document.title, window.location.pathname);
        
        return true;
    } catch (error) {
        console.error('Failed to load shared project:', error);
        return false;
    }
}

/**
 * @brief Copies the share URL to clipboard
 */
export async function copyShareURL(): Promise<void> {
    const shareURL = await generateShareURL();
    if (!shareURL) return;
    
    navigator.clipboard.writeText(shareURL).then(() => {
        alert('Share link copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy share URL:', err);
        prompt('Copy this share URL:', shareURL);
    });
}