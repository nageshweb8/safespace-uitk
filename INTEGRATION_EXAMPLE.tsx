// Step 1: Install the UITK package (once published)
// npm install @safespace/uitk

// Step 2: Update your main App.js/tsx
import React from 'react';
import { SafeSpaceThemeProvider } from '@safespace/uitk';
import '@safespace/uitk/styles';
import './App.css';

function App() {
  return (
    <SafeSpaceThemeProvider variant="prison">
      <div className="App">
        {/* Your existing app content */}
        <Router>
          <Routes>
            {/* Your routes */}
          </Routes>
        </Router>
      </div>
    </SafeSpaceThemeProvider>
  );
}

export default App;

// Step 3: Replace existing LiveFeed component
// Before (existing file):
// import LiveFeed from './components/live-feeds/LiveFeed';

// After (updated file):
import { LiveFeedPlayer } from '@safespace/uitk';

// Step 4: Update the component usage
const DashboardPage = () => {
  const streams = [
    {
      id: 'prison_3597e8e2',
      url: 'https://prison.dev-safespaceglobal.com/streams/prison_3597e8e2/playlist.m3u8',
      title: 'Cam 1',
      isLive: true,
      metadata: {
        resolution: '1080p',
        fps: 30,
        bitrate: '2Mbps'
      }
    },
    {
      id: 'prison_3597e8e3',
      url: 'https://prison.dev-safespaceglobal.com/streams/prison_3597e8e3/playlist.m3u8',
      title: 'Cam 2',
      isLive: true,
    },
    // ... more streams
  ];

  return (
    <div className="dashboard">
      <LiveFeedPlayer
        streams={streams}
        autoPlay={true}
        muted={true}
        controls={true}
        showThumbnails={true}
        aspectRatio="16:9"
        theme="light"
        onStreamChange={(stream) => {
          console.log('Stream changed:', stream);
          // Analytics tracking, state updates, etc.
        }}
        onError={(error, stream) => {
          console.error('Stream error:', error, stream);
          // Error logging, fallback handling, etc.
        }}
      />
    </div>
  );
};
