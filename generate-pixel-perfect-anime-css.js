const fs = require('fs');
const path = require('path');

function svgToUri(svg) {
  const compressed = svg.replace(/\s+/g, ' ').trim();
  const encoded = encodeURIComponent(compressed).replace(/'/g, '%27').replace(/"/g, '%22');
  return `url("data:image/svg+xml;charset=utf-8,${encoded}")`;
}

const svgs = {
  skull: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120"><path d="M 50 10 Q 90 10 90 50 Q 90 80 70 100 L 60 90 L 50 110 L 40 90 L 30 100 Q 10 80 10 50 Q 10 10 50 10 Z" fill="#cc0000"/><path d="M 50 10 Q 60 -10 50 -20 Q 70 0 70 -30 Q 90 -10 80 10" fill="#cc0000"/><path d="M 50 10 Q 40 -10 50 -20 Q 30 0 30 -30 Q 10 -10 20 10" fill="#cc0000"/><polygon points="20,40 80,40 50,70" fill="#111"/></svg>`,
  drill: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 200"><polygon points="30,10 70,10 50,180" fill="#d4af37" stroke="#000" stroke-width="2"/><path d="M 30 40 L 70 40 M 35 80 L 65 80 M 40 120 L 60 120 M 45 150 L 55 150" stroke="#000" stroke-width="4" fill="none"/></svg>`,
  emc2: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50"><text x="10" y="40" font-family="Arial" font-size="30" font-weight="bold" fill="#304533" transform="rotate(-10 10 40)">E=mc²</text></svg>`,
  drStoneText: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50"><text x="10" y="40" font-family="Impact" font-size="24" fill="#304533">Dr.STONE</text></svg>`,
  senku: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 150"><path d="M 50 20 Q 70 0 90 20 Q 70 40 80 60 Q 60 60 60 90 L 50 120 L 40 90 Q 40 60 20 60 Q 30 40 10 20 Q 30 0 50 20 Z" fill="#99cfa3"/></svg>`,
  aotShield: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120"><path d="M 10 10 L 90 10 L 90 70 Q 50 120 10 70 Z" fill="#295bb8" stroke="#f0f0f0" stroke-width="4"/><path d="M 50 20 L 10 80 L 40 80 L 20 110 L 60 60 L 30 60 Z" fill="#fff"/><path d="M 50 20 L 90 80 L 60 80 L 80 110 L 40 60 L 70 60 Z" fill="#a0a0a0"/></svg>`
};

let generatedCSS = `
/* THE TRUE GRID: FORCING WIDE RECTANGLES AND PIXEL-PERFECT ALIGNMENT */

/* 1. Force YouTube's Grid to render WIDE cards (2 per row on standard screens) */
html[data-ypp-card-style] ytd-rich-grid-renderer {
  --ytd-rich-grid-items-per-row: 2 !important;
}
html[data-ypp-card-style] ytd-rich-grid-row > #contents {
  display: flex !important;
  flex-wrap: wrap !important;
}
html[data-ypp-card-style] ytd-rich-item-renderer {
  width: calc(50% - 16px) !important;
  max-width: calc(50% - 16px) !important;
  min-width: 480px !important;
  margin-right: 16px !important;
  flex-basis: auto !important;
  flex-grow: 1 !important;
  
  padding: 0 !important;
  margin-bottom: 24px !important;
  border-radius: 12px !important;
  position: relative !important;
  overflow: hidden !important;
  z-index: 1;
}

/* 2. Grid on #dismissible to separate Sidebar (Logo) from Content (Thumbnail/Text) */
html[data-ypp-card-style] ytd-rich-grid-media #dismissible {
  display: grid !important;
  grid-template-columns: 160px 1fr !important; /* Huge 160px sidebar for logos */
  grid-template-rows: auto auto !important;
  min-height: 250px !important;
}

/* We create a ::before element on dismissible that acts as the background/logo container in Column 1 */
html[data-ypp-card-style] ytd-rich-grid-media #dismissible::before {
  content: "" !important;
  grid-column: 1;
  grid-row: 1 / span 2;
  position: relative !important;
  z-index: 1 !important;
}

/* 3. Thumbnail goes to Top Right */
html[data-ypp-card-style] ytd-thumbnail {
  grid-column: 2 !important;
  grid-row: 1 !important;
  margin: 15px 15px 0 0 !important;
  border-radius: 4px !important;
  z-index: 2 !important;
}

/* 4. Details (Title/Channel) goes to Bottom Right */
html[data-ypp-card-style] #details {
  grid-column: 2 !important;
  grid-row: 2 !important;
  padding: 10px 15px 15px 0 !important;
  z-index: 3 !important;
  display: flex !important;
  flex-direction: column !important;
  justify-content: center !important;
}

html[data-ypp-card-style] #avatar-link { display: none !important; }
html[data-ypp-card-style] #video-title {
  font-size: 16px !important;
  font-weight: 900 !important;
  text-transform: uppercase !important;
  margin-bottom: 4px !important;
}


/* ========================================================= */
/* THEMES & VARIATIONS */
/* ========================================================= */

const renderers = "ytd-rich-item-renderer";
function sel(theme, nth = "", pseudo = "") {
  return \`html[data-ypp-card-style="\${theme}"] \${renderers}\${nth}\${pseudo}\`;
}
function diss(theme, nth = "", pseudo = "") {
  return \`html[data-ypp-card-style="\${theme}"] \${renderers}\${nth} ytd-rich-grid-media #dismissible\${pseudo}\`;
}
`;

const themes = ['gurrenlagann', 'aot', 'drstone'];

// -----------------------------------------
// GURREN LAGANN (Matches new mockups)
// -----------------------------------------

generatedCSS += `
${sel('gurrenlagann')} { background: #080808 !important; }
${sel('gurrenlagann')} #video-title, ${sel('gurrenlagann')} #metadata-line { color: #fff !important; }
${sel('gurrenlagann')} ytd-thumbnail { border: 2px solid #cc0000 !important; }

/* Variant 1: Red Skull & Splatter (Top Left) */
${diss('gurrenlagann', ':nth-child(3n+1)', '::before')} {
  background-image: ${svgToUri(svgs.skull)} !important;
  background-position: center 30px !important;
  background-repeat: no-repeat !important;
  background-size: 100px !important;
}
${sel('gurrenlagann', ':nth-child(3n+1)', '::after')} {
  /* The massive red wedge at the bottom and right edge */
  content: "" !important;
  position: absolute !important;
  bottom: 0; left: 0; right: 0;
  height: 80px !important;
  background: linear-gradient(90deg, #cc0000 0%, #cc0000 30%, transparent 30%, transparent 95%, #cc0000 95%, #cc0000 100%) !important;
  clip-path: polygon(0 100%, 30px 0, calc(100% - 30px) 0, 100% 100%) !important;
  z-index: 0 !important;
}

/* Variant 2: Golden Drill (Mid Right) */
${sel('gurrenlagann', ':nth-child(3n+2)')} { background: #000 !important; }
${sel('gurrenlagann', ':nth-child(3n+2)')} ytd-thumbnail { border: 2px solid #d4af37 !important; }
${diss('gurrenlagann', ':nth-child(3n+2)', '::before')} {
  background-image: ${svgToUri(svgs.drill)} !important;
  background-position: center 20px !important;
  background-repeat: no-repeat !important;
  background-size: 80px !important;
}
${sel('gurrenlagann', ':nth-child(3n+2)', '::after')} {
  /* Golden bottom bar */
  content: "" !important;
  position: absolute !important;
  bottom: 0; left: 0; right: 0;
  height: 80px !important;
  background: #d4af37 !important;
  clip-path: polygon(0 100%, 0 40px, 40px 0, 100% 0, 100% 100%) !important;
  z-index: 0 !important;
}

/* Variant 3: Black & Red */
${diss('gurrenlagann', ':nth-child(3n+3)', '::before')} {
  background-image: ${svgToUri(svgs.skull)} !important;
  background-position: center 30px !important;
  background-repeat: no-repeat !important;
  background-size: 100px !important;
  opacity: 0.5 !important;
}
${sel('gurrenlagann', ':nth-child(3n+3)', '::after')} {
  content: "" !important;
  position: absolute !important;
  bottom: 0; left: 0; right: 0;
  height: 60px !important;
  background: #4a0000 !important;
  z-index: 0 !important;
}
`;


// -----------------------------------------
// DR STONE
// -----------------------------------------
generatedCSS += `
${sel('drstone')} { background: #d8d3c5 !important; border: 1px solid #b5b0a3 !important; }
${sel('drstone')} ytd-thumbnail { border: 2px solid #304533 !important; clip-path: polygon(10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px), 0 10px) !important; }
${sel('drstone')} #video-title, ${sel('drstone')} #metadata-line { color: #111 !important; }

/* Variant 1: Beige E=mc2 */
${diss('drstone', ':nth-child(odd)', '::before')} {
  background-image: ${svgToUri(svgs.emc2)}, ${svgToUri(svgs.drStoneText)} !important;
  background-position: center 30px, center 90px !important;
  background-repeat: no-repeat !important;
  background-size: 100px 50px, 110px 40px !important;
}

/* Variant 2: Green Senku */
${sel('drstone', ':nth-child(even)')} { background: #111b14 !important; }
${sel('drstone', ':nth-child(even)')} ytd-thumbnail { border-color: #5b8765 !important; }
${sel('drstone', ':nth-child(even)')} #video-title, ${sel('drstone', ':nth-child(even)')} #metadata-line { color: #fff !important; }
${diss('drstone', ':nth-child(even)', '::before')} {
  background-image: ${svgToUri(svgs.senku)} !important;
  background-position: center 20px !important;
  background-repeat: no-repeat !important;
  background-size: 120px !important;
}
${sel('drstone', ':nth-child(even)', '::after')} {
  content: "" !important;
  position: absolute !important;
  bottom: 0; left: 0; right: 0; height: 80px !important;
  background: #5b8765 !important;
  clip-path: polygon(0 100%, 40px 0, 100% 0, 100% 100%) !important;
  z-index: 0 !important;
}
`;


// -----------------------------------------
// AOT (Attack on Titan)
// -----------------------------------------
generatedCSS += `
${sel('aot')} { background: #1a1815 !important; }
${sel('aot')} ytd-thumbnail { border: 2px solid #5a544a !important; }
${sel('aot')} #video-title, ${sel('aot')} #metadata-line { color: #fff !important; }

/* Variant 1: Survey Corps Beige/Dark */
${sel('aot', ':nth-child(odd)')} { background: #d3ccb9 !important; } /* Beige */
${sel('aot', ':nth-child(odd)')} #video-title, ${sel('aot', ':nth-child(odd)')} #metadata-line { color: #111 !important; }
${diss('aot', ':nth-child(odd)', '::before')} {
  background-image: ${svgToUri(svgs.aotShield)} !important;
  background-position: center 30px !important;
  background-repeat: no-repeat !important;
  background-size: 100px !important;
}

/* Variant 2: Dark Base */
${diss('aot', ':nth-child(even)', '::before')} {
  background-image: ${svgToUri(svgs.aotShield)} !important;
  background-position: center 30px !important;
  background-repeat: no-repeat !important;
  background-size: 100px !important;
}
${sel('aot', ':nth-child(even)', '::after')} {
  content: "" !important;
  position: absolute !important;
  bottom: 0; left: 0; right: 0; height: 60px !important;
  background: #5a544a !important;
  clip-path: polygon(0 100%, 20px 0, 100% 0, 100% 100%) !important;
  z-index: 0 !important;
}
`;


const targetPath = path.join(__dirname, 'src', 'content', 'features', 'global', 'layout', 'grid-layout.css');
let content = fs.readFileSync(targetPath, 'utf8');
const lines = content.split('\n');
const truncatedLines = lines.slice(0, 673);
const finalContent = truncatedLines.join('\n') + '\n' + generatedCSS;
fs.writeFileSync(targetPath, finalContent, 'utf8');
console.log('The TRUE Grid applied successfully!');
