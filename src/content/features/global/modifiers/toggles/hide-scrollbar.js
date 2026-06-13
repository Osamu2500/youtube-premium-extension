window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.HideScrollbar = class HideScrollbar extends window.YPP.features.BaseToggleFeature {
    constructor() {
        super('HideScrollbar', 'hideScrollbar', 'ypp-hide-scrollbar');
    }

    async enable() {
        super.enable();
        document.documentElement.classList.toggle('ypp-hide-scrollbar', true);
        
        let styleNode = document.getElementById('ypp-hide-scrollbar-style');
        if (!styleNode) {
            styleNode = document.createElement('style');
            styleNode.id = 'ypp-hide-scrollbar-style';
            styleNode.textContent = `
                ::-webkit-scrollbar {
                    display: none !important;
                    width: 0px !important;
                    height: 0px !important;
                    background: transparent !important;
                    -webkit-appearance: none !important;
                }
                * {
                    scrollbar-width: none !important;
                }
            `;
            document.documentElement.appendChild(styleNode);
        }
    }

    async disable() {
        super.disable();
        document.documentElement.classList.toggle('ypp-hide-scrollbar', false);
        
        const styleNode = document.getElementById('ypp-hide-scrollbar-style');
        if (styleNode) {
            styleNode.remove();
        }
    }
};
