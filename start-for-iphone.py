#!/usr/bin/env python3
"""
Photo Collector - iPhone/Mobile Server Starter

This script starts the HTTP server with network binding and displays
connection information for testing on iPhone/mobile devices.
"""

import socket
import subprocess
import sys
import platform
import threading
import time
from http.server import HTTPServer, SimpleHTTPRequestHandler
import os

class MobileServerHandler(SimpleHTTPRequestHandler):
    """Custom handler that logs mobile device connections."""

    def log_message(self, format, *args):
        # Enhanced logging for mobile debugging
        client_ip = self.client_address[0]
        user_agent = self.headers.get('User-Agent', 'Unknown')

        # Detect mobile devices
        mobile_indicators = ['iPhone', 'iPad', 'Android', 'Mobile', 'Safari']
        is_mobile = any(indicator in user_agent for indicator in mobile_indicators)

        device_type = "[MOBILE]" if is_mobile else "[DESKTOP]"

        print(f"[{device_type}] {client_ip} - {format % args}")
        if is_mobile:
            print(f"    User-Agent: {user_agent}")

def get_local_ip():
    """Get the local IP address for network access."""
    try:
        # Connect to a dummy address to get local IP
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            local_ip = s.getsockname()[0]
        return local_ip
    except Exception:
        return "127.0.0.1"

def get_network_info():
    """Get detailed network information."""
    local_ip = get_local_ip()

    try:
        hostname = socket.gethostname()
    except:
        hostname = "localhost"

    return local_ip, hostname

def show_connection_info(port=8000):
    """Display connection information for mobile devices."""
    local_ip, hostname = get_network_info()

    print("=" * 60)
    print("📱 PHOTO COLLECTOR - iPhone/Mobile Server")
    print("=" * 60)
    print()
    print("🌐 SERVER STARTED SUCCESSFULLY!")
    print()
    print("📍 Connection URLs:")
    print(f"   • Local:    http://localhost:{port}")
    print(f"   • Network:  http://{local_ip}:{port}")
    print(f"   • Hostname: http://{hostname}:{port}")
    print()
    print("📱 iPhone/Mobile Instructions:")
    print("   1. Connect your iPhone to the SAME WiFi network")
    print("   2. Open Safari on your iPhone")
    print(f"   3. Go to: http://{local_ip}:{port}")
    print("   4. Allow camera permissions when prompted")
    print("   5. Tap 'Add to Home Screen' for app-like experience")
    print()
    print("🔧 Troubleshooting:")
    if local_ip.startswith("127."):
        print("   ⚠️  Warning: Could not detect network IP")
        print("   💡 Run 'ipconfig' (Windows) or 'ifconfig' (Mac) to find your IP")
    else:
        print("   ✅ Network IP detected successfully")
    print("   📶 Ensure both devices are on the same WiFi")
    print("   🔥 Check firewall allows incoming connections")
    print("   🌐 Use Safari on iPhone for best camera support")
    print()
    print("🛑 Press Ctrl+C to stop the server")
    print("=" * 60)

def check_files():
    """Check if required files exist."""
    required_files = ['index.html', 'style.css', 'script.js']
    missing_files = [f for f in required_files if not os.path.exists(f)]

    if missing_files:
        print("❌ ERROR: Missing required files:")
        for file in missing_files:
            print(f"   - {file}")
        print("\n💡 Make sure you're running this script from the photo-collector directory")
        return False

    print("✅ All required files found")
    return True

def start_server(port=8000):
    """Start the HTTP server with network binding."""
    try:
        # Change to script directory
        os.chdir(os.path.dirname(os.path.abspath(__file__)))

        if not check_files():
            return False

        # Show connection info
        show_connection_info(port)

        # Start server
        server = HTTPServer(('0.0.0.0', port), MobileServerHandler)

        print(f"\n🚀 Starting server on all interfaces, port {port}...")
        print("📊 Connection logs will appear below:\n")

        server.serve_forever()

    except KeyboardInterrupt:
        print("\n\n🛑 Server stopped by user")
        return True
    except OSError as e:
        if e.errno == 98 or e.errno == 10048:  # Address already in use
            print(f"\n❌ ERROR: Port {port} is already in use")
            print("💡 Try a different port or stop other servers")
            return False
        else:
            print(f"\n❌ ERROR: Could not start server: {e}")
            return False
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        return False

def main():
    """Main function."""
    print("📱 Photo Collector Mobile Server Starter")

    # Default port
    port = 8000

    # Check if custom port provided
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print("❌ Invalid port number. Using default port 8000.")

    # Check Python version
    if sys.version_info < (3, 6):
        print("⚠️  Warning: Python 3.6+ recommended for best compatibility")

    # Start the server
    success = start_server(port)

    if not success:
        print("\n💡 Quick fixes:")
        print("   • Try a different port: python start-for-iphone.py 8001")
        print("   • Check if another server is running")
        print("   • Verify you're in the correct directory")
        sys.exit(1)

if __name__ == "__main__":
    main()