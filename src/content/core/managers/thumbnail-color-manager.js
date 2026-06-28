export class ThumbnailColorManager {
    constructor() {
        this.cache = new Map();
        this.canvas = document.createElement('canvas');
        this.canvas.width = 10;
        this.canvas.height = 10;
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        this.enabled = false;
        this.activeStyle = '';
        this.activeWaitObservers = new Set();

        this.observer = new IntersectionObserver((entries) => {
            if (!this.enabled) return;
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.processElement(entry.target);
                }
            });
        }, {
            rootMargin: '300px' // Pre-load slightly offscreen
        });

        this.mutationObserver = new MutationObserver((mutations) => {
            if (!this.enabled) return;
            for (let mut of mutations) {
                for (let node of mut.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        this.observeNewNodes(node);
                    }
                }
            }
        });
    }

    updateSettings(settings) {
        if (!settings) return;
        this.activeStyle = settings.cardStyle || 'default';
        const needsExtraction = [
            'holographic', 
            'polaroid', 
            'glass', 
            'neon', 
            'cyberpunk', 
            'frosted'
        ].includes(this.activeStyle);
        
        if (needsExtraction && !this.enabled) {
            this.start();
        } else if (!needsExtraction && this.enabled) {
            this.stop();
        }
    }

    start() {
        if (this.enabled) return;
        this.enabled = true;
        this.observeNewNodes(document.body);
        this.mutationObserver.observe(document.body, { childList: true, subtree: true });
    }

    stop() {
        this.enabled = false;
        this.observer.disconnect();
        this.mutationObserver.disconnect();
        this.activeWaitObservers.forEach(mo => mo.disconnect());
        this.activeWaitObservers.clear();
        document.querySelectorAll('[data-ypp-thumb-color]').forEach(el => {
            el.style.removeProperty('--ypp-thumb-color');
            el.removeAttribute('data-ypp-thumb-color');
        });
    }

    observeNewNodes(root) {
        if (root.matches && root.matches('ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer')) {
            this.observer.observe(root);
        }
        if (root.querySelectorAll) {
            const nodes = root.querySelectorAll('ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer');
            nodes.forEach(node => this.observer.observe(node));
        }
    }

    getImage(el) {
        let img = el.querySelector('yt-image img, ytd-thumbnail img, yt-lockup-view-model img, .yt-core-image');
        if (!img) {
            const ytImage = el.querySelector('yt-image');
            if (ytImage && ytImage.shadowRoot) {
                img = ytImage.shadowRoot.querySelector('img');
            }
        }
        return img;
    }

    processElement(el) {
        if (el.hasAttribute('data-ypp-thumb-color')) return;

        const img = this.getImage(el);
        const src = img ? img.src : null;
        
        const isReady = src && !src.includes('data:image');

        if (!isReady) {
            if (!el.hasAttribute('data-ypp-color-wait')) {
                el.setAttribute('data-ypp-color-wait', 'true');
                const mo = new MutationObserver(() => {
                    const currentImg = this.getImage(el);
                    const currentSrc = currentImg ? currentImg.src : null;
                    if (currentSrc && !currentSrc.includes('data:image')) {
                        mo.disconnect();
                        this.activeWaitObservers.delete(mo);
                        el.removeAttribute('data-ypp-color-wait');
                        this.processElement(el);
                    }
                });
                this.activeWaitObservers.add(mo);
                // Observe the entire element for both DOM swaps and attribute changes
                mo.observe(el, { 
                    childList: true, 
                    subtree: true, 
                    attributes: true, 
                    attributeFilter: ['src'] 
                });
            }
            return;
        }

        const cleanSrc = src;

        if (this.cache.has(cleanSrc)) {
            const cached = this.cache.get(cleanSrc);
            // Support both old string cache and new object cache during transition
            if (typeof cached === 'string') {
                el.style.setProperty('--ypp-thumb-color', cached);
            } else {
                el.style.setProperty('--ypp-thumb-color', cached.colorStr);
                el.style.setProperty('--ypp-thumb-rgb', cached.rgbStr);
            }
            el.setAttribute('data-ypp-thumb-color', 'true');
            return;
        }

        // The Ultimate Fix: Offload extraction to the Background Service Worker
        // The background script has <all_urls> permission, completely bypassing
        // CORS, Tainted Canvas errors, and URL signature issues. It also frees up
        // the main thread, greatly improving the homepage scrolling performance!
        chrome.runtime.sendMessage({
            action: 'EXTRACT_COLOR',
            url: cleanSrc
        }, (response) => {
            if (chrome.runtime.lastError || !response || !response.success) {
                // Fallback error handler (if background script fails or is asleep)
                const colorStr = 'rgb(40, 40, 40)';
                const rgbStr = '40, 40, 40';
                this.cache.set(cleanSrc, { colorStr, rgbStr });
                if (el.isConnected) {
                    el.style.setProperty('--ypp-thumb-color', colorStr);
                    el.style.setProperty('--ypp-thumb-rgb', rgbStr);
                    el.setAttribute('data-ypp-thumb-color', 'true');
                }
                return;
            }

            const enhanced = this.enhanceColorForGlow(response.r, response.g, response.b);
            const colorStr = `rgb(${enhanced.r}, ${enhanced.g}, ${enhanced.b})`;
            const rgbStr = `${enhanced.r}, ${enhanced.g}, ${enhanced.b}`;

            this.cache.set(cleanSrc, { colorStr, rgbStr });
            
            if (el.isConnected) {
                el.style.setProperty('--ypp-thumb-color', colorStr);
                el.style.setProperty('--ypp-thumb-rgb', rgbStr);
                el.setAttribute('data-ypp-thumb-color', 'true');
            }
        });
    }

    enhanceColorForGlow(r, g, b) {
        // Boost vibrance for a better neon glow effect
        let max = Math.max(r, g, b);
        let min = Math.min(r, g, b);
        
        if (max === 0) return {r:50, g:50, b:50}; // Fallback dark grey
        
        // Push brightness up
        let boost = 255 / max;
        boost = Math.min(boost, 1.4); // Max 40% boost to avoid washing out
        
        return {
            r: Math.min(255, Math.floor(r * boost)),
            g: Math.min(255, Math.floor(g * boost)),
            b: Math.min(255, Math.floor(b * boost))
        };
    }
}

window.YPP = window.YPP || {};
window.YPP.managers = window.YPP.managers || {};
window.YPP.managers.ThumbnailColorManager = ThumbnailColorManager;
