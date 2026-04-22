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

        console.log('[YPP DEBUG] Injecting into menu');
        console.log('[YPP DEBUG] Menu children:', 
            [...menu.children].map(c => c.tagName + '#' + c.id)
        );
        console.log('[YPP DEBUG] All IDs in menu:', 
            [...menu.querySelectorAll('[id]')]
                .map(el => el.id + '=' + 
                    el.textContent?.trim()?.substring(0,20))
                .filter(Boolean)
                .join(' | ')
        );

        menu.dataset.yppRedesigned = '1';
        this._inject(menu);
    }

    _inject(menu) {
        // TEMPORARY DEBUG — remove after fixing
        console.log('[YPP] Menu sections:', 
            [...menu.querySelectorAll('#sections > *')]
            .map(el => el.tagName + ' ' + el.id)
        );
        console.log('[YPP] All renderers:', 
            [...menu.querySelectorAll('[id]')]
            .map(el => el.id + ':' + el.textContent?.trim()?.substring(0,30))
            .filter(s => s.trim())
        );

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
        // These selectors are confirmed working from DOM diagnostic
        const name = menu.querySelector('#account-name')
            ?.textContent?.trim() || 'Account';
        
        const channelLink = menu.querySelector('#manage-account');
        const channelHref = channelLink?.href || '/';
        
        // Avatar: only Image 0 had a real src — yt3.ggpht.com domain
        // All other images were empty (our injected placeholders)
        let avatarUrl = null;
        const images = menu.querySelectorAll('img');
        for (const img of images) {
            if (img.src && img.src.includes('yt3.ggpht.com')) {
                avatarUrl = img.src;
                break;
            }
        }

        const accounts = [];
        // Try to find account section items using a wider search
        const possibleAccountContainers = [
            ...menu.querySelectorAll('ytd-account-item-section-renderer ytd-compact-link-renderer'),
            ...menu.querySelectorAll('ytd-account-item-renderer'),
            ...menu.querySelectorAll('ytd-multi-page-menu-renderer #sections ytd-compact-link-renderer')
        ];

        possibleAccountContainers.forEach((node, i) => {
            const nodeName =
                node.querySelector('#label, #title, .title, [class*="label"], span')?.textContent?.trim() ||
                node.textContent?.trim()?.substring(0, 40);
                
            const nodeAvatar = node.querySelector('img')?.src;
            
            // Only add if it has a name, is not the active account name, and isn't a duplicate
            if (nodeName && nodeName !== name && !accounts.some(a => a.name === nodeName)) {
                accounts.push({
                    name: nodeName,
                    avatar: nodeAvatar,
                    isActive: false,
                    index: accounts.length + 1,
                    element: node
                });
            }
        });

        // Always include current account as first entry
        const currentAccount = {
            name,
            avatar: avatarUrl,
            isActive: true
        };
        
        // Only add switcher accounts if found and different from current
        const allAccounts = accounts.length > 0 
            ? accounts 
            : [currentAccount];

        return { 
            name, 
            avatarUrl, 
            channelHref, 
            accounts: allAccounts,
            currentAccount 
        };
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
        const name = acc.name?.trim() || 'A';
        // Correctly handle emojis and surrogate pair characters like 𝔑
        const initial = Array.from(name)[0].toUpperCase();
        
        // Generate consistent color using codePointAt to handle surrogates correctly
        const hue = ((name.codePointAt(0) * 37) % 360) || 0;
        const bgColor = `hsl(${hue}, 55%, 32%)`;
        
        return `
            <div class="ypp-avatar-wrap" 
                 style="width:${size}px;height:${size}px">
                <div class="ypp-avatar-fallback" 
                     style="display:flex;
                            width:${size}px;height:${size}px;
                            border-radius:50%;background:${bgColor};
                            align-items:center;justify-content:center;
                            font-size:${Math.floor(size/2.2)}px;
                            color:white;font-weight:600;
                            border:2px solid rgba(255,255,255,0.2);
                            font-family:Roboto,sans-serif;
                            position:relative;z-index:2">
                    ${initial}
                </div>
            </div>
        `;
    }

    _buildMenuHTML(data) {
        const { accounts } = data;
        const activeAccount = accounts.find(a => a.isActive) || accounts[0];
        const satellites = accounts.filter(a => !a.isActive);
        
        let orbitalHTML = '';
        if (satellites.length > 0) {
            const minRadius = 72;
            const dynamicRadius = (satellites.length * 48) / (2 * Math.PI);
            const radius = Math.max(minRadius, dynamicRadius); // Distance from center
            const containerSize = Math.max(220, (radius + 22) * 2 + 10);
            
            const satelliteHTML = satellites.map((acc, i) => {
                // start at top (-pi/2)
                const angle = (i / satellites.length) * 2 * Math.PI - Math.PI / 2;
                const dx = Math.cos(angle) * radius;
                const dy = Math.sin(angle) * radius;
                return `
                    <div class="ypp-disk-item ypp-orbital-satellite" 
                         style="--dx: ${dx}px; --dy: ${dy}px;"
                         title="${acc.name || 'Account'}"
                         data-name="${acc.name || ''}">
                        ${this._avatarHTML(acc, 44)}
                    </div>
                `;
            }).join('');
            
            orbitalHTML = `
                <div class="ypp-orbital-container" style="width: ${containerSize}px; height: ${containerSize}px;">
                    ${satelliteHTML}
                    <div class="ypp-disk-item active ypp-orbital-center" title="${activeAccount?.name || 'Account'}">
                        <div class="ypp-disk-avatar-wrap" style="width: 72px; height: 72px;">
                            ${this._avatarHTML(activeAccount || {}, 72)}
                            <div class="ypp-disk-active-ring" style="inset: -4px;"></div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            orbitalHTML = `
                <div class="ypp-orbital-container" style="height: auto; margin-bottom: 0;">
                    <div class="ypp-disk-item active" style="margin: 0 auto; cursor: default;">
                        <div class="ypp-disk-avatar-wrap" style="width: 72px; height: 72px;">
                            ${this._avatarHTML(activeAccount || {}, 72)}
                            <div class="ypp-disk-active-ring" style="inset: -4px;"></div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        return `
        <div class="ypp-menu-header ypp-orbital-header">
            ${orbitalHTML}
            <div class="ypp-active-info" style="text-align: center; margin-top: ${satellites.length ? '16px' : '20px'};">
                <div class="ypp-active-name" style="font-size: 16px; font-weight: 500; color: white;">
                    ${activeAccount?.name || 'Account'}
                </div>
                <div class="ypp-active-handle" style="font-size: 13px; color: rgba(255,255,255,0.5); margin-top: 2px;">
                    ${activeAccount?.handle || ''}
                </div>
                <a class="ypp-channel-link" href="/channel" id="ypp-view-channel" style="display: inline-block; margin-top: 8px;">
                    View your channel
                </a>
            </div>
        </div>
    
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
        // Satellite accounts interaction
        const satellites = panel.querySelectorAll('.ypp-orbital-satellite');
        satellites.forEach((sat) => {
            sat.addEventListener('click', (e) => {
                const name = sat.dataset.name;
                const accountObj = data.accounts.find(a => a.name === name);
                
                if (accountObj && accountObj.element) {
                    this._closeMenu();
                    const trigger = accountObj.element.querySelector('a, tp-yt-paper-item, #endpoint, yt-formatted-string');
                    if (trigger) trigger.click();
                    else accountObj.element.click();
                } else {
                    // Try to click native switch account button to open submenu
                    const switchBtn = document.querySelector('ytd-compact-link-renderer:has([aria-label*="Switch account"])');
                    if (switchBtn) {
                        switchBtn.click();
                        setTimeout(() => this._closeMenu(), 100);
                    }
                }
            });
        });
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
