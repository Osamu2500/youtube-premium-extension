import io

with open('src/content/features/player/video-filters.js', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('\\`', '`').replace('\\${', '${')

with open('src/content/features/player/video-filters.js', 'w', encoding='utf-8') as f:
    f.write(content)
