// Service Worker for YouTube Premium Plus

const ALARM_NAME = 'ypp-focus-timer';

// Default Settings
const DEFAULT_SETTINGS = {
  premiumTheme: true,
  grid4x4: true,
  hideShorts: false,
  autoCinema: false,
  hideComments: false,
  hideMerch: false,
  hideEndScreens: false,
  blueProgress: false,
  zenMode: false,
  enableSnapshot: true,
  enableLoop: true,
  hookFreeHome: false,
  studyMode: false,
  hideMixes: false,
  hideWatched: false,
  enablePiP: true,
  enableTranscript: true,
  dopamineDetox: false,
  redirectShorts: false, // Moved logic here for consistency
  autoQuality: false,
  enableRemainingTime: false
};

// --- TIMER LOGIC (Robust End-Time Based) ---

async function startTimer(durationMinutes = 25) {
  const endTime = Date.now() + (durationMinutes * 60 * 1000);

  await chrome.storage.local.set({
    timerState: { isRunning: true, endTime: endTime, duration: durationMinutes }
  });

  chrome.alarms.create(ALARM_NAME, { when: endTime });
}

async function stopTimer() {
  await chrome.storage.local.set({
    timerState: { isRunning: false, endTime: null, duration: 25 }
  });
  chrome.alarms.clear(ALARM_NAME);
}

// Alarm Listener
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    stopTimer();
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'src/assets/icon.svg',
      title: 'Focus Session Complete',
      message: 'Great job! Take a break.',
      priority: 2
    });
  }
});

// --- MESSAGING ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_SETTINGS') {
    chrome.storage.local.get('settings', (data) => {
      sendResponse(data.settings || DEFAULT_SETTINGS);
    });
    return true;
  }

  if (request.action === 'getTimer') {
    chrome.storage.local.get('timerState', (data) => {
      const state = data.timerState || { isRunning: false, endTime: null };
      let timeLeft = 0;
      if (state.isRunning && state.endTime) {
        timeLeft = Math.max(0, Math.floor((state.endTime - Date.now()) / 1000));
        // If time is up but alarm hasn't fired/cleared yet (rare race condition), consider it done
        if (timeLeft === 0) {
          stopTimer();
          state.isRunning = false;
        }
      }
      sendResponse({ isRunning: state.isRunning, timeLeft });
    });
    return true;
  }

  if (request.action === 'startTimer') {
    startTimer().then(() => sendResponse({ success: true }));
    return true;
  }

  if (request.action === 'stopTimer') {
    stopTimer().then(() => sendResponse({ success: true }));
    return true;
  }

  if (request.action === 'resetTimer') {
    stopTimer().then(() => sendResponse({ success: true }));
    return true;
  }
});

// --- INIT ---
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[YPP] Service Worker Installed:', details.reason);
  const data = await chrome.storage.local.get('settings');
  const newSettings = { ...DEFAULT_SETTINGS, ...data.settings };
  await chrome.storage.local.set({ settings: newSettings });
});
