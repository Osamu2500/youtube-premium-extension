window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.SubsUIFilter = class SubsUIFilter {
    static injectFilterBar(ctx) {
        if (document.getElementById('ypp-subs-filter-bar')) return;

        const path = window.location.pathname;
        let container;

        if (path === '/feed/subscriptions') {
            container = document.querySelector('ytd-browse[page-subtype="subscriptions"] #contents');
        } else if (path === '/' || path === '/index') {
            container = document.querySelector('ytd-browse[page-subtype="home"] #contents');
        }

        if (!container) return;

        const bar = document.createElement('div');
        bar.id = 'ypp-subs-filter-bar';
        bar.className = 'ypp-glass-panel';
        this.renderFilterBar(ctx, bar);

        const grid = container.querySelector('ytd-rich-grid-renderer');
        container.insertBefore(bar, grid ?? container.firstChild);
    }

    static renderFilterBar(ctx, container) {
        container.innerHTML = '';
        const groups = ctx.manager.getGroups();

        const allBtn = document.createElement('button');
        allBtn.className = 'ypp-filter-chip active';
        allBtn.textContent = 'All';
        allBtn.addEventListener('click', () => ctx.filterFeed(null));
        container.appendChild(allBtn);

        Object.keys(groups).forEach(groupName => {
            const btn = document.createElement('button');
            btn.className = 'ypp-filter-chip';
            btn.textContent = groupName;
            btn.addEventListener('click', () => ctx.filterFeed(groupName));
            container.appendChild(btn);
        });

        const sep = document.createElement('div');
        sep.className = 'ypp-filter-separator';
        container.appendChild(sep);

        const toggleShorts = document.createElement('button');
        toggleShorts.className = 'ypp-filter-chip ypp-toggle-chip';
        toggleShorts.textContent = 'Hide Shorts';
        toggleShorts.dataset.toggle = 'shorts';
        toggleShorts.addEventListener('click', () => {
            toggleShorts.classList.toggle('active');
            ctx.reapplyFilters();
        });
        container.appendChild(toggleShorts);

        const toggleWatched = document.createElement('button');
        toggleWatched.className = 'ypp-filter-chip ypp-toggle-chip';
        toggleWatched.textContent = 'Hide Watched';
        toggleWatched.dataset.toggle = 'watched';
        toggleWatched.addEventListener('click', () => {
            toggleWatched.classList.toggle('active');
            ctx.reapplyFilters();
        });
        container.appendChild(toggleWatched);
    }

    static reapplyFilters(ctx) {
        const activeChip = document.querySelector('#ypp-subs-filter-bar .ypp-filter-chip:not(.ypp-toggle-chip).active');
        const groupName = activeChip && activeChip.textContent !== 'All' ? activeChip.textContent : null;
        ctx.filterFeed(groupName);
    }

    static _filterFeedNow(ctx, groupName) {
        const bar = document.getElementById('ypp-subs-filter-bar');
        if (!bar) return;

        const groupChips = bar.querySelectorAll('.ypp-filter-chip:not(.ypp-toggle-chip)');
        groupChips.forEach(c => c.classList.remove('active'));
        const targetChip = Array.from(groupChips).find(c => c.textContent === (groupName || 'All'));
        if (targetChip) targetChip.classList.add('active');

        const hideShorts = bar.querySelector('[data-toggle="shorts"]')?.classList.contains('active') ?? false;
        const hideWatched = bar.querySelector('[data-toggle="watched"]')?.classList.contains('active') ?? false;

        let allowedChannelSet = null;
        if (groupName) {
            const channelsInGroup = ctx.manager.getChannelsInGroup(groupName).map(c => c.name);
            allowedChannelSet = new Set(channelsInGroup);
        }

        const watchedThreshold = window.YPP?.CONSTANTS?.DEFAULT_SETTINGS?.hideWatchedThreshold ?? 80;
        const videos = document.querySelectorAll('ytd-rich-item-renderer, ytd-grid-video-renderer');

        videos.forEach(video => {
            let shouldShow = true;

            if (allowedChannelSet) {
                if (!video.dataset.yppChannel) {
                    const nameNode = video.querySelector('#text.ytd-channel-name')
                                  || video.querySelector('.ytd-channel-name')
                                  || video.querySelector('ytd-channel-name');
                    if (nameNode) video.dataset.yppChannel = nameNode.textContent.trim();
                }
                const channelName = video.dataset.yppChannel;
                if (!channelName || !allowedChannelSet.has(channelName)) shouldShow = false;
            }

            if (shouldShow && hideShorts) {
                if (video.querySelector('a[href*="/shorts/"]')) shouldShow = false;
                if (video.tagName.toLowerCase().includes('reel')) shouldShow = false;
            }

            if (shouldShow && hideWatched) {
                const progressEl = video.querySelector('#progress');
                if (progressEl) {
                    const width = parseFloat(progressEl.style.width || '0');
                    if (width > watchedThreshold) shouldShow = false;
                }
            }

            video.style.display = shouldShow ? '' : 'none';
        });

        ctx.injectSidebarGroups();
    }
};
