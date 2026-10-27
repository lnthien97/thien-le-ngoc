#!/usr/bin/env python3
"""Add photos to a collection on the site.

Usage:
    tools/.venv/bin/python tools/add_photos.py photos-src/<collection>

Put originals (JPEG, PNG, HEIC, WebP, TIFF) in photos-src/<collection>/ and run
this whenever you add more. For each new photo it writes into anh/<slug>/:

    <name>.webp        large version, long edge <= --size (default 2000px)
    <name>-thumb.webp  thumbnail for the grid (default 800px)

Photos are rotated according to their EXIF orientation and ALL metadata
(including GPS location) is dropped. Only the date taken is kept, in
anh/<slug>/photos.json, which is used to sort photos newest first.

anh/collections.json is updated too: a new collection gets its folder name as
title (edit title/description/cover there afterwards); the count is refreshed
on every run, and "updated" becomes today whenever new photos are added, so
recently updated collections are listed first. Captions you add to
photos.json are kept.

Originals are never modified and stay out of git (photos-src/ is gitignored).
"""
import argparse
import json
import re
import sys
import unicodedata
from datetime import datetime
from pathlib import Path

from PIL import Image, ImageOps

try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
except ImportError:  # HEIC support is optional
    pass

REPO = Path(__file__).resolve().parent.parent
PHOTO_ROOT = REPO / "anh"
COLLECTIONS = PHOTO_ROOT / "collections.json"
EXTS = {".jpg", ".jpeg", ".png", ".heic", ".heif", ".webp", ".tif", ".tiff"}
REPO_WARN_MB = 800  # GitHub Pages sites are limited to 1 GB


def slugify(text):
    # "Đà Lạt 3" -> "da-lat-3"
    text = text.replace("đ", "d").replace("Đ", "D")
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    text = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return text or "photo"


def date_taken(im, src):
    """Date the photo was taken (EXIF DateTimeOriginal), else file mtime."""
    exif = im.getexif()
    raw = exif.get_ifd(0x8769).get(36867) or exif.get(306)  # DateTimeOriginal, DateTime
    if raw:
        try:
            return datetime.strptime(str(raw).strip()[:19], "%Y:%m:%d %H:%M:%S").isoformat()
        except ValueError:
            pass
    return datetime.fromtimestamp(src.stat().st_mtime).replace(microsecond=0).isoformat()


def save_webp(img, dest, max_edge, quality):
    im = img.copy()
    im.thumbnail((max_edge, max_edge), Image.LANCZOS)  # never upscales
    im.save(dest, "WEBP", quality=quality, method=6)  # no exif= -> metadata dropped
    return im.size


def read_json(path, default):
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else default


def write_json(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def dir_size_mb(path):
    return sum(f.stat().st_size for f in path.rglob("*") if f.is_file()) / 1024 / 1024


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("src", type=Path, help="folder with original photos, e.g. photos-src/da-lat")
    ap.add_argument("--slug", help="collection slug (default: from folder name)")
    ap.add_argument("--size", type=int, default=2000, help="long edge of large version (px)")
    ap.add_argument("--thumb", type=int, default=800, help="long edge of thumbnail (px)")
    ap.add_argument("--quality", type=int, default=80, help="WebP quality 0-100")
    ap.add_argument("--force", action="store_true", help="re-encode photos that were already processed")
    args = ap.parse_args()

    if not args.src.is_dir():
        sys.exit(f"not a folder: {args.src}")
    slug = slugify(args.slug or args.src.name)
    out_dir = PHOTO_ROOT / slug
    out_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = out_dir / "photos.json"
    existing = {p["file"]: p for p in read_json(manifest_path, [])}

    files = sorted(p for p in args.src.iterdir() if p.suffix.lower() in EXTS)
    if not files:
        sys.exit(f"no images found in {args.src}")

    added = 0
    for src in files:
        name = slugify(src.stem)
        large, thumb = out_dir / f"{name}.webp", out_dir / f"{name}-thumb.webp"
        if large.name in existing and large.exists() and thumb.exists() and not args.force:
            continue
        with Image.open(src) as im:
            taken = date_taken(im, src)
            im = ImageOps.exif_transpose(im)
            if im.mode not in ("RGB", "RGBA"):
                im = im.convert("RGB")
            w, h = save_webp(im, large, args.size, args.quality)
            tw, th = save_webp(im, thumb, args.thumb, args.quality)
        entry = existing.get(large.name, {})
        entry.update({"file": large.name, "thumb": thumb.name, "w": w, "h": h, "tw": tw, "th": th, "date": taken})
        entry.setdefault("caption", "")
        existing[large.name] = entry
        added += 1
        print(f"  + {src.name} -> {large.name} ({large.stat().st_size // 1024} KB)", file=sys.stderr)

    # Drop entries whose files were deleted by hand, newest first.
    photos = [p for p in existing.values() if (out_dir / p["file"]).exists()]
    photos.sort(key=lambda p: p["date"], reverse=True)
    write_json(manifest_path, photos)

    # Update the collection index.
    cols = read_json(COLLECTIONS, [])
    col = next((c for c in cols if c["slug"] == slug), None)
    if col is None:
        title = args.src.name
        col = {"slug": slug, "title": {"vi": title, "en": title}, "description": {"vi": "", "en": ""}, "cover": ""}
        cols.append(col)
        print(f"  new collection '{slug}' — edit its title/description in anh/collections.json", file=sys.stderr)
    if not col.get("cover") or not (out_dir / col["cover"]).exists():
        col["cover"] = photos[0]["thumb"] if photos else ""
    col["count"] = len(photos)
    if added or not col.get("updated"):
        col["updated"] = datetime.now().date().isoformat()  # day photos were added, not taken
    cols.sort(key=lambda c: c.get("updated", ""), reverse=True)
    write_json(COLLECTIONS, cols)

    print(f"\n{slug}: {added} new, {len(photos)} total", file=sys.stderr)
    total = dir_size_mb(PHOTO_ROOT)
    print(f"anh/ total: {total:.0f} MB", file=sys.stderr)
    if total > REPO_WARN_MB:
        print(f"WARNING: over {REPO_WARN_MB} MB — GitHub Pages limit is 1 GB. "
              "Lower --size/--quality or move older collections elsewhere.", file=sys.stderr)


if __name__ == "__main__":
    main()
