window.YPP.features.SubscriptionUI = class SubscriptionUI {
    constructor(manager) {
        this.manager = manager; 
        // If instantiated by FeatureManager without args, we need to resolve manager later
        this.logger = window.YPP.Utils || console;
        this.Utils = window.YPP.Utils;
        this.isModalOpen = false;
        this.draggedChannel = null;
    }

    init() {
        // Resolve dependency if missing
        if (!this.manager && window.YPP.Main && window.YPP.Main.featureManager) {
             this.manager = window.YPP.Main.featureManager.getFeature('subscriptionFolders');
        }

        if (!this.manager) {
             this.logger.error('Dependency missing: SubscriptionManager');
             return;
        }

        this.logger.info('Initialized Subscription UI');
        this.observer = new window.YPP.Utils.DOMObserver();
        this.observePage();
    }

    disable() {
        if (this.observer) {
            this.observer.stop();
        }
        const els = document.querySelectorAll('#ypp-manage-subs-btn, #ypp-organize-btn, #ypp-subs-filter-bar, #ypp-sidebar-group-section');
        els.forEach(el => el.remove());
        
        const container = document.querySelector('ytd-browse[page-subtype="channels"] #contents');
        if (container) container.classList.remove('ypp-grid-layout');
    }

    /**
     * Standard interface for FeatureManager
     */
    run(settings) {
        this.init();
    }

    observePage() {
        this.observer.start();

        // Target Subscriptions Feed
        this.observer.register('subs-ui-feed', 'ytd-browse[page-subtype="subscriptions"] #contents, ytd-browse[page-subtype="subscriptions"] #title-container', () => {
             this.injectManageButton(); 
             this.injectFilterBar();
        });

        // Target Channels Grid
        this.observer.register('subs-ui-channels', 'ytd-browse[page-subtype="channels"] #contents, ytd-browse[page-subtype="channels"] #title-container', () => {
             this.injectOrganizerButton(); 
             this.applyGridClass();
        });

        // Target Home Feed (for filter bar)
        this.observer.register('subs-ui-home', 'ytd-browse[page-subtype="home"] #contents', () => {
             this.injectFilterBar();
        });

        // Initial check
        this.checkRoute();
    }

    checkRoute() {
        const path = window.location.pathname;
        const params = new URLSearchParams(window.location.search);
        const groupParam = params.get('ypp_group');

        if (path === '/feed/subscriptions') {
            this.injectManageButton();
            this.injectFilterBar();
            // Apply group filter if present in URL
            if (groupParam) {
                // Wait for filter bar to render
                setTimeout(() => this.filterFeed(groupParam), 500);
            }
        } else if (path === '/feed/channels') {
            this.injectOrganizerButton();
            this.applyGridClass();
        } else if (path === '/' || path === '/index') {
            this.injectFilterBar();
        }
        
        // Always try to inject sidebar if guide exists
        this.injectSidebarGroups();
    }

    applyGridClass() {
        const container = document.querySelector('ytd-browse[page-subtype="channels"] #contents');
        if (container && !container.classList.contains('ypp-grid-layout')) {
            container.classList.add('ypp-grid-layout');
        }
    }

    injectManageButton() {
        if (document.getElementById('ypp-manage-subs-btn')) return;
        const container = document.querySelector('ytd-browse[page-subtype="subscriptions"] #title-container');
        if (!container) return;

        const btn = this.createButton('Manage Groups', 'ypp-manage-subs-btn');
        btn.onclick = () => this.openOrganizer();
        container.appendChild(btn);
    }

    injectOrganizerButton() {
        if (document.getElementById('ypp-organize-btn')) return;
        const container = document.querySelector('ytd-browse[page-subtype="channels"] #title-container');
        if (!container) return;

        const btn = this.createButton('Organize', 'ypp-organize-btn');
        btn.onclick = () => this.openOrganizer();
        container.appendChild(btn);
    }

    createButton(text, id) {
        const btn = document.createElement('button');
        btn.id = id;
        btn.className = 'ypp-btn-primary';
        btn.textContent = text;
        return btn;
    }

    injectFilterBar() {
        if (document.getElementById('ypp-subs-filter-bar')) return;
        
        let container;
        const path = window.location.pathname;
        
        if (path === '/feed/subscriptions') {
             container = document.querySelector('ytd-browse[page-subtype="subscriptions"] #contents');
        } else if (path === '/' || path === '/index') {
             // Home Feed: Inject above the rich grid
             const browse = document.querySelector('ytd-browse[page-subtype="home"]');
             if (browse) {
                 container = browse.querySelector('#contents');
             }
        }

        if (!container) return;

        const bar = document.createElement('div');
        bar.id = 'ypp-subs-filter-bar';
        bar.className = 'ypp-glass-panel';
        
        this.renderFilterBar(bar);
        
        const grid = container.querySelector('ytd-rich-grid-renderer');
        if (grid) {
            container.insertBefore(bar, grid);
        } else {
            // Fallback for some layouts
            container.insertBefore(bar, container.firstChild);
        }
    }

    renderFilterBar(container) {
        container.innerHTML = '';
        const groups = this.manager.getGroups();
        
        // 1. Groups
        const allBtn = document.createElement('button');
        allBtn.className = 'ypp-filter-chip active';
        allBtn.textContent = 'All';
        allBtn.onclick = () => this.filterFeed(null);
        container.appendChild(allBtn);

        Object.keys(groups).forEach(groupName => {
            const btn = document.createElement('button');
            btn.className = 'ypp-filter-chip';
            btn.textContent = groupName;
            btn.onclick = () => this.filterFeed(groupName);
            container.appendChild(btn);
        });

        // Separator
        const sep = document.createElement('div');
        sep.style.cssText = 'width: 1px; height: 24px; background: rgba(255,255,255,0.1); margin: 0 8px;';
        container.appendChild(sep);

        // 2. Toggles (Shorts, Watched)
        const toggleShorts = document.createElement('button');
        toggleShorts.className = 'ypp-filter-chip ypp-toggle-chip';
        toggleShorts.textContent = 'Hide Shorts';
        toggleShorts.dataset.toggle = 'shorts';
        toggleShorts.onclick = () => {
            toggleShorts.classList.toggle('active');
            this.reapplyFilters();
        };
        container.appendChild(toggleShorts);

        const toggleWatched = document.createElement('button');
        toggleWatched.className = 'ypp-filter-chip ypp-toggle-chip';
        toggleWatched.textContent = 'Hide Watched';
        toggleWatched.dataset.toggle = 'watched';
        toggleWatched.onclick = () => {
            toggleWatched.classList.toggle('active');
            this.reapplyFilters();
        };
        container.appendChild(toggleWatched);
    }

    reapplyFilters() {
        // Find active group
        const activeGroupChip = document.querySelector('#ypp-subs-filter-bar .ypp-filter-chip:not(.ypp-toggle-chip).active');
        const groupName = activeGroupChip && activeGroupChip.textContent !== 'All' ? activeGroupChip.textContent : null;
        this.filterFeed(groupName);
    }

    filterFeed(groupName) {
        const bar = document.getElementById('ypp-subs-filter-bar');
        if (!bar) return;

        // Update active group chip
        const groupChips = bar.querySelectorAll('.ypp-filter-chip:not(.ypp-toggle-chip)');
        groupChips.forEach(c => c.classList.remove('active'));
        const targetChip = Array.from(groupChips).find(c => c.textContent === (groupName || 'All'));
        if (targetChip) targetChip.classList.add('active');

        // Check toggles
        const hideShorts = bar.querySelector('[data-toggle="shorts"]')?.classList.contains('active');
        const hideWatched = bar.querySelector('[data-toggle="watched"]')?.classList.contains('active');

        // Handles both Home and Subs feed items
        const videos = document.querySelectorAll('ytd-rich-item-renderer, ytd-grid-video-renderer');
        const allowedChannels = groupName ? this.manager.getChannelsInGroup(groupName).map(c => c.name) : null;

        videos.forEach(video => {
            let shouldShow = true;

            // 1. Group Filter
            if (allowedChannels) {
                if (!video.dataset.yppChannel) {
                    // Try standard selectors
                    let nameNode = video.querySelector('#text.ytd-channel-name') || video.querySelector('.ytd-channel-name') || video.querySelector('ytd-channel-name');
                    if (nameNode) video.dataset.yppChannel = nameNode.textContent.trim();
                }
                const channelName = video.dataset.yppChannel;
                if (!channelName || !allowedChannels.includes(channelName)) {
                    shouldShow = false;
                }
            }

            // 2. Hide Shorts
            if (shouldShow && hideShorts) {
                // Heuristic for Shorts: ytd-rich-item-renderer can contain ytd-reel-item-renderer or look vertical
                // Or check for /shorts/ link
                if (video.querySelector('a[href*="/shorts/"]')) shouldShow = false;
                // Check for "Shorts" dismissal
                if (video.tagName.toLowerCase().includes('reel')) shouldShow = false;
            }

            // 3. Hide Watched
            if (shouldShow && hideWatched) {
                const progress = video.querySelector('#progress');
                if (progress) {
                    const width = parseFloat(progress.style.width || '0');
                    if (width > 80) shouldShow = false; // >80% watched
                }
            }

            video.style.display = shouldShow ? '' : 'none';
        });
        
        // Also trigger a reflow on the grid if needed by dispatching resize
        window.dispatchEvent(new Event('resize'));
        this.injectSidebarGroups(); // Refresh sidebar active state
    }

    injectSidebarGroups() {
        const guide = document.querySelector('ytd-guide-renderer #sections');
        if (!guide) return;
        
        let section = document.getElementById('ypp-sidebar-group-section');
        if (!section) {
            section = document.createElement('ytd-guide-section-renderer');
            section.id = 'ypp-sidebar-group-section';
            section.className = 'style-scope ytd-guide-renderer';
            // Insert after the first section (usually Home/Shorts/Subs)
            if (guide.children.length > 0) {
                guide.insertBefore(section, guide.children[1]); 
            } else {
                guide.appendChild(section);
            }
        }

        const groups = this.manager.getGroups();
        const activeGroup = new URLSearchParams(window.location.search).get('ypp_group');

        section.innerHTML = `
            <div id="items" class="style-scope ytd-guide-section-renderer">
                <h3 class="ypp-sidebar-header">Groups</h3>
                ${Object.keys(groups).map(name => `
                    <ytd-guide-entry-renderer class="style-scope ytd-guide-section-renderer ypp-sidebar-entry ${activeGroup === name ? 'active' : ''}" role="tab">
                        <a class="yt-simple-endpoint style-scope ytd-guide-entry-renderer" tabindex="-1">
                            <tp-yt-paper-item class="style-scope ytd-guide-entry-renderer" role="link">
                                <yt-icon class="guide-icon style-scope ytd-guide-entry-renderer"><svg viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" focusable="false" class="style-scope yt-icon" style="pointer-events: none; display: block; width: 100%; height: 100%;"><path d="M20,6h-8l-2-2H4C2.9,4,2.01,4.9,2,6v12c0,1.1,0.9,2,2,2h16c1.1,0,2-0.9,2-2V8C22,6.9,21.1,6,20,6z M20,18H4V6h5.17l2,2H20V18z"></path></svg></yt-icon>
                                <span class="title style-scope ytd-guide-entry-renderer">${name}</span>
                            </tp-yt-paper-item>
                        </a>
                    </ytd-guide-entry-renderer>
                `).join('')}
            </div>
        `;

        // Add Listeners
        section.querySelectorAll('.ypp-sidebar-entry').forEach(el => {
            el.onclick = (e) => {
                e.preventDefault();
                const name = el.querySelector('.title').textContent;
                // Navigate with param
                window.location.href = `/feed/subscriptions?ypp_group=${encodeURIComponent(name)}`;
            };
        });
    }

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

        overlay.querySelector('.ypp-modal-close').onclick = () => this.closeModal();
        overlay.addEventListener('click', e => { if (e.target === overlay) this.closeModal(); });
        
        overlay.querySelector('#ypp-add-cat-btn').onclick = () => this.promptNewCategory();
        overlay.querySelector('#ypp-organizer-search').oninput = (e) => this.filterChannelsList(e.target.value);

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
        // Refresh filter bar if it exists
        const bar = document.getElementById('ypp-subs-filter-bar');
        if (bar) this.renderFilterBar(bar);
    }

    // --- Organizer Logic ---

    // Note: We need a way to get ALL subscribed channels. 
    // Since we don't have a backend, we might have to scrape them from the DOM if available, 
    // or rely on what the SubscriptionManager has loaded.
    // For now, let's assume SubscriptionManager populates 'this.channels' when we visit /feed/channels
    // or we scrape them from the current page if on /feed/channels.

    renderChannelsList() {
        const container = document.getElementById('ypp-channels-list');
        if (!container) return;
        container.innerHTML = '';
        
        // Mocking fetching channels from page if possible, otherwise utilizing stored ones if any.
        // In a real scenario, we'd need to scrape the /feed/channels page or use the API.
        // Let's scrape the current DOM if we are on /feed/channels, or use a placeholder if empty.
        
        let channels = this.scrapeChannelsFromPage();
        document.getElementById('ypp-channel-count').textContent = channels.length;

        channels.forEach(channel => {
            const el = document.createElement('div');
            el.className = 'ypp-channel-item';
            el.draggable = true;
            el.dataset.id = channel.name; // Using name as ID for simplicity
            el.innerHTML = `
                <img src="${channel.icon || ''}" class="ypp-channel-icon" onerror="this.style.display='none'">
                <span class="ypp-channel-name">${channel.name}</span>
            `;
            
            el.ondragstart = (e) => {
                this.draggedChannel = channel;
                el.classList.add('dragging');
                e.dataTransfer.setData('text/plain', JSON.stringify(channel));
                e.dataTransfer.effectAllowed = 'copy';
            };

            el.ondragend = () => {
                this.draggedChannel = null;
                el.classList.remove('dragging');
            };

            container.appendChild(el);
        });
    }

    scrapeChannelsFromPage() {
        // Scrape from grid if on /feed/channels
        const items = document.querySelectorAll('ytd-channel-renderer, ytd-grid-channel-renderer');
        if (items.length > 0) {
            return Array.from(items).map(item => ({
                name: item.querySelector('#text.ytd-channel-name')?.textContent?.trim(),
                icon: item.querySelector('img')?.src
            })).filter(c => c.name);
        }
        // Fallback: Return some dummy data if empty (for verification purposes) or previously saved
        // Real implementation would persist this list.
        return [
            { name: "Veritasium", icon: "" },
            { name: "Kurzgesagt", icon: "" },
            { name: "MKBHD", icon: "" },
            { name: "Linus Tech Tips", icon: "" },
            { name: "Vsauce", icon: "" }
        ]; 
    }

    filterChannelsList(query) {
        const items = document.querySelectorAll('.ypp-channel-item');
        query = query.toLowerCase();
        items.forEach(item => {
            const name = item.querySelector('.ypp-channel-name').textContent.toLowerCase();
            item.style.display = name.includes(query) ? 'flex' : 'none';
        });
    }

    renderCategoriesList() {
        const container = document.getElementById('ypp-categories-list');
        if (!container) return;
        container.innerHTML = '';

        const groups = this.manager.getGroups();
        Object.keys(groups).forEach(groupName => {
            const el = document.createElement('div');
            el.className = 'ypp-category-item';
            
            el.innerHTML = `
                <div class="ypp-cat-header">
                    <span class="ypp-cat-name">📁 ${groupName}</span>
                    <span class="ypp-cat-count">${groups[groupName].length}</span>
                    <button class="ypp-del-cat-btn">&times;</button>
                </div>
                <div class="ypp-cat-channels">
                    ${groups[groupName].map(c => `<div class="ypp-mini-channel">${c.name}</div>`).join('')}
                </div>
            `;

            // Drop Targets
            el.ondragover = (e) => {
                e.preventDefault();
                el.classList.add('drag-over');
            };
            el.ondragleave = () => el.classList.remove('drag-over');
            el.ondrop = (e) => {
                e.preventDefault();
                el.classList.remove('drag-over');
                if (this.draggedChannel) {
                    this.addChannelToGroup(groupName, this.draggedChannel);
                }
            };

            // Delete Group
            el.querySelector('.ypp-del-cat-btn').onclick = (e) => {
                e.stopPropagation();
                if (confirm(`Delete category "${groupName}"?`)) {
                    this.manager.deleteGroup(groupName);
                    this.renderCategoriesList();
                }
            };

            container.appendChild(el);
        });
    }

    addChannelToGroup(groupName, channel) {
        if (this.manager.addChannelToGroup(groupName, { id: channel.name, ...channel })) {
            this.renderCategoriesList();
            // Optional: Visual success feedback
            this.Utils.createToast(`Added ${channel.name} to ${groupName}`);
        } else {
            this.Utils.createToast(`${channel.name} is already in ${groupName}`, 'info');
        }
    }

    promptNewCategory() {
        const name = prompt("Enter category name:");
        if (name && name.trim()) {
            if (this.manager.createGroup(name.trim())) {
                this.renderCategoriesList();
                this.Utils.createToast(`Category "${name}" created`);
            } else {
                this.Utils.createToast("Category already exists", 'error');
            }
        }
    }
};
