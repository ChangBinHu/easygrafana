"""Package only runtime files and instructions, excluding tests and local demos."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parent
target = root / "dist" / "EasyGrafana.zip"
target.parent.mkdir(exist_ok=True)
with ZipFile(target, "w", ZIP_DEFLATED) as archive:
    for name in ("manifest.json", "query.js", "inline.js", "history.js", "background.js", "content.js", "json-viewer.js", "log-copy.js", "popup.html", "README.md", "EasyGrafana-需求说明.md"):
        archive.write(root / name, name)
print(target)
