(function () {
  'use strict';

  // Detect browser type more reliably
  const isChrome = (function () {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') return false;

    // Check for Chrome-specific properties
    return !!(
      (
        window.chrome &&
        typeof chrome === 'object' &&
        chrome.runtime &&
        chrome.runtime.id &&
        !window.browser
      ) // Make sure it's not Firefox
    );
  })();

  const isFirefox = typeof browser !== 'undefined';

  // Create a browser API compatibility layer
  const browserAPI = isFirefox
    ? browser
    : {
        ...chrome,
        runtime: {
          ...chrome.runtime,
          sendMessage: (...args) =>
            new Promise((resolve, reject) => {
              chrome.runtime.sendMessage(...args, response => {
                if (chrome.runtime.lastError) {
                  reject(chrome.runtime.lastError);
                } else {
                  resolve(response);
                }
              });
            }),
        },
        storage: {
          sync: {
            get: (...args) =>
              new Promise((resolve, reject) => {
                chrome.storage.sync.get(...args, result => {
                  if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                  } else {
                    resolve(result);
                  }
                });
              }),
            // Fixed implementation to ensure proper object handling
            set: items =>
              new Promise((resolve, reject) => {
                // Ensure items is an object
                const itemsObj =
                  typeof items === 'object' && items !== null ? items : {};
                chrome.storage.sync.set(itemsObj, () => {
                  if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                  } else {
                    resolve();
                  }
                });
              }),
          },
        },
        tabs: {
          ...chrome.tabs,
          create: (...args) =>
            new Promise((resolve, reject) => {
              chrome.tabs.create(...args, tab => {
                if (chrome.runtime.lastError) {
                  reject(chrome.runtime.lastError);
                } else {
                  resolve(tab);
                }
              });
            }),
        },
      };

  // Add debug logging to help troubleshoot
  console.debug('[Cinematic] Browser detection:', { isChrome, isFirefox });

  browserAPI.runtime.onInstalled.addListener(details => {
    if (details.reason === 'install') {
      // First set the storage
      browserAPI.storage.sync
        .set({
          cinematicEnabled: true,
          cinematicMuted: isFirefox, // Muted only on Firefox, unmuted on Chrome
        })
        .then(() => {
          browserAPI.tabs
            .create({
              url: 'https://www.youtube.com/',
              active: true,
            })
            .catch(err => console.error('Failed to create tab:', err));
        })
        .catch(err => console.error('Failed to set storage:', err));
    }
  });

})();
