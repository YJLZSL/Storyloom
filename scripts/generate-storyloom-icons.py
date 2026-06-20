"""Generate the full Storyloom raster icon set from the brand palette.

Replaces the legacy `generate-icon.py` removed in v3.0 (the legacy script
produced a v1.x deep-indigo/teal quill+timeline visual that no longer
matches the Storyloom amber-brown loom brand).

The source of truth is `public/favicon.svg`, which uses these primitives:
- rounded square background, fill #A47148 (luosheng amber-brown)
- vertical warp threads (3, opacity 0.6, stroke #F5EFE2, width 1.6)
- horizontal weft threads (4, opacity 0.85, stroke #F5EFE2, width 2)
- weave nodes (4 small ivory dots) at the loom intersections

This script draws the same composition with Pillow at 1024x1024 then
downsamples to every required raster format.

Outputs (overwriting any old files):
- public/favicon.ico   (multi-size: 256/128/64/48/32/16)
- public/icon.ico      (same as favicon.ico — Electron build target)
- public/icon.png      (1024x1024 — Electron build target)
- public/apple-touch-icon.png  (180x180)
- public/icon-192.png  (192x192)
- public/icon-512.png  (512x512)
- public/icon-maskable.png  (512x512, with a safe-zone padding)
"""
from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
PUBLIC.mkdir(parents=True, exist_ok=True)

CANVAS = 1024
VIEWBOX = 64

BG = (164, 113, 72, 255)
THREAD = (245, 239, 226)


def s(v: float) -> float:
    """SVG viewBox unit -> canvas pixel."""
    return v * CANVAS / VIEWBOX


def render(masked_padding: float = 0.0) -> Image.Image:
    """Render the Storyloom mark.

    `masked_padding` shrinks the artwork inwards (used for the maskable PWA
    icon, which guarantees the brand stays inside the 80% safe zone).
    """
    img = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    d = ImageDraw.Draw(img, "RGBA")

    inset = masked_padding
    radius = s(12 - inset / 2)
    d.rounded_rectangle(
        [s(4 + inset), s(4 + inset), s(60 - inset) - 1, s(60 - inset) - 1],
        radius=radius,
        fill=BG,
    )

    def line(x1, y1, x2, y2, stroke_w, opacity):
        alpha = int(round(255 * opacity))
        color = (*THREAD, alpha)
        # Pillow's line endcap default is "butt"; we want the rounded look of
        # SVG `stroke-linecap="round"`, so we draw a fat line plus circle caps.
        w = int(round(s(stroke_w)))
        d.line(
            [(s(x1), s(y1)), (s(x2), s(y2))],
            fill=color,
            width=w,
        )
        r = w / 2
        d.ellipse([s(x1) - r, s(y1) - r, s(x1) + r, s(y1) + r], fill=color)
        d.ellipse([s(x2) - r, s(y2) - r, s(x2) + r, s(y2) + r], fill=color)

    for x in (20, 32, 44):
        line(x, 12, x, 52, 1.6, 0.60)

    for y in (18, 28, 38, 48):
        line(12, y, 52, y, 2.0, 0.85)

    for cx, cy in [(20, 18), (32, 28), (44, 38), (32, 48)]:
        r = s(3)
        d.ellipse(
            [s(cx) - r, s(cy) - r, s(cx) + r, s(cy) + r],
            fill=(*THREAD, 255),
        )

    if masked_padding > 0:
        # When generating maskable icon, fill the outer area with the same BG
        # so platforms that crop with a circle/squircle still see brand color.
        bg_layer = Image.new("RGBA", (CANVAS, CANVAS), BG)
        bg_layer.paste(img, (0, 0), img)
        return bg_layer

    return img


def save_png(path: Path, size: int, masked: bool = False) -> None:
    src = render(masked_padding=8.0 if masked else 0.0)
    out = src.resize((size, size), Image.LANCZOS)
    out.save(path, format="PNG")
    print(f"[ok] {path.relative_to(ROOT)} {size}x{size}")


def save_ico(path: Path) -> None:
    base = render()
    sizes = [256, 128, 64, 48, 32, 24, 16]
    frames = []
    for sz in sizes:
        frame = base.resize((sz, sz), Image.LANCZOS)
        # ICO spec is happier without per-frame alpha optimisation surprises.
        flat = Image.new("RGBA", (sz, sz), (0, 0, 0, 0))
        flat.paste(frame, (0, 0), frame)
        frames.append(flat)
    frames[0].save(
        path,
        format="ICO",
        sizes=[(sz, sz) for sz in sizes],
        append_images=frames[1:],
    )
    print(f"[ok] {path.relative_to(ROOT)} (multi-size: {sizes})")


def main() -> None:
    save_png(PUBLIC / "icon.png", 1024)
    save_png(PUBLIC / "apple-touch-icon.png", 180)
    save_png(PUBLIC / "icon-192.png", 192)
    save_png(PUBLIC / "icon-512.png", 512)
    save_png(PUBLIC / "icon-maskable.png", 512, masked=True)
    save_ico(PUBLIC / "icon.ico")
    save_ico(PUBLIC / "favicon.ico")


if __name__ == "__main__":
    main()
