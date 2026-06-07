/**
 * Feature: Context Menu / Quick Action
 * Adds an "Add to Group" button to video cards and channel headers.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.ContextMenu = class ContextMenu extends window.YPP.features.BaseFeature {
    getConfigKey() { return 'contextMenu'; }
    constructor() {
        super('contextMenu');
        this.isActive = false;
        this.observer = window.YPP.sharedObserver || new window.YPP.Utils.DOMObserver();
        this._messageListener = this._handleMessage.bind(this);
    }

    enable(settings) {
        if (this.isActive) return;
        this.isActive = true;
        try {
            this.init();
        } catch (e) {
            this.utils?.log('Error enabling ContextMenu', 'CONTEXTMENU', 'error', e);
        }
    }

    disable() {
        if (!this.isActive) return;
        this.isActive = false;
        chrome.runtime.onMessage.removeListener(this._messageListener);
        this.observer.unregister('context-menu-cards');
        this.observer.unregister('context-menu-header');
        this.observer.stop();
        document.querySelectorAll('.ypp-add-to-group-btn').forEach(btn => btn.remove());
    }

    update(settings) {}
    run(settings) { this.enable(settings); }

    init() {
        this.observer.start();
        chrome.runtime.onMessage.addListener(this._messageListener);

        // Register observer for video cards
        this.observer.register(
            'context-menu-cards',
            'ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer',
            (elements) => {
                if (!this.isActive) return;
                elements.forEach(card => this.injectButton(card));
            }
        );

        // Register observer for channel page header (if applicable)
        this.observer.register(
            'context-menu-header',
            '#inner-header-container #buttons',
            () => {
                if (this.isActive && window.YPP.Utils.isChannelPage()) {
                    this.injectChannelHeaderButton();
                }
            }
        );
    }

    _handleMessage(request, sender, sendResponse) {
        if (request.action === 'SHOW_GROUP_SELECTOR' && request.channelIdentifier && this.isActive) {
            // Since we don't know the exact mouse coordinates from background script,
            // we center it on the screen.
            const x = window.innerWidth / 2 - 75;
            const y = window.innerHeight / 2 - 50;
            this.showGroupSelector(request.channelIdentifier, x, y);
            sendResponse({ success: true });
        }
    }

    injectButton(card) {
        if (card.hasAttribute('data-ypp-processed')) return;
        card.setAttribute('data-ypp-processed', 'true');

        if (card.querySelector('.ypp-add-to-group-btn')) return;

        // Find metadata container to append button
        const meta = card.querySelector('#metadata-line') || card.querySelector('.ytd-video-meta-block');
        if (!meta) return;

        const btn = document.createElement('button');
        btn.className = 'ypp-add-to-group-btn';
        btn.textContent = '+';
        btn.title = 'Add to Group';
        btn.style.cssText = `
            margin-left: 8px;
            background: transparent;
            border: 1px solid currentColor;
            color: var(--yt-spec-text-secondary);
            border-radius: 50%;
            width: 20px;
            height: 20px;
            font-size: 14px;
            line-height: 1;
            cursor: pointer;
            opacity: 0.6;
            transition: opacity 0.2s;
            display: inline-flex;
            align-items: center;
            justify-content: center;
        `;
        
        btn.onmouseenter = () => btn.style.opacity = '1';
        btn.onmouseleave = () => btn.style.opacity = '0.6';

        this.addListener(btn, 'click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.handleCardClick(card, e);
        });

        meta.appendChild(btn);
    }

    injectChannelHeaderButton() {
        // Target specific channel header buttons container
        const container = document.querySelector('#inner-header-container #buttons');
        if (!container || document.getElementById('ypp-channel-add-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'ypp-channel-add-btn';
        btn.className = 'yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m';
        btn.textContent = 'Add to Group';
        btn.style.marginRight = '8px';
        
        this.addListener(btn, 'click', (e) => {
            const nameEl = document.querySelector('#inner-header-container #text');
            const name = nameEl ? nameEl.textContent.trim() : 'Unknown';
            this.showGroupSelector(name, e.clientX, e.clientY);
        });

        container.prepend(btn);
    }

    handleCardClick(card, event) {
        // Extract channel name
        const nameNode = card.querySelector('#text.ytd-channel-name') || card.querySelector('.ytd-channel-name');
        const channelName = nameNode ? nameNode.textContent.trim() : null;
        
        if (channelName) {
            this.showGroupSelector(channelName, event.clientX, event.clientY);
        }
    }

    showGroupSelector(channelName, x, y) {
        // Ensure Subscription UI is initialized to get manager
        // Simple singleton assumption for now, ideally retrieved properly
        // Accessing global manager reference via window.YPP if stored, 
        // OR creating a temporary reference if Manager is stateless enough.
        // But SubscriptionManager is stateful. We rely on FeatureManager having an instance
        // or using chrome.storage directly if needed, but using the instance is better.
        
        // Since we didn't expose SubscriptionManager globally in a clean way, 
        // we'll fetch groups directly from storage for the popup to be robust.
        
        const existing = document.querySelector('.ypp-group-selector-popup');
        if (existing) existing.remove();

        const popup = document.createElement('div');
        popup.className = 'ypp-group-selector-popup';
        popup.style.cssText = `
            position: fixed;
            top: ${y}px;
            left: ${x}px;
            background: rgba(30, 30, 30, 0.95);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(255,255,255,0.1);
            color: #fff;
            border-radius: 12px;
            padding: 8px;
            z-index: 9999;
            box-shadow: 0 12px 32px rgba(0,0,0,0.5);
            min-width: 150px;
        `;

        popup.innerHTML = `<div style="padding:4px 8px; font-weight:bold; font-size:12px; opacity:0.7">Add ${channelName} to...</div>`;

        // Load groups
        chrome.storage.local.get('ypp_subscription_folders').then(res => {
            const groups = res['ypp_subscription_folders'] || {};
            const list = Object.keys(groups);

            if (list.length === 0) {
                 popup.innerHTML += `<div style="padding:8px; font-size:12px">No folders created. Go to Subscriptions to manage folders.</div>`;
            } else {
                list.forEach(group => {
                    const item = document.createElement('div');
                    item.textContent = group;
                    item.style.cssText = `
                        padding: 6px 8px;
                        cursor: pointer;
                        font-size: 13px;
                        border-radius: 4px;
                    `;
                    item.onmouseenter = () => item.style.backgroundColor = 'rgba(255,255,255,0.1)';
                    item.onmouseleave = () => item.style.backgroundColor = 'transparent';
                    
                    item.onclick = async () => {
                        // Quick Add hack: manually update storage since we don't have direct access to manager instance here
                        // In a perfect world, we'd emit an event 'add-to-group' and Manager would handle it.
                        // Let's do that if shared bus exists.
                        
                        // Fallback: Read-Modify-Write
                        const latest = await chrome.storage.local.get('ypp_subscription_folders');
                        const g = latest['ypp_subscription_folders'] || {};
                        if (!g[group]) g[group] = [];
                        
                        const alreadyExists = g[group].includes(channelName);
                        if (!alreadyExists) {
                            g[group].push(channelName);
                            await chrome.storage.local.set({ 'ypp_subscription_folders': g });
                            window.YPP.Utils.createToast(`Added to ${group}`, 'success');
                            // Trigger refresh if needed
                        } else {
                            window.YPP.Utils.createToast(`Already in ${group}`, 'info');
                        }
                        
                        popup.remove();
                    };
                    popup.appendChild(item);
                });
            }
            
            // Close on click outside
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    const closeFn = (e) => {
                        if (!popup.contains(e.target)) {
                            popup.remove();
                            document.removeEventListener('click', closeFn);
                        }
                    };
                    this.addListener(document, 'click', closeFn);
                });
            });
        });

        document.body.appendChild(popup);
    }
};
