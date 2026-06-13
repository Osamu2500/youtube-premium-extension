window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

/**
 * Square Corners
 * Gives all video thumbnails sharp square edges.
 */
window.YPP.features.SquareCorners = class SquareCorners extends window.YPP.features.BaseFeature {
    constructor() {
        super('SquareCorners');
        this.CONSTANTS = window.YPP.CONSTANTS || {};
        this.CSS_CLASS = this.CONSTANTS.CSS_CLASSES?.SQUARE_CORNERS || 'ypp-square-corners';
    }

    getConfigKey() {
        return 'useSquareCorners';
    }

    async enable() {
        document.documentElement.classList.add(this.CSS_CLASS);
        document.body.classList.add(this.CSS_CLASS);
        
        // Inject CSS if not already present
        if (!document.getElementById('ypp-square-corners-css')) {
            const style = document.createElement('style');
            style.id = 'ypp-square-corners-css';
            style.textContent = `
                .${this.CSS_CLASS} ytd-thumbnail,
                .${this.CSS_CLASS} ytd-playlist-thumbnail,
                .${this.CSS_CLASS} .ytp-videowall-still-image,
                .${this.CSS_CLASS} yt-img-shadow,
                .${this.CSS_CLASS} #thumbnail.ytd-rich-grid-media,
                .${this.CSS_CLASS} yt-image,
                .${this.CSS_CLASS} .yt-core-image {
                    border-radius: 0 !important;
                }
            `;
            document.head.appendChild(style);
        }
    }

    async disable() {
        document.documentElement.classList.remove(this.CSS_CLASS);
        document.body.classList.remove(this.CSS_CLASS);
        const style = document.getElementById('ypp-square-corners-css');
        if (style) {
            style.remove();
        }
    }
};
