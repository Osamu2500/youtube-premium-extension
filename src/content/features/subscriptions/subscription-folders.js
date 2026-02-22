/**
 * Subscription Folders
 * Replaces the heavy "PocketTube" extension with a blazing-fast, strictly styled native implementation.
 * Allows users to group their subscribed channels into folders and filter the subscriptions feed.
 */

window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.SubscriptionFolders = class SubscriptionFolders {
    constructor() {
        this.enabled = false;
        this.folders = {
            "Favorites": [],
            "Tech": [],
            "Gaming": []
        };
        this.activeFolder = null;
        this.isFeedPage = false;
        this.isGuidePage = false;
        
        // Use a fast Set for constant-time lookups during grid rendering
        this.activeChannelSet = new Set();
        
        this.observer = new window.YPP.Utils.DOMObserver();
        this.STORAGE_KEY = 'ypp_subscription_folders';
    }

    async update(settings) {
        this.enabled = !!settings?.subscriptionFolders;
        
        if (!this.enabled) {
            this.disable();
            return;
        }

        // Initialize only once
        if (this.initialized) {
            this.handleNavigation();
            return;
        }
        
        await this.loadFolders();
        this.setupNavigationListener();
        this.handleNavigation();
        
        this.initialized = true;
    }

    disable() {
        this.enabled = false;
        this.observer.disconnectAll();
        // Remove active filters
        document.body.classList.remove('ypp-sub-folders-active');
        this.removeFilterChips();
        this.removeGuideFolders();
    }

    // ==========================================
    // DATA & STORAGE
    // ==========================================
    
    async loadFolders() {
        try {
            const result = await chrome.storage.local.get([this.STORAGE_KEY]);
            if (result[this.STORAGE_KEY]) {
                this.folders = result[this.STORAGE_KEY];
            } else {
                // Save defaults on first run
                await this.saveFolders();
            }
        } catch (e) {
            window.YPP.Utils.log('Failed to load subscription folders', 'SubFolders', 'error');
        }
    }

    async saveFolders() {
        try {
            await chrome.storage.local.set({ [this.STORAGE_KEY]: this.folders });
        } catch (e) {
            window.YPP.Utils.log('Failed to save subscription folders', 'SubFolders', 'error');
        }
    }

    addFolder(folderName) {
        if (!folderName || this.folders[folderName]) return false;
        this.folders[folderName] = [];
        this.saveFolders();
        this.renderGuideFolders(); // Re-render sidebar
        return true;
    }

    deleteFolder(folderName) {
        if (this.folders[folderName]) {
            delete this.folders[folderName];
            if (this.activeFolder === folderName) {
                this.activeFolder = null;
                this.updateFilterState();
            }
            this.saveFolders();
            this.renderGuideFolders();
            return true;
        }
        return false;
    }

    addChannelToFolder(channelName, folderName) {
        if (!this.folders[folderName]) return false;
        if (!this.folders[folderName].includes(channelName)) {
            this.folders[folderName].push(channelName);
            this.saveFolders();
            
            // If we are currently filtering by this folder, update the active set immediately
            if (this.activeFolder === folderName) {
                this.activeChannelSet.add(channelName);
                this.applyFeedFilters();
            }
            return true;
        }
        return false;
    }

    removeChannelFromFolder(channelName, folderName) {
        if (!this.folders[folderName]) return false;
        
        const index = this.folders[folderName].indexOf(channelName);
        if (index > -1) {
            this.folders[folderName].splice(index, 1);
            this.saveFolders();
            
            if (this.activeFolder === folderName) {
                this.activeChannelSet.delete(channelName);
                this.applyFeedFilters();
            }
            return true;
        }
        return false;
    }

    // ==========================================
    // ROUTING & NAVIGATION
    // ==========================================

    setupNavigationListener() {
        // Run immediately on init for the first page load
        this.handleNavigation();
        
        // Use extension events or standard yt-navigate-finish
        document.addEventListener('yt-navigate-finish', () => this.handleNavigation());
        
        // Some SPAs don't fire navigate-finish perfectly, listen to popstate as fallback
        window.addEventListener('popstate', () => {
            setTimeout(() => this.handleNavigation(), 100);
        });
        
        // Fallback mutation observer for when the guide or feed loads late
        this.observer.register('fallback-navigation', 'ytd-app', () => {
             // Non-intrusive re-check to catch delayed DOM renders
             if (!document.getElementById('ypp-sub-folders-container')) {
                 this.injectGuideFolders();
             }
             if (this.isFeedPage && !document.getElementById('ypp-folder-chips')) {
                 this.setupFeedFilters();
             }
        });
    }

    handleNavigation() {
        if (!this.enabled) return;
        
        const url = window.location.href;
        
        // Always try to inject into the sidebar (it persists across pages)
        this.injectGuideFolders();
        this.injectCardBadges(); // Inject onto video cards everywhere
        
        // 1. Subscriptions Feed
        if (url.includes('/feed/subscriptions')) {
            this.isFeedPage = true;
            this.setupFeedFilters();
        } else {
            this.isFeedPage = false;
            this.clearFeedFilters();
        }

        // 2. Channel Pages (Add to folder badge)
        if (url.includes('/channel/') || url.includes('/@')) {
            this.injectChannelBadge();
        }
    }

    // ==========================================
    // LEFT SIDEBAR (GUIDE) INTEGRATION
    // ==========================================

    injectGuideFolders() {
        this.observer.register('guide-folders', '#guide-inner-content #sections ytd-guide-section-renderer', (elements) => {
            // Find the active subscriptions section (usually the 2nd one)
            // It contains links to /feed/channels, etc.
            const sections = Array.from(document.querySelectorAll('#guide-inner-content ytd-guide-section-renderer'));
            
            let subsSection = sections.find(sec => {
                const title = sec.querySelector('#title')?.textContent?.toLowerCase() || '';
                return title.includes('subscriptions') || title.includes('abonnements');
            });
            
            if (!subsSection && sections.length > 1) {
                subsSection = sections[1]; // Fallback
            }

            if (subsSection) {
                this.renderGuideFolders(subsSection);
            }
        }, { runOnce: true });
    }

    renderGuideFolders(sectionEl = null) {
        // If no section provided, try to find the container we previously created
        const containerId = 'ypp-sub-folders-container';
        let container = document.getElementById(containerId);
        
        if (!container && sectionEl) {
            // Create the wrapper
            container = document.createElement('div');
            container.id = containerId;
            container.className = 'ypp-sub-folders';
            
            const itemsContainer = sectionEl.querySelector('#items');
            if (itemsContainer) {
                itemsContainer.parentNode.insertBefore(container, itemsContainer.nextSibling);
            }
        }
        
        if (!container) return; // Still not found
        
        // Clear current folders
        container.innerHTML = `
            <div class="ypp-folder-header">
                <h3>My Folders</h3>
                <button id="ypp-add-folder-btn" class="ypp-icon-btn">+</button>
            </div>
            <div id="ypp-folder-list"></div>
        `;
        
        const list = container.querySelector('#ypp-folder-list');
        
        // Render each folder
        Object.keys(this.folders).forEach(folderName => {
            const el = document.createElement('div');
            el.className = 'ypp-folder-item';
            if (this.activeFolder === folderName) el.classList.add('active');
            
            el.innerHTML = `
                <div class="ypp-folder-icon">📁</div>
                <div class="ypp-folder-name">${folderName}</div>
                <div class="ypp-folder-count">${this.folders[folderName].length}</div>
            `;
            
            el.addEventListener('click', () => {
                // Navigate to subscriptions feed with this folder active
                if (!window.location.href.includes('/feed/subscriptions')) {
                    // Set a session storage flag so the target page knows which folder to activate
                    sessionStorage.setItem('ypp_pending_folder', folderName);
                    
                    // Trigger SPA navigation (fake click)
                    const tempLink = document.createElement('a');
                    tempLink.href = '/feed/subscriptions';
                    document.body.appendChild(tempLink);
                    tempLink.click();
                    tempLink.remove();
                } else {
                    this.setActiveFolder(folderName);
                }
            });
            
            list.appendChild(el);
        });
        
        // Add folder button listener
        container.querySelector('#ypp-add-folder-btn').addEventListener('click', () => {
            const name = prompt('Enter new folder name:');
            if (name && name.trim()) {
                this.addFolder(name.trim());
            }
        });
    }

    removeGuideFolders() {
        const container = document.getElementById('ypp-sub-folders-container');
        if (container) container.remove();
    }

    // ==========================================
    // FEED FILTERING INTEGRATION
    // ==========================================

    setupFeedFilters() {
        // Check if there's a pending folder requested from the sidebar
        const pendingFolder = sessionStorage.getItem('ypp_pending_folder');
        if (pendingFolder) {
            this.activeFolder = pendingFolder;
            sessionStorage.removeItem('ypp_pending_folder');
        }
        
        this.renderFilterChips();
        this.updateFilterState();
        
        // Hook into the grid to continuously filter loaded elements
        this.observer.register('feed-filter-loop', 'ytd-rich-grid-renderer #contents ytd-rich-item-renderer', () => {
            if (this.activeFolder) {
                this.applyFeedFilters();
            }
        });
    }

    clearFeedFilters() {
        this.windowScrollActive = false;
        this.activeFolder = null;
        document.body.classList.remove('ypp-sub-folders-active');
        this.removeFilterChips();
    }

    setActiveFolder(folderName) {
        if (this.activeFolder === folderName) {
            // Toggle off
            this.activeFolder = null;
        } else {
            this.activeFolder = folderName;
        }
        
        this.updateFilterState();
        
        // Update Guide UI active states
        document.querySelectorAll('.ypp-folder-item').forEach(el => {
            if (el.querySelector('.ypp-folder-name').textContent === this.activeFolder) {
                el.classList.add('active');
            } else {
                el.classList.remove('active');
            }
        });
    }

    updateFilterState() {
        if (!this.isFeedPage) return;
        
        if (this.activeFolder) {
            document.body.classList.add('ypp-sub-folders-active');
            // Cache the active set for blazing-fast lookups during DOM iterations
            this.activeChannelSet = new Set(this.folders[this.activeFolder] || []);
            this.applyFeedFilters();
        } else {
            document.body.classList.remove('ypp-sub-folders-active');
            this.resetFeedVisibility();
        }
        
        // Update chip UI
        document.querySelectorAll('.ypp-filter-chip').forEach(chip => {
            if (chip.dataset.folder === this.activeFolder) {
                chip.classList.add('active');
            } else {
                chip.classList.remove('active');
            }
        });
    }

    applyFeedFilters() {
        if (!this.activeFolder || !this.isFeedPage) return;
        
        // Extremely fast DOM iteration natively overriding CSS display
        const videoCards = document.querySelectorAll('ytd-rich-grid-renderer ytd-rich-item-renderer');
        
        videoCards.forEach(card => {
            // Prevent touching non-video elements (like Continuation Items, but those are handled by main grid)
            const channelLink = card.querySelector('#channel-name a');
            if (!channelLink) return;
            
            const channelName = channelLink.textContent.trim();
            
            if (this.activeChannelSet.has(channelName)) {
                card.style.display = '';
                card.classList.add('ypp-filtered-in');
            } else {
                card.style.display = 'none';
                card.classList.remove('ypp-filtered-in');
            }
        });
        
        // Force an intersection observer check on the continuation item just in case the filter
        // hid everything on the screen and we need to load more immediately.
        const spinner = document.querySelector('ytd-continuation-item-renderer');
        if (spinner && spinner.getBoundingClientRect().top < window.innerHeight * 2) {
            window.scrollBy(0, 1);
            window.scrollBy(0, -1);
        }
    }

    resetFeedVisibility() {
        const videoCards = document.querySelectorAll('ytd-rich-grid-renderer ytd-rich-item-renderer');
        videoCards.forEach(card => {
            card.style.display = '';
            card.classList.remove('ypp-filtered-in');
        });
    }

    renderFilterChips() {
        // Target the main grid to ensure we inject the chips on the feed page even if header is missing
        this.observer.register('inject-filter-chips', 'ytd-browse[page-subtype="subscriptions"] ytd-rich-grid-renderer, ytd-browse[page-subtype="channels"] ytd-rich-grid-renderer', (elements) => {
            const grid = elements[0];
            let chipsBar = document.getElementById('ypp-folder-chips');
            
            if (!chipsBar) {
                chipsBar = document.createElement('div');
                chipsBar.id = 'ypp-folder-chips';
                chipsBar.className = 'ypp-folder-chips-bar';
                // Insert before the contents container so it sits at the top of the grid
                const contents = grid.querySelector('#contents');
                if (contents) {
                    grid.insertBefore(chipsBar, contents);
                } else {
                    grid.prepend(chipsBar);
                }
            }
            
            // Re-render contents
            chipsBar.innerHTML = '';
            
            // "All" chip
            const allChip = document.createElement('button');
            allChip.className = `ypp-filter-chip ${!this.activeFolder ? 'active' : ''}`;
            allChip.textContent = 'All Subscriptions';
            allChip.dataset.folder = '';
            allChip.addEventListener('click', () => this.setActiveFolder(null));
            chipsBar.appendChild(allChip);
            
            // Render folder chips
            Object.keys(this.folders).forEach(folderName => {
                const chip = document.createElement('button');
                chip.className = `ypp-filter-chip ${this.activeFolder === folderName ? 'active' : ''}`;
                chip.textContent = folderName;
                chip.dataset.folder = folderName;
                chip.addEventListener('click', () => this.setActiveFolder(folderName));
                
                // Add right-click to delete folder
                chip.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    if (confirm(`Delete folder "${folderName}"?`)) {
                        this.removeFolder(folderName);
                        // reset active if it was the deleted one
                        if (this.activeFolder === folderName) this.setActiveFolder(null);
                        this.renderFilterChips();
                    }
                });
                
                chipsBar.appendChild(chip);
            });
            
            // Add Folder Button
            const addBtn = document.createElement('button');
            addBtn.className = 'ypp-filter-chip ypp-add-folder-btn';
            addBtn.textContent = '+ New Folder';
            addBtn.style.opacity = '0.7';
            addBtn.style.borderStyle = 'dashed';
            addBtn.addEventListener('click', () => {
                const name = prompt('Enter new folder name:');
                if (name && name.trim()) {
                    this.addFolder(name.trim());
                    this.renderFilterChips(); // refresh
                }
            });
            chipsBar.appendChild(addBtn);
        }, { runOnce: true });
    }

    removeFilterChips() {
        const chipsBar = document.getElementById('ypp-folder-chips');
        if (chipsBar) chipsBar.remove();
    }

    // ==========================================
    // CHANNEL & CARD INTEGRATION
    // ==========================================

    injectCardBadges() {
        this.observer.register('feed-card-badges', 'ytd-rich-item-renderer #channel-name, ytd-video-renderer #channel-name, ytd-grid-video-renderer #channel-name', (elements) => {
            elements.forEach(container => {
                if (container.querySelector('.ypp-card-folder-btn')) return;
                
                // YouTube has multiple deeply nested elements with the id "channel-name". 
                // We want the one containing the complex-string link.
                const link = container.querySelector('a');
                if (!link || !link.textContent.trim()) return;
                
                const btn = document.createElement('button');
                btn.className = 'ypp-card-folder-btn';
                btn.innerHTML = '📁';
                btn.title = "Save to Folder";
                btn.style.cssText = 'background:none; border:none; cursor:pointer; font-size:12px; margin-left:6px; opacity:0.6; padding:0; vertical-align:middle; transition:opacity 0.2s';
                
                btn.addEventListener('mouseenter', () => btn.style.opacity = '1');
                btn.addEventListener('mouseleave', () => btn.style.opacity = '0.6');
                
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const channelName = link.textContent.trim();
                    this.renderChannelPopover(btn, channelName);
                });
                
                // Append directly after the channel name formatting
                container.style.display = 'flex';
                container.style.alignItems = 'center';
                container.appendChild(btn);
            });
        }, { runOnce: false });
    }

    injectChannelBadge() {
        this.observer.register('channel-badge', 'ytd-subscribe-button-renderer', (elements) => {
            // Double check we are actually on a channel page banner
            const container = elements[0].parentNode;
            if (document.getElementById('ypp-channel-folder-btn')) return;
            
            const btn = document.createElement('button');
            btn.id = 'ypp-channel-folder-btn';
            btn.className = 'ypp-tactile-btn';
            btn.innerHTML = `<span style="margin-right:4px;">📁</span> Folders`;
            
            // Extract the current channel name from the header
            const channelNameEl = document.querySelector('ytd-channel-name#channel-name .yt-formatted-string');
            if (!channelNameEl) return;
            
            const channelName = channelNameEl.textContent.trim();
            
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.renderChannelPopover(btn, channelName);
            });
            
            // Insert it securely before the subscribe button (or append to container)
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
            
            // Click outside to close
            document.addEventListener('click', (e) => {
                if (!popover.contains(e.target) && e.target !== buttonEl) {
                    popover.classList.remove('visible');
                }
            });
        }
        
        // Position it right below the button
        const rect = buttonEl.getBoundingClientRect();
        popover.style.top = `${rect.bottom + window.scrollY + 8}px`;
        popover.style.left = `${rect.left + window.scrollX}px`;
        
        // Generate checklist
        let html = `<div class="ypp-popover-header">Save <b>${channelName}</b> to:</div><div class="ypp-popover-list">`;
        
        Object.keys(this.folders).forEach(folderName => {
            const isChecked = this.folders[folderName].includes(channelName);
            html += `
                <label class="ypp-folder-checkbox">
                    <input type="checkbox" data-folder="${folderName}" ${isChecked ? 'checked' : ''}>
                    <span>${folderName}</span>
                </label>
            `;
        });
        
        html += `</div>`;
        popover.innerHTML = html;
        
        // Add listeners
        popover.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const folder = e.target.dataset.folder;
                if (e.target.checked) {
                    this.addChannelToFolder(channelName, folder);
                } else {
                    this.removeChannelFromFolder(channelName, folder);
                }
                this.renderGuideFolders(); // Live update sidebar counts
            });
        });
        
        popover.classList.add('visible');
    }
}
