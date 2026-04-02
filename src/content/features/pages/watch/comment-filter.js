/**
 * Feature: Comment Spam Filter
 * Autodetects and fades out suspicious spam comments (crypto, telegram, whatsapp bots).
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.CommentFilter = class CommentFilter extends window.YPP.features.BaseFeature {
    constructor() {
        super('CommentFilter');
        this.spamPatterns = [
            /whatsapp\s*\+?\d{9,}/i,
            /telegram[\s:]*@/i,
            /invest.*crypto/i,
            /financial\s+advisor/i,
            /my\s+mentor/i,
            /win.*prize/i,
            /trade.*bitcoin/i,
            /expert.*trader/i,
            /DM\s+me.*help/i,
            /click\s+my\s+profile/i
        ];
        
        this.processedComments = new Set();
        this.handleComments = this.handleComments.bind(this);
    }

    getConfigKey() {
        return 'commentFilter';
    }

    async enable() {
        if (!this.utils.isWatchPage()) return;
        await super.enable();

        // Use our robust observer
        this.observer.register('spam_comments', 'ytd-comment-thread-renderer:not(.ypp-comment-checked)', this.handleComments, true);
        
        // Wait for comments section to exist
        const comments = await this.waitForElement('#comments', 10000);
        if (comments && this.isEnabled) {
            this.observer.start(comments);
        }
    }

    async disable() {
        await super.disable();
        // Remove styling from tracked spam comments
        document.querySelectorAll('.ypp-spam-comment').forEach(el => {
            el.classList.remove('ypp-spam-comment');
            el.style.opacity = '1';
        });
        document.querySelectorAll('.ypp-spam-label').forEach(el => el.remove());
        this.processedComments.clear();
    }

    async onUpdate() {
        if (this.utils.isWatchPage()) {
            const comments = document.querySelector('#comments');
            if (comments) {
                this.observer.start(comments);
            }
        }
    }

    handleComments(elements) {
        if (!this.isEnabled) return;
        
        elements.forEach(container => {
            if (this.processedComments.has(container)) return;
            
            // Mark as checked to prevent re-processing
            container.classList.add('ypp-comment-checked');
            this.processedComments.add(container);

            const contentText = container.querySelector('#content-text');
            if (!contentText) return;

            const text = contentText.textContent;
            
            // Test against all spam patterns
            const isSpam = this.spamPatterns.some(pattern => pattern.test(text));
            
            if (isSpam) {
                container.classList.add('ypp-spam-comment');
                container.style.opacity = '0.35';
                container.style.transition = 'opacity 0.2s';
                
                // Add hover effect to read it if user wants
                container.addEventListener('mouseenter', () => container.style.opacity = '1');
                container.addEventListener('mouseleave', () => container.style.opacity = '0.35');

                // Visual Indicator
                const header = container.querySelector('#header-author, #author-thumbnail');
                if (header && !container.querySelector('.ypp-spam-label')) {
                    const label = document.createElement('span');
                    label.className = 'ypp-spam-label';
                    label.textContent = '[Likely Spam]';
                    label.style.color = '#ff5555';
                    label.style.fontSize = '12px';
                    label.style.marginLeft = '8px';
                    label.style.fontWeight = 'bold';
                    header.appendChild(label);
                }
                
                this.utils.log?.('Spam comment faded out', 'COMMENT');
            }
        });
    }
};
