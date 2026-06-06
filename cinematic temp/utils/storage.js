import browserAPI from './browser-polyfill.js';

const storage = {
  sync: {
    get: async (keys) => {
      try {
        return await browserAPI.storage.sync.get(keys);
      } catch (error) {
        console.error('Storage get error:', error);
        return {};
      }
    },
    set: async (items) => {
      try {
        return await browserAPI.storage.sync.set(items);
      } catch (error) {
        console.error('Storage set error:', error);
        return false;
      }
    }
  }
};

export default storage;