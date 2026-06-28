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

        const groups = ctx.manager.getGroups();
        
        const filters = [];
        
        // Group Filters (Singular selection)
        filters.push({
            id: 'group_All',
            label: 'All',
            isActive: true,
            isToggle: false,
            onClick: (btn) => {
                ctx.filterFeed(null);
            }
        });
        
        Object.keys(groups).forEach(groupName => {
            filters.push({
                id: `group_${groupName}`,
                label: groupName,
                isActive: false,
                isToggle: false,
                onClick: (btn) => {
                    ctx.filterFeed(groupName);
                }
            });
        });
        
        filters.push({ type: 'separator' });
        
        // Toggles
        filters.push({
            id: 'hideShortsLocal',
            label: 'Hide Shorts',
            isToggle: true,
            isActive: false,
            onClick: (btn) => {
                btn.classList.toggle('active');
                ctx.reapplyFilters();
            }
        });
        
        filters.push({
            id: 'hideWatchedLocal',
            label: 'Hide Watched',
            isToggle: true,
            isActive: false,
            onClick: (btn) => {
                btn.classList.toggle('active');
                ctx.reapplyFilters();
            }
        });

        const bar = new window.YPP.ui.components.PageFilterBar('ypp-subs-filter-bar', filters);

        const grid = container.querySelector('ytd-rich-grid-renderer');
        container.insertBefore(bar.el, grid ?? container.firstChild);
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

        const hideShorts = bar.querySelector('[data-id="hideShortsLocal"]')?.classList.contains('active') ?? false;
        const hideWatched = bar.querySelector('[data-id="hideWatchedLocal"]')?.classList.contains('active') ?? false;

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
