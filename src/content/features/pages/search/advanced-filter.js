// Advanced Homepage Filter (Refactored)
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.AdvancedFilter = class AdvancedFilter {

    // --- Constants & Selectors ---
    static SELECTORS = {
        GRID_ITEM: 'ytd-rich-grid-renderer ytd-rich-item-renderer',
        VIDEO_TITLE: '#video-title',
        VIDEO_TITLE_LINK: '#video-title-link',
        TIME_STATUS: 'ytd-thumbnail-overlay-time-status-renderer span, .ytd-thumbnail-overlay-time-status-renderer',
        OVERLAY_LIVE: '[overlay-style="LIVE"]',
        METADATA_LINE: '#metadata-line span, .ytd-video-meta-block span',
        BADGE_SHORTS: 'ytd-reel-item-renderer, a[href*="/shorts/"]',
        BADGE_MIX: '[data-url*="start_radio"], ytd-playlist-thumbnail',
        SUB_BUTTON: 'ytd-subscribe-button-renderer[subscribed], ytd-subscription-notification-toggle-button-renderer-next',
        CHIPS_BAR: '.ypp-chips-bar',
        ACTIVE_STATS: '.ypp-active-stats'
    };

    constructor() {
        this.CONSTANTS = window.YPP.CONSTANTS;
        this.Utils = window.YPP.Utils;
        this.observer = new window.YPP.Utils.DOMObserver();

        this.state = {
            isActive: false,
            filters: {
                source: 'all',
                time: 'any',
                duration: 'any',
                sort: 'latest'
            }
        };

        // Cache for video metadata to avoid re-parsing DOM
        // Key: DOM Element, Value: Parsed Data Object
        this.cache = new WeakMap();

        this._debouncedApply = null;
        this._navigationListener = null;
    }

    // --- Lifecycle Methods ---

    run() {
        // DISABLED: User requested removal of homepage filter buttons
        return;
        // Only run on Home
        if (window.location.pathname === '/' || window.location.pathname === '') {
            this.init();
        } else {
            this.disable();
        }
    }

    init() {
        if (this.state.isActive) return;
        this.state.isActive = true;

        this._createChipsBar();

        // Register Observer
        this.observer.register('filter-apply', 'ytd-rich-grid-renderer', () => {
            if (this._debouncedApply) {
                this._debouncedApply();
            } else {
                this._debouncedApply = this.Utils.debounce(() => this.apply(), 250);
                this._debouncedApply();
            }
        });
    }

    disable() {
        this.state.isActive = false;
        this.observer.unregister('filter-apply');
        const bar = document.querySelector(AdvancedFilter.SELECTORS.CHIPS_BAR);
        if (bar) bar.remove();
    }

    // --- UI Methods ---

    _createChipsBar() {
        if (document.querySelector(AdvancedFilter.SELECTORS.CHIPS_BAR)) return;

        const bar = document.createElement('div');
        bar.className = 'ypp-chips-bar';

        const chipsConfig = [
            { label: 'All', type: 'source', val: 'all', active: true },
            { label: 'Subscribed', type: 'source', val: 'sub' },
            { divider: true },
            { label: 'Today', type: 'time', val: 'today' },
            { label: 'This Week', type: 'time', val: 'week' },
            { label: 'This Month', type: 'time', val: 'month' },
            { divider: true },
            { label: 'Short (<10m)', type: 'duration', val: 'short' },
            { label: 'Long (>30m)', type: 'duration', val: 'long' }
        ];

        const fragment = document.createDocumentFragment();

        chipsConfig.forEach(data => {
            if (data.divider) {
                const div = document.createElement('div');
                div.className = 'ypp-chip-divider';
                fragment.appendChild(div);
            } else {
                const chip = document.createElement('div');
                chip.className = `ypp-chip ${data.active ? 'active' : ''}`;
                chip.textContent = data.label;
                chip.dataset.type = data.type;
                chip.dataset.val = data.val;

                // Event Delegation would be better, but direct binding is simple for this scale
                chip.onclick = () => this._handleChipClick(chip, data.type, data.val);
                fragment.appendChild(chip);
            }
        });

        bar.appendChild(fragment);
        document.body.appendChild(bar);

        // Navigation Cleanup
        if (!this._navigationListener) {
            this._navigationListener = () => {
                if (window.location.pathname !== '/' && window.location.pathname !== '') {
                    this.disable();
                }
            };
            window.addEventListener('yt-navigate-start', this._navigationListener);
        }
    }

    _handleChipClick(chip, type, val) {
        console.log('[YPP] Filter Click:', type, val);
        const { filters } = this.state;
        const currentVal = filters[type];

        if (type === 'source') {
            // Exclusive Select
            if (currentVal === val) return;
            filters[type] = val;
        } else {
            // Toggle
            filters[type] = (currentVal === val) ? 'any' : val;
        }

        this._updateChipsUI();
        this.apply();
    }

    _updateChipsUI() {
        const bar = document.querySelector(AdvancedFilter.SELECTORS.CHIPS_BAR);
        if (!bar) return;

        const chips = bar.querySelectorAll('.ypp-chip');
        chips.forEach(chip => {
            const { type, val } = chip.dataset;
            const currentFilter = this.state.filters[type];
            let isActive = (currentFilter === val);

            // Special case for default 'All'
            if (type === 'source' && val === 'all' && currentFilter === 'all') isActive = true;

            chip.classList.toggle('active', isActive);
        });
    }

    // --- Core Logic ---

    apply() {
        const cards = this._getVideoCards();
        let visibleCount = 0;

        // Batch DOM reads/writes where possible, but `cache` handles the heavy lifting
        const processingQueue = cards.map(card => {
            let data = this.cache.get(card);
            if (!data) {
                data = this._parseVideoData(card);
                this.cache.set(card, data);
            }
            return { card, data };
        });

        processingQueue.forEach(({ card, data }) => {
            const shouldShow = this._checkCriteriaStrict(data);

            if (shouldShow) {
                visibleCount++;
                if (card.classList.contains('ypp-filter-hidden')) {
                    card.style.display = '';
                    card.classList.remove('ypp-filter-hidden');
                }
            } else {
                if (!card.classList.contains('ypp-filter-hidden')) {
                    card.style.setProperty('display', 'none', 'important');
                    card.classList.add('ypp-filter-hidden');
                }
            }
        });

        // Fail-Safe: If user filters result in 0 videos, we technically respect it in Strict Mode.
        // However, user might think it's broken. 
        // For now, adhere to Strict Mode as requested.

        this._updateStats(visibleCount);
        console.log(`[YPP] Filter Applied. Visible: ${visibleCount}/${cards.length}`);
    }

    _checkCriteriaStrict(data) {
        const { source, time, duration } = this.state.filters;

        // 1. Source Filter
        if (source === 'sub') {
            // Strict: Must be explicitly subscribed
            if (data.isSubscribed !== true) return false;
        }
        else if (source === 'unsub') {
            if (data.isSubscribed === true) return false;
        }

        // 2. Time Filter (Cascading)
        if (time !== 'any') {
            if (data.timeBucket === 'unknown') return false; // Strict: Hide unknowns

            const LEVELS = { 'today': 1, 'week': 2, 'month': 3, 'older': 4 };
            const filterLevel = LEVELS[time] || 4;
            const itemLevel = LEVELS[data.timeBucket] || 4;

            // e.g. Filter: Week (2). Item: Today (1). 1 <= 2 -> PASS.
            if (itemLevel > filterLevel) return false;
        }

        // 3. Duration Filter
        if (duration !== 'any') {
            if (data.isMix) return true; // Mixes don't have standard durations
            if (data.durationSec === -1) return false; // Strict: Hide unknowns

            const d = data.durationSec;
            if (duration === 'short' && d > 600) return false; // > 10m
            if (duration === 'long' && d <= 1800) return false; // <= 30m
        }

        return true;
    }

    // --- Parsing Logic (Modularized) ---

    _getVideoCards() {
        const allCards = Array.from(document.querySelectorAll(AdvancedFilter.SELECTORS.GRID_ITEM));
        // Filter out skeletons or hidden placeholders
        return allCards.filter(card => {
            return card.innerText.trim().length > 0 &&
                (card.querySelector(AdvancedFilter.SELECTORS.VIDEO_TITLE) ||
                    card.querySelector(AdvancedFilter.SELECTORS.VIDEO_TITLE_LINK));
        });
    }

    _parseVideoData(card) {
        try {
            return {
                title: this._extractTitle(card),
                durationSec: this._extractDuration(card),
                timeBucket: this._extractUploadTime(card),
                isSubscribed: this._extractSubscriptionStatus(card),
                isMix: this._extractIsMix(card),
                isShort: this._extractIsShort(card)
            };
        } catch (e) {
            console.error('[YPP] Parse Error:', e);
            // Return safe default
            return { durationSec: -1, timeBucket: 'unknown', isSubscribed: 'unknown', isMix: false };
        }
    }

    _extractTitle(card) {
        const el = card.querySelector(AdvancedFilter.SELECTORS.VIDEO_TITLE) ||
            card.querySelector(AdvancedFilter.SELECTORS.VIDEO_TITLE_LINK);
        return el ? el.innerText : '';
    }

    _extractDuration(card) {
        // Check for Live
        const isLiveOverlay = card.querySelector(AdvancedFilter.SELECTORS.OVERLAY_LIVE);
        if (isLiveOverlay) return 0; // Live = 0

        // Parse Time Status
        const timeSpan = card.querySelector(AdvancedFilter.SELECTORS.TIME_STATUS);
        let text = timeSpan ? timeSpan.innerText.trim() : '';

        // Fallback: Aria Label
        if (!text) {
            const ariaEl = card.querySelector('[aria-label*="minutes"], [aria-label*="seconds"]');
            if (ariaEl) text = ariaEl.getAttribute('aria-label');
        }

        if (!text) return -1;
        if (text === 'LIVE') return 0;

        return this._parseDurationString(text);
    }

    _parseDurationString(text) {
        // Format: "HH:MM:SS" or "MM:SS"
        if (text.includes(':')) {
            const parts = text.split(':').map(Number);
            if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
            if (parts.length === 2) return parts[0] * 60 + parts[1];
            return -1;
        }
        // Format: "5 minutes, 20 seconds" (Aria)
        if (text.includes('minute') || text.includes('second')) {
            const mins = parseInt(text.match(/(\d+)\s+minute/)?.[1] || 0);
            const secs = parseInt(text.match(/(\d+)\s+second/)?.[1] || 0);
            return mins * 60 + secs;
        }
        return -1;
    }

    _extractUploadTime(card) {
        // Strategy 1: Metadata Line
        const metaSpans = Array.from(card.querySelectorAll(AdvancedFilter.SELECTORS.METADATA_LINE));
        const dateSpan = metaSpans.find(s => {
            const t = s.innerText.toLowerCase();
            return t.includes('ago') || t.includes('streamed') || t.includes('premiered');
        });

        let text = '';
        if (dateSpan) {
            text = dateSpan.innerText.toLowerCase();
        } else {
            // Strategy 2: Regex on full text (Brute force fallback)
            const fullText = card.innerText.toLowerCase();
            const match = fullText.match(/(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/);
            if (match) text = match[0];
        }

        return this._parseUploadBucket(text);
    }

    _parseUploadBucket(text) {
        if (!text) return 'unknown';
        // Today
        if (text.includes('second') || text.includes('minute') || text.includes('hour')) return 'today';
        // Week
        if (text.includes('day')) {
            // "1 day ago" ... "6 days ago" -> Week
            return 'week';
        }
        // Month
        if (text.includes('week')) return 'month';
        // Older
        if (text.includes('month') || text.includes('year')) return 'older';

        return 'older';
    }

    _extractSubscriptionStatus(card) {
        // This is the hardest part on Home feed.
        // We rely on explicit signals.
        const hasSubBtn = card.querySelector(AdvancedFilter.SELECTORS.SUB_BUTTON);
        if (hasSubBtn) return true;

        // No explicit "Unsubscribed" signal exists easily.
        return 'unknown';
    }

    _extractIsMix(card) {
        return !!card.querySelector(AdvancedFilter.SELECTORS.BADGE_MIX);
    }

    _extractIsShort(card) {
        return !!card.querySelector(AdvancedFilter.SELECTORS.BADGE_SHORTS);
    }

    _updateStats(count) {
        const stats = document.querySelector(AdvancedFilter.SELECTORS.ACTIVE_STATS);
        if (stats) stats.textContent = `Showing ${count} videos`;
    }
};
