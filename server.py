"""Simple local server for the Canadian House Affordability Calculator.

Serves the project directory over HTTP on 127.0.0.1:8000.
Run with: python server.py
"""

import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))


class CalculatorHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def log_message(self, format, *args):  # keep the console quiet
        return


def main():
    server = ThreadingHTTPServer(("127.0.0.1", 8000), CalculatorHandler)
    print("Serving Canadian House Affordability Calculator at http://127.0.0.1:8000")
    server.serve_forever()


if __name__ == "__main__":
    main()
