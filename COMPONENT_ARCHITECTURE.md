# SafeSpace UI Toolkit - Component Architecture

## 🏗️ Component Structure

The SafeSpace UI Toolkit follows enterprise best practices with a modular, scalable architecture:

```
src/
├── components/
│   ├── LiveFeedPlayer/              # Main live feed component
│   │   ├── LiveFeedPlayer.tsx       # Main orchestrator component
│   │   ├── MainVideoPlayer.tsx      # Primary video display
│   │   ├── FullscreenModal.tsx      # Fullscreen experience
│   │   └── index.ts                 # Public exports
│   ├── VideoPlayer/                 # Core video player
│   │   ├── VideoPlayer.tsx          # HLS video player
│   │   └── index.ts                 # Public exports
│   ├── shared/                      # Reusable UI components
│   │   ├── VideoControls.tsx        # Play/pause/mute controls
│   │   ├── StreamInfo.tsx           # Stream metadata display
│   │   ├── ProgressBar.tsx          # Video progress indicator
│   │   ├── ThumbnailGrid.tsx        # Thumbnail navigation
│   │   └── index.ts                 # Public exports
│   ├── ThemeProvider.tsx            # Theme system
│   └── index.ts                     # All component exports
├── hooks/
│   ├── useVideoPlayer.ts            # Video player state management
│   ├── useStreamLayout.ts           # Responsive layout logic
│   └── index.ts                     # Hook exports
├── types/
│   ├── theme.ts                     # Theme type definitions
│   └── video.ts                     # Video component types
├── utils/
│   └── cn.ts                        # Class name utilities
└── styles/
    └── index.css                    # Global styles
```

## 🧩 Component Breakdown

### LiveFeedPlayer (Main Component)
The main orchestrator component that handles:
- Stream management and switching
- Layout calculations based on stream count
- Keyboard controls (Space, M, F, Arrow keys)
- Theme integration
- Error boundary handling

**Key Features:**
- **2 Streams**: 50:50 horizontal split
- **3+ Streams**: 75:25 split (main video + vertical thumbnails)
- **Responsive**: Adapts to container size
- **Accessible**: Full keyboard navigation
- **Configurable**: Title, subtitle, and behavior options

### MainVideoPlayer
Handles the primary video display with:
- Error states with retry functionality
- Stream information overlay
- Progress bar (for 3+ video scenarios)
- Control buttons integration

### VideoPlayer (Core)
The foundational video component featuring:
- **HLS.js Integration**: Adaptive streaming support
- **Cross-browser Compatibility**: Native HLS fallback for Safari
- **Error Recovery**: Automatic reconnection attempts
- **Performance Optimized**: Low-latency mode enabled
- **Memory Management**: Proper cleanup on unmount

### ThumbnailGrid
Smart thumbnail layout manager:
- **2 Videos**: Single secondary video (50:50)
- **3+ Videos**: Vertical stack with max 3 visible
- **Interactive**: Click to switch, hover effects
- **Overflow Indicator**: Shows "+X more cameras" when needed

### Shared Components

#### VideoControls
Reusable control buttons with:
- Play/Pause toggle
- Mute/Unmute toggle  
- Fullscreen trigger
- Size variants (small, medium, large)
- Accessibility tooltips

#### StreamInfo
Stream metadata display featuring:
- Camera title
- Live indicator with animation
- Resolution and quality info
- Customizable styling

#### ProgressBar
Video progress visualization with:
- Smooth animations
- Color themes (white, blue, red)
- Size variants
- Real-time updates

## 🎛️ Custom Hooks

### useVideoPlayer
Central state management hook providing:
- Stream switching logic
- Playback controls (play/pause, mute/unmute)
- Error handling and recovery
- Fullscreen management
- Event callbacks

### useStreamLayout
Responsive layout calculator that:
- Determines grid layout based on stream count
- Returns CSS classes for containers
- Optimizes for different screen sizes
- Maintains aspect ratios

## 🎨 Layout Specifications

### Single Video (1 stream)
```css
.container { grid-template-columns: 1fr; }
.main-video { width: 100%; height: 100%; }
.thumbnails { display: none; }
```

### Two Videos (2 streams)
```css
.container { grid-template-columns: 1fr 1fr; }
.main-video { width: 100%; height: 100%; }
.thumbnails { width: 100%; height: 100%; }
```

### Multiple Videos (3+ streams)
```css
.container { grid-template-columns: 3fr 1fr; }
.main-video { width: 100%; height: 100%; }
.thumbnails { 
  display: flex; 
  flex-direction: column; 
  max-visible: 3;
}
```

## 🔧 Usage Examples

### Basic Usage
```tsx
import { LiveFeedPlayer } from '@safespace/uitk';

<LiveFeedPlayer
  streams={streams}
  title="Security Cameras"
  subtitle="Live monitoring feeds"
/>
```

### Advanced Configuration
```tsx
<LiveFeedPlayer
  streams={streams}
  title="Prison Block A"
  subtitle="Real-time surveillance"
  autoPlay={true}
  muted={true}
  controls={true}
  showThumbnails={true}
  maxThumbnails={3}
  enableFullscreen={true}
  enableKeyboardControls={true}
  theme="light"
  onStreamChange={(stream) => analytics.track('stream_change', stream)}
  onError={(error, stream) => logger.error('Video error', { error, stream })}
/>
```

### Theme Integration
```tsx
import { SafeSpaceThemeProvider } from '@safespace/uitk';

<SafeSpaceThemeProvider variant="prison">
  <LiveFeedPlayer streams={streams} />
</SafeSpaceThemeProvider>
```

## 🎹 Keyboard Controls

| Key | Action |
|-----|--------|
| `Space` | Play/Pause toggle |
| `M` | Mute/Unmute toggle |
| `F` | Fullscreen toggle |
| `←` | Previous stream |
| `→` | Next stream |
| `Esc` | Exit fullscreen |

## 🔄 Stream Data Format

```typescript
interface CameraStream {
  id: string;                    // Unique identifier
  url: string;                   // HLS stream URL
  title: string;                 // Display name
  isLive?: boolean;              // Live indicator
  metadata?: {
    resolution?: string;         // e.g., "1080p"
    fps?: number;               // e.g., 30
    bitrate?: string;           // e.g., "2Mbps"
    location?: string;          // e.g., "Building A"
    timestamp?: string;         // Last update time
  };
}
```

## 🚀 Performance Optimizations

### Video Player
- **Adaptive Bitrate**: HLS.js automatically adjusts quality
- **Buffer Management**: Optimized for low latency
- **Memory Cleanup**: Proper disposal of video resources
- **Lazy Loading**: Thumbnails load on demand

### React Optimizations
- **useCallback**: Prevents unnecessary re-renders
- **useMemo**: Caches layout calculations
- **React.memo**: Component memoization where appropriate
- **Key Strategies**: Proper key usage for list rendering

### Bundle Optimization
- **Tree Shaking**: Only used components included
- **Code Splitting**: Lazy load fullscreen modal
- **External Dependencies**: Ant Design and HLS.js as peer deps
- **CSS Optimization**: PostCSS minification

## 🧪 Testing Strategy

### Unit Tests
- Component rendering
- Hook functionality
- Utility functions
- Error scenarios

### Integration Tests  
- Stream switching
- Layout responsiveness
- Keyboard controls
- Error recovery

### Visual Tests
- Storybook stories
- Cross-browser compatibility
- Theme variants
- Responsive breakpoints

## 📈 Scalability Considerations

### Component Reusability
- Clear separation of concerns
- Props-based configuration
- Minimal internal state
- Composable architecture

### Future Enhancements
- **Analytics Integration**: Built-in event tracking
- **Performance Monitoring**: Real-time metrics
- **Advanced Controls**: Volume sliders, quality selection
- **Mobile Optimizations**: Touch gestures, responsive controls
- **Accessibility**: Screen reader support, high contrast modes

### Migration Path
The modular structure allows for:
- Incremental adoption
- Easy component replacement
- Backward compatibility
- Feature flag support

This architecture ensures the SafeSpace UI Toolkit remains maintainable, scalable, and enterprise-ready for all SafeSpace applications.
