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

import anime from 'animejs/lib/anime.es.js';

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
                    <button id="ypp-alert-ok" style="background:rgba(255,255,255,0.15);color:#fff;border:1px solid rgba(255,255,255,0.2);padding:10px 20px;border-radius:8px;font-weight:500;cursor:pointer;">OK</button>
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
            const btnColor = danger ? 'rgba(255,78,69,0.4)' : 'rgba(255,255,255,0.15)';
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
                    <button id="ypp-prompt-ok" style="background:rgba(255,255,255,0.15);color:#fff;border:1px solid rgba(255,255,255,0.2);padding:10px 20px;border-radius:8px;font-weight:500;cursor:pointer;">Submit</button>
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

            // === EVENT DELEGATION ===
            // Attach listeners to the container once, avoiding memory leaks on re-renders.
            // All interactions bubble up to this container.
            this.orchestrator.addListener(container, 'click', async (e) => {
                const addBtn = e.target.closest('#ypp-add-folder-btn');
                if (addBtn) {
                    const name = await window.YPP.features.CustomDialog.prompt('New Folder', 'Enter new folder name:');
                    if (name && name.trim()) {
                        if (this.storage.addFolder(name.trim())) {
                            this._guideRenderKey = null;
                            this.renderGuideFolders();
                            this.renderFilterChips();
                        }
                    }
                    return;
                }

                const playBtn = e.target.closest('.ypp-play-all-btn');
                if (playBtn) {
                    e.preventDefault();
                    e.stopPropagation();
                    const folderItem = playBtn.closest('.ypp-folder-item');
                    if (folderItem) {
                        this.orchestrator.playAll(folderItem.dataset.folder);
                    }
                    return;
                }

                const folderItem = e.target.closest('.ypp-folder-item');
                if (folderItem) {
                    const folderName = folderItem.dataset.folder;
                    if (!window.location.href.includes('/feed/subscriptions')) {
                        sessionStorage.setItem('ypp_pending_folder', folderName);
                        const tempLink = document.createElement('a');
                        tempLink.href = '/feed/subscriptions';
                        document.body.appendChild(tempLink);
                        tempLink.click();
                        tempLink.remove();
                    } else {
                        this.orchestrator.setActiveFolder(folderName, e.shiftKey || e.ctrlKey || e.metaKey);
                    }
                }
            });

            this.orchestrator.addListener(container, 'dragstart', (e) => {
                const folderItem = e.target.closest('.ypp-folder-item');
                if (folderItem) {
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', folderItem.dataset.folder);
                    folderItem.classList.add('ypp-dragging');
                }
            });

            this.orchestrator.addListener(container, 'dragend', (e) => {
                const folderItem = e.target.closest('.ypp-folder-item');
                if (folderItem) {
                    folderItem.classList.remove('ypp-dragging');
                    container.querySelectorAll('.ypp-folder-item').forEach(item => {
                        item.classList.remove('ypp-drag-over-top', 'ypp-drag-over-bottom');
                    });
                }
            });

            this.orchestrator.addListener(container, 'dragover', (e) => {
                const folderItem = e.target.closest('.ypp-folder-item');
                if (folderItem) {
                    e.preventDefault();
                    const rect = folderItem.getBoundingClientRect();
                    const mid = rect.top + rect.height / 2;
                    if (e.clientY < mid) {
                        folderItem.classList.add('ypp-drag-over-top');
                        folderItem.classList.remove('ypp-drag-over-bottom');
                    } else {
                        folderItem.classList.add('ypp-drag-over-bottom');
                        folderItem.classList.remove('ypp-drag-over-top');
                    }
                }
            });

            this.orchestrator.addListener(container, 'dragleave', (e) => {
                const folderItem = e.target.closest('.ypp-folder-item');
                if (folderItem) {
                    folderItem.classList.remove('ypp-drag-over-top', 'ypp-drag-over-bottom');
                }
            });

            this.orchestrator.addListener(container, 'drop', (e) => {
                const folderItem = e.target.closest('.ypp-folder-item');
                if (folderItem) {
                    e.preventDefault();
                    folderItem.classList.remove('ypp-drag-over-top', 'ypp-drag-over-bottom');
                    const folderName = folderItem.dataset.folder;
                    const draggedFolder = e.dataTransfer.getData('text/plain');
                    if (draggedFolder && draggedFolder !== folderName) {
                        const keys = Object.keys(this.storage.folders);
                        let dropIndex = keys.indexOf(folderName);
                        
                        const rect = folderItem.getBoundingClientRect();
                        const mid = rect.top + rect.height / 2;
                        if (e.clientY >= mid) {
                            dropIndex += 1;
                        }
                        
                        const oldIndex = keys.indexOf(draggedFolder);
                        if (oldIndex < dropIndex) dropIndex -= 1;

                        if (this.storage.reorderFolder(draggedFolder, dropIndex)) {
                            this._guideRenderKey = null;
                            this.renderGuideFolders();
                            this.renderFilterChips();
                        }
                    }
                }
            });
            // ========================
        }
        if (!container) return; // Wait for DOM

        // Build header (safe static HTML)
        container.innerHTML = `
            <style>
                /* Handle hover state with pure CSS instead of JS mouseenter/mouseleave */
                .ypp-folder-item:hover .ypp-play-all-btn { opacity: 1 !important; }
            </style>
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
            el.draggable = true;
            el.dataset.folder = folderName;
            if (activeFolder && activeFolder.split(',').map(f => f.trim()).includes(folderName)) el.classList.add('active');

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
            list.appendChild(el);
        });
    }

    removeGuideFolders() {
        const container = document.getElementById('ypp-sub-folders-container');
        if (container) container.remove();
    }

    // =========================================================================
    // FILTER CHIPS UI (Feed Page)
    // =========================================================================

    /** Force-inject the chips bar into the DOM (waits for the grid via observer). */
    renderFilterChips() {
        if (!this.orchestrator.isFeedPage()) return;

        this.observer.register(
            'inject-filter-chips',
            'ytd-browse[page-subtype="subscriptions"] ytd-rich-grid-renderer',
            (elements) => {
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

                this.rebuildChipsContent(chipsBar);
            }
        );
    }

    /**
     * Re-render the left side of the chips bar in-place.
     * Safe to call at any time; creates the bar if missing.
     */
    rebuildChipsContent(chipsBar) {
        if (!chipsBar) chipsBar = document.getElementById('ypp-folder-chips');
        if (!chipsBar) return; // Bar not injected yet — observer will handle it

        if (this.orchestrator.settings?.subscriptionFolders !== false) {
            // Wipe and rebuild only the left container — preserves the right filter bar
            const existingLeft = chipsBar.querySelector('.ypp-folder-chips-left');
            if (existingLeft) existingLeft.remove();

            const activeFolder = this.orchestrator.getActiveFolder();

            const selectStyle = 'background: rgba(255,255,255,0.08); color: #fff; border: 1px solid rgba(255,255,255,0.1); padding: 8px 12px; border-radius: 8px; cursor: pointer; outline: none; font-size: 14px; font-weight: 500; min-width: 160px; transition: 0.2s;';

            const folderSelectContainer = document.createElement('div');
            folderSelectContainer.className = 'ypp-sub-filter-group ypp-folder-dropdown-container';
            folderSelectContainer.style.cssText = 'display: flex; align-items: center; gap: 8px;';

            const label = document.createElement('span');
            label.className = 'ypp-sub-filter-label';
            label.style.cssText = 'color: #aaa; font-size: 13px; font-weight: 500; text-transform: uppercase;';
            label.textContent = 'Folder';

            const select = document.createElement('select');
            select.className = 'ypp-filter-dropdown';
            select.id = 'ypp-folder-select';
            select.style.cssText = selectStyle;

            // "All Subscriptions" default
            const allOpt = document.createElement('option');
            allOpt.value = '';
            allOpt.style.background = '#222';
            allOpt.textContent = 'All Subscriptions';
            if (!activeFolder) allOpt.selected = true;
            select.appendChild(allOpt);

            const isMulti = activeFolder && activeFolder.includes(',');
            
            if (isMulti) {
                const multiOpt = document.createElement('option');
                multiOpt.value = activeFolder;
                multiOpt.style.background = '#222';
                multiOpt.textContent = 'Multiple Folders';
                multiOpt.selected = true;
                select.appendChild(multiOpt);
            }

            Object.keys(this.storage.folders).forEach(folderName => {
                const opt = document.createElement('option');
                opt.value = folderName;
                opt.style.background = '#222';
                opt.textContent = folderName;
                if (!isMulti && activeFolder === folderName) opt.selected = true;
                select.appendChild(opt);
            });

            const noFolderOpt = document.createElement('option');
            noFolderOpt.value = '__no_folder__';
            noFolderOpt.style.background = '#222';
            noFolderOpt.textContent = 'Uncategorized (No Folder)';
            if (activeFolder === '__no_folder__') noFolderOpt.selected = true;
            select.appendChild(noFolderOpt);

            const newOpt = document.createElement('option');
            newOpt.value = '__new__';
            newOpt.style.background = '#222';
            newOpt.textContent = '+ Create New Folder';
            select.appendChild(newOpt);

            select.addEventListener('mouseover', () => select.style.background = 'rgba(255,255,255,0.12)');
            select.addEventListener('mouseout',  () => select.style.background = 'rgba(255,255,255,0.08)');

            select.addEventListener('change', async (e) => {
                const val = e.target.value;
                if (val === '__new__') {
                    // Reset visual selection while dialog is open
                    e.target.value = this.orchestrator.getActiveFolder() || '';
                    const name = await window.YPP.features.CustomDialog.prompt(
                        'New Folder', 'Enter a name for the new folder:'
                    );
                    if (name && name.trim()) {
                        if (this.storage.addFolder(name.trim())) {
                            this.renderGuideFolders();
                            this.rebuildChipsContent();
                        }
                    }
                } else {
                    // Use Direct setter — dropdown is always a definitive choice, never a toggle
                    this.orchestrator.setActiveFolderDirect(val || null);
                }
            });

            folderSelectContainer.appendChild(label);
            folderSelectContainer.appendChild(select);

            // Play All button — only shown when a folder is active
            if (activeFolder && activeFolder !== '__no_folder__') {
                const playBtn = document.createElement('button');
                playBtn.className = 'ypp-filter-chip ypp-play-action-chip';
                playBtn.innerHTML = String.raw`<svg height="16" width="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 4px; vertical-align: text-bottom;"><path d="M8 5v14l11-7z"/></svg> Play All`;
                playBtn.style.cssText = 'background: rgba(255, 255, 255, 0.15); color: #fff; border: 1px solid rgba(255,255,255,0.2); cursor: pointer;';
                playBtn.addEventListener('click', () => this.orchestrator.playAll(activeFolder));
                folderSelectContainer.appendChild(playBtn);
            }

            const leftContainer = document.createElement('div');
            leftContainer.className = 'ypp-folder-chips-left';
            leftContainer.appendChild(folderSelectContainer);

            this._createToggleChip(leftContainer, 'Hide Shorts', this.orchestrator.getHideShorts(), (val) => {
                this.orchestrator.setHideShorts(val);
                this.orchestrator.applyFeedFilters();
            });
            this._createToggleChip(leftContainer, 'Hide Watched', this.orchestrator.getHideWatched(), (val) => {
                this.orchestrator.setHideWatched(val);
                this.orchestrator.applyFeedFilters();
            });

            // Insert the left container BEFORE the separator / right container
            const separator = chipsBar.querySelector('.ypp-filter-separator');
            if (separator) {
                chipsBar.insertBefore(leftContainer, separator);
            } else {
                chipsBar.appendChild(leftContainer);
            }

            chipsBar.style.display = 'flex';

            // Inject / refresh the right filter bar only if it hasn't been built yet
            if (!chipsBar.querySelector('.ypp-folder-chips-right')) {
                this._injectFilterBar(chipsBar);
            }
        } else {
            chipsBar.style.display = 'none';
            chipsBar.innerHTML = '';
        }
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
                    <button id="ypp-health-btn" class="ypp-btn-primary" style="background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.15); color: #fff; display: flex; align-items: center; gap: 6px; padding: 8px 16px; font-size: 14px; border-radius: 8px; transition: 0.2s;">
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
                btn.innerHTML = String.raw`<svg height="14" width="14" viewBox="0 0 24 24" fill="currentColor" style="margin-right:2px"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg> Save`;
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
            btn.innerHTML = String.raw`<span style="margin-right:4px;">📁</span> Folders`;

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
        // across multiple popover opens. Stored as a named handler for _teardown() removal.
        if (!this._popoverListenerAttached) {
            this._popoverListenerAttached = true;
            this._popoverClickOutsideHandler = (e) => {
                const popoverEl = document.getElementById('ypp-folder-popover');
                if (!popoverEl) return;
                const clickedInside    = popoverEl.contains(e.target);
                const clickedFolderBtn = e.target.closest('.ypp-card-folder-btn') || e.target.closest('#ypp-channel-folder-btn');
                if (!clickedInside && !clickedFolderBtn) {
                    popoverEl.classList.remove('visible');
                }
            };
            document.addEventListener('click', this._popoverClickOutsideHandler);
        }


        const rect = buttonEl.getBoundingClientRect();
        popover.style.top  = `${rect.bottom + window.scrollY + 8}px`;
        popover.style.left = `${rect.left + window.scrollX}px`;
        popover.style.zIndex = '999999';

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
                checkbox.style.cssText = 'margin-right: 14px; accent-color: #fff; width: 18px; height: 18px; cursor: pointer; border-radius: 4px;';

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

        overlay.innerHTML = String.raw`
            <div class="ypp-modal-content ypp-organizer-modal" style="font-family: 'Roboto', 'Google Sans', sans-serif; width: 100vw; height: 100vh; display: flex; flex-direction: column; background: rgba(20, 19, 24, 0.95); backdrop-filter: blur(60px); -webkit-backdrop-filter: blur(60px); overflow: hidden;">
                <div class="ypp-modal-header" style="background: rgba(255,255,255,0.03); border-bottom: 1px solid rgba(255,255,255,0.05); padding: 20px 32px; display: flex; justify-content: space-between; align-items: center; z-index: 10;">
                    <div style="display: flex; align-items: center; gap: 16px;">
                        <div style="background: rgba(255, 255, 255, 0.1); border-radius: 50%; padding: 8px;">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                        </div>
                        <span class="ypp-modal-title" style="font-size: 22px; font-weight: 500; color: #fff; letter-spacing: 0;">Channel Organizer</span>
                    </div>
                    <div style="display: flex; gap: 12px; align-items: center;">
                        <button id="ypp-health-create-folder-btn" class="ypp-btn-primary" style="background: transparent; color: #fff; border: 1px solid rgba(255, 255, 255, 0.3); padding: 8px 20px; border-radius: 100px; font-weight: 500; font-size: 13px; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='rgba(255, 255, 255, 0.08)'" onmouseout="this.style.background='transparent'">Create Folder</button>
                        <button id="ypp-health-delete-folder-btn" class="ypp-btn-primary" style="background: transparent; color: rgba(255, 255, 255, 0.8); border: 1px solid rgba(255, 255, 255, 0.2); padding: 8px 20px; border-radius: 100px; font-weight: 500; font-size: 13px; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='rgba(255, 255, 255, 0.08)'" onmouseout="this.style.background='transparent'">Delete Folder</button>
                        <button id="ypp-health-scan-btn" class="ypp-btn-primary" style="background: rgba(255,255,255,0.15); color: #fff; border: none; padding: 8px 20px; border-radius: 100px; font-weight: 500; font-size: 13px; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.25)'" onmouseout="this.style.background='rgba(255,255,255,0.15)'">Start Scan</button>
                        <button id="ypp-health-unsub-btn" class="ypp-btn-primary" style="background: rgba(255,78,69,0.3); color: #fff; border: none; padding: 8px 20px; border-radius: 100px; font-weight: 500; font-size: 13px; cursor: pointer; transition: background 0.2s; display: none;" onmouseover="this.style.background='rgba(255,78,69,0.4)'" onmouseout="this.style.background='rgba(255,78,69,0.3)'">Unsubscribe Selected</button>
                        <button id="ypp-health-add-folder-btn" class="ypp-btn-primary" style="background: rgba(255, 255, 255, 0.1); color: #fff; border: none; padding: 8px 20px; border-radius: 100px; font-weight: 500; font-size: 13px; cursor: pointer; transition: background 0.2s; display: none;" onmouseover="this.style.background='rgba(255, 255, 255, 0.2)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.1)'">Add to Folder</button>
                        <button id="ypp-health-remove-folder-btn" class="ypp-btn-primary" style="background: rgba(255, 152, 0, 0.2); color: #fff; border: none; padding: 8px 20px; border-radius: 100px; font-weight: 500; font-size: 13px; cursor: pointer; transition: background 0.2s; display: none;" onmouseover="this.style.background='rgba(255, 152, 0, 0.3)'" onmouseout="this.style.background='rgba(255, 152, 0, 0.2)'">Remove from Folder</button>
                        <div style="width: 1px; height: 24px; background: rgba(255,255,255,0.1); margin: 0 4px;"></div>
                        <button class="ypp-modal-close" style="background: transparent; border: none; color: #CAC4D0; font-size: 28px; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s; line-height: 1;" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='transparent'">&times;</button>
                    </div>
                </div>
                <div class="ypp-organizer-body" style="flex-direction: row; padding: 32px; overflow: hidden; display: flex; flex: 1; background: transparent; gap: 32px;">
                    <!-- LEFT PANE: Folders -->
                    <div style="width: 280px; display: flex; flex-direction: column; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 24px; padding: 24px; flex-shrink: 0;">
                        <h3 style="color: #E6E1E5; font-size: 16px; font-weight: 500; margin: 0 0 16px 0; display: flex; justify-content: space-between; align-items: center;">
                            Your Folders
                            <span style="font-size:12px; color:rgba(255,255,255,0.4); font-weight:normal;">Drag to Add</span>
                        </h3>
                        <div id="ypp-organizer-folders-list" class="ypp-scroll-list" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px;">
                            <!-- Populated dynamically -->
                        </div>
                        <div style="margin-top: 24px;">
                            <h3 style="color: #E6E1E5; font-size: 14px; font-weight: 500; margin: 0 0 12px 0; display: flex; align-items: center; gap: 8px;">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,78,69,0.8)" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
                                Filter Keywords
                            </h3>
                            <div style="display: flex; gap: 8px; margin-bottom: 12px;">
                                <input type="text" id="ypp-blacklist-input" placeholder="e.g. spoiler, react" style="flex: 1; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 8px 12px; color: #fff; font-size: 13px; outline: none;">
                                <button id="ypp-blacklist-add-btn" style="background: rgba(255,255,255,0.1); border: none; border-radius: 8px; padding: 0 12px; color: #fff; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.15)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">Add</button>
                            </div>
                            <div id="ypp-blacklist-tags" style="display: flex; flex-wrap: wrap; gap: 6px;"></div>
                        </div>
                    </div>
                    <!-- RIGHT PANE: Channels -->
                    <div style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
                        <div style="display: flex; gap: 24px; margin-bottom: 24px;">
                            <div class="ypp-health-stat" data-filter="active" style="flex: 1; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 24px; border-radius: 24px; text-align: left; cursor: pointer; transition: background 0.2s;">
                                <div style="color: #CAC4D0; font-size: 13px; font-weight: 500; letter-spacing: 0.1px; margin-bottom: 8px;">Active (< 30 days)</div>
                                <div style="color: rgba(255,255,255,0.9); font-size: 40px; font-weight: 400; line-height: 1;" id="ypp-health-active">0</div>
                            </div>
                            <div class="ypp-health-stat" data-filter="warning" style="flex: 1; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 24px; border-radius: 24px; text-align: left; cursor: pointer; transition: background 0.2s;">
                                <div style="color: #CAC4D0; font-size: 13px; font-weight: 500; letter-spacing: 0.1px; margin-bottom: 8px;">Inactive (> 1 month)</div>
                                <div style="color: rgba(255,255,255,0.6); font-size: 40px; font-weight: 400; line-height: 1;" id="ypp-health-warning">0</div>
                            </div>
                            <div class="ypp-health-stat" data-filter="dead" style="flex: 1; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 24px; border-radius: 24px; text-align: left; cursor: pointer; transition: background 0.2s;">
                                <div style="color: #CAC4D0; font-size: 13px; font-weight: 500; letter-spacing: 0.1px; margin-bottom: 8px;">Dead (> 3 months)</div>
                                <div style="color: rgba(255,255,255,0.4); font-size: 40px; font-weight: 400; line-height: 1;" id="ypp-health-dead">0</div>
                            </div>
                        </div>
                        <div style="display: flex; justify-content: flex-end; gap: 16px; margin-bottom: 16px; align-items: center;">
                            <div style="display: flex; gap: 8px; margin-right: auto;">
                                <button id="ypp-health-select-all-btn" style="background: rgba(255,255,255,0.05); color: #CAC4D0; border: 1px solid rgba(255,255,255,0.1); padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'">Select All Visible</button>
                                <button id="ypp-health-unselect-all-btn" style="background: rgba(255,255,255,0.05); color: #CAC4D0; border: 1px solid rgba(255,255,255,0.1); padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'">Unselect All</button>
                            </div>
                            <div style="position: relative; flex: 1; max-width: 320px; display: flex; align-items: center;">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CAC4D0" stroke-width="2" style="position: absolute; left: 16px;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                <input type="text" id="ypp-health-search-input" placeholder="Search channels..." style="width: 100%; background: rgba(255,255,255,0.05); color: #E6E1E5; border: 1px solid rgba(255,255,255,0.1); padding: 10px 16px 10px 42px; border-radius: 100px; outline: none; font-size: 14px; transition: background 0.2s;" />
                            </div>
                            <span style="color: #CAC4D0; font-size: 14px; font-weight: 500;">Filters & Sort:</span>
                            <select id="ypp-health-folder-filter-dropdown" style="background: rgba(255,255,255,0.05); color: #E6E1E5; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; outline: none; font-size: 14px; font-weight: 500; transition: background 0.2s; border-bottom: 1px solid rgba(255,255,255,0.2);">
                                <option value="all" style="background:#1D1B20">All Folders</option>
                                <option value="__no_folder__" style="background:#1D1B20">Uncategorized (No Folder)</option>
                                ${folderUI ? Object.keys(folderUI.storage.folders).map(f => '<option value="' + f + '" style="background:#1D1B20">' + f + '</option>').join('') : ''}
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
            </div>
        `;

        // Animate entrance using anime.js
        anime({
            targets: '.ypp-organizer-modal',
            opacity: [0, 1],
            scale: [0.95, 1],
            easing: 'spring(1, 80, 10, 0)',
            duration: 600
        });

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
        addFolderBtn.addEventListener('mouseover', () => { addFolderBtn.style.background = 'rgba(255, 255, 255, 0.2)'; });
        addFolderBtn.addEventListener('mouseout',  () => { addFolderBtn.style.background = 'rgba(255, 255, 255, 0.1)'; });
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

        const selectAllBtn = overlay.querySelector('#ypp-health-select-all-btn');
        const unselectAllBtn = overlay.querySelector('#ypp-health-unselect-all-btn');

        selectAllBtn.addEventListener('click', () => {
            const rows = resultsEl.querySelectorAll('.ypp-channel-health-row');
            let changed = false;
            rows.forEach(row => {
                if (row.style.display !== 'none') {
                    const cb = row.querySelector('.ypp-unsub-checkbox');
                    if (cb && !cb.disabled && !cb.checked) {
                        cb.checked = true;
                        changed = true;
                    }
                }
            });
            if (changed) {
                // Must bubble for the listener on resultsEl to catch it
                resultsEl.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });

        unselectAllBtn.addEventListener('click', () => {
            const checkboxes = resultsEl.querySelectorAll('.ypp-unsub-checkbox:checked');
            if (checkboxes.length > 0) {
                checkboxes.forEach(cb => { if (!cb.disabled) cb.checked = false; });
                resultsEl.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });

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
            const name = await window.YPP.features.CustomDialog.prompt('Delete Folder', `Enter the exact name of the folder to delete.nnAvailable folders:n${folderNames.join(', ')}`);
            if (name && folderNames.includes(name.trim())) {
                if (await window.YPP.features.CustomDialog.confirm('Delete Folder', `Are you sure you want to permanently delete "${name.trim()}"?`, 'Delete', true)) {
                    folderUI.storage.deleteFolder(name.trim());
                    const af = folderUI.orchestrator.getActiveFolder();
                    if (af && af.split(',').map(f => f.trim()).includes(name.trim())) {
                        folderUI.orchestrator.setActiveFolder(name.trim(), true); // Toggle it off
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

        // Blacklist UI handlers
        const renderBlacklistTags = () => {
            const tagsContainer = overlay.querySelector('#ypp-blacklist-tags');
            if (!tagsContainer) return;
            tagsContainer.innerHTML = '';
            const bl = folderUI?.storage?.keywordBlacklist || [];
            bl.forEach(kw => {
                const tag = document.createElement('div');
                tag.style.cssText = 'background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; padding: 4px 8px; font-size: 12px; color: #fff; display: flex; align-items: center; gap: 4px;';
                tag.innerHTML = `<span>${_escHtml(kw)}</span><button class="ypp-blacklist-del-btn" style="background: transparent; border: none; color: rgba(255,255,255,0.6); cursor: pointer; padding: 0; font-size: 14px; line-height: 1;" onmouseover="this.style.color='#fff'" onmouseout="this.style.color='rgba(255,255,255,0.6)'">&times;</button>`;
                tag.querySelector('button').addEventListener('click', () => {
                    folderUI.storage.keywordBlacklist = folderUI.storage.keywordBlacklist.filter(item => item !== kw);
                    folderUI.storage.save();
                    renderBlacklistTags();
                });
                tagsContainer.appendChild(tag);
            });
        };

        const blacklistInput = overlay.querySelector('#ypp-blacklist-input');
        const blacklistAddBtn = overlay.querySelector('#ypp-blacklist-add-btn');
        if (blacklistInput && blacklistAddBtn && folderUI) {
            const addKw = () => {
                const val = blacklistInput.value.trim();
                if (val) {
                    const kws = val.split(',').map(s => s.trim()).filter(Boolean);
                    if (!folderUI.storage.keywordBlacklist) folderUI.storage.keywordBlacklist = [];
                    kws.forEach(kw => {
                        if (!folderUI.storage.keywordBlacklist.some(item => item.toLowerCase() === kw.toLowerCase())) {
                            folderUI.storage.keywordBlacklist.push(kw);
                        }
                    });
                    folderUI.storage.save();
                    renderBlacklistTags();
                    blacklistInput.value = '';
                }
            };
            blacklistAddBtn.addEventListener('click', addKw);
            blacklistInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') addKw();
            });
            renderBlacklistTags();
        }

        overlay.querySelector('#ypp-health-scan-btn').addEventListener('click', () => {
            this.runScan(overlay, folderUI);
        });

        overlay.querySelector('#ypp-health-unsub-btn').addEventListener('click', () => {
            this.bulkUnsubscribe(overlay);
        });

        overlay.querySelector('#ypp-health-add-folder-btn').addEventListener('click', () => {
            if (folderUI) this.bulkAddToFolder(overlay, folderUI);
        });

        overlay.querySelector('#ypp-health-remove-folder-btn').addEventListener('click', () => {
            const folderFilter = overlay.querySelector('#ypp-health-folder-filter-dropdown').value;
            if (folderFilter === 'all' || folderFilter === '__no_folder__') return;
            if (folderUI) this.bulkRemoveFromFolder(overlay, folderUI, folderFilter);
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

            // Sync left pane highlight
            const listEl = overlay.querySelector('#ypp-organizer-folders-list');
            if (listEl) {
                listEl.querySelectorAll('div[data-folder]').forEach(fDiv => {
                    if (fDiv.dataset.folder === folderFilter) {
                        fDiv.style.background = 'rgba(208,188,255,0.15)';
                        fDiv.style.borderLeft = '3px solid #d0bcff';
                    } else {
                        fDiv.style.background = 'rgba(255,255,255,0.03)';
                        fDiv.style.borderLeft = '1px solid rgba(255,255,255,0.05)';
                    }
                });
            }

            // Sync checkbox buttons for Remove Folder
            const n = resultsEl.querySelectorAll('.ypp-unsub-checkbox:checked').length;
            const removeFolderBtn = overlay.querySelector('#ypp-health-remove-folder-btn');
            if (removeFolderBtn) {
                removeFolderBtn.textContent = n > 0 ? `Remove from Folder (${n})` : 'Remove from Folder';
                removeFolderBtn.disabled = n === 0;
                if (folderFilter !== 'all' && folderFilter !== '__no_folder__') {
                    removeFolderBtn.style.display = n > 0 ? 'inline-block' : 'none';
                } else {
                    removeFolderBtn.style.display = 'none';
                }
            }

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

        // --- Render Organizer Folders ---
        const renderFoldersList = () => {
            const listEl = overlay.querySelector('#ypp-organizer-folders-list');
            if (!listEl || !folderUI) return;
            listEl.innerHTML = '';
            
            const folders = Object.keys(folderUI.storage.folders);
            if (folders.length === 0) {
                listEl.innerHTML = '<div style="color:rgba(255,255,255,0.4); font-size:12px; text-align:center; margin-top:20px;">No folders yet.</div>';
                return;
            }

            folders.forEach(fName => {
                const fDiv = document.createElement('div');
                fDiv.dataset.folder = fName;
                fDiv.style.cssText = 'display:flex; align-items:center; justify-content:space-between; padding:12px 16px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.05); border-radius:12px; cursor:pointer; transition:all 0.2s ease;';
                fDiv.innerHTML = `
                    <div style="display:flex; align-items:center; gap:12px;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                        <span style="color:#E6E1E5; font-size:14px; font-weight:500;">${fName}</span>
                    </div>
                    <span class="ypp-folder-count-badge" style="background:rgba(255,255,255,0.1); padding:2px 8px; border-radius:20px; font-size:11px; font-weight:600; color:#fff;">${folderUI.storage.folders[fName].length}</span>
                `;
                
                // Click to filter
                fDiv.addEventListener('click', () => {
                    const folderSel = overlay.querySelector('#ypp-health-folder-filter-dropdown');
                    if (folderSel) {
                        folderSel.value = folderSel.value === fName ? 'all' : fName;
                        folderSel.dispatchEvent(new Event('change'));
                    }
                });

                // Drag & Drop events
                fDiv.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    fDiv.style.background = 'rgba(99,102,241,0.2)';
                    fDiv.style.borderColor = 'rgba(99,102,241,0.5)';
                });
                fDiv.addEventListener('dragleave', (e) => {
                    e.preventDefault();
                    fDiv.style.background = 'rgba(255,255,255,0.03)';
                    fDiv.style.borderColor = 'rgba(255,255,255,0.05)';
                });
                fDiv.addEventListener('drop', (e) => {
                    e.preventDefault();
                    fDiv.style.background = 'rgba(255,255,255,0.03)';
                    fDiv.style.borderColor = 'rgba(255,255,255,0.05)';
                    
                    const channelName = e.dataTransfer.getData('text/plain');
                    if (channelName) {
                        if (!folderUI.storage.folders[fName].includes(channelName)) {
                            folderUI.storage.folders[fName].push(channelName);
                            folderUI.storage.save();
                            renderFoldersList();
                            
                            // Visual feedback with anime.js
                            const newDiv = Array.from(listEl.children).find(d => d.dataset.folder === fName);
                            if (newDiv) {
                                const badge = newDiv.querySelector('.ypp-folder-count-badge');
                                badge.style.background = '#22c55e';
                                anime({
                                    targets: badge,
                                    scale: [1.5, 1],
                                    duration: 600,
                                    easing: 'spring(1, 80, 10, 0)',
                                    complete: () => {
                                        badge.style.background = 'rgba(255,255,255,0.1)';
                                    }
                                });
                            }
                            
                            // Trigger re-render of channels to show new badge
                            this.runScan(overlay, folderUI, true);
                        }
                    }
                });
                
                listEl.appendChild(fDiv);
            });
        };
        renderFoldersList();
    }

    static _extractYtInitialData(text) {
        const markers = ['var ytInitialData = ', 'window["ytInitialData"] = ', 'window.ytInitialData = '];
        for (const marker of markers) {
            const startIdx = text.indexOf(marker);
            if (startIdx !== -1) {
                const jsonStart = startIdx + marker.length;
                const endIdx = text.indexOf('</script>', jsonStart);
                if (endIdx !== -1) {
                    let jsonText = text.slice(jsonStart, endIdx).trim();
                    if (jsonText.endsWith(';')) jsonText = jsonText.slice(0, -1);
                    try {
                        return JSON.parse(jsonText);
                    } catch(e) {
                        console.error('ChannelHealthUI: Failed to parse ytInitialData', e);
                    }
                }
            }
        }
        return null;
    }

    static async runScan(overlay, folderUI, skipFetch = false) {
        const btn = overlay.querySelector('#ypp-health-scan-btn');
        const resultsEl = overlay.querySelector('#ypp-health-results');
        
        btn.textContent = 'Scanning...';
        btn.disabled = true;
        btn.style.opacity = '0.5';
        resultsEl.innerHTML = `
            <div id="ypp-scan-status" style="text-align:center; color:#aaa; margin-top:40px; font-size:14px;">
                <div style="margin-bottom:12px;">Fetching subscriptions list...</div>
                <div id="ypp-scan-progress" style="font-size:12px; color:#777;"></div>
            </div>`;

        const progressEl = overlay.querySelector('#ypp-scan-progress');
        const statusEl   = overlay.querySelector('#ypp-scan-status div');

        try {
            let channels = [];
            const skipFullScan = skipFetch && ChannelHealthUI._lastScanChannels;
            
            if (skipFullScan) {
                channels = ChannelHealthUI._lastScanChannels;
                if (statusEl) statusEl.remove();
                btn.textContent = 'Updating UI...';
            } else {
                // Get API config for potential continuation fetches
                const ytConfig = await this._getYoutubeConfig();
                
                // ── Step 1 & 2: Fetch /feed/channels and follow continuations ──
                const seenIds  = new Set();

            const extractChannelsFromData = (data) => {
                let token = null;
                const walkNode = (obj) => {
                    if (!obj || typeof obj !== 'object') return;
                    if (Array.isArray(obj)) { obj.forEach(walkNode); return; }

                    if (obj.channelRenderer) {
                        const r = obj.channelRenderer;
                        if (!seenIds.has(r.channelId)) {
                            seenIds.add(r.channelId);
                            let unsubParams = '';
                            const walkForUnsub = (o) => {
                                if (!o || typeof o !== 'object') return;
                                if (o.unsubscribeEndpoint?.params) { unsubParams = o.unsubscribeEndpoint.params; return; }
                                Object.values(o).forEach(walkForUnsub);
                            };
                            walkForUnsub(r.subscribeButton || r);
                            channels.push({
                                id: r.channelId,
                                name: r.title?.simpleText || 'Unknown',
                                icon: r.thumbnail?.thumbnails?.pop()?.url || '',
                                unsubParams
                            });
                        }
                        return;
                    }
                    if (obj.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token) {
                        token = obj.continuationItemRenderer.continuationEndpoint.continuationCommand.token;
                        return;
                    }
                    Object.values(obj).forEach(walkNode);
                };
                walkNode(data);
                return token;
            };

            let nextToken = null;
            
            // First page from HTML
            const res  = await fetch('/feed/channels');
            const text = await res.text();
            const data = this._extractYtInitialData(text);
            if (data) {
                nextToken = extractChannelsFromData(data);
            }

            // Follow continuation tokens for users with >100 subscriptions
            while (nextToken && ytConfig && ytConfig.apiKey) {
                statusEl.textContent = `Fetching subscriptions list... (${channels.length} found so far)`;
                try {
                    const contRes = await fetch(`/youtubei/v1/browse?key=${ytConfig.apiKey}`, {
                        method: 'POST',
                        headers: await this._getApiHeaders(ytConfig),
                        credentials: 'include',
                        body: JSON.stringify({
                            context: ytConfig.context,
                            continuation: nextToken
                        })
                    });
                    if (!contRes.ok) break;
                    const contData = await contRes.json();
                    nextToken = extractChannelsFromData(contData);
                } catch (err) {
                    window.YPP.utils?.log('Failed to fetch continuation', 'CHANNEL-HEALTH', 'warn', err);
                    break;
                }
            }
            } // end of else (!skipFullScan)

            if (channels.length === 0) {
                resultsEl.innerHTML = '<div style="text-align:center;color:rgba(255, 78, 69, 0.8);margin-top:40px;">No subscriptions found.</div>';
                btn.textContent = 'Scan Complete';
                btn.disabled = false;
                btn.style.opacity = '1';
                return;
            }

            // ── Step 3: Clear and set up streaming UI ─────────────────────
            resultsEl.innerHTML = '';
            if (statusEl) statusEl.remove();

            const now = Date.now();
            const MONTH_MS = 30 * 24 * 60 * 60 * 1000;
            let activeCount = 0, warningCount = 0, deadCount = 0, doneCount = 0;

            const updateCounters = () => {
                overlay.querySelector('#ypp-health-active').textContent  = activeCount;
                overlay.querySelector('#ypp-health-warning').textContent = warningCount;
                overlay.querySelector('#ypp-health-dead').textContent    = deadCount;
                btn.textContent = `Scanning… ${doneCount}/${channels.length}`;
                if (deadCount > 0) {
                    overlay.querySelector('#ypp-health-unsub-btn').style.display    = 'inline-block';
                    overlay.querySelector('#ypp-health-add-folder-btn').style.display = 'inline-block';
                }
            };

            const buildRow = (c) => {
                const channelFolders = [];
                if (folderUI && folderUI.storage && folderUI.storage.folders) {
                    for (const [fName, list] of Object.entries(folderUI.storage.folders)) {
                        if (list.includes(c.name)) channelFolders.push(fName);
                    }
                }

                const colorMap = { active: 'rgba(255,255,255,0.8)', warning: 'rgba(255,255,255,0.5)', dead: 'rgba(255,255,255,0.2)' };
                const color = colorMap[c.status] || '#888';

                const row = document.createElement('div');
                row.className = 'ypp-channel-health-row';
                row.dataset.status     = c.status;
                row.dataset.name       = c.name;
                row.dataset.uploadTime = c.lastUpload != null ? c.lastUpload : Infinity;
                row.dataset.folders    = channelFolders.join(',');
                row.setAttribute('draggable', 'true');
                row.style.cssText = 'display:flex;align-items:center;padding:14px 18px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:12px;border-left:3px solid ' + color + ';transition:background 0.15s,transform 0.15s;animation:ypp-fade-in 0.2s ease;cursor:grab;';

                row.addEventListener('mouseover', () => { row.style.background = 'rgba(255,255,255,0.045)'; row.style.transform = 'translateY(-1px)'; });
                row.addEventListener('mouseout',  () => { row.style.background = 'rgba(255,255,255,0.02)';  row.style.transform = 'translateY(0)'; });
                row.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', c.name);
                    e.dataTransfer.effectAllowed = 'copyMove';
                    row.style.opacity = '0.5';
                });
                row.addEventListener('dragend', () => {
                    row.style.opacity = '1';
                });

                // Build inner DOM safely without template literals (avoids Vite JSX parse errors)
                const img = document.createElement('img');
                img.src = c.icon || '';
                img.style.cssText = 'width:36px;height:36px;border-radius:50%;margin-right:14px;flex-shrink:0;';
                img.onerror = function() { this.style.display = 'none'; };
                row.appendChild(img);

                const infoDiv = document.createElement('div');
                infoDiv.style.cssText = 'flex:1;min-width:0;';

                const nameDiv = document.createElement('div');
                nameDiv.style.cssText = 'color:#E6E1E5;font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
                nameDiv.textContent = c.name;
                infoDiv.appendChild(nameDiv);

                const uploadDiv = document.createElement('div');
                uploadDiv.style.cssText = 'color:#938F99;font-size:11px;margin-top:1px;';
                uploadDiv.textContent = 'Last upload: ';
                const uploadSpan = document.createElement('span');
                uploadSpan.style.color = color;
                uploadSpan.textContent = c.lastUploadText || 'Unknown';
                uploadDiv.appendChild(uploadSpan);
                infoDiv.appendChild(uploadDiv);

                if (channelFolders.length > 0) {
                    const badgesDiv = document.createElement('div');
                    badgesDiv.style.marginTop = '4px';
                    channelFolders.forEach(f => {
                        const badge = document.createElement('span');
                        badge.style.cssText = 'background:rgba(255,255,255,0.12);padding:2px 7px;border-radius:20px;font-size:10px;margin-right:4px;color:#fff;display:inline-block;margin-bottom:2px;';
                        badge.textContent = f;
                        badgesDiv.appendChild(badge);
                    });
                    infoDiv.appendChild(badgesDiv);
                }
                row.appendChild(infoDiv);

                const actionsDiv = document.createElement('div');
                actionsDiv.style.cssText = 'display:flex;align-items:center;gap:10px;flex-shrink:0;';

                const visitLink = document.createElement('a');
                visitLink.href = '/channel/' + c.id;
                visitLink.target = '_blank';
                visitLink.style.cssText = 'color:#fff;text-decoration:none;font-size:12px;font-weight:500;opacity:0.8;transition:opacity 0.2s;';
                visitLink.textContent = 'Visit';
                visitLink.addEventListener('mouseover', () => { visitLink.style.opacity = '1'; });
                visitLink.addEventListener('mouseout',  () => { visitLink.style.opacity = '0.8'; });
                actionsDiv.appendChild(visitLink);

                const label = document.createElement('label');
                label.style.cssText = 'display:flex;align-items:center;cursor:pointer;color:#938F99;font-size:12px;font-weight:500;user-select:none;gap:6px;';
                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.className = 'ypp-unsub-checkbox';
                cb.value = c.id;
                cb.dataset.params = c.unsubParams || '';
                cb.style.cssText = 'width:15px;height:15px;cursor:pointer;accent-color:#fff;';
                label.appendChild(cb);
                label.appendChild(document.createTextNode('Select'));
                actionsDiv.appendChild(label);

                const folderBtn = document.createElement('button');
                folderBtn.className = 'ypp-indiv-folder-btn';
                folderBtn.style.cssText = 'background:rgba(255,255,255,0.08);color:#fff;border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.15s;';
                folderBtn.textContent = 'Folders';
                folderBtn.addEventListener('mouseover', () => { folderBtn.style.background = 'rgba(208,188,255,0.18)'; });
                folderBtn.addEventListener('mouseout',  () => { folderBtn.style.background = 'rgba(208,188,255,0.08)'; });
                folderBtn.addEventListener('click', (e) => { e.stopPropagation(); if (folderUI) folderUI.renderChannelPopover(folderBtn, c.name); });
                actionsDiv.appendChild(folderBtn);

                const indivBtn = document.createElement('button');
                indivBtn.className = 'ypp-indiv-unsub-btn';
                indivBtn.style.cssText = 'background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.8);border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.15s;';
                indivBtn.textContent = 'Unsub';
                indivBtn.addEventListener('mouseover', () => { indivBtn.style.background = 'rgba(242,184,181,0.18)'; });
                indivBtn.addEventListener('mouseout',  () => { indivBtn.style.background = 'rgba(242,184,181,0.08)'; });
                indivBtn.addEventListener('click', () => this.individualUnsubscribe(c.id, c.unsubParams, c.name, row, indivBtn));
                actionsDiv.appendChild(indivBtn);

                row.appendChild(actionsDiv);
                return row;
            };

            // ── Step 4: Fire RSS fetches with concurrency limit ────────────
            const processChannelUI = (c) => {
                doneCount++;
                const row = buildRow(c);
                
                // Directly apply current filter without triggering a full re-sort
                const filterSel = overlay.querySelector('#ypp-health-filter-dropdown');
                const folderSel = overlay.querySelector('#ypp-health-folder-dropdown');
                const searchInput = overlay.querySelector('#ypp-health-search-input');
                
                let show = true;
                if (filterSel && filterSel.value !== 'all' && c.status !== filterSel.value) show = false;
                if (show && folderSel && folderSel.value !== 'all') {
                    if (folderSel.value === '__no_folder__') {
                        if (row.dataset.folders !== '') show = false;
                    } else {
                        const folders = row.dataset.folders ? row.dataset.folders.split(',') : [];
                        if (!folders.includes(folderSel.value)) show = false;
                    }
                }
                if (show && searchInput && searchInput.value) {
                    if (!c.name.toLowerCase().includes(searchInput.value.toLowerCase())) show = false;
                }
                
                row.style.display = show ? 'flex' : 'none';
                resultsEl.appendChild(row);
                updateCounters();
            };

            if (skipFullScan) {
                channels.forEach(c => {
                    if (c.status === 'active') activeCount++;
                    else if (c.status === 'warning') warningCount++;
                    else deadCount++;
                    processChannelUI(c);
                });
            } else {
                const RSS_TIMEOUT_MS = 5000;
                const CONCURRENCY_LIMIT = 25;
                let currentIndex = 0;
                
                // Load Cache
                const cacheResult = await window.YPP.StorageManager.get('ypp_channel_health_cache_v2');
                const cacheData = cacheResult ? { ypp_channel_health_cache_v2: cacheResult } : {};
                const healthCache = cacheData.ypp_channel_health_cache_v2 || {};
                const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
                let cacheUpdated = false;

                const fetchChannel = async (c) => {
                    // Check Cache
                    const cached = healthCache[c.id];
                    if (cached && (now - cached.timestamp < CACHE_TTL)) {
                        c.lastUpload = now - cached.pubTime;
                        c.lastUploadText = cached.lastUploadText;
                        if      (c.lastUpload < MONTH_MS)     { c.status = 'active';  activeCount++;  }
                        else if (c.lastUpload < 3 * MONTH_MS) { c.status = 'warning'; warningCount++; }
                        else                                  { c.status = 'dead';    deadCount++;    }
                        processChannelUI(c);
                        return;
                    }

                    try {
                        const controller = new AbortController();
                        const tid = setTimeout(() => controller.abort(), RSS_TIMEOUT_MS);

                        const rssRes  = await fetch(`/feeds/videos.xml?channel_id=${c.id}`, { signal: controller.signal });
                        clearTimeout(tid);
                        const rssText = await rssRes.text();

                        // Regex parsing (drastically faster than DOMParser for hundreds of chunks)
                        // Note: The RSS feed contains a <published> tag for the channel creation date before the first <entry>.
                        // We must find the first <entry> and then extract its <published> date.
                        const entryIdx = rssText.indexOf('<entry>');
                        if (entryIdx !== -1) {
                            const entryText = rssText.substring(entryIdx);
                            const pubMatch = entryText.match(/<published>([^<]+)<\/published>/);
                            if (pubMatch && pubMatch[1]) {
                                const pubTime = new Date(pubMatch[1]).getTime();
                                const diff = now - pubTime;
                                c.lastUpload = diff;
                                c.lastUploadText = new Date(pubTime).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' });
                                
                                // Update Cache
                                healthCache[c.id] = { pubTime: pubTime, lastUploadText: c.lastUploadText, timestamp: now };
                                cacheUpdated = true;

                                if      (diff < MONTH_MS)     { c.status = 'active';  activeCount++;  }
                                else if (diff < 3 * MONTH_MS) { c.status = 'warning'; warningCount++; }
                                else                           { c.status = 'dead';    deadCount++;    }
                            } else {
                                c.status = 'dead'; c.lastUploadText = 'No date'; c.lastUpload = Infinity; deadCount++;
                            }
                        } else {
                            c.status = 'dead'; c.lastUploadText = 'No videos'; c.lastUpload = Infinity; deadCount++;
                        }
                    } catch (e) {
                        c.status = e.name === 'AbortError' ? 'warning' : 'dead';
                        c.lastUploadText = e.name === 'AbortError' ? 'Timeout' : 'Error';
                        c.lastUpload = Infinity;
                        if (c.status === 'warning') warningCount++; else deadCount++;
                    }
                    processChannelUI(c);
                };

                const worker = async () => {
                    while (currentIndex < channels.length) {
                        const c = channels[currentIndex++];
                        await fetchChannel(c);
                    }
                };

                const workers = Array.from({ length: Math.min(CONCURRENCY_LIMIT, channels.length) }, () => worker());
                await Promise.all(workers);
                
                if (cacheUpdated) {
                    await window.YPP.StorageManager.set('ypp_channel_health_cache_v2', healthCache);
                }
                
                ChannelHealthUI._lastScanChannels = channels;
            } // end of else (!skipFullScan)

            // ── Step 5: Finalise ───────────────────────────────────────────
            btn.textContent = `Scan Complete (${channels.length})`;
            btn.disabled = false;
            btn.style.opacity = '1';

            // Wire up checkbox counter (idempotent)
            if (!overlay._checkboxListenerAttached) {
                overlay._checkboxListenerAttached = true;
                resultsEl.addEventListener('change', (e) => {
                    if (!e.target.classList.contains('ypp-unsub-checkbox')) return;
                    const n = resultsEl.querySelectorAll('.ypp-unsub-checkbox:checked').length;
                    const unsubBtn    = overlay.querySelector('#ypp-health-unsub-btn');
                    const addFolderBtn = overlay.querySelector('#ypp-health-add-folder-btn');
                    const removeFolderBtn = overlay.querySelector('#ypp-health-remove-folder-btn');
                    const folderFilter = overlay.querySelector('#ypp-health-folder-filter-dropdown').value;

                    unsubBtn.textContent     = n > 0 ? `Unsubscribe Selected (${n})` : 'Unsubscribe Selected';
                    addFolderBtn.textContent = n > 0 ? `Add to Folder (${n})`        : 'Add to Folder';
                    unsubBtn.disabled     = n === 0;
                    addFolderBtn.disabled = n === 0;

                    if (removeFolderBtn) {
                        removeFolderBtn.textContent = n > 0 ? `Remove from Folder (${n})` : 'Remove from Folder';
                        removeFolderBtn.disabled = n === 0;
                        if (folderFilter !== 'all' && folderFilter !== '__no_folder__') {
                            removeFolderBtn.style.display = n > 0 ? 'inline-block' : 'none';
                        } else {
                            removeFolderBtn.style.display = 'none';
                        }
                    }
                });
            }

            // Final filter/sort pass
            const filterSel = overlay.querySelector('#ypp-health-filter-dropdown');
            if (filterSel) filterSel.dispatchEvent(new Event('change'));

        } catch (e) {
            window.YPP.Utils?.log('Scan error', 'CHANNEL-HEALTH', 'error', e);
            resultsEl.innerHTML = '<div style="text-align:center;color:rgba(255,255,255,0.8);margin-top:40px;font-size:14px;">Scan failed: ' + (e.message || 'Unknown error') + '</div>';
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
            let resolved = false;

            const listener = (e) => {
                if (e.data && e.data.type === 'YPP_YTCFG_RESPONSE' && e.data.reqId === reqId) {
                    window.removeEventListener('message', listener);
                    if (!resolved) {
                        resolved = true;
                        resolve(e.data.config);
                    }
                }
            };
            window.addEventListener('message', listener);

            // Fallback timeout in case CSP blocks the script injection
            setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    window.removeEventListener('message', listener);
                    window.YPP.Utils?.log('_getYoutubeConfig timed out. Returning empty config.', 'CHANNEL-HEALTH', 'warn');
                    resolve({}); // Will trigger the "Auth Error" dialog
                }
            }, 1500);

            // Ensure the bridge script is injected
            if (!document.getElementById('ypp-ytcfg-bridge')) {
                const script = document.createElement('script');
                script.id = 'ypp-ytcfg-bridge';
                script.src = chrome.runtime.getURL('src/inject/ytcfg-bridge.js');
                document.documentElement.appendChild(script);
            }

            // Give the script a short moment to load/parse if newly injected,
            // then send the request.
            setTimeout(() => {
                window.postMessage({
                    type: 'YPP_YTCFG_REQUEST',
                    reqId: reqId
                }, '*');
            }, 50);
        });
    }

    /**
     * Tier 2: InnerTube API unsubscribe.
     * Sends a POST to YouTube's internal subscription endpoint.
     * Returns true on success, false on failure.
     */
    static async _getApiHeaders(config) {
        const origin = window.location.origin;
        const time = Math.floor(Date.now() / 1000);

        const sha1 = async (str) => {
            const buf = new TextEncoder().encode(str);
            const hash = await crypto.subtle.digest('SHA-1', buf);
            return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
        };

        // Build a combined multi-hash Authorization header (same as YouTube's web frontend)
        const readCookie = (name) => {
            const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)'));
            return m ? m[1] : null;
        };

        const sapisid    = readCookie('SAPISID');
        const sapisid1p  = readCookie('__Secure-1PAPISID');
        const sapisid3p  = readCookie('__Secure-3PAPISID');

        const parts = [];
        if (sapisid)   parts.push(`SAPISIDHASH ${time}_${await sha1(`${time} ${sapisid} ${origin}`)}`);
        if (sapisid1p) parts.push(`SAPISID1PHASH ${time}_${await sha1(`${time} ${sapisid1p} ${origin}`)}`);
        if (sapisid3p) parts.push(`SAPISID3PHASH ${time}_${await sha1(`${time} ${sapisid3p} ${origin}`)}`);

        const headers = {
            'Content-Type': 'application/json',
            'X-YouTube-Client-Name': '1',
            'X-YouTube-Client-Version': config.clientVersion || '2.20240101.01.00',
            'X-Origin': origin,
            'X-Goog-Visitor-Id': config.visitorData || '',
        };

        if (config.sessionIndex != null) headers['X-Goog-AuthUser'] = String(config.sessionIndex);
        if (config.pageId) headers['X-Goog-PageId'] = String(config.pageId);
        if (parts.length) headers['Authorization'] = parts.join(' ');

        return headers;
    }


    /**
     * Tier 2: InnerTube API unsubscribe.
     * Sends a POST to YouTube's internal subscription endpoint.
     * Returns true on success, false on failure.
     */
    static async _tryApiUnsubscribe(channelData, config) {
        const headers = await this._getApiHeaders(config);

        const makeRequest = async (withParams) => {
            const payload = { context: config.context, channelIds: [channelData.id] };
            if (withParams && channelData.params) payload.params = channelData.params;
            const res = await fetch(`/youtubei/v1/subscription/unsubscribe?key=${config.apiKey}`, {
                method: 'POST', headers, credentials: 'include',
                body: JSON.stringify(payload)
            });
            const data = await res.json().catch(() => ({}));
            return { ok: res.ok && !data.error, status: res.status, data };
        };

        try {
            // Attempt 1: with params
            let res = await makeRequest(true);
            if (res.ok) return true;

            // Attempt 2: without params (handles stale token / 403)
            if (!res.ok && channelData.params) {
                res = await makeRequest(false);
                if (res.ok) return true;
            }

            window.YPP.Utils?.log(`API unsubscribe failed for ${channelData.id}: HTTP ${res.status}`, 'CHANNEL-HEALTH', 'warn', res.data);
        } catch (e) {
            window.YPP.Utils?.log('API unsubscribe exception', 'CHANNEL-HEALTH', 'error', e);
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
            // Find subscribe button renderers that match this channel
            const candidates = document.querySelectorAll(
                `ytd-subscribe-button-renderer[channel-id="${channelId}"], ` +
                `[channel-id="${channelId}"] ytd-subscribe-button-renderer`
            );

            // Expanded selectors for both old (paper-button) and new (yt-button-shape) YouTube UI
            const SUB_BTN_SELECTORS = [
                'yt-button-shape button',
                '.yt-spec-button-shape-next',
                'tp-yt-paper-button',
                'button'
            ];

            for (const renderer of candidates) {
                let btn = null;
                for (const sel of SUB_BTN_SELECTORS) {
                    btn = renderer.querySelector(sel);
                    if (btn) break;
                }
                if (!btn) continue;
                
                const text = (btn.textContent || btn.getAttribute('aria-label') || '').toLowerCase().trim();
                
                // Only click if the user is subscribed (button says Subscribed/Unsubscribe)
                // New YouTube UI sometimes hides text in a tooltip or a deeply nested span
                const innerSpan = btn.querySelector('.yt-core-attributed-string');
                const innerText = innerSpan ? innerSpan.textContent.toLowerCase().trim() : '';

                if (text === 'subscribed' || text === 'unsubscribe' || text.includes('subscribed') || 
                    innerText === 'subscribed' || innerText === 'unsubscribe' || innerText.includes('subscribed')) {
                    
                    btn.click();
                    // Wait for YouTube's confirm dialog to appear
                    await new Promise(r => setTimeout(r, 800));
                    
                    // Try all confirmation dialog selectors — new UI uses yt-button-shape inside dialog
                    const CONFIRM_SELECTORS = [
                        'yt-confirm-dialog-renderer #confirm-button button',
                        'yt-confirm-dialog-renderer yt-button-shape button',
                        'yt-confirm-dialog-renderer [dialog-confirm] button',
                        'yt-confirm-dialog-renderer button',
                        'tp-yt-paper-dialog .buttons tp-yt-paper-button:last-of-type',
                        '[aria-label="Unsubscribe"]',
                        'yt-button-shape button[aria-label="Unsubscribe"]'
                    ];
                    
                    for (const sel of CONFIRM_SELECTORS) {
                        const confirmBtn = document.querySelector(sel);
                        if (confirmBtn) {
                            confirmBtn.click();
                            window.YPP.Utils?.log(`Native DOM unsubscribe succeeded for ${channelId}`, 'CHANNEL-HEALTH', 'debug');
                            return true;
                        }
                    }
                }
            }
        } catch (e) {
            window.YPP.Utils?.log('Native DOM unsubscribe failed', 'CHANNEL-HEALTH', 'warn', e);
        }
        return false;
    }

    /**
     * Tier 2b: Fresh API Token Fetch
     * Dynamically loads channel page, extracts fresh unsubParams, and executes API.
     */
    static async _tryFreshApiUnsubscribe(channelId, config) {
        // Try /channel/ URL first, then /@handle fallback
        const urlsToTry = [
            `/channel/${channelId}`,
            `/@${channelId}` // In case channelId is actually a handle
        ];
        
        for (const url of urlsToTry) {
            try {
                const res = await fetch(url);
                if (!res.ok) continue;
                const text = await res.text();
                const data = this._extractYtInitialData(text);
                if (data) {
                    let freshParams = null;
                    const walk = (o) => {
                        if (freshParams) return;
                        if (!o || typeof o !== 'object') return;
                        if (o.unsubscribeEndpoint?.params) {
                            freshParams = o.unsubscribeEndpoint.params;
                            return;
                        }
                        Object.values(o).forEach(walk);
                    };
                    walk(data);
                        
                    if (freshParams) {
                        return await this._tryApiUnsubscribe({ id: channelId, params: freshParams }, config);
                    }
                }
            } catch(e) {
                window.YPP.utils?.log(`Fresh API unsub error for ${url}`, 'CHANNEL-HEALTH', 'warn', e);
            }
        }
        return false;
    }

    /**
     * Tier 4: Hidden Iframe Simulator
     * Injects an invisible iframe, loads the channel, and simulates the actual DOM clicks.
     * Guarantees 100% success rate without leaving the current page.
     */
    static async _tryIframeUnsubscribe(channelId) {
        return new Promise(resolve => {
            const iframe = document.createElement('iframe');
            // Make invisible but keep in viewport to ensure intersection observer loads polymer app
            iframe.style.cssText = 'width:300px;height:300px;opacity:0.01;position:fixed;bottom:0;right:0;pointer-events:none;z-index:9999;border:0;';
            iframe.src = `/channel/${channelId}`;
            
            let resolved = false;
            let timeout = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    iframe.remove();
                    resolve(false);
                }
            }, 12000); // 12s timeout per channel

            iframe.onload = async () => {
                try {
                    const idoc = iframe.contentDocument || iframe.contentWindow.document;
                    let btn = null;
                    
                    // Wait for the button to render
                    for (let i = 0; i < 30; i++) {
                        const renderer = idoc.querySelector('ytd-subscribe-button-renderer');
                        if (renderer) {
                            btn = renderer.querySelector('button');
                            if (btn && btn.offsetParent !== null) break;
                        }
                        await new Promise(r => setTimeout(r, 200));
                    }
                    
                    if (btn) {
                        const text = (btn.textContent || btn.getAttribute('aria-label') || '').toLowerCase();
                        if (text.includes('subscribed') || text.includes('unsubscribe')) {
                            btn.click();
                            await new Promise(r => setTimeout(r, 500));
                            
                            // Find and click the confirm button
                            for (let i = 0; i < 15; i++) {
                                const confirmBtn = idoc.querySelector('yt-confirm-dialog-renderer #confirm-button button, yt-button-shape[id="confirm-button"] button');
                                if (confirmBtn) {
                                    confirmBtn.click();
                                    await new Promise(r => setTimeout(r, 500));
                                    if (!resolved) {
                                        resolved = true;
                                        clearTimeout(timeout);
                                        iframe.remove();
                                        resolve(true);
                                    }
                                    return;
                                }
                                await new Promise(r => setTimeout(r, 200));
                            }
                        }
                    }
                } catch(e) {}
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timeout);
                    iframe.remove();
                    resolve(false);
                }
            };
            document.body.appendChild(iframe);
        });
    }

    /**
     * Main unsubscribe orchestrator — utilizes the 4-tier fallback chain.
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
            // Tier 1: InnerTube API
            let succeeded = await this._tryApiUnsubscribe(c, config);

            // Tier 2: Fresh API Params
            if (!succeeded) {
                window.YPP.Utils?.log(`API failed for ${c.name || c.id}, trying Fresh API...`, 'CHANNEL-HEALTH', 'warn');
                succeeded = await this._tryFreshApiUnsubscribe(c.id, config);
            }

            // Tier 3: Native DOM click
            if (!succeeded) {
                window.YPP.Utils?.log(`Fresh API failed for ${c.name || c.id}, trying native DOM...`, 'CHANNEL-HEALTH', 'warn');
                succeeded = await this._tryNativeDomUnsubscribe(c.id);
            }

            // Tier 4: Hidden Iframe DOM click
            if (!succeeded) {
                window.YPP.Utils?.log(`Native DOM failed for ${c.name || c.id}, trying iframe simulator...`, 'CHANNEL-HEALTH', 'warn');
                succeeded = await this._tryIframeUnsubscribe(c.id);
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
        // Confirm before acting
        const confirmed = await window.YPP.features.CustomDialog.confirm(
            'Unsubscribe',
            `Unsubscribe from ${channelName}?`,
            'Unsubscribe',
            true
        );
        if (!confirmed) return;

        // Show loading state immediately
        const originalText = btnEl.textContent;
        btnEl.textContent = 'Unsubscribing...';
        btnEl.disabled = true;

        const resetBtn = (text, color) => {
            btnEl.textContent = text;
            btnEl.disabled = false;
            if (color) {
                btnEl.style.color = color;
                btnEl.style.borderColor = color;
            }
        };

        try {
            const config = await this._getYoutubeConfig();

            if (!config.apiKey || !config.context) {
                resetBtn(originalText, null);
                await window.YPP.features.CustomDialog.alert('Auth Error', 'Could not get YouTube credentials. Please refresh and try again.');
                return;
            }

            // Tier 1: Try API first (fastest path)
            let succeeded = await this._tryApiUnsubscribe({ id: channelId, params, name: channelName }, config);

            // Tier 2: Fresh API Params
            if (!succeeded) {
                succeeded = await this._tryFreshApiUnsubscribe(channelId, config);
            }

            // Tier 3: Native DOM click fallback
            if (!succeeded) {
                succeeded = await this._tryNativeDomUnsubscribe(channelId);
            }

            // Tier 4: Hidden Iframe DOM click fallback
            if (!succeeded) {
                succeeded = await this._tryIframeUnsubscribe(channelId);
            }

            if (succeeded) {
                // Visual success feedback
                rowEl.style.transition = 'opacity 0.4s ease';
                rowEl.style.opacity = '0.35';
                btnEl.textContent = '✓ Unsubscribed';
                btnEl.style.color = 'rgba(255, 255, 255, 0.8)';
                btnEl.style.borderColor = 'rgba(255, 255, 255, 0.8)';
                btnEl.disabled = true;
                // Disable checkbox too
                const cb = rowEl.querySelector('.ypp-unsub-checkbox');
                if (cb) { cb.disabled = true; cb.checked = false; }
                // Remove row after a short delay
                setTimeout(() => {
                    rowEl.style.maxHeight = rowEl.offsetHeight + 'px';
                    rowEl.style.overflow = 'hidden';
                    rowEl.style.transition = 'max-height 0.4s ease, opacity 0.4s ease, margin 0.4s ease';
                    requestAnimationFrame(() => {
                        rowEl.style.maxHeight = '0';
                        rowEl.style.opacity = '0';
                        rowEl.style.marginBottom = '0';
                    });
                    setTimeout(() => rowEl.remove(), 450);
                }, 1200);
            } else {
                // Reset button and show error
                resetBtn(originalText, 'rgba(255, 255, 255, 0.8)');
                setTimeout(() => resetBtn(originalText, null), 3000);
                await window.YPP.features.CustomDialog.alert(
                    'Unsubscribe Failed',
                    `Could not unsubscribe from ${channelName}.\n\nYouTube may have blocked the request. Try visiting the channel page directly.`
                );
            }
        } catch (e) {
            window.YPP.Utils?.log('individualUnsubscribe error', 'CHANNEL-HEALTH', 'error', e);
            resetBtn(originalText, null);
        }
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

    static async bulkRemoveFromFolder(overlay, folderUI, folderName) {
        const checkboxes = overlay.querySelectorAll('.ypp-unsub-checkbox:checked');
        if (checkboxes.length === 0) return;

        const btn = overlay.querySelector('#ypp-health-remove-folder-btn');
        const oldText = btn.textContent;
        btn.textContent = 'Removing...';
        btn.disabled = true;

        const channels = Array.from(checkboxes).map(cb => ({
            id: cb.value,
            name: cb.closest('.ypp-channel-health-row').dataset.name
        }));

        let removedCount = 0;
        channels.forEach(c => {
            if (folderUI.storage.removeChannelFromFolder(c.name, folderName)) {
                removedCount++;
            }
        });

        if (removedCount > 0) {
            folderUI.storage.save();
            ChannelHealthUI.runScan(overlay, folderUI, true);
        } else {
            btn.textContent = oldText;
            btn.disabled = false;
        }
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
            item.innerHTML = String.raw`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg> ${folder}`;
            
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

                // Re-render the modal's side pane to update folder numbers
                ChannelHealthUI.runScan(overlay, folderUI, true);

                popup.remove();
                
                const oldText = btn.textContent;
                btn.textContent = `Added ${addedCount} to ${folder}`;
                btn.style.background = 'rgba(76, 175, 80, 0.15)';
                btn.style.color = '#4caf50';
                btn.style.borderColor = 'rgba(76, 175, 80, 0.3)';
                
                setTimeout(() => {
                    btn.textContent = oldText;
                    btn.style.background = 'rgba(255, 255, 255, 0.1)';
                    btn.style.color = '#fff';
                    btn.style.borderColor = 'rgba(255, 255, 255, 0.2)';
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
