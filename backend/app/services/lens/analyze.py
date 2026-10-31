"""Image Lab "Sky Analyst": declared repairs, entity labelling and shot diagnosis.

Everything here is measurement, never generation:
  repairs    hot-pixel removal (isolated single-pixel spikes only) and sky-glow flattening
             (subtracts a smooth 2nd-order surface fitted to the sky, never touches sources)
  entities   every detection gets a kind (star, bright star, double, galaxy candidate,
             nebula, trail), plus diffuse-glow regions (nebulosity / Milky Way band) and
             star-cluster candidates found from star density
  identify   when the file has sky coordinates (WCS): constellation, field of view and the
             famous deep-sky objects inside the frame
  diagnose   focus, tracking, noise, sky glow, sensor defects, saturation: each with a grade
             and a concrete tip for the next shot
"""
from __future__ import annotations

import numpy as np
from scipy import ndimage as ndi

DIRS = ["right", "upper right", "top", "upper left", "left", "lower left", "bottom", "lower right"]


# ---------------------------------------------------------------- repairs
def hot_pixels(arr: np.ndarray, lum: np.ndarray, rms: float, psf_fwhm: float | None, k: float = 6.0) -> tuple[np.ndarray, list[list[int]], str | None]:
    """Replace isolated single-pixel spikes (sensor hot pixels / cosmic-ray hits) by the local median.
    A real star is spread over several pixels by the optics, so its neighbours are lit too; a hot pixel
    stands alone. The cut is set from the measured PSF: the brightest neighbour must be far dimmer than
    any real star could make it. When stars are too sharp to tell apart (FWHM < 2.2 px) nothing is touched."""
    if not psf_fwhm or psf_fwhm < 2.2:
        return arr, [], "undersampled"
    expect = float(np.exp(-4 * np.log(2) / psf_fwhm ** 2))  # a star's neighbour, 1 px from its peak
    med = ndi.median_filter(lum, size=3)
    spike = lum - med
    ring = np.ones((3, 3), bool)
    ring[1, 1] = False
    neigh = ndi.maximum_filter(spike, footprint=ring, mode="nearest")
    hot = (spike > k * rms) & (neigh < 0.3 * expect * spike)
    n = int(hot.sum())
    if n == 0:
        return arr, [], None
    if n > 0.002 * lum.size:  # too many = not sensor defects; leave alone
        return arr, [], "too_many"
    out = arr.copy()
    if arr.ndim == 2:
        out[hot] = med[hot]
    else:
        for c in range(arr.shape[2]):
            mc = ndi.median_filter(arr[..., c], size=3)
            out[..., c][hot] = mc[hot]
    ys, xs = np.nonzero(hot)
    return out, [[int(x), int(y)] for x, y in zip(xs[:300], ys[:300])], None


def _poly_terms(x: np.ndarray, y: np.ndarray) -> np.ndarray:
    # plane (light pollution from one side) + radial bowl (vignetting). Deliberately too simple
    # to bend around a Milky Way band or a nebula, so those always survive flattening.
    return np.stack([np.ones_like(x), x, y, x * x + y * y], axis=-1)


def sky_glow(bkg: np.ndarray, lo: float, hi: float) -> dict:
    """Fit a smooth 2nd-order surface to the background map with outlier rejection, so local
    nebulosity is ignored and only broad glow (light pollution, moonlight, vignetting) is modelled."""
    h, w = bkg.shape
    g = 48
    ys = np.linspace(0, h - 1, g).astype(int)
    xs = np.linspace(0, w - 1, g).astype(int)
    sub = bkg[np.ix_(ys, xs)].astype(np.float64)
    X, Y = np.meshgrid(xs / (w - 1) * 2 - 1, ys / (h - 1) * 2 - 1)
    A = _poly_terms(X.ravel(), Y.ravel())
    z = sub.ravel()
    keep = np.ones_like(z, bool)
    coef = np.zeros(4)
    for _ in range(5):
        coef, *_ = np.linalg.lstsq(A[keep], z[keep], rcond=None)
        r = z - A @ coef
        s = 1.4826 * np.median(np.abs(r[keep] - np.median(r[keep]))) + 1e-12
        keep = np.abs(r) < 2.5 * s
    yy, xx = np.mgrid[0:h, 0:w]
    model = (_poly_terms((xx / (w - 1) * 2 - 1).astype(np.float32), (yy / (h - 1) * 2 - 1).astype(np.float32)) @ coef.astype(np.float32))
    span = float(model.max() - model.min())
    pct = 100.0 * span / max(hi - lo, 1e-9)
    # where is it brightest? compare 8 border points
    pts = [(1, 0), (0.7, -0.7), (0, -1), (-0.7, -0.7), (-1, 0), (-0.7, 0.7), (0, 1), (0.7, 0.7)]
    vals = [float((_poly_terms(np.array([px]), np.array([py])) @ coef)[0]) for px, py in pts]
    i = int(np.argmax(vals))
    return {"model": model.astype(np.float32), "pct": round(pct, 1), "toward": DIRS[i] if pct >= 3 else None,
            "residual": (bkg - model).astype(np.float32)}


def flatten(arr: np.ndarray, model: np.ndarray) -> np.ndarray:
    m = model - float(np.median(model))
    return arr - (m if arr.ndim == 2 else m[..., None])


# ---------------------------------------------------------------- entities
def _moments(mask: np.ndarray, weight: np.ndarray | None = None) -> dict:
    ys, xs = np.nonzero(mask)
    wts = np.ones(len(xs)) if weight is None else np.clip(weight[ys, xs], 1e-9, None)
    cx, cy = np.average(xs, weights=wts), np.average(ys, weights=wts)
    cov = np.cov(np.stack([xs - cx, ys - cy]), aweights=wts) if len(xs) > 2 else np.eye(2)
    ev, evec = np.linalg.eigh(cov)
    ev = np.clip(ev, 1e-6, None)
    a, b = 2.0 * np.sqrt(ev[1]), 2.0 * np.sqrt(ev[0])
    ang = float(np.degrees(np.arctan2(evec[1, 1], evec[0, 1])))
    return {"x": round(float(cx), 1), "y": round(float(cy), 1), "a": round(float(a), 1), "b": round(float(b), 1), "angle": round(ang, 1)}


def diffuse_regions(resid: np.ndarray, rms: float) -> list[dict]:
    """Localised glow left over after the smooth sky model: nebulosity or, when it is a long band
    crossing the frame, the Milky Way."""
    h, w = resid.shape
    sm = ndi.gaussian_filter(resid, sigma=max(2, min(h, w) / 120))
    # baseline and spread from the darker half of the sky, so a big bright band cannot hide itself
    base = float(np.percentile(sm, 25))
    low = sm[sm <= np.median(sm)]
    spread = 1.4826 * float(np.median(np.abs(low - np.median(low)))) + 1e-12
    thr = max(3 * spread, 0.4 * rms)
    sm = sm - base
    lab, n = ndi.label(sm > thr)
    out = []
    diag = float(np.hypot(w, h))
    for i in range(1, n + 1):
        m = lab == i
        area = int(m.sum())
        if area < 0.01 * h * w:
            continue
        mo = _moments(m, sm)
        excess = float(sm[m].mean()) / rms
        length = 2 * mo["a"]
        band = mo["a"] / max(mo["b"], 1) > 2.6 and length > 0.55 * diag
        out.append({**mo, "kind": "band" if band else "nebula", "area_pct": round(100 * area / (h * w), 1),
                    "strength": round(excess, 2)})
    out.sort(key=lambda r: -r["area_pct"] * r["strength"])
    return out[:6]


def clusters(stars: list[dict], shape: tuple[int, int]) -> list[dict]:
    """Star-cluster candidates: stars with far more neighbours than the frame average predicts
    (Poisson test on neighbour counts), linked into groups."""
    h, w = shape
    n = len(stars)
    if n < 60:
        return []
    from scipy.spatial import cKDTree
    pts = np.array([[s["x"], s["y"]] for s in stars])
    R = max(20.0, min(h, w) / 16)
    tree = cKDTree(pts)
    cnt = np.array([len(v) - 1 for v in tree.query_ball_point(pts, R)])
    wide = np.array([len(v) - 1 for v in tree.query_ball_point(pts, 3 * R)])
    local = np.maximum((wide - cnt) / 8.0, n * np.pi * R * R / (w * h) * 0.5)  # expected in R from the surrounding ring
    dense = np.nonzero((cnt >= 2.2 * local + 4.0 * np.sqrt(local)) & (cnt >= 7))[0]
    if len(dense) == 0:
        return []
    sub = cKDTree(pts[dense])
    seen: set[int] = set()
    out = []
    for i in range(len(dense)):
        if i in seen:
            continue
        stack, grp = [i], []
        seen.add(i)
        while stack:
            k = stack.pop()
            grp.append(k)
            for m in sub.query_ball_point(pts[dense[k]], R):
                if m not in seen:
                    seen.add(m)
                    stack.append(m)
        core = pts[dense[grp]]
        c = core.mean(axis=0)
        rad = float(np.percentile(np.hypot(*(core - c).T), 90)) + R * 0.5
        dist = np.hypot(*(pts - c).T)
        members = int(np.sum(dist <= rad))
        ring = int(np.sum((dist > rad) & (dist <= 2 * rad)))
        contrast = members / max(ring / 3.0, 1.0)  # ring has 3x the area of the core
        if members < 12 or contrast < 2.0 or rad > 0.25 * min(h, w):
            continue
        out.append({"x": round(float(c[0]), 1), "y": round(float(c[1]), 1), "r": round(rad, 1), "n": members,
                    "density": round(contrast, 1)})
    out.sort(key=lambda c: -c["n"])
    return out[:4]


def _inside(s: dict, e: dict) -> bool:
    th = np.radians(e.get("angle", 0))
    dx, dy = s["x"] - e["x"], s["y"] - e["y"]
    u, v = dx * np.cos(th) + dy * np.sin(th), -dx * np.sin(th) + dy * np.cos(th)
    a, b = e.get("a", e.get("r", 1)), e.get("b", e.get("r", 1))
    return (u / max(a, 1)) ** 2 + (v / max(b, 1)) ** 2 <= 1


def kinds(sources: list[dict], psf_fwhm: float | None, shape: tuple[int, int], rms: float,
          regions: list[dict] | None = None, known: list[dict] | None = None) -> list[dict]:
    """Give each detection a human kind (`class` star/extended stays as the science label).
    Returns trails as whole lines: deblending cuts one satellite streak into many pieces."""
    ref = psf_fwhm or (float(np.median([s["fwhm"] for s in sources])) if sources else 3.0)
    h, w = shape
    stars = [s for s in sources if s["class"] == "star"]
    bright_cut = np.percentile([s["flux"] for s in stars], 99) if len(stars) > 50 else (max((s["flux"] for s in stars), default=0) * 0.5)
    star_area = float(np.median([s["area"] for s in stars])) if stars else 30.0
    crowded = len(sources) / (h * w) * 1e4 > 15  # > 15 detections per 100x100 px: a Milky Way star field
    for s in sources:
        if s["class"] == "star":
            s["kind"] = "bright_star" if (s["saturated"] or s["flux"] >= bright_cut) else "star"
            continue
        length = 2.355 * s.get("a", s["fwhm"] / 2.355) * 2
        sb = s["flux"] / max(s["area"], 1) / rms  # mean surface brightness in sigma
        if s["ellipticity"] >= 0.75 and length > 5 * ref:
            s["kind"] = "trail"
        elif s["area"] > 0.002 * h * w or (sb < 2.5 and s["area"] > 120):
            s["kind"] = "nebula"
        elif s["area"] >= 4 * star_area and s["area"] >= np.pi * (2 * ref) ** 2:
            s["kind"] = "galaxy"
        else:
            s["kind"] = "fuzzy"  # too small to call: blended stars or a faint smudge
    # context: knots inside glowing regions or known nebulae are nebulosity, not galaxies or trails
    neb = [r for r in (regions or []) if r["kind"] == "nebula"] + [{"x": o["x"], "y": o["y"], "r": o["r"]} for o in (known or []) if o["type"] not in ("galaxy", "open_cluster", "globular_cluster")]
    gal = [{"x": o["x"], "y": o["y"], "r": o["r"]} for o in (known or []) if o["type"] == "galaxy"]
    for s in sources:
        if s["kind"] in ("galaxy", "fuzzy") and any(_inside(s, e) for e in gal):
            s["kind"] = "galaxy"
        elif s["kind"] in ("galaxy", "fuzzy", "trail") and s["class"] == "extended" and any(_inside(s, e) for e in neb):
            s["kind"] = "nebula"
    trails = _trails(sources, ref, float(np.hypot(w, h)), 3 if crowded else 1)
    # a galaxy candidate must stand alone: in crowded Milky Way fields extended blobs are star blends
    cands = [s for s in sources if s["kind"] == "galaxy" and not any(_inside(s, e) for e in gal)]
    if crowded:  # too many overlapping stars to call any blob a galaxy without coordinates
        for s in cands:
            s["kind"] = "fuzzy"
        cands = []
    if cands:
        from scipy.spatial import cKDTree
        allp = np.array([[o["x"], o["y"]] for o in sources])
        tree = cKDTree(allp)
        for s in cands:
            rr = max(2.355 * s.get("a", 2) * 1.5, 4 * ref)
            if len(tree.query_ball_point([s["x"], s["y"]], rr)) > 3:
                s["kind"] = "fuzzy"
        cands = sorted((s for s in cands if s["kind"] == "galaxy"), key=lambda s: -s["flux"])
        for s in cands[25:]:
            s["kind"] = "fuzzy"
    # close pairs (double stars or chance alignments)
    if len(stars) > 1:
        from scipy.spatial import cKDTree
        pts = np.array([[s["x"], s["y"]] for s in stars])
        tree = cKDTree(pts)
        d, j = tree.query(pts, k=2)
        for i, s in enumerate(stars):
            if d[i, 1] < 3.2 * ref:
                o = stars[int(j[i, 1])]
                ratio = max(s["flux"], o["flux"]) / max(min(s["flux"], o["flux"]), 1e-9)
                if ratio < 25:
                    s["pair"] = o["id"]
    return trails


def _trails(sources: list[dict], ref: float, diag: float, min_core: int = 1) -> list[dict]:
    """Join collinear elongated pieces into whole streaks, and absorb small blobs lying on the line."""
    segs = [s for s in sources if s.get("kind") == "trail"]
    used: set[int] = set()
    out = []
    for s in segs:
        if s["id"] in used:
            continue
        th = np.radians(s["orientation"])
        d = np.array([np.cos(th), np.sin(th)])
        nrm = np.array([-d[1], d[0]])
        p0 = np.array([s["x"], s["y"]])
        grp = [o for o in segs if o["id"] not in used
               and abs(float(np.dot(np.array([o["x"], o["y"]]) - p0, nrm))) < 3 * ref
               and abs(((o["orientation"] - s["orientation"] + 90) % 180) - 90) < 12]
        core = len(grp)
        pts = np.array([[o["x"], o["y"]] for o in grp])
        if len(grp) >= 2:  # refit the line through all pieces
            c = pts.mean(axis=0)
            _, _, vt = np.linalg.svd(pts - c)
            d, p0 = vt[0], c
            nrm = np.array([-d[1], d[0]])
        proj = (pts - p0) @ d
        lo, hi = proj.min(), proj.max()
        # small pieces sitting on the same line (cut-off ends, gaps) belong to the streak too
        for o in sources:
            if o["kind"] in ("fuzzy", "galaxy") and o["ellipticity"] > 0.35:
                v = np.array([o["x"], o["y"]]) - p0
                if abs(float(v @ nrm)) < 2.5 * ref and lo - 40 * ref <= float(v @ d) <= hi + 40 * ref:
                    grp.append(o)
        pts = np.array([[o["x"], o["y"]] for o in grp])
        proj = (pts - p0) @ d
        ext = 2.355 * max(o.get("a", 1) for o in grp)
        a, b = p0 + d * (proj.min() - ext), p0 + d * (proj.max() + ext)
        for o in grp:
            used.add(o["id"])
        if core < min_core or float(np.hypot(*(b - a))) < max(0.08 * diag, 25 * ref):  # too short / too few pieces
            for o in grp:
                if o["kind"] == "trail":
                    o["kind"] = "fuzzy"
            continue
        for o in grp:
            o["kind"] = "trail"
        out.append({"x0": round(float(a[0]), 1), "y0": round(float(a[1]), 1), "x1": round(float(b[0]), 1), "y1": round(float(b[1]), 1),
                    "length": round(float(np.hypot(*(b - a))), 1), "pieces": len(grp)})
    return out


# ---------------------------------------------------------------- identify (needs WCS)
def identify(info: dict, shape: tuple[int, int]) -> dict | None:
    hdr = info.get("wcs_header")
    if not hdr:
        return None
    try:
        from astropy import units as u
        from astropy.coordinates import SkyCoord, get_constellation
        from astropy.io.fits import Header
        from astropy.wcs import WCS
        from astropy.wcs.utils import proj_plane_pixel_scales

        from .deepsky import OBJECTS
        wcs = WCS(Header.fromstring(hdr))
        h, w = shape
        scale = info["original_size"][0] / w
        arcsec_px = float(np.mean(proj_plane_pixel_scales(wcs))) * 3600 * scale

        def to_world(x, y):
            return wcs.all_pix2world([[x * scale, (h - 1 - y) * scale]], 0)[0]

        ra0, dec0 = to_world((w - 1) / 2, (h - 1) / 2)
        c0 = SkyCoord(ra0 * u.deg, dec0 * u.deg)
        found = []
        for oid, name, typ, ra, dec, size, dist in OBJECTS:
            px, py = wcs.all_world2pix([[ra, dec]], 0)[0]
            x, y = px / scale, h - 1 - py / scale
            r = size * 60 / 2 / arcsec_px
            if not (np.isfinite(x) and np.isfinite(y)):
                continue
            if -r <= x <= w + r and -r <= y <= h + r:
                found.append({"id": oid, "name": name, "type": typ, "x": round(float(x), 1), "y": round(float(y), 1),
                              "r": round(float(r), 1), "size_arcmin": size, "dist_ly": dist,
                              "inside": bool(0 <= x < w and 0 <= y < h)})
        found.sort(key=lambda o: (not o["inside"], -o["size_arcmin"]))
        return {"constellation": str(get_constellation(c0)), "ra": round(float(ra0), 4), "dec": round(float(dec0), 4),
                "fov_arcmin": [round(w * arcsec_px / 60, 1), round(h * arcsec_px / 60, 1)],
                "arcsec_per_px": round(arcsec_px, 3), "objects": found}
    except Exception:
        return None


# ---------------------------------------------------------------- diagnose
def _grade(v: float, cuts: tuple[float, float, float], higher_is_better: bool = False) -> int:
    """3 excellent, 2 good, 1 fair, 0 poor."""
    a, b, c = cuts
    if higher_is_better:
        return 3 if v >= a else 2 if v >= b else 1 if v >= c else 0
    return 3 if v <= a else 2 if v <= b else 1 if v <= c else 0


def diagnose(sources: list[dict], psf_fwhm: float | None, rms: float, lo: float, hi: float, glow: dict,
             n_hot: int, n_trails: int, arcsec_px: float | None) -> dict:
    stars = [s for s in sources if s["class"] == "star" and s["snr"] >= 20 and not s["saturated"]]
    items = []
    if psf_fwhm:
        items.append({"key": "focus", "value": psf_fwhm, "unit": "px", "arcsec": round(psf_fwhm * arcsec_px, 1) if arcsec_px else None,
                      "grade": _grade(psf_fwhm, (2.8, 4.0, 6.0))})
    if len(stars) >= 5:
        ell = float(np.median([s["ellipticity"] for s in stars]))
        ang = np.radians([2 * s["orientation"] for s in stars])
        coherence = float(np.hypot(np.mean(np.cos(ang)), np.mean(np.sin(ang))))  # 1 = all stretched the same way
        cause = None
        if ell > 0.15:
            cause = "trailing" if coherence > 0.5 else "optics"
        items.append({"key": "tracking", "value": round(ell, 2), "coherence": round(coherence, 2), "cause": cause,
                      "angle": round(float(np.degrees(np.arctan2(np.mean(np.sin(ang)), np.mean(np.cos(ang)))) / 2), 0),
                      "grade": _grade(ell, (0.1, 0.18, 0.3))})
    snr_noise = (hi - lo) / max(rms, 1e-12)
    items.append({"key": "noise", "value": round(float(snr_noise), 1), "grade": _grade(snr_noise, (150, 60, 25), True)})
    items.append({"key": "glow", "value": glow["pct"], "toward": glow["toward"], "grade": _grade(glow["pct"], (4, 10, 22))})
    sat = sum(1 for s in sources if s["class"] == "star" and s["saturated"])
    items.append({"key": "saturation", "value": sat, "grade": _grade(sat, (2, 8, 25))})
    items.append({"key": "defects", "value": n_hot, "trails": n_trails, "grade": _grade(n_hot + 25 * n_trails, (5, 40, 150))})
    weights = {"focus": 3, "tracking": 3, "noise": 2, "glow": 2, "saturation": 1, "defects": 1}
    tot = sum(weights[i["key"]] for i in items)
    score = round(100 * sum(weights[i["key"]] * i["grade"] / 3 for i in items) / tot)
    return {"score": score, "items": items}


def noise_after(lum: np.ndarray, rest_lum: np.ndarray, bkg: np.ndarray, sky: np.ndarray) -> dict:
    def mad(v):
        return 1.4826 * float(np.median(np.abs(v - np.median(v)))) if v.size else 0.0
    if not sky.any():
        return {"before": 0, "after": 0, "factor": 1}
    b, a = mad((lum - bkg)[sky]), mad((rest_lum - bkg)[sky])
    return {"before": round(b, 6), "after": round(a, 6), "factor": round(b / a, 2) if a > 0 else 1.0}
