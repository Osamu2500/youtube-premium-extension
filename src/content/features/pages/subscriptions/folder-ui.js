/**
 * Folder UI
 * Owns: DOM injection and rendering for the Guide sidebar (left navigation),
 * filter chips (on feed), channel/card popovers, and DOM observers for these UI elements.
 *
 * Security notes:
 *  - CustomDialog: title/message/confirmText are HTML-escaped; prompt defaultValue is set
 *    via DOM .value property (never injected into an HTML attribute).
 *  - renderGuideFolders: folder names HTML-escaped before innerHTML; render-key cache skips
 *    full re-renders when data is unchanged.
 *  - renderChannelPopover: rebuilt with DOM methods — no innerHTML for dynamic content,
 *    no inline event handlers. XSS-safe for channelName and folderName. Click-outside
 *    listener attached exactly once (flag guard) to prevent unbounded accumulation.
 *  - ChannelHealthUI / runScan: all onmouseover/onmouseout inline JS removed; replaced
 *    with addEventListener (required for Chrome MV3 CSP compliance). Checkbox change
 *    listener guarded against accumulation on Retry.
 *  - runScan: ytInitialData extracted with string indices rather than a regex, fixing
 *    silent failure on YouTube's typical multiline JSON payload.
 *  - _getYoutubeConfig: extracted as a named private static method for clarity and
 *    independent testability.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.CustomDialog = class CustomDialog {

    // ── Private helpers ────────────────────────────────────────────────────

    /**
     * Creates and appends the semi-transparent overlay backdrop to the body.
     * @returns {HTMLDivElement}
     */
    static _createOverlay() {
        const overlay = document.createElement('div');
        overlay.style.cssText = [
            'position:fixed;top:0;left:0;width:100%;height:100%',
            'background:rgba(0,0,0,0.6);backdrop-filter:blur(8px)',
            'z-index:999999;display:flex;align-items:center;justify-content:center',
            'opacity:0;transition:opacity 0.2s',
        ].join(';');
        document.body.appendChild(overlay);
        return overlay;
    }

    /**
     * Wraps `innerHtml` in the shared dialog card shell and injects it into
     * `overlay`, then triggers the entry animation.
     * @param {HTMLElement} overlay
     * @param {string}      innerHtml  Already-escaped HTML for the card body
     * @returns {HTMLElement} The card element (overlay.children[0])
     */
    static _buildCard(overlay, innerHtml) {
        overlay.innerHTML = `
            <div style="background:#1a1a1a;border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:24px;width:100%;max-width:360px;box-shadow:0 16px 48px rgba(0,0,0,0.5);transform:scale(0.95);transition:transform 0.2s;display:flex;flex-direction:column;gap:16px;">
                ${innerHtml}
            </div>
        `;
        const card = overlay.children[0];
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            card.style.transform = 'scale(1)';
        });
        return card;
    }

    /**
     * Animates the dialog out and removes the overlay from the DOM.
     * @param {HTMLElement} overlay
     * @param {Function}    resolve  Promise resolver
     * @param {*}           value    Value to resolve the promise with
     */
    static _closeOverlay(overlay, resolve, value) {
        overlay.style.opacity = '0';
        overlay.children[0].style.transform = 'scale(0.95)';
        setTimeout(() => overlay.remove(), 200);
        resolve(value);
    }

    // ── Public API ─────────────────────────────────────────────────────────

    /**
     * Shows a simple alert dialog with an OK button.
     * @param {string} title
     * @param {string} message
     * @returns {Promise<void>}
     */
    static alert(title, message) {
        return new Promise(resolve => {
            const overlay = this._createOverlay();
            this._buildCard(overlay, `
                <div style="font-size:18px;font-weight:600;color:#fff;">${_escHtml(title)}</div>
                <div style="font-size:14px;color:#aaa;line-height:1.5;">${_escHtml(message)}</div>
                <div style="display:flex;justify-content:flex-end;">
                    <button id="ypp-alert-ok" style="background:#6c63ff;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-weight:500;cursor:pointer;">OK</button>
                </div>
            `);
            overlay.querySelector('#ypp-alert-ok').addEventListener('click', () =>
                this._closeOverlay(overlay, resolve, undefined)
            );
        });
    }

    /**
     * Shows a confirm dialog with Cancel / Confirm buttons.
     * @param {string}  title
     * @param {string}  message
     * @param {string}  [confirmText='Confirm']
     * @param {boolean} [danger=false]  When true the confirm button is styled red
     * @returns {Promise<boolean>}  true = confirmed, false = cancelled
     */
    static confirm(title, message, confirmText = 'Confirm', danger = false) {
        return new Promise(resolve => {
            const overlay = this._createOverlay();
            const btnColor = danger ? '#ff4e45' : '#6c63ff';
            this._buildCard(overlay, `
                <div style="font-size:18px;font-weight:600;color:#fff;">${_escHtml(title)}</div>
                <div style="font-size:14px;color:#aaa;line-height:1.5;">${_escHtml(message)}</div>
                <div style="display:flex;justify-content:flex-end;gap:12px;">
                    <button id="ypp-confirm-cancel" style="background:rgba(255,255,255,0.05);color:#fff;border:none;padding:10px 20px;border-radius:8px;font-weight:500;cursor:pointer;">Cancel</button>
                    <button id="ypp-confirm-ok" style="background:${btnColor};color:#fff;border:none;padding:10px 20px;border-radius:8px;font-weight:500;cursor:pointer;">${_escHtml(confirmText)}</button>
                </div>
            `);
            overlay.querySelector('#ypp-confirm-cancel').addEventListener('click', () =>
                this._closeOverlay(overlay, resolve, false)
            );
            overlay.querySelector('#ypp-confirm-ok').addEventListener('click', () =>
                this._closeOverlay(overlay, resolve, true)
            );
        });
    }

    /**
     * Shows a text-input prompt dialog.
     * @param {string} title
     * @param {string} message
     * @param {string} [placeholder='']
     * @param {string} [defaultValue='']
     * @returns {Promise<string|null>}  The input value, or null if cancelled
     */
    static prompt(title, message, placeholder = '', defaultValue = '') {
        return new Promise(resolve => {
            const overlay = this._createOverlay();
            // Escape values going into HTML attributes to prevent injection
            const safePlaceholder = _escHtml(placeholder);
            this._buildCard(overlay, `
                <div style="font-size:18px;font-weight:600;color:#fff;">${_escHtml(title)}</div>
                <div style="font-size:14px;color:#aaa;line-height:1.5;margin-bottom:-4px;">${_escHtml(message)}</div>
                <input type="text" id="ypp-prompt-input" placeholder="${safePlaceholder}" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#fff;padding:12px;border-radius:8px;font-size:14px;outline:none;width:100%;box-sizing:border-box;">
                <div style="display:flex;justify-content:flex-end;gap:12px;">
                    <button id="ypp-prompt-cancel" style="background:rgba(255,255,255,0.05);color:#fff;border:none;padding:10px 20px;border-radius:8px;font-weight:500;cursor:pointer;">Cancel</button>
                    <button id="ypp-prompt-ok" style="background:#6c63ff;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-weight:500;cursor:pointer;">Submit</button>
                </div>
            `);

            // Set defaultValue via DOM property (safe — avoids attribute injection)
            const input = overlay.querySelector('#ypp-prompt-input');
            input.value = defaultValue;
            input.focus();
            input.select();

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter')  this._closeOverlay(overlay, resolve, input.value);
                if (e.key === 'Escape') this._closeOverlay(overlay, resolve, null);
            });
            overlay.querySelector('#ypp-prompt-cancel').addEventListener('click', () =>
                this._closeOverlay(overlay, resolve, null)
            );
            overlay.querySelector('#ypp-prompt-ok').addEventListener('click', () =>
                this._closeOverlay(overlay, resolve, input.value)
            );
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

            if (this.orchestrator.settings?.subscriptionFolders !== false) {
                chipsBar.innerHTML = '';
                const activeFolder = this.orchestrator.getActiveFolder();

                const selectStyle = 'background: rgba(255,255,255,0.08); color: #fff; border: 1px solid rgba(255,255,255,0.1); padding: 8px 12px; border-radius: 8px; cursor: pointer; outline: none; font-size: 14px; font-weight: 500; min-width: 160px; transition: 0.2s;';
                
                const folderSelectContainer = document.createElement('div');
                folderSelectContainer.className = 'ypp-sub-filter-group ypp-folder-dropdown-container';
                folderSelectContainer.style.display = 'flex';
                folderSelectContainer.style.alignItems = 'center';
                folderSelectContainer.style.gap = '8px';
                
                const label = document.createElement('span');
                label.className = 'ypp-sub-filter-label';
                label.style.cssText = 'color: #aaa; font-size: 13px; font-weight: 500; text-transform: uppercase;';
                label.textContent = 'Folder';
                
                const select = document.createElement('select');
                select.className = 'ypp-filter-dropdown';
                select.id = 'ypp-folder-select';
                select.style.cssText = selectStyle;
                
                select.innerHTML = `<option value="" style="background:#222">All Subscriptions</option>`;
                
                Object.keys(this.storage.folders).forEach(folderName => {
                    const opt = document.createElement('option');
                    opt.value = folderName;
                    opt.style.background = '#222';
                    opt.textContent = folderName;
                    if (activeFolder === folderName) opt.selected = true;
                    select.appendChild(opt);
                });
                
                const noFolderOpt = document.createElement('option');
                noFolderOpt.value = '__no_folder__';
                noFolderOpt.style.background = '#222';
                noFolderOpt.textContent = 'Uncategorized (No Folder)';
                if (activeFolder === '__no_folder__') noFolderOpt.selected = true;
                select.appendChild(noFolderOpt);
                
                const manageOpt = document.createElement('option');
                manageOpt.value = '__new__';
                manageOpt.style.background = '#222';
                manageOpt.textContent = '+ Create New Folder';
                select.appendChild(manageOpt);

                select.addEventListener('mouseover', () => select.style.background = 'rgba(255,255,255,0.12)');
                select.addEventListener('mouseout', () => select.style.background = 'rgba(255,255,255,0.08)');
                
                select.addEventListener('change', async (e) => {
                    const val = e.target.value;
                    if (val === '__new__') {
                        e.target.value = activeFolder || '';
                        const name = await window.YPP.features.CustomDialog.prompt('New Folder', 'Enter a name for the new folder:');
                        if (name && name.trim()) {
                            if (this.storage.addFolder(name.trim())) {
                                this.renderFilterChips();
                                this.renderGuideFolders();
                            }
                        }
                    } else {
                        this.orchestrator.setActiveFolder(val || null);
                    }
                });

                folderSelectContainer.appendChild(label);
                folderSelectContainer.appendChild(select);

                // Play All Action
                if (activeFolder) {
                    const playBtn = document.createElement('button');
                    playBtn.className = 'ypp-filter-chip ypp-play-action-chip';
                    playBtn.innerHTML = `<svg height="16" width="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 4px; vertical-align: text-bottom;"><path d="M8 5v14l11-7z"/></svg> Play All`;
                    playBtn.style.backgroundColor = 'var(--ypp-accent, #ff0000)';
                    playBtn.style.color = '#fff';
                    playBtn.style.border = 'none';
                    playBtn.addEventListener('click', () => this.orchestrator.playAll(activeFolder));
                    folderSelectContainer.appendChild(playBtn);
                }

                const leftContainer = document.createElement('div');
                leftContainer.className = 'ypp-folder-chips-left';
                leftContainer.appendChild(folderSelectContainer);

                // Toggles
                this._createToggleChip(leftContainer, 'Hide Shorts', this.orchestrator.getHideShorts(), (val) => {
                    this.orchestrator.setHideShorts(val);
                    this.orchestrator.updateFilterState();
                });

                this._createToggleChip(leftContainer, 'Hide Watched', this.orchestrator.getHideWatched(), (val) => {
                    this.orchestrator.setHideWatched(val);
                    this.orchestrator.updateFilterState();
                });

                chipsBar.appendChild(leftContainer);
                
                chipsBar.style.display = 'flex';
            } else {
                chipsBar.style.display = 'none';
                chipsBar.innerHTML = '';
            }

            this._injectFilterBar(chipsBar);
        }, { runOnce: true });
    }

    removeFilterChips() {
        const chipsBar = document.getElementById('ypp-folder-chips');
        if (chipsBar) chipsBar.remove();
        const filterBar = document.querySelector('.ypp-sub-filter-bar');
        if (filterBar) filterBar.remove();
    }

    _injectFilterBar(chipsBar) {
        if (!chipsBar) return;
        
        // Remove existing right container if it exists
        const existingRight = chipsBar.querySelector('.ypp-folder-chips-right');
        if (existingRight) existingRight.remove();
        
        const existingSeparator = chipsBar.querySelector('.ypp-filter-separator');
        if (existingSeparator) existingSeparator.remove();

        const showFilter = this.orchestrator.settings?.enableFilterBar !== false;
        const showHealth = this.orchestrator.settings?.enableChannelHealth !== false;

        if (!showFilter && !showHealth) return;

        // Add separator
        const separator = document.createElement('div');
        separator.className = 'ypp-filter-separator';
        chipsBar.appendChild(separator);

        const rightContainer = document.createElement('div');
        rightContainer.className = 'ypp-folder-chips-right';
        
        const selectStyle = 'background: rgba(255,255,255,0.08); color: #fff; border: 1px solid rgba(255,255,255,0.1); padding: 8px 12px; border-radius: 8px; cursor: pointer; outline: none; font-size: 14px; font-weight: 500; min-width: 120px; transition: 0.2s;';

        let innerHTML = '';

        if (showFilter) {
            innerHTML += `
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
            `;
        }

        if (showHealth) {
            innerHTML += `
                <div class="ypp-sub-filter-group">
                    <button id="ypp-health-btn" class="ypp-btn-primary" style="background: rgba(108,99,255,0.1); border-color: rgba(108,99,255,0.3); color: #a8a4ff; display: flex; align-items: center; gap: 6px; padding: 8px 16px; font-size: 14px; border-radius: 8px; transition: 0.2s;">
                        <svg height="18" width="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 9h-2V7h-2v5H6v2h2v5h2v-5h2v-2z"/></svg>
                        Channel Health
                    </button>
                </div>
            `;
        }

        rightContainer.innerHTML = innerHTML;
        chipsBar.appendChild(rightContainer);

        const bar = rightContainer;

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
                window.YPP.features.ChannelHealthUI.openModal(this);
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
            // Optional chaining guards against missing .ypp-folder-name (defensive)
            if (el.querySelector('.ypp-folder-name')?.textContent === folderName) {
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

    /**
     * Renders (or re-renders) the folder-membership popover anchored below `buttonEl`.
     *
     * Security notes:
     *  - The outer shell is static HTML with no dynamic values interpolated, so innerHTML is safe.
     *  - channelName is set via textContent (XSS-safe).
     *  - Folder list items are built entirely via DOM methods: no innerHTML, no inline handlers,
     *    and no attribute injection — eliminating both XSS and CSP-violating onmouseover attributes.
     *
     * @param {HTMLElement} buttonEl    - Anchor element the popover appears below
     * @param {string}      channelName - Channel to assign/remove from folders
     */
    renderChannelPopover(buttonEl, channelName) {
        let popover = document.getElementById('ypp-folder-popover');
        if (!popover) {
            popover = document.createElement('div');
            popover.id = 'ypp-folder-popover';
            popover.className = 'ypp-glass-popover';
            document.body.appendChild(popover);
        }

        // Attach click-outside listener exactly once — prevents unbounded accumulation
        // across multiple popover opens.
        if (!this._popoverListenerAttached) {
            this._popoverListenerAttached = true;
            document.addEventListener('click', (e) => {
                const popoverEl = document.getElementById('ypp-folder-popover');
                if (!popoverEl) return;
                const clickedInside    = popoverEl.contains(e.target);
                const clickedFolderBtn = e.target.closest('.ypp-card-folder-btn') || e.target.closest('#ypp-channel-folder-btn');
                if (!clickedInside && !clickedFolderBtn) {
                    popoverEl.classList.remove('visible');
                }
            });
        }

        const rect = buttonEl.getBoundingClientRect();
        popover.style.top  = `${rect.bottom + window.scrollY + 8}px`;
        popover.style.left = `${rect.left + window.scrollX}px`;

        // Static shell only — no dynamic values interpolated here.
        popover.innerHTML = `
            <div style="background: rgba(28, 27, 31, 0.7); backdrop-filter: blur(40px); border: 1px solid rgba(255,255,255,0.05); border-radius: 20px; box-shadow: 0 16px 40px rgba(0,0,0,0.4); width: 260px; overflow: hidden; display: flex; flex-direction: column;">
                <div class="ypp-popover-header" style="padding: 20px 20px 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); background: rgba(208, 188, 255, 0.05);">
                    <div style="font-size: 11px; color: rgba(208, 188, 255, 0.8); text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px; font-weight: 600; font-family: 'Roboto', 'Google Sans', sans-serif;">Save to folder</div>
                    <div id="ypp-popover-channel-name" style="font-size: 16px; color: #E6E1E5; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: 'Roboto', 'Google Sans', sans-serif;"></div>
                </div>
                <div class="ypp-popover-list" id="ypp-popover-list" style="padding: 12px; max-height: 300px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px;"></div>
            </div>
        `;

        // Inject channel name via textContent — XSS-safe, no HTML parsing.
        popover.querySelector('#ypp-popover-channel-name').textContent = channelName;

        const listEl    = popover.querySelector('#ypp-popover-list');
        const folderKeys = Object.keys(this.storage.folders);

        if (folderKeys.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.style.cssText = 'padding: 16px; text-align: center; color: rgba(255,255,255,0.5); font-size: 13px;';
            emptyMsg.textContent = 'No folders exist.';
            listEl.appendChild(emptyMsg);
        } else {
            folderKeys.forEach(folderName => {
                const isChecked = this.storage.folders[folderName].includes(channelName);

                // Build via DOM — no innerHTML injection, no inline event handler attributes.
                const label = document.createElement('label');
                label.className = 'ypp-folder-checkbox';
                label.style.cssText = 'display: flex; align-items: center; padding: 12px 14px; border-radius: 12px; cursor: pointer; transition: background 0.2s;';
                label.addEventListener('mouseover', () => { label.style.background = 'rgba(255,255,255,0.08)'; });
                label.addEventListener('mouseout',  () => { label.style.background = 'transparent'; });

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                // dataset assignment is safe — bypasses HTML attribute parsing.
                checkbox.dataset.folder = folderName;
                checkbox.checked = isChecked;
                checkbox.style.cssText = 'margin-right: 14px; accent-color: #D0BCFF; width: 18px; height: 18px; cursor: pointer; border-radius: 4px;';

                // Wire up change handler with a closure over the typed `folderName`.
                checkbox.addEventListener('change', () => {
                    const activeFolder = this.orchestrator.getActiveFolder();
                    if (checkbox.checked) {
                        this.storage.addChannelToFolder(channelName, folderName);
                        if (activeFolder === folderName || activeFolder === '__no_folder__') {
                            this.orchestrator.forceRefreshFeed();
                        }
                    } else {
                        this.storage.removeChannelFromFolder(channelName, folderName);
                        if (activeFolder === folderName || activeFolder === '__no_folder__') {
                            this.orchestrator.forceRefreshFeed();
                        }
                    }
                    this.renderGuideFolders(); // Live-update sidebar channel counts

                    // Live filter update for Channel Health modal list
                    const filterSel = document.getElementById('ypp-health-folder-filter-dropdown');
                    if (filterSel && filterSel.value !== 'all') {
                        const row = document.querySelector(`.ypp-channel-health-row[data-name="${CSS.escape(channelName)}"]`);
                        if (row) {
                            let folders = row.dataset.folders ? row.dataset.folders.split(',') : [];
                            if (checkbox.checked) {
                                if (!folders.includes(folderName)) folders.push(folderName);
                            } else {
                                folders = folders.filter(f => f !== folderName);
                            }
                            row.dataset.folders = folders.join(',');
                            
                            const folderFilter = filterSel.value;
                            let shouldShow = (folderFilter === '__no_folder__') ? (folders.length === 0) : folders.includes(folderFilter);
                            
                            if (!shouldShow) {
                                row.style.display = 'none';
                            } else {
                                // Important: We need to also check the status filter and search filter before showing
                                const statusFilter = document.getElementById('ypp-health-filter-dropdown')?.value || 'all';
                                const searchQ = document.getElementById('ypp-health-search-input')?.value?.toLowerCase()?.trim() || '';
                                let matchesStatus = (statusFilter === 'all' || row.dataset.status === statusFilter);
                                let matchesSearch = searchQ ? row.dataset.name.toLowerCase().includes(searchQ) : true;
                                if (matchesStatus && matchesSearch) row.style.display = 'flex';
                            }
                        }
                    }
                });

                const nameSpan = document.createElement('span');
                nameSpan.style.cssText = 'color: #E6E1E5; font-size: 15px; font-weight: 500; font-family: "Roboto", "Google Sans", sans-serif;';
                nameSpan.textContent = folderName; // XSS-safe

                label.appendChild(checkbox);
                label.appendChild(nameSpan);
                listEl.appendChild(label);
            });
        }

        popover.classList.add('visible');
    }
};

// =========================================================================
// CHANNEL HEALTH DASHBOARD
// =========================================================================

window.YPP.features.ChannelHealthUI = class ChannelHealthUI {
    static openModal(folderUI) {
        if (document.getElementById('ypp-health-modal')) return;

        const overlay = document.createElement('div');
        overlay.className = 'ypp-modal-overlay open';
        overlay.id = 'ypp-health-modal';
        document.body.appendChild(overlay);

        overlay.innerHTML = `
            <div class="ypp-modal-content ypp-organizer-modal" style="font-family: 'Roboto', 'Google Sans', sans-serif; width: 100vw; height: 100vh; display: flex; flex-direction: column; background: rgba(20, 19, 24, 0.95); backdrop-filter: blur(60px); -webkit-backdrop-filter: blur(60px); overflow: hidden; animation: ypp-scale-in 0.3s cubic-bezier(0.2, 0, 0, 1);">
                <div class="ypp-modal-header" style="background: rgba(255,255,255,0.03); border-bottom: 1px solid rgba(255,255,255,0.05); padding: 20px 32px; display: flex; justify-content: space-between; align-items: center; z-index: 10;">
                    <div style="display: flex; align-items: center; gap: 16px;">
                        <div style="background: rgba(208, 188, 255, 0.15); border-radius: 50%; padding: 8px;">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D0BCFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                        </div>
                        <span class="ypp-modal-title" style="font-size: 22px; font-weight: 500; color: #E6E1E5; letter-spacing: 0;">Channel Organizer</span>
                    </div>
                    <div style="display: flex; gap: 12px; align-items: center;">
                        <button id="ypp-health-create-folder-btn" class="ypp-btn-primary" style="background: transparent; color: #D0BCFF; border: 1px solid rgba(208, 188, 255, 0.3); padding: 8px 20px; border-radius: 100px; font-weight: 500; font-size: 13px; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='rgba(208, 188, 255, 0.08)'" onmouseout="this.style.background='transparent'">Create Folder</button>
                        <button id="ypp-health-delete-folder-btn" class="ypp-btn-primary" style="background: transparent; color: #F2B8B5; border: 1px solid rgba(242, 184, 181, 0.3); padding: 8px 20px; border-radius: 100px; font-weight: 500; font-size: 13px; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='rgba(242, 184, 181, 0.08)'" onmouseout="this.style.background='transparent'">Delete Folder</button>
                        <button id="ypp-health-scan-btn" class="ypp-btn-primary" style="background: #D0BCFF; color: #381E72; border: none; padding: 8px 20px; border-radius: 100px; font-weight: 500; font-size: 13px; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#E8DEF8'" onmouseout="this.style.background='#D0BCFF'">Start Scan</button>
                        <button id="ypp-health-unsub-btn" class="ypp-btn-primary" style="background: #F2B8B5; color: #601410; border: none; padding: 8px 20px; border-radius: 100px; font-weight: 500; font-size: 13px; cursor: pointer; transition: background 0.2s; display: none;" onmouseover="this.style.background='#F9DEDC'" onmouseout="this.style.background='#F2B8B5'">Unsubscribe Selected</button>
                        <button id="ypp-health-add-folder-btn" class="ypp-btn-primary" style="background: rgba(208, 188, 255, 0.12); color: #D0BCFF; border: none; padding: 8px 20px; border-radius: 100px; font-weight: 500; font-size: 13px; cursor: pointer; transition: background 0.2s; display: none;" onmouseover="this.style.background='rgba(208, 188, 255, 0.2)'" onmouseout="this.style.background='rgba(208, 188, 255, 0.12)'">Add to Folder</button>
                        <div style="width: 1px; height: 24px; background: rgba(255,255,255,0.1); margin: 0 4px;"></div>
                        <button class="ypp-modal-close" style="background: transparent; border: none; color: #CAC4D0; font-size: 28px; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s; line-height: 1;" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='transparent'">&times;</button>
                    </div>
                </div>
                <div class="ypp-organizer-body" style="flex-direction: column; padding: 32px; overflow: hidden; display: flex; flex: 1; background: transparent;">
                    <div style="display: flex; gap: 24px; margin-bottom: 24px;">
                        <div class="ypp-health-stat" data-filter="active" style="flex: 1; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 24px; border-radius: 24px; text-align: left; cursor: pointer; transition: background 0.2s;">
                            <div style="color: #CAC4D0; font-size: 13px; font-weight: 500; letter-spacing: 0.1px; margin-bottom: 8px;">Active (< 30 days)</div>
                            <div style="color: #81C995; font-size: 40px; font-weight: 400; line-height: 1;" id="ypp-health-active">0</div>
                        </div>
                        <div class="ypp-health-stat" data-filter="warning" style="flex: 1; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 24px; border-radius: 24px; text-align: left; cursor: pointer; transition: background 0.2s;">
                            <div style="color: #CAC4D0; font-size: 13px; font-weight: 500; letter-spacing: 0.1px; margin-bottom: 8px;">Inactive (> 1 month)</div>
                            <div style="color: #FDD663; font-size: 40px; font-weight: 400; line-height: 1;" id="ypp-health-warning">0</div>
                        </div>
                        <div class="ypp-health-stat" data-filter="dead" style="flex: 1; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 24px; border-radius: 24px; text-align: left; cursor: pointer; transition: background 0.2s;">
                            <div style="color: #CAC4D0; font-size: 13px; font-weight: 500; letter-spacing: 0.1px; margin-bottom: 8px;">Dead (> 3 months)</div>
                            <div style="color: #F2B8B5; font-size: 40px; font-weight: 400; line-height: 1;" id="ypp-health-dead">0</div>
                        </div>
                    </div>
                    <div style="display: flex; justify-content: flex-end; gap: 16px; margin-bottom: 16px; align-items: center;">
                        <div style="position: relative; flex: 1; max-width: 320px; margin-right: auto; display: flex; align-items: center;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CAC4D0" stroke-width="2" style="position: absolute; left: 16px;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            <input type="text" id="ypp-health-search-input" placeholder="Search channels..." style="width: 100%; background: rgba(255,255,255,0.05); color: #E6E1E5; border: 1px solid rgba(255,255,255,0.1); padding: 10px 16px 10px 42px; border-radius: 100px; outline: none; font-size: 14px; transition: background 0.2s;" />
                        </div>
                        <span style="color: #CAC4D0; font-size: 14px; font-weight: 500;">Filters & Sort:</span>
                        <select id="ypp-health-folder-filter-dropdown" style="background: rgba(255,255,255,0.05); color: #E6E1E5; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; outline: none; font-size: 14px; font-weight: 500; transition: background 0.2s; border-bottom: 1px solid rgba(255,255,255,0.2);">
                            <option value="all" style="background:#1D1B20">All Folders</option>
                            <option value="__no_folder__" style="background:#1D1B20">Uncategorized (No Folder)</option>
                            ${folderUI ? Object.keys(folderUI.storage.folders).map(f => `<option value="${f}" style="background:#1D1B20">${f}</option>`).join('') : ''}
                        </select>
                        <select id="ypp-health-filter-dropdown" style="background: rgba(255,255,255,0.05); color: #E6E1E5; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; outline: none; font-size: 14px; font-weight: 500; transition: background 0.2s; border-bottom: 1px solid rgba(255,255,255,0.2);">
                            <option value="all" style="background:#1D1B20">All Statuses</option>
                            <option value="active" style="background:#1D1B20">Active (< 30 days)</option>
                            <option value="warning" style="background:#1D1B20">Inactive (> 1 month)</option>
                            <option value="dead" style="background:#1D1B20">Dead (> 3 months)</option>
                        </select>
                        <select id="ypp-health-sort-dropdown" style="background: rgba(255,255,255,0.05); color: #E6E1E5; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; outline: none; font-size: 14px; font-weight: 500; transition: background 0.2s; border-bottom: 1px solid rgba(255,255,255,0.2);">
                            <option value="latest" style="background:#1D1B20">Latest Upload First</option>
                            <option value="oldest" style="background:#1D1B20">Oldest Upload First</option>
                            <option value="az" style="background:#1D1B20">Alphabetical (A-Z)</option>
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

        // Hover effects — using addEventListener instead of inline handlers for CSP compliance.
        const closeBtn     = overlay.querySelector('.ypp-modal-close');
        const scanBtn      = overlay.querySelector('#ypp-health-scan-btn');
        const unsubBtn     = overlay.querySelector('#ypp-health-unsub-btn');
        const addFolderBtn = overlay.querySelector('#ypp-health-add-folder-btn');
        const createBtn    = overlay.querySelector('#ypp-health-create-folder-btn');
        const deleteBtn    = overlay.querySelector('#ypp-health-delete-folder-btn');
        const folderSel    = overlay.querySelector('#ypp-health-folder-filter-dropdown');
        const filterSel    = overlay.querySelector('#ypp-health-filter-dropdown');
        const sortSel      = overlay.querySelector('#ypp-health-sort-dropdown');

        closeBtn.addEventListener('mouseover', () => { closeBtn.style.background  = 'rgba(255,255,255,0.1)'; });
        closeBtn.addEventListener('mouseout',  () => { closeBtn.style.background  = 'rgba(255,255,255,0.05)'; });
        scanBtn.addEventListener('mouseover',  () => { scanBtn.style.filter       = 'brightness(1.1)'; });
        scanBtn.addEventListener('mouseout',   () => { scanBtn.style.filter       = 'brightness(1)'; });
        unsubBtn.addEventListener('mouseover', () => { unsubBtn.style.background  = 'rgba(255, 78, 69, 0.25)'; });
        unsubBtn.addEventListener('mouseout',  () => { unsubBtn.style.background  = 'rgba(255, 78, 69, 0.15)'; });
        addFolderBtn.addEventListener('mouseover', () => { addFolderBtn.style.background = 'rgba(108, 99, 255, 0.25)'; });
        addFolderBtn.addEventListener('mouseout',  () => { addFolderBtn.style.background = 'rgba(108, 99, 255, 0.15)'; });
        createBtn.addEventListener('mouseover', () => { createBtn.style.background = 'rgba(255,255,255,0.1)'; });
        createBtn.addEventListener('mouseout',  () => { createBtn.style.background = 'rgba(255,255,255,0.05)'; });
        deleteBtn.addEventListener('mouseover', () => { deleteBtn.style.background = 'rgba(255, 78, 69, 0.15)'; deleteBtn.style.color = '#ff4e45'; deleteBtn.style.borderColor = 'rgba(255, 78, 69, 0.3)'; });
        deleteBtn.addEventListener('mouseout',  () => { deleteBtn.style.background = 'rgba(255,255,255,0.05)'; deleteBtn.style.color = '#fff'; deleteBtn.style.borderColor = 'rgba(255,255,255,0.1)'; });
        folderSel.addEventListener('mouseover',() => { folderSel.style.background = 'rgba(255,255,255,0.12)'; });
        folderSel.addEventListener('mouseout', () => { folderSel.style.background = 'rgba(255,255,255,0.08)'; });
        filterSel.addEventListener('mouseover',() => { filterSel.style.background = 'rgba(255,255,255,0.12)'; });
        filterSel.addEventListener('mouseout', () => { filterSel.style.background = 'rgba(255,255,255,0.08)'; });
        sortSel.addEventListener('mouseover',  () => { sortSel.style.background   = 'rgba(255,255,255,0.12)'; });
        sortSel.addEventListener('mouseout',   () => { sortSel.style.background   = 'rgba(255,255,255,0.08)'; });

        createBtn.addEventListener('click', async () => {
            if (!folderUI) return;
            const name = await window.YPP.features.CustomDialog.prompt('Create Folder', 'Enter a name for the new folder:');
            if (name && name.trim()) {
                if (folderUI.storage.addFolder(name.trim())) {
                    if (folderUI.renderGuideFolders) folderUI.renderGuideFolders();
                    if (folderUI.renderFilterChips) folderUI.renderFilterChips();
                    const oldText = createBtn.textContent;
                    createBtn.textContent = 'Created!';
                    setTimeout(() => createBtn.textContent = oldText, 2000);
                }
            }
        });

        deleteBtn.addEventListener('click', async () => {
            if (!folderUI) return;
            const folderNames = Object.keys(folderUI.storage.folders);
            if (folderNames.length === 0) {
                await window.YPP.features.CustomDialog.alert('No Folders', 'You have no folders to delete.');
                return;
            }
            // For simplicity, prompt user to type the name of the folder they want to delete.
            const name = await window.YPP.features.CustomDialog.prompt('Delete Folder', `Enter the exact name of the folder to delete.\\n\\nAvailable folders:\\n${folderNames.join(', ')}`);
            if (name && folderNames.includes(name.trim())) {
                if (await window.YPP.features.CustomDialog.confirm('Delete Folder', `Are you sure you want to permanently delete "${name.trim()}"?`, 'Delete', true)) {
                    folderUI.storage.deleteFolder(name.trim());
                    if (folderUI.orchestrator.getActiveFolder() === name.trim()) {
                        folderUI.orchestrator.setActiveFolder(null);
                    }
                    if (folderUI.renderGuideFolders) folderUI.renderGuideFolders();
                    if (folderUI.renderFilterChips) folderUI.renderFilterChips();
                    const oldText = deleteBtn.textContent;
                    deleteBtn.textContent = 'Deleted!';
                    setTimeout(() => deleteBtn.textContent = oldText, 2000);
                }
            } else if (name) {
                await window.YPP.features.CustomDialog.alert('Error', 'Folder not found. Make sure you typed the name exactly as shown.');
            }
        });

        overlay.querySelector('#ypp-health-scan-btn').addEventListener('click', () => {
            this.runScan(overlay, folderUI);
        });

        overlay.querySelector('#ypp-health-unsub-btn').addEventListener('click', () => {
            this.bulkUnsubscribe(overlay);
        });

        overlay.querySelector('#ypp-health-add-folder-btn').addEventListener('click', () => {
            if (folderUI) this.bulkAddToFolder(overlay, folderUI);
        });

        // Add filter functionality
        const stats = overlay.querySelectorAll('.ypp-health-stat');
        const resultsEl = overlay.querySelector('#ypp-health-results');

        const updateView = () => {
            const filter = filterSel.value;
            const sort = sortSel.value;
            const folderFilter = folderSel.value;
            const searchInput = overlay.querySelector('#ypp-health-search-input');
            const searchQ = searchInput ? searchInput.value.toLowerCase().trim() : '';
            
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
                
                let showByStatus = (filter === 'all' || row.dataset.status === filter);
                let showByFolder = true;
                let showBySearch = true;
                
                if (searchQ) {
                    const name = row.dataset.name.toLowerCase();
                    showBySearch = name.includes(searchQ);
                }
                
                if (folderFilter !== 'all') {
                    if (folderFilter === '__no_folder__') {
                        showByFolder = (row.dataset.folders === '');
                    } else {
                        const folders = row.dataset.folders ? row.dataset.folders.split(',') : [];
                        showByFolder = folders.includes(folderFilter);
                    }
                }

                if (showByStatus && showByFolder && showBySearch) {
                    row.style.display = 'flex';
                } else {
                    row.style.display = 'none';
                }
            });
        };

        stats.forEach(stat => {
            stat.addEventListener('click', () => {
                filterSel.value = filterSel.value === stat.dataset.filter ? 'all' : stat.dataset.filter;
                updateView();
            });
            
            stat.addEventListener('mouseover', () => { if (filterSel.value !== stat.dataset.filter) stat.style.background = 'rgba(255,255,255,0.1)'; });
            stat.addEventListener('mouseout', () => { if (filterSel.value !== stat.dataset.filter) stat.style.background = 'rgba(255,255,255,0.05)'; });
        });

        folderSel.addEventListener('change', updateView);
        filterSel.addEventListener('change', updateView);
        sortSel.addEventListener('change', updateView);

        const searchInput = overlay.querySelector('#ypp-health-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', updateView);
        }
        sortSel.addEventListener('change', updateView);
    }

    static async runScan(overlay, folderUI) {
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
            
            // Extract ytInitialData using string indices rather than a regex.
            // A non-greedy regex without the dotall flag fails on multiline JSON
            // (which YouTube's payload almost always is).
            const START_MARKER = 'var ytInitialData = ';
            const END_MARKER   = ';</script>';
            const startIdx = text.indexOf(START_MARKER);
            if (startIdx === -1) throw new Error('Could not locate ytInitialData in page source.');
            const jsonStart = startIdx + START_MARKER.length;
            const endIdx   = text.indexOf(END_MARKER, jsonStart);
            if (endIdx === -1) throw new Error('Could not determine ytInitialData bounds.');

            let data;
            try {
                data = JSON.parse(text.slice(jsonStart, endIdx));
            } catch (parseError) {
                throw new Error('Failed to parse YouTube initial data JSON.');
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
                    // Extract folders
                    const channelFolders = [];
                    if (folderUI && folderUI.storage && folderUI.storage.folders) {
                        for (const [fName, channelsList] of Object.entries(folderUI.storage.folders)) {
                            if (channelsList.includes(c.name)) {
                                channelFolders.push(fName);
                            }
                        }
                    }
                    const folderBadgesHtml = channelFolders.map(f => `<span style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-right: 4px; color: #ddd; display: inline-block; margin-bottom: 2px;">${f}</span>`).join('');

                    const row = document.createElement('div');
                    row.className = 'ypp-channel-health-row';
                    row.dataset.status = c.status;
                    row.dataset.name = c.name;
                    row.dataset.uploadTime = c.lastUpload;
                    row.dataset.folders = channelFolders.join(',');
                    row.style.cssText = `display: flex; align-items: center; padding: 16px 20px; background: rgba(255,255,255,0.02); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.04); border-radius: 12px; margin-bottom: 10px; border-left: 4px solid ${c.color}; box-shadow: 0 4px 12px rgba(0,0,0,0.1); transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);`;
                    
                    // Hover effect
                    row.addEventListener('mouseover', () => {
                        row.style.background = 'rgba(255,255,255,0.04)';
                        row.style.transform = 'translateY(-1px)';
                        row.style.boxShadow = '0 6px 16px rgba(0,0,0,0.15)';
                    });
                    row.addEventListener('mouseout', () => {
                        row.style.background = 'rgba(255,255,255,0.02)';
                        row.style.transform = 'translateY(0)';
                        row.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                    });

                    row.innerHTML = `
                        <img src="${c.icon}" style="width: 36px; height: 36px; border-radius: 50%; margin-right: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                        <div style="flex: 1;">
                            <div style="color: #fff; font-size: 15px; font-weight: 500; letter-spacing: 0.2px;">${c.name}</div>
                            <div style="color: #aaa; font-size: 12px; margin-bottom: 2px;">Last upload: <span style="color:#ccc;">${c.lastUploadText}</span></div>
                            ${folderBadgesHtml ? `<div style="margin-top: 4px;">${folderBadgesHtml}</div>` : ''}
                        </div>
                        <div style="display: flex; align-items: center; gap: 16px;">
                            <a href="/channel/${c.id}" target="_blank" style="color: #6c63ff; text-decoration: none; font-size: 13px; font-weight: 500; cursor: pointer; transition: 0.2s;" onmouseover="this.style.color='#8b84ff'" onmouseout="this.style.color='#6c63ff'">Visit Channel</a>
                            <label style="display: flex; align-items: center; cursor: pointer; color: #aaa; font-size: 13px; font-weight: 500; user-select: none; transition: 0.2s;" onmouseover="this.style.color='#fff'" onmouseout="this.style.color='#aaa'">
                                <input type="checkbox" class="ypp-unsub-checkbox" value="${c.id}" data-params="${c.unsubParams}" style="margin-right: 8px; width: 16px; height: 16px; cursor: pointer; accent-color: #6c63ff;" ${c.status === 'dead' ? 'checked' : ''}>
                                Select
                            </label>
                            <button class="ypp-indiv-folder-btn" style="background:rgba(108,99,255,0.1); color:#8b84ff; border:1px solid rgba(108,99,255,0.2); border-radius:8px; padding:8px 14px; font-size:13px; font-weight:600; cursor:pointer; transition:all 0.2s;">Folders</button>
                            <button class="ypp-indiv-unsub-btn" style="background:rgba(255,78,69,0.1); color:#ff4e45; border:1px solid rgba(255,78,69,0.2); border-radius:8px; padding:8px 14px; font-size:13px; font-weight:600; cursor:pointer; transition:all 0.2s;">Unsub</button>
                        </div>
                    `;

                    const indivBtn = row.querySelector('.ypp-indiv-unsub-btn');
                    indivBtn.addEventListener('mouseover', () => { indivBtn.style.background = 'rgba(255,78,69,0.2)'; });
                    indivBtn.addEventListener('mouseout',  () => { indivBtn.style.background = 'rgba(255,78,69,0.1)'; });
                    indivBtn.addEventListener('click', () => {
                        this.individualUnsubscribe(c.id, c.unsubParams, c.name, row, indivBtn);
                    });

                    const folderBtn = row.querySelector('.ypp-indiv-folder-btn');
                    folderBtn.addEventListener('mouseover', () => { folderBtn.style.background = 'rgba(108,99,255,0.2)'; });
                    folderBtn.addEventListener('mouseout',  () => { folderBtn.style.background = 'rgba(108,99,255,0.1)'; });
                    folderBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (folderUI) folderUI.renderChannelPopover(folderBtn, c.name);
                    });

                    resultsEl.appendChild(row);
                });

                // Update counts
                overlay.querySelector('#ypp-health-active').textContent = activeCount;
                overlay.querySelector('#ypp-health-warning').textContent = warningCount;
                overlay.querySelector('#ypp-health-dead').textContent = deadCount;
                
                if (deadCount > 0) {
                    overlay.querySelector('#ypp-health-unsub-btn').style.display = 'inline-block';
                    overlay.querySelector('#ypp-health-add-folder-btn').style.display = 'inline-block';
                }
                
                // Re-apply sort and filter logic after appending
                const filterSelect = overlay.querySelector('#ypp-health-filter-dropdown');
                if (filterSelect) {
                    // Triggering a 'change' event will run the updateView logic defined above
                    filterSelect.dispatchEvent(new Event('change'));
                }
            }

            btn.textContent = 'Scan Complete';

            // Guard against listener accumulation: if the user hits Retry the overlay
            // element is the same, so without this flag a second listener would be added.
            if (!overlay._checkboxListenerAttached) {
                overlay._checkboxListenerAttached = true;
                resultsEl.addEventListener('change', (e) => {
                    if (e.target.classList.contains('ypp-unsub-checkbox')) {
                        const checkedCount = resultsEl.querySelectorAll('.ypp-unsub-checkbox:checked').length;
                        const unsubBtn = overlay.querySelector('#ypp-health-unsub-btn');
                        const addFolderBtn = overlay.querySelector('#ypp-health-add-folder-btn');
                        
                        unsubBtn.textContent = checkedCount > 0
                            ? `Unsubscribe Selected (${checkedCount})`
                            : 'Unsubscribe Selected';
                        unsubBtn.disabled = checkedCount === 0;

                        addFolderBtn.textContent = checkedCount > 0
                            ? `Add to Folder (${checkedCount})`
                            : 'Add to Folder';
                        addFolderBtn.disabled = checkedCount === 0;
                    }
                });
            }

        } catch (e) {
            console.error(e);
            resultsEl.innerHTML = `<div style="text-align: center; color: #ff4e45; margin-top: 40px;">Scan failed: ${e.message}</div>`;
            btn.textContent = 'Retry Scan';
            btn.disabled = false;
            btn.style.opacity = '1';
        }
    }

    /**
     * Reads YouTube's internal `ytcfg` object from the page context by injecting
     * a short-lived <script> tag that posts the config values back via postMessage.
     * @returns {Promise<{apiKey, context, visitorData, clientVersion, sessionIndex, pageId}>}
     */
    static _getYoutubeConfig() {
        return new Promise(resolve => {
            // Use a random ID to match the response to this specific request,
            // preventing cross-contamination if multiple calls overlap.
            const reqId = Math.random().toString(36).slice(2);
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
                            apiKey:        window.ytcfg?.get('INNERTUBE_API_KEY'),
                            context:       window.ytcfg?.get('INNERTUBE_CONTEXT'),
                            visitorData:   window.ytcfg?.get('VISITOR_DATA'),
                            clientVersion: window.ytcfg?.get('INNERTUBE_CLIENT_VERSION') || '2.20240101.01.00',
                            sessionIndex:  window.ytcfg?.get('SESSION_INDEX') || '0',
                            pageId:        window.ytcfg?.get('DELEGATED_SESSION_ID') || window.ytcfg?.get('PAGE_ID')
                        }
                    }, '*');
                } catch(e) {}
            `;
            document.documentElement.appendChild(script);
            script.remove();
        });
    }

    /**
     * Tier 2: InnerTube API unsubscribe.
     * Sends a POST to YouTube's internal subscription endpoint.
     * Returns true on success, false on failure.
     */
    static async _tryApiUnsubscribe(channelData, config) {
        const sapisid = document.cookie.split('; ').find(r => r.startsWith('SAPISID='))?.split('=')[1]
                     || document.cookie.split('; ').find(r => r.startsWith('__Secure-3PAPISID='))?.split('=')[1];
        const origin = window.location.origin;
        const time = Math.floor(Date.now() / 1000);

        const sha1 = async (str) => {
            const buf = new TextEncoder().encode(str);
            const hash = await crypto.subtle.digest('SHA-1', buf);
            return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
        };

        const headers = {
            'Content-Type': 'application/json',
            'X-Goog-AuthUser': config.sessionIndex || '0',
            'X-Goog-Visitor-Id': config.visitorData || '',
            'X-Youtube-Client-Name': '1',
            'X-Youtube-Client-Version': config.clientVersion || '2.20240101.01.00',
            'Origin': origin,
        };

        if (config.pageId) headers['X-Goog-PageId'] = config.pageId;

        if (sapisid) {
            const hash = await sha1(`${time} ${sapisid} ${origin}`);
            headers['Authorization'] = `SAPISIDHASH ${time}_${hash}`;
        }

        const makeRequest = async (withParams) => {
            const payload = { context: config.context, channelIds: [channelData.id] };
            if (withParams && channelData.params) payload.params = channelData.params;
            const res = await fetch(`/youtubei/v1/subscription/unsubscribe?key=${config.apiKey}`, {
                method: 'POST', headers, credentials: 'include',
                body: JSON.stringify(payload)
            });
            return res;
        };

        try {
            // Attempt 1: with params
            let res = await makeRequest(true);
            if (res.ok) return true;

            // Attempt 2: without params (handles stale token / 403)
            if ((res.status === 400 || res.status === 403) && channelData.params) {
                res = await makeRequest(false);
                if (res.ok) return true;
            }

            console.warn(`[YPP] API unsubscribe failed for ${channelData.id}: HTTP ${res.status}`);
        } catch (e) {
            console.error('[YPP] API unsubscribe exception:', e);
        }
        return false;
    }

    /**
     * Tier 3: Native DOM button click fallback.
     * Finds YouTube's own subscribe button in the page and clicks it,
     * then confirms the dialog. Works even without params.
     * Returns true on success, false if no button found.
     */
    static async _tryNativeDomUnsubscribe(channelId) {
        try {
            // Find all subscribe button renderers that match this channel
            const candidates = document.querySelectorAll(
                `ytd-subscribe-button-renderer[channel-id="${channelId}"], ` +
                `[channel-id="${channelId}"] ytd-subscribe-button-renderer`
            );

            for (const renderer of candidates) {
                const btn = renderer.querySelector('tp-yt-paper-button, yt-button-shape button, button');
                if (!btn) continue;
                const text = (btn.textContent || btn.getAttribute('aria-label') || '').toLowerCase().trim();
                // Only click if the user is subscribed (button says Subscribed/Unsubscribe)
                if (text === 'subscribed' || text === 'unsubscribe' || text.includes('subscribed')) {
                    btn.click();
                    // Wait for YouTube's confirm dialog to appear
                    await new Promise(r => setTimeout(r, 700));
                    // Confirm unsubscription in YouTube's native dialog
                    const confirmBtn = document.querySelector(
                        'yt-confirm-dialog-renderer #confirm-button button, ' +
                        'tp-yt-paper-dialog .buttons tp-yt-paper-button:last-of-type'
                    );
                    if (confirmBtn) {
                        confirmBtn.click();
                        console.log(`[YPP] Native DOM unsubscribe succeeded for ${channelId}`);
                        return true;
                    }
                }
            }
        } catch (e) {
            console.warn('[YPP] Native DOM unsubscribe failed:', e);
        }
        return false;
    }

    /**
     * Main unsubscribe orchestrator — tries multiple strategies per channel.
     * Strategy 1 (Primary):   InnerTube API call with proper session auth.
     * Strategy 2 (Fallback):  Native DOM button click + confirm dialog.
     * Returns count of successful unsubscriptions.
     */
    static async _doUnsubscribe(channels) {
        const config = await this._getYoutubeConfig();

        if (!config.apiKey || !config.context) {
            await window.YPP.features.CustomDialog.alert(
                'Auth Error',
                'Could not retrieve YouTube session credentials.\nPlease refresh the page and try again.'
            );
            return 0;
        }

        let successCount = 0;
        const failedChannels = [];

        for (const c of channels) {
            // Strategy 1: InnerTube API
            let succeeded = await this._tryApiUnsubscribe(c, config);

            // Strategy 2: Native DOM click (fallback)
            if (!succeeded) {
                console.warn(`[YPP] API failed for ${c.name || c.id}, trying native DOM fallback...`);
                succeeded = await this._tryNativeDomUnsubscribe(c.id);
            }

            if (succeeded) {
                successCount++;
                if (c.onSuccess) c.onSuccess();
            } else {
                failedChannels.push(c.name || c.id);
            }
        }

        if (failedChannels.length > 0) {
            const preview = failedChannels.slice(0, 5).join(', ');
            const extra = failedChannels.length > 5 ? ` and ${failedChannels.length - 5} more` : '';
            await window.YPP.features.CustomDialog.alert(
                `${failedChannels.length} Unsubscribe(s) Failed`,
                `Could not unsubscribe from:\n${preview}${extra}.\n\nYouTube may have rate-limited the request. Try again in a moment or visit those channel pages directly.`
            );
        }

        return successCount;
    }

    static async individualUnsubscribe(channelId, params, channelName, rowEl, btnEl) {
        if (!(await window.YPP.features.CustomDialog.confirm('Unsubscribe', `Are you sure you want to permanently unsubscribe from ${channelName}?`, 'Unsubscribe', true))) return;

        btnEl.textContent = 'Unsubscribing...';
        btnEl.disabled = true;

        const channels = [{
            id: channelId,
            params: params,
            onSuccess: () => {
                rowEl.style.opacity = '0.3';
                btnEl.textContent = 'Unsubscribed';
                const cb = rowEl.querySelector('.ypp-unsub-checkbox');
                if (cb) {
                    cb.disabled = true;
                    cb.checked = false;
                }
            }
        }];

        await this._doUnsubscribe(channels);
    }

    static async bulkUnsubscribe(overlay) {
        const checkboxes = overlay.querySelectorAll('.ypp-unsub-checkbox:checked');
        if (checkboxes.length === 0) return;

        if (!(await window.YPP.features.CustomDialog.confirm('Bulk Unsubscribe', `Are you sure you want to permanently unsubscribe from ${checkboxes.length} channels?`, 'Unsubscribe', true))) return;

        const btn = overlay.querySelector('#ypp-health-unsub-btn');
        btn.textContent = 'Unsubscribing...';
        btn.disabled = true;

        const channels = Array.from(checkboxes).map(cb => ({
            id: cb.value,
            params: cb.dataset.params,
            onSuccess: () => {
                const row = cb.closest('.ypp-channel-health-row');
                row.style.opacity = '0.3';
                cb.disabled = true;
                cb.checked = false;
                
                const unsubBtn = row.querySelector('.ypp-indiv-unsub-btn');
                if (unsubBtn) {
                    unsubBtn.disabled = true;
                    unsubBtn.textContent = 'Unsubscribed';
                }
            }
        }));

        const successCount = await this._doUnsubscribe(channels);

        btn.textContent = `Unsubscribed ${successCount}`;
        setTimeout(() => {
            btn.style.display = 'none';
        }, 2000);
    }

    static async bulkAddToFolder(overlay, folderUI) {
        const checkboxes = overlay.querySelectorAll('.ypp-unsub-checkbox:checked');
        if (checkboxes.length === 0) return;

        const btn = overlay.querySelector('#ypp-health-add-folder-btn');
        
        // Prevent duplicate popups
        const existingPopup = document.getElementById('ypp-health-folder-popup');
        if (existingPopup) existingPopup.remove();

        const folderNames = Object.keys(folderUI.storage.folders);
        if (folderNames.length === 0) {
            await window.YPP.features.CustomDialog.alert('No Folders', 'You have not created any folders yet. Please create one from the subscriptions feed.');
            return;
        }

        const popup = document.createElement('div');
        popup.id = 'ypp-health-folder-popup';
        popup.style.cssText = `
            position: absolute;
            top: ${btn.offsetTop + btn.offsetHeight + 8}px;
            left: ${btn.offsetLeft}px;
            background: rgba(30, 30, 30, 0.95);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px;
            padding: 8px 0;
            min-width: 200px;
            box-shadow: 0 12px 32px rgba(0,0,0,0.5);
            z-index: 10000;
            animation: ypp-fade-in 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        `;

        folderNames.forEach(folder => {
            const item = document.createElement('div');
            item.style.cssText = 'padding: 10px 16px; color: #fff; cursor: pointer; transition: 0.2s; font-size: 14px; font-weight: 500; display: flex; align-items: center; gap: 8px;';
            item.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg> ${folder}`;
            
            item.addEventListener('mouseover', () => item.style.background = 'rgba(255,255,255,0.1)');
            item.addEventListener('mouseout', () => item.style.background = 'transparent');
            
            item.addEventListener('click', () => {
                const channels = Array.from(checkboxes).map(cb => ({
                    id: cb.value,
                    name: cb.closest('.ypp-channel-health-row').dataset.name
                }));

                let addedCount = 0;
                let needFeedRefresh = false;
                const activeFolder = folderUI.orchestrator.getActiveFolder();

                channels.forEach(c => {
                    if (folderUI.storage.addChannelToFolder(c.name, folder)) {
                        addedCount++;
                        
                        if (activeFolder === folder || activeFolder === '__no_folder__') {
                            needFeedRefresh = true;
                        }

                        // Update dataset on the modal row for UI syncing
                        const row = document.querySelector(`.ypp-channel-health-row[data-name="${CSS.escape(c.name)}"]`);
                        if (row) {
                            let folders = row.dataset.folders ? row.dataset.folders.split(',').filter(f => f) : [];
                            if (!folders.includes(folder)) {
                                folders.push(folder);
                                row.dataset.folders = folders.join(',');
                            }
                            
                            // Uncheck the checkbox since it was processed
                            const cb = row.querySelector('.ypp-unsub-checkbox');
                            if (cb) cb.checked = false;
                        }
                    }
                });

                if (needFeedRefresh) {
                    folderUI.orchestrator.forceRefreshFeed();
                }

                // Trigger UI update in the modal via the dropdown's change event
                const folderSel = document.getElementById('ypp-health-folder-filter-dropdown');
                if (folderSel) folderSel.dispatchEvent(new Event('change'));

                // Re-render sidebar/header filters to reflect new counts
                if (folderUI.renderGuideFolders) folderUI.renderGuideFolders();
                if (folderUI.renderFilterChips) folderUI.renderFilterChips();

                popup.remove();
                
                const oldText = btn.textContent;
                btn.textContent = `Added ${addedCount} to ${folder}`;
                btn.style.background = 'rgba(76, 175, 80, 0.15)';
                btn.style.color = '#4caf50';
                btn.style.borderColor = 'rgba(76, 175, 80, 0.3)';
                
                setTimeout(() => {
                    btn.textContent = oldText;
                    btn.style.background = 'rgba(108, 99, 255, 0.15)';
                    btn.style.color = '#a8a4ff';
                    btn.style.borderColor = 'rgba(108, 99, 255, 0.3)';
                }, 3000);
            });
            popup.appendChild(item);
        });

        // Add popup to the same relative parent as the button (the header actions container)
        btn.parentNode.appendChild(popup);

        // Click outside to close
        const closeListener = (e) => {
            if (!popup.contains(e.target) && e.target !== btn) {
                popup.remove();
                document.removeEventListener('click', closeListener);
            }
        };
        setTimeout(() => document.addEventListener('click', closeListener), 0);
    }
};
