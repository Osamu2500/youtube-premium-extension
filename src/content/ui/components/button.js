/**
 * Light DOM Button Component Factory
 * 
 * Used for simple buttons, icons, and labels where Shadow DOM
 * would block native CSS variables or be overkill.
 */
window.YPP = window.YPP || {};
window.YPP.ui = window.YPP.ui || {};
window.YPP.ui.components = window.YPP.ui.components || {};

/**
 * Creates a standardized YPP button
 * 
 * @param {Object} options 
 * @param {string} options.id - Unique identifier for the UIManager
 * @param {string} options.icon - SVG string or text for the icon
 * @param {string} options.label - Optional text label
 * @param {string} options.tooltip - Tooltip on hover
 * @param {Function} options.onClick - Click handler
 * @param {string} options.className - Additional custom classes
 * @returns {Object} Component object { id, el }
 */
window.YPP.ui.components.createButton = function({ id, icon, label = '', tooltip = '', onClick, className = '' }) {
    const el = document.createElement("button");
    
    el.className = `ypp-btn ${className}`.trim();
    
    // Construct internal structure
    let innerHTML = '';
    if (icon) {
        innerHTML += `<span class="ypp-btn-icon">${icon}</span>`;
    }
    if (label) {
        innerHTML += `<span class="ypp-btn-label">${label}</span>`;
    }
    el.innerHTML = innerHTML;

    if (tooltip) {
        el.title = tooltip;
    }

    if (onClick && typeof onClick === 'function') {
        el.addEventListener("click", onClick);
    }

    return {
        id: `btn-${id}`,
        el
    };
};
