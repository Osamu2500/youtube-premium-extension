window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.DeckMode = class DeckMode extends window.YPP.features.BaseFeature {
    constructor() {
        super('deckMode');
        this.isActive = false;
        this.manager = null; // Subscription manager to get groups
    }

    getConfigKey() { return 'enableDeckMode'; }

    async enable() {
        await super.enable();
        this.utils?.log('Starting Deck Mode', 'DeckMode');
        
        this.utils?.injectCSS('src/content/features/pages/subscriptions/deck-mode.css', 'ypp-deck-css');

        const organizer = this.featureManager.getFeature('subscriptionFolders');
        if (organizer && organizer.manager) {
            this.manager = organizer.manager;
        }

        this.observer.register('deck-mode-btn', 'ytd-browse[page-subtype="subscriptions"] #ypp-subs-filter-bar', () => {
            this.injectDeckToggle();
        });
        
        this.observer.register('deck-mode-feed', 'ytd-browse[page-subtype="subscriptions"] #contents.ytd-rich-grid-renderer', (feed) => {
            if (this.isActive) this.observeFeedMutations(feed);
        });

        this.observer.start();
    }

    async disable() {
        await super.disable();
        this.deactivateDeck();
        this.utils?.removeStyle('ypp-deck-css');
        document.getElementById('ypp-deck-toggle-btn')?.remove();
    }

    injectDeckToggle() {
        if (document.getElementById('ypp-deck-toggle-btn')) return;
        const bar = document.getElementById('ypp-subs-filter-bar');
        if (!bar) return;

        const btn = document.createElement('button');
        btn.id = 'ypp-deck-toggle-btn';
        btn.className = 'ypp-btn-primary';
        btn.style.cssText = 'background: rgba(0, 200, 83, 0.1); border-color: rgba(0, 200, 83, 0.3); color: #00e676; margin-left: 12px; display: flex; align-items: center; gap: 6px; padding: 6px 12px; font-size: 13px;';
        btn.innerHTML = `
            <svg height="16" width="16" viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h4v14H4V5zm6 0h4v14h-4V5zm6 0h4v14h-4V5z"/></svg>
            Deck Mode
        `;

        btn.addEventListener('click', () => {
            this.isActive = !this.isActive;
            if (this.isActive) {
                this.activateDeck();
                btn.style.background = 'rgba(0, 200, 83, 0.3)';
            } else {
                this.deactivateDeck();
                btn.style.background = 'rgba(0, 200, 83, 0.1)';
            }
        });

        const rightGroup = bar.querySelector('.ypp-sub-filter-group[style*="margin-left: auto"]');
        if (rightGroup) rightGroup.appendChild(btn);
        else bar.appendChild(btn);
    }

    activateDeck() {
        if (!this.manager) return;
        const mainFeed = document.querySelector('ytd-browse[page-subtype="subscriptions"] ytd-rich-grid-renderer');
        if (!mainFeed) return;

        // Hide main feed visually but keep it in DOM so YouTube still loads it
        mainFeed.style.opacity = '0';
        mainFeed.style.pointerEvents = 'none';
        mainFeed.style.height = '0px';
        mainFeed.style.overflow = 'hidden';

        // Create Deck Container
        let deck = document.getElementById('ypp-deck-container');
        if (!deck) {
            deck = document.createElement('div');
            deck.id = 'ypp-deck-container';
            mainFeed.parentElement.insertBefore(deck, mainFeed);
        }

        deck.innerHTML = '';
        deck.style.display = 'flex';
        
        const groups = this.manager.getGroups();
        this.columns = {};

        this.columns['All'] = this.createColumn(deck, 'All Subscriptions', '#ffffff');
        
        Object.keys(groups).forEach(groupName => {
            const config = this.manager.getFolderConfig(groupName);
            this.columns[groupName] = this.createColumn(deck, groupName, config.color || '#ff4e45');
        });

        const existingItems = mainFeed.querySelectorAll('ytd-rich-item-renderer');
        this.distributeItems(Array.from(existingItems));

        const contents = mainFeed.querySelector('#contents');
        if (contents) this.observeFeedMutations(contents);
    }

    createColumn(container, title, color) {
        const col = document.createElement('div');
        col.className = 'ypp-deck-column ypp-scroll-list';
        col.innerHTML = `
            <div class="ypp-deck-col-header" style="border-bottom: 2px solid ${color}">
                <h3>${title}</h3>
            </div>
            <div class="ypp-deck-col-content"></div>
        `;
        container.appendChild(col);

        const contentDiv = col.querySelector('.ypp-deck-col-content');
        col.addEventListener('scroll', () => {
            if (col.scrollTop + col.clientHeight >= col.scrollHeight - 200) {
                window.scrollBy(0, 100); 
            }
        });

        return contentDiv;
    }

    deactivateDeck() {
        const deck = document.getElementById('ypp-deck-container');
        if (deck) deck.style.display = 'none';
        
        const mainFeed = document.querySelector('ytd-browse[page-subtype="subscriptions"] ytd-rich-grid-renderer');
        if (mainFeed) {
            mainFeed.style.opacity = '1';
            mainFeed.style.pointerEvents = 'auto';
            mainFeed.style.height = 'auto';
            mainFeed.style.overflow = 'visible';
        }
        
        if (this.feedObserver) {
            this.feedObserver.disconnect();
            this.feedObserver = null;
        }
    }

    observeFeedMutations(feedContents) {
        if (this.feedObserver) this.feedObserver.disconnect();
        
        this.feedObserver = new MutationObserver(mutations => {
            const newItems = [];
            mutations.forEach(m => {
                m.addedNodes.forEach(node => {
                    if (node.tagName === 'YTD-RICH-ITEM-RENDERER') newItems.push(node);
                    else if (node.querySelectorAll) {
                        const items = node.querySelectorAll('ytd-rich-item-renderer');
                        items.forEach(i => newItems.push(i));
                    }
                });
            });
            if (newItems.length > 0) this.distributeItems(newItems);
        });

        this.feedObserver.observe(feedContents, { childList: true, subtree: true });
    }

    distributeItems(items) {
        if (!this.isActive || !this.columns) return;
        const groups = this.manager.getGroups();

        items.forEach(item => {
            const channelName = item.querySelector('.ytd-channel-name a')?.textContent?.trim();
            const title = item.querySelector('#video-title')?.textContent?.trim();
            const url = item.querySelector('#video-title-link')?.href;
            const thumb = item.querySelector('yt-image img')?.src || item.querySelector('yt-img-shadow img')?.src;
            const duration = item.querySelector('ytd-thumbnail-overlay-time-status-renderer')?.textContent?.trim();
            const meta = Array.from(item.querySelectorAll('#metadata-line span')).map(s => s.textContent).join(' • ');

            if (!channelName || !title || !url) return;

            if (item.dataset.decked) return;
            item.dataset.decked = 'true';

            const card = this.createCard(channelName, title, url, thumb, duration, meta);

            if (this.columns['All']) this.columns['All'].appendChild(card.cloneNode(true));

            Object.keys(groups).forEach(groupName => {
                if (groups[groupName].some(c => c.name === channelName)) {
                    if (this.columns[groupName]) {
                        this.columns[groupName].appendChild(card.cloneNode(true));
                    }
                }
            });
        });
    }

    createCard(channelName, title, url, thumb, duration, meta) {
        const card = document.createElement('a');
        card.href = url;
        card.className = 'ypp-deck-card';
        card.target = '_blank';
        
        card.innerHTML = `
            <div class="ypp-deck-thumb">
                <img src="${thumb || 'https://via.placeholder.com/250x140?text=No+Thumbnail'}">
                ${duration ? `<span class="ypp-deck-duration">${duration}</span>` : ''}
            </div>
            <div class="ypp-deck-info">
                <div class="ypp-deck-title" title="${title}">${title}</div>
                <div class="ypp-deck-channel">${channelName}</div>
                <div class="ypp-deck-meta">${meta}</div>
            </div>
        `;
        return card;
    }
};
