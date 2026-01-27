// Main component exports
export * from './components';

// Hooks
export * from './hooks';
export { useSafeSpaceTheme } from './components/ThemeProvider';

// Types (avoiding conflicts with component exports)
export type {
  CameraStream,
  VideoPlayerProps,
  StreamLayoutConfig,
  VideoControlsProps,
  StreamInfoProps,
  ThumbnailGridProps,
  NormalizedPoint,
  Polygon,
  StreamPolygon,
  CalibrationData,
  WHEPConfig,
  LiveFeedWhepProps,
  WHEPCameraStream,
  GridLayoutPattern,
  LiveVideosWhepProps
} from './types/video';
export type { SafeSpaceTheme } from './types/theme';

// Utilities
export * from './utils/cn';

// Version
export const version = '0.1.4';
