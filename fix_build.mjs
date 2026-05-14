/**
 * Fix all remaining template literals containing HTML tags that confuse
 * Vite's vite:build-import-analysis plugin (it misreads > as JSX).
 * 
 * Strategy: Find lines with .innerHTML = `...HTML...` patterns
 * and rewrite them using a safe setHTML() helper pattern.
 */
import { readFileSync, writeFileSync } from 'fs';

const path = 'src/content/features/pages/subscriptions/folder-ui.js';
let txt = readFileSync(path, 'utf8');
let changeCount = 0;

// Fix 1: The remaining problematic lines the scanner reported
// Line 368: select.innerHTML with template literal
// Line 418: playBtn.innerHTML with SVG
// Line 641: btn.innerHTML with SVG  
// Line 667: btn.innerHTML with emoji span
// Line 882: template expression in HTML string (this is inside a larger template)
// Line 1809: item.innerHTML with SVG

// Approach: replace .innerHTML = `<...>` with a safe function call
// We'll add a tiny helper to the top and replace all problematic innerHTML assignments.

// First, let's just do targeted replacements of the ones the scanner found.
// The key ones are ones where the OUTER template literal opens and a > appears before it closes.

// Strategy: Use String.raw or a wrapper to defeat Vite's parser.
// Actually, the safest fix: use a global replace to convert all 
// el.innerHTML = `<...` patterns to el.innerHTML = String.raw`<...` 
// String.raw`` tells Vite's JSX heuristic not to treat this as JSX.

// Replace all instances of: .innerHTML = `<
// with:                      .innerHTML = String.raw`<
const oldPattern = /\.innerHTML\s*=\s*`</g;
const newPattern = '.innerHTML = String.raw`<';

const result = txt.replace(oldPattern, (match) => {
    changeCount++;
    return newPattern;
});

if (changeCount > 0) {
    writeFileSync(path, result);
    console.log(`✓ Fixed ${changeCount} innerHTML template literal(s) with String.raw`);
} else {
    console.log('No innerHTML template literals found - checking for other patterns...');
    // Show what lines have backtick+HTML
    const lines = txt.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('`') && /<[a-zA-Z]/.test(line)) {
            console.log(`  Line ${i+1}: ${line.trim().substring(0, 100)}`);
        }
    }
}
