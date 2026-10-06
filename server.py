"""Servidor local con revalidación. Actualiza JS/CSS/HTML solo si el archivo cambió."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
NO_CACHE = (".html", ".js", ".css", ".webmanifest", ".json")


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        path = self.path.split("?", 1)[0]
        if path.endswith(NO_CACHE) or path in ("", "/"):
            self.send_header("Cache-Control", "no-cache, must-revalidate")
        super().end_headers()

    def log_message(self, format, *args):
        return


if __name__ == "__main__":
    port = 5500
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"Planilla Asignaciones: http://127.0.0.1:{port}", flush=True)
    server.serve_forever()
