export class ThumbnailColorManager {
    constructor() {
        this.cache = new Map();
        this.canvas = document.createElement('canvas');
        this.canvas.width = 10;
        this.canvas.height = 10;
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        this.enabled = false;
        this.activeStyle = '';

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
        const needsExtraction = (this.activeStyle === 'holographic' || this.activeStyle === 'polaroid');
        
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

    processElement(el) {
        if (el.hasAttribute('data-ypp-thumb-color')) return;

        // Only process if the image actually has a source
        const img = el.querySelector('yt-image img, ytd-thumbnail img');
        if (!img) return;

        const src = img.src;
        if (!src || src.includes('data:image')) return;

        // Clean up URL parameters that might cause cache misses
        const cleanSrc = src.split('?')[0];

        if (this.cache.has(cleanSrc)) {
            el.style.setProperty('--ypp-thumb-color', this.cache.get(cleanSrc));
            el.setAttribute('data-ypp-thumb-color', 'true');
            return;
        }

        const tempImg = new Image();
        tempImg.crossOrigin = "Anonymous"; // Crucial for canvas pixel reading
        
        tempImg.onload = () => {
            try {
                this.ctx.clearRect(0, 0, 10, 10);
                this.ctx.drawImage(tempImg, 0, 0, 10, 10);
                
                const data = this.ctx.getImageData(0, 0, 10, 10).data;
                let r = 0, g = 0, b = 0, count = 0;
                
                for (let i = 0; i < data.length; i += 4) {
                    const alpha = data[i + 3];
                    if (alpha < 255) continue; 
                    
                    // Exclude pure black (often letterboxes) and pure white
                    if (data[i] < 15 && data[i+1] < 15 && data[i+2] < 15) continue;
                    if (data[i] > 240 && data[i+1] > 240 && data[i+2] > 240) continue;

                    r += data[i];
                    g += data[i+1];
                    b += data[i+2];
                    count++;
                }

                if (count > 0) {
                    r = Math.floor(r / count);
                    g = Math.floor(g / count);
                    b = Math.floor(b / count);

                    const enhanced = this.enhanceColorForGlow(r, g, b);
                    const colorStr = `rgb(${enhanced.r}, ${enhanced.g}, ${enhanced.b})`;

                    this.cache.set(cleanSrc, colorStr);
                    
                    if (el.isConnected) {
                        el.style.setProperty('--ypp-thumb-color', colorStr);
                        el.setAttribute('data-ypp-thumb-color', 'true');
                    }
                }
            } catch (e) {
                // Ignore CORS tainted canvas errors
            }
        };

        // Fallback error handler
        tempImg.onerror = () => {
            // Some images might strictly reject CORS, skip them silently
        };

        tempImg.src = cleanSrc;
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
