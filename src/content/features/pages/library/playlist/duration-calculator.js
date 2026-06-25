// Attach to features namespace
window.YPP.features = window.YPP.features || {};

window.YPP.features.PlaylistDuration = class PlaylistDuration extends window.YPP.features.BaseFeature {
    constructor() {
        super('PlaylistDuration');
        this.debounceTimer = null;
        this.card = null;
        this._boundCalculate = this.calculateDuration.bind(this);
    }
    
    getConfigKey() {
        return 'playlistDuration';
    }

    async enable() {
        if (!location.pathname.includes('/playlist')) return;
        await super.enable();

        this.calculateDuration();

        this._debouncedCalculate = this.utils.debounce(this._boundCalculate, 1000);
        this.observer.start();
        this.observer.register('playlist-duration', 
            'ytd-playlist-video-renderer, yt-lockup-view-model',
            () => {
                if (location.pathname.includes('/playlist')) {
                    this._debouncedCalculate();
                }
            }, false);
    }

    async disable() {
        await super.disable();
        if (this.observer) {
            this.observer.unregister('playlist-duration');
            this.observer.stop();
        }
        if (this.card) {
            this.card.remove();
            this.card = null;
        }
    }

    async calculateDuration() {
        if (this.isCalculating) return;
        this.isCalculating = true;

        try {
            let totalSeconds = 0;
            let videoCount = 0;
            let totalPlaylistVideos = 0;

            const scripts = Array.from(document.querySelectorAll('script'));
            const ytInitialDataScript = scripts.find(s => s.textContent.includes('var ytInitialData ='));
            
            if (!ytInitialDataScript) {
                return this.fallbackCalculate();
            }

            const match = ytInitialDataScript.textContent.match(/var ytInitialData = ({.*?});/s);
            if (!match) return this.fallbackCalculate();

            let initialData;
            try {
                initialData = JSON.parse(match[1]);
            } catch (e) {
                return this.fallbackCalculate();
            }
            
            const stats = initialData?.header?.playlistHeaderRenderer?.numVideosText?.runs?.[0]?.text;
            if (stats) {
                totalPlaylistVideos = parseInt(stats.replace(/[^0-9]/g, ''), 10);
            }

            const tab = initialData?.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents?.[0]?.playlistVideoListRenderer;
            
            if (!tab) return this.fallbackCalculate();

            let contents = tab.contents || [];
            
            const processContents = (items) => {
                for (const item of items) {
                    const renderer = item.playlistVideoRenderer;
                    if (renderer && renderer.lengthSeconds) {
                        totalSeconds += parseInt(renderer.lengthSeconds, 10);
                        videoCount++;
                    }
                }
            };

            processContents(contents);
            this.renderCard(totalSeconds, videoCount, totalPlaylistVideos - videoCount, totalPlaylistVideos);

            // Fetch continuations recursively in background
            if (window.YPP.dataApi && window.YPP.dataApi.apiKey && contents.length > 0) {
                let lastItem = contents[contents.length - 1];
                let continuationToken = lastItem?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token;

                while (continuationToken && videoCount < totalPlaylistVideos) {
                    try {
                        const response = await fetch(`https://www.youtube.com/youtubei/v1/browse?key=${window.YPP.dataApi.apiKey}`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                ...(window.YPP.dataApi.getHeaders() || {})
                            },
                            body: JSON.stringify({
                                context: {
                                    client: {
                                        clientName: "WEB",
                                        clientVersion: window.YPP.dataApi.clientVersion || "2.20230101.00.00"
                                    }
                                },
                                continuation: continuationToken
                            })
                        });

                        if (!response.ok) break;

                        const data = await response.json();
                        const actions = data?.onResponseReceivedActions;
                        if (!actions || actions.length === 0) break;

                        const appendAction = actions.find(a => a.appendContinuationItemsAction);
                        if (!appendAction) break;

                        const newItems = appendAction.appendContinuationItemsAction.continuationItems;
                        if (!newItems) break;

                        processContents(newItems);
                        this.renderCard(totalSeconds, videoCount, totalPlaylistVideos - videoCount, totalPlaylistVideos);
                        
                        lastItem = newItems[newItems.length - 1];
                        continuationToken = lastItem?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token;

                        // Give CPU time to breath
                        await new Promise(r => setTimeout(r, 250));
                    } catch (fetchErr) {
                        break;
                    }
                }
            }

            this.renderCard(totalSeconds, videoCount, totalPlaylistVideos - videoCount, totalPlaylistVideos);

        } catch (error) {
            this.fallbackCalculate();
        } finally {
            this.isCalculating = false;
        }
    }

    fallbackCalculate() {
        // Support both old (ytd-playlist-video-renderer) and new (yt-lockup-view-model) YouTube DOM
        const ITEM_SEL = 'ytd-playlist-video-renderer, yt-lockup-view-model';
        const TIME_SELECTORS = [
            'ytd-thumbnail-overlay-time-status-renderer',
            'badge-shape[class*="time-status"]',
            '.yt-lockup-view-model-wiz__badge .badge-shape',
            'yt-formatted-string[class*="time"]'
        ];
        const allItems = document.querySelectorAll(ITEM_SEL);
        
        let totalSeconds = 0;
        let validCount = 0;

        allItems.forEach(item => {
            for (const sel of TIME_SELECTORS) {
                const el = item.querySelector(sel);
                if (!el) continue;
                const timeText = (el.getAttribute('aria-label') || el.textContent || '').trim();
                if (timeText && timeText.includes(':')) {
                    const cleanTime = timeText.replace(/[^0-9:]/g, '');
                    const s = this.parseTime(cleanTime);
                    if (s > 0) {
                        totalSeconds += s;
                        validCount++;
                        break;
                    }
                }
            }
        });

        let totalPlaylistVideos = allItems.length;
        const statsSelectors = [
            '.metadata-stats',
            'ytd-playlist-byline-renderer',
            'yt-content-metadata-view-model-wiz__metadata-row span',
            'yt-formatted-string[id="stats"]'
        ];
        for (const sel of statsSelectors) {
            const statsEl = document.querySelector(sel);
            if (statsEl) {
                const match = statsEl.textContent.match(/([\d,]+)\s+videos?/i);
                if (match) {
                    totalPlaylistVideos = parseInt(match[1].replace(/,/g, ''), 10);
                    break;
                }
            }
        }

        const notCounted = allItems.length - validCount;

        if (allItems.length > 0) {
            this.renderCard(totalSeconds, validCount, notCounted, totalPlaylistVideos);
        }
    }

    parseTime(timeStr) {
        const parts = timeStr.split(':').map(Number);
        if (parts.length === 3) {
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        } else if (parts.length === 2) {
            return parts[0] * 60 + parts[1];
        } else if (parts.length === 4) { // D:HH:MM:SS
            return parts[0] * 86400 + parts[1] * 3600 + parts[2] * 60 + parts[3];
        }
        return 0;
    }

    formatTimeText(seconds) {
        if (seconds === 0) return '0s';
        const d = Math.floor(seconds / 86400);
        const h = Math.floor((seconds % 86400) / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        
        let result = [];
        if (d > 0) result.push(`<span class="ypp-time-val">${d}</span><span class="ypp-time-lbl">d</span>`);
        if (h > 0) result.push(`<span class="ypp-time-val">${h}</span><span class="ypp-time-lbl">h</span>`);
        if (m > 0 || h > 0) result.push(`<span class="ypp-time-val">${m}</span><span class="ypp-time-lbl">m</span>`);
        result.push(`<span class="ypp-time-val">${s}</span><span class="ypp-time-lbl">s</span>`);
        
        return result.join(' ');
    }

    renderCard(totalSeconds, videoCount, notCounted, totalPlaylistVideos) {
        // Try multiple header selectors for old and new YouTube DOM
        const container = 
            document.querySelector('ytd-playlist-header-renderer') ||
            document.querySelector('yt-playlist-header-view-model') ||
            document.querySelector('ytd-browse[page-subtype="playlist"] #header');
        if (!container) return;

        if (!this.card) {
            this.card = document.createElement('div');
            this.card.id = 'ypp-playlist-card';
            
            // Premium Glassmorphic UI Styling
            this.card.style.cssText = `
                margin-top: 24px;
                background: linear-gradient(145deg, rgba(20, 20, 24, 0.8), rgba(15, 15, 18, 0.9));
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-top: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 20px;
                padding: 24px;
                font-family: var(--ypp-font-family, 'Inter', 'Roboto', sans-serif);
                color: #fff;
                width: 100%;
                box-sizing: border-box;
                backdrop-filter: blur(24px) saturate(1.2);
                -webkit-backdrop-filter: blur(24px) saturate(1.2);
                box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1);
                transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.3s ease;
                position: relative;
                overflow: hidden;
            `;
            
            // Add a subtle glow behind the card
            const glow = document.createElement('div');
            glow.style.cssText = `
                position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
                background: radial-gradient(circle at top right, rgba(62, 166, 255, 0.15), transparent 60%);
                pointer-events: none; z-index: 0;
            `;
            this.card.appendChild(glow);

            // Container for inner HTML to sit above glow
            this.contentDiv = document.createElement('div');
            this.contentDiv.style.cssText = 'position: relative; z-index: 1;';
            this.card.appendChild(this.contentDiv);

            // Insert styling for the time labels
            const style = document.createElement('style');
            style.textContent = `
                .ypp-time-val { font-weight: 700; color: #fff; }
                .ypp-time-lbl { font-weight: 500; color: #aaa; margin-left: 2px; margin-right: 6px; font-size: 0.85em; }
                .ypp-speed-box { background: rgba(255,255,255,0.06); padding: 10px 12px; border-radius: 12px; display: flex; flex-direction: column; gap: 4px; border: 1px solid rgba(255,255,255,0.03); transition: background 0.2s; }
                .ypp-speed-box:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.1); }
                .ypp-speed-lbl { font-size: 11px; color: #aaa; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
                .ypp-speed-val { font-size: 14px; }
            `;
            this.card.appendChild(style);

            const stats = container.querySelector('ytd-playlist-byline-renderer') || container.querySelector('.metadata-action-bar');
            if (stats) {
                 stats.parentNode.insertBefore(this.card, stats.nextSibling);
            } else {
                 container.appendChild(this.card);
            }
        }

        const time1x = this.formatTimeText(totalSeconds);
        const time125x = this.formatTimeText(Math.floor(totalSeconds / 1.25));
        const time15x = this.formatTimeText(Math.floor(totalSeconds / 1.5));
        const time2x = this.formatTimeText(Math.floor(totalSeconds / 2.0));

        let loadWarning = '';
        if (videoCount < totalPlaylistVideos) {
            loadWarning = `
                <div style="margin-top: 16px; padding: 10px 14px; background: rgba(255, 171, 0, 0.1); border: 1px solid rgba(255, 171, 0, 0.3); border-radius: 10px; font-size: 12px; color: #ffab00; display: flex; align-items: center; gap: 8px;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                    <span><strong>Partial calculation:</strong> Scroll down to load all videos. Calculated ${videoCount} of ${totalPlaylistVideos} videos.</span>
                </div>
            `;
        }

        this.contentDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                <div>
                    <div style="font-size: 12px; font-weight: 600; margin-bottom: 6px; color: var(--ypp-accent-color, #3ea6ff); text-transform: uppercase; letter-spacing: 1px; display: flex; align-items: center; gap: 6px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        Total Duration
                    </div>
                    <div style="font-size: 26px; line-height: 1.2;">${time1x}</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 13px; font-weight: 600; color: #fff; background: rgba(255,255,255,0.1); padding: 4px 10px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.05);">
                        ${videoCount} videos
                    </div>
                    ${notCounted > 0 ? `<div style="font-size: 11px; color: #ff4e45; margin-top: 6px; font-weight: 500;">${notCounted} unplayable</div>` : ''}
                </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
                <div class="ypp-speed-box">
                    <span class="ypp-speed-lbl">At 1.25x Speed</span>
                    <span class="ypp-speed-val">${time125x}</span>
                </div>
                <div class="ypp-speed-box">
                    <span class="ypp-speed-lbl">At 1.50x Speed</span>
                    <span class="ypp-speed-val">${time15x}</span>
                </div>
                <div class="ypp-speed-box">
                    <span class="ypp-speed-lbl">At 2.00x Speed</span>
                    <span class="ypp-speed-val">${time2x}</span>
                </div>
            </div>
            
            ${loadWarning}
        `;
    }
};
