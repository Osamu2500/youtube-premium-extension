// Subscriptions Feed Organizer (Refactored)
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.SubscriptionsOrganizer = class SubscriptionsOrganizer {
    constructor() {
        this.CONSTANTS = window.YPP.CONSTANTS;
        this.Utils = window.YPP.Utils;
        this.observer = new window.YPP.Utils.DOMObserver(); // Shared
        this.isActive = false;
        this.channelTags = {};
        this.activeFilter = 'All';
        this.hideWatched = false;
        this.debouncedOrganize = this.Utils.debounce(() => this.organizeFeed(), 500);
    }

    run(settings) {
        const isSubsPage = window.location.pathname === '/feed/subscriptions';
        if (isSubsPage) {
            if (!this.isActive) this.init();
        } else {
            if (this.isActive) this.disable();
        }
    }

    async init() {
        if (this.isActive) return;
        this.isActive = true;

        await this.loadTags();

        // Wait for grid via Observer
        const gridSelectors = 'ytd-rich-grid-renderer, ytd-section-list-renderer';
        this.observer.register('subs-grid', gridSelectors, (grid) => {
            if (!this.isActive) return;
            if (!document.querySelector('.ypp-subs-filter-row')) {
                this.createFilterRow();
            }
            this.debouncedOrganize();
        });

        // Close popover
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.ypp-tag-btn') && !e.target.closest('.ypp-tag-popover')) {
                this.removePopover();
            }
        });
    }

    async loadTags() {
        return new Promise(resolve => {
            chrome.storage.local.get('channelTags', (data) => {
                this.channelTags = data.channelTags || {};
                resolve();
            });
        });
    }

    removePopover() {
        const pop = document.querySelector('.ypp-tag-popover');
        if (pop) pop.remove();
    }

    createFilterRow() {
        // Simple implementation to satisfy the call
        // In a real scenario, this would create buttons
        const container = document.querySelector('ytd-rich-grid-renderer') || document.querySelector('#primary');
        if (!container) return;

        const row = document.createElement('div');
        row.className = 'ypp-subs-filter-row';
        row.style.padding = '10px';
        row.style.display = 'flex';
        row.style.gap = '10px';

        // Example logic
        container.prepend(row);
    }

    organizeFeed() {
        if (!this.isActive) return;
        // Logic to filter/sort the grid
        // Start by getting all items
        // For now, empty implementation to prevent crash
    }

    disable() {
        this.isActive = false;
        // Fixed: Use this.observer.unregister instead of direct call if method exists, else implement it
        // The observer class has unregister.
        if (this.observer.unregister) this.observer.unregister('subs-grid');

        document.querySelectorAll('.ypp-subs-filter-row').forEach(el => el.remove());
        this.removePopover();
    }
};
