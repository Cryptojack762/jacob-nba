# Builds one library per category: categories/<slug>/data.json + categories/<slug>/view.js (own script) + categories/index.json
# Run: python3 build/build_categories.py   (from the ksaju folder). Edit library_source.py or a category's view.js, then rebuild.
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from library_source import CATS
root = os.path.join(os.path.dirname(__file__), '..', 'categories')
index = []
VIEW = """// Own script for the "{name}" library. Edit this file to change how this one category looks or behaves.
window.KS_VIEWS = window.KS_VIEWS || {{}};
window.KS_VIEWS['{slug}'] = function (d, h) {{
  return h.entries(d);   // default layout; replace with custom HTML for this category if needed
}};
"""
for slug, (name, kind, entries) in CATS.items():
    d = os.path.join(root, slug); os.makedirs(d, exist_ok=True)
    data = {"slug": slug, "name": name, "kind": kind, "sheet_tab": "LIB_" + "_".join(w.capitalize() for w in slug.split('_')),
            "entries": [{"id": f"{slug}-{i+1:02d}", "title": t, "content": c, "source": s, "label": l, "verified": "Y"} for i, (t, c, s, l) in enumerate(entries)]}
    json.dump(data, open(os.path.join(d, 'data.json'), 'w'), ensure_ascii=False, indent=1)
    vp = os.path.join(d, 'view.js')
    if not os.path.exists(vp): open(vp, 'w').write(VIEW.format(name=name, slug=slug))   # never overwrite a customized view
    index.append({"slug": slug, "name": name, "kind": kind, "count": len(entries)})
json.dump(index, open(os.path.join(root, 'index.json'), 'w'), ensure_ascii=False, indent=1)
print(len(index), 'categories,', sum(i['count'] for i in index), 'entries')
