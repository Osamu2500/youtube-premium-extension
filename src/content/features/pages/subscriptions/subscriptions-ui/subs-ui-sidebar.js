window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

window.YPP.features.SubsUISidebar = class SubsUISidebar {
    static injectSidebarGroups(ctx) {
        const guide = document.querySelector('ytd-guide-renderer #sections');
        if (!guide) return;

        const groups = ctx.manager.getGroups();
        const activeGroup = new URLSearchParams(window.location.search).get('ypp_group');

        const cacheKey = JSON.stringify({ groups: Object.keys(groups), activeGroup });
        if (cacheKey === ctx._lastSidebarKey && document.getElementById('ypp-sidebar-group-section')) return;
        ctx._lastSidebarKey = cacheKey;

        let section = document.getElementById('ypp-sidebar-group-section');
        if (!section) {
            section = document.createElement('ytd-guide-section-renderer');
            section.id = 'ypp-sidebar-group-section';
            section.className = 'style-scope ytd-guide-renderer';
            const insertTarget = guide.children.length > 0 ? guide.children[1] : null;
            guide.insertBefore(section, insertTarget);
        }

        const folderSvg = `<svg viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" focusable="false" class="style-scope yt-icon" style="pointer-events:none;display:block;width:100%;height:100%"><path d="M20,6h-8l-2-2H4C2.9,4,2.01,4.9,2,6v12c0,1.1,0.9,2,2,2h16c1.1,0,2-0.9,2-2V8C22,6.9,21.1,6,20,6z M20,18H4V6h5.17l2,2H20V18z"></path></svg>`;

        section.innerHTML = `
            <div id="items" class="style-scope ytd-guide-section-renderer">
                <h3 class="ypp-sidebar-header">Groups</h3>
                ${Object.keys(groups).map(name => {
                    const safeName = escHtml(name);
                    const isActive = activeGroup === name ? 'active' : '';
                    return `
                    <ytd-guide-entry-renderer class="style-scope ytd-guide-section-renderer ypp-sidebar-entry ${isActive}" role="tab">
                        <a class="yt-simple-endpoint style-scope ytd-guide-entry-renderer" tabindex="-1">
                            <tp-yt-paper-item class="style-scope ytd-guide-entry-renderer" role="link">
                                <yt-icon class="guide-icon style-scope ytd-guide-entry-renderer">${folderSvg}</yt-icon>
                                <span class="title style-scope ytd-guide-entry-renderer">${safeName}</span>
                            </tp-yt-paper-item>
                        </a>
                    </ytd-guide-entry-renderer>`;
                }).join('')}
            </div>
        `;

        section.querySelectorAll('.ypp-sidebar-entry').forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                const name = el.querySelector('.title')?.textContent;
                if (name) window.location.href = `/feed/subscriptions?ypp_group=${encodeURIComponent(name)}`;
            });
        });
    }
};
