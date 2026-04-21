import './subscriptions.css';

// ─── Reusable helper: escapes a string for safe insertion into innerHTML ───────
function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

window.YPP.features.SubscriptionUI = class SubscriptionUI {
    constructor(manager) {
        // manager is injected by the orchestrator; may also be resolved lazily in enable()
        this.manager = manager;
        this.isModalOpen = false;
        this.draggedChannel = null;
        // Cache the last rendered sidebar group list to avoid needless DOM thrashing
        this._lastSidebarKey = null;

        // Debounced filterFeed: coalesces rapid toggle-chip clicks or reapplyFilters
        // calls into a single DOM pass (50ms window).
        this._debouncedFilter = null; // Initialized in enable() once Utils is confirmed available
    }

    enable() {
        // Resolve dependency if manager wasn't injected via constructor
        if (!this.manager && window.YPP.Main?.featureManager) {
            this.manager = window.YPP.Main.featureManager.getFeature('subscriptionsOrganizer')?.manager
                        || window.YPP.Main.featureManager.getFeature('subscriptionFolders');
        }

        if (!this.manager) {
            window.YPP.Utils.log('Dependency missing: SubscriptionManager', 'SubUI', 'error');
            return;
        }

        // Build debounced filter now that Utils is confirmed loaded
        if (!this._debouncedFilter) {
            this._debouncedFilter = window.YPP.Utils.debounce(
                (groupName) => this._filterFeedNow(groupName),
                50
            );
        }

        window.YPP.Utils.log('Started Subscription UI', 'SubUI');
        this.observer = this.observer || window.YPP.sharedObserver;
        if (!this.observer) {
            window.YPP.Utils.log('SharedObserver unavailable — SubscriptionUI cannot register DOM watchers', 'SubUI', 'warn');
            return;
        }
        this.observePage();
    }

    disable() {
        if (this.observer) {
            this.observer.unregister('subs-ui-feed');
            this.observer.unregister('subs-ui-channels');
            this.observer.unregister('subs-ui-home');
        }
        document
            .querySelectorAll('#ypp-manage-subs-btn, #ypp-organize-btn, #ypp-subs-filter-bar, #ypp-sidebar-group-section, .ypp-modal-overlay')
            .forEach(el => el.remove());

        document.querySelector('ytd-browse[page-subtype="channels"] #contents')
            ?.classList.remove('ypp-grid-layout');

        this.isModalOpen = false;
        this._lastSidebarKey = null;
    }

    observePage() {
        this.observer.start();

        // Target Subscriptions Feed
        this.observer.register(
            'subs-ui-feed',
            'ytd-browse[page-subtype="subscriptions"] #contents, ytd-browse[page-subtype="subscriptions"] #title-container',
            () => {
                this.injectManageButton();
                this.injectFilterBar();
            }
        );

        // Target Channels Grid
        this.observer.register(
            'subs-ui-channels',
            'ytd-browse[page-subtype="channels"] #contents, ytd-browse[page-subtype="channels"] #title-container',
            () => {
                this.injectOrganizerButton();
                this.applyGridClass();
            }
        );

        // Target Home Feed (for filter bar)
        this.observer.register(
            'subs-ui-home',
            'ytd-browse[page-subtype="home"] #contents',
            () => this.injectFilterBar()
        );

        // Initial check for current route
        this.checkRoute();
    }

    checkRoute() {
        const path = window.location.pathname;
        const groupParam = new URLSearchParams(window.location.search).get('ypp_group');

        if (path === '/feed/subscriptions') {
            this.injectManageButton();
            this.injectFilterBar();
            // Apply group filter if present in URL; wait for filter bar to render
            if (groupParam) setTimeout(() => this.filterFeed(groupParam), 500);
        } else if (path === '/feed/channels') {
            this.injectOrganizerButton();
            this.applyGridClass();
        } else if (path === '/' || path === '/index') {
            this.injectFilterBar();
        }

        // Always try to inject sidebar groups if guide is present
        this.injectSidebarGroups();
    }

    applyGridClass() {
        document.querySelector('ytd-browse[page-subtype="channels"] #contents')
            ?.classList.add('ypp-grid-layout');
    }

    // ─── Button Injection ──────────────────────────────────────────────────────

    injectManageButton() {
        if (document.getElementById('ypp-manage-subs-btn')) return;
        const container = document.querySelector('ytd-browse[page-subtype="subscriptions"] #title-container');
        if (!container) return;

        const btn = this._createButton('Manage Groups', 'ypp-manage-subs-btn');
        btn.addEventListener('click', () => this.openOrganizer());
        container.appendChild(btn);
    }

    injectOrganizerButton() {
        if (document.getElementById('ypp-organize-btn')) return;
        const container = document.querySelector('ytd-browse[page-subtype="channels"] #title-container');
        if (!container) return;

        const btn = this._createButton('Organize', 'ypp-organize-btn');
        btn.addEventListener('click', () => this.openOrganizer());
        container.appendChild(btn);
    }

    /** @private */
    _createButton(text, id) {
        const btn = document.createElement('button');
        btn.id = id;
        btn.className = 'ypp-btn-primary';
        btn.textContent = text;
        return btn;
    }

    // ─── Filter Bar ────────────────────────────────────────────────────────────

    injectFilterBar() {
        if (document.getElementById('ypp-subs-filter-bar')) return;

        const path = window.location.pathname;
        let container;

        if (path === '/feed/subscriptions') {
            container = document.querySelector('ytd-browse[page-subtype="subscriptions"] #contents');
        } else if (path === '/' || path === '/index') {
            // Home feed: inject above the rich grid
            container = document.querySelector('ytd-browse[page-subtype="home"] #contents');
        }

        if (!container) return;

        const bar = document.createElement('div');
        bar.id = 'ypp-subs-filter-bar';
        bar.className = 'ypp-glass-panel';
        this.renderFilterBar(bar);

        // Insert before the grid renderer; fall back to first child
        const grid = container.querySelector('ytd-rich-grid-renderer');
        container.insertBefore(bar, grid ?? container.firstChild);
    }

    renderFilterBar(container) {
        container.innerHTML = '';
        const groups = this.manager.getGroups();

        // "All" chip — always first
        const allBtn = document.createElement('button');
        allBtn.className = 'ypp-filter-chip active';
        allBtn.textContent = 'All';
        allBtn.addEventListener('click', () => this.filterFeed(null));
        container.appendChild(allBtn);

        // One chip per group
        Object.keys(groups).forEach(groupName => {
            const btn = document.createElement('button');
            btn.className = 'ypp-filter-chip';
            btn.textContent = groupName;
            btn.addEventListener('click', () => this.filterFeed(groupName));
            container.appendChild(btn);
        });

        // Visual separator between group chips and toggle chips
        const sep = document.createElement('div');
        sep.className = 'ypp-filter-separator';
        container.appendChild(sep);

        // Toggle: Hide Shorts
        const toggleShorts = document.createElement('button');
        toggleShorts.className = 'ypp-filter-chip ypp-toggle-chip';
        toggleShorts.textContent = 'Hide Shorts';
        toggleShorts.dataset.toggle = 'shorts';
        toggleShorts.addEventListener('click', () => {
            toggleShorts.classList.toggle('active');
            this.reapplyFilters();
        });
        container.appendChild(toggleShorts);

        // Toggle: Hide Watched
        const toggleWatched = document.createElement('button');
        toggleWatched.className = 'ypp-filter-chip ypp-toggle-chip';
        toggleWatched.textContent = 'Hide Watched';
        toggleWatched.dataset.toggle = 'watched';
        toggleWatched.addEventListener('click', () => {
            toggleWatched.classList.toggle('active');
            this.reapplyFilters();
        });
        container.appendChild(toggleWatched);
    }

    reapplyFilters() {
        // Read the currently active group chip and pass its name to filterFeed
        const activeChip = document.querySelector('#ypp-subs-filter-bar .ypp-filter-chip:not(.ypp-toggle-chip).active');
        const groupName = activeChip && activeChip.textContent !== 'All' ? activeChip.textContent : null;
        this.filterFeed(groupName);
    }

    // ─── Feed Filtering ─────────────────────────────────────────────────────────────────

    filterFeed(groupName) {
        // Delegate to debounced version so rapid calls (chip click + toggle) coalesce
        if (this._debouncedFilter) {
            this._debouncedFilter(groupName);
        } else {
            // Fallback if called before enable() (e.g. checkRoute)
            this._filterFeedNow(groupName);
        }
    }

    /**
     * The real filtering implementation.
     * Channel names are cached on each video element (dataset.yppChannel) after
     * the first read so repeated filter passes skip the expensive DOM lookup.
     * @private
     * @param {string|null} groupName
     */
    _filterFeedNow(groupName) {
        const bar = document.getElementById('ypp-subs-filter-bar');
        if (!bar) return;

        // Update active group chip
        const groupChips = bar.querySelectorAll('.ypp-filter-chip:not(.ypp-toggle-chip)');
        groupChips.forEach(c => c.classList.remove('active'));
        const targetChip = Array.from(groupChips).find(c => c.textContent === (groupName || 'All'));
        if (targetChip) targetChip.classList.add('active');

        // Read current toggle states
        const hideShorts = bar.querySelector('[data-toggle="shorts"]')?.classList.contains('active') ?? false;
        const hideWatched = bar.querySelector('[data-toggle="watched"]')?.classList.contains('active') ?? false;

        // Build a Set of allowed channel names for O(1) lookup (null = show all)
        let allowedChannelSet = null;
        if (groupName) {
            const channelsInGroup = this.manager.getChannelsInGroup(groupName).map(c => c.name);
            allowedChannelSet = new Set(channelsInGroup);
        }

        // Hoist threshold out of the loop — reading constants per-video is wasteful
        const watchedThreshold = window.YPP?.CONSTANTS?.DEFAULT_SETTINGS?.hideWatchedThreshold ?? 80;

        // Handles both Home and Subs feed items
        const videos = document.querySelectorAll('ytd-rich-item-renderer, ytd-grid-video-renderer');

        videos.forEach(video => {
            let shouldShow = true;

            // 1. Group filter
            if (allowedChannelSet) {
                // Cache channel name on the element to avoid repeated DOM queries
                if (!video.dataset.yppChannel) {
                    const nameNode = video.querySelector('#text.ytd-channel-name')
                                  || video.querySelector('.ytd-channel-name')
                                  || video.querySelector('ytd-channel-name');
                    if (nameNode) video.dataset.yppChannel = nameNode.textContent.trim();
                }
                const channelName = video.dataset.yppChannel;
                if (!channelName || !allowedChannelSet.has(channelName)) shouldShow = false;
            }

            // 2. Hide Shorts (check href and tag name heuristics)
            if (shouldShow && hideShorts) {
                if (video.querySelector('a[href*="/shorts/"]')) shouldShow = false;
                if (video.tagName.toLowerCase().includes('reel')) shouldShow = false;
            }

            // 3. Hide Watched (check native YouTube progress bar width)
            if (shouldShow && hideWatched) {
                const progressEl = video.querySelector('#progress');
                if (progressEl) {
                    const width = parseFloat(progressEl.style.width || '0');
                    if (width > watchedThreshold) shouldShow = false;
                }
            }

            video.style.display = shouldShow ? '' : 'none';
        });

        // Refresh sidebar active state
        this.injectSidebarGroups();
    }

    // ─── Sidebar Groups ────────────────────────────────────────────────────────

    injectSidebarGroups() {
        const guide = document.querySelector('ytd-guide-renderer #sections');
        if (!guide) return;

        const groups = this.manager.getGroups();
        const activeGroup = new URLSearchParams(window.location.search).get('ypp_group');

        // Build a cache key — skip full re-render if nothing changed
        const cacheKey = JSON.stringify({ groups: Object.keys(groups), activeGroup });
        if (cacheKey === this._lastSidebarKey && document.getElementById('ypp-sidebar-group-section')) return;
        this._lastSidebarKey = cacheKey;

        let section = document.getElementById('ypp-sidebar-group-section');
        if (!section) {
            section = document.createElement('ytd-guide-section-renderer');
            section.id = 'ypp-sidebar-group-section';
            section.className = 'style-scope ytd-guide-renderer';
            // Insert after the first section (usually Home/Shorts/Subs)
            const insertTarget = guide.children.length > 0 ? guide.children[1] : null;
            guide.insertBefore(section, insertTarget);
        }

        // Build HTML with sanitized group names to prevent XSS
        const folderSvg = `<svg viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" focusable="false" class="style-scope yt-icon" style="pointer-events:none;display:block;width:100%;height:100%"><path d="M20,6h-8l-2-2H4C2.9,4,2.01,4.9,2,6v12c0,1.1,0.9,2,2,2h16c1.1,0,2-0.9,2-2V8C22,6.9,21.1,6,20,6z M20,18H4V6h5.17l2,2H20V18z"></path></svg>`;

        section.innerHTML = `
            <div id="items" class="style-scope ytd-guide-section-renderer">
                <h3 class="ypp-sidebar-header">Groups</h3>
                ${Object.keys(groups).map(name => {
                    const safeName = escHtml(name);
                    const isActive = activeGroup === name ? 'active' : '';
                    return `
                    <ytd-guide-entry-renderer class="style-scope ytd-guide-section-renderer ypp-sidebar-entry ${isActive}" role="tab">
                        <a class="yt-simple-endpoint style-scope ytd-guide-entry-renderer" tabindex="-1">
                            <tp-yt-paper-item class="style-scope ytd-guide-entry-renderer" role="link">
                                <yt-icon class="guide-icon style-scope ytd-guide-entry-renderer">${folderSvg}</yt-icon>
                                <span class="title style-scope ytd-guide-entry-renderer">${safeName}</span>
                            </tp-yt-paper-item>
                        </a>
                    </ytd-guide-entry-renderer>`;
                }).join('')}
            </div>
        `;

        // Attach click handlers after innerHTML is set
        section.querySelectorAll('.ypp-sidebar-entry').forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                const name = el.querySelector('.title')?.textContent;
                if (name) window.location.href = `/feed/subscriptions?ypp_group=${encodeURIComponent(name)}`;
            });
        });
    }

    // ─── Organizer Modal ───────────────────────────────────────────────────────

    openOrganizer() {
        if (this.isModalOpen) return;

        const overlay = document.createElement('div');
        overlay.className = 'ypp-modal-overlay';
        document.body.appendChild(overlay);

        overlay.innerHTML = `
            <div class="ypp-modal-content ypp-organizer-modal">
                <div class="ypp-modal-header">
                    <span class="ypp-modal-title">Subscription Organizer</span>
                    <button class="ypp-modal-close">&times;</button>
                </div>
                <div class="ypp-modal-body ypp-organizer-body">
                    <!-- Left Pane: Channels -->
                    <div class="ypp-pane ypp-pane-left">
                        <div class="ypp-pane-header">
                            <span>Channels</span>
                            <span class="ypp-count" id="ypp-channel-count">0</span>
                        </div>
                        <input type="text" id="ypp-organizer-search" placeholder="Search channels..." class="ypp-search-input">
                        <div id="ypp-channels-list" class="ypp-scroll-list"></div>
                    </div>

                    <!-- Right Pane: Categories -->
                    <div class="ypp-pane ypp-pane-right">
                        <div class="ypp-pane-header">
                            <span>Categories</span>
                            <button id="ypp-add-cat-btn" class="ypp-icon-btn">+</button>
                        </div>
                        <div id="ypp-categories-list" class="ypp-scroll-list"></div>
                    </div>
                </div>
            </div>
        `;

        overlay.querySelector('.ypp-modal-close').addEventListener('click', () => this.closeModal());
        overlay.addEventListener('click', e => { if (e.target === overlay) this.closeModal(); });
        overlay.querySelector('#ypp-add-cat-btn').addEventListener('click', () => this.promptNewCategory());
        overlay.querySelector('#ypp-organizer-search').addEventListener('input', e => this.filterChannelsList(e.target.value));

        this.renderChannelsList();
        this.renderCategoriesList();

        requestAnimationFrame(() => overlay.classList.add('open'));
        this.isModalOpen = true;
    }

    closeModal() {
        const overlay = document.querySelector('.ypp-modal-overlay');
        if (overlay) {
            overlay.classList.remove('open');
            setTimeout(() => overlay.remove(), 300);
        }
        this.isModalOpen = false;
        // Refresh filter bar chips (e.g. a group was just created or deleted)
        const bar = document.getElementById('ypp-subs-filter-bar');
        if (bar) this.renderFilterBar(bar);
    }

    // ─── Organizer: Channels Pane ──────────────────────────────────────────────

    // Note: Channels are scraped from the live DOM when on /feed/channels.
    // There is no YouTube API available here, so DOM scraping is the only option.
    // The fallback list below is intentional placeholder data shown when
    // the user opens the organizer from a page other than /feed/channels.

    renderChannelsList() {
        const container = document.getElementById('ypp-channels-list');
        if (!container) return;
        container.innerHTML = '';

        const channels = this._scrapeChannelsFromPage();
        const countEl = document.getElementById('ypp-channel-count');
        if (countEl) countEl.textContent = channels.length;

        channels.forEach(channel => {
            const el = document.createElement('div');
            el.className = 'ypp-channel-item';
            el.draggable = true;
            el.dataset.id = channel.name; // channel name used as stable key

            // Use DOM methods to avoid XSS from scraped channel names
            const img = document.createElement('img');
            img.src = channel.icon || '';
            img.className = 'ypp-channel-icon';
            img.addEventListener('error', () => { img.style.display = 'none'; });

            const nameSpan = document.createElement('span');
            nameSpan.className = 'ypp-channel-name';
            nameSpan.textContent = channel.name; // textContent is XSS-safe

            el.appendChild(img);
            el.appendChild(nameSpan);

            el.addEventListener('dragstart', (e) => {
                this.draggedChannel = channel;
                el.classList.add('dragging');
                e.dataTransfer.setData('text/plain', JSON.stringify(channel));
                e.dataTransfer.effectAllowed = 'copy';
            });
            el.addEventListener('dragend', () => {
                this.draggedChannel = null;
                el.classList.remove('dragging');
            });

            container.appendChild(el);
        });
    }

    /** @private — scrapes channel list from the live DOM on /feed/channels */
    _scrapeChannelsFromPage() {
        const items = document.querySelectorAll('ytd-channel-renderer, ytd-grid-channel-renderer');
        if (items.length > 0) {
            return Array.from(items)
                .map(item => ({
                    name: item.querySelector('#text.ytd-channel-name')?.textContent?.trim(),
                    icon: item.querySelector('img')?.src,
                }))
                .filter(c => c.name); // drop any entries where name is undefined/empty
        }

        // Fallback: placeholder data shown when organizer is opened away from /feed/channels.
        // In production this list should be replaced by persistent storage from SubscriptionManager.
        return [
            { name: 'Veritasium', icon: '' },
            { name: 'Kurzgesagt', icon: '' },
            { name: 'MKBHD', icon: '' },
            { name: 'Linus Tech Tips', icon: '' },
            { name: 'Vsauce', icon: '' },
        ];
    }

    filterChannelsList(query) {
        const normalizedQuery = query.toLowerCase();
        document.querySelectorAll('.ypp-channel-item').forEach(item => {
            const nameEl = item.querySelector('.ypp-channel-name');
            if (!nameEl) return; // guard against missing element
            item.style.display = nameEl.textContent.toLowerCase().includes(normalizedQuery) ? 'flex' : 'none';
        });
    }

    // ─── Organizer: Categories Pane ────────────────────────────────────────────

    renderCategoriesList() {
        const container = document.getElementById('ypp-categories-list');
        if (!container) return;
        container.innerHTML = '';

        const groups = this.manager.getGroups();

        Object.keys(groups).forEach(groupName => {
            const el = document.createElement('div');
            el.className = 'ypp-category-item';

            // Build header using DOM to keep groupName XSS-safe
            const header = document.createElement('div');
            header.className = 'ypp-cat-header';

            const nameSpan = document.createElement('span');
            nameSpan.className = 'ypp-cat-name';
            nameSpan.textContent = `📁 ${groupName}`;

            const countSpan = document.createElement('span');
            countSpan.className = 'ypp-cat-count';
            countSpan.textContent = groups[groupName].length;

            const delBtn = document.createElement('button');
            delBtn.className = 'ypp-del-cat-btn';
            delBtn.textContent = '×';
            delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`Delete category "${groupName}"?`)) {
                    this.manager.deleteGroup(groupName);
                    this.renderCategoriesList();
                }
            });

            header.appendChild(nameSpan);
            header.appendChild(countSpan);
            header.appendChild(delBtn);

            // Channels inside the group — use textContent to avoid XSS from stored names
            const channelsDiv = document.createElement('div');
            channelsDiv.className = 'ypp-cat-channels';
            groups[groupName].forEach(c => {
                const chip = document.createElement('div');
                chip.className = 'ypp-mini-channel';
                chip.textContent = c.name;
                channelsDiv.appendChild(chip);
            });

            el.appendChild(header);
            el.appendChild(channelsDiv);

            // Drag-and-drop drop target handlers
            el.addEventListener('dragover', (e) => {
                e.preventDefault();
                el.classList.add('drag-over');
            });
            el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
            el.addEventListener('drop', (e) => {
                e.preventDefault();
                el.classList.remove('drag-over');
                if (this.draggedChannel) this._addChannelToGroup(groupName, this.draggedChannel);
            });

            container.appendChild(el);
        });
    }

    /** @private */
    _addChannelToGroup(groupName, channel) {
        if (this.manager.addChannelToGroup(groupName, { id: channel.name, ...channel })) {
            this.renderCategoriesList();
            window.YPP.Utils.createToast?.(`Added ${channel.name} to ${groupName}`);
        } else {
            window.YPP.Utils.createToast?.(`${channel.name} is already in ${groupName}`, 'info');
        }
    }

    // Public alias kept for any external callers that may reference addChannelToGroup directly
    addChannelToGroup(groupName, channel) {
        return this._addChannelToGroup(groupName, channel);
    }

    promptNewCategory() {
        const name = prompt('Enter category name:');
        if (!name?.trim()) return;
        if (this.manager.createGroup(name.trim())) {
            this.renderCategoriesList();
            window.YPP.Utils.createToast?.(`Category "${name.trim()}" created`);
        } else {
            window.YPP.Utils.createToast?.('Category already exists', 'error');
        }
    }
};
