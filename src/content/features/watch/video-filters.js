/**
 * Video Filters Feature
 * Adds a slider-based UI to adjust video brightness, contrast, saturation, etc.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.VideoFilters = class VideoFilters {
    constructor() {
        this.isActive = false;
        this.settings = null;
        this.filters = {
            brightness: 100,
            contrast: 100,
            saturate: 100,
            grayscale: 0,
            sepia: 0,
            invert: 0
        };
        this.panel = null;
        this.btn = null;
        this.videoElement = null;

        this.applyFilters = this.applyFilters.bind(this);
        this.handleNavigation = this.handleNavigation.bind(this);
    }

    enable(settings) {
        if (this.isActive) return;
        this.isActive = true;
        this.settings = settings;

        // Load saved filter values if they exist in settings (future improvement)
        
        if (this.isWatchPage()) {
            this.init();
        }
        window.addEventListener('yt-navigate-finish', this.handleNavigation);
    }

    disable() {
        if (!this.isActive) return;
        this.isActive = false;
        this.removeUI();
        this.resetFilters();
        window.removeEventListener('yt-navigate-finish', this.handleNavigation);
    }

    run(settings) {
        this.enable(settings);
    }

    update(settings) {
        this.settings = settings;
    }

    isWatchPage() {
        return location.pathname.startsWith('/watch');
    }

    handleNavigation() {
        if (this.isActive && this.isWatchPage()) {
            setTimeout(() => this.init(), 1000);
        } else {
            this.removeUI();
        }
    }

    init() {
        this.videoElement = document.querySelector('video');
        if (!this.videoElement) return;

        // Add button to player controls if not exists
        this.injectButton();
    }

    injectButton() {
        if (document.getElementById('ypp-filter-btn')) return;

        // Try to find the settings button or similar in right controls
        const controls = document.querySelector('.ytp-right-controls');
        if (!controls) return;

        const btn = document.createElement('button');
        btn.id = 'ypp-filter-btn';
        btn.className = 'ytp-button';
        btn.title = 'Video Filters';
        btn.innerHTML = `<svg height="100%" version="1.1" viewBox="0 0 36 36" width="100%"><path d="M11,11 C9.896,11 9,11.896 9,13 L9,23 C9,24.104 9.896,25 11,25 L25,25 C26.104,25 27,24.104 27,23 L27,13 C27,11.896 26.104,11 25,11 L11,11 Z M11,23 L11,13 L25,13 L25,23 L11,23 Z" fill="#fff"></path></svg>`;
        
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.togglePanel();
        });

        controls.insertBefore(btn, controls.firstChild);
        this.btn = btn;
    }

    togglePanel() {
        if (this.panel) {
            this.removePanel();
        } else {
            this.createPanel();
        }
    }

    removePanel() {
        if (this.panel) {
            this.panel.remove();
            this.panel = null;
        }
    }

    removeUI() {
        if (this.btn) {
            this.btn.remove();
            this.btn = null;
        }
        this.removePanel();
    }

    createPanel() {
        const panel = document.createElement('div');
        panel.id = 'ypp-filter-panel';
        Object.assign(panel.style, {
            position: 'absolute',
            bottom: '50px',
            right: '20px',
            background: 'rgba(28, 28, 28, 0.95)',
            padding: '15px',
            borderRadius: '12px',
            zIndex: '6000',
            width: '250px',
            color: '#fff',
            fontFamily: 'Roboto, sans-serif',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(10px)'
        });

        const title = document.createElement('div');
        title.textContent = 'Video Filters';
        title.style.marginBottom = '10px';
        title.style.fontWeight = '500';
        title.style.display = 'flex';
        title.style.justifyContent = 'space-between';
        
        const resetBtn = document.createElement('button');
        resetBtn.textContent = 'Reset';
        resetBtn.style.background = 'transparent';
        resetBtn.style.border = '1px solid #aaa';
        resetBtn.style.color = '#fff';
        resetBtn.style.borderRadius = '4px';
        resetBtn.style.cursor = 'pointer';
        resetBtn.style.fontSize = '12px';
        resetBtn.onclick = () => this.resetFilters();

        title.appendChild(resetBtn);
        panel.appendChild(title);

        const configs = [
            { id: 'brightness', name: 'Brightness', min: 0, max: 200, unit: '%' },
            { id: 'contrast', name: 'Contrast', min: 0, max: 200, unit: '%' },
            { id: 'saturate', name: 'Saturation', min: 0, max: 200, unit: '%' },
            { id: 'grayscale', name: 'Grayscale', min: 0, max: 100, unit: '%' },
            { id: 'sepia', name: 'Sepia', min: 0, max: 100, unit: '%' },
            { id: 'invert', name: 'Invert', min: 0, max: 100, unit: '%' }
        ];

        configs.forEach(cfg => {
            const row = document.createElement('div');
            row.style.marginBottom = '8px';
            
            const label = document.createElement('label');
            label.textContent = cfg.name;
            label.style.display = 'block';
            label.style.fontSize = '12px';
            label.style.marginBottom = '4px';

            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = cfg.min;
            slider.max = cfg.max;
            slider.value = this.filters[cfg.id];
            slider.style.width = '100%';
            
            slider.oninput = (e) => {
                this.filters[cfg.id] = e.target.value;
                this.applyFilters();
            };

            row.appendChild(label);
            row.appendChild(slider);
            panel.appendChild(row);
        });

        // Close on outside click
        // setTimeout(() => {
        //     document.addEventListener('click', this.handleOutsideClick);
        // }, 100);

        // Parent to movie_player or appropriate container
        const container = document.getElementById('movie_player') || document.body;
        container.appendChild(panel);
        this.panel = panel;
    }

    resetFilters() {
        this.filters = {
            brightness: 100,
            contrast: 100,
            saturate: 100,
            grayscale: 0,
            sepia: 0,
            invert: 0
        };
        this.applyFilters();
        if (this.panel) {
            // refresh sliders
            const inputs = this.panel.querySelectorAll('input[type="range"]');
            inputs.forEach(input => {
                // Logic to map back implies identifying input. 
                // Simple redraw is easier
                this.removePanel();
                this.createPanel();
            });
        }
    }

    applyFilters() {
        if (!this.videoElement) this.videoElement = document.querySelector('video');
        if (!this.videoElement) return;

        const f = this.filters;
        const filterString = `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturate}%) grayscale(${f.grayscale}%) sepia(${f.sepia}%) invert(${f.invert}%)`;
        
        this.videoElement.style.filter = filterString;
    }
};
