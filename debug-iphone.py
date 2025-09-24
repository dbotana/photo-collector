#!/usr/bin/env python3
"""
iPhone Camera Debug Server
Enhanced logging for debugging iPhone camera access issues
"""

import socket
import sys
import os
import json
from datetime import datetime
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

class iPhoneDebugHandler(SimpleHTTPRequestHandler):
    """Enhanced handler for iPhone debugging."""

    def __init__(self, *args, **kwargs):
        # Enable CORS for all requests
        super().__init__(*args, **kwargs)

    def end_headers(self):
        # Add CORS headers and security headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_OPTIONS(self):
        # Handle preflight requests
        self.send_response(200)
        self.end_headers()

    def log_message(self, format, *args):
        # Enhanced logging with timestamp and device detection
        timestamp = datetime.now().strftime('%H:%M:%S')
        client_ip = self.client_address[0]
        user_agent = self.headers.get('User-Agent', 'Unknown')

        # Detect device type
        device_info = self.detect_device(user_agent)

        print(f"[{timestamp}] {device_info} {client_ip} - {format % args}")

        # Log headers for debugging
        if 'iPhone' in user_agent or 'iPad' in user_agent:
            self.log_ios_details(user_agent)

    def detect_device(self, user_agent):
        """Detect device type from user agent."""
        if 'iPhone' in user_agent:
            # Extract iOS version
            import re
            ios_match = re.search(r'OS (\d+)_(\d+)', user_agent)
            if ios_match:
                ios_version = f"{ios_match.group(1)}.{ios_match.group(2)}"
                return f"[iPhone iOS {ios_version}]"
            return "[iPhone]"
        elif 'iPad' in user_agent:
            return "[iPad]"
        elif 'Android' in user_agent:
            return "[Android]"
        elif 'Safari' in user_agent and 'Chrome' not in user_agent:
            return "[Safari Desktop]"
        elif 'Chrome' in user_agent:
            return "[Chrome]"
        elif 'Firefox' in user_agent:
            return "[Firefox]"
        else:
            return "[Unknown]"

    def log_ios_details(self, user_agent):
        """Log detailed iOS information."""
        print(f"    iOS User-Agent: {user_agent}")

        # Check for specific iOS capabilities
        safari_version = self.extract_safari_version(user_agent)
        if safari_version:
            print(f"    Safari Version: {safari_version}")

        # Log potential issues
        if 'Version/14' in user_agent or 'Version/13' in user_agent:
            print("    WARNING: Older Safari versions may have camera restrictions")

        if 'Mobile/15E148' in user_agent:
            print("    INFO: iOS 11+ detected - camera access should be supported")

    def extract_safari_version(self, user_agent):
        """Extract Safari version from user agent."""
        import re
        safari_match = re.search(r'Version/(\d+\.\d+)', user_agent)
        if safari_match:
            return safari_match.group(1)
        return None

    def do_GET(self):
        """Handle GET requests with enhanced logging."""
        path = self.path

        # Log the request
        print(f"    Requesting: {path}")

        # Special handling for main page
        if path == '/' or path == '/index.html':
            print("    LOADING: Main application page")
            self.check_ios_compatibility()

        elif path.endswith('.js'):
            print(f"    LOADING: JavaScript file - {path}")
        elif path.endswith('.css'):
            print(f"    LOADING: CSS file - {path}")

        # Call parent handler
        super().do_GET()

    def check_ios_compatibility(self):
        """Check iOS compatibility and log warnings."""
        user_agent = self.headers.get('User-Agent', '')

        if 'iPhone' in user_agent or 'iPad' in user_agent:
            print("    iOS COMPATIBILITY CHECK:")

            # Check if it's Safari
            if 'Safari' in user_agent and 'CriOS' not in user_agent and 'FxiOS' not in user_agent:
                print("    ✓ Using Safari browser (recommended)")
            else:
                print("    ⚠ NOT using Safari - camera may not work")
                print("    ⚠ Chrome/Firefox on iOS have camera limitations")

            # Check iOS version
            import re
            ios_match = re.search(r'OS (\d+)_(\d+)', user_agent)
            if ios_match:
                major_version = int(ios_match.group(1))
                if major_version >= 11:
                    print(f"    ✓ iOS {major_version}+ supports camera API")
                else:
                    print(f"    ❌ iOS {major_version} may not support camera API")

            # Check for HTTPS requirement
            print("    ❌ HTTP detected - iPhone requires HTTPS for camera in production")
            print("    ℹ Local network HTTP should work for development")

def get_local_ip():
    """Get the local IP address."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except Exception:
        return "127.0.0.1"

def main():
    """Main function."""
    port = 8000

    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print("Invalid port. Using 8000.")

    # Change to script directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    if script_dir:
        os.chdir(script_dir)

    # Get network info
    local_ip = get_local_ip()

    print("=" * 70)
    print("iPhone Camera Debug Server")
    print("=" * 70)
    print()
    print("This server provides enhanced debugging for iPhone camera issues")
    print()
    print("Connection Info:")
    print(f"   Local:   http://localhost:{port}")
    print(f"   Network: http://{local_ip}:{port}")
    print()
    print("iPhone Instructions:")
    print("   1. Connect iPhone to same WiFi")
    print("   2. Open SAFARI (not Chrome/Firefox)")
    print(f"   3. Go to: http://{local_ip}:{port}")
    print("   4. Watch logs below for detailed debugging")
    print()
    print("Camera Issues to Watch For:")
    print("   - 'Not using Safari' warnings")
    print("   - HTTPS requirements")
    print("   - iOS version compatibility")
    print("   - getUserMedia() errors")
    print()
    print("Press Ctrl+C to stop")
    print("=" * 70)
    print()

    try:
        server = HTTPServer(('0.0.0.0', port), iPhoneDebugHandler)
        print(f"DEBUG: Server started on port {port}")
        print("Waiting for iPhone connection...")
        print()

        server.serve_forever()

    except KeyboardInterrupt:
        print("\n\nServer stopped")
    except Exception as e:
        print(f"\nServer error: {e}")

if __name__ == "__main__":
    main()