"""
Fix styles.css: add .ypp-channel-page exclusion guards to all rules
that could bleed into the channel page.

Strategy:
- Rules that start with body.yt-premium-plus-theme or body.ypp-* 
  and touch rich-grid, rich-item, rich-section, grid-renderer, two-column, browse
  but are NOT already guarded for specific page types
  get :not(.ypp-channel-page) added after the body selector.
- Rules scoped to search/watch-specific features (ypp-search-grid-mode, ypp-hide-sidebar, etc.)
  are intentionally left alone if they're contextual enough.
"""

import re

DANGER_TERMS = [
    'ytd-rich-grid',
    'ytd-rich-item',
    'ytd-rich-section',
    'ytd-grid-video-renderer',
    'ytd-two-column',
    'ytd-browse',
]

# Lines that should NOT be modified - these are already page-specific
SAFE_CONTEXTS = [
    'page-subtype=',
    'ypp-channel-page',
    'ypp-watch-page',
    'ypp-playlist-page',
    'ypp-library-page',
    'ypp-history-page',
    'ypp-search-grid-mode',   # search-only feature, leave alone
    'ypp-hook-free',
    'ypp-shorts-page',
]

# Lines where we want to add :not(.ypp-channel-page) guard
def needs_guard(line):
    stripped = line.strip()
    # Must be a selector line (not a property or comment or empty)
    if not stripped or stripped.startswith('/*') or stripped.startswith('*') or stripped.startswith('//'):
        return False
    # Must involve a dangerous element
    has_danger = any(t in stripped for t in DANGER_TERMS)
    if not has_danger:
        return False
    # Must have our theme class to matter globally
    has_theme = 'yt-premium-plus-theme' in stripped or (stripped.startswith('.ypp-') and 'ypp-hide-shorts' in stripped or 'ypp-hide-mixes' in stripped)
    if not has_theme:
        return False
    # Must NOT already be guarded
    has_safe = any(g in stripped for g in SAFE_CONTEXTS)
    if has_safe:
        return False
    # Must be a CSS selector line (contains a CSS element name or class)
    if '{' in stripped or stripped.endswith(',') or stripped.endswith('{'):
        return True
    return False

def add_channel_guard(line):
    """Insert :not(.ypp-channel-page) after the body selector."""
    # For .yt-premium-plus-theme patterns
    line = re.sub(
        r'(body\.yt-premium-plus-theme)',
        r'\1:not(.ypp-channel-page)',
        line
    )
    # For .ypp-hide-shorts and .ypp-hide-mixes patterns
    line = re.sub(
        r'(body\.ypp-hide-shorts)',
        r'\1:not(.ypp-channel-page)',
        line
    )
    line = re.sub(
        r'(body\.ypp-hide-mixes)',
        r'\1:not(.ypp-channel-page)',
        line
    )
    # For .yt-premium-plus-theme without body (starts with .)
    line = re.sub(
        r'^(\s*)(\.yt-premium-plus-theme\s)',
        r'\1body.yt-premium-plus-theme:not(.ypp-channel-page) ',
        line
    )
    return line

with open('src/content/styles.css', encoding='utf-8') as f:
    lines = f.readlines()

modified_count = 0
new_lines = []
for i, line in enumerate(lines):
    if needs_guard(line):
        new_line = add_channel_guard(line)
        if new_line != line:
            modified_count += 1
            print(f"L{i+1}: MODIFIED")
            print(f"  FROM: {line.rstrip()}")
            print(f"  TO:   {new_line.rstrip()}")
        new_lines.append(new_line)
    else:
        new_lines.append(line)

with open('src/content/styles.css', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"\nDone. Modified {modified_count} lines.")
