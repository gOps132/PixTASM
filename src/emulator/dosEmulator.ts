/**
 * DOS Emulator Integration for PixTASM
 * 
 * This module provides a complete DOS environment running in the browser using js-dos v8,
 * enabling native TASM (Turbo Assembler) compilation and execution of generated assembly code.
 * 
 * Key Features:
 * - Loads real TASM.EXE and TLINK.EXE binaries from /public/bin/
 * - Creates executable (.EXE) files that run in authentic DOS environment
 * - No external API dependencies - everything runs client-side
 * - Automatic compilation pipeline: TASM → TLINK → Execute
 * - Error handling for compilation and linking failures
 * 
 * Architecture:
 * 1. Dynamically loads js-dos v8 from CDN
 * 2. Fetches TASM/TLINK binaries from public/bin folder
 * 3. Creates .jsdos bundle with DOSBox configuration
 * 4. Packages user's TASM code with binaries
 * 5. Runs complete compilation pipeline in DOS emulator
 * 
 * Required Files in /public/bin/:
 * - TASM.EXE (Turbo Assembler)
 * - TLINK.EXE (Turbo Linker)
 * - DPMI16BI.OVL (DOS Protected Mode Interface)
 * - RTM.EXE (Runtime Manager)
 * - TASMMSG.DAT (Optional: Error messages)
 * 
 * Usage:
 * 1. Call preloadDosEmulator() on app startup for faster loading
 * 2. Call runTASMCode(tasmSource) to compile and run code
 * 3. Call stopDosEmulator() to cleanup and close modal
 */

// Global state to track the emulator instance
let dosInstance: any = null;
let dosPreloaded = false;

/**
 * Loads the JS-DOS script and CSS from the CDN if not already present.
 * 
 * JS-DOS v8 provides a complete DOS environment in the browser using WebAssembly.
 * This function dynamically loads the required scripts to avoid bundling large dependencies.
 * 
 * @returns Promise that resolves to the Dos constructor function
 * @throws Error if loading fails or times out after 10 seconds
 */
function loadJsDos(): Promise<any> {
    return new Promise((resolve, reject) => {
        if ((window as any).Dos) {
            resolve((window as any).Dos);
            return;
        }
        
        // 1. Load CSS
        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = 'https://v8.js-dos.com/latest/js-dos.css';
        document.head.appendChild(cssLink);
        
        // 2. Load JS
        const script = document.createElement('script');
        script.src = 'https://v8.js-dos.com/latest/js-dos.js';
        
        const timeout = setTimeout(() => {
            reject(new Error('js-dos loading timeout (10s)'));
        }, 10000);
        
        script.onload = () => {
            clearTimeout(timeout);
            // Give it a moment to initialize the global object
            setTimeout(() => {
                if ((window as any).Dos) {
                    resolve((window as any).Dos);
                } else {
                    reject(new Error('js-dos script loaded but Dos object missing'));
                }
            }, 500);
        };
        
        script.onerror = () => {
            clearTimeout(timeout);
            reject(new Error('Failed to load js-dos script from CDN'));
        };
        
        document.head.appendChild(script);
    });
}

/**
 * Preloads the DOS emulator scripts during app initialization.
 * 
 * This improves user experience by loading js-dos in the background,
 * so users don't have to wait when they click the "Run in DOS" button.
 * 
 * Called automatically when the app starts up.
 * 
 * @returns Promise that resolves when preloading is complete
 */
export async function preloadDosEmulator(): Promise<void> {
    if (dosPreloaded) return;
    try {
        await loadJsDos();
        dosPreloaded = true;
        console.log('DOS emulator scripts preloaded');
    } catch (error) {
        console.warn('Failed to preload DOS emulator:', error);
    }
}

/**
 * Compiles and runs TASM code in an authentic DOS environment.
 * 
 * This is the main function that:
 * 1. Creates a .jsdos bundle containing TASM/TLINK binaries and user code
 * 2. Configures DOSBox to automatically compile and run the code
 * 3. Displays the DOS environment in a modal window
 * 
 * The compilation pipeline:
 * - TASM SPRITE.ASM (compile assembly to object file)
 * - TLINK SPRITE.OBJ (link object file to executable)
 * - SPRITE.EXE (run the generated program)
 * 
 * @param tasmCode - The TASM assembly source code to compile and run
 * @returns Promise that resolves when the emulator is started
 */
export async function runTASMCode(tasmCode: string): Promise<void> {
    const dosContainer = document.getElementById('dos-container');
    const modal = document.getElementById('dos-modal');
    
    if (!dosContainer || !modal) {
        console.error("DOM elements 'dos-container' or 'dos-modal' not found.");
        return;
    }
    
    modal.classList.remove('hidden');
    
    // Show loading screen
    dosContainer.innerHTML = `
        <div style="color: #00ff00; font-family: monospace; padding: 20px; background: #000; height: 100%;">
            <div style="color: #ffff00;">🚀 Initializing DOS Environment...</div>
            <div style="margin-top: 10px;">> Loading binaries...</div>
        </div>
    `;
    
    try {
        // 1. Load Dependencies
        const Dos = await loadJsDos();
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        
        // 2. Fetch Binaries (TASM.EXE, TLINK.EXE)
        // These are the real DOS binaries that provide native TASM compilation
        // DPMI16BI.OVL and RTM.EXE are required for TASM to run in protected mode
        const [tasmRes, tlinkRes, dpmi16bires, rtmRes, msgRes] = await Promise.all([
            fetch('/bin/TASM.EXE'),
            fetch('/bin/TLINK.EXE'),
            fetch('/bin/DPMI16BI.OVL'),
            fetch('/bin/RTM.EXE'),
            fetch('/bin/TASMMSG.DAT').catch(() => null) // Optional: for error messages
        ]);
        
        if (!tasmRes.ok || !tlinkRes.ok) {
            throw new Error('Could not find TASM.EXE or TLINK.EXE in /public/bin/');
        }

        const tasmBin = await tasmRes.arrayBuffer();
        const tlinkBin = await tlinkRes.arrayBuffer();
        const dpmi16biBin = await dpmi16bires.arrayBuffer();
        const rtmBin = await rtmRes.arrayBuffer();
        
        // 3. Define DOSBox Configuration
        // This autoexec section runs automatically when DOS starts up
        // It creates a complete compilation pipeline that handles errors gracefully
const dosboxConf = `
[sdl]
autolock=false
fullscreen=false
fulldouble=false
output=texture
sensitivity=100
waitonerror=true

[dosbox]
machine=svga_s3
memsize=16

[cpu]
core=auto
cputype=auto
cycles=max

[autoexec]
@echo off
mount c .
c:
cls
echo =================================
echo      WEB TASM COMPILER (EXE)
echo =================================

REM --- 1. COMPILE ---
echo.
echo [1/3] Compiling Source...
TASM SPRITE.ASM,,;
if errorlevel 1 goto compile_error

REM --- 2. LINK ---
echo.
echo [2/3] Linking Object...
REM REMOVED /t flag here to create an EXE
TLINK SPRITE.OBJ,,;
if errorlevel 1 goto link_error

REM --- 3. RUN ---
echo.
echo [3/3] Running SPRITE.EXE...
echo ---------------------------------
echo.
SPRITE.EXE
goto end

:compile_error
echo.
echo [!] COMPILATION FAILED
goto end

:link_error
echo.
echo [!] LINKING FAILED
goto end

:end
pause
`;

        // 4. Construct the ZIP Bundle
        // The .jsdos bundle format contains:
        // - .jsdos/dosbox.conf: DOSBox configuration
        // - .jsdos/jsdos.json: Metadata for js-dos
        // - Binary files: TASM.EXE, TLINK.EXE, etc.
        // - Source code: SPRITE.ASM (user's code)
        zip.folder('.jsdos')!.file('dosbox.conf', dosboxConf);
        zip.folder('.jsdos')!.file('jsdos.json', JSON.stringify({ version: "8.0", title: "TASM Web" }));
        
        zip.file('TASM.EXE', tasmBin);
        zip.file('TLINK.EXE', tlinkBin);
        zip.file('DPMI16BI.OVL', dpmi16biBin);
        zip.file('RTM.EXE', rtmBin);

        if (msgRes && msgRes.ok) {
            zip.file('TASMMSG.DAT', await msgRes.arrayBuffer());
        }
        zip.file('SPRITE.ASM', tasmCode); // Inject user code
        
        const bundleBlob = await zip.generateAsync({ type: 'blob' });
        const bundleUrl = URL.createObjectURL(bundleBlob);
        
        // 5. Start Emulator
        // Creates the DOS environment and begins execution
        // The emulator will automatically run the autoexec commands
        dosContainer.innerHTML = ''; // Clear loading text
        
        const ci = await Dos(dosContainer, {
            style: "none", // We handle container size via CSS
            url: bundleUrl,
        });
        
        dosInstance = ci;
        
        // Cleanup blob URL to free memory
        setTimeout(() => {
            URL.revokeObjectURL(bundleUrl);
        }, 5000);
        
    } catch (error: any) {
        console.error('DOS Error:', error);
        dosContainer.innerHTML = `
            <div style="color: #ff5555; font-family: monospace; padding: 20px; background: #000; height: 100%;">
                <div style="font-size: 1.2em; margin-bottom: 10px;">❌ System Error</div>
                <div>${error.message}</div>
                <div style="margin-top: 20px; color: #888;">Make sure TASM.EXE and TLINK.EXE are in the /bin folder.</div>
            </div>
        `;
    }
}

/**
 * Stops the DOS emulator and cleans up resources.
 * 
 * This function:
 * - Terminates the running DOS instance
 * - Clears the DOS container DOM
 * - Hides the modal window
 * - Frees up memory and resources
 * 
 * Called when user clicks the close button or ESC key.
 */
export function stopDosEmulator(): void {
    const modal = document.getElementById('dos-modal');
    const dosContainer = document.getElementById('dos-container');
    
    // Stop the DOS instance
    if (dosInstance) {
        try {
            // JS-DOS v8 Command Interface (CI) usually has an exit method
            if (typeof dosInstance.exit === 'function') {
                dosInstance.exit();
            } else if (typeof dosInstance.stop === 'function') {
                dosInstance.stop();
            }
        } catch (error) {
            console.warn('Error stopping DOS instance:', error);
        }
        dosInstance = null;
    }
    
    // Clean up DOM
    if (dosContainer) dosContainer.innerHTML = '';
    if (modal) modal.classList.add('hidden');
}