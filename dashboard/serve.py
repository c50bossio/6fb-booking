#!/usr/bin/env python3
"""
Simple HTTP server with CORS headers for serving the dashboard
"""
from http.server import HTTPServer, SimpleHTTPRequestHandler
import os


class CORSRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()


def run(port=8081):
    server_address = ("", port)
    httpd = HTTPServer(server_address, CORSRequestHandler)
    print(f"Dashboard server running at http://localhost:{port}/")
    print(f"Open http://localhost:{port}/index.html in your browser")
    print("Press Ctrl+C to stop")
    httpd.serve_forever()


if __name__ == "__main__":
    # Change to dashboard directory
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    run()
