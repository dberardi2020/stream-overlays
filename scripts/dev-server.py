#!/usr/bin/env python3
"""Dev static server for the sim-racing overlays.

Like `python -m http.server`, but sends `Cache-Control: no-store` on every
response so the browser never serves a stale ES module from its cache. That
cache is the "module gotcha": you edit engine/*.js, reload, and the page looks
unchanged because the browser reused the cached module (setup.html reloads, its
imported calibration.js does not). no-store makes every load fetch fresh.

Dev only. Production is plain static hosting over a CDN (ADR 0002); this file is
never deployed.
"""
import functools
import http.server
import os

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "overlays", "sim-racing"))
PORT = int(os.environ.get("PORT", "8000"))


class NoStoreHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, max-age=0")
        super().end_headers()


def main():
    http.server.ThreadingHTTPServer.allow_reuse_address = True
    handler = functools.partial(NoStoreHandler, directory=ROOT)
    with http.server.ThreadingHTTPServer(("", PORT), handler) as httpd:
        print(f"Serving {ROOT} at http://localhost:{PORT}/ (Cache-Control: no-store)")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nbye")


if __name__ == "__main__":
    main()
