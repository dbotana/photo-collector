# Photo Collector PWA - Deployment Files

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
