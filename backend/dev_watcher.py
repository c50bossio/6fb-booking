#!/usr/bin/env python3
"""
FastAPI Development Server with Auto-restart
Uses watchdog to monitor file changes and restart uvicorn server
"""
import os
import sys
import time
import subprocess
import signal
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler


class FastAPIRestartHandler(FileSystemEventHandler):
    def __init__(self, restart_callback):
        self.restart_callback = restart_callback
        self.last_restart = 0
        self.debounce_time = 1  # seconds

    def on_modified(self, event):
        if event.is_directory:
            return

        # Only restart for Python files
        if not event.src_path.endswith(".py"):
            return

        current_time = time.time()
        if current_time - self.last_restart < self.debounce_time:
            return

        self.last_restart = current_time
        print(f"File changed: {event.src_path}")
        self.restart_callback()


class FastAPIDevServer:
    def __init__(self):
        self.process = None
        self.observer = None

    def start_server(self):
        """Start the FastAPI server"""
        if self.process:
            self.stop_server()

        print("🚀 Starting FastAPI server...")
        self.process = subprocess.Popen(
            [
                sys.executable,
                "-m",
                "uvicorn",
                "main:app",
                "--reload",
                "--host",
                "0.0.0.0",
                "--port",
                "8000",
                "--log-level",
                "info",
            ]
        )

    def stop_server(self):
        """Stop the FastAPI server"""
        if self.process:
            print("⏹️  Stopping FastAPI server...")
            self.process.terminate()
            try:
                self.process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.process.kill()
            self.process = None

    def restart_server(self):
        """Restart the FastAPI server"""
        print("🔄 Restarting FastAPI server...")
        self.stop_server()
        time.sleep(0.5)  # Brief pause
        self.start_server()

    def start_watching(self):
        """Start watching for file changes"""
        event_handler = FastAPIRestartHandler(self.restart_server)
        self.observer = Observer()

        # Watch current directory and subdirectories
        watch_paths = [".", "api", "models", "services", "config", "utils"]

        for path in watch_paths:
            if os.path.exists(path):
                self.observer.schedule(event_handler, path, recursive=True)
                print(f"👀 Watching: {path}")

        self.observer.start()

    def run(self):
        """Main run method"""
        try:
            print("🎯 FastAPI Development Server with Auto-restart")
            print("=" * 50)

            # Start the server
            self.start_server()

            # Start watching for changes
            self.start_watching()

            print("✅ Development server running!")
            print("📁 Backend: http://localhost:8000")
            print("📚 API Docs: http://localhost:8000/docs")
            print("🔍 Health Check: http://localhost:8000/health")
            print("⚡ Auto-restart enabled for Python files")
            print("Press Ctrl+C to stop...")

            # Keep running
            while True:
                time.sleep(1)

        except KeyboardInterrupt:
            print("\n⏹️  Shutting down development server...")

        finally:
            self.cleanup()

    def cleanup(self):
        """Clean up resources"""
        if self.observer:
            self.observer.stop()
            self.observer.join()

        self.stop_server()
        print("🏁 Development server stopped.")


def main():
    # Change to backend directory if not already there
    backend_dir = Path(__file__).parent
    os.chdir(backend_dir)

    server = FastAPIDevServer()
    server.run()


if __name__ == "__main__":
    main()
