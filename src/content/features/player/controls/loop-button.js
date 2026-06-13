// @ts-nocheck
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.LoopButton = class LoopButton extends window.YPP.features.BaseFeature {
    constructor() {
        super('LoopButton');
    }

    getConfigKey() {
        return 'enableLoop';
    }

    createButton(video) {
        const icon = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="#fff"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v6z"/></svg>`;
        const btn = document.createElement('button');
        btn.innerHTML = icon;
        btn.title = 'Loop Video';
        btn.className = 'ypp-action-btn';
        
        if (this.settings?.loop || video.loop) {
            btn.classList.add('active');
            video.loop = true;
        }

        this.addListener(btn, 'click', (e) => {
            e.stopPropagation();
            this.toggleLoop(video, btn);
        });
        
        return btn;
    }

    toggleLoop(video, btn) {
        if (!video) return;
        
        video.loop = !video.loop;
        
        if (video.loop) {
            btn.classList.add('active');
            if (this.utils?.createToast) this.utils.createToast('Loop enabled');
        } else {
            btn.classList.remove('active');
            if (this.utils?.createToast) this.utils.createToast('Loop disabled');
        }
    }
};
