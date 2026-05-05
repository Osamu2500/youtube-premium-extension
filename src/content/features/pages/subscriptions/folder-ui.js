/**
 * Folder UI
 * Owns: DOM injection and rendering for the Guide sidebar (left navigation),
 * filter chips (on feed), channel/card popovers, and DOM observers for these UI elements.
 *
 * Performance / security notes:
 *  - renderChannelPopover: click-outside listener is added exactly once (flag guard)
 *    to prevent listener accumulation across multiple popover opens.
 *  - renderGuideFolders: folder names are HTML-escaped before innerHTML injection (XSS).
 *  - renderGuideFolders: a render-key cache skips full re-renders when data is unchanged.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

/** Escapes a string for safe insertion into innerHTML. */
function _escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

window.YPP.features.FolderUI = class FolderUI {

    /**
     * @param {Object} storage       - FolderStorage instance
     * @param {Object} orchestrator  - Callbacks/state from SubscriptionFolders (e.g. activeFolder, getters/setters)
     */
    constructor(storage, orchestrator) {
        this.storage      = storage;
        this.orchestrator = orchestrator;
        this.observer     = window.YPP.sharedObserver || new window.YPP.Utils.DOMObserver();

        /** @type {boolean} Whether the popover click-outside listener has been attached */
        this._popoverListenerAttached = false;
        /** @type {string|null} Cache key for the last renderGuideFolders render */
        this._guideRenderKey = null;
    }

    // =========================================================================
    // GUIDE SIDEBAR UI
    // =========================================================================

    /** Set up the observer to inject folders into the left navigation guide. */
    injectGuideFolders() {
        this.observer.register('guide-folders', '#guide-inner-content #sections ytd-guide-section-renderer', (elements) => {
            const sections = Array.from(document.querySelectorAll('#guide-inner-content ytd-guide-section-renderer'));
            let subsSection = sections.find(sec => {
                const title = sec.querySelector('#title')?.textContent?.toLowerCase() || '';
                return title.includes('subscriptions') || title.includes('abonnements');
            });
            if (!subsSection && sections.length > 1) {
                subsSection = sections[1];
            }
            if (subsSection) {
                this.renderGuideFolders(subsSection);
            }
        }, { runOnce: true });
    }

    /** Re-render the folder list within the guide. Skips re-render if data hasn't changed. */
    renderGuideFolders(sectionEl = null) {
        // --- Render-key cache: skip full re-render when nothing has changed ---
        const folderNames = Object.keys(this.storage.folders);
        const activeFolder = this.orchestrator.getActiveFolder();
        const newRenderKey = folderNames.join(',') + '|' + (activeFolder || '');
        const containerExists = !!document.getElementById('ypp-sub-folders-container');
        if (newRenderKey === this._guideRenderKey && containerExists) return;
        this._guideRenderKey = newRenderKey;

        let container = document.getElementById('ypp-sub-folders-container');

        if (!container && sectionEl) {
            container = document.createElement('div');
            container.id = 'ypp-sub-folders-container';
            container.className = 'ypp-sub-folders';

            const itemsContainer = sectionEl.querySelector('#items');
            if (itemsContainer) {
                itemsContainer.parentNode.insertBefore(container, itemsContainer.nextSibling);
            }
        }
        if (!container) return; // Wait for DOM

        // Build header (safe static HTML)
        container.innerHTML = `
            <div class="ypp-folder-header">
                <h3>My Folders</h3>
                <button id="ypp-add-folder-btn" class="ypp-icon-btn">+</button>
            </div>
            <div id="ypp-folder-list"></div>
        `;

        const list = container.querySelector('#ypp-folder-list');

        folderNames.forEach(folderName => {
            const config = this.storage.folderConfig[folderName] || {};
            const el = document.createElement('div');
            el.className = 'ypp-folder-item';
            if (activeFolder === folderName) el.classList.add('active');

            // Use _escHtml for dynamic values going into innerHTML to prevent XSS
            const safeIcon = _escHtml(config.icon || '📁');
            const safeName = _escHtml(folderName);
            const count = this.storage.folders[folderName].length;

            el.innerHTML = `
                <div class="ypp-folder-icon">${safeIcon}</div>
                <div class="ypp-folder-name" style="flex: 1;">${safeName}</div>
                <div class="ypp-folder-count">${count}</div>
                <button class="ypp-play-all-btn" title="Play All" style="margin-left: 8px; width: 24px; height: 24px; padding: 0; border-radius: 50%; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s; border: none; cursor: pointer; background: rgba(255,255,255,0.1); color: white;">
                    <svg height="14" width="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                </button>
            `;

            const playBtn = el.querySelector('.ypp-play-all-btn');
            el.addEventListener('mouseenter', () => playBtn.style.opacity = '1');
            el.addEventListener('mouseleave', () => playBtn.style.opacity = '0');

            playBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.orchestrator.playAll(folderName);
            });

            el.addEventListener('click', (e) => {
                if (e.target.closest('.ypp-play-all-btn')) return;
                if (!window.location.href.includes('/feed/subscriptions')) {
                    sessionStorage.setItem('ypp_pending_folder', folderName);
                    const tempLink = document.createElement('a');
                    tempLink.href = '/feed/subscriptions';
                    document.body.appendChild(tempLink);
                    tempLink.click();
                    tempLink.remove();
                } else {
                    this.orchestrator.setActiveFolder(folderName);
                }
            });

            list.appendChild(el);
        });

        // Add Folder Button
        container.querySelector('#ypp-add-folder-btn').addEventListener('click', () => {
            const name = prompt('Enter new folder name:');
            if (name && name.trim()) {
                if (this.storage.addFolder(name.trim())) {
                    this._guideRenderKey = null; // Invalidate cache
                    this.renderGuideFolders();
                    this.renderFilterChips();
                }
            }
        });
    }

    removeGuideFolders() {
        const container = document.getElementById('ypp-sub-folders-container');
        if (container) container.remove();
    }

    // =========================================================================
    // FILTER CHIPS UI (Feed Page)
    // =========================================================================

    /** Force-render the top filtering chips. */
    renderFilterChips() {
        if (!this.orchestrator.isFeedPage()) return; // Don't inject off-feed

        this.observer.register('inject-filter-chips', 'ytd-browse[page-subtype="subscriptions"] ytd-rich-grid-renderer', (elements) => {
            const grid = elements[0];
            let chipsBar = document.getElementById('ypp-folder-chips');

            if (!chipsBar) {
                chipsBar = document.createElement('div');
                chipsBar.id = 'ypp-folder-chips';
                chipsBar.className = 'ypp-folder-chips-bar';
                const contents = grid.querySelector('#contents');
                if (contents) {
                    grid.insertBefore(chipsBar, contents);
                } else {
                    grid.prepend(chipsBar);
                }
            }

            chipsBar.innerHTML = '';
            const activeFolder = this.orchestrator.getActiveFolder();

            // "All" chip
            const allChip = document.createElement('button');
            allChip.className = `ypp-filter-chip ${!activeFolder ? 'active' : ''}`;
            allChip.textContent = 'All Subscriptions';
            allChip.dataset.folder = '';
            allChip.addEventListener('click', () => this.orchestrator.setActiveFolder(null));
            chipsBar.appendChild(allChip);

            // Folder chips
            Object.keys(this.storage.folders).forEach(folderName => {
                const config = this.storage.folderConfig[folderName] || {};
                const chip = document.createElement('button');
                chip.className = `ypp-filter-chip ${activeFolder === folderName ? 'active' : ''}`;

                const icon = config.icon || '';
                chip.textContent = icon ? `${icon} ${folderName}` : folderName;
                chip.dataset.folder = folderName;

                if (activeFolder === folderName && config.color) {
                    chip.style.backgroundColor = config.color;
                    chip.style.color = '#fff';
                    chip.style.border = 'none';
                }

                chip.addEventListener('click', () => this.orchestrator.setActiveFolder(folderName));

                // Context Menu
                chip.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    const action = prompt(`Edit "${folderName}"\nType 'icon', 'color', or 'delete':`, 'icon');
                    if (action === 'delete') {
                        if (confirm(`Delete "${folderName}"?`)) {
                            this.storage.deleteFolder(folderName);
                            if (activeFolder === folderName) this.orchestrator.setActiveFolder(null);
                            this.renderFilterChips();
                            this.renderGuideFolders();
                        }
                    } else if (action === 'icon') {
                        const newIcon = prompt('Enter a new Emoji:', config.icon || '📁');
                        if (newIcon !== null) {
                            if (!this.storage.folderConfig[folderName]) this.storage.folderConfig[folderName] = {};
                            this.storage.folderConfig[folderName].icon = newIcon.trim();
                            this.storage.save();
                            this.renderFilterChips();
                            this.renderGuideFolders();
                        }
                    } else if (action === 'color') {
                        const newColor = prompt('Enter a hex color code (or empty to clear):', config.color || '');
                        if (newColor !== null) {
                            if (!this.storage.folderConfig[folderName]) this.storage.folderConfig[folderName] = {};
                            this.storage.folderConfig[folderName].color = newColor.trim();
                            this.storage.save();
                            this.renderFilterChips();
                            this.renderGuideFolders();
                            if (activeFolder === folderName) this.orchestrator.updateFilterState();
                        }
                    }
                });

                chipsBar.appendChild(chip);
            });

            // Play All Action
            if (activeFolder) {
                const playChip = document.createElement('button');
                playChip.className = 'ypp-filter-chip ypp-play-action-chip';
                playChip.innerHTML = `<svg height="16" width="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 4px; vertical-align: text-bottom;"><path d="M8 5v14l11-7z"/></svg> Play All`;
                playChip.style.backgroundColor = 'var(--ypp-accent, #ff0000)';
                playChip.style.color = '#fff';
                playChip.style.border = 'none';
                playChip.addEventListener('click', () => this.orchestrator.playAll(activeFolder));
                chipsBar.appendChild(playChip);
            }

            // Toggles
            this._createToggleChip(chipsBar, 'Hide Shorts', this.orchestrator.getHideShorts(), (val) => {
                this.orchestrator.setHideShorts(val);
                this.orchestrator.updateFilterState();
            });

            this._createToggleChip(chipsBar, 'Hide Watched', this.orchestrator.getHideWatched(), (val) => {
                this.orchestrator.setHideWatched(val);
                this.orchestrator.updateFilterState();
            });

            // Add Folder
            const addBtn = document.createElement('button');
            addBtn.className = 'ypp-filter-chip ypp-add-folder-btn';
            addBtn.textContent = '+ New Folder';
            addBtn.style.opacity = '0.7';
            addBtn.style.borderStyle = 'dashed';
            addBtn.addEventListener('click', () => {
                const name = prompt('New folder name:');
                if (name && name.trim()) {
                    if (this.storage.addFolder(name.trim())) {
                        this.renderFilterChips();
                        this.renderGuideFolders();
                    }
                }
            });
            chipsBar.appendChild(addBtn);

            this._injectFilterBar();
        }, { runOnce: true });
    }

    removeFilterChips() {
        const chipsBar = document.getElementById('ypp-folder-chips');
        if (chipsBar) chipsBar.remove();
        const filterBar = document.querySelector('.ypp-sub-filter-bar');
        if (filterBar) filterBar.remove();
    }

    _injectFilterBar() {
        if (document.querySelector('.ypp-sub-filter-bar')) return;

        const bar = document.createElement('div');
        bar.className = 'ypp-sub-filter-bar';
        bar.innerHTML = `
            <div class="ypp-sub-filter-group">
                <span class="ypp-sub-filter-label">Duration</span>
                <div class="ypp-sub-filter-pills" id="ypp-duration-filter">
                    <button class="ypp-filter-pill active" data-duration="all">All</button>
                    <button class="ypp-filter-pill" data-duration="short">Under 5 min</button>
                    <button class="ypp-filter-pill" data-duration="medium">5 – 20 min</button>
                    <button class="ypp-filter-pill" data-duration="long">Over 20 min</button>
                </div>
            </div>
            <div class="ypp-sub-filter-group">
                <span class="ypp-sub-filter-label">Uploaded</span>
                <div class="ypp-sub-filter-pills" id="ypp-date-filter">
                    <button class="ypp-filter-pill active" data-date="all">All time</button>
                    <button class="ypp-filter-pill" data-date="today">Today</button>
                    <button class="ypp-filter-pill" data-date="week">This week</button>
                    <button class="ypp-filter-pill" data-date="month">This month</button>
                </div>
            </div>
            <div class="ypp-sub-filter-group">
                <span class="ypp-sub-filter-label">Sort by</span>
                <div class="ypp-sub-filter-pills" id="ypp-sort-filter">
                    <button class="ypp-filter-pill active" data-sort="latest">Latest</button>
                    <button class="ypp-filter-pill" data-sort="oldest">Oldest</button>
                    <button class="ypp-filter-pill" data-sort="longest">Longest</button>
                    <button class="ypp-filter-pill" data-sort="shortest">Shortest</button>
                </div>
            </div>
            <div class="ypp-sub-filter-group" style="margin-left: auto;">
                <button id="ypp-health-btn" class="ypp-btn-primary" style="background: rgba(108,99,255,0.1); border-color: rgba(108,99,255,0.3); color: #a8a4ff; display: flex; align-items: center; gap: 6px; padding: 6px 12px; font-size: 13px;">
                    <svg height="16" width="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 9h-2V7h-2v5H6v2h2v5h2v-5h2v-2z"/></svg>
                    Channel Health
                </button>
            </div>
        `;

        // Insert after chips row
        const chipsRow = document.getElementById('ypp-folder-chips');
        chipsRow?.insertAdjacentElement('afterend', bar);

        // Wire filter pills
        bar.querySelectorAll('.ypp-filter-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                // Deactivate siblings
                pill.closest('.ypp-sub-filter-pills')
                    .querySelectorAll('.ypp-filter-pill')
                    .forEach(p => p.classList.remove('active'));
                pill.classList.add('active');

                // Store active filter values
                const duration = document.querySelector(
                    '#ypp-duration-filter .ypp-filter-pill.active'
                )?.dataset.duration || 'all';

                const date = document.querySelector(
                    '#ypp-date-filter .ypp-filter-pill.active'
                )?.dataset.date || 'all';

                const sort = document.querySelector(
                    '#ypp-sort-filter .ypp-filter-pill.active'
                )?.dataset.sort || 'latest';

                // Emit to subscription-folders.js
                window.YPP.events?.emit('subscriptions:filter-changed', {
                    duration, date, sort
                });
            });
        });

        bar.querySelector('#ypp-health-btn')?.addEventListener('click', () => {
            if (window.YPP.features.ChannelHealthUI) {
                window.YPP.features.ChannelHealthUI.openModal();
            }
        });
    }

    _createToggleChip(container, label, initialState, onChange) {
        const chip = document.createElement('button');
        chip.className = `ypp-filter-chip ypp-toggle-chip ${initialState ? 'active' : ''}`;
        chip.textContent = label;
        chip.addEventListener('click', () => {
            const newState = !chip.classList.contains('active');
            chip.classList.toggle('active', newState);
            onChange(newState);
        });
        container.appendChild(chip);
    }

    updateChipStylesForFolder(folderName) {
        document.querySelectorAll('.ypp-filter-chip').forEach(chip => {
            if (chip.dataset.folder === folderName) {
                chip.classList.add('active');
            } else if (chip.dataset.folder !== undefined) {
                chip.classList.remove('active');
            }
        });
        document.querySelectorAll('.ypp-folder-item').forEach(el => {
            if (el.querySelector('.ypp-folder-name').textContent === folderName) {
                el.classList.add('active');
            } else {
                el.classList.remove('active');
            }
        });
    }

    // =========================================================================
    // CHANNEL / CARD POPOVERS
    // =========================================================================

    /** Inject badges onto feed cards. */
    injectCardBadges() {
        this.observer.register('feed-card-badges', 'ytd-rich-item-renderer #channel-name, ytd-video-renderer #channel-name', (elements) => {
            elements.forEach(container => {
                if (container.querySelector('.ypp-card-folder-btn')) return;
                const link = container.querySelector('a');
                if (!link || !link.textContent.trim()) return;

                const btn = document.createElement('button');
                btn.className = 'ypp-card-folder-btn ypp-folder-badge';
                btn.innerHTML = `<svg height="14" width="14" viewBox="0 0 24 24" fill="currentColor" style="margin-right:2px"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg> Save`;
                btn.title = "Save to Folder";

                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.renderChannelPopover(btn, link.textContent.trim());
                });

                container.style.display = 'flex';
                container.style.alignItems = 'center';
                container.appendChild(btn);
            });
        }, { runOnce: false });
    }

    /** Inject "Folders" badge onto channel header pages. */
    injectChannelBadge() {
        this.observer.register('channel-badge', 'ytd-subscribe-button-renderer', (elements) => {
            if (!elements || elements.length === 0) return;
            const container = elements[0].parentNode;
            if (document.getElementById('ypp-channel-folder-btn')) return;

            const btn = document.createElement('button');
            btn.id = 'ypp-channel-folder-btn';
            btn.className = 'ypp-tactile-btn';
            btn.innerHTML = `<span style="margin-right:4px;">📁</span> Folders`;

            const channelNameEl = document.querySelector('ytd-channel-name#channel-name .yt-formatted-string');
            if (!channelNameEl) return;

            const channelName = channelNameEl.textContent.trim();
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.renderChannelPopover(btn, channelName);
            });

            container.insertBefore(btn, elements[0]);
        }, { runOnce: true });
    }

    renderChannelPopover(buttonEl, channelName) {
        let popover = document.getElementById('ypp-folder-popover');
        if (!popover) {
            popover = document.createElement('div');
            popover.id = 'ypp-folder-popover';
            popover.className = 'ypp-glass-popover';
            document.body.appendChild(popover);
        }

        // Fix: attach the click-outside listener exactly once, not on every popover open.
        // Previously a new listener was added each time, creating unbounded accumulation.
        if (!this._popoverListenerAttached) {
            this._popoverListenerAttached = true;
            document.addEventListener('click', (e) => {
                const popoverEl = document.getElementById('ypp-folder-popover');
                if (!popoverEl) return;
                const clickedInside = popoverEl.contains(e.target);
                const clickedFolderBtn = e.target.closest('.ypp-card-folder-btn') || e.target.closest('#ypp-channel-folder-btn');
                if (!clickedInside && !clickedFolderBtn) {
                    popoverEl.classList.remove('visible');
                }
            });
        }

        const rect = buttonEl.getBoundingClientRect();
        popover.style.top = `${rect.bottom + window.scrollY + 8}px`;
        popover.style.left = `${rect.left + window.scrollX}px`;

        let html = `<div class="ypp-popover-header">Save <b>${channelName}</b> to:</div><div class="ypp-popover-list">`;
        Object.keys(this.storage.folders).forEach(folderName => {
            const isChecked = this.storage.folders[folderName].includes(channelName);
            html += `
                <label class="ypp-folder-checkbox">
                    <input type="checkbox" data-folder="${folderName}" ${isChecked ? 'checked' : ''}>
                    <span>${folderName}</span>
                </label>
            `;
        });
        html += `</div>`;
        popover.innerHTML = html;

        popover.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const folder = e.target.dataset.folder;
                if (e.target.checked) {
                    this.storage.addChannelToFolder(channelName, folder);
                    if (this.orchestrator.getActiveFolder() === folder) {
                        this.orchestrator.forceRefreshFeed();
                    }
                } else {
                    this.storage.removeChannelFromFolder(channelName, folder);
                    if (this.orchestrator.getActiveFolder() === folder) {
                        this.orchestrator.forceRefreshFeed();
                    }
                }
                this.renderGuideFolders(); // Live update sidebar counts
            });
        });

        popover.classList.add('visible');
    }
};

// =========================================================================
// CHANNEL HEALTH DASHBOARD
// =========================================================================

window.YPP.features.ChannelHealthUI = class ChannelHealthUI {
    static openModal() {
        if (document.getElementById('ypp-health-modal')) return;

        const overlay = document.createElement('div');
        overlay.className = 'ypp-modal-overlay open';
        overlay.id = 'ypp-health-modal';
        document.body.appendChild(overlay);

        overlay.innerHTML = `
            <div class="ypp-modal-content ypp-organizer-modal" style="width: 95vw; height: 90vh; max-width: 1400px; display: flex; flex-direction: column;">
                <div class="ypp-modal-header">
                    <span class="ypp-modal-title">Channel Health Dashboard</span>
                    <button class="ypp-modal-close" style="background:none;border:none;color:#fff;font-size:24px;cursor:pointer;">&times;</button>
                </div>
                <div class="ypp-organizer-body" style="flex-direction:column; padding: 24px; overflow: hidden; display: flex;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 16px; align-items: center;">
                        <span style="color: #aaa; font-size: 14px;">Analyze your subscriptions to find inactive channels.</span>
                        <div style="display: flex; gap: 12px;">
                            <button id="ypp-health-scan-btn" class="ypp-btn-primary">Start Scan</button>
                            <button id="ypp-health-unsub-btn" class="ypp-btn-primary" style="background: rgba(255, 78, 69, 0.1); color: #ff4e45; border-color: rgba(255, 78, 69, 0.3); display: none;">Unsubscribe Selected</button>
                        </div>
                    </div>
                    <div style="display: flex; gap: 16px; margin-bottom: 16px;">
                        <div class="ypp-health-stat" data-filter="active" style="flex: 1; background: rgba(255,255,255,0.05); padding: 16px; border-radius: 8px; text-align: center; cursor: pointer; transition: 0.2s;">
                            <div style="color: #4caf50; font-size: 24px; font-weight: bold;" id="ypp-health-active">0</div>
                            <div style="color: #aaa; font-size: 12px; text-transform: uppercase;">Active (< 30 days)</div>
                        </div>
                        <div class="ypp-health-stat" data-filter="warning" style="flex: 1; background: rgba(255,255,255,0.05); padding: 16px; border-radius: 8px; text-align: center; cursor: pointer; transition: 0.2s;">
                            <div style="color: #ff9800; font-size: 24px; font-weight: bold;" id="ypp-health-warning">0</div>
                            <div style="color: #aaa; font-size: 12px; text-transform: uppercase;">Inactive (> 1 month)</div>
                        </div>
                        <div class="ypp-health-stat" data-filter="dead" style="flex: 1; background: rgba(255,255,255,0.05); padding: 16px; border-radius: 8px; text-align: center; cursor: pointer; transition: 0.2s;">
                            <div style="color: #f44336; font-size: 24px; font-weight: bold;" id="ypp-health-dead">0</div>
                            <div style="color: #aaa; font-size: 12px; text-transform: uppercase;">Dead (> 3 months)</div>
                        </div>
                    </div>
                    <div style="display: flex; justify-content: flex-end; gap: 12px; margin-bottom: 16px;">
                        <select id="ypp-health-filter-dropdown" style="background: rgba(255,255,255,0.1); color: #fff; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; outline: none;">
                            <option value="all">All Channels</option>
                            <option value="active">Active (< 30 days)</option>
                            <option value="warning">Inactive (> 1 month)</option>
                            <option value="dead">Dead (> 3 months)</option>
                        </select>
                        <select id="ypp-health-sort-dropdown" style="background: rgba(255,255,255,0.1); color: #fff; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; outline: none;">
                            <option value="latest">Latest Upload First</option>
                            <option value="oldest">Oldest Upload First</option>
                            <option value="az">Alphabetical (A-Z)</option>
                        </select>
                    </div>
                    <div id="ypp-health-results" class="ypp-scroll-list" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px;">
                        <div style="text-align: center; color: #666; margin-top: 40px;">Click "Start Scan" to fetch channel data.</div>
                    </div>
                </div>
            </div>
        `;

        overlay.querySelector('.ypp-modal-close').addEventListener('click', () => {
            overlay.classList.remove('open');
            setTimeout(() => overlay.remove(), 300);
        });

        overlay.querySelector('#ypp-health-scan-btn').addEventListener('click', () => {
            this.runScan(overlay);
        });

        overlay.querySelector('#ypp-health-unsub-btn').addEventListener('click', () => {
            this.bulkUnsubscribe(overlay);
        });

        // Add filter functionality
        const stats = overlay.querySelectorAll('.ypp-health-stat');
        const filterSelect = overlay.querySelector('#ypp-health-filter-dropdown');
        const sortSelect = overlay.querySelector('#ypp-health-sort-dropdown');
        const resultsEl = overlay.querySelector('#ypp-health-results');

        const updateView = () => {
            const filter = filterSelect.value;
            const sort = sortSelect.value;
            
            // Sync stats background
            stats.forEach(s => {
                s.style.background = s.dataset.filter === filter ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)';
            });

            const rows = Array.from(resultsEl.querySelectorAll('.ypp-channel-health-row'));
            
            // Sort
            rows.sort((a, b) => {
                if (sort === 'az') return a.dataset.name.localeCompare(b.dataset.name);
                
                const timeA = parseFloat(a.dataset.uploadTime) || Infinity;
                const timeB = parseFloat(b.dataset.uploadTime) || Infinity;
                
                if (sort === 'latest') return timeA - timeB;
                if (sort === 'oldest') return timeB - timeA;
                return 0;
            });
            
            // Apply sorting and filtering
            rows.forEach(row => {
                resultsEl.appendChild(row); // Re-appending reorders them
                if (filter === 'all' || row.dataset.status === filter) {
                    row.style.display = 'flex';
                } else {
                    row.style.display = 'none';
                }
            });
        };

        stats.forEach(stat => {
            stat.addEventListener('click', () => {
                filterSelect.value = filterSelect.value === stat.dataset.filter ? 'all' : stat.dataset.filter;
                updateView();
            });
            
            stat.addEventListener('mouseover', () => { if (filterSelect.value !== stat.dataset.filter) stat.style.background = 'rgba(255,255,255,0.1)'; });
            stat.addEventListener('mouseout', () => { if (filterSelect.value !== stat.dataset.filter) stat.style.background = 'rgba(255,255,255,0.05)'; });
        });

        filterSelect.addEventListener('change', updateView);
        sortSelect.addEventListener('change', updateView);
    }

    static async runScan(overlay) {
        const btn = overlay.querySelector('#ypp-health-scan-btn');
        const resultsEl = overlay.querySelector('#ypp-health-results');
        
        btn.textContent = 'Scanning...';
        btn.disabled = true;
        btn.style.opacity = '0.5';
        resultsEl.innerHTML = '<div style="text-align: center; color: #aaa; margin-top: 40px;">Fetching channels list...</div>';

        try {
            // 1. Fetch /feed/channels
            const res = await fetch('/feed/channels');
            const text = await res.text();
            
            // Extract ytInitialData
            const match = text.match(/var ytInitialData = (\{.*?\});<\/script>/);
            if (!match) throw new Error("Could not parse YouTube data");
            const data = JSON.parse(match[1]);

            // Find channel renderers
            const channels = [];
            const seen = new Set();
            
            const findUnsubParams = (obj) => {
                if (!obj) return null;
                if (obj.unsubscribeEndpoint && obj.unsubscribeEndpoint.params) {
                    return obj.unsubscribeEndpoint.params;
                }
                if (typeof obj === 'object') {
                    for (const key of Object.keys(obj)) {
                        const res = findUnsubParams(obj[key]);
                        if (res) return res;
                    }
                }
                return null;
            };

            const findRenderers = (obj) => {
                if (!obj || typeof obj !== 'object') return;
                if (seen.has(obj)) return;
                seen.add(obj);

                if (obj.channelRenderer) {
                    const r = obj.channelRenderer;
                    if (!channels.find(c => c.id === r.channelId)) {
                        channels.push({
                            id: r.channelId,
                            name: r.title?.simpleText || 'Unknown',
                            icon: r.thumbnail?.thumbnails?.[0]?.url || '',
                            unsubParams: findUnsubParams(r) || ''
                        });
                    }
                }
                
                Object.values(obj).forEach(findRenderers);
            };
            findRenderers(data);

            if (channels.length === 0) {
                resultsEl.innerHTML = '<div style="text-align: center; color: #ff4e45; margin-top: 40px;">No subscriptions found.</div>';
                btn.textContent = 'Scan Complete';
                return;
            }

            resultsEl.innerHTML = '';
            
            let activeCount = 0;
            let warningCount = 0;
            let deadCount = 0;

            const now = Date.now();
            const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

            // Fetch RSS for each channel to get latest video
            const batchSize = 10;
            for (let i = 0; i < channels.length; i += batchSize) {
                const batch = channels.slice(i, i + batchSize);
                
                await Promise.all(batch.map(async (c) => {
                    try {
                        const rssRes = await fetch(`/feeds/videos.xml?channel_id=${c.id}`);
                        const rssText = await rssRes.text();
                        
                        const parser = new DOMParser();
                        const xmlDoc = parser.parseFromString(rssText, "text/xml");
                        const entries = xmlDoc.querySelectorAll("entry");
                        
                        if (entries.length > 0) {
                            const firstEntry = entries[0];
                            const pubDateStr = firstEntry.querySelector("published")?.textContent;
                            if (pubDateStr) {
                                const pubDate = new Date(pubDateStr).getTime();
                                const diff = now - pubDate;
                                c.lastUpload = diff;
                                c.lastUploadText = new Date(pubDate).toLocaleDateString();
                                
                                if (diff < MONTH_MS) {
                                    c.status = 'active';
                                    c.color = '#4caf50';
                                    activeCount++;
                                } else if (diff < 3 * MONTH_MS) {
                                    c.status = 'warning';
                                    c.color = '#ff9800';
                                    warningCount++;
                                } else {
                                    c.status = 'dead';
                                    c.color = '#f44336';
                                    deadCount++;
                                }
                            } else {
                                c.status = 'dead';
                                c.color = '#f44336';
                                c.lastUploadText = 'Unknown Date';
                                c.lastUpload = Infinity;
                                deadCount++;
                            }
                        } else {
                            c.status = 'dead';
                            c.color = '#f44336';
                            c.lastUploadText = 'No videos';
                            c.lastUpload = Infinity;
                            deadCount++;
                        }
                    } catch (e) {
                        c.status = 'dead';
                        c.color = '#f44336';
                        c.lastUploadText = 'Unknown';
                        c.lastUpload = Infinity;
                        deadCount++;
                    }
                }));

                // Update UI incrementally
                batch.forEach(c => {
                    const row = document.createElement('div');
                    row.className = 'ypp-channel-health-row';
                    row.dataset.status = c.status;
                    row.dataset.name = c.name;
                    row.dataset.uploadTime = c.lastUpload;
                    row.style.cssText = `display: flex; align-items: center; padding: 12px; background: rgba(255,255,255,0.03); border-radius: 8px; border-left: 4px solid ${c.color};`;
                    
                    row.innerHTML = `
                        <img src="${c.icon}" style="width: 32px; height: 32px; border-radius: 50%; margin-right: 16px;">
                        <div style="flex: 1;">
                            <div style="color: #fff; font-size: 14px; font-weight: 500;">${c.name}</div>
                            <div style="color: #aaa; font-size: 12px;">Last upload: ${c.lastUploadText}</div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 16px;">
                            <a href="/channel/${c.id}" target="_blank" style="color: #3ea6ff; text-decoration: none; font-size: 13px; font-weight: 500; cursor: pointer;">Visit Channel</a>
                            <label style="display: ${c.status === 'dead' ? 'flex' : 'none'}; align-items: center; cursor: pointer; color: #ff4e45; font-size: 13px;">
                                <input type="checkbox" class="ypp-unsub-checkbox" value="${c.id}" data-params="${c.unsubParams}" style="margin-right: 8px;">
                                Unsubscribe
                            </label>
                        </div>
                    `;
                    resultsEl.appendChild(row);
                });

                // Update counts
                overlay.querySelector('#ypp-health-active').textContent = activeCount;
                overlay.querySelector('#ypp-health-warning').textContent = warningCount;
                overlay.querySelector('#ypp-health-dead').textContent = deadCount;
                
                if (deadCount > 0) {
                    overlay.querySelector('#ypp-health-unsub-btn').style.display = 'inline-block';
                }
                
                // Re-apply sort and filter logic after appending
                const filterSelect = overlay.querySelector('#ypp-health-filter-dropdown');
                if (filterSelect) {
                    // Triggering a 'change' event will run the updateView logic defined above
                    filterSelect.dispatchEvent(new Event('change'));
                }
            }

            btn.textContent = 'Scan Complete';
            
            // Listen for checkbox changes
            resultsEl.addEventListener('change', (e) => {
                if (e.target.classList.contains('ypp-unsub-checkbox')) {
                    const checkedCount = resultsEl.querySelectorAll('.ypp-unsub-checkbox:checked').length;
                    const unsubBtn = overlay.querySelector('#ypp-health-unsub-btn');
                    unsubBtn.textContent = checkedCount > 0 ? `Unsubscribe Selected (${checkedCount})` : 'Unsubscribe Selected';
                    unsubBtn.disabled = checkedCount === 0;
                }
            });

        } catch (e) {
            console.error(e);
            resultsEl.innerHTML = `<div style="text-align: center; color: #ff4e45; margin-top: 40px;">Scan failed: ${e.message}</div>`;
            btn.textContent = 'Retry Scan';
            btn.disabled = false;
            btn.style.opacity = '1';
        }
    }

    static async bulkUnsubscribe(overlay) {
        const checkboxes = overlay.querySelectorAll('.ypp-unsub-checkbox:checked');
        if (checkboxes.length === 0) return;

        if (!confirm(`Are you sure you want to unsubscribe from ${checkboxes.length} channels?`)) return;

        const getYoutubeConfig = () => new Promise(resolve => {
            const reqId = Math.random().toString();
            const listener = (e) => {
                if (e.data && e.data.type === 'YPP_YTCFG_RESPONSE' && e.data.reqId === reqId) {
                    window.removeEventListener('message', listener);
                    resolve(e.data.config);
                }
            };
            window.addEventListener('message', listener);
            const script = document.createElement('script');
            script.textContent = `
                try {
                    window.postMessage({
                        type: 'YPP_YTCFG_RESPONSE',
                        reqId: '${reqId}',
                        config: {
                            apiKey: window.ytcfg?.get('INNERTUBE_API_KEY'),
                            context: window.ytcfg?.get('INNERTUBE_CONTEXT'),
                            visitorData: window.ytcfg?.get('VISITOR_DATA'),
                            clientVersion: window.ytcfg?.get('INNERTUBE_CLIENT_VERSION') || '2.20240101.01.00'
                        }
                    }, '*');
                } catch(e) {}
            `;
            document.documentElement.appendChild(script);
            script.remove();
        });

        const config = await getYoutubeConfig();
        const apiKey = config.apiKey;
        const context = config.context;

        if (!apiKey || !context) {
            alert("Could not get YouTube API credentials.");
            return;
        }

        const btn = overlay.querySelector('#ypp-health-unsub-btn');
        btn.textContent = 'Unsubscribing...';
        btn.disabled = true;

        let successCount = 0;

        for (const cb of checkboxes) {
            const channelId = cb.value;
            const params = cb.dataset.params;
            
            try {
                const sapisid = document.cookie.split('; ').find(row => row.startsWith('SAPISID='))?.split('=')[1];
                const origin = window.location.origin;
                const time = Math.floor(Date.now() / 1000);
                
                const sha1 = async (str) => {
                    const buffer = new TextEncoder().encode(str);
                    const hashBuffer = await crypto.subtle.digest('SHA-1', buffer);
                    const hashArray = Array.from(new Uint8Array(hashBuffer));
                    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
                };
                
                let headers = {
                    'Content-Type': 'application/json',
                    'X-Goog-AuthUser': '0',
                    'X-Goog-Visitor-Id': config.visitorData || '',
                    'X-Youtube-Client-Name': '1',
                    'X-Youtube-Client-Version': config.clientVersion,
                    'Origin': origin,
                };

                if (sapisid) {
                    const hash = await sha1(`${time} ${sapisid} ${origin}`);
                    headers['Authorization'] = `SAPISIDHASH ${time}_${hash}`;
                }

                const payload = {
                    context: context,
                    channelIds: [channelId]
                };
                if (params) payload.params = params;

                const res = await fetch(`/youtubei/v1/subscription/unsubscribe?key=${apiKey}`, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    successCount++;
                    cb.closest('.ypp-channel-health-row').style.opacity = '0.3';
                    cb.disabled = true;
                    cb.checked = false;
                }
            } catch (e) {
                console.error("Unsub failed for", channelId, e);
            }
        }

        btn.textContent = `Unsubscribed ${successCount}`;
        setTimeout(() => {
            btn.style.display = 'none';
        }, 2000);
    }
};
