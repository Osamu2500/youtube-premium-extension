import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).parent.parent
with open(ROOT / "graphify-out" / "graph.json", encoding="utf-8") as f:
    g = json.load(f)

communities = defaultdict(list)
for node in g["nodes"]:
    sf = node.get("source_file", "?")
    cid = node.get("community", "?")
    communities[cid].append((sf, node.get("label", "")))

print(f"Total communities: {len(communities)}\n")
for cid in sorted(communities.keys()):
    entries = communities[cid]
    files = sorted(set(e[0] for e in entries if "Temporary" not in e[0] and "node_modules" not in e[0]))
    labels = [e[1] for e in entries if "Temporary" not in e[0] and e[1]][:4]
    if not files:
        continue
    short_files = [f.replace("\\", "/").split("/")[-1] for f in files[:2]]
    print(f"C{cid:>3} ({len(entries):>3}n) files={short_files}  labels={labels[:3]}")
