#!/usr/bin/env python3
"""
Create placeholder PNG icons for PWA
Generates simple colored squares as placeholders until proper icons are created
"""

import os
from pathlib import Path

# Icon sizes needed for PWA
icon_sizes = [72, 96, 128, 144, 152, 192, 384, 512]

# SVG template for placeholder icon
svg_template = '''<svg width="{size}" height="{size}" viewBox="0 0 {size} {size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="{size}" height="{size}" rx="{radius}" fill="url(#grad)"/>
  <circle cx="{center}" cy="{center}" r="{icon_radius}" fill="rgba(255,255,255,0.9)" stroke="rgba(255,255,255,0.5)" stroke-width="{stroke}"/>
  <text x="{center}" y="{text_y}" text-anchor="middle" font-family="Arial" font-size="{font_size}" fill="rgba(255,255,255,0.9)" font-weight="bold">PC</text>
</svg>'''

def create_placeholder_icons():
    """Create placeholder SVG icons that can be used until proper PNGs are generated"""

    # Create icons directory
    icons_dir = Path('icons')
    icons_dir.mkdir(exist_ok=True)

    print("Creating placeholder PWA icons...")

    for size in icon_sizes:
        # Calculate proportions
        radius = size * 0.2
        center = size // 2
        icon_radius = size * 0.25
        stroke = max(2, size * 0.02)
        font_size = size * 0.3
        text_y = center + (font_size * 0.35)

        # Generate SVG
        svg_content = svg_template.format(
            size=size,
            radius=radius,
            center=center,
            icon_radius=icon_radius,
            stroke=stroke,
            font_size=font_size,
            text_y=text_y
        )

        # Save SVG file (can be used directly by some browsers)
        svg_file = icons_dir / f'icon-{size}x{size}.svg'
        with open(svg_file, 'w') as f:
            f.write(svg_content)

        print(f"  Created {svg_file}")

    # Create simple HTML page to convert SVGs to PNGs
    create_converter_page()

    print("\nPlaceholder icons created!")
    print("To convert to PNG:")
    print("   1. Open convert-icons.html in browser")
    print("   2. Right-click each icon -> 'Save Image As' -> save as PNG")
    print("   3. Or use online converter: convertio.co")

def create_converter_page():
    """Create HTML page to help convert SVGs to PNGs"""

    html_content = '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Convert Icons to PNG</title>
    <style>
        body { font-family: system-ui; max-width: 1200px; margin: 0 auto; padding: 20px; background: #f5f6fa; }
        .icons-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; }
        .icon-item { background: white; padding: 20px; border-radius: 12px; text-align: center; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .icon-item img { width: 100%; height: auto; border-radius: 8px; }
        .download-btn { margin-top: 10px; padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer; }
        .instructions { background: white; padding: 20px; border-radius: 12px; margin-bottom: 20px; }
    </style>
</head>
<body>
    <h1>Convert PWA Icons to PNG</h1>

    <div class="instructions">
        <h2>Instructions</h2>
        <p><strong>Method 1 (Quick):</strong> Right-click each icon below and "Save Image As" and change extension to .png</p>
        <p><strong>Method 2 (Online):</strong> Download SVGs and convert at <a href="https://convertio.co/svg-png/" target="_blank">convertio.co</a></p>
        <p><strong>Method 3 (Bulk):</strong> Use command line tool like <code>inkscape</code> or <code>rsvg-convert</code></p>
    </div>

    <div class="icons-grid">'''

    for size in icon_sizes:
        html_content += f'''
        <div class="icon-item">
            <img src="icons/icon-{size}x{size}.svg" alt="{size}x{size} icon">
            <div><strong>{size}×{size}</strong></div>
            <button class="download-btn" onclick="downloadIcon('{size}')">Download PNG</button>
        </div>'''

    html_content += '''
    </div>

    <script>
        function downloadIcon(size) {
            // Create canvas to convert SVG to PNG
            const img = document.querySelector(`img[src="icons/icon-${size}x${size}.svg"]`);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            canvas.width = size;
            canvas.height = size;

            const svgImg = new Image();
            svgImg.onload = function() {
                ctx.drawImage(svgImg, 0, 0);

                // Download as PNG
                canvas.toBlob(function(blob) {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `icon-${size}x${size}.png`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                });
            };
            svgImg.src = `icons/icon-${size}x${size}.svg`;
        }
    </script>
</body>
</html>'''

    with open('convert-icons.html', 'w') as f:
        f.write(html_content)

    print("  Created convert-icons.html")

if __name__ == '__main__':
    create_placeholder_icons()