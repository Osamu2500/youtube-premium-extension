const fs = require('fs');
const path = require('path');

function svgToUri(svg) {
  const compressed = svg.replace(/\s+/g, ' ').trim();
  const encoded = encodeURIComponent(compressed).replace(/'/g, '%27').replace(/"/g, '%22');
  return `url("data:image/svg+xml;charset=utf-8,${encoded}")`;
}

// Highly stylized SVG assets inspired by the user's mockups
const svgs = {
  daiGurrenSkull: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120">
      <path d="M 50 10 Q 90 10 90 50 Q 90 80 70 100 L 60 90 L 50 110 L 40 90 L 30 100 Q 10 80 10 50 Q 10 10 50 10 Z" fill="#cc0000"/>
      <!-- Flames -->
      <path d="M 50 10 Q 60 -10 50 -20 Q 70 0 70 -30 Q 90 -10 80 10" fill="#cc0000"/>
      <path d="M 50 10 Q 40 -10 50 -20 Q 30 0 30 -30 Q 10 -10 20 10" fill="#cc0000"/>
      <polygon points="20,40 80,40 50,70" fill="#111"/>
    </svg>`,
  drill: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 200">
      <polygon points="20,10 80,10 50,190" fill="#222" stroke="#00ff66" stroke-width="4"/>
      <path d="M 20 40 Q 50 60 80 40 M 25 80 Q 50 100 75 80 M 30 120 Q 50 140 70 120 M 35 160 Q 50 170 65 160" stroke="#00ff66" stroke-width="3" fill="none"/>
    </svg>`,
  onepiece: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100">
      <ellipse cx="100" cy="80" rx="90" ry="15" fill="#d4a373"/>
      <path d="M 40 80 C 40 10, 160 10, 160 80 Z" fill="#faedcd"/>
      <path d="M 45 70 Q 100 85 155 70 L 157 78 Q 100 93 43 78 Z" fill="#d00000"/>
    </svg>`,
  naruto: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="45" fill="#bb0000" stroke="#000" stroke-width="4"/>
      <circle cx="50" cy="50" r="10" fill="#000"/>
      <path d="M 50 20 A 10 10 0 1 1 60 10 C 60 25 45 25 50 20 Z" fill="#000" transform="rotate(0 50 50)"/>
      <path d="M 50 20 A 10 10 0 1 1 60 10 C 60 25 45 25 50 20 Z" fill="#000" transform="rotate(120 50 50)"/>
      <path d="M 50 20 A 10 10 0 1 1 60 10 C 60 25 45 25 50 20 Z" fill="#000" transform="rotate(240 50 50)"/>
    </svg>`,
  bleach: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 150">
      <ellipse cx="50" cy="60" rx="40" ry="50" fill="#fff" stroke="#cc0000" stroke-width="2"/>
      <path d="M 20 70 L 40 140 L 60 140 L 80 70 Z" fill="#fff"/>
      <path d="M 25 45 Q 40 35 45 55 Q 30 60 25 45 Z" fill="#000"/>
      <path d="M 75 45 Q 60 35 55 55 Q 70 60 75 45 Z" fill="#000"/>
      <line x1="30" y1="100" x2="70" y2="100" stroke="#000" stroke-width="3"/>
      <line x1="40" y1="90" x2="40" y2="110" stroke="#000" stroke-width="2"/>
      <line x1="50" y1="90" x2="50" y2="110" stroke="#000" stroke-width="2"/>
      <line x1="60" y1="90" x2="60" y2="110" stroke="#000" stroke-width="2"/>
      <path d="M 75 45 Q 85 20 90 60" stroke="#cc0000" stroke-width="3" fill="none"/>
    </svg>`,
  sao: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="40" fill="none" stroke="#00bfff" stroke-width="2" stroke-dasharray="10 5"/>
      <path d="M 50 0 L 50 20 M 50 100 L 50 80 M 0 50 L 20 50 M 100 50 L 80 50" stroke="#00bfff" stroke-width="4"/>
      <polygon points="50,40 60,50 50,60 40,50" fill="#ff9900" opacity="0.8"/>
    </svg>`,
  zatchbell: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 200">
      <rect x="20" y="10" width="120" height="180" rx="10" fill="#8b0000"/>
      <rect x="10" y="10" width="20" height="180" fill="#4a0000"/>
      <circle cx="80" cy="100" r="30" fill="none" stroke="#ffd700" stroke-width="4"/>
      <path d="M 80 80 L 90 100 L 70 100 Z" fill="#ffd700"/>
      <path d="M 80 120 L 70 100 L 90 100 Z" fill="#ffd700"/>
      <path d="M 35 20 Q 80 40 125 20" stroke="#ffd700" stroke-width="3" fill="none"/>
      <path d="M 35 180 Q 80 160 125 180" stroke="#ffd700" stroke-width="3" fill="none"/>
    </svg>`,
  aot: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 150">
      <path d="M 75 20 C 120 20, 140 60, 140 120 C 100 90, 80 120, 75 140 C 70 120, 50 90, 10 120 C 10 60, 30 20, 75 20 Z" fill="none" stroke="#f0f0f0" stroke-width="4"/>
      <path d="M 75 30 L 30 70 L 60 70 L 40 90 L 65 90 L 50 110 L 75 110" fill="#fff" stroke="#333"/>
      <path d="M 75 30 L 120 70 L 90 70 L 110 90 L 85 90 L 100 110 L 75 110" fill="#295bb8" stroke="#333"/>
      <path d="M 10 10 L 140 140 M 140 10 L 10 140" stroke="#a0a0a0" stroke-width="6" opacity="0.3"/>
    </svg>`,
  drstone: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 150">
      <path d="M 40 20 L 60 20 L 60 60 L 80 130 L 20 130 L 40 60 Z" fill="none" stroke="#a9a9a9" stroke-width="4"/>
      <path d="M 23 120 L 77 120 L 73 100 L 27 100 Z" fill="#00ff66" opacity="0.7"/>
      <circle cx="40" cy="110" r="3" fill="#fff"/>
      <circle cx="60" cy="115" r="4" fill="#fff"/>
      <circle cx="50" cy="105" r="2" fill="#fff"/>
    </svg>`
};

const renderers = "ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer, ytd-grid-video-renderer, .ypp-grid-item, yt-lockup-view-model:not(:is(ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer, ytd-grid-video-renderer, .ypp-grid-item) *)";

function makeSelector(theme, pseudo = "") {
  return `html[data-ypp-card-style="${theme}"] :is(${renderers})${pseudo}`;
}

let generatedCSS = `
/* MOCKUP-STYLE ULTRA DETAILED CARDS */
:root {
  --ypp-card-padding: 16px;
  --ypp-card-padding-left: 110px; /* Massive left padding for logos */
}

`;

const allThemes = ['gurrenlagann', 'onepiece', 'naruto', 'bleach', 'sao', 'drstone', 'zatchbell', 'aot'];

// Apply the massive left padding structure to all themes
generatedCSS += allThemes.map(t => makeSelector(t)).join(',\n') + ` {
  padding: var(--ypp-card-padding) !important;
  padding-left: var(--ypp-card-padding-left) !important;
  margin-bottom: 24px !important;
  position: relative !important;
  z-index: 1;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
}\n\n`;

// Thumbnail framing
generatedCSS += allThemes.map(t => `html[data-ypp-card-style="${t}"] ytd-thumbnail`).join(',\n') + ` {
  border-radius: 4px !important;
  box-shadow: 0 5px 15px rgba(0,0,0,0.9) !important;
  z-index: 2 !important;
  position: relative !important;
}\n\n`;

// Details positioning (Push title under thumbnail, keeping left area clear for logo)
generatedCSS += allThemes.map(t => `html[data-ypp-card-style="${t}"] #details.ytd-rich-grid-media`).join(',\n') + ` {
  margin-left: 0px !important; 
  padding-top: 10px !important;
  z-index: 2 !important;
  position: relative !important;
}\n\n`;

// 1. GURREN LAGANN (Dai-Gurren Frame)
generatedCSS += `
${makeSelector('gurrenlagann')} {
  background: #0f0a0a !important; /* Dark base */
  clip-path: polygon(15px 0, 100% 0, 100% calc(100% - 25px), calc(100% - 25px) 100%, 0 100%, 0 15px) !important;
  box-shadow: inset 0 0 0 2px #331111 !important;
}
${makeSelector('gurrenlagann', '::before')} {
  content: "" !important;
  position: absolute !important;
  top: 0; left: 0; right: 0; bottom: 0;
  /* Top-left flaming skull, Bottom-right diagonal slit lines */
  background-image: ${svgToUri(svgs.daiGurrenSkull)}, linear-gradient(45deg, #cc0000 10%, transparent 10%, transparent 15%, #cc0000 15%, #cc0000 20%, transparent 20%) !important;
  background-position: left 10px center, bottom -10px left -10px !important;
  background-repeat: no-repeat, no-repeat !important;
  background-size: 80px 100px, 100px 100px !important;
  opacity: 0.9 !important;
  z-index: -1 !important;
  border-bottom: 8px solid #cc0000 !important;
  transition: all 0.5s ease !important;
}
${makeSelector('gurrenlagann')} ytd-thumbnail {
  border: 3px solid #cc0000 !important;
  border-radius: 8px !important;
  clip-path: polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px) !important;
}
${makeSelector('gurrenlagann', ':hover')} {
  background: #1a0b0b !important;
  transform: scale(1.02) !important;
}
${makeSelector('gurrenlagann', ':hover::before')} {
  filter: drop-shadow(0 0 10px #ff0033);
  border-bottom: 8px solid #ff3333 !important;
}
`;

// 2. ONE PIECE (Wanted Frame)
generatedCSS += `
${makeSelector('onepiece')} {
  background: #faedcd !important;
  clip-path: polygon(0 0, 100% 0, 100% 100%, 80% 100%, 75% 95%, 25% 95%, 20% 100%, 0 100%) !important;
}
${makeSelector('onepiece', '::before')} {
  content: "" !important;
  position: absolute !important;
  top: 0; left: 0; right: 0; bottom: 0;
  background-image: ${svgToUri(svgs.onepiece)} !important;
  background-position: left 5px center !important;
  background-repeat: no-repeat !important;
  background-size: 90px !important;
  opacity: 1 !important;
  z-index: -1 !important;
  border: 4px solid #3b2a1a !important;
  border-radius: 2px !important;
  transition: all 0.5s ease !important;
}
${makeSelector('onepiece')} ytd-thumbnail {
  border: 4px solid #3b2a1a !important;
}
${makeSelector('onepiece', ':hover')} {
  background: #fff3e0 !important;
  transform: translateY(-5px) !important;
}
${makeSelector('onepiece')} #video-title, ${makeSelector('onepiece')} #channel-name, ${makeSelector('onepiece')} #metadata-line {
  color: #3b2a1a !important;
  font-family: 'Times New Roman', serif !important;
  font-weight: bold !important;
}
`;

// 3. NARUTO
generatedCSS += `
${makeSelector('naruto')} {
  background: #0f1218 !important; /* Deep blue/black */
  clip-path: polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%) !important;
  border-left: 5px solid #2a4b8d !important;
}
${makeSelector('naruto', '::before')} {
  content: "" !important;
  position: absolute !important;
  top: 0; left: 0; right: 0; bottom: 0;
  background-image: ${svgToUri(svgs.naruto)} !important;
  background-position: left 15px center !important;
  background-repeat: no-repeat !important;
  background-size: 70px !important;
  opacity: 0.8 !important;
  z-index: -1 !important;
  border-bottom: 5px solid #2a4b8d !important;
  transition: all 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
}
${makeSelector('naruto')} ytd-thumbnail {
  border: 3px solid #2a4b8d !important;
  clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px) !important;
}
${makeSelector('naruto', ':hover')} {
  background: #151a22 !important;
  transform: scale(1.02) !important;
}
${makeSelector('naruto', ':hover::before')} {
  opacity: 1 !important;
  transform: rotate(90deg) !important;
}
`;

// 4. BLEACH
generatedCSS += `
${makeSelector('bleach')} {
  background: #000 !important;
  clip-path: polygon(0 15px, 15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%) !important;
}
${makeSelector('bleach', '::before')} {
  content: "" !important;
  position: absolute !important;
  top: 0; left: 0; right: 0; bottom: 0;
  background-image: ${svgToUri(svgs.bleach)} !important;
  background-position: left 10px center !important;
  background-repeat: no-repeat !important;
  background-size: 80px !important;
  opacity: 0.9 !important;
  z-index: -1 !important;
  border-top: 2px solid #fff !important;
  border-bottom: 2px solid #fff !important;
  transition: all 0.3s ease !important;
}
${makeSelector('bleach')} ytd-thumbnail {
  border: 2px solid #fff !important;
}
${makeSelector('bleach', ':hover')} {
  background: #111 !important;
  transform: scale(1.03) !important;
}
${makeSelector('bleach', ':hover::before')} {
  filter: drop-shadow(0 0 10px #fff) !important;
}
`;

// 5. SAO
generatedCSS += `
${makeSelector('sao')} {
  background: #0a1118 !important;
  clip-path: polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px) !important;
}
${makeSelector('sao', '::before')} {
  content: "" !important;
  position: absolute !important;
  top: 0; left: 0; right: 0; bottom: 0;
  background-image: ${svgToUri(svgs.sao)} !important;
  background-position: left 10px center !important;
  background-repeat: no-repeat !important;
  background-size: 80px !important;
  opacity: 0.8 !important;
  z-index: -1 !important;
  border: 2px solid #00bfff !important;
  transition: all 0.3s ease !important;
}
${makeSelector('sao')} ytd-thumbnail {
  border: 2px solid #00bfff !important;
  clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px) !important;
}
${makeSelector('sao', ':hover')} {
  background: #0f1a24 !important;
  transform: scale(1.02) !important;
}
${makeSelector('sao', ':hover::before')} {
  opacity: 1 !important;
  box-shadow: inset 0 0 20px rgba(0,191,255,0.4) !important;
}
`;

// 6. ZATCH BELL
generatedCSS += `
${makeSelector('zatchbell')} {
  background: #1c0505 !important;
  clip-path: polygon(0 0, 100% 0, 100% 100%, 15px 100%, 0 calc(100% - 15px)) !important;
}
${makeSelector('zatchbell', '::before')} {
  content: "" !important;
  position: absolute !important;
  top: 0; left: 0; right: 0; bottom: 0;
  background-image: ${svgToUri(svgs.zatchbell)} !important;
  background-position: left 10px center !important;
  background-repeat: no-repeat !important;
  background-size: 80px !important;
  opacity: 0.9 !important;
  z-index: -1 !important;
  border-bottom: 5px solid #d4af37 !important;
  transition: all 0.4s ease !important;
}
${makeSelector('zatchbell')} ytd-thumbnail {
  border: 2px solid #d4af37 !important;
}
${makeSelector('zatchbell', ':hover')} {
  background: #2a0808 !important;
  transform: scale(1.02) !important;
}
${makeSelector('zatchbell', ':hover::before')} {
  filter: drop-shadow(0 0 15px #ffd700) !important;
}
`;

// 7. AOT
generatedCSS += `
${makeSelector('aot')} {
  background: #222 !important;
  clip-path: polygon(10px 0, 100% 0, 100% 100%, 0 100%, 0 10px) !important;
}
${makeSelector('aot', '::before')} {
  content: "" !important;
  position: absolute !important;
  top: 0; left: 0; right: 0; bottom: 0;
  background-image: ${svgToUri(svgs.aot)} !important;
  background-position: left 10px center !important;
  background-repeat: no-repeat !important;
  background-size: 80px !important;
  opacity: 0.8 !important;
  z-index: -1 !important;
  border-left: 8px solid #295bb8 !important;
  transition: all 0.5s ease !important;
}
${makeSelector('aot')} ytd-thumbnail {
  border: 2px solid #888 !important;
}
${makeSelector('aot', ':hover')} {
  background: #2a2a2a !important;
  transform: scale(1.02) !important;
}
${makeSelector('aot', ':hover::before')} {
  opacity: 1 !important;
}
`;

// 8. DR STONE
generatedCSS += `
${makeSelector('drstone')} {
  background: #0f1210 !important;
  clip-path: polygon(0 0, 100% 0, 95% 100%, 5% 100%) !important;
}
${makeSelector('drstone', '::before')} {
  content: "" !important;
  position: absolute !important;
  top: 0; left: 0; right: 0; bottom: 0;
  background-image: ${svgToUri(svgs.drstone)} !important;
  background-position: left 20px center !important;
  background-repeat: no-repeat !important;
  background-size: 60px !important;
  opacity: 0.8 !important;
  z-index: -1 !important;
  border-top: 4px solid #00ff66 !important;
  transition: all 0.5s ease !important;
}
${makeSelector('drstone')} ytd-thumbnail {
  border: 2px solid #555 !important;
  clip-path: polygon(0 0, 100% 0, 95% 100%, 5% 100%) !important;
}
${makeSelector('drstone', ':hover')} {
  background: #151a17 !important;
  transform: scale(1.03) !important;
}
${makeSelector('drstone', ':hover::before')} {
  opacity: 1 !important;
  filter: drop-shadow(0 0 10px #00ff66) !important;
}
`;

const targetPath = path.join(__dirname, 'src', 'content', 'features', 'global', 'layout', 'grid-layout.css');
let content = fs.readFileSync(targetPath, 'utf8');
const lines = content.split('\n');
const truncatedLines = lines.slice(0, 673);
const finalContent = truncatedLines.join('\n') + '\n' + generatedCSS;
fs.writeFileSync(targetPath, finalContent, 'utf8');
console.log('Ultra detailed UI CSS injected successfully!');
