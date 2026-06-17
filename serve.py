import http.server, os, sys

port = int(os.environ.get("PORT", 5050))
root = "/Users/bernardngie/Documents/Projects/silvernesthomecare"

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=root, **kw)
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()
    def log_message(self, fmt, *args):
        pass

os.chdir(root)
with http.server.HTTPServer(("", port), Handler) as s:
    print(f"Serving {root} on port {port}", flush=True)
    s.serve_forever()
