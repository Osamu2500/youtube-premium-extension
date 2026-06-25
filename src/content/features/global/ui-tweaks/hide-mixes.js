window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.HideMixes = class HideMixes extends window.YPP.features.BaseFeature {
    constructor() {
        super('HideMixes');
        this._boundProcess = this._processNodes.bind(this);
    }

    getConfigKey() {
        return 'hideMixes';
    }

    async enable() {
        await super.enable();
        
        // Add global class to hide elements matching the mix criteria if they are tagged
        document.documentElement.classList.add(window.YPP.CONSTANTS.CSS_CLASSES.HIDE_MIXES);
        
        if (window.YPP.sharedObserver) {
            window.YPP.sharedObserver.register(
                'hide-mixes',
                'ytd-rich-shelf-renderer, ytd-horizontal-card-list-renderer, ytd-radio-renderer',
                this._boundProcess
            );
        }
        
        // Process existing nodes
        const nodes = document.querySelectorAll('ytd-rich-shelf-renderer, ytd-horizontal-card-list-renderer, ytd-radio-renderer');
        if (nodes.length > 0) {
            this._processNodes(Array.from(nodes));
        }
    }

    async disable() {
        await super.disable();
        
        document.documentElement.classList.remove(window.YPP.CONSTANTS.CSS_CLASSES.HIDE_MIXES);
        
        if (window.YPP.sharedObserver) {
            window.YPP.sharedObserver.unregister('hide-mixes');
        }
        
        // Un-hide all previously hidden mixes
        const hiddenMixes = document.querySelectorAll('[data-ypp-mix="true"]');
        hiddenMixes.forEach(el => {
            el.removeAttribute('data-ypp-mix');
            el.style.display = '';
        });
    }

    /**
     * Process newly added nodes from the shared observer
     * @param {Element[]} nodes 
     */
    _processNodes(nodes) {
        if (!this.isEnabled) return;
        
        nodes.forEach(node => {
            if (node.hasAttribute('data-ypp-mix-processed')) return;
            node.setAttribute('data-ypp-mix-processed', 'true');
            
            // For ytd-radio-renderer (Mixes in search/sidebar)
            if (node.tagName.toLowerCase() === 'ytd-radio-renderer') {
                this._hideElement(node);
                return;
            }
            
            // For shelf renderers, check the title
            const titleElement = node.querySelector('#title');
            if (titleElement && titleElement.textContent) {
                const titleText = titleElement.textContent.trim().toLowerCase();
                if (titleText.includes('mix')) {
                    this._hideElement(node);
                }
            }
        });
    }
    
    _hideElement(el) {
        el.setAttribute('data-ypp-mix', 'true');
        el.style.display = 'none';
        
        // Special case for rich grid: also hide the parent row if it becomes empty
        const parentRow = el.closest('ytd-rich-grid-row, ytd-rich-section-renderer');
        if (parentRow) {
            // Very basic heuristic: if it's a section renderer for a mix, hide the whole section
            if (parentRow.tagName.toLowerCase() === 'ytd-rich-section-renderer') {
                parentRow.style.display = 'none';
                parentRow.setAttribute('data-ypp-mix', 'true');
            }
        }
    }
};
