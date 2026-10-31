"""Built-in test image: a synthetic star field with two galaxies, a nebula, a star cluster,
a satellite trail, hot pixels and light-pollution glow, blurred and noisy.

Labelled "synthetic test field" in the UI. Because we know the truth, it proves the
pipeline keeps every real star and invents none.
"""
from __future__ import annotations

import io

import numpy as np
from PIL import Image


def make(seed: int = 11, w: int = 1024, h: int = 704) -> bytes:
    rng = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    img = np.full((h, w), 0.06, dtype=np.float32)
    # faint nebula glow
    img += 0.05 * np.exp(-(((xx - 0.62 * w) / (0.22 * w)) ** 2 + ((yy - 0.45 * h) / (0.3 * h)) ** 2))
    sig = 1.6  # seeing blur, sigma in px (FWHM ~3.8)
    n = 260
    xs, ys = rng.uniform(8, w - 8, n), rng.uniform(8, h - 8, n)
    fl = 0.04 + 1.6 * rng.pareto(1.6, n).clip(0, 6) / 6
    for x, y, f in zip(xs, ys, fl):
        x0, x1, y0, y1 = int(max(x - 12, 0)), int(min(x + 13, w)), int(max(y - 12, 0)), int(min(y + 13, h))
        img[y0:y1, x0:x1] += f * np.exp(-((xx[y0:y1, x0:x1] - x) ** 2 + (yy[y0:y1, x0:x1] - y) ** 2) / (2 * sig * sig))
    for gx, gy, a, b, th, f in [(0.28 * w, 0.32 * h, 22, 8, 0.6, 0.35), (0.74 * w, 0.72 * h, 15, 9, -0.9, 0.28)]:
        c, s = np.cos(th), np.sin(th)
        u, v = (xx - gx) * c + (yy - gy) * s, -(xx - gx) * s + (yy - gy) * c
        img += f * np.exp(-((u / a) ** 2 + (v / b) ** 2)) + 0.6 * f * np.exp(-((u / (a / 4)) ** 2 + (v / (b / 4)) ** 2))
    # an open cluster: a tight clump of stars
    cx, cy = 0.16 * w, 0.72 * h
    for _ in range(55):
        x, y = cx + rng.normal(0, 26), cy + rng.normal(0, 20)
        f = 0.05 + 0.5 * rng.pareto(2.2) / 4
        x0, x1, y0, y1 = int(max(x - 12, 0)), int(min(x + 13, w)), int(max(y - 12, 0)), int(min(y + 13, h))
        img[y0:y1, x0:x1] += f * np.exp(-((xx[y0:y1, x0:x1] - x) ** 2 + (yy[y0:y1, x0:x1] - y) ** 2) / (2 * sig * sig))
    # a satellite trail across the upper right
    x0t, y0t, x1t, y1t = 0.55 * w, 0.06 * h, 0.95 * w, 0.30 * h
    dx, dy = x1t - x0t, y1t - y0t
    t = np.clip(((xx - x0t) * dx + (yy - y0t) * dy) / (dx * dx + dy * dy), 0, 1)
    dist = np.hypot(xx - (x0t + t * dx), yy - (y0t + t * dy))
    img += 0.22 * np.exp(-(dist ** 2) / (2 * 1.3 ** 2)) * ((t > 0) & (t < 1))
    # light-pollution glow rising toward the lower left (a town over there)
    img += 0.05 * np.clip(1 - (xx / w) * 0.8 + (yy / h) * 0.9 - 0.5, 0, None)
    noisy = img + rng.normal(0, 0.03, img.shape).astype(np.float32)
    # hot pixels: isolated single-pixel spikes from the sensor
    for _ in range(40):
        noisy[int(rng.uniform(4, h - 4)), int(rng.uniform(4, w - 4))] += rng.uniform(0.4, 0.9)
    rgb = np.stack([noisy * 0.98, noisy, noisy * 1.06], axis=2)
    out = (np.clip(rgb / 1.2, 0, 1) * 65535).astype(np.uint16)
    buf = io.BytesIO()
    # 16-bit grayscale PNG keeps precision (Pillow cannot write 16-bit RGB)
    Image.fromarray(out[..., 1]).save(buf, format="PNG")
    return buf.getvalue()
