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
        if (this._batchTimeout) {
            clearTimeout(this._batchTimeout);
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
        // Filter out elements that have already been animated
        const newElements = elements.filter(el => !el.hasAttribute('data-ypp-animated'));
        
        if (newElements.length === 0) return;

        // Immediately hide them so they don't flash before animating
        newElements.forEach(el => {
            el.setAttribute('data-ypp-animated', 'true');
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
        });

        this._batch.push(...newElements);

        if (this._batchTimeout) {
            clearTimeout(this._batchTimeout);
        }

        // Wait a tick to batch multiple elements inserted at once (e.g., initial page load)
        this._batchTimeout = setTimeout(() => {
            this._flushBatch();
        }, 50);
    }

    _flushBatch() {
        const elementsToAnimate = [...this._batch];
        this._batch = [];
        this._batchTimeout = null;

        if (elementsToAnimate.length === 0) return;

        anime({
            targets: elementsToAnimate,
            opacity: [0, 1],
            translateY: [30, 0],
            delay: anime.stagger(60, { start: 100 }), // 100ms initial delay, 60ms between each
            duration: 800,
            easing: 'easeOutQuart',
            complete: (anim) => {
                // Clean up inline styles after animation to avoid conflicts with CSS hover effects
                anim.animatables.forEach(a => {
                    a.target.style.opacity = '';
                    a.target.style.transform = '';
                });
            }
        });
    }
};
