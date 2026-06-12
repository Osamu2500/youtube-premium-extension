/**
 * popup-renderer.js  — v3.1 Architecture
 * ─────────────────────────────────────────────────────────────────────
 * Reads POPUP_SCHEMA and builds the DOM for every non-custom tab.
 * This replaces hundreds of lines of repetitive HTML in popup.html.
 *
 * Responsibilities:
 *   • Render nav items from schema
 *   • Render section cards and setting items for schema-driven tabs
 *   • Skip tabs with custom:true (they keep their own HTML)
 *   • Honour the `hidden` flag on individual items
 *   • Inject custom slots (sponsorBlockCategories, shortcutsPanel, etc.)
 *   • Register new inputs with popup-state so they save/load automatically
 *
 * Usage (in popup-main.js):
 *   import { renderSchema } from './popup-renderer.js';
 *   renderSchema(document, state);
 * ─────────────────────────────────────────────────────────────────────
 */

import { POPUP_SCHEMA, CUSTOM_SLOT_RENDERERS } from './popup-schema.js';

// ── SVG helpers ────────────────────────────────────────────────────────
const NS_SVG = 'http://www.w3.org/2000/svg';

function makeSVG(pathD, size = 15) {
    const svg = document.createElementNS(NS_SVG, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    if (pathD) {
        const path = document.createElementNS(NS_SVG, 'path');
        path.setAttribute('d', pathD);
        svg.appendChild(path);
    }
    return svg;
}

// ── Item renderers ─────────────────────────────────────────────────────

function renderToggle(item, state) {
    if (item.hidden) return null;

    const card = document.createElement('div');
    card.className = 'toggle-card';
    if (item.style) card.style.cssText = item.style;
    if (item.cssText) card.style.cssText = item.cssText;  // alias

    // Icon
    if (item.icon) {
        const iconWrap = document.createElement('div');
        iconWrap.className = 'feature-icon';
        iconWrap.appendChild(makeSVG(item.icon, 14));
        card.appendChild(iconWrap);
    }

    // Info
    const info = document.createElement('div');
    info.className = 'info';
    const nameEl = document.createElement('span');
    nameEl.className = 'name';
    nameEl.textContent = item.label;
    info.appendChild(nameEl);
    if (item.desc) {
        const descEl = document.createElement('span');
        descEl.className = 'desc';
        descEl.textContent = item.desc;
        info.appendChild(descEl);
    }
    card.appendChild(info);

    // Toggle
    const label = document.createElement('label');
    label.className = 'toggle';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = item.id;
    label.appendChild(input);
    const span = document.createElement('span');
    span.className = 'slider';
    label.appendChild(span);
    card.appendChild(label);

    _registerInput(input, state);
    return card;
}

function renderRange(item, state) {
    if (item.hidden) return null;

    const wrap = document.createElement('div');
    wrap.className = 'setting-item';
    wrap.style.marginTop = '6px';

    const info = document.createElement('div');
    info.className = 'info';
    const valueId = item.id + 'Value';
    const unit = item.unit != null ? item.unit : '%';
    info.innerHTML = `<span class="name">${item.label}</span><span class="desc"><span id="${valueId}">${item.min ?? 0}</span>${unit}</span>`;
    wrap.appendChild(info);

    const rangeWrap = document.createElement('div');
    rangeWrap.className = 'range-container';
    const input = document.createElement('input');
    input.type = 'range';
    input.id = item.id;
    input.min = item.min ?? 0;
    input.max = item.max ?? 100;
    input.step = item.step ?? 1;
    input.value = item.min ?? 0;
    rangeWrap.appendChild(input);
    wrap.appendChild(rangeWrap);

    _registerInput(input, state);
    return wrap;
}

function renderSelect(item, state) {
    if (item.hidden) return null;

    const wrap = document.createElement('div');
    wrap.className = 'inline-setting-row';
    wrap.style.marginTop = '8px';

    const infoGroup = document.createElement('div');
    infoGroup.style.display = 'flex';
    infoGroup.style.alignItems = 'center';
    infoGroup.style.gap = '12px';

    if (item.icon) {
        const iconWrap = document.createElement('div');
        iconWrap.className = 'feature-icon';
        iconWrap.style.flexShrink = '0';
        iconWrap.appendChild(makeSVG(item.icon, 14));
        infoGroup.appendChild(iconWrap);
    }

    const info = document.createElement('div');
    info.className = 'info';
    info.style.display = 'flex';
    info.style.flexDirection = 'column';

    const nameEl = document.createElement('span');
    nameEl.className = 'name';
    nameEl.textContent = item.label;
    info.appendChild(nameEl);
    if (item.desc) {
        const d = document.createElement('span');
        d.className = 'desc';
        d.textContent = item.desc;
        info.appendChild(d);
    }
    infoGroup.appendChild(info);
    wrap.appendChild(infoGroup);

    const select = document.createElement('select');
    select.id = item.id;
    select.className = 'theme-select';
    select.style.width = '130px';
    (item.options || []).forEach(opt => {
        const o = document.createElement('option');
        o.value = opt.value;
        o.textContent = opt.label;
        select.appendChild(o);
    });
    wrap.appendChild(select);

    _registerInput(select, state);
    return wrap;
}

function renderLayoutToggle(item, state) {
    if (item.hidden) return null;

    const wrap = document.createElement('div');
    wrap.className = 'setting-item';
    wrap.style.flexDirection = 'column';
    wrap.style.alignItems = 'stretch';
    wrap.style.marginTop = '8px';
    wrap.style.background = 'rgba(255,255,255,0.02)';
    wrap.style.padding = '12px';
    wrap.style.borderRadius = '12px';
    wrap.style.border = '1px solid rgba(255,255,255,0.05)';

    // Header row
    const headerRow = document.createElement('div');
    headerRow.style.display = 'flex';
    headerRow.style.justifyContent = 'space-between';
    headerRow.style.alignItems = 'center';
    headerRow.style.marginBottom = '12px';

    const info = document.createElement('div');
    info.className = 'info';
    info.innerHTML = `<span class="name">${item.label}</span><span class="desc">${item.desc || 'Video cards size'}</span>`;
    headerRow.appendChild(info);

    // Toggle Buttons
    const toggleWrap = document.createElement('div');
    toggleWrap.id = item.id + 'Toggle';
    toggleWrap.className = 'sidebar-layout-toggle';
    toggleWrap.style.display = 'inline-flex';
    toggleWrap.style.background = 'rgba(255,255,255,0.06)';
    toggleWrap.style.padding = '3px';
    toggleWrap.style.borderRadius = '8px';
    toggleWrap.style.border = '1px solid rgba(255,255,255,0.08)';

    const svgCompact = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="6" height="4" rx="1"/><line x1="11" y1="7" x2="21" y2="7"/><rect x="3" y="13" width="6" height="4" rx="1"/><line x1="11" y1="15" x2="21" y2="15"/></svg>`;
    const svgExpanded = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="11" rx="2"/><line x1="3" y1="17" x2="21" y2="17"/><line x1="3" y1="21" x2="15" y2="21"/></svg>`;

    const btnStyle = 'display:flex; align-items:center; gap:5px; font-size:11px; padding:5px 14px; border:none; cursor:pointer; transition:all 0.2s; font-weight:500; border-radius:6px; background:transparent; color:rgba(255,255,255,0.5);';

    const btnCompact = document.createElement('button');
    btnCompact.type = 'button';
    btnCompact.className = 'sidebar-layout-btn';
    btnCompact.dataset.layout = 'compact';
    btnCompact.style.cssText = btnStyle;
    btnCompact.innerHTML = `${svgCompact} Compact`;

    const btnExpanded = document.createElement('button');
    btnExpanded.type = 'button';
    btnExpanded.className = 'sidebar-layout-btn';
    btnExpanded.dataset.layout = 'expanded';
    btnExpanded.style.cssText = btnStyle;
    btnExpanded.innerHTML = `${svgExpanded} Expanded`;

    toggleWrap.appendChild(btnCompact);
    toggleWrap.appendChild(btnExpanded);
    headerRow.appendChild(toggleWrap);
    wrap.appendChild(headerRow);



    // Hidden input
    const hiddenInput = document.createElement('input');
    hiddenInput.type = 'hidden';
    hiddenInput.id = item.id;
    hiddenInput.value = item.default || 'compact';
    wrap.appendChild(hiddenInput);

    // Logic
    const applyActiveState = (layout) => {
        hiddenInput.value = layout;
        [btnCompact, btnExpanded].forEach(b => {
            const isActive = b.dataset.layout === layout;
            b.classList.toggle('active', isActive);
            b.style.background = isActive ? 'rgba(62,166,255,0.22)' : 'transparent';
            b.style.color = isActive ? 'var(--accent, #3ea6ff)' : 'rgba(255,255,255,0.5)';
        });
        
        hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
        
        // Ensure robust saving
        import('./popup-state.js').then(module => {
            if (module.saveSettings) {
                module.saveSettings();
            }
        });
    };

    btnCompact.onclick = () => applyActiveState('compact');
    btnExpanded.onclick = () => applyActiveState('expanded');

    // Initialize UI state
    setTimeout(() => applyActiveState(hiddenInput.value), 10);
    
    _registerInput(hiddenInput, state);
    return wrap;
}

function renderCustomSlot(item) {
    if (item.hidden) return null;
    // The slot element will be filled by the custom renderer registered
    // via CUSTOM_SLOT_RENDERERS.set(id, fn)
    const slot = document.createElement('div');
    slot.id = item.slot || item.id;
    slot.dataset.slot = item.slot || item.id;
    return slot;
}

function renderInlineToggle(item, state) {
    if (item.hidden && (typeof item.hidden === 'function' ? item.hidden(state) : item.hidden)) return null;

    const wrap = document.createElement('div');
    wrap.className = 'inline-setting-row';
    wrap.style.marginTop = '8px';

    const infoGroup = document.createElement('div');
    infoGroup.style.display = 'flex';
    infoGroup.style.alignItems = 'center';
    infoGroup.style.gap = '12px';

    if (item.icon) {
        const iconWrap = document.createElement('div');
        iconWrap.className = 'feature-icon';
        iconWrap.style.flexShrink = '0';
        iconWrap.appendChild(makeSVG(item.icon, 14));
        infoGroup.appendChild(iconWrap);
    }

    const info = document.createElement('div');
    info.className = 'info';
    info.style.display = 'flex';
    info.style.flexDirection = 'column';

    const nameEl = document.createElement('span');
    nameEl.className = 'name';
    nameEl.textContent = item.label;
    info.appendChild(nameEl);
    if (item.desc) {
        const d = document.createElement('span');
        d.className = 'desc';
        d.textContent = item.desc;
        info.appendChild(d);
    }
    infoGroup.appendChild(info);
    wrap.appendChild(infoGroup);

    const label = document.createElement('label');
    label.className = 'toggle';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = item.id;
    label.appendChild(input);
    const span = document.createElement('span');
    span.className = 'slider';
    label.appendChild(span);
    wrap.appendChild(label);

    _registerInput(input, state);
    return wrap;
}

const ITEM_RENDERERS = {
    toggle: renderToggle,
    inlineToggle: renderInlineToggle,
    range:  renderRange,
    select: renderSelect,
    layoutToggle: renderLayoutToggle,
    custom: renderCustomSlot,
};

// ── Section builder ────────────────────────────────────────────────────

function buildSection(section, state) {
    const sec = document.createElement('div');
    sec.className = 'settings-section';

    // Header
    const hdr = document.createElement('div');
    hdr.className = 'section-header';
    hdr.innerHTML = `
        <div class="section-title-wrap">
            <div class="section-text-wrap">
                <div class="section-title">${section.title}</div>
                ${section.subtitle ? `<div class="section-subtitle">${section.subtitle}</div>` : ''}
            </div>
        </div>`;
    sec.appendChild(hdr);

    // Group
    const grp = document.createElement('div');
    grp.className = 'card-group';

    // Separate items into grid-eligible (toggle) and full-width (range, select, custom)
    const gridItems  = section.items.filter(i => i.type === 'toggle' && !i.hidden);
    const wideItems  = section.items.filter(i => i.type !== 'toggle' && !i.hidden);

    if (gridItems.length > 0) {
        const grid = document.createElement('div');
        grid.className = 'feature-grid';
        gridItems.forEach(item => {
            const el = renderToggle(item, state);
            if (el) grid.appendChild(el);
        });
        grp.appendChild(grid);

        // Emit slot divs as direct siblings of the grid (NOT inside the grid)
        gridItems.forEach(item => {
            if (item.slot) {
                let slot = document.getElementById(item.slot);
                if (!slot) {
                    slot = document.createElement('div');
                    slot.id = item.slot;
                }
                slot.style.display = 'none';
                grp.appendChild(slot); // Appends new or moves existing
            }
        });
    }

    const selectItems = wideItems.filter(i => i.type === 'select' || i.type === 'inlineToggle');
    const otherItems  = wideItems.filter(i => i.type !== 'select' && i.type !== 'inlineToggle');

    if (selectItems.length > 0) {
        const grid = document.createElement('div');
        grid.className = 'select-grid';
        selectItems.forEach(item => {
            const fn = ITEM_RENDERERS[item.type];
            const el = fn ? fn(item, state) : null;
            if (el) grid.appendChild(el);
        });
        grp.appendChild(grid);
    }

    otherItems.forEach(item => {
        const fn = ITEM_RENDERERS[item.type];
        const el = fn ? fn(item, state) : null;
        if (el) grp.appendChild(el);
    });

    sec.appendChild(grp);
    return sec;
}

// ── State registration ─────────────────────────────────────────────────

function _registerInput(input, state) {
    if (!state || !input.id) return;
    // Don't double-register (popup-state.js may have already picked it up
    // from the HTML shell via initStorage())
    if (state.elements[input.id]) return;
    state.elements[input.id] = input;
    if (!state.settingKeys.includes(input.id)) {
        state.settingKeys.push(input.id);
    }
}

// ── Public API ─────────────────────────────────────────────────────────

/**
 * Render all non-custom schema tabs into the #tabs-container element.
 * @param {Document} doc
 * @param {object}   state   — from popup-state.js
 */
export function renderSchema(doc, state) {
    const main = doc.getElementById('tabs-container') || doc.querySelector('main');
    if (!main) {
        console.warn('[YPP:Renderer] No #tabs-container or <main> found — skipping schema render');
        return;
    }

    POPUP_SCHEMA.forEach(tab => {
        // Skip custom tabs — they have their HTML in popup.html
        if (tab.custom) return;

        const section = doc.getElementById(`tab-${tab.id}`);
        if (!section) return; // section must exist in HTML shell

        // Clear placeholder content (if any) and inject schema-generated sections
        // But preserve anything with data-preserve="true"
        Array.from(section.children)
            .filter(el => !el.dataset.preserve)
            .forEach(el => el.remove());

        tab.sections.forEach(s => {
            const node = buildSection(s, state);
            section.appendChild(node);
        });
    });

    // Run custom slot renderers
    CUSTOM_SLOT_RENDERERS.forEach((fn, slotId) => {
        const el = doc.getElementById(slotId);
        if (el) fn(el, state);
    });
}

/**
 * Register a custom slot renderer.
 * @param {string}   slotId   — matches item.slot in schema
 * @param {Function} fn       — (container, state) => void
 */
export function registerSlot(slotId, fn) {
    CUSTOM_SLOT_RENDERERS.set(slotId, fn);
}

/**
 * Utility: look up a schema item by its setting id across all tabs.
 * Useful for components that need to reflect schema metadata (e.g. label for a search hit).
 * @param {string} settingId
 * @returns {object|null}
 */
export function findSchemaItem(settingId) {
    for (const tab of POPUP_SCHEMA) {
        for (const section of (tab.sections || [])) {
            for (const item of (section.items || [])) {
                if (item.id === settingId) return { tab, section, item };
            }
        }
    }
    return null;
}
