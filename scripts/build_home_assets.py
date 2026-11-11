#!/usr/bin/env python3
"""Build the NEON XI v2 interface artwork from the approved source art.

Every output is cut from artwork that already ships in this repository, then
graded with one shared recipe so the set reads as a single family. Nothing is
downloaded and no stock imagery is introduced.

    python scripts/build_home_assets.py

Requires Pillow and NumPy. Outputs land in assets/ui/.
"""
from __future__ import annotations

import subprocess
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "ui"
HOME = ROOT / "side-games" / "assets" / "premium-home"
FONT = OUT / "fonts" / "src" / "BarlowCondensed-ExtraBoldItalic.ttf"
THUMB = (704, 396)  # 16:9, 2x of the largest phone tile

LIME = (186, 255, 24)
ICE = (154, 223, 255)


def load(path: Path) -> Image.Image:
    """Pillow's WebP decoder rejects a few of the older files; fall back to ImageMagick."""
    try:
        image = Image.open(path)
        image.load()
        return image
    except OSError:
        with tempfile.NamedTemporaryFile(suffix=".png") as tmp:
            subprocess.run(["convert", str(path), tmp.name], check=True)
            image = Image.open(tmp.name)
            image.load()
            return image


def cover(image: Image.Image, size: tuple[int, int], focus=(0.5, 0.5)) -> Image.Image:
    """Resize and crop to fill `size`, keeping `focus` (0..1) in frame."""
    tw, th = size
    scale = max(tw / image.width, th / image.height)
    resized = image.resize((round(image.width * scale), round(image.height * scale)), Image.LANCZOS)
    left = round((resized.width - tw) * focus[0])
    top = round((resized.height - th) * focus[1])
    return resized.crop((left, top, left + tw, top + th))


def grade(image: Image.Image, saturation=0.9, contrast=1.06, lift=0.0, gain=1.0) -> Image.Image:
    """Shared grade: gentle S-curve, slightly reduced saturation, graphite shadows."""
    a = np.asarray(image.convert("RGB"), dtype=np.float32) / 255.0
    luma = (a * np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)).sum(axis=2, keepdims=True)
    a = luma + (a - luma) * saturation
    a = (a - 0.5) * contrast + 0.5
    a = a * gain + lift
    # Cool the deepest shadows a touch so blacks sit in the interface graphite.
    shadow = np.clip(1.0 - luma * 3.2, 0.0, 1.0)
    a += shadow * np.array([0.000, 0.006, 0.012], dtype=np.float32)
    return Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8), "RGB")


def rehue(image: Image.Image, target_deg: float, spread=0.12, saturation=0.82) -> Image.Image:
    """Map every hue into a narrow band around `target_deg` (keeps light and form)."""
    hsv = np.asarray(image.convert("HSV"), dtype=np.float32)
    hue = hsv[..., 0] / 255.0 * 360.0
    delta = ((hue - target_deg + 180.0) % 360.0) - 180.0
    hsv[..., 0] = ((target_deg + delta * spread) % 360.0) / 360.0 * 255.0
    hsv[..., 1] *= saturation
    return Image.fromarray(np.clip(hsv, 0, 255).astype(np.uint8), "HSV").convert("RGB")


def sharpen(image: Image.Image) -> Image.Image:
    return image.filter(ImageFilter.UnsharpMask(radius=1.4, percent=70, threshold=2))


def save(image: Image.Image, name: str, quality=80) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    target = OUT / name
    image.save(target, "WEBP", quality=quality, method=6)
    print(f"{name:26s} {image.width}x{image.height}  {target.stat().st_size / 1024:.0f} KB")


def glow_text(base: Image.Image, text: str, size: int, anchor_xy, colour, skew=0.0, glow=14, opacity=1.0):
    """Lit signage lettering: soft bloom underneath, crisp face on top."""
    font = ImageFont.truetype(str(FONT), size)
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).text(anchor_xy, text, font=font, fill=colour + (255,), anchor="mm")
    bloom = layer.filter(ImageFilter.GaussianBlur(glow))
    bloom.putalpha(bloom.getchannel("A").point(lambda v: int(v * 0.55)))
    out = base.convert("RGBA")
    out.alpha_composite(bloom)
    face = layer.copy()
    face.putalpha(face.getchannel("A").point(lambda v: int(v * opacity)))
    out.alpha_composite(face)
    return out.convert("RGB")


def build_background() -> None:
    src = load(HOME / "neon-xi-background-v4.png").convert("RGB")
    img = cover(src, (720, 1556))
    img = img.filter(ImageFilter.GaussianBlur(6))
    # Pull the warm street light toward neutral so the brand lime owns the colour.
    img = grade(img, saturation=0.5, contrast=1.08, gain=0.86)
    a = np.asarray(img, dtype=np.float32) / 255.0
    a *= np.array([0.90, 1.0, 1.06], dtype=np.float32)
    save(Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)), "bg-city.webp", quality=62)


def build_hero() -> None:
    src = load(ROOT / "assets" / "entry" / "first-login-v1.png").convert("RGB")
    img = src.crop((0, 694, 941, 1232))
    img = grade(img, saturation=0.84, contrast=1.05, gain=0.96)
    save(sharpen(img), "hero-draft.webp", quality=82)


def tile_from_home(box, name, hue=None, focus=(0.5, 0.5), saturation=0.92) -> None:
    src = load(HOME / "neon-xi-foreground-ice-v5.png").convert("RGB")
    img = src.crop(box)
    if hue is not None:
        img = rehue(img, hue)
    img = cover(img, THUMB, focus)
    save(sharpen(grade(img, saturation=saturation)), name)


def build_en11() -> None:
    src = load(ROOT / "side-games" / "football-xox" / "assets" / "xox-stadium-approved-v3.webp").convert("RGB")
    img = cover(src.crop((0, 40, 927, 640)), THUMB, (0.5, 0.2))
    img = grade(img, saturation=0.85, contrast=1.1, gain=1.05)
    # Scoreboard numerals standing on the pitch, with their reflection in the wet grass.
    cx, cy, size = THUMB[0] // 2, 186, 250
    lit = glow_text(Image.new("RGB", THUMB, (0, 0, 0)), "11", size, (cx, cy), LIME, glow=20)
    mirror = lit.transpose(Image.FLIP_TOP_BOTTOM).filter(ImageFilter.GaussianBlur(5))
    offset = 2 * (cy + size * 0.36) - THUMB[1]
    mirror = Image.fromarray(np.roll(np.asarray(mirror), int(offset), axis=0)) if offset else mirror
    fade = np.linspace(0.0, 1.0, THUMB[1], dtype=np.float32)[:, None, None]
    fade = np.clip((fade - (cy + size * 0.36) / THUMB[1]) * 3.2, 0, 1)
    fade = np.where(fade > 0, 0.34 * (1 - fade * 0.8), 0)
    base = np.asarray(img, dtype=np.float32)
    base = np.clip(base + np.asarray(mirror, dtype=np.float32) * fade, 0, 255)
    img = Image.fromarray(base.astype(np.uint8))
    img = glow_text(img, "11", size, (cx, cy), LIME, glow=20, opacity=0.97)
    save(img, "thumb-en11.webp")


def build_reverse() -> None:
    src = load(ROOT / "side-games" / "football-xox" / "assets" / "xox-stadium-approved-v3.webp").convert("RGB")
    img = cover(src.crop((0, 900, 927, 1500)), THUMB, (0.5, 0.5))
    img = rehue(grade(img, saturation=0.7, gain=0.62), 196, spread=0.2, saturation=0.9)
    # A waveform that plays outward from the centre and mirrors: the game is about reversed audio.
    rng = np.random.default_rng(11)
    layer = Image.new("RGBA", THUMB, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    bars, gap, width = 23, 9, 9
    heights = (np.abs(np.sin(np.linspace(0.35, 2.9, bars)) * rng.uniform(0.45, 1.0, bars)) * 118 + 14).astype(int)
    cx, cy = THUMB[0] // 2, THUMB[1] // 2 - 4
    for i, h in enumerate(heights):
        for sign, colour in ((-1, ICE), (1, LIME)):
            x = cx + sign * (14 + i * (width + gap)) - (width if sign < 0 else 0)
            draw.rounded_rectangle((x, cy - h, x + width, cy + h), radius=3, fill=colour + (235,))
    draw.rectangle((cx - 1, cy - 150, cx + 1, cy + 150), fill=(255, 255, 255, 150))
    bloom = layer.filter(ImageFilter.GaussianBlur(10))
    bloom.putalpha(bloom.getchannel("A").point(lambda v: int(v * 0.5)))
    out = img.convert("RGBA")
    out.alpha_composite(bloom)
    out.alpha_composite(layer)
    save(out.convert("RGB"), "thumb-reverse.webp")


def build_logo() -> None:
    src = load(ROOT / "assets" / "neon-xi-logo-outline.png").convert("RGBA")
    img = src.resize((640, round(src.height * 640 / src.width)), Image.LANCZOS)
    OUT.mkdir(parents=True, exist_ok=True)
    img.save(OUT / "logo-neon-xi.webp", "WEBP", quality=90, method=6)
    print(f"{'logo-neon-xi.webp':26s} {img.width}x{img.height}  {(OUT / 'logo-neon-xi.webp').stat().st_size / 1024:.0f} KB")


if __name__ == "__main__":
    build_background()
    build_hero()
    # Art areas of the four approved quiz cards (source pixels, inside the card frame).
    tile_from_home((58, 1074, 408, 1258), "thumb-xox.webp")
    tile_from_home((450, 1074, 800, 1258), "thumb-twin.webp", saturation=0.86)
    tile_from_home((58, 1358, 408, 1576), "thumb-imposter.webp", hue=172, focus=(0.5, 0.3))
    tile_from_home((450, 1358, 800, 1576), "thumb-wordle.webp", focus=(0.5, 0.55))
    build_en11()
    build_reverse()
    build_logo()
