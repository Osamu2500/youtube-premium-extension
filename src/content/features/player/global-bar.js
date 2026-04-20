window.YPP.features.GlobalPlayerBar = class GlobalPlayerBar extends window.YPP.features.BaseFeature {
    constructor() {
        super('GlobalPlayerBar');
        this.activeBars = new Map(); // videoElement -> barElement
        this.observer = null;
        this.isYouTube = window.location.hostname.includes('youtube.com');
        
        // Filter definitions (Copied from Player.js to ensure consistency)
        this.filters = [
            { category: 'Classic', name: 'Normal',        css: 'none',                                                        overlay: null },
            { category: 'Classic', name: 'Sepia',         css: 'sepia(100%)',                                                  overlay: null },
            { category: 'Classic', name: 'Grayscale',     css: 'grayscale(100%)',                                              overlay: null },
            { category: 'Classic', name: 'High Contrast', css: 'contrast(160%) saturate(90%)',                                 overlay: null },
            { category: 'Classic', name: 'Vivid',         css: 'saturate(200%) contrast(110%)',                                overlay: null },
            { category: 'Classic', name: 'Warm',          css: 'sepia(40%) saturate(130%) contrast(100%) brightness(105%)',    overlay: null },
            { category: 'Classic', name: 'Cool',          css: 'hue-rotate(200deg) saturate(130%) brightness(95%)',            overlay: null },
            { category: 'Classic', name: 'Invert',        css: 'invert(100%)',                                                 overlay: null },

            { category: 'Cinematic', name: 'Cinematic',     css: 'contrast(115%) saturate(110%) brightness(95%) hue-rotate(350deg)', overlay: null },
            { category: 'Cinematic', name: 'Noir',          css: 'grayscale(100%) contrast(130%) brightness(85%)',               overlay: null },
            { category: 'Cinematic', name: 'B&W Cinematic', css: 'grayscale(100%) contrast(140%) brightness(90%)', overlay: null },
            { category: 'Cinematic', name: 'Teal & Orange', css: 'hue-rotate(180deg) saturate(130%) contrast(115%) brightness(100%)', overlay: null },
            { category: 'Cinematic', name: 'Documentary',   css: 'contrast(120%) saturate(90%) brightness(100%)', overlay: null },
            { category: 'Cinematic', name: 'HDR',           css: 'contrast(140%) saturate(120%) brightness(110%)', overlay: null },

            { category: 'Retro & Analog', name: 'Retro',         css: 'sepia(60%) hue-rotate(330deg) saturate(150%) contrast(120%)', overlay: null },
            { category: 'Retro & Analog', name: '90s TV',        css: 'contrast(85%) brightness(90%) saturate(75%) hue-rotate(5deg)', overlay: null },
            { category: 'Retro & Analog', name: 'Polaroid',      css: 'sepia(20%) contrast(105%) brightness(108%) saturate(110%)', overlay: null },

            { category: 'Artistic', name: 'Cyberpunk',     css: 'hue-rotate(180deg) saturate(180%) contrast(120%) brightness(110%)', overlay: null },
            { category: 'Artistic', name: 'Vaporwave',     css: 'hue-rotate(280deg) saturate(160%) contrast(110%) brightness(105%)', overlay: null },
            { category: 'Artistic', name: 'Anime',         css: 'saturate(180%) contrast(115%) brightness(110%)', overlay: null },

            { category: 'Atmospheric', name: 'Golden Hour',   css: 'sepia(30%) hue-rotate(30deg) saturate(130%) brightness(110%) contrast(105%)', overlay: null },
            { category: 'Atmospheric', name: 'Blue Hour',     css: 'hue-rotate(210deg) saturate(120%) brightness(95%) contrast(110%)', overlay: null },
            { category: 'Atmospheric', name: 'Sunset',        css: 'sepia(30%) hue-rotate(330deg) saturate(150%) contrast(110%) brightness(105%)', overlay: null },
        ];
    }

    getConfigKey() {
        return 'enableGlobalPlayerBar';
    }

    async enable() {
        console.log('[YPP] GlobalPlayerBar: Enabling...', { isYouTube: this.isYouTube });
        if (this.isYouTube) return; // Skip YouTube as it has native integration

        this.utils?.log('Enabling Global Player Bar', 'GlobalPlayerBar');
        this.utils?.injectCSS('src/content/features/player/global-bar.css', 'ypp-global-bar-css');
        
        // Initial scan
        this.scanForVideos();
        
        // Start observer for dynamic videos
        this.startObserver();
    }

    async disable() {
        this.stopObserver();
        this.activeBars.forEach((bar, video) => {
            bar.remove();
        });
        this.activeBars.clear();
        this.utils?.removeStyle('ypp-global-bar-css');
    }

    startObserver() {
        if (this.observer) return;
        this.observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.addedNodes.length) {
                    this.scanForVideos();
                }
            }
        });
        this.observer.observe(document.body, { childList: true, subtree: true });
    }

    stopObserver() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }

    scanForVideos() {
        const videos = document.querySelectorAll('video');
        if (videos.length > 0) {
            console.log(`[YPP] GlobalPlayerBar: Found ${videos.length} videos`);
        }
        
        videos.forEach(video => {
            // Check if bar is already attached
            if (this.activeBars.has(video)) return;
            
            // Wait for video to have dimensions
            if (video.offsetWidth > 0 && video.offsetHeight > 0) {
                this.attachBar(video);
            } else {
                // Retry in a bit if it's a new video tag
                setTimeout(() => {
                    if (video.isConnected && !this.activeBars.has(video) && video.offsetWidth > 0) {
                        this.attachBar(video);
                    }
                }, 2000);
            }
        });
    }

    attachBar(video) {
        this.utils?.log('Attaching global bar to video', 'GlobalPlayerBar', 'debug');
        
        const bar = document.createElement('div');
        bar.className = 'ypp-global-player-bar ypp-glass-panel';
        
        // Add a class if we are in an iframe
        const isInIframe = window.self !== window.top;
        if (isInIframe) bar.classList.add('ypp-gpb-iframe');
        
        // Create bar structure
        bar.innerHTML = `
            <div class="ypp-gpb-controls">
                <button class="ypp-gpb-btn" id="ypp-gpb-play" title="Play/Pause">▶️</button>
                <div class="ypp-gpb-divider"></div>
                <div class="ypp-gpb-section">
                    <div class="ypp-gpb-label">Speed <span id="ypp-gpb-speed-val">1.0x</span></div>
                    <input type="range" min="0.25" max="4" step="0.05" value="1" class="ypp-gpb-slider" id="ypp-gpb-speed-slider">
                </div>
                <div class="ypp-gpb-divider"></div>
                <div class="ypp-gpb-section">
                    <div class="ypp-gpb-label">Intensity <span id="ypp-gpb-int-val">100%</span></div>
                    <input type="range" min="0" max="100" step="1" value="100" class="ypp-gpb-slider" id="ypp-gpb-int-slider">
                </div>
                <div class="ypp-gpb-divider"></div>
                <button class="ypp-gpb-btn" id="ypp-gpb-filter-cycle" title="Cycle Filters">🎨</button>
                <div class="ypp-gpb-filter-info">
                    <div class="ypp-gpb-filter-cat" id="ypp-gpb-filter-cat">Classic</div>
                    <div class="ypp-gpb-filter-name" id="ypp-gpb-filter-name">Normal</div>
                </div>
                <div class="ypp-gpb-divider"></div>
                <button class="ypp-gpb-btn" id="ypp-gpb-pip" title="Picture-in-Picture">📺</button>
                <button class="ypp-gpb-btn" id="ypp-gpb-close" title="Hide Bar">×</button>
            </div>
        `;

        // Style the bar positioning relative to video
        this.updateBarPosition(video, bar);
        document.body.appendChild(bar);
        this.activeBars.set(video, bar);

        // Functionality
        const playBtn = bar.querySelector('#ypp-gpb-play');
        const speedSlider = bar.querySelector('#ypp-gpb-speed-slider');
        const speedVal = bar.querySelector('#ypp-gpb-speed-val');
        const intSlider = bar.querySelector('#ypp-gpb-int-slider');
        const intVal = bar.querySelector('#ypp-gpb-int-val');
        const filterBtn = bar.querySelector('#ypp-gpb-filter-cycle');
        const filterName = bar.querySelector('#ypp-gpb-filter-name');
        const filterCat = bar.querySelector('#ypp-gpb-filter-cat');
        const pipBtn = bar.querySelector('#ypp-gpb-pip');
        const closeBtn = bar.querySelector('#ypp-gpb-close');

        // Play/Pause
        playBtn.onclick = (e) => {
            e.stopPropagation();
            if (video.paused) video.play(); else video.pause();
        };
        video.addEventListener('play', () => playBtn.textContent = '⏸️');
        video.addEventListener('pause', () => playBtn.textContent = '▶️');
        playBtn.textContent = video.paused ? '▶️' : '⏸️';

        // Speed
        const syncSpeed = () => {
            const val = video.playbackRate;
            speedSlider.value = val;
            speedVal.textContent = val.toFixed(1) + 'x';
        };
        video.addEventListener('ratechange', syncSpeed);
        speedSlider.oninput = (e) => {
            const val = parseFloat(e.target.value);
            video.playbackRate = val;
            speedVal.textContent = val.toFixed(1) + 'x';
        };

        // Filter Logic
        let currentFilterIdx = 0;
        let intensity = 100;

        const applyFilter = () => {
            const filter = this.filters[currentFilterIdx];
            const inst = intensity / 100;
            
            if (filter.css === 'none') {
                video.style.filter = 'none';
                video.style.opacity = '1';
            } else {
                video.style.filter = filter.css;
                video.style.opacity = 0.7 + (0.3 * inst);
            }
            
            filterName.textContent = filter.name;
            filterCat.textContent = filter.category;
        };

        filterBtn.onclick = (e) => {
            e.stopPropagation();
            currentFilterIdx = (currentFilterIdx + 1) % this.filters.length;
            applyFilter();
            
            // Pulse effect
            filterName.style.transform = 'scale(1.1)';
            setTimeout(() => filterName.style.transform = 'scale(1)', 100);
        };

        intSlider.oninput = (e) => {
            intensity = parseInt(e.target.value);
            intVal.textContent = intensity + '%';
            applyFilter();
        };

        // PiP
        pipBtn.onclick = async (e) => {
            e.stopPropagation();
            try {
                if (document.pictureInPictureElement) {
                    await document.exitPictureInPicture();
                } else {
                    await video.requestPictureInPicture();
                }
            } catch (err) {}
        };

        // Close
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            bar.remove();
            this.activeBars.delete(video);
        };

        // Reposition on window resize or scroll
        const reposition = () => this.updateBarPosition(video, bar);
        window.addEventListener('resize', reposition);
        window.addEventListener('scroll', reposition);
        
        // Intersection Observer to hide bar when video is not visible
        const io = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                bar.style.visibility = entry.isIntersecting ? 'visible' : 'hidden';
            });
        }, { threshold: 0.1 });
        io.observe(video);

        // Cleanup on video removal
        const checkRemoval = setInterval(() => {
            if (!video.isConnected) {
                bar.remove();
                this.activeBars.delete(video);
                clearInterval(checkRemoval);
                io.disconnect();
                window.removeEventListener('resize', reposition);
                window.removeEventListener('scroll', reposition);
            }
        }, 3000);
    }

    updateBarPosition(video, bar) {
        const rect = video.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        const isInIframe = window.self !== window.top;
        
        // If in iframe, we position it as an overlay since there might not be space below
        if (isInIframe) {
            Object.assign(bar.style, {
                position: 'fixed',
                left: `${rect.left + (rect.width / 2)}px`,
                bottom: '20px', // Fixed to bottom of iframe viewport
                top: 'auto',
                transform: 'translateX(-50%)',
                zIndex: '2147483647',
            });
        } else {
            Object.assign(bar.style, {
                position: 'fixed',
                left: `${rect.left + (rect.width / 2)}px`,
                top: `${rect.bottom + 10}px`,
                bottom: 'auto',
                transform: 'translateX(-50%)',
                zIndex: '2147483647',
            });
        }
        
        // Auto-hide if totally out of viewport
        const isVisible = rect.bottom > 0 && rect.top < window.innerHeight;
        bar.style.display = isVisible ? 'flex' : 'none';
    }
};
