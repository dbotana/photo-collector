#!/usr/bin/env python3
"""
Prepare Photo Collector PWA for deployment
Creates a deployment-ready folder with all necessary files (excluding secrets)
"""

import os
import shutil
from pathlib import Path

def prepare_deployment():
    """Create deployment-ready folder"""

    # Files to include in deployment
    deploy_files = [
        'index.html',
        'style.css',
        'script.js',
        'manifest.json',
        'sw.js',
        'config.template.js',
        'convert-icons.html',
        'pwa-test.html',
        'generate-icons.html',
        'https-server.py',
        'README.md',
        'DEPLOYMENT-GUIDE.md',
        'PWA-INSTALLATION.md'
    ]

    # Folders to include
    deploy_folders = [
        'icons'
    ]

    # Create deployment folder
    deploy_dir = Path('deploy')
    if deploy_dir.exists():
        shutil.rmtree(deploy_dir)
    deploy_dir.mkdir()

    print("Preparing Photo Collector PWA for deployment...")
    print(f"Target folder: {deploy_dir.absolute()}")
    print()

    # Copy files
    for file in deploy_files:
        if Path(file).exists():
            shutil.copy2(file, deploy_dir / file)
            print(f"Copied {file}")
        else:
            print(f"Missing {file}")

    # Copy folders
    for folder in deploy_folders:
        if Path(folder).exists():
            shutil.copytree(folder, deploy_dir / folder)
            print(f"Copied {folder}/ folder")
        else:
            print(f"Missing {folder}/ folder")

    # Create deployment-specific config
    create_deployment_config(deploy_dir)

    # Create deployment instructions
    create_deployment_readme(deploy_dir)

    print()
    print("Deployment folder ready!")
    print(f"Location: {deploy_dir.absolute()}")
    print()
    print("Next steps:")
    print("1. Upload the 'deploy' folder contents to your hosting service")
    print("2. GitHub Pages: Create repo -> Upload files -> Enable Pages")
    print("3. Netlify: Drag deploy folder to netlify.com")
    print("4. Share the HTTPS URL with your users!")

def create_deployment_config(deploy_dir):
    """Create a deployment-ready config.js"""

    config_content = '''// AWS S3 Configuration for Photo Collector PWA
// DEPLOYMENT VERSION - Users must enter their own credentials

const AWS_CONFIG = {
    bucket: '',  // Users must enter their bucket name
    region: 'us-east-1',  // Default region
    accessKey: '',  // Users must enter their access key
    secretKey: ''   // Users must enter their secret key
};

// Instructions for users will be shown in the app if credentials are missing
'''

    with open(deploy_dir / 'config.js', 'w') as f:
        f.write(config_content)

    print("Created deployment config.js (empty - users add their credentials)")

def create_deployment_readme(deploy_dir):
    """Create README for deployment folder"""

    readme_content = '''# Photo Collector PWA - Deployment Files

This folder contains all files needed to deploy Photo Collector as a PWA.

## Quick Deploy Options:

### GitHub Pages (Free):
1. Create new GitHub repository
2. Upload all files from this folder
3. Enable GitHub Pages in repository settings
4. Share the HTTPS URL with users

### Netlify (Free):
1. Go to netlify.com
2. Drag this folder to the deploy area
3. Share the generated HTTPS URL

### Vercel (Free):
1. Install: npm install -g vercel
2. Run: vercel --public (in this folder)
3. Share the generated HTTPS URL

## After Deployment:

Your users can:
- Visit the HTTPS URL
- Install the PWA on their mobile devices
- Use the app completely offline
- Upload photos to their own S3 buckets

## Security Note:

The config.js file is empty by default. Users must enter their own AWS credentials in the app settings after installation.

For detailed instructions, see DEPLOYMENT-GUIDE.md
'''

    with open(deploy_dir / 'DEPLOY-README.md', 'w') as f:
        f.write(readme_content)

    print("Created DEPLOY-README.md with instructions")

if __name__ == '__main__':
    try:
        prepare_deployment()
    except Exception as e:
        print(f"Error: {e}")
        print("Make sure you're running this from the photo-collector directory")