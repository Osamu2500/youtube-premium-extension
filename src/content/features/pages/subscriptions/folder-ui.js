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

window.YPP.features.CustomDialog = class CustomDialog {
    static _createOverlay() {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);z-index:999999;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.2s;';
        document.body.appendChild(overlay);
        return overlay;
    }

    static alert(title, message) {
        return new Promise(resolve => {
            const overlay = this._createOverlay();
            overlay.innerHTML = `
                <div style="background:#1a1a1a;border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:24px;width:100%;max-width:360px;box-shadow:0 16px 48px rgba(0,0,0,0.5);transform:scale(0.95);transition:transform 0.2s;display:flex;flex-direction:column;gap:16px;">
                    <div style="font-size:18px;font-weight:600;color:#fff;">${title}</div>
                    <div style="font-size:14px;color:#aaa;line-height:1.5;">${message}</div>
                    <div style="display:flex;justify-content:flex-end;">
                        <button id="ypp-alert-ok" style="background:#6c63ff;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-weight:500;cursor:pointer;">OK</button>
                    </div>
                </div>
            `;
            
            requestAnimationFrame(() => {
                overlay.style.opacity = '1';
                overlay.children[0].style.transform = 'scale(1)';
            });

            const close = () => {
                overlay.style.opacity = '0';
                overlay.children[0].style.transform = 'scale(0.95)';
                setTimeout(() => overlay.remove(), 200);
                resolve();
            };

            overlay.querySelector('#ypp-alert-ok').addEventListener('click', close);
        });
    }

    static confirm(title, message, confirmText = 'Confirm', danger = false) {
        return new Promise(resolve => {
            const overlay = this._createOverlay();
            const btnColor = danger ? '#ff4e45' : '#6c63ff';
            overlay.innerHTML = `
                <div style="background:#1a1a1a;border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:24px;width:100%;max-width:360px;box-shadow:0 16px 48px rgba(0,0,0,0.5);transform:scale(0.95);transition:transform 0.2s;display:flex;flex-direction:column;gap:16px;">
                    <div style="font-size:18px;font-weight:600;color:#fff;">${title}</div>
                    <div style="font-size:14px;color:#aaa;line-height:1.5;">${message}</div>
                    <div style="display:flex;justify-content:flex-end;gap:12px;">
                        <button id="ypp-confirm-cancel" style="background:rgba(255,255,255,0.05);color:#fff;border:none;padding:10px 20px;border-radius:8px;font-weight:500;cursor:pointer;">Cancel</button>
                        <button id="ypp-confirm-ok" style="background:${btnColor};color:#fff;border:none;padding:10px 20px;border-radius:8px;font-weight:500;cursor:pointer;">${confirmText}</button>
                    </div>
                </div>
            `;
            
            requestAnimationFrame(() => {
                overlay.style.opacity = '1';
                overlay.children[0].style.transform = 'scale(1)';
            });

            const close = (val) => {
                overlay.style.opacity = '0';
                overlay.children[0].style.transform = 'scale(0.95)';
                setTimeout(() => overlay.remove(), 200);
                resolve(val);
            };

            overlay.querySelector('#ypp-confirm-cancel').addEventListener('click', () => close(false));
            overlay.querySelector('#ypp-confirm-ok').addEventListener('click', () => close(true));
        });
    }

    static prompt(title, message, placeholder = '', defaultValue = '') {
        return new Promise(resolve => {
            const overlay = this._createOverlay();
            overlay.innerHTML = `
                <div style="background:#1a1a1a;border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:24px;width:100%;max-width:360px;box-shadow:0 16px 48px rgba(0,0,0,0.5);transform:scale(0.95);transition:transform 0.2s;display:flex;flex-direction:column;gap:16px;">
                    <div style="font-size:18px;font-weight:600;color:#fff;">${title}</div>
                    <div style="font-size:14px;color:#aaa;line-height:1.5;margin-bottom:-4px;">${message}</div>
                    <input type="text" id="ypp-prompt-input" placeholder="${placeholder}" value="${defaultValue}" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#fff;padding:12px;border-radius:8px;font-size:14px;outline:none;width:100%;box-sizing:border-box;">
                    <div style="display:flex;justify-content:flex-end;gap:12px;">
                        <button id="ypp-prompt-cancel" style="background:rgba(255,255,255,0.05);color:#fff;border:none;padding:10px 20px;border-radius:8px;font-weight:500;cursor:pointer;">Cancel</button>
                        <button id="ypp-prompt-ok" style="background:#6c63ff;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-weight:500;cursor:pointer;">Submit</button>
                    </div>
                </div>
            `;
            
            requestAnimationFrame(() => {
                overlay.style.opacity = '1';
                overlay.children[0].style.transform = 'scale(1)';
            });

            const close = (val) => {
                overlay.style.opacity = '0';
                overlay.children[0].style.transform = 'scale(0.95)';
                setTimeout(() => overlay.remove(), 200);
                resolve(val);
            };

            const input = overlay.querySelector('#ypp-prompt-input');
            input.focus();
            input.select();

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') close(input.value);
                if (e.key === 'Escape') close(null);
            });

            overlay.querySelector('#ypp-prompt-cancel').addEventListener('click', () => close(null));
            overlay.querySelector('#ypp-prompt-ok').addEventListener('click', () => close(input.value));
        });
    }
};

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
        container.querySelector('#ypp-add-folder-btn').addEventListener('click', async () => {
            const name = await window.YPP.features.CustomDialog.prompt('New Folder', 'Enter new folder name:');
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
                chip.addEventListener('contextmenu', async (e) => {
                    e.preventDefault();
                    const action = await window.YPP.features.CustomDialog.prompt(`Edit Folder: ${folderName}`, `Type 'icon', 'color', or 'delete':`, 'icon', 'icon');
                    if (action === 'delete') {
                        if (await window.YPP.features.CustomDialog.confirm('Delete Folder', `Are you sure you want to delete "${folderName}"?`, 'Delete', true)) {
                            this.storage.deleteFolder(folderName);
                            if (activeFolder === folderName) this.orchestrator.setActiveFolder(null);
                            this.renderFilterChips();
                            this.renderGuideFolders();
                        }
                    } else if (action === 'icon') {
                        const newIcon = await window.YPP.features.CustomDialog.prompt('Update Icon', 'Enter a new Emoji for this folder:', config.icon || '📁', config.icon || '📁');
                        if (newIcon !== null) {
                            if (!this.storage.folderConfig[folderName]) this.storage.folderConfig[folderName] = {};
                            this.storage.folderConfig[folderName].icon = newIcon.trim();
                            this.storage.save();
                            this.renderFilterChips();
                            this.renderGuideFolders();
                        }
                    } else if (action === 'color') {
                        const newColor = await window.YPP.features.CustomDialog.prompt('Update Color', 'Enter a hex color code (or empty to clear):', config.color || '', config.color || '');
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
            addBtn.addEventListener('click', async () => {
                const name = await window.YPP.features.CustomDialog.prompt('New Folder', 'Enter a name for the new folder:');
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
        bar.style.cssText = 'display: flex; gap: 16px; align-items: center; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 16px; flex-wrap: wrap;';
        
        const selectStyle = 'background: rgba(255,255,255,0.08); color: #fff; border: 1px solid rgba(255,255,255,0.1); padding: 8px 12px; border-radius: 8px; cursor: pointer; outline: none; font-size: 14px; font-weight: 500; min-width: 120px; transition: 0.2s;';

        bar.innerHTML = `
            <div class="ypp-sub-filter-group" style="display: flex; align-items: center; gap: 8px;">
                <span class="ypp-sub-filter-label" style="color: #aaa; font-size: 13px; font-weight: 500; text-transform: uppercase;">Duration</span>
                <select class="ypp-filter-dropdown" id="ypp-duration-filter" style="${selectStyle}">
                    <option value="all" style="background:#222">All</option>
                    <option value="short" style="background:#222">Under 5 min</option>
                    <option value="medium" style="background:#222">5 – 20 min</option>
                    <option value="long" style="background:#222">Over 20 min</option>
                    <option value="custom" style="background:#222">Custom...</option>
                </select>
            </div>
            <div class="ypp-sub-filter-group" style="display: flex; align-items: center; gap: 8px;">
                <span class="ypp-sub-filter-label" style="color: #aaa; font-size: 13px; font-weight: 500; text-transform: uppercase;">Uploaded</span>
                <select class="ypp-filter-dropdown" id="ypp-date-filter" style="${selectStyle}">
                    <option value="all" style="background:#222">All time</option>
                    <option value="today" style="background:#222">Today</option>
                    <option value="week" style="background:#222">This week</option>
                    <option value="month" style="background:#222">This month</option>
                    <option value="custom" style="background:#222">Custom...</option>
                </select>
            </div>
            <div class="ypp-sub-filter-group" style="display: flex; align-items: center; gap: 8px;">
                <span class="ypp-sub-filter-label" style="color: #aaa; font-size: 13px; font-weight: 500; text-transform: uppercase;">Sort by</span>
                <select class="ypp-filter-dropdown" id="ypp-sort-filter" style="${selectStyle}">
                    <option value="latest" style="background:#222">Latest</option>
                    <option value="oldest" style="background:#222">Oldest</option>
                    <option value="longest" style="background:#222">Longest</option>
                    <option value="shortest" style="background:#222">Shortest</option>
                </select>
            </div>
            <div class="ypp-sub-filter-group" style="margin-left: auto;">
                <button id="ypp-health-btn" class="ypp-btn-primary" style="background: rgba(108,99,255,0.1); border-color: rgba(108,99,255,0.3); color: #a8a4ff; display: flex; align-items: center; gap: 6px; padding: 8px 16px; font-size: 14px; border-radius: 8px; transition: 0.2s;">
                    <svg height="18" width="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 9h-2V7h-2v5H6v2h2v5h2v-5h2v-2z"/></svg>
                    Channel Health
                </button>
            </div>
        `;

        // Insert after chips row
        const chipsRow = document.getElementById('ypp-folder-chips');
        chipsRow?.insertAdjacentElement('afterend', bar);

        // Hover effects for select and button
        bar.querySelectorAll('.ypp-filter-dropdown').forEach(s => {
            s.addEventListener('mouseover', () => s.style.background = 'rgba(255,255,255,0.12)');
            s.addEventListener('mouseout', () => s.style.background = 'rgba(255,255,255,0.08)');
        });

        const handleFilterChange = async (e) => {
            const select = e.target;
            let val = select.value;

            if (val === 'custom') {
                if (select.id === 'ypp-duration-filter') {
                    const maxMins = await window.YPP.features.CustomDialog.prompt('Custom Duration', "Enter maximum video duration in minutes (e.g., 15):");
                    if (maxMins && !isNaN(maxMins)) {
                        val = `custom:${maxMins}`;
                        const opt = document.createElement('option');
                        opt.value = val;
                        opt.textContent = `Under ${maxMins}m`;
                        opt.style.background = '#222';
                        select.appendChild(opt);
                        select.value = val;
                    } else {
                        select.value = 'all';
                        val = 'all';
                    }
                } else if (select.id === 'ypp-date-filter') {
                    const maxDays = await window.YPP.features.CustomDialog.prompt('Custom Date', "Enter maximum days ago (e.g., 3):");
                    if (maxDays && !isNaN(maxDays)) {
                        val = `custom:${maxDays}`;
                        const opt = document.createElement('option');
                        opt.value = val;
                        opt.textContent = `Past ${maxDays} days`;
                        opt.style.background = '#222';
                        select.appendChild(opt);
                        select.value = val;
                    } else {
                        select.value = 'all';
                        val = 'all';
                    }
                }
            }

            const duration = document.getElementById('ypp-duration-filter')?.value || 'all';
            const date = document.getElementById('ypp-date-filter')?.value || 'all';
            const sort = document.getElementById('ypp-sort-filter')?.value || 'latest';

            window.YPP.events?.emit('subscriptions:filter-changed', { duration, date, sort });
        };

        bar.querySelectorAll('.ypp-filter-dropdown').forEach(select => {
            select.addEventListener('change', handleFilterChange);
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

        let html = `
            <div style="background: rgba(15,15,15,0.95); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; box-shadow: 0 12px 32px rgba(0,0,0,0.5); width: 240px; overflow: hidden; display: flex; flex-direction: column;">
                <div class="ypp-popover-header" style="padding: 16px; border-bottom: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.02);">
                    <div style="font-size: 12px; color: rgba(255,255,255,0.6); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; font-weight: 600;">Save Channel</div>
                    <div style="font-size: 15px; color: #fff; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${channelName}</div>
                </div>
                <div class="ypp-popover-list" style="padding: 8px; max-height: 250px; overflow-y: auto; display: flex; flex-direction: column; gap: 2px;">
        `;
        const folderKeys = Object.keys(this.storage.folders);
        if (folderKeys.length === 0) {
            html += `<div style="padding: 16px; text-align: center; color: rgba(255,255,255,0.5); font-size: 13px;">No folders exist.</div>`;
        } else {
            folderKeys.forEach(folderName => {
                const isChecked = this.storage.folders[folderName].includes(channelName);
                html += `
                    <label class="ypp-folder-checkbox" style="display: flex; align-items: center; padding: 10px 12px; border-radius: 6px; cursor: pointer; transition: 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='transparent'">
                        <input type="checkbox" data-folder="${folderName}" ${isChecked ? 'checked' : ''} style="margin-right: 12px; accent-color: #6c63ff; width: 16px; height: 16px; cursor: pointer;">
                        <span style="color: #fff; font-size: 14px; font-weight: 500;">${folderName}</span>
                    </label>
                `;
            });
        }
        html += `</div></div>`;
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
            <div class="ypp-modal-content ypp-organizer-modal" style="width: 95vw; height: 90vh; max-width: 1400px; display: flex; flex-direction: column; background: rgba(15, 15, 15, 0.95); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 24px 64px rgba(0,0,0,0.6); border-radius: 16px; overflow: hidden;">
                <div class="ypp-modal-header" style="background: rgba(255,255,255,0.02); border-bottom: 1px solid rgba(255,255,255,0.08); padding: 20px 24px; display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6c63ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                        <span class="ypp-modal-title" style="font-size: 20px; font-weight: 600; color: #fff; letter-spacing: -0.5px;">Channel Health</span>
                    </div>
                    <button class="ypp-modal-close" style="background: rgba(255,255,255,0.05); border: none; color: #fff; font-size: 20px; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'">&times;</button>
                </div>
                <div class="ypp-organizer-body" style="flex-direction: column; padding: 32px; overflow: hidden; display: flex; flex: 1; background: linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(0,0,0,0) 100%);">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 24px; align-items: center; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); padding: 16px 24px; border-radius: 12px;">
                        <span style="color: #bbb; font-size: 14px; line-height: 1.5;">Scan your subscriptions to identify dead or inactive channels.<br><strong style="color:#fff;">Keep your feed focused and clean.</strong></span>
                        <div style="display: flex; gap: 12px;">
                            <button id="ypp-health-scan-btn" class="ypp-btn-primary" style="background: #6c63ff; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 12px rgba(108,99,255,0.3);" onmouseover="this.style.filter='brightness(1.1)'" onmouseout="this.style.filter='brightness(1)'">Start Scan</button>
                            <button id="ypp-health-unsub-btn" class="ypp-btn-primary" style="background: rgba(255, 78, 69, 0.15); color: #ff6b6b; border: 1px solid rgba(255, 78, 69, 0.3); padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: 0.2s; display: none;" onmouseover="this.style.background='rgba(255, 78, 69, 0.25)'" onmouseout="this.style.background='rgba(255, 78, 69, 0.15)'">Unsubscribe Selected</button>
                        </div>
                    </div>
                    <div style="display: flex; gap: 20px; margin-bottom: 24px;">
                        <div class="ypp-health-stat" data-filter="active" style="flex: 1; background: rgba(76, 175, 80, 0.05); border: 1px solid rgba(76, 175, 80, 0.2); padding: 24px; border-radius: 12px; text-align: center; cursor: pointer; transition: 0.2s;">
                            <div style="color: #4caf50; font-size: 32px; font-weight: 700; margin-bottom: 4px;" id="ypp-health-active">0</div>
                            <div style="color: rgba(255,255,255,0.6); font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Active (< 30 days)</div>
                        </div>
                        <div class="ypp-health-stat" data-filter="warning" style="flex: 1; background: rgba(255, 152, 0, 0.05); border: 1px solid rgba(255, 152, 0, 0.2); padding: 24px; border-radius: 12px; text-align: center; cursor: pointer; transition: 0.2s;">
                            <div style="color: #ff9800; font-size: 32px; font-weight: 700; margin-bottom: 4px;" id="ypp-health-warning">0</div>
                            <div style="color: rgba(255,255,255,0.6); font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Inactive (> 1 month)</div>
                        </div>
                        <div class="ypp-health-stat" data-filter="dead" style="flex: 1; background: rgba(244, 67, 54, 0.05); border: 1px solid rgba(244, 67, 54, 0.2); padding: 24px; border-radius: 12px; text-align: center; cursor: pointer; transition: 0.2s;">
                            <div style="color: #f44336; font-size: 32px; font-weight: 700; margin-bottom: 4px;" id="ypp-health-dead">0</div>
                            <div style="color: rgba(255,255,255,0.6); font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Dead (> 3 months)</div>
                        </div>
                    </div>
                    <div style="display: flex; justify-content: flex-end; gap: 12px; margin-bottom: 16px; align-items: center;">
                        <span style="color: #888; font-size: 13px; margin-right: auto;">Filters & Sort:</span>
                        <select id="ypp-health-filter-dropdown" style="background: rgba(255,255,255,0.08); color: #fff; border: 1px solid rgba(255,255,255,0.1); padding: 8px 16px; border-radius: 8px; cursor: pointer; outline: none; font-size: 13px; font-weight: 500; transition: 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.12)'" onmouseout="this.style.background='rgba(255,255,255,0.08)'">
                            <option value="all" style="background:#222">All Channels</option>
                            <option value="active" style="background:#222">Active (< 30 days)</option>
                            <option value="warning" style="background:#222">Inactive (> 1 month)</option>
                            <option value="dead" style="background:#222">Dead (> 3 months)</option>
                        </select>
                        <select id="ypp-health-sort-dropdown" style="background: rgba(255,255,255,0.08); color: #fff; border: 1px solid rgba(255,255,255,0.1); padding: 8px 16px; border-radius: 8px; cursor: pointer; outline: none; font-size: 13px; font-weight: 500; transition: 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.12)'" onmouseout="this.style.background='rgba(255,255,255,0.08)'">
                            <option value="latest" style="background:#222">Latest Upload First</option>
                            <option value="oldest" style="background:#222">Oldest Upload First</option>
                            <option value="az" style="background:#222">Alphabetical (A-Z)</option>
                        </select>
                    </div>
                    <div id="ypp-health-results" class="ypp-scroll-list" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; padding-right: 8px;">
                        <div style="text-align: center; color: #666; margin-top: 60px; font-size: 16px; font-weight: 500;">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#444" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:16px; display:block; margin-left:auto; margin-right:auto;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            Click "Start Scan" to fetch channel data.
                        </div>
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
            
            // Extract ytInitialData safely
            const match = text.match(/var ytInitialData = (\{.*?\});<\/script>/);
            if (!match) throw new Error("Could not parse YouTube data structure.");
            
            let data;
            try {
                data = JSON.parse(match[1]);
            } catch (parseError) {
                throw new Error("Failed to parse YouTube initial data JSON.");
            }

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

        if (!(await window.YPP.features.CustomDialog.confirm('Bulk Unsubscribe', `Are you sure you want to permanently unsubscribe from ${checkboxes.length} channels?`, 'Unsubscribe', true))) return;

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
            await window.YPP.features.CustomDialog.alert('Error', "Could not get YouTube API credentials.");
            return;
        }

        const btn = overlay.querySelector('#ypp-health-unsub-btn');
        btn.textContent = 'Unsubscribing...';
        btn.disabled = true;

        let successCount = 0;
        
        // Compute authentication headers ONCE for the bulk operation
        const sapisid = document.cookie.split('; ').find(row => row.startsWith('SAPISID='))?.split('=')[1];
        const origin = window.location.origin;
        const time = Math.floor(Date.now() / 1000);
        
        const sha1 = async (str) => {
            const buffer = new TextEncoder().encode(str);
            const hashBuffer = await crypto.subtle.digest('SHA-1', buffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        };
        
        let baseHeaders = {
            'Content-Type': 'application/json',
            'X-Goog-AuthUser': '0',
            'X-Goog-Visitor-Id': config.visitorData || '',
            'X-Youtube-Client-Name': '1',
            'X-Youtube-Client-Version': config.clientVersion,
            'Origin': origin,
        };

        if (sapisid) {
            const hash = await sha1(`${time} ${sapisid} ${origin}`);
            baseHeaders['Authorization'] = `SAPISIDHASH ${time}_${hash}`;
        }

        for (const cb of checkboxes) {
            const channelId = cb.value;
            const params = cb.dataset.params;
            
            try {

                const payload = {
                    context: context,
                    channelIds: [channelId]
                };
                if (params) payload.params = params;

                if (!params) {
                    console.warn("Missing unsubscribe params for channel:", channelId);
                    // YouTube API often fails without params, but we can try without it
                }

                const res = await fetch(`/youtubei/v1/subscription/unsubscribe?key=${apiKey}`, {
                    method: 'POST',
                    headers: baseHeaders,
                    credentials: 'include',
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    successCount++;
                    cb.closest('.ypp-channel-health-row').style.opacity = '0.3';
                    cb.disabled = true;
                    cb.checked = false;
                } else {
                    const text = await res.text();
                    console.error("Unsub failed API response:", res.status, text);
                    await window.YPP.features.CustomDialog.alert('Error', "Failed to unsubscribe: " + res.status);
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
