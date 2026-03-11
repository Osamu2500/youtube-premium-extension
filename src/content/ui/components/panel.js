/**
 * Shadow DOM Panel Component Factory
 * 
 * Generates isolated, floating UI panels (like Focus Mode overlay, 
 * Quick Settings, etc) protected from YouTube's aggressive CSS resets.
 */
window.YPP = window.YPP || {};
window.YPP.ui = window.YPP.ui || {};
window.YPP.ui.components = window.YPP.ui.components || {};

/**
 * Creates an isolated panel using Shadow DOM
 * 
 * @param {Object} options
 * @param {string} options.id - Unique ID
 * @param {string} options.content - HTML string to inject into the panel slot
 * @param {string} options.style - Custom CSS string for the shadow root
 * @param {string} options.className - Custom host class (for absolute positioning via main CSS)
 * @returns {Object} Component object { id, el, shadow }
 */
window.YPP.ui.components.createPanel = function({ id, content = '', style = '', className = '' }) {
    const host = document.createElement("div");
    host.className = `ypp-panel-host ${className}`.trim();
    
    const shadow = host.attachShadow({ mode: "open" });

    // Standardized premium styling base
    const baseStyle = `
        <style>
            :host {
                display: block;
                /* By default, components should inherit YPP CSS variables from :root */
            }
            .ypp-shadow-panel {
                background: var(--ypp-bg-surface, rgba(20, 20, 20, 0.8));
                backdrop-filter: var(--ypp-glass-blur, blur(12px));
                -webkit-backdrop-filter: var(--ypp-glass-blur, blur(12px));
                border: var(--ypp-glass-border, 1px solid rgba(255, 255, 255, 0.1));
                border-radius: var(--ypp-radius-xl, 16px);
                padding: 16px;
                color: var(--text-primary, #ffffff);
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                font-family: "Roboto", "Arial", sans-serif;
            }
            ${style}
        </style>
    `;

    shadow.innerHTML = `
        ${baseStyle}
        <div class="ypp-shadow-panel">
            <slot>${content}</slot>
        </div>
    `;

    return {
        id: `panel-${id}`,
        el: host,
        shadow // Exposed so features can bind internal events to the shadow DOM elements
    };
};
