import os

path = r"f:\Youtube 2.0\src\content\styles.css"
with open(path, 'rb') as f:
    data = f.read()

# Remove null bytes caused by UTF-16LE appending
clean_data = data.replace(b'\x00', b'')

with open(path, 'wb') as f:
    f.write(clean_data)
