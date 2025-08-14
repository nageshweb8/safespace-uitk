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
//# sourceMappingURL=video.d.ts.map