export class LayoutManager {
    constructor() {
        this.state = {
            sidebarLayout: 'compact', // 'compact' | 'expanded'
            theaterMode: false,
            distractionFreeMode: 'none', // 'none' | 'zen' | 'focus' | 'study' | 'cinema'
            sidebarComments: false,
        };

        this.bodyClasses = new Set();
        this.htmlClasses = new Set();
    }

    /**
     * Initializes the LayoutManager.
     */
    init() {
        // Run application of states
        this._applyState();
        
        // Listen to SPA navigations to ensure our states stick
        window.addEventListener('yt-navigate-finish', () => this._applyState());
    }

    /**
     * Set a specific layout property and trigger re-render.
     * @param {string} key 
     * @param {any} value 
     */
    setState(key, value) {
        if (this.state[key] !== value) {
            this.state[key] = value;
            this._applyState();
        }
    }

    /**
     * Apply the current state machine to the DOM classes
     */
    _applyState() {
        const body = document.body;
        const html = document.documentElement;
        if (!body || !html) return;

        const newBodyClasses = new Set();
        const newHtmlClasses = new Set();

        // 1. Sidebar Base Layout
        if (this.state.sidebarLayout === 'expanded') {
            newBodyClasses.add('ypp-sidebar-expanded');
        } else {
            newBodyClasses.add('ypp-sidebar-compact');
        }

        // 2. Distraction Free Modes (Override Base Layout)
        if (this.state.distractionFreeMode !== 'none') {
            newBodyClasses.add(`ypp-mode-${this.state.distractionFreeMode}`);
        }

        // 3. Sidebar Comments
        if (this.state.sidebarComments) {
            newHtmlClasses.add('ypp-sidebar-comments-active');
        }

        // Apply diff to HTML
        for (const cls of this.htmlClasses) {
            if (!newHtmlClasses.has(cls)) html.classList.remove(cls);
        }
        for (const cls of newHtmlClasses) {
            if (!this.htmlClasses.has(cls)) html.classList.add(cls);
        }
        this.htmlClasses = newHtmlClasses;

        // Apply diff to Body
        for (const cls of this.bodyClasses) {
            if (!newBodyClasses.has(cls)) body.classList.remove(cls);
        }
        for (const cls of newBodyClasses) {
            if (!this.bodyClasses.has(cls)) body.classList.add(cls);
        }
        this.bodyClasses = newBodyClasses;
    }
}

// Global Singleton
window.YPP = window.YPP || {};
window.YPP.layoutManager = new LayoutManager();
window.YPP.layoutManager.init();
