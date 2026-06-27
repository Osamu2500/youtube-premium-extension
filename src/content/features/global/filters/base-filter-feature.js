window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

/**
 * Base Class for filter features that hide elements on specific pages.
 * Handles page scoping, unified hiding mechanics via CSS classes, and cleanup.
 */
window.YPP.features.BaseFilterFeature = class BaseFilterFeature extends window.YPP.features.BaseFeature {
    constructor(name) {
        super(name);
        this._hiddenElements = new WeakSet();
        this._allowedPages = ['/', '/index'];
    }

    get allowedPages() {
        return this._allowedPages;
    }

    /**
     * Checks if the feature should run on the current page to avoid unintended filtering.
     * @returns {boolean}
     */
    _shouldRunOnCurrentPage() {
        const path = window.location.pathname;
        return this.allowedPages.some(p => path === p);
    }

    /**
     * Hides an element using standard CSS classes and records its state.
     * @param {Element} el 
     * @param {string} reason 
     */
    _hideElement(el, reason = '') {
        if (!el || this._hiddenElements.has(el)) return;
        
        el.classList.add('ypp-hidden', `ypp-hidden-by-${this.constructor.name.toLowerCase()}`);
        if (reason) {
            el.dataset.yppHiddenReason = reason;
        }
        el.dataset.yppHiddenBy = this.constructor.name;
        this._hiddenElements.add(el);
        
        this._emitHiddenEvent(el, reason);
    }

    /**
     * Unhides an element that was hidden by this feature.
     * @param {Element} el 
     */
    _unhideElement(el) {
        if (!el || !this._hiddenElements.has(el)) return;
        
        el.classList.remove('ypp-hidden', `ypp-hidden-by-${this.constructor.name.toLowerCase()}`);
        delete el.dataset.yppHiddenReason;
        delete el.dataset.yppHiddenBy;
        this._hiddenElements.delete(el);
    }

    /**
     * Unhides all elements currently tracked as hidden by this feature.
     */
    _unhideAll() {
        document.querySelectorAll(`[data-ypp-hidden-by="${this.constructor.name}"]`).forEach(el => {
            this._unhideElement(el);
        });
    }

    /**
     * Emits an event for analytics or global counting of hidden elements.
     * @param {Element} el 
     * @param {string} reason 
     */
    _emitHiddenEvent(el, reason) {
        window.YPP.events?.emit('filter:hidden', {
            feature: this.constructor.name,
            element: el,
            reason,
            url: el.querySelector('a')?.href
        });
    }

    async disable() {
        await super.disable();
        this._unhideAll();
    }
};
