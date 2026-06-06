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

  document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('cinematicToggle');
    const soundToggle = document.getElementById('cinematicSound');
    const soundContainer = soundToggle.closest('.toggle-container');

    // Hide mute toggle on Firefox
    if (isFirefox) {
      soundContainer.style.display = 'none';
    }

    // Helper function to safely send messages to content script
    async function sendMessageToActiveTab(message) {
      try {
        const tabs = await browserAPI.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (tabs[0]) {
          await browserAPI.tabs.sendMessage(tabs[0].id, message);
        }
      } catch (error) {
        console.log(
          '[Cinematic] ❌ Could not send message to content script:',
          error
        );
      }
    }

    // Load saved states and ensure initial sync
    browserAPI.storage.sync
      .get(['cinematicEnabled', 'cinematicMuted'])
      .then(result => {
        const isEnabled = result.cinematicEnabled !== false;
        toggle.checked = isEnabled;
        document.body.classList.toggle('cinematic-disabled', !isEnabled);

        // Sound toggle - default to muted only on Firefox if undefined
        const isMuted = result.cinematicMuted ?? isFirefox;
        soundToggle.checked = isMuted;

        sendMessageToActiveTab({
          action: 'toggleSound',
          muted: isMuted,
        });
      });

    // Handle main toggle
    toggle.addEventListener('change', async () => {
      const enabled = toggle.checked;
      document.body.classList.toggle('cinematic-disabled', !enabled);
      await browserAPI.storage.sync.set({ cinematicEnabled: enabled });

      try {
        const tabs = await browserAPI.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (tabs[0]) {
          try {
            await browserAPI.tabs.sendMessage(tabs[0].id, {
              action: 'togglecinematic',
              enabled: enabled,
            });
          } catch (error) {
            // Continue with page refresh even if message fails
          }

          // Refresh the page
          setTimeout(async () => {
            await browserAPI.tabs.update(tabs[0].id, {
              url: 'https://www.youtube.com/',
            });
          }, 500);
        }
      } catch (error) {
        console.log('[Cinematic] ❌ Error updating tab:', error);
      }
    });

    // Handle sound toggle
    soundToggle.addEventListener('change', async () => {
      // checked=true means muted=true
      const muted = soundToggle.checked;
      await browserAPI.storage.sync.set({ cinematicMuted: muted });
      sendMessageToActiveTab({
        action: 'toggleSound',
        muted: muted,
      });
    });

    // Listen for updates from content script
    browserAPI.runtime.onMessage.addListener(message => {
      if (message.action === 'updatePopupMute') {
        // Keep the inverse relationship (checked=true means unmuted)
        soundToggle.checked = !message.muted;
      }
    });
  });

})();
