// popup-components.js — Specialized component initializers

export function initComponents(document, state, ui, updateSetting, notifyThemeChange, saveSettings) {
    
    function applyThemeToPopup(themeKey, customThemesObj = null) {
        if (themeKey === 'system') {
            const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            themeKey = isDark ? 'midnight' : 'default';
        }
        document.documentElement.setAttribute('data-ypp-theme', themeKey);
        document.documentElement.classList.add('yt-premium-plus-theme');
        const link = document.getElementById('ypp-active-theme-css');
        if (link) link.remove();
        
        const applyCustom = (themes) => {
            let style = document.getElementById('ypp-custom-theme-style');
            if (style) style.remove();
            
            if (themeKey.startsWith('custom_') && themes && themes[themeKey]) {
                const theme = themes[themeKey];
                style = document.createElement('style');
                style.id = 'ypp-custom-theme-style';
                const cssVars = Object.entries(theme.variables || {})
                    .map(([k, v]) => `${k}: ${v} !important;`)
                    .join('\n');
                style.textContent = `:root {\n${cssVars}\n}`;
                document.head.appendChild(style);
            }
        };

        if (customThemesObj) {
            applyCustom(customThemesObj);
        } else if (themeKey.startsWith('custom_')) {
            chrome.storage.local.get('settings', (data) => {
                applyCustom(data.settings?.customThemes);
            });
        } else {
            applyCustom({});
        }
    }

    function initThemeSelector(currentTheme) {
        const themeGrid = document.getElementById('themeGrid');
        if (!themeGrid) return;

        const themeCategories = [
            {
                name: 'System',
                themes: [
                    { key: 'system', label: 'System Auto', meta: 'Follows OS', color: 'split' },
                    { key: 'default', label: 'YouTube Dark', meta: 'Default', color: '#0f0f0f' },
                    { key: 'midnight', label: 'Midnight', meta: 'OLED Black', color: '#000000' }
                ]
            },
            {
                name: 'Colors',
                themes: [
                    { key: 'ocean', label: 'Ocean Blue', meta: 'Deep Blue', color: '#051421' },
                    { key: 'sunset', label: 'Sunset Glow', meta: 'Warm', color: '#1a0b1a' },
                    { key: 'forest', label: 'Forest', meta: 'Green', color: '#0f1c15' },
                    { key: 'cherry', label: 'Cherry', meta: 'Pink', color: '#26181b' },
                    { key: 'coffee', label: 'Coffee', meta: 'Latte', color: '#2a201c' }
                ]
            },
            {
                name: 'Dark & Moody',
                themes: [
                    { key: 'dracula', label: 'Dracula', meta: 'High Contrast', color: '#282a36' },
                    { key: 'nord', label: 'Nord', meta: 'Frost', color: '#2e3440' },
                    { key: 'discord', label: 'Discord Dark', meta: 'Chat', color: '#36393f' },
                    { key: 'hacker', label: 'Hacker Green', meta: 'Terminal', color: '#0a140a' },
                    { key: 'bloodmoon', label: 'Blood Moon', meta: 'Crimson', color: '#1a0505' },
                    { key: 'abyss', label: 'Abyss', meta: 'Deep Sea', color: '#01080a' },
                    { key: 'ember', label: 'Ember', meta: 'Hot Coals', color: '#141414' }
                ]
            },
            {
                name: 'Sci-Fi & Retro',
                themes: [
                    { key: 'cyberpunk', label: 'Cyberpunk', meta: 'Neon', color: '#0a0a0f' },
                    { key: 'outrun', label: 'Outrun Synth', meta: '80s Retro', color: '#1a0524' },
                    { key: 'deepspace', label: 'Deep Space', meta: 'Nebula', color: '#020205' },
                    { key: 'nebula', label: 'Nebula', meta: 'Purple Space', color: '#0f0518' },
                    { key: 'hologram', label: 'Hologram', meta: 'Sci-Fi Cyan', color: '#e0f7fa' }
                ]
        ];

        chrome.storage.local.get('settings', (data) => {
            const customThemesObj = data.settings?.customThemes || {};
            const customThemes = Object.keys(customThemesObj).map(k => ({
                key: k,
                label: customThemesObj[k].name || 'Custom Theme',
                meta: 'Custom',
                color: customThemesObj[k].variables['--ypp-bg-base'] || '#000000',
                isCustom: true
            }));

            if (customThemes.length > 0) {
                themeCategories.unshift({
                    name: 'Custom Themes',
                    themes: customThemes
                });
            }

            themeGrid.innerHTML = '';
            themeGrid.style.display = 'flex';
            themeGrid.style.flexDirection = 'column';
            themeGrid.style.gap = '16px';
            
            themeCategories.forEach(category => {
                const categoryWrapper = document.createElement('div');
                categoryWrapper.className = 'theme-category-wrapper';
                
                const groupLabel = document.createElement('div');
                groupLabel.className = 'theme-group-label';
                groupLabel.textContent = category.name;
                groupLabel.style.width = '100%';
                groupLabel.style.fontSize = '11px';
                groupLabel.style.color = 'rgba(255,255,255,0.4)';
                groupLabel.style.textTransform = 'uppercase';
                groupLabel.style.letterSpacing = '0.05em';
                groupLabel.style.marginBottom = '8px';
                groupLabel.style.fontWeight = '600';
                categoryWrapper.appendChild(groupLabel);

                const innerGrid = document.createElement('div');
                innerGrid.className = 'theme-grid-inner';
                innerGrid.style.display = 'grid';
                innerGrid.style.gridTemplateColumns = 'repeat(3, 1fr)';
                innerGrid.style.gap = '8px';
                innerGrid.style.width = '100%';
                
                category.themes.forEach(theme => {
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

                    if (theme.isCustom) {
                        const delBtn = document.createElement('button');
                        delBtn.innerHTML = '✕';
                        delBtn.style.position = 'absolute';
                        delBtn.style.top = '4px';
                        delBtn.style.right = '4px';
                        delBtn.style.background = 'rgba(0,0,0,0.5)';
                        delBtn.style.border = 'none';
                        delBtn.style.color = '#fff';
                        delBtn.style.borderRadius = '50%';
                        delBtn.style.width = '16px';
                        delBtn.style.height = '16px';
                        delBtn.style.fontSize = '10px';
                        delBtn.style.cursor = 'pointer';
                        delBtn.style.display = 'none';
                        
                        btn.style.position = 'relative';
                        btn.addEventListener('mouseenter', () => delBtn.style.display = 'block');
                        btn.addEventListener('mouseleave', () => delBtn.style.display = 'none');
                        
                        delBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            if (confirm('Delete this custom theme?')) {
                                chrome.storage.local.get('settings', (d) => {
                                    const st = d.settings || {};
                                    if (st.customThemes) {
                                        delete st.customThemes[theme.key];
                                    }
                                    if (st.activeTheme === theme.key) {
                                        st.activeTheme = 'default';
                                    }
                                    chrome.storage.local.set({ settings: st }, () => {
                                        initThemeSelector(st.activeTheme);
                                        applyThemeToPopup(st.activeTheme, st.customThemes);
                                        notifyThemeChange(st.activeTheme);
                                        chrome.tabs.query({active: true}, (tabs) => {
                                            chrome.tabs.sendMessage(tabs[0].id, {
                                                type: 'UPDATE_SETTINGS',
                                                settings: st
                                            }).catch(() => {});
                                        });
                                    });
                                });
                            }
                        });
                        btn.appendChild(delBtn);
                    }

                    btn.addEventListener('click', () => {
                        document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');
                        const newTheme = theme.key;
                        updateSetting('activeTheme', newTheme);
                        applyThemeToPopup(newTheme, customThemesObj);
                        notifyThemeChange(newTheme);
                    });

                    innerGrid.appendChild(btn);
                });
                
                categoryWrapper.appendChild(innerGrid);
                themeGrid.appendChild(categoryWrapper);
            });

            applyThemeToPopup(currentTheme, customThemesObj);
        });
    }

    function initCustomThemeBuilder() {
        const saveBtn = document.getElementById('saveCustomThemeBtn');
        const exportBtn = document.getElementById('exportCustomThemeBtn');
        const importBtn = document.getElementById('importCustomThemeBtn');
        const importFile = document.getElementById('importCustomThemeFile');
        
        if (!saveBtn) return;
        
        saveBtn.addEventListener('click', () => {
            const nameInput = document.getElementById('customThemeName');
            const bgBase = document.getElementById('customThemeBgBase').value;
            const bgSurface = document.getElementById('customThemeBgSurface').value;
            const accent = document.getElementById('customThemeAccent').value;
            const text = document.getElementById('customThemeText').value;
            
            let name = nameInput.value.trim();
            if (!name) name = 'My Custom Theme';
            
            const themeKey = 'custom_' + Date.now();
            
            chrome.storage.local.get('settings', (data) => {
                const settings = data.settings || {};
                if (!settings.customThemes) settings.customThemes = {};
                
                settings.customThemes[themeKey] = {
                    name: name,
                    variables: {
                        '--ypp-bg-base': bgBase,
                        '--ypp-bg-surface': bgSurface,
                        '--ypp-accent-primary': accent,
                        '--ypp-text-primary': text,
                        '--ypp-bg-card': bgSurface,
                        '--ypp-text-secondary': text + 'b3', // slightly transparent text
                    }
                };
                
                settings.activeTheme = themeKey;
                
                chrome.storage.local.set({ settings }, () => {
                    initThemeSelector(themeKey);
                    applyThemeToPopup(themeKey, settings.customThemes);
                    notifyThemeChange(themeKey);
                    nameInput.value = '';
                    
                    if (ui && ui.showSaveIndicator) ui.showSaveIndicator(document);
                    
                    chrome.tabs.query({active: true}, (tabs) => {
                        chrome.tabs.sendMessage(tabs[0].id, {
                            type: 'UPDATE_SETTINGS',
                            settings
                        }).catch(() => {});
                    });
                });
            });
        });

        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                chrome.storage.local.get('settings', (data) => {
                    const customThemes = data.settings?.customThemes || {};
                    if (Object.keys(customThemes).length === 0) {
                        alert('No custom themes to export.');
                        return;
                    }
                    const blob = new Blob([JSON.stringify(customThemes, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'ypp-custom-themes.json';
                    a.click();
                    URL.revokeObjectURL(url);
                });
            });
        }

        if (importBtn && importFile) {
            importBtn.addEventListener('click', () => importFile.click());
            importFile.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                    try {
                        const imported = JSON.parse(ev.target.result);
                        chrome.storage.local.get('settings', (data) => {
                            const settings = data.settings || {};
                            if (!settings.customThemes) settings.customThemes = {};
                            
                            // Merge
                            for (const [key, theme] of Object.entries(imported)) {
                                if (key.startsWith('custom_') && theme.variables) {
                                    settings.customThemes[key] = theme;
                                }
                            }
                            
                            chrome.storage.local.set({ settings }, () => {
                                initThemeSelector(settings.activeTheme || 'default');
                                alert('Themes imported successfully!');
                                if (ui && ui.showSaveIndicator) ui.showSaveIndicator(document);
                            });
                        });
                    } catch (err) {
                        alert('Invalid theme file.');
                    }
                };
                reader.readAsText(file);
                importFile.value = ''; // Reset
            });
        }
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

    function initCardStyleGrid() {
        const btns = document.querySelectorAll('.card-style-btn');
        const hiddenInput = document.getElementById('cardStyle');
        if (!btns.length || !hiddenInput) return;

        const applyStyle = (styleVal) => {
            hiddenInput.value = styleVal;
            btns.forEach(b => {
                const isActive = b.dataset.style === styleVal;
                b.classList.toggle('active', isActive);
            });
        };

        chrome.storage.local.get('settings', (data) => {
            const styleVal = data.settings?.cardStyle || 'glass';
            applyStyle(styleVal);
        });

        btns.forEach(btn => {
            btn.addEventListener('click', () => {
                applyStyle(btn.dataset.style);
                const event = new Event('change', { bubbles: true });
                hiddenInput.dispatchEvent(event);
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
        initCardStyleGrid,
        initAccentColorSwatches,
        initCustomThemeBuilder,
        applyThemeToPopup
    };
}
