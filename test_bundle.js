const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const bundleCode = fs.readFileSync('./dist/content.js', 'utf-8');

const dom = new JSDOM(`<!DOCTYPE html><html><body><div id="contents"></div></body></html>`, {
  runScripts: "dangerously",
  url: "https://www.youtube.com/"
});

const window = dom.window;

// Forward console
window.console = Object.assign({}, console);

// Mock Chrome API
window.chrome = {
  storage: {
    local: {
      get: (keys, cb) => cb({settings: {}}),
      set: (keys, cb) => { if(cb) cb(); }
    },
    onChanged: {
      addListener: () => {}
    }
  },
  runtime: {
    getURL: (path) => path
  }
};

try {
  window.eval(bundleCode);
  console.log("Evaluation completed.");
  // Check if features were registered
  console.log("Features registered on window:", Object.keys(window.YPP.features || {}));
} catch (e) {
  console.error("Evaluation threw error:");
  console.error(e.stack || e);
}
