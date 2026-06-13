path = r"f:\Youtube 2.0\src\content\styles.css"
with open(path, 'r', encoding='utf-8') as f:
    data = f.read()

# Fix the specific syntax error
broken_str = "shape=\\\ncircle\\]"
data = data.replace(broken_str, 'shape="circle"]')

# Wait, let's also fix without backslash in bracket
broken_str2 = "shape=\\\ncircle]"
data = data.replace(broken_str2, 'shape="circle"]')

# The text from view_file was: shape=\\ \n circle\\]
import re
data = re.sub(r'shape=\\*\s*\n\s*circle\\*\]', 'shape="circle"]', data)

with open(path, 'w', encoding='utf-8') as f:
    f.write(data)
