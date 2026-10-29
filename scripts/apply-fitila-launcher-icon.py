#!/usr/bin/env python3
"""Rasterize the approved FITILA lantern artwork into Android launcher mipmaps.

Source: public/fitila-launcher-logo.svg. No default Flutter launcher assets
should survive in a release APK. Requires cairosvg (installed by CI).
"""
from pathlib import Path
import sys
import cairosvg

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public" / "fitila-launcher-logo.svg"
ANDROID = ROOT / "fitila_flutter/android/app/src/main/res"
DENSITIES = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}

if not SOURCE.is_file():
    sys.exit(f"Missing FITILA logo: {SOURCE}")

for density, pixels in DENSITIES.items():
    dst = ANDROID / f"mipmap-{density}" / "ic_launcher.png"
    dst.parent.mkdir(parents=True, exist_ok=True)
    cairosvg.svg2png(url=str(SOURCE), write_to=str(dst),
                     output_width=pixels, output_height=pixels)
    if not dst.is_file() or dst.stat().st_size < 200:
        sys.exit(f"Invalid FITILA launcher icon: {dst}")
    print(f"FITILA launcher icon: {dst.relative_to(ROOT)} ({pixels}x{pixels})")
