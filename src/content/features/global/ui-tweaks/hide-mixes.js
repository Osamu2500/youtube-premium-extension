window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.HideMixes = class HideMixes extends window.YPP.features.BaseFilterFeature {
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
        
        // Un-hide all previously hidden mixes, also clears any leftover data-ypp-mix
        const hiddenMixes = document.querySelectorAll('[data-ypp-mix="true"]');
        hiddenMixes.forEach(el => {
            el.removeAttribute('data-ypp-mix');
            if (!el.classList.contains('ypp-is-watched') && 
                !el.classList.contains('ypp-hidden-duration') &&
                !el.hasAttribute('data-ypp-blocked')) {
                el.style.display = '';
            }
        });
    }

    /**
     * Process newly added nodes from the shared observer
     * @param {Element[]} nodes 
     */
    _processNodes(nodes) {
        if (!this.isEnabled || !this._shouldRunOnCurrentPage()) return;
        
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
                const isMixShelf = (
                    titleText === 'mix' ||
                    titleText.startsWith('mix -') ||
                    titleText.includes('mix for you') ||
                    titleText.includes('your mix') ||
                    node.querySelector('ytd-radio-renderer') !== null
                );
                
                if (isMixShelf) {
                    this._hideElement(node, 'mix');
                }
            }
        });
    }
};
