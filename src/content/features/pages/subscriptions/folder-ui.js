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

        }, { runOnce: true });
    }

    removeFilterChips() {
        const chipsBar = document.getElementById('ypp-folder-chips');
        if (chipsBar) chipsBar.remove();
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
