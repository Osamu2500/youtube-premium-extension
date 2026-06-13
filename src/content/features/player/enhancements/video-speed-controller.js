// f:\Youtube 2.0\src\content\features\player\enhancements\video-speed-controller.js
import './video-speed-controller.css';
import { VideoSpeedHotkeys } from './video-speed-hotkeys.js';

window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.VideoSpeedController = class VideoSpeedController extends window.YPP.features.BaseFeature {
    constructor() {
        super('VideoSpeedController');
        this.controllers = new WeakMap();
        this.markers = new WeakMap();
        this._mutationObserver = null;
        this._lastActiveVideo = null;
        this._boundHandleKeyDown = this.handleKeyDown.bind(this);
        this.hotkeyManager = new VideoSpeedHotkeys(this);
    }

    getConfigKey() {
        return 'enableCustomSpeed';
    }

    async enable() {
        if (!this.settings || this.settings.enableCustomSpeed === false) return;
        
        this.utils?.log('Enabling Global Video Speed Controller', 'VSC');
        
        // Scan for existing videos
        const selector = this.settings?.vscAudioSupport ? 'video, audio' : 'video';
        document.querySelectorAll(selector).forEach(video => this.attachToVideo(video));

        // Start observing for new videos
        this._mutationObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.tagName === 'VIDEO' || (this.settings?.vscAudioSupport && node.tagName === 'AUDIO')) {
                            this.attachToVideo(node);
                        } else {
                            node.querySelectorAll(selector).forEach(video => this.attachToVideo(video));
                        }
                    }
                }
            }
        });

        this._mutationObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Global keyboard shortcuts
        document.addEventListener('keydown', this._boundHandleKeyDown, true);

        // Cross-tab sync listener
        if (this.settings?.vscRememberSpeed !== false) {
            this._storageListener = (changes, area) => {
                if (area === 'local' && changes.ypp_settings && changes.ypp_settings.newValue) {
                    const newSpeed = changes.ypp_settings.newValue.vscLastSpeed;
                    if (newSpeed && Math.abs(newSpeed - this.settings.vscLastSpeed) > 0.01) {
                        this.settings.vscLastSpeed = newSpeed;
                        const selector = this.settings?.vscAudioSupport ? 'video, audio' : 'video';
                        document.querySelectorAll(selector).forEach(video => {
                            if (Math.abs(video.playbackRate - newSpeed) > 0.01) {
                                video.playbackRate = newSpeed;
                                const state = this.controllers.get(video);
                                if (state) state.display.textContent = newSpeed.toFixed(2);
                            }
                        });
                    }
                }
            };
            chrome.storage.onChanged.addListener(this._storageListener);
        }
    }

    async disable() {
        if (this._mutationObserver) {
            this._mutationObserver.disconnect();
            this._mutationObserver = null;
        }

        if (this._storageListener) {
            chrome.storage.onChanged.removeListener(this._storageListener);
            this._storageListener = null;
        }

        document.removeEventListener('keydown', this._boundHandleKeyDown, true);

        const selector = this.settings?.vscAudioSupport ? 'video, audio' : 'video';
        document.querySelectorAll(selector).forEach(video => {
            const state = this.controllers.get(video);
            if (state && state.cleanup) state.cleanup();
        });
        document.querySelectorAll('ypp-vsc-controller').forEach(c => c.remove());
        this.controllers = new WeakMap();
    }

    onUpdate() {
        // Nothing needed here for now
    }

    attachToVideo(video) {
        if (this.controllers.has(video)) return;
        if (!video.isConnected) return;
        if (video.hasAttribute('data-ypp-vsc-attached')) return;
        video.setAttribute('data-ypp-vsc-attached', 'true');

        this.utils?.log('Attaching VSC to video', 'VSC');

        const controller = document.createElement('ypp-vsc-controller');
        
        // Inject CSS natively into the document head
        const styleId = 'ypp-vsc-style';
        if (!document.getElementById(styleId)) {
            const link = document.createElement('link');
            link.id = styleId;
            link.rel = 'stylesheet';
            link.href = chrome.runtime.getURL('src/content/features/player/enhancements/video-speed-controller.css');
            document.head.appendChild(link);
        }

        // UI Container
        const container = document.createElement('div');
        container.className = 'ypp-vsc-panel';
        
        // Elements
        const display = document.createElement('span');
        display.className = 'ypp-vsc-speed-display'; // Fix class name to match CSS!
        display.textContent = '1.00';

        const ICONS = {
            rewind: `<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/></svg>`,
            slower: `<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M19 13H5v-2h14v2z"/></svg>`,
            faster: `<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>`,
            advance: `<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/></svg>`,
            close: `<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>`
        };

        const formatKey = (key) => key ? key.replace('Shift+', '⇧') : '';
        const step = this.settings?.vscSpeedStep ?? 0.25;

        const getShortcutKey = (action) => {
            const sc = (this.settings?.vscShortcuts || []).find(s => s.action === action);
            return sc ? sc.key : '';
        };

        const btnRewind = this.createButton(ICONS.rewind, `Rewind 10s (${formatKey(getShortcutKey('rewind'))})`, () => { video.currentTime -= 10; });
        const btnSlower = this.createButton(ICONS.slower, `Slower -${step}x (${formatKey(getShortcutKey('decrease'))})`, () => this.adjustSpeed(video, -step));
        const btnFaster = this.createButton(ICONS.faster, `Faster +${step}x (${formatKey(getShortcutKey('increase'))})`, () => this.adjustSpeed(video, step));
        const btnAdvance = this.createButton(ICONS.advance, `Advance 10s (${formatKey(getShortcutKey('advance'))})`, () => { video.currentTime += 10; });
        const btnClose = this.createButton(ICONS.close, `Hide Controller (${formatKey(getShortcutKey('showHide'))})`, () => { controller.style.display = 'none'; });
        btnClose.classList.add('ypp-vsc-close');

        // Assemble
        container.appendChild(display);
        container.appendChild(btnRewind);
        container.appendChild(btnSlower);
        container.appendChild(btnFaster);
        container.appendChild(btnAdvance);
        container.appendChild(btnClose);
        
        // Apply Opacity
        const opacity = this.settings?.vscControllerOpacity ?? 0.3;
        container.style.opacity = opacity;
        // Increase opacity on hover
        container.addEventListener('mouseenter', () => container.style.opacity = '1');
        container.addEventListener('mouseleave', () => container.style.opacity = opacity);

        controller.appendChild(container);

        // Generate unique class name for this video's controller (instead of anchorName)
        const controllerClass = `ypp-vsc-${Math.random().toString(36).substr(2, 9)}`;
        controller.classList.add(controllerClass);
        
        // Ensure absolute positioning
        controller.style.position = 'absolute';
        controller.style.zIndex = '9999999';

        // Append to parent element so it naturally flows with fullscreen video
        const parent = video.parentElement || document.body;
        parent.insertBefore(controller, video.nextSibling || video);
        
        // Position Calculation Logic (from folder 4's battle-tested approach)
        let currentOffsetX = 12;
        let currentOffsetY = 12;

        const applyPosition = () => {
            if (!video.isConnected || !controller.isConnected) return;
            const t = video.getBoundingClientRect();
            
            if (t.width === 0 && t.height === 0) {
                // Audio element with no dimensions
                controller.style.position = 'fixed';
                controller.style.top = `${Math.max(currentOffsetY, 12)}px`;
                controller.style.left = `${Math.max(currentOffsetX, 12)}px`;
                controller.style.right = 'auto';
                controller.style.bottom = 'auto';
                return;
            }

            const o = controller.offsetParent?.getBoundingClientRect();
            
            const topOffset = Math.max(t.top - (o?.top || 0), 0) + currentOffsetY;
            const leftOffset = Math.max(t.left - (o?.left || 0), 0) + currentOffsetX;
            
            controller.style.position = 'absolute';
            controller.style.top = `${topOffset}px`;
            controller.style.left = `${leftOffset}px`;
            controller.style.right = 'auto';
            controller.style.bottom = 'auto';
        };

        // Initial position
        applyPosition();

        // Listen for layout changes
        const resizeObserver = new ResizeObserver(() => applyPosition());
        resizeObserver.observe(video);
        if (controller.offsetParent) {
            resizeObserver.observe(controller.offsetParent);
        }
        
        // Handle window resizes and scrolls
        window.addEventListener('resize', applyPosition, { passive: true });
        
        // Dragging Logic
        let isDragging = false;
        let startX, startY;

        const applyPositionDragged = () => {
            applyPosition();
        };

        display.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            e.preventDefault(); // prevent text selection
        });

        const onMouseMove = (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
            currentOffsetX += dx;
            currentOffsetY += dy;
            
            startX = e.clientX;
            startY = e.clientY;
            
            applyPosition();
        };

        const onMouseUp = () => {
            isDragging = false;
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);

        // Store state
        this.controllers.set(video, {
            element: controller,
            display: display,
            manualHide: false,
            hideTimeout: null,
            fightbackCount: 0,
            fightbackTimer: null,
            lastInteraction: 0,
            cleanup: () => {
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);
            }
        });

        // Initialize speed from memory
        const savedSpeed = (this.settings.vscRememberSpeed !== false && this.settings.vscLastSpeed) ? this.settings.vscLastSpeed : 1.0;
        if (savedSpeed !== 1.0) {
            this.setSpeed(video, savedSpeed);
        }

        // Event Listeners for UI state
        video.addEventListener('ratechange', (e) => this.handleRateChange(video, e));

        const triggerShow = () => {
            if (this.settings?.vscHideController) return;
            this.showController(video);
            this.hideControllerDelay(video);
        };

        // UI auto-hide logic for external websites
        video.addEventListener('play', () => {
            this._lastActiveVideo = video;
            triggerShow();
        });
        video.addEventListener('pause', triggerShow);
        
        // Listen to document for mouse events because video players often have complex overlays
        // In iframes, moving the mouse anywhere should reveal the controls.
        const doc = video.ownerDocument;
        if (doc) {
            doc.addEventListener('mousemove', triggerShow);
            doc.addEventListener('click', () => { 
                this._lastActiveVideo = video; 
                triggerShow();
            });
        }
        
        // Also listen to the controller itself so it doesn't hide while hovered
        controller.addEventListener('mouseenter', () => {
            this.showController(video);
            if (this.controllers.has(video)) {
                const state = this.controllers.get(video);
                if (state.hideTimeout) {
                    clearTimeout(state.hideTimeout);
                    state.hideTimeout = null;
                }
            }
        });
        controller.addEventListener('mouseleave', () => this.hideControllerDelay(video));

        if (this.settings?.vscHideController) {
            controller.style.display = 'none';
            controller.classList.add('ypp-vsc-hidden');
        } else {
            this.hideControllerDelay(video);
        }
    }

    createButton(html, title, onClick) {
        const btn = document.createElement('button');
        btn.className = 'ypp-vsc-btn';
        btn.innerHTML = html;
        btn.title = title;
        btn.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            onClick();
        });
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
        };
        btn.onmousedown = (e) => e.stopPropagation();
        return btn;
    }

    handleRateChange(video, e) {
        const state = this.controllers.get(video);
        if (!state) return;

        const actualSpeed = video.playbackRate;
        const targetSpeed = this.settings.vscLastSpeed || 1.0;

        if (Math.abs(actualSpeed - targetSpeed) < 0.01) {
            state.display.textContent = actualSpeed.toFixed(2);
            return;
        }

        if (e.detail && e.detail.origin === 'videoSpeed') return;

        if (state.blockNativeUpdatesUntil && Date.now() < state.blockNativeUpdatesUntil) {
            video.playbackRate = targetSpeed;
            e.stopImmediatePropagation();
            return;
        }

        const timeSinceUser = Date.now() - state.lastInteraction;
        if (timeSinceUser < 300) {
            // User did this (via native UI)
            this._debouncedSaveSpeed(actualSpeed);
            this.settings.vscLastSpeed = actualSpeed;
            state.display.textContent = actualSpeed.toFixed(2);
            return;
        }
        
        // If force speed is enabled, the page script blocks this natively.
        // If we reach here, it means force speed is OFF, or the user interacted.
        if (!this.settings?.vscForceSpeed) {
            state.display.textContent = actualSpeed.toFixed(2);
        }
    }

    showController(video) {
        const state = this.controllers.get(video);
        if (!state) return;

        if (state.hideTimeout) {
            clearTimeout(state.hideTimeout);
            state.hideTimeout = null;
        }

        state.element.classList.remove('ypp-vsc-hidden');
        state.element.style.display = ''; // Reset display in case it was closed
    }

    hideControllerDelay(video) {
        // If inside a YouTube player, let native .ytp-autohide handle it
        if (video.closest('.html5-video-player')) return;

        const state = this.controllers.get(video);
        if (!state) return;

        if (state.hideTimeout) clearTimeout(state.hideTimeout);
        state.hideTimeout = setTimeout(() => {
            state.element.classList.add('ypp-vsc-hidden');
        }, 2500);
    }

    setSpeed(video, speed) {
        const state = this.controllers.get(video);
        if (!state) return;

        speed = Math.max(0.1, Math.min(speed, 16.0));
        video.playbackRate = speed;
        
        this.settings.vscLastSpeed = speed;
        this._debouncedSaveSpeed(speed);
        
        if (this.settings?.vscForceSpeed) {
            window.dispatchEvent(new CustomEvent('ypp-vsc-force-speed', {
                detail: { enabled: true, speed: speed }
            }));
        }
        
        state.display.textContent = speed.toFixed(2);
        this.showController(video);
        this.hideControllerDelay(video);

        // Block native speed changes from overriding our explicit set command for the next 500ms
        state.blockNativeUpdatesUntil = Date.now() + 500;

        video.dispatchEvent(new CustomEvent('ratechange', {
            bubbles: true,
            composed: true,
            detail: { origin: 'videoSpeed', speed: speed }
        }));
    }

    adjustSpeed(video, delta) {
        let current = video.playbackRate;
        let newSpeed = Math.round((current + delta) * 100) / 100;
        this.setSpeed(video, newSpeed);
    }

    _debouncedSaveSpeed(speed) {
        if (this._saveSpeedTimeout) clearTimeout(this._saveSpeedTimeout);
        this._saveSpeedTimeout = setTimeout(() => {
            if (this.settings?.vscRememberSpeed !== false && window.YPP.Utils?.saveSettings) {
                window.YPP.Utils.saveSettings({ vscLastSpeed: speed });
            }
        }, 500);
    }

    handleKeyDown(e) {
        // Ignore if typing in an input
        const target = e.target;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

        // Use the last active video, or find the largest video on screen
        let video = this._lastActiveVideo;
        if (!video || !video.isConnected) {
            video = this.findLargestVideo();
        }

        if (!video) return;
        
        // Ensure the video is attached so state is available
        if (!this.controllers.has(video)) {
            this.attachToVideo(video);
        }

        const state = this.controllers.get(video);
        if (state) state.lastInteraction = Date.now();

        const step = this.settings?.vscSpeedStep ?? 0.25;
        const preferred = this.settings?.vscPreferredSpeed ?? 2.0;
        
        const shortcuts = this.settings?.vscShortcuts || [];
        
        const handled = this.hotkeyManager.handleKeyDown(e, video, state, shortcuts);

        if (handled) {
            this.showController(video);
            this.hideControllerDelay(video);
        }
    }

    findLargestVideo() {
        let largest = null;
        let maxArea = 0;
        const selector = this.settings?.vscAudioSupport ? 'video, audio' : 'video';
        document.querySelectorAll(selector).forEach(video => {
            const rect = video.getBoundingClientRect();
            const area = rect.width * rect.height;
            if (area > maxArea) {
                maxArea = area;
                largest = video;
            }
        });
        return largest;
    }
};
