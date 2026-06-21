/**
 * GridAnimator
 * Adds premium staggered entrance animations to grid items using anime.js.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.GridAnimator = class GridAnimator extends window.YPP.features.BaseFeature {
    constructor() {
        super();
        this._batch = [];
        this._batchTimeout = null;
        this._hasAnime = typeof anime !== 'undefined';
    }

    enable() {
        if (!this._hasAnime) {
            this.utils.log('Anime.js not found, skipping GridAnimator', 'GRID-ANIM', 'warn');
            return;
        }

        // Register to observe new rich grid items and standard video renderers
        this.observer.register(
            'grid-animator', 
            'ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer', 
            (elements) => {
                this._queueElementsForAnimation(elements);
            },
            { runOnce: false } // We want to animate elements as they load via infinite scroll
        );
        
        this.utils.log('GridAnimator enabled', 'GRID-ANIM', 'debug');
    }

    disable() {
        this.observer.unregister('grid-animator');
        if (this._batchTimeout) {
            cancelAnimationFrame(this._batchTimeout);
            this._batchTimeout = null;
        }
        this._batch = [];
        
        // Clean up any elements currently hiding
        document.querySelectorAll('[data-ypp-animated="true"]').forEach(el => {
            el.style.opacity = '';
            el.style.transform = '';
            el.removeAttribute('data-ypp-animated');
        });
    }

    _queueElementsForAnimation(elements) {
        // Skip JS animation entirely on search pages.
        // The search grid uses CSS keyframe animations instead (defined in
        // search-ast.css) which are handled natively by the browser with
        // zero scheduling overhead and no opacity:0 flash.
        if (window.location.pathname === '/results') return;

        // Filter out elements that have already been animated
        const newElements = elements.filter(el => !el.hasAttribute('data-ypp-animated'));
        
        if (newElements.length === 0) return;

        // Mark immediately but don't set opacity:0 here — the CSS handles the
        // initial invisible state via the @keyframes, avoiding the flash-of-invisible
        newElements.forEach(el => {
            el.setAttribute('data-ypp-animated', 'true');
        });

        this._batch.push(...newElements);

        if (this._batchTimeout) {
            cancelAnimationFrame(this._batchTimeout);
        }

        // Use requestAnimationFrame for zero artificial delay — fires as soon as
        // the browser is ready to paint, instead of an arbitrary 50ms wait.
        this._batchTimeout = requestAnimationFrame(() => {
            this._flushBatch();
        });
    }

    _flushBatch() {
        const elementsToAnimate = [...this._batch];
        this._batch = [];
        this._batchTimeout = null;

        if (elementsToAnimate.length === 0) return;

        anime({
            targets: elementsToAnimate,
            opacity: [0, 1],
            translateY: [12, 0],
            delay: anime.stagger(20, { start: 0 }),
            duration: 350,
            easing: 'easeOutQuart',
        });
    }
};
