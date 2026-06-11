/**
 * Feature: Comment Spam Filter
 * Autodetects and dims/hides suspicious spam comments (crypto, telegram, whatsapp bots).
 * Users can add custom keywords and choose dim vs hide in settings.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.CommentFilter = class CommentFilter extends window.YPP.features.BaseFeature {
    // Built-in spam patterns — always active when feature is on
    static BASE_PATTERNS = [
        /whatsapp\s*\+?\d{9,}/i,
        /telegram[\s:]*@/i,
        /invest.*crypto/i,
        /financial\s+advisor/i,
        /my\s+mentor/i,
        /win.*prize/i,
        /trade.*bitcoin/i,
        /expert.*trader/i,
        /DM\s+me.*help/i,
        /click\s+my\s+profile/i,
    ];

    constructor() {
        super('CommentFilter');
        this.processedComments = new Set();
        this._activePatterns = [];
        this.handleComments = this.handleComments.bind(this);
    }

    getConfigKey() {
        return 'commentFilter';
    }

    /** Build the active pattern list by merging base patterns + user keywords */
    _buildPatterns() {
        const custom = (this.settings?.commentFilterCustomKeywords || '')
            .split(',')
            .map(k => k.trim())
            .filter(Boolean)
            .map(k => new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
        this._activePatterns = [...CommentFilter.BASE_PATTERNS, ...custom];
    }

    async enable() {
        if (!this.utils.isWatchPage()) return;
        await super.enable();
        this._buildPatterns();

        try {
            this.observer.register('spam_comments', 'ytd-comment-thread-renderer:not([data-ypp-processed])', this.handleComments, true);
            const comments = await this.waitForElement('#comments', 10000);
            if (comments && this.isEnabled) {
                this.observer.start(comments);
            }
        } catch (e) {
            this.utils?.log('Error enabling CommentFilter', 'COMMENT', 'error', e);
        }
    }

    async disable() {
        await super.disable();
        const action = this.settings?.commentFilterAction || 'dim';
        if (action === 'dim') {
            document.querySelectorAll('.ypp-spam-comment').forEach(el => {
                el.classList.remove('ypp-spam-comment');
                el.style.opacity = '';
                el.style.transition = '';
                el.style.display = '';
            });
        } else {
            document.querySelectorAll('.ypp-spam-comment').forEach(el => {
                el.classList.remove('ypp-spam-comment');
                el.style.display = '';
            });
        }
        document.querySelectorAll('.ypp-spam-label').forEach(el => el.remove());
        
        // TEARDOWN: remove processed stamps so re-enabling works
        document.querySelectorAll('ytd-comment-thread-renderer[data-ypp-processed]').forEach(el => {
            el.removeAttribute('data-ypp-processed');
        });
        this.processedComments.clear();
    }

    async onUpdate() {
        // Rebuild patterns when settings change (e.g. new custom keywords)
        this._buildPatterns();
        if (this.utils.isWatchPage()) {
            const comments = document.querySelector('#comments');
            if (comments) this.observer.start(comments);
        }
    }

    handleComments(elements) {
        if (!this.isEnabled) return;
        const action = this.settings?.commentFilterAction || 'dim';

        elements.forEach(container => {
            if (container.hasAttribute('data-ypp-processed')) return;
            container.setAttribute('data-ypp-processed', 'true');
            this.processedComments.add(container);

            const contentText = container.querySelector('#content-text');
            if (!contentText) return;

            const text = contentText.textContent;
            const isSpam = this._activePatterns.some(pattern => pattern.test(text));

            if (isSpam) {
                container.classList.add('ypp-spam-comment');

                if (action === 'hide') {
                    container.style.display = 'none';
                } else {
                    // 'dim' mode — fade + hover to reveal
                    container.style.opacity = '0.35';
                    container.style.transition = 'opacity 0.2s';
                    this.addListener(container, 'mouseenter', () => container.style.opacity = '1');
                    this.addListener(container, 'mouseleave', () => container.style.opacity = '0.35');
                }

                // Visual indicator label
                const header = container.querySelector('#header-author, #author-thumbnail');
                if (header && !container.querySelector('.ypp-spam-label')) {
                    const label = document.createElement('span');
                    label.className = 'ypp-spam-label';
                    label.textContent = '[Likely Spam]';
                    label.style.cssText = 'color:#ff5555;font-size:12px;margin-left:8px;font-weight:bold;';
                    header.appendChild(label);
                }

                this.utils.log?.('Spam comment filtered', 'COMMENT');
            }
        });
    }
};

