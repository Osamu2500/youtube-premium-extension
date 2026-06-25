export class HotkeysManager {
    constructor() {
        this.registries = new Map(); // Map<contextId, Array<{ combo: string, callback: function }>>
        this._boundHandler = this.handleKeyDown.bind(this);
        this.isActive = false;
        
        // Single source of truth modifier map
        this.shiftMap = { '<': ',', '>': '.', ':': ';', '"': "'", '{': '[', '}': ']', '|': '\\', '?': '/', '~': '`', '!': '1', '@': '2', '#': '3', '$': '4', '%': '5', '^': '6', '&': '7', '*': '8', '(': '9', ')': '0', '_': '-', '+': '=' };
    }

    /**
     * Initializes the global keydown listener.
     */
    init() {
        if (this.isActive) return;
        // Listen in capture phase to intercept before YouTube, but we only preventDefault if there is an EXACT match
        document.addEventListener('keydown', this._boundHandler, true);
        this.isActive = true;
    }

    /**
     * Cleans up the global listener.
     */
    destroy() {
        if (!this.isActive) return;
        document.removeEventListener('keydown', this._boundHandler, true);
        this.isActive = false;
        this.registries.clear();
    }

    /**
     * Registers a set of shortcuts for a specific feature context.
     * @param {string} contextId - E.g. 'keyboard-shortcuts' or 'vsc'
     * @param {Array<{ combo: string, callback: function }>} bindings 
     */
    register(contextId, bindings) {
        this.registries.set(contextId, bindings.map(b => ({
            combo: this._normalizeCombo(b.combo),
            callback: b.callback
        })));
    }

    /**
     * Unregisters all shortcuts for a specific context.
     * @param {string} contextId 
     */
    unregister(contextId) {
        this.registries.delete(contextId);
    }

    /**
     * The main event handler.
     * @param {KeyboardEvent} e 
     */
    handleKeyDown(e) {
        // 1. Skip if typing in an input field or contenteditable
        const target = e.target;
        if (!target) return;
        
        const isInput = target.tagName === 'INPUT' || 
                        target.tagName === 'TEXTAREA' || 
                        target.isContentEditable ||
                        target.closest('ytd-searchbox') ||
                        target.closest('paper-input') ||
                        target.closest('iron-input') ||
                        target.closest('[contenteditable="true"]') ||
                        target.getAttribute('role') === 'textbox';
        
        if (isInput) return;

        // 2. Parse the pressed key combo
        const combo = this._comboFromEvent(e);
        if (!combo) return;

        // 3. Check for matches across all registries
        let handled = false;
        for (const bindings of this.registries.values()) {
            for (const binding of bindings) {
                if (binding.combo === combo) {
                    // Match found! Prevent default to stop YouTube from processing it
                    if (!handled) {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        handled = true;
                    }
                    
                    try {
                        binding.callback(e);
                    } catch (err) {
                        console.error(`[YPP HotkeysManager] Error executing shortcut callback for ${combo}:`, err);
                    }
                }
            }
        }
    }

    /**
     * Build a normalized combo string from a KeyboardEvent.
     * @param {KeyboardEvent} e
     * @returns {string} e.g. "Shift+Z" or "Ctrl+Alt+P"
     */
    _comboFromEvent(e) {
        const parts = [];
        if (e.ctrlKey)  parts.push('Ctrl');
        if (e.altKey)   parts.push('Alt');
        if (e.shiftKey) parts.push('Shift');
        if (e.metaKey)  parts.push('Meta');

        let key = e.key;
        
        // Handle shift mapping for symbols
        if (e.shiftKey && this.shiftMap[key]) {
            key = this.shiftMap[key];
        }
        
        if (key === ' ') key = 'Space';

        // Ignore if only modifier is pressed
        if (['Control', 'Shift', 'Alt', 'Meta'].includes(key)) return '';

        // Capitalize single letters
        key = key.length === 1 ? key.toUpperCase() : key;
        
        parts.push(key);
        return parts.join('+');
    }

    /**
     * Normalize a config combo string to match our standard format.
     * @param {string} combo - e.g. "shift+z" or "Ctrl+alt+p"
     * @returns {string} - e.g. "Shift+Z"
     */
    _normalizeCombo(combo) {
        if (!combo) return '';
        const parts = combo.split('+');
        const hasShift = parts.some(p => p.toLowerCase() === 'shift');
        
        return parts.map((part, i, arr) => {
            if (i < arr.length - 1) {
                // Modifier: capitalize first letter
                return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
            }
            // Actual key
            let key = part;
            if (hasShift && this.shiftMap[key]) {
                key = this.shiftMap[key];
            }
            return key.length === 1 ? key.toUpperCase() : key;
        }).join('+');
    }
}

// Create a global singleton
window.YPP = window.YPP || {};
window.YPP.hotkeysManager = new HotkeysManager();
window.YPP.hotkeysManager.init();
