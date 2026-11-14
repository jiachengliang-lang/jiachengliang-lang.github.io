"""Local dev server for this site: like `python3 -m http.server`, but tells the
browser not to cache, so edits show up on a normal reload.

    python3 serve.py            # http://localhost:4321
    python3 serve.py 8000       # another port
"""
import functools
import http.server
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 4321
ROOT = os.path.dirname(os.path.abspath(__file__))


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


handler = functools.partial(NoCacheHandler, directory=ROOT)
with http.server.ThreadingHTTPServer(("127.0.0.1", PORT), handler) as httpd:
    print(f"Serving {ROOT} at http://localhost:{PORT} (no caching). Ctrl-C to stop.")
    httpd.serve_forever()
