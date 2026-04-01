# YouTube Premium Plus Extension 🎬

> A powerful Chrome extension that transforms your YouTube experience with premium features, glassmorphism UI, and advanced content control.

[![Chrome](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)](https://github.com/Osamu2500/youtube-premium-extension)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-success)]()
[![Version](https://img.shields.io/badge/version-1.0.0-blue)]()
[![License](https://img.shields.io/badge/license-MIT-green)]()

## ✨ Features at a Glance

- 🎨 **Premium Glassmorphism & Themes** - Modern Material 3 design with full customizability
- 🎛️ **Customization Suite** - Change typography, layout density, card styles, and accent colors globally
- 🧭 **Enhanced Navigation** - Custom header buttons with glassmorphic styling
- 🏠 **Smart Feed Control** - Hide watched videos, remove shorts, customize layouts
- 🎯 **Focus Modes** - Zen Mode, Study Mode, and distraction-free viewing
- 🎬 **Advanced Player Tools** - Extra UI configurations, customized speeds, retro CRT emulators, cinema filters
- 🔍 **Search Redesign** - Grid view, clean filters, hide unwanted content
- 📱 **Custom Sidebar** - Floating squircle design with smooth animations
- 🔧 **Auto-Quality Control** - Force highest quality playback
- 📸 **Screenshot & Loop** - Built-in snapshot and video looping tools

## 📦 Installation

### From Source (Developer Mode)

1. **Clone the repository**

   ```bash
   git clone https://github.com/Osamu2500/youtube-premium-extension.git
   cd youtube-premium-extension
   ```

2. **Load in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable **Developer mode** (toggle in top-right corner)
   - Click **Load unpacked**
   - Select the `youtube-premium-extension` folder

3. **Start Using**
   - Navigate to [YouTube](https://youtube.com)
   - Click the extension icon in the toolbar to access settings
   - Customize your experience!

## 🎯 Quick Start

### Enable Core Features

1. **Click the extension icon** in your Chrome toolbar
2. Navigate through the **sidebar tabs**:
   - 🌐 **Global** - Theme and focus settings
   - 🧭 **Navigation** - Header buttons and sidebar control
   - 🏠 **Home** - Feed customization
   - 🔍 **Search** - Search layout and filters
   - ▶️ **Player** - Video player enhancements
   - ⚙️ **Settings** - Extension management

3. **Toggle features** using the modern glassmorphic switches

### Recommended Setup

For the best experience, enable these features:

- ✅ Premium Theme
- ✅ Header Navigation Buttons (Trending, Subscriptions, Watch Later)
- ✅ Hide Watched Videos
- ✅ Search Grid View
- ✅ Auto-Quality (1080p+)
- ✅ Remaining Time Display

## 🚀 Feature Categories

### 🎛️ Customization Suite

- **Typography & Font Scaling** - Select from Inter, System Defaults, Monospace, and customize font sizes.
- **Dynamic Layout Density** - Adjust margins dynamically (Compact, Comfortable, Spacious grids).
- **Accents & Card Styles** - Change UI themes to flat, elevated, or glassmorphic, and replace Youtube's default red color.
- **Animations & Motion** - Full control over CSS transition easing and general global animations.

### 🎨 Theme & UI

- **Premium Theme** - Glassmorphism with modern aesthetics
- **True Black Mode** - OLED-friendly pure black backgrounds
- **Hide Scrollbar** - Clean, minimal interface

### 🏠 Home Feed Control

- **Hook-Free Home** - Completely hide the recommended feed
- **Hide Watched** - Auto-hide videos you've already watched (>80% progress)
- **Hide Mixes** - Remove algorithmic mix playlists
- **Grid Layout** - Force 4x4 video grid display

### 🧭 Navigation

- **Custom Header Buttons** - Quick access to Trending, Shorts, Subscriptions, Watch Later, Playlists, and History
- **Force Hide Sidebar** - Replace YouTube's sidebar with clean header navigation

### 🔍 Search Tools

- **Grid View** - Display search results in a modern grid layout
- **Clean Search** - Hide "For You" and "People also watched" suggestions
- **Hide Shorts in Search** - Remove all Shorts from search results
- **Shorts Auto-Scroll** - Auto-play next Short

### ▶️ Player Enhancements

- **Auto-Quality** - Force 1080p+ quality on all videos
- **Remaining Time** - Show time left instead of elapsed time
- **Volume Booster** - Boost audio up to 600%
- **Custom Speed Control** - Precise playback speed input
- **Cinema Filters** - Brightness, contrast, and saturation controls
- **Snapshot Tool** - Take screenshots of the current frame
- **Loop Button** - One-click video looping
- **Picture-in-Picture** - Easy PiP mode toggle

### 🎯 Focus Modes

- **Zen Mode** - Distraction-free cinema view (hides comments & suggestions)
- **Study Mode** - Auto-enables 1.25x speed + captions for learning
- **Focus Mode** - Globally hide comments and suggested videos
- **Auto Cinema** - Automatically expand player to theater mode

### 🚫 Distraction Control

- **Hide Comments** - Remove the entire comments section
- **Hide End Screens** - No video suggestions or cards overlay
- **Hide Shorts Globally** - Remove all Shorts across YouTube

## 📖 Detailed Documentation

For comprehensive feature guides and tips, see [FEATURES.md](FEATURES.md).

## 🏗️ Architecture

This extension follows a modular, feature-based architecture:

```
src/
├── background/         # Service worker
├── content/
│   ├── features/      # Individual feature modules
│   │   ├── theme.js
│   │   ├── header-nav.js
│   │   ├── player.js
│   │   ├── zen-mode.js
│   │   └── ... (16 feature modules)
│   ├── feature-manager.js  # Centralized feature coordination
│   ├── constants.js        # Shared settings keys
│   ├── utils.js           # Helper functions
│   └── styles.css         # Global styling
├── popup/             # Extension popup UI
└── assets/            # Icons and images
```

### Design Principles

- **Feature Isolation** - Each feature is self-contained and independently toggleable
- **ES6 Modules** - Modern JavaScript with proper imports/exports
- **Chrome Storage** - Persistent settings across sessions
- **MutationObserver** - Reliable handling of YouTube's dynamic SPA

See [ARCHITECTURE.md](ARCHITECTURE.md) for technical details.

## 🛠️ Development

### Prerequisites

- Google Chrome (or Chromium-based browser)
- Basic understanding of Chrome Extension Manifest V3

### Making Changes

1. Edit files in the `src/` directory
2. Reload the extension in `chrome://extensions/`
3. Test on YouTube

### Adding New Features

1. Create a new module in `src/content/features/core|pages|player/`
2. Register the feature in `feature-manager.js`
3. Add settings keys to `constants.js`
4. Add UI controls in `popup/popup.html`

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Guidelines

- Follow the existing code style
- Test thoroughly on YouTube
- Update documentation for new features
- Keep features modular and isolated

## 🐛 Issues & Support

Found a bug or have a feature request?

- **Open an issue** on [GitHub Issues](https://github.com/Osamu2500/youtube-premium-extension/issues)
- Provide clear reproduction steps
- Include browser version and OS

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This extension is not affiliated with, endorsed by, or in any way officially connected with YouTube or Google LLC. It's a community project designed to enhance the user experience.

## 🙏 Acknowledgments

- Inspired by the YouTube power user community
- Built with modern web technologies and Chrome Extension APIs
- Design influenced by Material 3 and glassmorphism trends

---

<div align="center">

**Made with ❤️ for YouTube power users**

[Report Bug](https://github.com/Osamu2500/youtube-premium-extension/issues) · [Request Feature](https://github.com/Osamu2500/youtube-premium-extension/issues)

</div>
