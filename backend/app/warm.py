"""Warm-up helpers.

`python -m app.warm` runs at build time on the host (see render.yaml): it downloads the
17 MB planetary ephemeris once, into the deploy itself, so no visitor ever waits for it.
`warm_async()` runs at server start: it prefetches the ISS orbit and launch list in the
background so the first page view after a restart finds them already cached.
"""
from __future__ import annotations

import asyncio
import logging

log = logging.getLogger("celestra.warm")


def ephemeris() -> None:
    from .services.iss import _ephemeris
    _ephemeris()


async def warm_async() -> None:
    try:
        await asyncio.to_thread(ephemeris)
    except Exception as e:  # never block startup
        log.warning("ephemeris warm-up failed: %s", e)
    try:
        from .services import iss, launches
        await asyncio.gather(iss.passes(28.6, 77.2, 7), launches.upcoming(), return_exceptions=True)
    except Exception as e:
        log.warning("data warm-up failed: %s", e)


if __name__ == "__main__":
    try:
        ephemeris()
        print("ephemeris ready")
    except Exception as e:  # a download hiccup must never fail the deploy; it retries at runtime
        print(f"ephemeris not downloaded now ({type(e).__name__}); it will be fetched on first use")
