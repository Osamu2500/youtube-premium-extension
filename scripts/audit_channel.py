"""
Audit styles.css to find selectors that could bleed into the channel page.
Prints line number and selector content for every dangerous unguarded rule.
"""

DANGER_TERMS = [
    'ytd-rich-grid',
    'ytd-rich-item',
    'ytd-rich-section',
    'ytd-grid-',
    'ytd-two-column',
    'ytd-browse',
]

GUARDS_OK = [
    'page-subtype=',
    'ypp-channel-page',
    'ypp-home-page',
    'ypp-watch-page',
    'ypp-playlist-page',
    'ypp-library-page',
    'ypp-history-page',
    'ypp-search-page',
]

with open('src/content/styles.css', encoding='utf-8') as f:
    lines = f.readlines()

dangerous = []
for i, line in enumerate(lines):
    stripped = line.strip()
    if stripped.startswith('/*') or not stripped:
        continue
    has_danger = any(t in stripped for t in DANGER_TERMS)
    if not has_danger:
        continue
    # must have our theme class to matter
    if 'yt-premium-plus-theme' not in stripped and '.ypp-' not in stripped:
        continue
    # skip if properly guarded
    has_guard = any(g in stripped for g in GUARDS_OK)
    if has_guard:
        continue
    dangerous.append((i + 1, stripped[:140]))

print(f"Found {len(dangerous)} potentially unguarded rules:\n")
for ln, s in dangerous:
    print(f"  L{ln}: {s}")
