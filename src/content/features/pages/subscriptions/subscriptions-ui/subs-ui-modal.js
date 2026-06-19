import anime from 'animejs/lib/anime.es.js';

window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.SubsUIModal = class SubsUIModal {
    static openOrganizer(ctx) {
        if (ctx.isModalOpen) return;

        const overlay = document.createElement('div');
        overlay.className = 'ypp-modal-overlay';
        document.body.appendChild(overlay);

        overlay.innerHTML = `
            <div class="ypp-modal-content ypp-organizer-modal">
                <div class="ypp-modal-header">
                    <span class="ypp-modal-title">Subscription Organizer</span>
                    <button class="ypp-modal-close">&times;</button>
                </div>
                <div class="ypp-modal-body ypp-organizer-body">
                    <div class="ypp-pane ypp-pane-left">
                        <div class="ypp-pane-header">
                            <span>Channels</span>
                            <span class="ypp-count" id="ypp-channel-count">0</span>
                        </div>
                        <input type="text" id="ypp-organizer-search" placeholder="Search channels..." class="ypp-search-input">
                        <div id="ypp-channels-list" class="ypp-scroll-list"></div>
                    </div>

                    <div class="ypp-pane ypp-pane-right">
                        <div class="ypp-pane-header">
                            <span>Categories</span>
                            <button id="ypp-add-cat-btn" class="ypp-icon-btn">+</button>
                        </div>
                        <div id="ypp-categories-list" class="ypp-scroll-list"></div>
                    </div>
                </div>
            </div>
        `;

        const clickHandler = async e => {
            if (e.target === overlay) this.closeModal(ctx);
            if (e.target.closest('.ypp-modal-close')) this.closeModal(ctx);
            if (e.target.closest('#ypp-add-cat-btn')) this.promptNewCategory(ctx);

            const delBtn = e.target.closest('.ypp-del-cat-btn');
            if (delBtn) {
                e.stopPropagation();
                const categoryItem = delBtn.closest('.ypp-category-item');
                if (categoryItem) {
                    const groupName = categoryItem.dataset.group;
                    const confirmed = await window.YPP.features.CustomDialog.confirm(
                        'Delete Category',
                        `Delete category "${groupName}"? This cannot be undone.`,
                        'Delete',
                        true
                    );
                    if (confirmed) {
                        ctx.manager.deleteGroup(groupName);
                        this.renderCategoriesList(ctx);
                    }
                }
            }
        };

        const inputHandler = e => {
            if (e.target.id === 'ypp-organizer-search') this.filterChannelsList(e.target.value);
        };

        const dragStartHandler = e => {
            const channelItem = e.target.closest('.ypp-channel-item');
            if (channelItem) {
                const channelName = channelItem.dataset.id;
                const img = channelItem.querySelector('img');
                ctx.draggedChannel = { name: channelName, id: channelName, icon: img ? img.src : '' };
                channelItem.classList.add('dragging');
                e.dataTransfer.setData('text/plain', JSON.stringify(ctx.draggedChannel));
                e.dataTransfer.effectAllowed = 'copy';
            }
        };

        const dragEndHandler = e => {
            const channelItem = e.target.closest('.ypp-channel-item');
            if (channelItem) {
                ctx.draggedChannel = null;
                channelItem.classList.remove('dragging');
            }
        };

        const dragOverHandler = e => {
            const catItem = e.target.closest('.ypp-category-item');
            if (catItem) {
                e.preventDefault();
                catItem.classList.add('drag-over');
            }
        };

        const dragLeaveHandler = e => {
            const catItem = e.target.closest('.ypp-category-item');
            if (catItem) catItem.classList.remove('drag-over');
        };

        const dropHandler = e => {
            const catItem = e.target.closest('.ypp-category-item');
            if (catItem) {
                e.preventDefault();
                catItem.classList.remove('drag-over');
                const groupName = catItem.dataset.group;
                if (ctx.draggedChannel) this._addChannelToGroup(ctx, groupName, ctx.draggedChannel);
            }
        };

        ctx.addListener(overlay, 'click', clickHandler);
        ctx.addListener(overlay, 'input', inputHandler);
        ctx.addListener(overlay, 'dragstart', dragStartHandler);
        ctx.addListener(overlay, 'dragend', dragEndHandler);
        ctx.addListener(overlay, 'dragover', dragOverHandler);
        ctx.addListener(overlay, 'dragleave', dragLeaveHandler);
        ctx.addListener(overlay, 'drop', dropHandler);

        ctx._modalOverlay = overlay;
        ctx._modalListeners = [
            { event: 'click', handler: clickHandler },
            { event: 'input', handler: inputHandler },
            { event: 'dragstart', handler: dragStartHandler },
            { event: 'dragend', handler: dragEndHandler },
            { event: 'dragover', handler: dragOverHandler },
            { event: 'dragleave', handler: dragLeaveHandler },
            { event: 'drop', handler: dropHandler }
        ];

        this.renderChannelsList(ctx);
        this.renderCategoriesList(ctx);

        requestAnimationFrame(() => overlay.classList.add('open'));
        ctx.isModalOpen = true;
    }

    static closeModal(ctx) {
        const overlay = document.querySelector('.ypp-modal-overlay');
        if (overlay) {
            overlay.classList.remove('open');
            setTimeout(() => overlay.remove(), 300);
        }

        if (ctx._modalOverlay && ctx._modalListeners) {
            ctx._modalListeners.forEach(l => {
                ctx.removeListener(ctx._modalOverlay, l.event, l.handler);
            });
            ctx._modalOverlay = null;
            ctx._modalListeners = null;
        }
        ctx.isModalOpen = false;
        const bar = document.getElementById('ypp-subs-filter-bar');
        if (bar) window.YPP.features.SubsUIFilter.renderFilterBar(ctx, bar);
    }

    static renderChannelsList(ctx) {
        const container = document.getElementById('ypp-channels-list');
        if (!container) return;
        container.innerHTML = '';

        const channels = this._scrapeChannelsFromPage();
        const countEl = document.getElementById('ypp-channel-count');
        if (countEl) countEl.textContent = channels.length;

        channels.forEach(channel => {
            const el = document.createElement('div');
            el.className = 'ypp-channel-item';
            el.draggable = true;
            el.dataset.id = channel.name;

            const img = document.createElement('img');
            img.src = channel.icon || '';
            img.className = 'ypp-channel-icon';
            img.addEventListener('error', () => { img.style.display = 'none'; });

            const nameSpan = document.createElement('span');
            nameSpan.className = 'ypp-channel-name';
            nameSpan.textContent = channel.name;

            el.appendChild(img);
            el.appendChild(nameSpan);

            container.appendChild(el);
        });

        anime({
            targets: container.querySelectorAll('.ypp-channel-item'),
            translateX: [-12, 0],
            opacity: [0, 1],
            delay: anime.stagger(30, { start: 100 }),
            easing: 'spring(1, 80, 10, 0)',
            duration: 600,
        });
    }

    static _scrapeChannelsFromPage() {
        const items = document.querySelectorAll('ytd-channel-renderer, ytd-grid-channel-renderer');
        if (items.length > 0) {
            return Array.from(items)
                .map(item => ({
                    name: item.querySelector('#text.ytd-channel-name')?.textContent?.trim(),
                    icon: item.querySelector('img')?.src,
                }))
                .filter(c => c.name);
        }

        return [
            { name: 'Veritasium', icon: '' },
            { name: 'Kurzgesagt', icon: '' },
            { name: 'MKBHD', icon: '' },
            { name: 'Linus Tech Tips', icon: '' },
            { name: 'Vsauce', icon: '' },
        ];
    }

    static filterChannelsList(query) {
        const normalizedQuery = query.toLowerCase();
        document.querySelectorAll('.ypp-channel-item').forEach(item => {
            const nameEl = item.querySelector('.ypp-channel-name');
            if (!nameEl) return;
            item.style.display = nameEl.textContent.toLowerCase().includes(normalizedQuery) ? 'flex' : 'none';
        });
    }

    static renderCategoriesList(ctx) {
        const container = document.getElementById('ypp-categories-list');
        if (!container) return;
        container.innerHTML = '';

        const groups = ctx.manager.getGroups();

        Object.keys(groups).forEach(groupName => {
            const el = document.createElement('div');
            el.className = 'ypp-category-item';

            const header = document.createElement('div');
            header.className = 'ypp-cat-header';

            const nameSpan = document.createElement('span');
            nameSpan.className = 'ypp-cat-name';
            nameSpan.textContent = `📁 ${groupName}`;

            const countSpan = document.createElement('span');
            countSpan.className = 'ypp-cat-count';
            countSpan.textContent = groups[groupName].length;

            const delBtn = document.createElement('button');
            delBtn.className = 'ypp-del-cat-btn';
            delBtn.textContent = '×';

            header.appendChild(nameSpan);
            header.appendChild(countSpan);
            header.appendChild(delBtn);

            const channelsDiv = document.createElement('div');
            channelsDiv.className = 'ypp-cat-channels';
            groups[groupName].forEach(c => {
                const chip = document.createElement('div');
                chip.className = 'ypp-mini-channel';
                chip.textContent = c.name;
                channelsDiv.appendChild(chip);
            });

            el.dataset.group = groupName;
            el.appendChild(header);
            el.appendChild(channelsDiv);

            container.appendChild(el);
        });

        anime({
            targets: container.querySelectorAll('.ypp-category-item'),
            translateX: [12, 0],
            opacity: [0, 1],
            delay: anime.stagger(40, { start: 100 }),
            easing: 'spring(1, 80, 10, 0)',
            duration: 600,
        });
    }

    static _addChannelToGroup(ctx, groupName, channel) {
        if (ctx.manager.addChannelToGroup(groupName, { id: channel.name, ...channel })) {
            this.renderCategoriesList(ctx);
            window.YPP.Utils.createToast?.(`Added ${channel.name} to ${groupName}`);
        } else {
            window.YPP.Utils.createToast?.(`${channel.name} is already in ${groupName}`, 'info');
        }
    }

    static async promptNewCategory(ctx) {
        const name = await window.YPP.features.CustomDialog.prompt(
            'New Category',
            'Enter a name for the new category:'
        );
        if (!name?.trim()) return;
        if (ctx.manager.createGroup(name.trim())) {
            this.renderCategoriesList(ctx);
            window.YPP.Utils.createToast?.(`Category "${name.trim()}" created`);
        } else {
            window.YPP.Utils.createToast?.('Category already exists', 'error');
        }
    }
};
