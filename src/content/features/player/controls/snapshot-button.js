// @ts-nocheck
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.SnapshotButton = class SnapshotButton extends window.YPP.features.BaseFeature {
    constructor() {
        super('SnapshotButton');
    }

    getConfigKey() {
        return 'enableSnapshot';
    }

    createButton(video) {
        const icon = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="#fff"><path d="M12 9c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zM9 9c0-1.66 1.34-3 3-3s3 1.34 3 3-1.34 3-3 3-3-1.34-3-3z"/><path d="M20 4h-3.17L15 2H9L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h4.05l.59-.65L9.88 4h4.24l1.24 1.35.59.65H20v12zM12 17c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0-8c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3z"/></svg>`;
        const btn = document.createElement('button');
        btn.innerHTML = icon;
        btn.title = 'Take Snapshot';
        btn.className = 'ypp-action-btn';
        
        this.addListener(btn, 'click', (e) => {
            e.stopPropagation();
            this.takeSnapshot(video);
        });
        
        return btn;
    }

    takeSnapshot(video) {
        if (!video) return;
        
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
                    const item = new window.ClipboardItem({ 'image/png': blob });
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
            let title = document.title.replace(/ - YouTube$/, '').trim();
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T');
            const timeStr = `${timestamp[0]}_${timestamp[1].substring(0,6)}`;

            const link = document.createElement('a');
            link.download = `YPP_Snapshot_${title}_${timeStr}.png`;
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
};
