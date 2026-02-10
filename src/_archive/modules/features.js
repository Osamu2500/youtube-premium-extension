/**
 * Features Module
 * Manages core extension features like theme, cinema mode, and snapshot
 * @module features
 */

import { SELECTORS, LOG_PREFIX, CSS_CLASSES } from '../constants.js';
import { Utils } from './utils.js';

/**
 * Manages application of various features based on settings
 * @class
 */
export class FeatureManager {
    /**
     * Creates a new FeatureManager instance
     */
    constructor() {
        /** @type {Object} Current feature settings */
        this.settings = {};
    }

    /**
     * Initialize features with settings
     * @param {Object} settings - Extension settings
     */
    init(settings) {
        this.settings = settings;
        this.apply();
        Utils.log('FeatureManager initialized', 'FEATURES');
    }

    /**
     * Apply all enabled features
     */
    apply() {
        if (!this.settings) return;

        try {
            this.togglePremiumTheme(this.settings.premiumTheme);
            if (this.settings.hideShorts) this.hideShorts();
            if (this.settings.autoCinema) this.autoCinemaMode();
            this.toggleHideComments(this.settings.hideComments);

            // New Features
            this.toggleMerch(this.settings.hideMerch);
            this.toggleEndScreens(this.settings.hideEndScreens);
            this.toggleBlueProgress(this.settings.blueProgress);

            // Community Features
            this.toggleZenMode(this.settings.zenMode);
            if (this.settings.enableSnapshot) this.addSnapshotButton();
            if (this.settings.enableLoop) this.addLoopButton();

            // Advanced Focus Features
            this.toggleHookFreeHome(this.settings.hookFreeHome);
            if (this.settings.studyMode) this.enableStudyMode();

            // New Filters
            this.toggleMixes(this.settings.hideMixes);
            this.toggleWatched(this.settings.hideWatched);

            // New Tools
            if (this.settings.enablePiP) this.addPiPButton();
            if (this.settings.enableTranscript) this.addTranscriptButton();

            // Productivity Suite
            this.toggleDopamineDetox(this.settings.dopamineDetox);

        } catch (error) {
            console.error(`${LOG_PREFIX.FEATURES} Error applying features:`, error);
        }
    }

    /**
     * Toggle Dopamine Detox (Grayscale)
     */
    toggleDopamineDetox(enable) {
        document.body.classList.toggle('ypp-dopamine-detox', enable);
    }

    /**
     * Toggle Hook Free Home (Algorithm Freeze)
     */
    toggleHookFreeHome(enable) {
        document.body.classList.toggle('ypp-hook-free-home', enable);
    }

    /**
     * Toggle Mixes
     */
    toggleMixes(enable) {
        document.body.classList.toggle('ypp-hide-mixes', enable);
    }

    /**
     * Toggle Watched Videos
     */
    toggleWatched(enable) {
        document.body.classList.toggle('ypp-hide-watched', enable);
    }

    /**
     * Enable Study Mode
     */
    enableStudyMode() {
        // Enforce Theater Mode
        this.autoCinemaMode();

        // Wait for video and set attributes
        const setStudyState = () => {
            const video = document.querySelector('video');
            if (video) {
                // Set Speed
                if (video.playbackRate !== 1.25) {
                    video.playbackRate = 1.25;
                }

                // Enable Captions
                this._enableCaptions();
            }
        };

        setStudyState();
        // Re-apply on navigation/video change
        setInterval(setStudyState, 2000);
    }

    _enableCaptions() {
        const subtitlesBtn = document.querySelector('.ytp-subtitles-button');
        // Check if button exists and is not pressed (aria-pressed="false")
        if (subtitlesBtn && subtitlesBtn.getAttribute('aria-pressed') === 'false') {
            subtitlesBtn.click();
        }
    }

    /**
     * Toggle Zen Mode
     */
    toggleZenMode(enable) {
        document.body.classList.toggle('ypp-zen-mode', enable);
        if (enable) {
            // Force theater mode for best experience
            this.autoCinemaMode();
        }
    }

    /**
     * Add Loop Button
     */
    addLoopButton() {
        // Logic to verify and add loop button (Stub for now)
        const controlsSelector = '.ytp-right-controls';
        const buttonSelector = '.ypp-loop-btn';

        const controls = document.querySelector(controlsSelector);

        if (controls && !document.querySelector(buttonSelector)) {
            this._insertLoopBtn(controls);
        } else {
            Utils.waitForElement(controlsSelector).then(foundControls => {
                if (foundControls && !document.querySelector(buttonSelector)) {
                    this._insertLoopBtn(foundControls);
                }
            });
        }
    }

    _insertLoopBtn(controls) {
        // Implementation for Loop Button Insertion
        try {
            const btn = document.createElement('button');
            btn.className = 'ytp-button ypp-loop-btn';
            btn.title = 'Loop Video';
            btn.innerHTML = `<svg height="100%" version="1.1" viewBox="0 0 36 36" width="100%"><path d="M7,18 L7,10 L15,10 L15,13 L10,13 L10,18 C10,22.418 13.582,26 18,26 C22.418,26 26,22.418 26,18 L29,18 C29,24.075 24.075,29 18,29 C11.925,29 7,24.075 7,18 Z M29,18 L29,26 L21,26 L21,23 L26,23 L26,18 C26,13.582 22.418,10 18,10 L18,7 C24.075,7 29,11.925 29,18 Z" fill="white"></path></svg>`;

            const video = document.querySelector('video');

            btn.onclick = () => {
                if (video) {
                    video.loop = !video.loop;
                    btn.querySelector('path').style.fill = video.loop ? '#3ea6ff' : 'white';
                }
            };

            if (controls.firstChild) {
                controls.insertBefore(btn, controls.firstChild);
            } else {
                controls.appendChild(btn);
            }
        } catch (error) {
            console.error(`${LOG_PREFIX.FEATURES} Error inserting loop button:`, error);
        }
    }

    /**
     * Toggle the premium theme
     * @param {boolean} enable - Whether to enable the theme
     */
    togglePremiumTheme(enable) {
        try {
            if (enable) {
                document.body.classList.add(CSS_CLASSES.THEME_ENABLED);
            } else {
                document.body.classList.remove(CSS_CLASSES.THEME_ENABLED);
            }
        } catch (error) {
            console.error(`${LOG_PREFIX.FEATURES} Error toggling theme:`, error);
        }
    }

    /**
     * Toggle Merch Shelves
     */
    toggleMerch(enable) {
        document.body.classList.toggle('ypp-hide-merch', enable);
    }

    /**
     * Toggle End Screens
     */
    toggleEndScreens(enable) {
        document.body.classList.toggle('ypp-hide-endscreens', enable);
    }

    /**
     * Toggle Blue Progress Bar
     */
    toggleBlueProgress(enable) {
        document.body.classList.toggle('ypp-blue-progress', enable);
    }

    /**
     * Hide all Shorts content
     */
    hideShorts() {
        const selectors = [
            SELECTORS.SHORTS_SECTION,
            SELECTORS.SHORTS_LINK,
            SELECTORS.SHORTS_SHELF
        ];

        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                el.style.display = 'none';
            });
        });
    }

    /**
     * Enable Auto Cinema Mode
     */
    autoCinemaMode() {
        try {
            const theaterBtn = document.querySelector(SELECTORS.THEATER_BUTTON);
            if (theaterBtn) {
                const isTheater = document.querySelector(`${SELECTORS.WATCH_FLEXY}[theater]`);
                if (!isTheater) {
                    theaterBtn.click();
                }
            }
        } catch (error) {
            console.error(`${LOG_PREFIX.FEATURES} Error in autoCinemaMode:`, error);
        }
    }

    /**
     * Toggle visibility of comments section
     * @param {boolean} hide - Whether to hide comments
     */
    toggleHideComments(hide) {
        try {
            const comments = document.querySelector(SELECTORS.COMMENTS_SECTION);
            if (comments) {
                comments.style.display = hide ? 'none' : 'block';
            }
        } catch (error) {
            console.error(`${LOG_PREFIX.FEATURES} Error toggling comments:`, error);
        }
    }

    /**
     * Add snapshot button to player controls
     */
    addSnapshotButton() {
        const controlsSelector = '.ytp-right-controls';
        const buttonSelector = '.ypp-snapshot-btn';

        const controls = document.querySelector(controlsSelector);

        if (controls && !document.querySelector(buttonSelector)) {
            this._insertSnapshotBtn(controls);
        } else {
            Utils.waitForElement(controlsSelector).then(foundControls => {
                if (foundControls && !document.querySelector(buttonSelector)) {
                    this._insertSnapshotBtn(foundControls);
                }
            });
        }
    }

    /**
     * Insert the snapshot button into DOM
     * @param {HTMLElement} controls - Parent container
     * @private
     */
    _insertSnapshotBtn(controls) {
        try {
            const btn = document.createElement('button');
            btn.className = 'ytp-button ypp-snapshot-btn';
            btn.title = 'Take Snapshot';
            btn.innerHTML = `<svg height="100%" version="1.1" viewBox="0 0 36 36" width="100%"><path d="M10,20 C10,24.418 13.582,28 18,28 C22.418,28 26,24.418 26,20 C26,15.582 22.418,12 18,12 C13.582,12 10,15.582 10,20 Z" fill="white"></path></svg>`;
            btn.style.opacity = '1';
            btn.onclick = () => this._takeSnapshot();

            if (controls.firstChild) {
                controls.insertBefore(btn, controls.firstChild);
            } else {
                controls.appendChild(btn);
            }
        } catch (error) {
            console.error(`${LOG_PREFIX.FEATURES} Error inserting snapshot button:`, error);
        }
    }

    /**
     * Take a snapshot of the current video
     * @private
     */
    _takeSnapshot() {
        const video = document.querySelector('video');
        if (video) {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                const dataUrl = canvas.toDataURL('image/png');
                const a = document.createElement('a');
                a.href = dataUrl;
                a.download = `yt-snapshot-${Date.now()}.png`;
                a.click();
            } catch (e) {
                console.error(`${LOG_PREFIX.FEATURES} Snapshot failed:`, e);
            }
        }
    }
    /**
     * Add Picture-in-Picture Button
     */
    addPiPButton() {
        const controlsSelector = '.ytp-right-controls';
        const buttonSelector = '.ypp-pip-btn';

        const controls = document.querySelector(controlsSelector);
        if (controls && !document.querySelector(buttonSelector)) {
            this._insertPiPBtn(controls);
        } else {
            Utils.waitForElement(controlsSelector).then(found => {
                if (found && !document.querySelector(buttonSelector)) {
                    this._insertPiPBtn(found);
                }
            });
        }
    }

    _insertPiPBtn(controls) {
        const btn = document.createElement('button');
        btn.className = 'ytp-button ypp-pip-btn';
        btn.title = 'Picture-in-Picture';
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="white" width="100%" height="100%"><path d="M19 7h-8v6h8V7zm2-4H3c-1.1 0-2 .9-2 2v14c0 1.1.9 1.98 2 1.98h18c1.1 0 2-.88 2-1.98V5c0-1.1-.9-2-2-2zm0 16.01H3V4.98h18v14.03z"/></svg>`;

        btn.onclick = () => {
            const video = document.querySelector('video');
            if (video) {
                if (document.pictureInPictureElement) {
                    document.exitPictureInPicture();
                } else {
                    video.requestPictureInPicture();
                }
            }
        };

        if (controls.firstChild) {
            controls.insertBefore(btn, controls.firstChild);
        } else {
            controls.appendChild(btn);
        }
    }

    /**
     * Add Transcript Button
     */
    addTranscriptButton() {
        // Needs to be placed near metadata
        const targetSelector = '#below #title';
        const buttonSelector = '.ypp-transcript-btn';

        Utils.waitForElement(targetSelector).then(target => {
            if (target && !document.querySelector(buttonSelector)) {
                const btn = document.createElement('button');
                btn.className = 'ypp-transcript-btn';
                btn.textContent = 'Copy Transcript';
                btn.style.cssText = `
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 18px;
                    padding: 6px 12px;
                    color: white;
                    font-size: 13px;
                    cursor: pointer;
                    margin-left: 10px;
                    display: inline-flex;
                    align-items: center;
                    backdrop-filter: blur(5px);
                 `;

                btn.onclick = async () => {
                    // 1. Open description if needed to find transcript button
                    // This is complex as transcript logic varies. 
                    // For MVP, we'll try to find the open transcript button or alert

                    btn.textContent = 'Coming Soon';
                    setTimeout(() => btn.textContent = 'Copy Transcript', 2000);
                };

                target.appendChild(btn);
            }
        });
    }
}

// Backward compatibility
if (typeof window !== 'undefined') {
    window.FeatureManager = FeatureManager;
    window.Features = new FeatureManager();
}
