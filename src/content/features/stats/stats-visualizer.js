// Attach to features namespace
window.YPP.features = window.YPP.features || {};

window.YPP.features.StatsVisualizer = class StatsVisualizer {
    constructor() {
        this.enabled = false;
        this.overlay = null;
        this.isInitialized = false;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.bufferHistory = [];
        this.canvas = null;
    }

    run(settings) {
        if (!this.isInitialized) {
            this.injectBridge();
            this.setupListeners();
            this.isInitialized = true;
        }
        this.update(settings);
    }

    update(settings) {
        const shouldEnable = settings.enableStatsForNerds; 
        if (shouldEnable !== this.enabled) {
            this.toggle(shouldEnable);
        }
    }

    setupListeners() {
        window.addEventListener('ypp-stats-update', (e) => {
            if (this.enabled) {
                this.updateUI(e.detail);
            }
        });
    }

    injectBridge() {
        if (document.getElementById('ypp-stats-bridge')) return;
        const script = document.createElement('script');
        script.id = 'ypp-stats-bridge';
        script.src = chrome.runtime.getURL('src/inject/stats-bridge.js');
        script.onload = function() { this.remove(); };
        (document.head || document.documentElement).appendChild(script);
    }

    toggle(enabled) {
        this.enabled = enabled;
        window.dispatchEvent(new CustomEvent('ypp-cmd-toggle-stats', { detail: { enabled } }));

        if (enabled) {
            this.createOverlay();
            if (this.overlay) this.overlay.style.display = 'block';
        } else if (this.overlay) {
            this.overlay.style.display = 'none';
        }
    }

    createOverlay() {
        if (this.overlay) return;

        this.overlay = document.createElement('div');
        this.overlay.id = 'ypp-stats-overlay';
        this.overlay.style.cssText = `
            position: absolute;
            top: 60px;
            left: 20px;
            width: 320px;
            background: rgba(15, 15, 15, 0.95);
            backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.5);
            padding: 16px;
            color: #fff;
            font-family: 'Inter', sans-serif;
            font-size: 12px;
            z-index: 9999;
            cursor: grab;
            user-select: none;
            transition: opacity 0.2s;
        `;

        // Draggable Logic
        this.overlay.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.overlay.style.cursor = 'grabbing';
            this.dragOffset.x = e.clientX - this.overlay.getBoundingClientRect().left;
            this.dragOffset.y = e.clientY - this.overlay.getBoundingClientRect().top;
        });

        window.addEventListener('mousemove', (e) => {
            if (this.isDragging && this.overlay) {
                this.overlay.style.left = `${e.clientX - this.dragOffset.x}px`;
                this.overlay.style.top = `${e.clientY - this.dragOffset.y}px`;
            }
        });

        window.addEventListener('mouseup', () => {
             this.isDragging = false;
             if (this.overlay) this.overlay.style.cursor = 'grab';
        });

        this.overlay.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:12px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:8px;">
                <span style="font-weight:700; color:#3ea6ff; letter-spacing:0.5px;">STATS FOR NERDS</span>
                <span id="ypp-stats-res" style="color:#aaa;">--</span>
            </div>

            <!-- Graphs Canvas -->
            <div style="height: 60px; background: rgba(0,0,0,0.3); border-radius: 6px; margin-bottom: 12px; position: relative;">
                 <canvas id="ypp-stats-canvas" width="288" height="60" style="width:100%; height:100%;"></canvas>
            </div>

            <div style="margin-bottom:12px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:11px; color:#aaa;">
                    <span>Buffer Health</span>
                    <span id="ypp-stats-buffer" style="color:#fff;">-- s</span>
                </div>
                <div style="background:rgba(255,255,255,0.1); height:4px; border-radius:2px; overflow:hidden;">
                    <div id="ypp-stats-buffer-bar" style="width:0%; height:100%; background:#2ba640;"></div>
                </div>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
                 <div style="background:rgba(255,255,255,0.05); padding:8px; border-radius:6px;">
                    <div style="color:#aaa; font-size:10px;">Connection</div>
                    <div id="ypp-stats-speed" style="font-weight:600; font-size:12px;">--</div>
                </div>
                 <div style="background:rgba(255,255,255,0.05); padding:8px; border-radius:6px;">
                    <div style="color:#aaa; font-size:10px;">Dropped Frames</div>
                    <div id="ypp-stats-dropped" style="font-weight:600; font-size:12px;">--</div>
                </div>
                 <div style="background:rgba(255,255,255,0.05); padding:8px; border-radius:6px;">
                    <div style="color:#aaa; font-size:10px;">Viewport</div>
                    <div id="ypp-stats-viewport" style="font-weight:600; font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">--</div>
                </div>
                 <div style="background:rgba(255,255,255,0.05); padding:8px; border-radius:6px;">
                    <div style="color:#aaa; font-size:10px;">Volume</div>
                    <div id="ypp-stats-volume" style="font-weight:600; font-size:12px;">--</div>
                </div>
            </div>
            
            <div style="margin-top:8px; text-align:right;">
                <div id="ypp-stats-codecs" style="font-size:9px; color:#555; font-family:monospace;">--</div>
            </div>
        `;

        const player = document.getElementById('movie_player') || document.body;
        player.appendChild(this.overlay);
        
        this.canvas = this.overlay.querySelector('canvas');
    }

    updateUI(stats) {
        if (!this.overlay) return;

        // Visuals
        this.overlay.querySelector('#ypp-stats-res').textContent = stats.resolution || '--';
        
        const bufferHealth = parseFloat(stats.buffer_health_seconds || 0);
        this.overlay.querySelector('#ypp-stats-buffer').textContent = `${bufferHealth.toFixed(1)} s`;
        const bufferBar = this.overlay.querySelector('#ypp-stats-buffer-bar');
        const bufPct = Math.min((bufferHealth / 60) * 100, 100);
        bufferBar.style.width = `${bufPct}%`;
        bufferBar.style.backgroundColor = bufferHealth < 10 ? '#ff4e45' : '#2ba640';

        const bw = stats.bandwidth_kbps ? (stats.bandwidth_kbps / 1000).toFixed(2) : 0;
        this.overlay.querySelector('#ypp-stats-speed').textContent = `${bw} Mbps`;
        
        this.overlay.querySelector('#ypp-stats-dropped').textContent = `${stats.dropped_frames || 0} / ${stats.decoding_errors || 0}`;

        // Viewport
        // stats doesn't always have viewport, but let's see. 
        // If not, we can get it from video el. But stats usually has 'dims' or similar?
        // Actually stats from getStatsForNerds() usually has 'dims'.
        // Let's use what we have or placeholder.
        // Actually, let's grab the actual video element size since we are in main world context via bridge? 
        // No, bridge sends data. getStatsForNerds return object.
        // Let's assume stats has it or we leave it.
        // Update: getStatsForNerds usually returns 'resolution' which is Video Resolution. 
        // 'dims' might not be there cleanly.
        
        this.overlay.querySelector('#ypp-stats-codecs').textContent = stats.fmt || '--';

        // Update Graph
        this.drawGraph(bufferHealth);
    }

    drawGraph(newValue) {
        // Simple Buffer trend graph
        if (!this.canvas) return;
        const ctx = this.canvas.getContext('2d');
        const w = this.canvas.width;
        const h = this.canvas.height;

        this.bufferHistory.push(newValue);
        if (this.bufferHistory.length > 50) this.bufferHistory.shift();

        ctx.clearRect(0, 0, w, h);
        
        ctx.beginPath();
        ctx.strokeStyle = '#3ea6ff';
        ctx.lineWidth = 2;

        const step = w / 50;
        
        this.bufferHistory.forEach((val, i) => {
            // Scale: 0 to 60s -> h to 0
            const y = h - Math.min((val / 60) * h, h);
            const x = i * step;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        
        ctx.stroke();

        // Fill below
        ctx.lineTo((this.bufferHistory.length - 1) * step, h);
        ctx.lineTo(0, h);
        ctx.fillStyle = 'rgba(62, 166, 255, 0.2)';
        ctx.fill();
    }
};
