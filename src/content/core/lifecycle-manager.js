'use strict';
/**
 * @author YouTube Premium+ Team
 * @purpose Manages the lifecycle of all extension features, guaranteeing execution order and teardown during SPA navigation.
 * @dependencies window.YPP
 * @example
 * const lifecycle = new window.YPP.LifecycleManager();
 * lifecycle.register(new GlobalBarFeature());
 */
window.YPP = window.YPP || {};

window.YPP.LifecycleManager = class LifecycleManager {
    constructor() {
        this.features = new Set();
        this.currentAbortController = null;
        this.teardownPromise = Promise.resolve();
        
        document.addEventListener('yt-navigate-finish', () => this.handleNavigation());
    }

    register(feature) {
        if (typeof feature._teardown !== 'function' ||
            typeof feature.init !== 'function' ||
            typeof feature.shouldRunOnCurrentPage !== 'function') {
            throw new Error(`Feature ${feature.constructor.name || 'Unknown'} fails integration contract.`);
        }
        this.features.add(feature);
    }

    async handleNavigation() {
        if (this.currentAbortController) {
            this.currentAbortController.abort();
        }
        this.currentAbortController = new AbortController();
        const signal = this.currentAbortController.signal;

        await this.teardownPromise;

        this.teardownPromise = (async () => {
            for (const feature of this.features) {
                try {
                    feature._teardown();
                } catch (e) {
                    console.error(`[YPP Lifecycle] Teardown failed for ${feature.constructor.name}`, e);
                }
            }

            for (const feature of this.features) {
                if (feature.shouldRunOnCurrentPage()) {
                    try {
                        await feature.init(signal);
                    } catch (e) {
                        if (e.name !== 'AbortError') {
                            console.error(`[YPP Lifecycle] Init failed for ${feature.constructor.name}`, e);
                        }
                    }
                }
            }
        })();
    }
};
