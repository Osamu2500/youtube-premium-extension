const fs = require('fs');
let html = fs.readFileSync('src/popup/popup.html', 'utf8');

// 1. Remove Ambient Theater from Dashboard
html = html.replace(/<div class="mode-card" id="modeCard-ambientMode"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/, '');

// 2. Extract Theme Engine
const themeEngineMatch = html.match(/<div class="settings-section">\s*<div class="section-header">\s*<div class="section-title-wrap">\s*<div class="section-text-wrap">\s*<div class="section-title">Theme Engine<\/div>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/);
const themeEngine = themeEngineMatch ? themeEngineMatch[0] : '';
html = html.replace(themeEngine, '');

// 3. Extract Appearance (and remove duplicate sliders)
const appearanceStartStr = '<div class="settings-section">\n            <div class="section-header">\n               <div class="section-title-wrap">\n                  <div class="section-text-wrap">\n                     <div class="section-title">Appearance</div>';
const appearanceStartIndex = html.indexOf(appearanceStartStr);
const appearanceEndStr = '</div>\n          </div>\n\n          <div class="settings-section">\n            <div class="section-header">\n               <div class="section-title-wrap">\n                  <div class="section-text-wrap">\n                     <div class="section-title">Screen Filters</div>';
const appearanceEndIndex = html.indexOf(appearanceEndStr);

let appearanceHTML = html.substring(appearanceStartIndex, appearanceEndIndex + 16);

// Clean up AppearanceHTML to remove duplicates
appearanceHTML = appearanceHTML.replace(/<div class="inline-setting-row">\s*<div class="slider-row">\s*<div class="slider-label-row"><span class="name">Glass Blur[\s\S]*?<\/div>\s*<\/div>/, '');
appearanceHTML = appearanceHTML.replace(/<div class="inline-setting-row">\s*<div class="slider-row">\s*<div class="slider-label-row"><span class="name">Glass Tint Opacity[\s\S]*?<\/div>\s*<\/div>/, '');
appearanceHTML = appearanceHTML.replace(/<div class="inline-setting-row">\s*<div class="slider-row">\s*<div class="slider-label-row"><span class="name">Border Opacity[\s\S]*?<\/div>\s*<\/div>/, '');
appearanceHTML = appearanceHTML.replace(/<div class="inline-setting-row" style="margin-top: 10px;">\s*<div class="info"><span class="name">Enable Animations[\s\S]*?<\/div>/, '');
appearanceHTML = appearanceHTML.replace(/<div class="inline-setting-row">\s*<div class="info"><span class="name">Reduced Motion[\s\S]*?<\/div>\s*<label class="toggle"><input type="checkbox" id="reducedMotion" \/><span class="slider"><\/span><\/label>\s*<\/div>/, '');

html = html.substring(0, appearanceStartIndex) + html.substring(appearanceEndIndex);

// 4. Create Ambient Theater section HTML
const ambientHTML = `
          <div class="settings-section">
            <div class="section-header">
               <div class="section-title-wrap">
                  <div class="section-text-wrap">
                     <div class="section-title">Ambient Theater</div>
                     <div class="section-subtitle">Massive canvas ambilight behind video</div>
                  </div>
               </div>
            </div>
            <div class="card-group">
              <div class="setting-item">
                <div class="feature-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
                </div>
                <div class="info"><span class="name">Enable Ambilight</span></div>
                <label class="toggle"><input type="checkbox" id="ambientMode" /><span class="slider"></span></label>
              </div>
              <div class="setting-item">
                <div class="info"><span class="name">Light Intensity</span><span class="desc" id="ambientIntensityValue">0.6</span></div>
                <input type="range" id="ambientIntensity" class="ypp-slider" min="0.1" max="1.0" step="0.1" value="0.6">
              </div>
              <div class="setting-item">
                <div class="info"><span class="name">Glow Spread</span><span class="desc" id="ambientBlurValue">120px</span></div>
                <input type="range" id="ambientBlur" class="ypp-slider" min="20" max="200" step="10" value="120">
              </div>
            </div>
          </div>`;

// 5. Insert everything into tab-theming
const themingStartStr = '<!-- THEMING -->\n        <section id="tab-theming" class="tab-content">';
html = html.replace(themingStartStr, themingStartStr + '\n' + themeEngine + '\n' + appearanceHTML + '\n' + ambientHTML);

fs.writeFileSync('src/popup/popup.html', html);
console.log('Done modifying popup.html');
