window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.AccountMenu = class AccountMenu extends window.YPP.features.BaseFeature {
    constructor() {
        super('AccountMenu');
    }

    getConfigKey() { return 'enableAccountMenu'; }

    async enable() {
        await super.enable();
        
        // Listen to clicks as an ultra-reliable fallback for dropdowns
        this._clickHandler = (e) => {
            if (e.target.closest('#avatar-btn, ytd-topbar-menu-button-renderer button, .ytd-topbar-menu-button-renderer')) {
                setTimeout(() => this._tryInject(), 50);
                setTimeout(() => this._tryInject(), 200);
                setTimeout(() => this._tryInject(), 500);
            }
        };
        document.addEventListener('click', this._clickHandler);

        this._menuObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                // Check for menu opening
                for (const node of mutation.addedNodes) {
                    if (node.nodeType !== 1) continue;
                    if (node.tagName === 'TP-YT-IRON-DROPDOWN' ||
                        node.tagName === 'YTD-MULTI-PAGE-MENU-RENDERER' ||
                        node.tagName === 'YTD-ACTIVE-ACCOUNT-HEADER-RENDERER' ||
                        node.tagName === 'YTD-COMPACT-LINK-RENDERER' ||
                        node.querySelector?.('ytd-multi-page-menu-renderer')) {
                        setTimeout(() => this._tryInject(), 50);
                    }
                }
                // Check for menu closing — restore native state
                for (const node of mutation.removedNodes) {
                    if (node.nodeType !== 1) continue;
                    if (node.tagName === 'TP-YT-IRON-DROPDOWN' ||
                        node.dataset?.yppRedesigned) {
                        // Menu closed naturally — reset flag for next open
                        this._injected = false;
                    }
                }
            }
        });
        
        this._menuObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    _tryInject() {
        if (this._injected) return;
        
        const menu = document.querySelector(
            'tp-yt-iron-dropdown ytd-multi-page-menu-renderer,' +
            'ytd-popup-container ytd-multi-page-menu-renderer'
        );
        if (!menu) return;
        
        // Verify it's the account menu specifically
        const hasAccount = menu.querySelector(
            'ytd-active-account-header-renderer,' +
            '#account-name,' +
            'ytd-account-item-section-renderer'
        );
        if (!hasAccount) return;
        
        this._injected = true;
        menu.dataset.yppRedesigned = '1';
        this._inject(menu);
    }

    _inject(menu) {
        // Hide all native content
        Array.from(menu.children).forEach(child => {
            child.style.display = 'none';
        });
        
        // Get account data from the native menu before hiding it
        const accountData = this._extractAccountData(menu);
        
        // Build our panel
        const panel = document.createElement('div');
        panel.className = 'ypp-account-menu';
        panel.innerHTML = this._buildMenuHTML(accountData);
        
        menu.appendChild(panel);
        
        // Wire up interactions
        this._wireEvents(panel, accountData);
        
        // Animate in
        requestAnimationFrame(() => {
            panel.style.opacity = '1';
            panel.style.transform = 'translateY(0)';
        });
    }

    _extractAccountData(menu) {
        const accounts = [];
        menu.querySelectorAll(
            'ytd-account-item-renderer, ' +
            'yt-decorated-badge-renderer'
        ).forEach(item => {
            const name = item.querySelector(
                '#account-name, .ytd-account-item-renderer'
            )?.textContent?.trim();
            const handle = item.querySelector(
                '#account-email, #channel-handle'
            )?.textContent?.trim();
            const avatar = item.querySelector('img')?.src;
            const isActive = !!item.querySelector(
                '.ytp-menuitem-checked, [aria-checked="true"], yt-icon[icon="checked"]'
            );
            if (name) accounts.push({ name, handle, avatar, isActive });
        });
        return { accounts };
    }

    async _loadAvatarSafe(imgElement, url) {
        if (!url) return;
        try {
            // Try direct first (works sometimes)
            imgElement.src = url;
            imgElement.onerror = () => {
                // Fallback: show initial letter
                imgElement.style.display = 'none';
                const placeholder = imgElement
                    .nextElementSibling 
                    || imgElement.parentElement
                        .querySelector('.ypp-avatar-placeholder');
                if (placeholder) placeholder.style.display = 'flex';
            };
        } catch(e) {
            imgElement.style.display = 'none';
        }
    }

    _avatarHTML(acc, size = 56) {
        const initial = (acc.name || 'A')[0].toUpperCase();
        return `
            <div class="ypp-avatar-wrap" 
                 style="width:${size}px;height:${size}px">
                ${acc.avatar 
                    ? `<img class="ypp-avatar-img" 
                           src="${acc.avatar}"
                           referrerpolicy="no-referrer"
                           crossorigin="anonymous"
                           style="width:${size}px;height:${size}px;
                                  border-radius:50%;object-fit:cover"
                           onerror="this.style.display='none';
                               this.nextElementSibling.style.display='flex'">`
                    : ''
                }
                <div class="ypp-avatar-placeholder" 
                     style="display:${acc.avatar ? 'none' : 'flex'};
                            width:${size}px;height:${size}px;
                            border-radius:50%;background:rgba(255,255,255,0.1);
                            align-items:center;justify-content:center;
                            font-size:${Math.floor(size/2.5)}px;
                            color:white;font-weight:500">
                    ${initial}
                </div>
            </div>
        `;
    }

    _buildMenuHTML(data) {
        const { accounts } = data;
        const activeAccount = accounts.find(a => a.isActive) || accounts[0];
        
        return `
        <div class="ypp-menu-header">
            <div class="ypp-active-avatar">
                ${this._avatarHTML(activeAccount || {}, 56)}
            </div>
            <div class="ypp-active-info">
                <span class="ypp-active-name">
                    ${activeAccount?.name || 'Account'}
                </span>
                <span class="ypp-active-handle">
                    ${activeAccount?.handle || ''}
                </span>
            </div>
            <a class="ypp-channel-link" 
               href="/channel" 
               id="ypp-view-channel">
                View channel →
            </a>
        </div>
    
        <!-- Account Disk Switcher -->
        ${accounts.length > 1 ? `
        <div class="ypp-account-switcher">
            <div class="ypp-disk-label">Switch account</div>
            <div class="ypp-disk-track">
                <button class="ypp-disk-arrow ypp-disk-prev">‹</button>
                <div class="ypp-disk-carousel">
                    ${accounts.map((acc, i) => `
                    <div class="ypp-disk-item ${acc.isActive 
                        ? 'active' : ''}" 
                        data-index="${i}"
                        data-account-index="${i}">
                        <div class="ypp-disk-avatar-wrap">
                            ${this._avatarHTML(acc, 44)}
                            ${acc.isActive 
                                ? '<div class="ypp-disk-active-ring"></div>' 
                                : ''
                            }
                        </div>
                        <span class="ypp-disk-name">
                            ${acc.name.split(' ')[0]}
                        </span>
                    </div>`).join('')}
                </div>
                <button class="ypp-disk-arrow ypp-disk-next">›</button>
            </div>
        </div>` : ''}
    
        <!-- Main Actions -->
        <div class="ypp-menu-actions">
            <button class="ypp-menu-item" id="ypp-appearance">
                <svg viewBox="0 0 24 24" width="18" height="18" 
                    fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="4"/>
                    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41
                        M17.66 17.66l1.41 1.41M2 12h2M20 12h2
                        M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
                </svg>
                Appearance
            </button>
            
            <button class="ypp-menu-item" id="ypp-settings">
                <svg viewBox="0 0 24 24" width="18" height="18" 
                    fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 
                        2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 
                        0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 
                        1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 
                        0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06
                        A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-1.51-1H3
                        a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 4.6"/>
                </svg>
                Settings
            </button>
    
            <!-- More options collapsed -->
            <button class="ypp-menu-item ypp-more-toggle" 
                id="ypp-more-toggle">
                <svg viewBox="0 0 24 24" width="18" height="18" 
                    fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="5" r="1" fill="currentColor"/>
                    <circle cx="12" cy="12" r="1" fill="currentColor"/>
                    <circle cx="12" cy="19" r="1" fill="currentColor"/>
                </svg>
                More options
                <svg class="ypp-chevron" viewBox="0 0 24 24" 
                    width="14" height="14" fill="none" 
                    stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"/>
                </svg>
            </button>
    
            <!-- Hidden items -->
            <div class="ypp-more-items" id="ypp-more-items">
                <a class="ypp-menu-item ypp-more-item" 
                    href="https://studio.youtube.com">
                    YouTube Studio
                </a>
                <a class="ypp-menu-item ypp-more-item" 
                    href="/paid_memberships">
                    Purchases
                </a>
                <a class="ypp-menu-item ypp-more-item" 
                    href="/account">
                    Your data
                </a>
                <a class="ypp-menu-item ypp-more-item" 
                    href="https://myaccount.google.com">
                    Google Account
                </a>
            </div>
        </div>
    
        <!-- Sign out — bottom, separated, with confirmation -->
        <div class="ypp-menu-footer">
            <button class="ypp-menu-item ypp-signout" 
                id="ypp-signout">
                <svg viewBox="0 0 24 24" width="18" height="18" 
                    fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Sign out
            </button>
        </div>
    
        <!-- Sign out confirmation overlay -->
        <div class="ypp-signout-confirm" id="ypp-signout-confirm">
            <div class="ypp-confirm-box">
                <p>Sign out of YouTube?</p>
                <div class="ypp-confirm-actions">
                    <button id="ypp-confirm-cancel">Cancel</button>
                    <button id="ypp-confirm-ok" class="danger">
                        Sign out
                    </button>
                </div>
            </div>
        </div>
        `;
    }

    _wireEvents(panel, data) {
        // View channel
        panel.querySelector('#ypp-view-channel')
            ?.addEventListener('click', () => {
                this._closeMenu();
            });
    
        // Appearance — open YouTube's native appearance dialog
        panel.querySelector('#ypp-appearance')
            ?.addEventListener('click', () => {
                this._closeMenu();
                // Click YouTube's native appearance button
                document.querySelector(
                    'ytd-toggle-theme-compact-link-renderer button,' +
                    '[aria-label*="Appearance"]'
                )?.click();
            });
    
        // Settings
        panel.querySelector('#ypp-settings')
            ?.addEventListener('click', () => {
                this._closeMenu();
                window.location.href = '/account';
            });
    
        // More toggle
        const moreToggle = panel.querySelector('#ypp-more-toggle');
        const moreItems = panel.querySelector('#ypp-more-items');
        moreToggle?.addEventListener('click', () => {
            const isOpen = moreItems.classList.toggle('open');
            const chevron = panel.querySelector('.ypp-chevron');
            if (chevron) {
                chevron.style.transform = isOpen ? 'rotate(180deg)' : '';
            }
        });
    
        // Sign out with confirmation
        panel.querySelector('#ypp-signout')
            ?.addEventListener('click', () => {
                panel.querySelector('#ypp-signout-confirm')
                    .style.display = 'flex';
            });
    
        panel.querySelector('#ypp-confirm-cancel')
            ?.addEventListener('click', () => {
                panel.querySelector('#ypp-signout-confirm')
                    .style.display = 'none';
            });
    
        panel.querySelector('#ypp-confirm-ok')
            ?.addEventListener('click', () => {
                // Use YouTube's native sign out
                const nativeSignOut = document.querySelector(
                    'a[href*="logout"], a[href*="signout"]'
                );
                if (nativeSignOut) {
                    nativeSignOut.click();
                } else {
                    window.location.href = 
                        'https://www.youtube.com/logout';
                }
            });
    
        // Account disk switcher
        this._initDiskSwitcher(panel, data);
    }
    
    _initDiskSwitcher(panel, data) {
        const carousel = panel.querySelector('.ypp-disk-carousel');
        if (!carousel) return;
    
        let currentIndex = data.accounts.findIndex(a => a.isActive) || 0;
        if (currentIndex < 0) currentIndex = 0;
        
        const updateActive = (newIndex) => {
            const items = carousel.querySelectorAll('.ypp-disk-item');
            items.forEach((item, i) => {
                item.classList.toggle('active', i === newIndex);
                // Scale effect — active is larger
                item.style.transform = i === newIndex 
                    ? 'scale(1.2)' : 'scale(0.85)';
                item.style.opacity = i === newIndex ? '1' : '0.5';
            });
            currentIndex = newIndex;
        };
    
        // Click on disk item to select account
        carousel.querySelectorAll('.ypp-disk-item')
            .forEach((item, i) => {
                item.addEventListener('click', () => {
                    if (i === currentIndex) return;
                    updateActive(i);
                    // Switch account via YouTube's native switcher
                    setTimeout(() => {
                        const nativeItems = document.querySelectorAll(
                            'ytd-account-item-renderer'
                        );
                        if (nativeItems[i]) nativeItems[i].click();
                    }, 300);
                });
            });
    
        // Arrow navigation
        panel.querySelector('.ypp-disk-prev')
            ?.addEventListener('click', () => {
                const items = carousel.querySelectorAll('.ypp-disk-item');
                if (!items.length) return;
                const newIndex = (currentIndex - 1 + items.length) 
                    % items.length;
                updateActive(newIndex);
            });
    
        panel.querySelector('.ypp-disk-next')
            ?.addEventListener('click', () => {
                const items = carousel.querySelectorAll('.ypp-disk-item');
                if (!items.length) return;
                const newIndex = (currentIndex + 1) % items.length;
                updateActive(newIndex);
            });
    
        // Initialize active state
        updateActive(currentIndex);
    }
    
    _closeMenu() {
        // Click backdrop to close YouTube's dropdown
        document.querySelector('tp-yt-iron-overlay-backdrop')?.click();
    }
    
    _cleanup() {
        document.querySelectorAll('[data-ypp-redesigned]')
            .forEach(el => {
                delete el.dataset.yppRedesigned;
                el.querySelector('.ypp-account-menu')?.remove();
                Array.from(el.children).forEach(child => {
                    if (!child.classList.contains('ypp-account-menu')) {
                        child.style.display = '';
                    }
                });
            });
    }

    async disable() {
        await super.disable();
        if (this._clickHandler) {
            document.removeEventListener('click', this._clickHandler);
            this._clickHandler = null;
        }
        this._menuObserver?.disconnect();
        this._injected = false;
        this._cleanup();
    }
};
