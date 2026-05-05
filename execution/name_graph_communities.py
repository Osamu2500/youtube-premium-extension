"""
name_graph_communities.py
Reads graphify-out/graph.json, identifies communities, assigns semantic names
based on node labels, and rewrites graphify-out/GRAPH_REPORT.md with proper names.
"""

import json
import re
import os
from pathlib import Path
from collections import defaultdict
from datetime import date

ROOT = Path(__file__).parent.parent
# Use the full root graph (has all edges from LLM pass)
# We filter out Temporary/ nodes during extraction
GRAPH_JSON = ROOT / "graphify-out" / "graph.json"
# Write named report to both locations so MCP server and IDE both see it
REPORT_OUT_SRC = ROOT / "src" / "graphify-out" / "GRAPH_REPORT.md"
REPORT_OUT_ROOT = ROOT / "graphify-out" / "GRAPH_REPORT.md"

# ──────────────────────────────────────────────────────────────────────────────
# Semantic name rules: (regex_pattern, name, description)
# Matched against the SET of node labels in a community.
# First match wins.
# ──────────────────────────────────────────────────────────────────────────────
COMMUNITY_RULES = [
    # Infrastructure / Core Runtime
    (["FeatureManager", "applyFeatures", "instantiateFeatures", "setupLifecycleBindings"],
     "Feature Manager & Runtime", "Core runtime: instantiates, registers, and lifecycle-manages all features"),
    (["BaseFeature", "base-feature"],
     "Base Feature Class", "Abstract base class that all feature modules extend"),
    (["ElementCache", "element-cache"],
     "DOM Element Cache", "Caches and watches DOM elements to avoid repeated querySelector calls"),
    (["ErrorHandler", "error-handler", "handleError", "logError"],
     "Error Handler", "Global error capture, logging, and recovery for runtime faults"),
    (["UIManager", "ui-manager", "mount()", "heal()", "destroy()"],
     "UI Manager", "Mounts, heals, and removes dynamically injected UI widgets"),
    (["on()", "once()", "emit()", "event-bus"],
     "Event Bus", "Pub/sub event emitter powering page-change and feature coordination"),

    # Settings & Storage
    (["_defaults()", "migrate()", "validateAndMerge"],
     "Settings Schema & Migration", "Defines default settings, validates shape, and migrates legacy storage"),
    (["applyPreset", "applyPresetFromUI", "initThemeSelector", "queueSettingsWrite"],
     "Popup Settings & Presets", "Popup UI: theme selector, presets, heatmap widget, and debounced settings writes"),
    (["applySettings", "getConfigKey"],
     "Settings Application Bridge", "Bridges stored settings values to feature enable/disable calls"),

    # Theme & Visual Appearance
    (["NightModeManager", "night-mode", "_applyBlueLight", "_applyDim"],
     "Night Mode / Blue Light Filter", "Night mode manager: dims screen and injects blue-light CSS filters"),
    (["_applyCustomizationSettings", "_applyTheme", "_applyTrueBlack", "_applyVisibilitySettings", "_applyHideScrollbar"],
     "Theme Engine & Customization", "Applies color theme, true-black OLED mode, scrollbar hiding, and visibility toggles"),
    (["applyThemeToPopup", "_toggleTheme"],
     "Popup Theme Toggle", "Syncs the extension popup's own color theme to user preference"),

    # Layout & DOM Selectors
    (["getSelector()", "getChipsBar", "getComments", "getGrid", "getMasthead", "getMainGuide"],
     "YouTube DOM Selectors", "Centralized getter functions for every major YouTube DOM region"),
    (["addResizeListener", "applyGridLayout", "_debouncedApply", "LayoutManager"],
     "Layout Manager", "Responsive grid layout adjustments and viewport-aware debounced reflows"),
    (["header-nav", "_applySidebarState", "_injectButtons", "_observeHeader", "_scheduleInjection"],
     "Header Nav & Sidebar Injector", "Injects custom navigation buttons into the YouTube header and sidebar"),
    (["sidebar", "ensureSidebarState", "handleNavigation"],
     "Sidebar State Manager", "Persists and restores YouTube sidebar open/collapsed state across navigation"),

    # Player Core
    (["player.js", "_checkForPlayer", "_initConstants", "_initState", "_injectControls", "_cleanupListeners"],
     "Video Player Core", "Core player module: detects the player, manages state, and wires up control injection"),
    (["_applyCinemaStyle", "_applyDetoxStyle", "_applyFocusState", "_applyMinimalStyle", "_ensureTheaterMode"],
     "Player Mode Styles (Focus/Cinema/Detox)", "Applies cinema, focus, detox, and minimal visual mode styles to the player"),
    (["_applyAll", "_clickTheaterButton", "_enableAutoCinema", "_disableAutoCinema", "_disableAutoPiP"],
     "Player Mode Controller (Cinema/PiP)", "Orchestrates theater mode, auto-cinema, and picture-in-picture enable/disable"),

    # Video Controls
    (["createButton", "_createLoopButton", "_createPiPButton", "_createSnapshotButton", "_createSpeedControls", "handleAutoPiP", "injectControls"],
     "Custom Video Control Buttons", "Injects loop, PiP, snapshot, and speed controls into the player toolbar"),
    (["createSpeedPanel", "_enableCaptions", "_enforceState", "injectSpeedControl", "loadConfig"],
     "Speed Control & Captions", "Custom speed panel with persistent config and forced-captions support"),
    (["getVideoElement", "handleWheel", "wheel-controls"],
     "Wheel Volume/Seek Controls", "Mouse-wheel handler for volume and seek control on the video element"),

    # Audio
    (["_applyCompressorState", "_buildAudioGraph", "initAudioContext", "_restoreAudioState", "setBalance"],
     "Audio Compressor & Equalizer", "Dynamic audio compressor, stereo balance, and EQ graph construction"),
    (["disconnectAudio", "handleVideoLoaded", "setupAudioNodes", "volume-booster"],
     "Volume Booster", "Boosts volume beyond 100% by routing audio through a GainNode"),
    (["drawCurve", "injectEQStyles", "syncBandUI", "toggleEQPanel", "updateBalanceTrack", "updateGainTrack"],
     "Equalizer Panel UI", "Draws EQ frequency curve, renders band sliders, and toggles the EQ panel"),
    (["createPanel", "makeDraggable", "restorePosition", "_teardownAudio", "injectToggle"],
     "Draggable Audio Panel", "Renders the draggable floating audio tools panel with position persistence"),

    # Ambient & Visual FX
    (["_applyAmbientMode", "_clearCache", "_getAverageColor", "_initCanvas", "_loop"],
     "Ambient Mode (Background Glow)", "Samples video color and projects a live ambient glow behind the player"),
    (["applyOverlay", "injectCRTSVGFilter", "injectOverlayCSS", "injectSpecialEffectsSVG"],
     "CRT / Special Visual Effects", "Injects CRT scanline overlay and SVG-based special visual effect filters"),
    (["_applyComputedFilter", "_removeFilterPanel", "_restoreFilterState", "toggleFilterPanel"],
     "Video Filter Panel (Brightness/Contrast)", "Computed CSS filter panel for brightness, contrast, saturation, and hue"),
    (["buildAdjustTab", "buildPresetsTab", "createFilterPanel"],
     "Filter Panel Tab Builder", "Builds the Adjust and Presets tabs inside the video filter panel"),
    (["handleMutations", "injectStyles"],
     "CSS Style Injector", "Injects and reapplies dynamic CSS rules in response to DOM mutations"),

    # Playback & Time
    (["_checkWatchTimeAlert", "extractMetadata", "handlePause", "handlePlay", "_handleStartTracking", "handleTimeUpdate"],
     "Watch Time Tracker", "Tracks watch session time per video and fires alerts on usage limits"),
    (["getVideoId()", "handleVideoLoaded", "restoreTime()", "video-resumer"],
     "Video Resume / Timestamp Saver", "Saves and restores playback position across sessions per video ID"),
    (["_cacheVideoElement", "onVideoChange", "dom-observer"],
     "Video Element Cache Helper", "Caches the active video element reference and reacts to video changes"),
    (["showRemainingTime()"],
     "Remaining Time Display", "Overlays estimated remaining playback time on the player"),
    (["initDOM()", "injectToggleButton()", "startLoop()", "intentional-delay"],
     "Intentional Delay / Mindful Watch", "Adds a countdown delay before playback to encourage intentional viewing"),
    (["_getLikeButton()", "_isAlreadyLiked()", "_tryLike()", "_waitAndLike()", "auto-like"],
     "Auto-Like Feature", "Automatically clicks the Like button on videos after a configurable delay"),
    (["runAutoTasks()", "auto-pause", "auto-quality"],
     "Auto Video Tasks (Quality/Pause)", "Runs automated tasks on video change: quality selection, auto-pause, etc."),
    (["fetchDislikes()", "formatNumber()", "isWatchPage()", "updateUI()", "return-dislike"],
     "Return Dislike Count", "Fetches and displays the dislike count via the Return YouTube Dislike API"),
    (["clearSegments", "fetchSegments", "handleVideoLoaded", "handleNavigation"],
     "SponsorBlock Integration", "Fetches SponsorBlock segments and skips sponsored sections automatically"),
    (["calculateDuration", "formatTime", "renderCard"],
     "Playlist Duration Card", "Calculates and renders total playlist duration as a summary card"),
    (["_attemptBuild", "_build", "_esc", "_extractPlaylistData", "_isPlaylistPage", "_renderDurationCard", "_renderHTML"],
     "Playlist Tools UI", "Builds the extended playlist UI: duration card, HTML rendering, and page detection"),
    (["_attachToVideo", "_checkAndAttach", "_finishScroll", "_isOnShortsPage", "_onTimeUpdate"],
     "Shorts Auto-Scroll", "Auto-scrolls to the next Short when the current one ends"),

    # Feed & Content Control
    (["applyFeedFilters", "clearFeedFilters", "forceRefreshFeed", "setActiveFolder", "setupFeedFilters"],
     "Feed Folder Filter", "Filters the home/subscriptions feed by active channel folder/group"),
    (["_createChipsBar", "_extractDuration", "_extractIsMix", "_extractIsShort", "_extractTitle"],
     "Feed Chip Filter Builder", "Extracts video metadata and builds the custom chips/filter bar on feed pages"),
    (["applyFeedFilters", "organizeFeed", "_processGridItems", "handleTagClick", "loadTags"],
     "Feed Tag Organizer", "Organizes feed items by user-defined tags with clickable filter chips"),
    (["handleShortsAdded", "hideShortsGlobally", "checkRedirect", "_cleanupDOM"],
     "Shorts Hider & Redirect", "Removes Shorts from feeds globally and optionally redirects Shorts URLs"),
    (["_attachToVideo", "redirect-shorts", "onPageChange"],
     "Shorts Page Redirect", "Redirects the Shorts page to the regular watch page"),
    (["_cleanInlineStyles", "_flattenShelf", "_isFlattenableShelf", "_isShorts", "processAll", "processNode"],
     "Feed Shelf Flattener", "Flattens shelf containers in the feed and strips inline styles for clean layout"),

    # Content Visibility Controls
    (["hide-metrics"],
     "Hide Metrics (Likes/Views)", "Hides like counts, view counts, and other engagement metrics from the UI"),
    (["hide-playlists-podcasts"],
     "Hide Playlists & Podcasts", "Removes playlist and podcast entries from feed and sidebar"),
    (["hide-thumbnails"],
     "Hide Thumbnails", "Hides all video thumbnails to reduce visual noise and clickbait"),
    (["_checkRedirect()", "redirect-home"],
     "Redirect to Subscriptions on Home", "Redirects the YouTube home page to the subscriptions feed"),
    (["getThumbnailUrl", "getVideoTitle", "showThumbnailOverlay"],
     "Thumbnail Hover Preview", "Shows a large thumbnail overlay on card hover with title and URL"),
    (["scanForVideos()", "startObserver()", "stopObserver()", "hide-watched"],
     "Watched Video Hider", "Hides already-watched videos from feeds using stored watch history"),

    # Mark Watched
    (["_addContextMenu", "_addWatchedBadge", "_getVideoId", "_loadWatchedIds", "markAsWatched", "_processCard"],
     "Mark Watched (Context Menu)", "Adds right-click context menu to mark videos as watched and badge them"),
    (["_getWatchedIds()", "_processCards()"],
     "Watched Badge Renderer", "Scans feed cards and applies watched badges using stored IDs"),

    # Multi-Select
    (["_addToQueue", "_addToWatchLater", "_attachCheckboxes", "_clearAll", "_getVideoCards", "_init"],
     "Multi-Select & Batch Actions", "Adds checkboxes to video cards for batch queue/watch-later operations"),

    # Home Page
    (["home-organizer", "applyGridClass", "injectFilterBar", "injectManageButton", "injectOrganizerButton", "injectSidebarGroups"],
     "Home Feed Organizer", "Injects organizer, manage buttons, sidebar groups, and filter bars into the home feed"),
    (["openOrganizer", "promptNewCategory", "renderCategoriesList", "renderChannelsList", "_scrapeChannelsFromPage", "_addChannelToGroup"],
     "Channel Category Organizer UI", "Full UI for organizing channels into named categories via a modal organizer"),
    (["addChannelToGroup", "createGroup", "deleteGroup", "loadGroups", "removeChannelFromGroup", "saveGroups"],
     "Channel Group Storage", "CRUD operations for persisting channel groups to chrome.storage"),
    (["addChannelToFolder", "addFolder", "deleteFolder", "load()", "removeChannelFromFolder", "save()"],
     "Channel Folder Storage", "CRUD operations for persisting subscription folders to chrome.storage"),
    (["handleCardClick", "showGroupSelector"],
     "Channel Card Group Selector", "Click handler that opens a group selector when a channel card is clicked"),

    # Watch Page Modes
    (["focus-mode", "zen-mode", "study-mode", "_applyFocusState"],
     "Focus / Zen / Study Modes", "Immersive viewing modes that strip distractions from the watch page"),
    (["modes-manager", "_applyAll"],
     "Watch Mode Manager", "Orchestrates switching between Focus, Zen, Study, and Cinema modes"),
    (["comment-filter", "continue-watching"],
     "Watch Page Utilities", "Comment filtering and continue-watching prompt suppression"),

    # Search
    (["SearchRedesign", "search-redesign", "_handleNavigation", "_removeClasses"],
     "Search Page Redesign", "Restyles the search results page with a cleaner layout"),

    # Subscriptions
    (["subs-ui-filter", "_filterFeedNow", "injectFilterBar", "reapplyFilters", "renderFilterBar"],
     "Subscriptions Feed Filter UI", "Injects a filter bar into the subscriptions page to hide/show by criteria"),

    # Library
    (["applyViewMode", "setViewMode"],
     "Library View Mode Toggle", "Switches the library page between grid and list view modes"),

    # Stats & Data
    (["_aggregate", "_createOverlay", "_drawBarChart", "_enable", "_loadAndRender", "_renderChannels"],
     "Watch Stats Overlay", "Aggregates watch history data and renders bar charts in an overlay panel"),
    (["createWidget", "_handleVisibility", "injectComponentStyles", "loadStats", "_mountAndStart", "mountUI"],
     "Stats Widget UI", "Mounts the stats widget component with visibility controls and data loading"),
    (["extractData()", "scrapeFromScriptTags()"],
     "YouTube Data Scraper", "Scrapes structured video/channel data from YouTube's embedded JSON script tags"),
    (["extractData()", "getAvatarUrl()", "account-menu-data"],
     "Account Menu Data Extractor", "Extracts user avatar URL and account data from the YouTube account menu DOM"),
    (["broadcastStats()", "getPlayer()", "stats-bridge"],
     "Stats Bridge (Injected Script)", "Injected page-script that reads player state and broadcasts stats to the extension"),

    # Keyboard & Accessibility
    (["_comboFromEvent", "_handleKey", "_normalizeCombo", "_showToast"],
     "Keyboard Shortcut Handler", "Normalizes key combos, dispatches shortcut actions, and shows toast feedback"),

    # Account Menu
    (["_clearAvatarPollTimer", "_clearPollTimer", "_doInject", "_findMenu", "_onMutation", "_scheduleAvatarRefresh"],
     "Account Menu Injector", "Polls and injects custom items into the YouTube account dropdown menu"),
    (["buildMenuHTML", "diskHTML", "esc()", "letterAvatar"],
     "Account Menu HTML Builder", "Builds the HTML for the custom account menu items and avatar templates"),

    # Global Bar
    (["attachBar", "_bindEvents", "updateBarPosition"],
     "Global Progress Bar", "Attaches and updates the custom global progress bar position"),

    # Minified Bundle (Temporary folder artifacts — not real features)
    (["n()", "r()", "o()", "a()", "1247()"],
     "Bundled Library Code (Temporary)", "Auto-generated/minified bundle code from Temporary/ — not a feature module"),
]


def match_community_name(source_files: list[str], node_labels: list[str]) -> tuple[str, str]:
    # Try to find the most common source file in the community
    file_counts = defaultdict(int)
    for sf in source_files:
        if sf and "Temporary" not in sf and "node_modules" not in sf:
            file_counts[sf] += 1
            
    if file_counts:
        most_common_file = max(file_counts.items(), key=lambda x: x[1])[0]
        base_name = most_common_file.replace("\\", "/").split("/")[-1]
        
        # Look for explicit rules matching the base name
        for keywords, name, desc in COMMUNITY_RULES:
            if any(k.lower() in base_name.lower() for k in keywords):
                return name, desc
                
        # Look for rules matching the labels as fallback
        label_set = set(node_labels)
        for keywords, name, desc in COMMUNITY_RULES:
            if any(k in label_set for k in keywords):
                return name, desc
                
        # Default to the file name
        return f"{base_name} Feature", f"Nodes primarily from {base_name}"

    # Absolute fallback
    if node_labels:
        return f"{node_labels[0][:30]} Cluster", "Auto-named from first node"
    return "Unknown Cluster", ""


def load_graph(path: Path) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def is_src_node(node: dict) -> bool:
    """Returns True if the node originates from src/ (not Temporary/ or other junk)."""
    # graphify stores origin as 'source_file'
    file_path = node.get("source_file", node.get("file", node.get("source", "")))
    if not file_path:
        return True  # keep unknown-source nodes
    fp = file_path.replace("\\", "/").lower()
    # Exclude minified bundles in Temporary/ or node_modules/
    return "temporary/" not in fp and "node_modules/" not in fp


def extract_communities(graph: dict) -> dict[str, dict]:
    """Returns {community_id: {'labels': [...], 'files': [...]}} — filtered to src/ nodes only."""
    communities = defaultdict(lambda: {"labels": [], "files": []})
    nodes = graph.get("nodes", [])
    for node in nodes:
        if not is_src_node(node):
            continue
        cid = str(node.get("community", "unknown"))
        label = node.get("label", node.get("id", ""))
        source_file = node.get("source_file", node.get("file", ""))
        if label:
            communities[cid]["labels"].append(label)
        if source_file:
            communities[cid]["files"].append(source_file)
    return communities


def get_god_nodes(graph: dict, top_n: int = 10) -> list[tuple[str, int]]:
    """Returns top N nodes by edge count. graphify uses 'links' not 'edges'."""
    edge_counts = defaultdict(int)
    for edge in graph.get("links", graph.get("edges", [])):
        edge_counts[edge.get("source", "")] += 1
        edge_counts[edge.get("target", "")] += 1

    # Map id -> label
    id_to_label = {}
    for node in graph.get("nodes", []):
        nid = node.get("id", "")
        label = node.get("label", nid)
        id_to_label[nid] = label

    # Filter to src nodes only
    src_nodes = {node.get("id") for node in graph.get("nodes", []) if is_src_node(node)}

    results = sorted(
        [(id_to_label.get(nid, nid), count)
         for nid, count in edge_counts.items()
         if nid in src_nodes],
        key=lambda x: -x[1]
    )
    return results[:top_n]


def compute_cohesion(graph: dict, node_ids: set) -> float:
    """Ratio of intra-community edges to max possible edges."""
    n = len(node_ids)
    if n < 2:
        return 1.0
    links = graph.get("links", graph.get("edges", []))
    intra = sum(
        1 for e in links
        if e.get("source") in node_ids and e.get("target") in node_ids
    )
    max_edges = n * (n - 1)
    return round(intra / max_edges, 2) if max_edges else 0.0


def build_node_id_map(graph: dict) -> dict[str, str]:
    """label -> id and id -> label"""
    m = {}
    for node in graph.get("nodes", []):
        nid = node.get("id", "")
        label = node.get("label", nid)
        m[label] = nid
        m[nid] = nid
    return m


def get_community_node_ids(graph: dict, cid: str) -> set:
    return {
        node.get("id", "")
        for node in graph.get("nodes", [])
        if str(node.get("community", "")) == cid and is_src_node(node)
    }


def write_report(graph: dict, communities: dict[str, list[str]], out_path: Path):
    all_links = graph.get("links", graph.get("edges", []))
    num_nodes = sum(1 for n in graph.get("nodes", []) if is_src_node(n))
    num_edges = len(all_links)
    num_communities = len(communities)
    today = date.today().isoformat()

    # Filter out minified/noise communities (those where >50% of labels are single chars or numbers)
    def is_noise_community(labels):
        noise = sum(1 for l in labels if re.match(r'^[\da-zA-Z]{1,4}\(\)$', l) or re.match(r'^\d+$', l))
        return len(labels) > 0 and noise / len(labels) > 0.5

    god_nodes = get_god_nodes(graph, top_n=10)

    lines = [
        f"# Knowledge Graph Report — YouTube Premium+ Extension  ({today})",
        "",
        "## Corpus Summary",
        f"- **{num_nodes}** nodes · **{num_edges}** edges · **{num_communities}** communities",
        "- Source: `src/` directory — all feature modules, infrastructure, and UI layers",
        "",
        "## Architecture Overview",
        "",
        "The extension is organized into **7 architectural layers**:",
        "",
        "| Layer | Description |",
        "|-------|-------------|",
        "| **Runtime Core** | FeatureManager, BaseFeature, ErrorHandler, UIManager, EventBus |",
        "| **Settings** | Schema/migration, popup UI, presets, storage writes |",
        "| **Theme & Visual** | Night mode, theme engine, OLED true-black, scrollbar control |",
        "| **Player Features** | Cinema/focus modes, speed, PiP, ambient mode, audio EQ, SponsorBlock |",
        "| **Feed & Content** | Feed filters, tag organizer, Shorts hider, watched hider, shelf flattener |",
        "| **Page Features** | Home organizer, search redesign, watch modes, subscriptions filter |",
        "| **Data & Stats** | Watch stats, data scraper, account menu, YouTube data API |",
        "",
        "## God Nodes (Most Connected — Core Abstractions)",
        "",
    ]

    for i, (label, count) in enumerate(god_nodes, 1):
        lines.append(f"{i}. `{label}` — **{count} edges**")

    lines += [
        "",
        "## Community Index",
        "",
        "| # | Name | Nodes | Cohesion |",
        "|---|------|-------|----------|",
    ]

    sorted_cids = sorted(communities.keys(), key=lambda x: int(x) if x.isdigit() else 9999)
    community_meta = {}

    for cid in sorted_cids:
        data = communities[cid]
        labels = data["labels"]
        files = data["files"]
        if is_noise_community(labels):
            name = "Bundled Library Code (Temporary)"
            desc = "Minified/bundled JS artifacts — not feature modules"
        else:
            name, desc = match_community_name(files, labels)
        node_ids = get_community_node_ids(graph, cid)
        cohesion = compute_cohesion(graph, node_ids)
        community_meta[cid] = (name, desc, labels, cohesion)
        anchor = name.lower().replace(" ", "-").replace("/", "").replace("(", "").replace(")", "").replace("&", "").replace(",", "")
        lines.append(f"| {cid} | [{name}](#{anchor}) | {len(labels)} | {cohesion} |")

    lines += ["", "---", "", "## Communities (Detailed)", ""]

    for cid in sorted_cids:
        name, desc, labels, cohesion = community_meta[cid]
        anchor = name.lower().replace(" ", "-").replace("/", "").replace("(", "").replace(")", "").replace("&", "").replace(",", "")
        lines.append(f"### {name}")
        if desc:
            lines.append(f"> {desc}")
        lines.append("")
        lines.append(f"- **Community ID**: {cid}  |  **Cohesion**: {cohesion}  |  **Nodes**: {len(labels)}")
        lines.append("")
        shown = labels[:12]
        rest = labels[12:]
        node_list = ", ".join(f"`{l}`" for l in shown)
        if rest:
            node_list += f" _(+{len(rest)} more)_"
        lines.append(f"**Nodes**: {node_list}")
        lines.append("")

    lines += [
        "---",
        "",
        "## Knowledge Gaps",
        "",
        "Communities with cohesion < 0.1 may represent:",
        "- Files that import many utilities without strong internal coupling",
        "- Bundled/minified code mixed in from `Temporary/` folder",
        "- Features that are planned but not yet fully connected",
        "",
        "> **Tip**: Run `python -m graphify update src/` (scoped to src only) to exclude",
        "> minified bundle artifacts from the `Temporary/` folder.",
    ]

    content = "\n".join(lines)
    out_path.write_text(content, encoding="utf-8")
    print(f"✅ Wrote named GRAPH_REPORT.md → {out_path}")
    print(f"   {num_communities} communities named, {num_nodes} nodes, {num_edges} edges")


def main():
    if not GRAPH_JSON.exists():
        print(f"❌ graph.json not found at {GRAPH_JSON}")
        print("   Run: python -m graphify update . first")
        return 1

    print(f"📂 Loading graph from {GRAPH_JSON} ...")
    graph = load_graph(GRAPH_JSON)
    communities = extract_communities(graph)
    links = graph.get('links', graph.get('edges', []))
    src_nodes = sum(1 for n in graph.get('nodes', []) if is_src_node(n))
    print(f"   {src_nodes} src nodes ({len(graph.get('nodes',[]))} total), {len(links)} edges, {len(communities)} communities")

    print("🏷️  Naming communities ...")
    write_report(graph, communities, REPORT_OUT_SRC)
    # Also copy to root graphify-out for MCP server
    REPORT_OUT_ROOT.parent.mkdir(parents=True, exist_ok=True)
    content = REPORT_OUT_SRC.read_text(encoding="utf-8")
    REPORT_OUT_ROOT.write_text(content, encoding="utf-8")
    print(f"✅ Also copied to {REPORT_OUT_ROOT}")
    return 0


if __name__ == "__main__":
    import sys
    sys.exit(main())
