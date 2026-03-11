/**
 * UIManager - Global UI Layer Architecture
 * 
 * Manages mount points, component injection, and lifecycle healing.
 * Prevents direct DOM manipulation by features to protect against
 * YouTube's aggressive Polymer rerenders and A/B tests.
 */
window.YPP = window.YPP || {};
window.YPP.ui = window.YPP.ui || {};

class UIManager {
    constructor() {
        this.components = new Map();
        
        // Listen to core SPA navigation events to heal UI
        if (window.YPP.events) {
            window.YPP.events.on('app:pageChange', () => this.heal());
            // app:videoChange can sometimes be too early/late for DOM elements,
            // we rely on the MutationObserver emitting app:domUpdate for specific mounts
        }
    }

    /**
     * Map logical mount points to their current DOM selectors.
     * Functions ensure we always grab the freshest element in the DOM.
     */
    mountPoints = {
        playerControls: () => window.YPP.DomAPI?.getVideoControls(),
        headerRight: () => window.YPP.DomAPI?.getMasthead()?.querySelector('#end'),
        sidebar: () => window.YPP.DomAPI?.getSecondary(), // We need to add this to DomAPI
        related: () => window.YPP.DomAPI?.getRelatedItems(),
        watchPage: () => window.YPP.DomAPI?.getWatchFlexy()
    };

    /**
     * Mounts a component to a designated point.
     * @param {string} pointKey - Key from this.mountPoints
     * @param {Object} component - The component object { id, el }
     * @param {string} position - 'append' or 'prepend'
     */
    mount(pointKey, component, position = 'append') {
        const target = this.mountPoints[pointKey]?.();
        
        if (!target) return; // Target not in DOM yet
        
        // Prevent duplicate mounting
        if (this.components.has(component.id) || target.querySelector(`[data-ypp-id="${component.id}"]`)) {
            return;
        }

        component.el.dataset.yppId = component.id;
        component.mountPoint = pointKey;
        component.position = position;

        if (position === 'prepend') {
            target.prepend(component.el);
        } else {
            target.appendChild(component.el);
        }

        this.components.set(component.id, component);
    }

    /**
     * Removes a component by ID from the DOM and registry.
     */
    remove(id) {
        const comp = this.components.get(id);
        if (!comp) return;

        comp.el.remove();
        this.components.delete(id);
    }

    /**
     * Re-mounts any components that were wiped away by YouTube rerenders.
     */
    heal() {
        this.components.forEach(comp => {
            if (!document.contains(comp.el)) {
                // Temporarily remove from registry so mount() allows recreation
                this.components.delete(comp.id);
                this.mount(comp.mountPoint, comp, comp.position);
            }
        });
    }

    /**
     * Completely destroys the UI layer (useful for full extension disable).
     */
    destroy() {
        this.components.forEach(comp => comp.el.remove());
        this.components.clear();
    }
}

window.YPP.ui.manager = new UIManager();
