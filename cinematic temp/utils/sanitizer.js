import DOMPurify from 'dompurify';

// Initialize DOMPurify
const purify = DOMPurify(window);

purify.setConfig({
    ALLOWED_TAGS: ['div', 'span', 'p', 'a', 'img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'button', 'svg', 'path'],
    ALLOWED_ATTR: ['href', 'src', 'class', 'id', 'alt', 'title', 'style', 'viewBox', 'fill', 'aria-label', 'd'],
    RETURN_DOM: true,  // Return a DocumentFragment
    RETURN_DOM_FRAGMENT: true,
    SANITIZE_DOM: true
});

/**
 * Safely sets innerHTML of an element
 */
export function safeSetInnerHTML(element, html) {
    if (!element || typeof html !== 'string') return;
    
    // Get a clean DOM fragment
    const cleanFragment = purify.sanitize(html, { RETURN_DOM_FRAGMENT: true });
    
    // Clear existing content
    element.textContent = '';
    
    // Append the clean fragment
    element.appendChild(cleanFragment);
}

/**
 * Safely inserts HTML content into an element
 */
export function safeInsertAdjacent(element, position, html) {
    if (!element || typeof html !== 'string') return;
    
    // Get a clean DOM fragment
    const cleanFragment = purify.sanitize(html, { RETURN_DOM_FRAGMENT: true });
    
    switch (position) {
        case 'beforebegin':
            element.parentNode?.insertBefore(cleanFragment, element);
            break;
        case 'afterbegin':
            element.insertBefore(cleanFragment, element.firstChild);
            break;
        case 'beforeend':
            element.appendChild(cleanFragment);
            break;
        case 'afterend':
            element.parentNode?.insertBefore(cleanFragment, element.nextSibling);
            break;
    }
}