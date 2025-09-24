#!/usr/bin/env python3
"""
HTTPS Server for Photo Collector PWA
Provides HTTPS access for full PWA functionality including camera access on mobile devices.
"""

import os
import sys
import ssl
import socket
import subprocess
from http.server import HTTPServer, SimpleHTTPRequestHandler

class HTTPSHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add security headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        super().end_headers()

def create_self_signed_cert():
    """Create a self-signed certificate for HTTPS."""
    cert_file = 'server.crt'
    key_file = 'server.key'

    if os.path.exists(cert_file) and os.path.exists(key_file):
        print("Using existing certificate files")
        return cert_file, key_file

    print("Creating self-signed certificate...")

    try:
        # Create certificate using openssl
        cmd = [
            'openssl', 'req', '-x509', '-newkey', 'rsa:4096',
            '-keyout', key_file, '-out', cert_file,
            '-days', '365', '-nodes', '-batch',
            '-subj', '/C=US/ST=Test/L=Test/O=PhotoCollector/CN=localhost'
        ]

        subprocess.run(cmd, check=True, capture_output=True)
        print("Certificate created successfully")
        return cert_file, key_file

    except subprocess.CalledProcessError:
        print("OpenSSL not found. Trying Python method...")
        return create_python_cert()
    except FileNotFoundError:
        print("OpenSSL not found. Trying Python method...")
        return create_python_cert()

def create_python_cert():
    """Create certificate using Python cryptography library."""
    try:
        from cryptography import x509
        from cryptography.x509.oid import NameOID
        from cryptography.hazmat.primitives import hashes
        from cryptography.hazmat.primitives.asymmetric import rsa
        from cryptography.hazmat.primitives import serialization
        import datetime

        # Generate private key
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
        )

        # Create certificate
        subject = issuer = x509.Name([
            x509.NameAttribute(NameOID.COUNTRY_NAME, "US"),
            x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, "Test"),
            x509.NameAttribute(NameOID.LOCALITY_NAME, "Test"),
            x509.NameAttribute(NameOID.ORGANIZATION_NAME, "PhotoCollector"),
            x509.NameAttribute(NameOID.COMMON_NAME, "localhost"),
        ])

        cert = x509.CertificateBuilder().subject_name(
            subject
        ).issuer_name(
            issuer
        ).public_key(
            private_key.public_key()
        ).serial_number(
            x509.random_serial_number()
        ).not_valid_before(
            datetime.datetime.utcnow()
        ).not_valid_after(
            datetime.datetime.utcnow() + datetime.timedelta(days=365)
        ).add_extension(
            x509.SubjectAlternativeName([
                x509.DNSName("localhost"),
                x509.IPAddress(socket.inet_aton("127.0.0.1")),
            ]),
            critical=False,
        ).sign(private_key, hashes.SHA256())

        # Write certificate and key to files
        with open('server.crt', 'wb') as f:
            f.write(cert.public_bytes(serialization.Encoding.PEM))

        with open('server.key', 'wb') as f:
            f.write(private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption()
            ))

        print("Python certificate created successfully")
        return 'server.crt', 'server.key'

    except ImportError:
        print("Cryptography library not available. Using minimal certificate...")
        return create_minimal_cert()

def create_minimal_cert():
    """Create a minimal certificate file."""
    # This is a last resort - create empty files and advise user
    cert_content = """-----BEGIN CERTIFICATE-----
MIIBkTCB+wIJANGa6jhf+X7rMA0GCSqGSIb3DQEBCwUAMBQxEjAQBgNVBAMMCWxv
Y2FsaG9zdDAeFw0yNDAxMDEwMDAwMDBaFw0yNTAxMDEwMDAwMDBaMBQxEjAQBgNV
BAMMCWxvY2FsaG9zdDBcMA0GCSqGSIb3DQEBAQUAA0sAMEgCQQDC1ys1AH2AtQCX
GFKdyH3s8W6j9hJz9W5gT5f8KmH6B8mF7yl3bC5B7T9BXfH8K6ys1AH2AtQCXGFK
dyH3s8W6j9hJzAgMBAAEwDQYJKoZIhvcNAQELBQADQQCQ1WLvQ+S7oj8pO8cZy9Bt
-----END CERTIFICATE-----"""

    key_content = """-----BEGIN PRIVATE KEY-----
MIIBVAIBADANBgkqhkiG9w0BAQEFAASCAT4wggE6AgEAAkEAwtcrNQB9gLUAlxhS
nch97PFuo/YSc/VuYE+X/Cph+gfJhe8pd2wuQe0/QV3x/CusrNQB9gLUAlxhSnch
97PFuo/YSc4CAQMCIQDYRt5v6S7oj8pO8cZy9BtQ+S7oj8pO8cZy9BtQ+S7oj8pO
8cZy9BtCIQDYRt5v6S7oj8pO8cZy9BtQ+S7oj8pO8cZy9BtQ+S7oj8pO8cZy9Bt
AIg3aOhgwWuOhgwWuOhgwWuOhgwWuOhgwWuOhgwWuOhgwWuOhgwWuOhgwWuOhgwWu
-----END PRIVATE KEY-----"""

    with open('server.crt', 'w') as f:
        f.write(cert_content)
    with open('server.key', 'w') as f:
        f.write(key_content)

    print("WARNING: Using minimal certificate - may not work properly")
    return 'server.crt', 'server.key'

def get_local_ip():
    """Get local IP address."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except Exception:
        return "127.0.0.1"

def main():
    port = 8443  # Standard HTTPS port alternative

    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print("Invalid port. Using 8443.")

    # Change to script directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    if script_dir:
        os.chdir(script_dir)

    # Check for required files
    required_files = ['index.html', 'style.css', 'script.js']
    missing = [f for f in required_files if not os.path.exists(f)]
    if missing:
        print(f"ERROR: Missing files: {missing}")
        return

    # Create certificate
    try:
        cert_file, key_file = create_self_signed_cert()
    except Exception as e:
        print(f"Certificate creation failed: {e}")
        print("You may need to install OpenSSL or the cryptography library")
        return

    # Get network info
    local_ip = get_local_ip()

    print("=" * 70)
    print("HTTPS Server for iPhone Camera Access")
    print("=" * 70)
    print()
    print("This HTTPS server enables camera access on iOS Safari")
    print()
    print("Connection URLs:")
    print(f"   Local:   https://localhost:{port}")
    print(f"   Network: https://{local_ip}:{port}")
    print()
    print("iPhone Instructions:")
    print("   1. Connect iPhone to same WiFi network")
    print("   2. Open Safari on iPhone")
    print(f"   3. Go to: https://{local_ip}:{port}")
    print("   4. Accept security certificate warning")
    print("   5. Allow camera permissions when prompted")
    print()
    print("IMPORTANT:")
    print("   - You will see a security warning - click 'Advanced' then 'Proceed'")
    print("   - This is normal for self-signed certificates")
    print("   - Camera should work once certificate is accepted")
    print()
    print("Press Ctrl+C to stop")
    print("=" * 70)
    print()

    try:
        # Create HTTPS server
        server = HTTPServer(('0.0.0.0', port), HTTPSHandler)

        # Create SSL context
        context = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
        context.load_cert_chain(cert_file, key_file)

        # Wrap server socket with SSL
        server.socket = context.wrap_socket(server.socket, server_side=True)

        print(f"HTTPS server started on port {port}")
        print("Waiting for connections...")
        print()

        server.serve_forever()

    except KeyboardInterrupt:
        print("\n\nHTTPS server stopped")
    except Exception as e:
        print(f"\nServer error: {e}")
        if "certificate verify failed" in str(e).lower():
            print("Certificate issue - try recreating with: rm server.crt server.key")

if __name__ == "__main__":
    main()