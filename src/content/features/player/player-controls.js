window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

/**
 * Player Controls Helper
 * Handles creation and interactions of custom player buttons (Snapshot, Loop, Speed, PiP).
 */
window.YPP.features.PlayerControls = class PlayerControls {
    constructor(playerFeature) {
        this.player = playerFeature;
        this.utils = window.YPP.Utils;
    }

    createSnapshotButton(video) {
        const icon = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="#fff"><path d="M12 9c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zM9 9c0-1.66 1.34-3 3-3s3 1.34 3 3-1.34 3-3 3-3-1.34-3-3z"/><path d="M20 4h-3.17L15 2H9L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h4.05l.59-.65L9.88 4h4.24l1.24 1.35.59.65H20v12zM12 17c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0-8c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3z"/></svg>`;
        return this.createButton(icon, 'Take Snapshot', () => this.takeSnapshot(video));
    }

    createLoopButton(video) {
        const icon = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="#fff"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v6z"/></svg>`;
        const btn = this.createButton(icon, 'Loop Video', () => this.toggleLoop(video, btn));
        if (this.player.settings.loop || video.loop) {
            btn.classList.add('active');
            video.loop = true;
        }
        return btn;
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
            this.player.addListener(btn, 'click', (e) => {
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
        this.player.addListener(video, 'enterpictureinpicture', () => btn.classList.add('active'));
        this.player.addListener(video, 'leavepictureinpicture', () => btn.classList.remove('active'));
        return btn;
    }

    createButton(svgContent, title, onClick) {
        const btn = document.createElement('button');
        btn.innerHTML = svgContent;
        btn.title = title;
        btn.className = 'ypp-action-btn';
        this.player.addListener(btn, 'click', (e) => {
            e.stopPropagation();
            onClick(e);
        });
        return btn;
    }

    takeSnapshot(video) {
        if (!video.paused) {
            video.pause();
        }

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        
        try {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        } catch (e) {
            alert('Cannot capture snapshot (Content might be DRM protected or not fully loaded).');
            return;
        }

        // Create overlay container
        const overlay = document.createElement('div');
        overlay.className = 'ypp-snapshot-overlay ypp-glass-panel';
        overlay.style.cssText = `
            position: absolute; inset: 0; z-index: 9999;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            background: rgba(0,0,0,0.7); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
            padding: 24px; animation: yppFadeIn 0.2s ease-out;
        `;

        // Canvas preview wrapper
        const previewWrap = document.createElement('div');
        previewWrap.style.cssText = `
            position: relative; max-width: 90%; max-height: 70%;
            border-radius: 12px; overflow: hidden; box-shadow: 0 12px 48px rgba(0,0,0,0.5);
            margin-bottom: 24px; border: 1px solid rgba(255,255,255,0.1);
        `;
        
        canvas.style.cssText = `display: block; width: 100%; height: 100%; object-fit: contain;`;
        previewWrap.appendChild(canvas);

        // Actions container
        const actions = document.createElement('div');
        actions.style.cssText = `display: flex; gap: 12px;`;

        const btnStyle = `
            padding: 10px 16px; border: none; border-radius: 8px; cursor: pointer;
            font-family: 'Inter', Roboto, sans-serif; font-weight: 600; font-size: 13px;
            transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
            color: #fff;
        `;

        const copyBtn = document.createElement('button');
        copyBtn.textContent = 'Copy to Clipboard';
        copyBtn.style.cssText = btnStyle + `background: linear-gradient(135deg, #6366f1, #a855f7); box-shadow: 0 4px 12px rgba(99,102,241,0.3);`;
        copyBtn.onmouseover = () => copyBtn.style.transform = 'translateY(-2px)';
        copyBtn.onmouseout = () => copyBtn.style.transform = 'translateY(0)';
        
        copyBtn.onclick = () => {
            canvas.toBlob(blob => {
                if (blob) {
                    const item = new ClipboardItem({ 'image/png': blob });
                    navigator.clipboard.write([item]).then(() => {
                        copyBtn.textContent = 'Copied!';
                        setTimeout(() => closeOverlay(), 1000);
                    }).catch(err => alert('Failed to copy: ' + err));
                }
            }, 'image/png');
        };

        const downloadBtn = document.createElement('button');
        downloadBtn.textContent = 'Download PNG';
        downloadBtn.style.cssText = btnStyle + `background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);`;
        downloadBtn.onmouseover = () => { downloadBtn.style.transform = 'translateY(-2px)'; downloadBtn.style.background = 'rgba(255,255,255,0.15)'; };
        downloadBtn.onmouseout = () => { downloadBtn.style.transform = 'translateY(0)'; downloadBtn.style.background = 'rgba(255,255,255,0.1)'; };

        downloadBtn.onclick = () => {
            const link = document.createElement('a');
            link.download = `youtube-snapshot-${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            closeOverlay();
        };

        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close';
        closeBtn.style.cssText = btnStyle + `background: transparent; color: rgba(255,255,255,0.6);`;
        closeBtn.onmouseover = () => closeBtn.style.color = '#fff';
        closeBtn.onmouseout = () => closeBtn.style.color = 'rgba(255,255,255,0.6)';
        
        const closeOverlay = () => {
            overlay.style.animation = 'yppFadeOut 0.2s ease-in forwards';
            setTimeout(() => overlay.remove(), 200);
        };
        closeBtn.onclick = closeOverlay;

        actions.appendChild(copyBtn);
        actions.appendChild(downloadBtn);
        actions.appendChild(closeBtn);

        overlay.appendChild(previewWrap);
        overlay.appendChild(actions);

        // Inject into player container
        const playerContainer = video.closest('.html5-video-player');
        if (playerContainer) {
            // Add keyframes if not present
            if (!document.getElementById('ypp-snapshot-styles')) {
                const style = document.createElement('style');
                style.id = 'ypp-snapshot-styles';
                style.textContent = `
                    @keyframes yppFadeIn { from { opacity: 0; backdrop-filter: blur(0px); } to { opacity: 1; backdrop-filter: blur(12px); } }
                    @keyframes yppFadeOut { from { opacity: 1; backdrop-filter: blur(12px); } to { opacity: 0; backdrop-filter: blur(0px); } }
                `;
                document.head.appendChild(style);
            }
            playerContainer.appendChild(overlay);
        }
    }

    toggleLoop(video, btn) {
        video.loop = !video.loop;
        btn.classList.toggle('active', video.loop);
    }

    updateSpeedButtons(container, activeSpeed) {
        container.querySelectorAll('.ypp-speed-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.speed === activeSpeed);
        });
    }
};
