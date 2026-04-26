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

        overlay.querySelector('.ypp-modal-close').addEventListener('click', () => this.closeModal(ctx));
        overlay.addEventListener('click', e => { if (e.target === overlay) this.closeModal(ctx); });
        overlay.querySelector('#ypp-add-cat-btn').addEventListener('click', () => this.promptNewCategory(ctx));
        overlay.querySelector('#ypp-organizer-search').addEventListener('input', e => this.filterChannelsList(e.target.value));

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

            el.addEventListener('dragstart', (e) => {
                ctx.draggedChannel = channel;
                el.classList.add('dragging');
                e.dataTransfer.setData('text/plain', JSON.stringify(channel));
                e.dataTransfer.effectAllowed = 'copy';
            });
            el.addEventListener('dragend', () => {
                ctx.draggedChannel = null;
                el.classList.remove('dragging');
            });

            container.appendChild(el);
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
            delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`Delete category "${groupName}"?`)) {
                    ctx.manager.deleteGroup(groupName);
                    this.renderCategoriesList(ctx);
                }
            });

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

            el.appendChild(header);
            el.appendChild(channelsDiv);

            el.addEventListener('dragover', (e) => {
                e.preventDefault();
                el.classList.add('drag-over');
            });
            el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
            el.addEventListener('drop', (e) => {
                e.preventDefault();
                el.classList.remove('drag-over');
                if (ctx.draggedChannel) this._addChannelToGroup(ctx, groupName, ctx.draggedChannel);
            });

            container.appendChild(el);
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

    static promptNewCategory(ctx) {
        const name = prompt('Enter category name:');
        if (!name?.trim()) return;
        if (ctx.manager.createGroup(name.trim())) {
            this.renderCategoriesList(ctx);
            window.YPP.Utils.createToast?.(`Category "${name.trim()}" created`);
        } else {
            window.YPP.Utils.createToast?.('Category already exists', 'error');
        }
    }
};
