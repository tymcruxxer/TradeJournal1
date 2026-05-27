from __future__ import annotations

import struct
import sys
from pathlib import Path

from .config import _get_app_home


APP_NAME = "TradeJournal Sync Agent"
APP_EXE_NAME = "TradeJournal-Sync-Agent.exe"
WINDOW_TITLE = "TradeJournal Desktop Sync"
ICON_FILENAME = "tradejournal.ico"


def ensure_branding_assets(base_dir: Path | None = None) -> Path:
    assets_dir = base_dir or _default_assets_dir()
    assets_dir.mkdir(parents=True, exist_ok=True)

    icon_path = assets_dir / ICON_FILENAME
    if not icon_path.exists():
        icon_path.write_bytes(_build_ico())

    return assets_dir


def runtime_icon_path() -> Path:
    assets_dir = _default_assets_dir()
    ensure_branding_assets(assets_dir)
    return assets_dir / ICON_FILENAME


def _default_assets_dir() -> Path:
    if getattr(sys, "frozen", False):
        return _get_app_home() / "assets"

    return Path(__file__).resolve().parents[1] / "assets"


def _build_ico() -> bytes:
    size = 32
    pixels = _render_pixels(size)
    xor_bitmap = b"".join(_bgra(pixel) for row in reversed(pixels) for pixel in row)
    and_mask_stride = ((size + 31) // 32) * 4
    and_mask = b"\x00" * (and_mask_stride * size)

    bitmap_header = struct.pack(
        "<IIIHHIIIIII",
        40,
        size,
        size * 2,
        1,
        32,
        0,
        len(xor_bitmap) + len(and_mask),
        0,
        0,
        0,
        0,
    )

    image_data = bitmap_header + xor_bitmap + and_mask
    icon_dir = struct.pack("<HHH", 0, 1, 1)
    icon_entry = struct.pack(
        "<BBBBHHII",
        size,
        size,
        0,
        0,
        1,
        32,
        len(image_data),
        6 + 16,
    )
    return icon_dir + icon_entry + image_data


def _render_pixels(size: int) -> list[list[tuple[int, int, int, int]]]:
    pixels: list[list[tuple[int, int, int, int]]] = []
    center = (size - 1) / 2
    radius = size * 0.46

    for y in range(size):
        row = []
        for x in range(size):
            dx = x - center
            dy = y - center
            distance = (dx * dx + dy * dy) ** 0.5

            if distance > radius:
                row.append((0, 0, 0, 0))
                continue

            glow = max(0.0, 1.0 - distance / radius)
            top_mix = y / max(size - 1, 1)

            base_r = int(8 + 18 * glow + 18 * (1.0 - top_mix))
            base_g = int(20 + 58 * glow + 34 * (1.0 - top_mix))
            base_b = int(38 + 82 * glow + 68 * (1.0 - top_mix))
            alpha = 255

            if distance > radius * 0.86:
                edge = (distance - radius * 0.86) / max(radius * 0.14, 1)
                base_r = min(255, base_r + int(40 * (1 - edge)))
                base_g = min(255, base_g + int(70 * (1 - edge)))
                base_b = min(255, base_b + int(90 * (1 - edge)))

            row.append((base_r, base_g, base_b, alpha))
        pixels.append(row)

    for x in range(8, 25):
        _paint_glow_dot(pixels, x, 24 - int((x - 8) * 0.55), 2, (110, 240, 255, 255))

    for x in range(13, 25):
        _paint_glow_dot(pixels, x, 20 - int((x - 13) * 0.75), 1, (248, 250, 252, 230))

    return pixels


def _paint_glow_dot(
    pixels: list[list[tuple[int, int, int, int]]],
    center_x: int,
    center_y: int,
    radius: int,
    color: tuple[int, int, int, int],
) -> None:
    size = len(pixels)
    for y in range(max(0, center_y - radius), min(size, center_y + radius + 1)):
        for x in range(max(0, center_x - radius), min(size, center_x + radius + 1)):
            distance = ((x - center_x) ** 2 + (y - center_y) ** 2) ** 0.5
            if distance > radius + 0.35:
                continue

            factor = max(0.0, 1.0 - distance / max(radius + 0.35, 1))
            pixels[y][x] = _blend(pixels[y][x], color, factor)


def _blend(
    base: tuple[int, int, int, int],
    overlay: tuple[int, int, int, int],
    factor: float,
) -> tuple[int, int, int, int]:
    return (
        int(base[0] + (overlay[0] - base[0]) * factor),
        int(base[1] + (overlay[1] - base[1]) * factor),
        int(base[2] + (overlay[2] - base[2]) * factor),
        max(base[3], overlay[3]),
    )


def _bgra(pixel: tuple[int, int, int, int]) -> bytes:
    red, green, blue, alpha = pixel
    return bytes((blue, green, red, alpha))