"""
Patches graphify-out/graph.json with semantic community names and
replaces all inline "Community N" strings baked into graph.html.
"""

import json
import re
import os

GRAPH_JSON = os.path.join(os.path.dirname(__file__), '..', 'graphify-out', 'graph.json')
GRAPH_HTML = os.path.join(os.path.dirname(__file__), '..', 'graphify-out', 'graph.html')

COMMUNITY_NAMES = {
    0:  "Content Control & Settings",
    1:  "Subscription Organizer UI",
    2:  "Feed Filter & Sort Engine",
    3:  "Settings Persistence & Theme Popup",
    4:  "Theme & Appearance Manager",
    5:  "Watch Page Modes (Cinema/Detox/Focus)",
    6:  "DOM Selector API",
    7:  "Home Feed Organizer",
    8:  "Player Mode Manager",
    9:  "Shorts Tools & Content Filter",
    10: "Playlist Redesign",
    11: "Watch History Tracker",
    12: "Ambient Mode",
    13: "Player Core & Controls Injector",
    14: "Mark-Watched & Context Menu",
    15: "Video Controls (Speed/Captions)",
    16: "Audio Compressor",
    17: "Keyboard Shortcuts",
    18: "Bulk Video Actions",
    19: "Stats Visualizer",
    20: "Subscriptions Page UI",
    21: "Account Menu Injector",
    22: "Layout Manager",
    23: "Home Organizer Tag System",
    24: "Shorts Redirect & Auto-Scroll",
    25: "Stats Widget UI",
    26: "Custom Player Buttons",
    27: "SponsorBlock",
    28: "Base Feature Lifecycle",
    29: "Header Navigation & Sidebar",
    30: "DOM Observer",
    31: "Volume Booster Panel",
    32: "Video Filters Panel",
    33: "Element Cache",
    34: "Feature Base",
    35: "Subscription Folder Card UI",
    36: "Feed Column Layout",
    37: "Return Dislike",
    38: "Video Resumer",
    39: "Feature Manager",
    40: "Search Redesign",
    41: "Subscription Group Storage",
    42: "Audio Mode",
    43: "Auto-Quality & Player Tasks",
    44: "Hide Thumbnails Overlay",
    46: "Night Mode Manager",
    47: "Sidebar State Manager",
    48: "Playlist Duration Calculator",
    49: "Search View Mode",
    50: "Auto-Like Feature",
    51: "Focus/Study Mode Toggle",
    52: "Hide Watched Videos",
    53: "Comment Filter",
    54: "Subscription Folder Storage",
    55: "Video Element Cache",
    56: "Global Progress Bar",
    57: "Mark-Watched Scanner",
    58: "Intentional Delay Overlay",
    59: "Time Remaining Display",
    60: "Error Handler",
    61: "Redirect Home",
    63: "Search Observer",
    64: "Wheel Controls",
    65: "Video Filter Overlay & FX",
    66: "Audio EQ Panel",
    67: "UI Manager",
    68: "Event Bus",
    69: "YouTube Data API",
    70: "Hide Metrics",
    71: "Hide Playlists & Podcasts",
    72: "Hide Thumbnails",
    73: "Redirect Home (Check)",
    74: "Account Menu HTML Builder",
    76: "Subscriptions Filter Bar",
    77: "Settings Schema Migration",
    78: "Video Filters UI Builder",
    79: "Background Service Worker",
    80: "Account Menu Data",
    82: "Stats Bridge",
    83: "Constants",
}


def patch_graph_json():
    print(f"Reading {GRAPH_JSON}...")
    with open(GRAPH_JSON, 'r', encoding='utf-8') as f:
        graph = json.load(f)

    graph['community_names'] = {str(k): v for k, v in COMMUNITY_NAMES.items()}

    patched = 0
    for node in graph.get('nodes', []):
        cid = node.get('community')
        if cid is not None and cid in COMMUNITY_NAMES:
            node['community_name'] = COMMUNITY_NAMES[cid]
            patched += 1

    with open(GRAPH_JSON, 'w', encoding='utf-8') as f:
        json.dump(graph, f, indent=2)

    print(f"  Patched {patched} nodes with community names in graph.json")
    return graph


def patch_graph_html():
    print(f"Reading {GRAPH_HTML}...")
    with open(GRAPH_HTML, 'r', encoding='utf-8') as f:
        html = f.read()

    # --- Step 1: Replace inline "community_name": "Community N" baked into HTML node data ---
    replaced_inline = 0
    for community_id, name in COMMUNITY_NAMES.items():
        old = f'"community_name": "Community {community_id}"'
        new = f'"community_name": "{name}"'
        count = html.count(old)
        if count:
            html = html.replace(old, new)
            replaced_inline += count
    print(f"  Replaced {replaced_inline}x inline community_name values in HTML node data")

    # --- Step 2: Inject getCommunityLabel JS helper after first <script> ---
    names_js = json.dumps({str(k): v for k, v in COMMUNITY_NAMES.items()}, indent=2)
    inject_block = f"""
    // === COMMUNITY NAME OVERRIDES ===
    var COMMUNITY_NAMES_MAP = {names_js};
    function getCommunityLabel(id) {{
        return COMMUNITY_NAMES_MAP[String(id)] || ('Community ' + id);
    }}
    // === END COMMUNITY NAME OVERRIDES ===
"""
    if '=== COMMUNITY NAME OVERRIDES ===' in html:
        html = re.sub(
            r'\n    // === COMMUNITY NAME OVERRIDES ===.*?// === END COMMUNITY NAME OVERRIDES ===\n',
            '',
            html,
            flags=re.DOTALL
        )
        print("  (removed old JS injection)")

    idx = html.find('<script>')
    if idx != -1:
        insert_at = idx + len('<script>')
        html = html[:insert_at] + inject_block + html[insert_at:]
        print("  Injected getCommunityLabel() JS helper")
    else:
        print("  WARNING: No <script> tag found, skipping JS injection")

    # --- Step 3: Replace sidebar label rendering patterns ---
    patterns = [
        (r"'Community '\s*\+\s*d\.community\b",    "getCommunityLabel(d.community)"),
        (r'"Community "\s*\+\s*d\.community\b',    "getCommunityLabel(d.community)"),
        (r"'Community '\s*\+\s*node\.community\b", "getCommunityLabel(node.community)"),
        (r'"Community "\s*\+\s*node\.community\b', "getCommunityLabel(node.community)"),
        (r"'Community '\s*\+\s*id\b",              "getCommunityLabel(id)"),
        (r'"Community "\s*\+\s*id\b',              "getCommunityLabel(id)"),
        (r'`Community \$\{d\.community\}`',         '`${getCommunityLabel(d.community)}`'),
        (r'`Community \$\{node\.community\}`',      '`${getCommunityLabel(node.community)}`'),
        (r'`Community \$\{community\}`',            '`${getCommunityLabel(community)}`'),
    ]
    replaced_patterns = 0
    for pattern, replacement in patterns:
        new_html, count = re.subn(pattern, replacement, html)
        if count:
            html = new_html
            replaced_patterns += count
            print(f"  Replaced {count}x pattern: {pattern[:60]}")

    with open(GRAPH_HTML, 'w', encoding='utf-8') as f:
        f.write(html)

    print(f"  Patched graph.html: {replaced_inline} inline values, {replaced_patterns} label patterns")


if __name__ == '__main__':
    patch_graph_json()
    patch_graph_html()
    print("\nDone! Open graphify-out/graph.html to see named communities.")
