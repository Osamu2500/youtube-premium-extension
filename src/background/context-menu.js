/**
 * Context Menu Feature for YouTube Premium Plus
 * Registers native browser context menus for adding channels to groups.
 */

const CONTEXT_MENU_ID = 'ypp-add-to-group';

export function initContextMenu() {
    if (!chrome.contextMenus) return;
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: CONTEXT_MENU_ID,
            title: "Add Channel to YPP Group",
            contexts: ["page", "link", "video"],
            documentUrlPatterns: ["*://*.youtube.com/*"]
        });
    });
}

if (chrome.contextMenus) {
    chrome.contextMenus.onClicked.addListener((info, tab) => {
        if (info.menuItemId === CONTEXT_MENU_ID) {
            // Determine the target URL from either the clicked link or the page itself
            const url = info.linkUrl || info.pageUrl;
            
            // Extract a channel identifier (e.g. @channelname or channel ID) from the URL if possible
            let channelIdentifier = null;
            
            try {
                const parsedUrl = new URL(url);
                const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
                
                if (pathParts[0] && pathParts[0].startsWith('@')) {
                    channelIdentifier = pathParts[0];
                } else if (pathParts[0] === 'channel' || pathParts[0] === 'c' || pathParts[0] === 'user') {
                    channelIdentifier = pathParts[1];
                }
            } catch (e) {
                console.error('[YPP] Failed to parse URL for context menu:', e);
            }

            // Send message to the content script in the active tab to show the group selector
            chrome.tabs.sendMessage(tab.id, {
                action: 'SHOW_GROUP_SELECTOR',
                channelIdentifier: channelIdentifier,
                url: url
            });
        }
    });
}
