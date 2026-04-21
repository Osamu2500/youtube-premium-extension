/**
 * Global Bar UI
 * Owns: Generating the custom player bar DOM, injecting it over arbitrary <video>
 * tags on external sites, and handling local playback/speed/filter state.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.GlobalBarUI = class GlobalBarUI {

    constructor(filters) {
        this.activeBars = new Map(); // videoElement -> barElement
        this.filters = filters || window.YPP.features.FilterPresets.PRESETS;
    }

    /** Attach a global player bar to a specific video element. */
    attachBar(video) {
        window.YPP.Utils?.log('Attaching global bar to video', 'GlobalBarUI', 'debug');
        
        const bar = document.createElement('div');
        bar.className = 'ypp-global-player-bar ypp-glass-panel';
        
        const isInIframe = window.self !== window.top;
        if (isInIframe) bar.classList.add('ypp-gpb-iframe');
        
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

        this.updateBarPosition(video, bar);
        document.body.appendChild(bar);
        this.activeBars.set(video, bar);

        this._bindEvents(video, bar);
    }

    /** Remove all injected bars and clear the map. */
    removeAll() {
        this.activeBars.forEach((bar) => bar.remove());
        this.activeBars.clear();
    }

    /** Given a video element, returns true if it currently has a bar attached. */
    hasBar(video) {
        return this.activeBars.has(video);
    }

    /** Re-calculates and applies absolute positioning for all active bars. */
    repositionAll() {
        this.activeBars.forEach((bar, video) => this.updateBarPosition(video, bar));
    }

    /** Position a single bar immediately below its corresponding video element. */
    updateBarPosition(video, bar) {
        const rect = video.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        const isInIframe = window.self !== window.top;
        
        if (isInIframe) {
            Object.assign(bar.style, {
                position: 'fixed',
                left: `${rect.left + (rect.width / 2)}px`,
                bottom: '20px',
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
        
        const isVisible = rect.bottom > 0 && rect.top < window.innerHeight;
        bar.style.display = isVisible ? 'flex' : 'none';
    }

    // =========================================================================
    // EVENT BINDINGS
    // =========================================================================

    _bindEvents(video, bar) {
        const playBtn     = bar.querySelector('#ypp-gpb-play');
        const speedSlider = bar.querySelector('#ypp-gpb-speed-slider');
        const speedVal    = bar.querySelector('#ypp-gpb-speed-val');
        const intSlider   = bar.querySelector('#ypp-gpb-int-slider');
        const intVal      = bar.querySelector('#ypp-gpb-int-val');
        const filterBtn   = bar.querySelector('#ypp-gpb-filter-cycle');
        const filterName  = bar.querySelector('#ypp-gpb-filter-name');
        const filterCat   = bar.querySelector('#ypp-gpb-filter-cat');
        const pipBtn      = bar.querySelector('#ypp-gpb-pip');
        const closeBtn    = bar.querySelector('#ypp-gpb-close');

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
            speedSlider.value = video.playbackRate;
            speedVal.textContent = video.playbackRate.toFixed(1) + 'x';
        };
        video.addEventListener('ratechange', syncSpeed);
        speedSlider.oninput = (e) => {
            const val = parseFloat(e.target.value);
            video.playbackRate = val;
            speedVal.textContent = val.toFixed(1) + 'x';
        };

        // Filters
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

        // IO / Window bindings
        const io = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                bar.style.visibility = entry.isIntersecting ? 'visible' : 'hidden';
            });
        }, { threshold: 0.1 });
        io.observe(video);

        const checkRemoval = setInterval(() => {
            if (!video.isConnected) {
                bar.remove();
                this.activeBars.delete(video);
                clearInterval(checkRemoval);
                io.disconnect();
            }
        }, 3000);
    }
};
