# SafeSpace UI Toolkit - Prison UI Integration Guide

## Local Development Setup (Current)

### 1. Using File Path Dependency (Current Setup)

Your `package.json` now has:
```json
"@safespace/uitk": "file:../../../safespace-uitk"
```

**Workflow for local development:**

1. **Make changes to SafeSpace UI Toolkit:**
   ```bash
   cd /Users/Nagesh/SafeSpace/safespace-uitk
   # Make your changes to components
   npm run build  # Build the package
   ```

2. **Update Prison UI:**
   ```bash
   cd /Users/Nagesh/SafeSpace/prisons/safespaceglobal-safespace-prison/safeSpacePrisonUI
   npm install  # Reinstall to pick up changes
   npm start    # Start your development server
   ```

### 2. Alternative: Using npm link (if you prefer)

**Step 1 - Link the UI Toolkit:**
```bash
cd /Users/Nagesh/SafeSpace/safespace-uitk
npm link
```

**Step 2 - Link in Prison UI:**
```bash
cd /Users/Nagesh/SafeSpace/prisons/safespaceglobal-safespace-prison/safeSpacePrisonUI
npm link @safespace/uitk
```

**Step 3 - Update package.json:**
```json
"@safespace/uitk": "^0.1.0"
```

## Git Repository Setup Options

### Option 1: Publish to NPM (Recommended for Production)

1. **Prepare the package:**
   ```bash
   cd safespace-uitk
   npm run build
   npm run test
   ```

2. **Publish to NPM:**
   ```bash
   npm login
   npm publish
   ```

3. **Install in Prison UI:**
   ```json
   {
     "dependencies": {
       "@safespace/uitk": "^0.1.0"
     }
   }
   ```

### Option 2: Private Git Repository

1. **Push the entire repository to your Git:**
   ```bash
   cd safespace-uitk
   git init
   git add .
   git commit -m "Initial SafeSpace UI Toolkit"
   git remote add origin https://your-git-repo.com/safespace/uitk.git
   git push -u origin main
   ```

2. **Install from Git in Prison UI:**
   ```json
   {
     "dependencies": {
       "@safespace/uitk": "git+https://your-git-repo.com/safespace/uitk.git"
     }
   }
   ```

3. **For specific branches/tags:**
   ```json
   {
     "dependencies": {
       "@safespace/uitk": "git+https://your-git-repo.com/safespace/uitk.git#v0.1.0"
     }
   }
   ```

### Option 3: Build Artifacts Only (Not Recommended)

If you only want to push the `dist/` folder:

1. **Create a separate repository for built assets:**
   ```bash
   cd safespace-uitk/dist
   git init
   git add .
   git commit -m "Built assets"
   git remote add origin https://your-git-repo.com/safespace/uitk-dist.git
   git push -u origin main
   ```

2. **This approach has limitations:**
   - No source code versioning
   - Harder to debug issues
   - No development dependencies management

## Current Integration Status

### ✅ What's Working

1. **Local file dependency configured**
2. **Thumbnails now stretch to fill main video height** (no white space)
3. **LiveFeedPlayer component imported and configured**
4. **Prison camera streams mapped correctly**
5. **SafeSpace UI styles imported**

### 📝 Prison UI Configuration

**DashboardTwo.jsx changes:**
```jsx
import { LiveFeedPlayer } from "@safespace/uitk";
import "@safespace/uitk/styles";

// Prison camera streams
const prisonStreams = [
    {
        id: 'prison_3597e8e2',
        url: 'https://prison.dev-safespaceglobal.com/streams/prison_3597e8e2/playlist.m3u8',
        title: 'Cell Block A',
        isLive: true,
        metadata: { resolution: '1080p', fps: 30, bitrate: '2Mbps' }
    },
    // ... more streams
];

// Component usage
<LiveFeedPlayer
    streams={prisonStreams}
    theme="light"
    title="Prison Security Feed"
    subtitle="Live monitoring of all active cameras"
    onStreamChange={(stream) => {
        console.log('Prison camera switched:', stream);
    }}
    onError={(error, stream) => {
        console.error('Prison camera error:', error, stream);
    }}
/>
```

## Development Workflow

### For UI Toolkit Changes:

1. **Edit components in `/safespace-uitk/src/`**
2. **Test in playground:**
   ```bash
   cd safespace-uitk/playground
   npm run dev
   ```
3. **Build the package:**
   ```bash
   cd safespace-uitk
   npm run build
   ```
4. **Test in Prison UI:**
   ```bash
   cd safeSpacePrisonUI
   npm install  # Picks up new build
   # Your npm start should already be running
   ```

### For Prison UI Integration:

1. **Your Prison UI is already running with `npm start`**
2. **Changes to Prison UI components are hot-reloaded automatically**
3. **For SafeSpace UI changes, you need to rebuild and reinstall**

## Recommended Production Setup

1. **Use NPM publishing for stability**
2. **Version your UI toolkit properly (semantic versioning)**
3. **Set up CI/CD for automated builds and publishing**
4. **Use exact versions in production:**
   ```json
   "@safespace/uitk": "0.1.0"  // exact version, not ^0.1.0
   ```

## Troubleshooting

### If Prison UI doesn't pick up changes:

1. **Clear npm cache:**
   ```bash
   npm cache clean --force
   ```

2. **Remove node_modules and reinstall:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Check if styles are loading:**
   - Verify `import "@safespace/uitk/styles";` is in your component
   - Check browser developer tools for CSS loading errors

### If video players don't work:

1. **Check HLS.js compatibility**
2. **Verify stream URLs are accessible**
3. **Check browser console for errors**

## Next Steps

1. **Test the integration** - Your Prison UI should now show the new LiveFeedPlayer
2. **Customize styling** if needed using CSS variables
3. **Add error handling** for your specific needs
4. **Set up proper git repository** when ready for production

The current setup allows you to develop locally without pushing to any repository. When you're ready to deploy, choose one of the Git options above based on your infrastructure requirements.
