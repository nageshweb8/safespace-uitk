import type { ReactNode } from 'react';
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

export interface VideoPlayerProps {
  stream: CameraStream;
  autoPlay?: boolean;
  muted?: boolean;
  controls?: boolean;
  className?: string;
  onError?: (error: Error) => void;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  showOverlay?: boolean;
  // Optional: expose the internal <video> element for integrations
  refCallback?: (el: HTMLVideoElement | null) => void;
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
  // Capture frame configuration (all optional to preserve BC)
  showCaptureButton?: boolean; // Render a capture icon overlay on the main video
  captureIcon?: ReactNode; // Custom icon node
  captureTooltip?: string; // Tooltip text for the capture icon
  onCapture?: (payload: CaptureFramePayload) => void; // Callback when a frame is captured (via icon or imperative API)
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

// Payload returned when capturing a frame from the currently active stream
export interface CaptureFramePayload {
  blob: Blob; // Captured image blob (JPEG)
  objectUrl: string; // URL.createObjectURL for quick preview
  width: number;
  height: number;
  timestamp: number; // Date.now()
  stream: CameraStream; // The stream that was active when captured
  contentType: string; // e.g., 'image/jpeg'
}

// Imperative handle that the LiveFeedPlayer can expose via forwardRef
export interface LiveFeedPlayerHandle {
  captureFrame: () => Promise<CaptureFramePayload>;
  getActiveStream: () => CameraStream | undefined;
  getVideoElement: () => HTMLVideoElement | null;
}
