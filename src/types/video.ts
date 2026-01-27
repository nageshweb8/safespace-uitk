import { ReactNode } from 'react';

export interface CameraStream {
  id: string;
  url: string;
  title: string;
  isLive?: boolean;
  metadata?: {
    resolution?: string;
    fps?: number;
    bitrate?: string;
    location?: string;
    timestamp?: string;
  };
  // Optional drawing overlay polygons for the stream.
  // Coordinates are normalized (0..1) relative to the video container size
  // so they automatically scale with resizing.
  // Accepts any of the following shapes for convenience:
  // - StreamPolygon[]: [{ id?, label?, color?, points: [{x,y}, ...] }, ...]
  // - Polygon[]: an array of polygons, each polygon is an array of points [[{x,y}, ...], ...]
  // - Polygon: a single polygon as an array of points [{x,y}, ...]
  polygons?: StreamPolygon[] | Polygon[] | Polygon;
}

// Normalized point and polygon definitions used by drawing/overlay components
export type NormalizedPoint = { x: number; y: number };
export type Polygon = NormalizedPoint[];

// Optional metadata per polygon region
export interface StreamPolygon {
  id?: string;
  label?: string;
  color?: string; // optional preferred color for stroke/fill
  points: Polygon; // normalized [0..1]
  // Optional anomalies associated with this polygon
  anomalyIds?: number[];
}

// Calibration data for cameras without AI capability
// Used for manual 4-point calibration (e.g., paper corners on ground/wall)
export interface CalibrationData {
  /** Normalized points (0..1) - exactly 4 points */
  points: NormalizedPoint[];
  /** Pixel coordinates at the time of capture */
  pixelPoints: { x: number; y: number }[];
  /** Formatted string for API: "[(x,y), (x,y), (x,y), (x,y)]" */
  formattedString: string;
  /** Timestamp when calibration was completed */
  timestamp: number;
}

export interface VideoPlayerProps {
  stream: CameraStream;
  autoPlay?: boolean;
  muted?: boolean;
  controls?: boolean;
  loop?: boolean;
  className?: string;
  onError?: (error: Error) => void;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  showOverlay?: boolean;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none';
  exposeVideoRef?: (video: HTMLVideoElement | null) => void;
}

export interface StreamLayoutConfig {
  container: string;
  mainVideo: string;
  thumbnailContainer: string;
}

export interface LiveFeedPlayerProps {
  streams: CameraStream[];
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
  controls?: boolean;
  showThumbnails?: boolean;
  onStreamChange?: (stream: CameraStream) => void;
  onError?: (error: Error, stream: CameraStream) => void;
  theme?: 'light' | 'dark';
  aspectRatio?: '16:9' | '4:3' | '1:1';
  title?: string;
  subtitle?: string;
  maxThumbnails?: number;
  enableFullscreen?: boolean;
  enableKeyboardControls?: boolean;
}

// WHEP Configuration interface for LiveFeedWhep component
export interface WHEPConfig {
  /** Base URL for WHEP endpoints (e.g., 'http://192.168.101.87:8889') */
  baseUrl: string;
  /** Optional authentication credentials in 'username:password' format */
  authCredentials?: string;
  /** Delay between reconnection attempts in milliseconds (default: 5000) */
  reconnectDelay?: number;
  /** Maximum number of reconnection attempts (default: 3) */
  maxReconnectAttempts?: number;
  /** Interval for stream health checks in milliseconds (default: 5000) */
  healthCheckInterval?: number;
  /** Timeout for detecting stalled streams in milliseconds (default: 12000) */
  streamStallTimeout?: number;
}

export interface LiveFeedWhepProps {
  streams: CameraStream[];
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
  controls?: boolean;
  showThumbnails?: boolean;
  onStreamChange?: (stream: CameraStream) => void;
  onError?: (error: Error, stream: CameraStream) => void;
  theme?: 'light' | 'dark';
  title?: string;
  subtitle?: string;
  maxThumbnails?: number;
  enableFullscreen?: boolean;
  enableKeyboardControls?: boolean;
  /** WHEP configuration - required for WHEP streaming */
  whepConfig: WHEPConfig;
}

export interface VideoControlsProps {
  isPlaying: boolean;
  isMuted: boolean;
  onPlayPause: () => void;
  onMuteUnmute: () => void;
  onFullscreen: () => void;
  showControls?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export interface StreamInfoProps {
  stream: CameraStream;
  showLiveIndicator?: boolean;
  className?: string;
}

export interface ThumbnailGridProps {
  streams: CameraStream[];
  activeStreamIndex: number;
  onStreamSelect: (index: number) => void;
  onFullscreen: () => void;
  layout: 'vertical' | 'horizontal' | 'grid';
  maxVisible?: number;
}

export type LiveVideoPatternCategory = 'Equal' | 'Highlight' | 'Extreme';

export type LiveVideoPatternKey =
  | '1'
  | '2'
  | '4'
  | '8'
  | '9'
  | '14'
  | '16'
  | '28'
  | 'M14'
  | 'M15'
  | '6-Highlight'
  | '8-Highlight'
  | '10-Highlight'
  | '12-Highlight'
  | '16-Highlight'
  | '20'
  | '36'
  | '64';

export interface LiveVideoPatternDefinition {
  key: LiveVideoPatternKey;
  label: string;
  category: LiveVideoPatternCategory;
  tileCount: number;
}

export interface LiveVideosProps {
  streams: CameraStream[];
  displayStreams?: CameraStream[];
  loading?: boolean;
  title?: ReactNode;
  pattern?: LiveVideoPatternKey;
  defaultPattern?: LiveVideoPatternKey;
  autoPattern?: boolean;
  availablePatterns?: LiveVideoPatternKey[];
  quickPatternKeys?: LiveVideoPatternKey[];
  onPatternChange?: (pattern: LiveVideoPatternKey) => void;
  onTileClick?: (stream: CameraStream, index: number) => void;
  onStreamError?: (error: Error, stream: CameraStream) => void;
  showPatternMenu?: boolean;
  patternMenuPlacement?: 'top' | 'bottom';
  showTileLabels?: boolean;
  tileLabelPlacement?: 'top' | 'bottom';
  showTileControls?: boolean;
  tileControlsSize?: 'small' | 'medium';
  autoPlay?: boolean;
  muted?: boolean;
  height?: string | number;
  className?: string;
  emptyState?: ReactNode;
}

/**
 * Camera stream for WHEP (WebRTC) streaming
 * Used with LiveVideosWhep component for local intranet streaming
 */
export interface WHEPCameraStream {
  /** Unique identifier for the camera */
  id: string;
  /** Display title for the camera */
  title: string;
  /** 
   * Camera identifier used to build the WHEP URL
   * WHEP URL format: {whepConfig.baseUrl}/{cameraId}/whep
   */
  cameraId?: string;
  /** Optional unique identifier (alternative to cameraId) */
  uniqueIdentifier?: string;
  /** Optional guid (alternative to cameraId) */
  guid?: string;
  /** Whether the camera is currently live */
  isLive?: boolean;
  /** Original data from API (for metadata access) */
  originalData?: {
    uniqueIdentifier?: string;
    guid?: string;
    key?: string;
    label?: string;
    [key: string]: unknown;
  };
  /** Camera metadata */
  metadata?: {
    resolution?: string;
    fps?: number;
    bitrate?: string;
    location?: string;
    timestamp?: string;
    uniqueIdentifier?: string;
  };
}

/** Grid layout pattern for LiveVideosWhep component */
export type GridLayoutPattern = '1x1' | '2x2' | '3x3' | '4x4' | '5x5' | '6x6';

/**
 * Props for LiveVideosWhep component
 * Multi-camera WHEP video viewer with grid layouts for local intranet streaming
 */
export interface LiveVideosWhepProps {
  /** Array of camera streams to display */
  streams: WHEPCameraStream[];
  /** WHEP configuration - required for WHEP streaming */
  whepConfig: WHEPConfig;
  /** Initial/controlled grid layout pattern (default: '2x2') */
  gridLayout?: GridLayoutPattern;
  /** Default grid layout when not controlled */
  defaultGridLayout?: GridLayoutPattern;
  /** Available layout patterns to show in selector (default: all) */
  availableLayouts?: GridLayoutPattern[];
  /** Show loading state */
  loading?: boolean;
  /** Component title */
  title?: ReactNode;
  /** Called when grid layout changes */
  onLayoutChange?: (layout: GridLayoutPattern) => void;
  /** Called when a camera tile is clicked */
  onTileClick?: (stream: WHEPCameraStream, index: number) => void;
  /** Called when a stream encounters an error */
  onStreamError?: (error: Error, stream: WHEPCameraStream) => void;
  /** Called when camera selection changes */
  onSelectionChange?: (selectedIds: string[]) => void;
  /** Show the pattern/layout selector (default: true) */
  showLayoutSelector?: boolean;
  /** Show tile labels/names (default: true) */
  showTileLabels?: boolean;
  /** Label placement on tiles */
  tileLabelPlacement?: 'top' | 'bottom';
  /** Show tile controls (fullscreen, etc.) */
  showTileControls?: boolean;
  /** Enable tile selection with checkboxes (default: false) */
  enableTileSelection?: boolean;
  /** Enable "Open in Layout" button for selected cameras */
  enableOpenInLayout?: boolean;
  /** URL path for layout viewer (default: '/layout-viewer') */
  layoutViewerPath?: string;
  /** Height of the component */
  height?: string | number;
  /** Additional className */
  className?: string;
  /** Custom empty state component */
  emptyState?: ReactNode;
}

