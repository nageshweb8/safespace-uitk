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
    polygons?: StreamPolygon[] | Polygon[] | Polygon;
}
export type NormalizedPoint = {
    x: number;
    y: number;
};
export type Polygon = NormalizedPoint[];
export interface StreamPolygon {
    id?: string;
    label?: string;
    color?: string;
    points: Polygon;
    anomalyIds?: number[];
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
export type LiveVideoPatternKey = '1' | '2' | '4' | '8' | '9' | '14' | '16' | '28' | 'M14' | 'M15' | '6-Highlight' | '8-Highlight' | '10-Highlight' | '12-Highlight' | '16-Highlight' | '20' | '36' | '64';
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
//# sourceMappingURL=video.d.ts.map