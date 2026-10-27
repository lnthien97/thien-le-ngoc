#!/usr/bin/env python3
"""Resize and compress photos for the site, then print a gallery HTML snippet.

Usage:
    tools/.venv/bin/python tools/add_photos.py photos-src/<slug> [--slug <slug>]

For every image in the source folder (JPEG, PNG, HEIC, WebP, TIFF) it writes
two WebP files into blog/img/<slug>/:

    <name>.webp        large version, long edge <= --size (default 2000px)
    <name>-thumb.webp  thumbnail for the gallery grid (default 800px)

Photos are rotated according to their EXIF orientation, and ALL metadata
(including GPS location) is dropped. Originals are never modified and should
stay out of git (photos-src/ is in .gitignore).
"""
import argparse
import re
import sys
import unicodedata
from pathlib import Path

from PIL import Image, ImageOps

try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
except ImportError:  # HEIC support is optional
    pass

REPO = Path(__file__).resolve().parent.parent
IMG_ROOT = REPO / "blog" / "img"
EXTS = {".jpg", ".jpeg", ".png", ".heic", ".heif", ".webp", ".tif", ".tiff"}
REPO_WARN_MB = 800  # GitHub Pages sites are limited to 1 GB


def slugify(text):
    # "Đà Lạt 3" -> "da-lat-3"
    text = text.replace("đ", "d").replace("Đ", "D")
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    text = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return text or "photo"


def save_webp(img, dest, max_edge, quality):
    im = img.copy()
    im.thumbnail((max_edge, max_edge), Image.LANCZOS)  # never upscales
    im.save(dest, "WEBP", quality=quality, method=6)  # no exif= -> metadata dropped
    return im.size


def dir_size_mb(path):
    return sum(f.stat().st_size for f in path.rglob("*") if f.is_file()) / 1024 / 1024


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("src", type=Path, help="folder with original photos")
    ap.add_argument("--slug", help="post slug / output folder name (default: source folder name)")
    ap.add_argument("--size", type=int, default=2000, help="long edge of large version (px)")
    ap.add_argument("--thumb", type=int, default=800, help="long edge of thumbnail (px)")
    ap.add_argument("--quality", type=int, default=80, help="WebP quality 0-100")
    ap.add_argument("--force", action="store_true", help="re-encode even if output exists")
    args = ap.parse_args()

    if not args.src.is_dir():
        sys.exit(f"not a folder: {args.src}")
    slug = slugify(args.slug or args.src.name)
    out_dir = IMG_ROOT / slug
    out_dir.mkdir(parents=True, exist_ok=True)

    files = sorted(p for p in args.src.iterdir() if p.suffix.lower() in EXTS)
    if not files:
        sys.exit(f"no images found in {args.src}")

    figures = []
    before = after = 0
    for src in files:
        name = slugify(src.stem)
        large = out_dir / f"{name}.webp"
        thumb = out_dir / f"{name}-thumb.webp"

        if large.exists() and thumb.exists() and not args.force:
            with Image.open(thumb) as t:
                tw, th = t.size
            status = "skip"
        else:
            with Image.open(src) as im:
                im = ImageOps.exif_transpose(im)
                if im.mode not in ("RGB", "RGBA"):
                    im = im.convert("RGB")
                save_webp(im, large, args.size, args.quality)
                tw, th = save_webp(im, thumb, args.thumb, args.quality)
            status = "ok"

        before += src.stat().st_size
        after += large.stat().st_size + thumb.stat().st_size
        print(f"  {status:4} {src.name} -> {large.name} ({large.stat().st_size // 1024} KB)", file=sys.stderr)

        figures.append(
            f'  <figure><a href="img/{slug}/{large.name}">'
            f'<img src="img/{slug}/{thumb.name}" width="{tw}" height="{th}" alt="" loading="lazy">'
            f"</a></figure>"
        )

    print(f"\n{len(files)} photos: {before / 1024 / 1024:.1f} MB -> {after / 1024 / 1024:.1f} MB", file=sys.stderr)
    total = dir_size_mb(IMG_ROOT)
    print(f"blog/img total: {total:.0f} MB", file=sys.stderr)
    if total > REPO_WARN_MB:
        print(f"WARNING: over {REPO_WARN_MB} MB — GitHub Pages limit is 1 GB. "
              "Lower --size/--quality or move older albums elsewhere.", file=sys.stderr)

    print("\n<!-- Paste into blog/<slug>.html. Fill in alt text; add <figcaption> if you like. -->", file=sys.stderr)
    print('<div class="gallery">')
    print("\n".join(figures))
    print("</div>")


if __name__ == "__main__":
    main()
