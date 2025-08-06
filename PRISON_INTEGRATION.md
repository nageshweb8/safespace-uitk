# Integration Guide: SafeSpace Prison UI

This guide shows how to integrate the SafeSpace UI Toolkit components into your existing Prison UI application.

## Quick Start

### 1. Install the Package

```bash
npm install @safespace/uitk
# or
yarn add @safespace/uitk
```

### 2. Import Styles

In your main CSS file or `src/index.js`:

```css
/* Import SafeSpace UI styles */
@import '@safespace/uitk/styles';

/* Your existing styles */
@import 'antd/dist/antd.css';
/* ... other imports */
```

### 3. Use the Components

```tsx
import { LiveFeedPlayer } from '@safespace/uitk';

function CameraMonitoring() {
  const streams = [
    {
      id: 'prison_cam_1',
      url: 'your-hls-stream-url.m3u8',
      title: 'Cell Block A',
      isLive: true,
      metadata: {
        resolution: '1080p',
        fps: 30,
        bitrate: '2Mbps'
      }
    },
    // ... more streams
  ];

  return (
    <LiveFeedPlayer
      streams={streams}
      autoPlay={true}
      muted={true}
      controls={true}
      showThumbnails={true}
      aspectRatio="16:9"
      theme="light"
      title="Prison Security Feed"
      subtitle="Live monitoring of all active cameras"
      onStreamChange={(stream) => {
        console.log('Stream changed:', stream);
        // Handle stream changes, analytics, etc.
      }}
      onError={(error, stream) => {
        console.error('Stream error:', error, stream);
        // Handle errors, logging, fallback, etc.
      }}
    />
  );
}
```

## Layout Behavior

### 2 Streams: 50:50 Split
When exactly 2 streams are provided, they display in a 50:50 horizontal split layout.

### 3+ Streams: 75:25 Layout  
When 3 or more streams are provided:
- **75%**: Main video player showing the active stream
- **25%**: Thumbnail grid showing other streams (up to 3 visible)

## Advanced Configuration

### Custom Theme

```tsx
<LiveFeedPlayer
  streams={streams}
  theme="dark" // or "light"
  // ... other props
/>
```

### Keyboard Controls

By default, keyboard controls are enabled:
- **Space**: Play/Pause
- **M**: Mute/Unmute  
- **F**: Fullscreen
- **←/→**: Switch between streams

To disable:

```tsx
<LiveFeedPlayer
  streams={streams}
  enableKeyboardControls={false}
  // ... other props
/>
```

### Error Handling

```tsx
<LiveFeedPlayer
  streams={streams}
  onError={(error, stream) => {
    // Log to your monitoring system
    console.error('Video error:', error.message);
    
    // Show user-friendly message
    notification.error({
      message: 'Camera Connection Lost',
      description: `Failed to connect to ${stream?.title || 'camera'}`,
    });
    
    // Attempt reconnection logic
    setTimeout(() => {
      // Your reconnection logic
    }, 5000);
  }}
  onStreamChange={(stream) => {
    // Analytics tracking
    analytics.track('camera_switched', {
      camera_id: stream.id,
      camera_name: stream.title,
      timestamp: new Date().toISOString(),
    });
  }}
/>
```

## Integration with Existing Prison UI

### 1. Replace Existing Video Components

If you have existing video player components in your prison UI, you can replace them:

```tsx
// Before
import { OldVideoPlayer } from './components/OldVideoPlayer';

// After  
import { LiveFeedPlayer } from '@safespace/uitk';
```

### 2. Ant Design Compatibility

The components are fully compatible with Ant Design and follow the same design patterns:

```tsx
import { Card, Row, Col } from 'antd';
import { LiveFeedPlayer } from '@safespace/uitk';

function SecurityDashboard() {
  return (
    <Row gutter={16}>
      <Col span={16}>
        <Card title="Live Camera Feed">
          <LiveFeedPlayer streams={streams} />
        </Card>
      </Col>
      <Col span={8}>
        <Card title="Alerts">
          {/* Your existing alert components */}
        </Card>
      </Col>
    </Row>
  );
}
```

### 3. State Management Integration

```tsx
import { useSelector, useDispatch } from 'react-redux';
import { LiveFeedPlayer } from '@safespace/uitk';

function MonitoringPage() {
  const dispatch = useDispatch();
  const { activeStreams, selectedCamera } = useSelector(state => state.cameras);

  return (
    <LiveFeedPlayer
      streams={activeStreams}
      onStreamChange={(stream) => {
        dispatch(selectCamera(stream.id));
        dispatch(logCameraSwitch(stream));
      }}
      onError={(error, stream) => {
        dispatch(reportCameraError({ stream, error: error.message }));
      }}
    />
  );
}
```

## Styling Customization

### CSS Variables

You can customize the theme using CSS variables:

```css
:root {
  --safespace-primary-500: #your-brand-color;
  --safespace-primary-600: #your-brand-color-dark;
  /* ... other variables */
}
```

### Custom CSS Classes

```css
/* Override specific components */
.ss-video-player {
  border-radius: 12px;
}

.ss-thumbnail-grid {
  background: rgba(0, 0, 0, 0.05);
}
```

## Performance Considerations

### Stream Optimization

```tsx
const optimizedStreams = streams.map(stream => ({
  ...stream,
  metadata: {
    ...stream.metadata,
    // Optimize for prison monitoring
    lowLatency: true,
    adaptiveBitrate: true,
    bufferLength: 15, // Shorter buffer for real-time monitoring
  }
}));
```

### Memory Management

```tsx
useEffect(() => {
  // Cleanup when component unmounts
  return () => {
    // Cleanup logic is handled automatically by the component
  };
}, []);
```

## Migration from Existing Implementation

If you're migrating from an existing video player implementation:

1. **Backup your current implementation**
2. **Install the SafeSpace UI Toolkit**
3. **Replace video player imports**
4. **Update props mapping** (see prop documentation)
5. **Test thoroughly** with your existing stream URLs
6. **Deploy to staging** before production

## Troubleshooting

### Common Issues

1. **Styles not loading**: Make sure you've imported the CSS
2. **Streams not playing**: Check HLS.js compatibility and stream URLs
3. **Layout issues**: Ensure container has proper dimensions

### Debug Mode

```tsx
<LiveFeedPlayer
  streams={streams}
  onError={(error, stream) => {
    console.group('SafeSpace Video Debug');
    console.log('Error:', error);
    console.log('Stream:', stream);
    console.log('Timestamp:', new Date().toISOString());
    console.groupEnd();
  }}
/>
```

## Support

For additional support or custom requirements for the Prison application, please contact the SafeSpace development team.
