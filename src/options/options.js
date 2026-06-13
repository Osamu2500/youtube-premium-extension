document.addEventListener('DOMContentLoaded', async () => {
    // 1. Navigation Logic
    const navBtns = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('.settings-section');

    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class
            navBtns.forEach(b => b.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));

            // Add active class to target
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
        });
    });

    // 2. Load and Save Settings
    const defaults = {
        themeSelect: 'default',
        adSkipper: true,
        customScrollbar: true,
        returnYouTubeDislike: true,
        enableCustomSpeed: true,
        vscForceSpeed: false,
        redirectShorts: false,
        stopShortsLoop: false,
        sponsorBlock: true,
        sb_sponsor: true,
        sb_intro: true,
        sb_outro: true,
        sb_interaction: true,
        sb_selfpromo: true,
        sb_music_offtopic: false
    };

    const storageKey = 'ypp_settings';

    // Fetch existing settings
    const data = await chrome.storage.local.get(storageKey);
    const settings = { ...defaults, ...(data[storageKey] || {}) };

    // Function to save a setting
    const saveSetting = async (key, value) => {
        settings[key] = value;
        await chrome.storage.local.set({ [storageKey]: settings });
    };

    // Bind inputs
    const inputs = document.querySelectorAll('input[type="checkbox"], select');
    inputs.forEach(input => {
        const key = input.id;
        
        // Initialize state
        if (input.type === 'checkbox') {
            input.checked = settings[key] !== false; // Default true unless explicitly false
        } else if (input.tagName === 'SELECT') {
            input.value = settings[key] || 'default';
        }

        // Listen for changes
        input.addEventListener('change', (e) => {
            const value = input.type === 'checkbox' ? input.checked : input.value;
            saveSetting(key, value);
        });
    });
});
