window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

/**
 * Player Controls Helper
 * Handles creation and interactions of custom player buttons (Speed, PiP).
 */
window.YPP.features.PlayerControls = class PlayerControls {
    constructor(playerFeature) {
        this.player = playerFeature;
        this.utils = window.YPP.Utils;
    }

    createSpeedControls(video) {
        const container = document.createElement('div');
        container.className = 'ypp-speed-controls';
        ['1', '1.5', '2', '3'].forEach(rate => {
            const btn = document.createElement('button');
            btn.className = 'ypp-speed-btn';
            btn.textContent = rate + 'x';
            btn.dataset.speed = rate;
            if (video.playbackRate === parseFloat(rate)) btn.classList.add('active');
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const newSpeed = parseFloat(rate);
                const vsc = window.YPP.featureManager?.getFeature('videoSpeedController');
                
                if (vsc) {
                    if (!vsc.controllers.has(video)) vsc.attachToVideo(video);
                    vsc.setSpeed(video, newSpeed);
                } else {
                    video.playbackRate = newSpeed;
                }
                
                this.updateSpeedButtons(container, rate);
            });
            container.appendChild(btn);
        });
        return container;
    }

    createPiPButton(video) {
        const icon = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="#fff"><path d="M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z"/></svg>`;
        const btn = this.createButton(icon, 'Picture-in-Picture', async () => {
            try {
                if (document.pictureInPictureElement) {
                    await document.exitPictureInPicture();
                } else {
                    await video.requestPictureInPicture();
                }
            } catch (e) {
                this.utils?.log?.('[YPP:PLAYER] PiP failed: ' + e.message, 'PLAYER', 'error');
            }
        });
        video.addEventListener('enterpictureinpicture', () => btn.classList.add('active'));
        video.addEventListener('leavepictureinpicture', () => btn.classList.remove('active'));
        return btn;
    }

    createButton(svgContent, title, onClick) {
        const btn = document.createElement('button');
        btn.innerHTML = svgContent;
        btn.title = title;
        btn.className = 'ypp-action-btn';
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            onClick(e);
        });
        return btn;
    }

    createGenericToggleButton(svgContent, title, settingKey, currentValue, onChange) {
        const btn = this.createButton(svgContent, title, (e) => {
            const newState = !btn.classList.contains('active');
            btn.classList.toggle('active', newState);
            if (window.YPP.Utils && window.YPP.Utils.saveSettings) {
                window.YPP.Utils.saveSettings({ [settingKey]: newState });
            }
            if (onChange) onChange(newState);
        });
        if (currentValue) btn.classList.add('active');
        return btn;
    }



    updateSpeedButtons(container, activeSpeed) {
        container.querySelectorAll('.ypp-speed-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.speed === activeSpeed);
        });
    }
};
