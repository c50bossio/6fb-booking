#!/usr/bin/env python3
import http.server
import socketserver
import os

PORT = 8082
DIRECTORY = "static"

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

print(f"🚀 Starting 6FB Dashboard UI server...")
print(f"📁 Serving files from: {os.path.abspath(DIRECTORY)}")
print(f"🌐 Open in browser: http://localhost:{PORT}")
print(f"\nPress Ctrl+C to stop the server\n")

with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n✋ Server stopped")