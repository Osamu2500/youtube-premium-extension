// popup-components.js — Specialized component initializers

export function initComponents(document, state, ui, updateSetting, notifyThemeChange, saveSettings) {
    
    function applyThemeToPopup(themeKey) {
        if (themeKey === 'system') {
            const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            themeKey = isDark ? 'midnight' : 'default';
        }
        document.documentElement.setAttribute('data-ypp-theme', themeKey);
        document.documentElement.classList.add('yt-premium-plus-theme');
        const link = document.getElementById('ypp-active-theme-css');
        if (link) link.remove();
    }

    function initThemeSelector(currentTheme) {
        const themeGrid = document.getElementById('themeGrid');
        if (!themeGrid) return;
        themeGrid.innerHTML = '';

        const themes = [
            { key: 'system', label: 'System Auto', meta: 'Follows OS', color: 'split' },
            { key: 'default', label: 'YouTube Dark', meta: 'Default', color: '#0f0f0f' },
            { key: 'ocean', label: 'Ocean Blue', meta: 'Deep Blue', color: '#051421' },
            { key: 'sunset', label: 'Sunset Glow', meta: 'Warm', color: '#1a0b1a' },
            { key: 'dracula', label: 'Dracula', meta: 'High Contrast', color: '#282a36' },
            { key: 'midnight', label: 'Midnight', meta: 'OLED Black', color: '#000000' },
            { key: 'forest', label: 'Forest', meta: 'Green', color: '#0f1c15' },
            { key: 'cherry', label: 'Cherry', meta: 'Pink', color: '#26181b' },
            { key: 'coffee', label: 'Coffee', meta: 'Latte', color: '#2a201c' },
            { key: 'cyberpunk', label: 'Cyberpunk', meta: 'Neon', color: '#0a0a0f' },
            { key: 'nord', label: 'Nord', meta: 'Frost', color: '#2e3440' }
        ];

        themes.forEach(theme => {
            const btn = document.createElement('div');
            btn.className = `theme-btn ${theme.key === currentTheme ? 'active' : ''}`;
            btn.dataset.theme = theme.key;
            
            const preview = document.createElement('div');
            preview.className = `theme-preview ${theme.key === 'system' ? 'split' : ''}`;
            if (theme.key !== 'system') preview.style.backgroundColor = theme.color;
            
            const info = document.createElement('div');
            info.className = 'theme-info';
            info.innerHTML = `
                <span class="theme-name">${theme.label}</span>
                <span class="theme-meta">${theme.meta}</span>
            `;

            btn.appendChild(preview);
            btn.appendChild(info);

            btn.addEventListener('click', () => {
                document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const newTheme = theme.key;
                updateSetting('activeTheme', newTheme);
                applyThemeToPopup(newTheme);
                notifyThemeChange(newTheme);
            });

            themeGrid.appendChild(btn);
        });
        
        applyThemeToPopup(currentTheme);
    }

    function initPremiumAccentDropdown() {
        const select = document.getElementById('premiumAccentSelect');
        const colorPicker = document.getElementById('accentColor');
        if (!select || !colorPicker) return;

        if (window.YPP && window.YPP.CONSTANTS && window.YPP.CONSTANTS.PREMIUM_COLORS) {
            const colors = window.YPP.CONSTANTS.PREMIUM_COLORS;
            for (const [key, hex] of Object.entries(colors)) {
                const label = key.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                const opt = document.createElement('option');
                opt.value = hex;
                opt.textContent = label;
                select.appendChild(opt);
            }
        }

        select.addEventListener('change', () => {
            if (select.value) {
                colorPicker.value = select.value;
                colorPicker.dispatchEvent(new Event('input'));
            }
        });

        colorPicker.addEventListener('input', () => {
            select.value = colorPicker.value || '';
        });

        setTimeout(() => {
            select.value = colorPicker.value || '';
        }, 100);
    }

    function initSearchViewMode() {
        const container = document.getElementById('searchViewModeToggle');
        if (!container) return;

        const btns = container.querySelectorAll('.view-mode-btn');

        const applyActiveState = (mode) => {
            btns.forEach(b => {
                const isActive = b.dataset.mode === mode;
                b.classList.toggle('active', isActive);
                b.style.background = isActive ? 'rgba(62,166,255,0.22)' : 'transparent';
                b.style.color = isActive ? '#ff4e45' : 'rgba(255,255,255,0.5)';
            });
        };

        chrome.storage.local.get(['searchViewMode'], (result) => {
            const savedMode = result.searchViewMode || localStorage.getItem('ypp_searchViewMode') || 'grid';
            applyActiveState(savedMode);
        });

        btns.forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                applyActiveState(mode);

                chrome.storage.local.set({ searchViewMode: mode });
                localStorage.setItem('ypp_searchViewMode', mode);

                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    const tab = tabs[0];
                    if (tab && tab.url && tab.url.includes('youtube.com/results')) {
                        chrome.tabs.sendMessage(tab.id, {
                            type: 'YPP_SET_SEARCH_VIEW_MODE',
                            mode: mode
                        }).catch(() => {});
                    }
                });
            });
        });
    }


    function initHideWatchedModePill() {
        const btns = document.querySelectorAll('.hw-mode-btn');
        const hiddenInput = document.getElementById('hideWatchedMode');
        if (!btns.length || !hiddenInput) return;

        const applyMode = (mode) => {
            hiddenInput.value = mode;
            btns.forEach(b => {
                const isActive = b.dataset.mode === mode;
                b.classList.toggle('active', isActive);
                b.style.background = isActive ? 'rgba(62,166,255,0.22)' : 'transparent';
                b.style.color = isActive ? 'var(--accent, #3ea6ff)' : 'rgba(255,255,255,0.5)';
            });
        };

        chrome.storage.local.get('settings', (data) => {
            const mode = data.settings?.hideWatchedMode || 'dim';
            applyMode(mode);
        });

        btns.forEach(btn => {
            btn.addEventListener('click', () => {
                applyMode(btn.dataset.mode);
                saveSettings(() => ui.showSaveIndicator(document));
            });
        });
    }

    function initAccentColorSwatches() {
        const swatches = document.querySelectorAll('.color-swatch[data-color]');
        const customInput = document.getElementById('accentColor');
        if (!customInput) return;

        const applySwatchActive = (color) => {
            let foundMatch = false;
            swatches.forEach(swatch => {
                const isActive = swatch.dataset.color.toLowerCase() === color.toLowerCase();
                swatch.classList.toggle('active', isActive);
                if (isActive) foundMatch = true;
            });
            if (!foundMatch) {
                customInput.value = color;
                customInput.previousElementSibling.classList.add('active');
            } else {
                customInput.previousElementSibling.classList.remove('active');
            }
        };

        chrome.storage.local.get('settings', (data) => {
            const color = data.settings?.accentColor || '#ff4e45';
            applySwatchActive(color);
        });

        swatches.forEach(swatch => {
            swatch.addEventListener('click', () => {
                const color = swatch.dataset.color;
                customInput.value = color;
                applySwatchActive(color);
                const event = new Event('change', { bubbles: true });
                customInput.dispatchEvent(event);
            });
        });

        customInput.addEventListener('input', () => {
            applySwatchActive(customInput.value);
        });
    }

    // Export these for external triggering if needed
    return {
        initThemeSelector,
        initPremiumAccentDropdown,
        initSearchViewMode,
        initHideWatchedModePill,
        initAccentColorSwatches,
        applyThemeToPopup
    };
}
