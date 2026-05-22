import json
import sys

transcript_path = r"C:\Users\2005g\.gemini\antigravity-ide\brain\e07f482c-855f-4f90-8cc2-9662316a511d\.system_generated\logs\transcript.jsonl"
out_path = r"f:\Youtube 2.0\extracted_old_code.txt"

with open(transcript_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            if data.get('type') == 'USER_INPUT' and 'this is old code analyse it and if something is missing' in data.get('content', ''):
                with open(out_path, 'w', encoding='utf-8') as out_f:
                    out_f.write(data['content'])
                print("Found and extracted old CSS!")
                sys.exit(0)
        except:
            pass
