import { CameraStream } from '../types/video';
export interface UseVideoPlayerState {
    activeStreamIndex: number;
    isPlaying: boolean;
    isMuted: boolean;
    isFullscreen: boolean;
    error: string | null;
    isLoading: boolean;
}
export interface UseVideoPlayerActions {
    setActiveStreamIndex: (index: number) => void;
    togglePlayPause: () => void;
    toggleMute: () => void;
    toggleFullscreen: () => void;
    clearError: () => void;
    setError: (error: string) => void;
    setLoading: (loading: boolean) => void;
    handleStreamChange: (streamIndex: number) => void;
    handleError: (error: Error, stream?: CameraStream) => void;
    handleRetry: () => void;
}
export interface UseVideoPlayerReturn extends UseVideoPlayerState, UseVideoPlayerActions {
}
export declare function useVideoPlayer(streams: CameraStream[], initialAutoPlay?: boolean, initialMuted?: boolean, onStreamChange?: (stream: CameraStream) => void, onError?: (error: Error, stream: CameraStream) => void): UseVideoPlayerReturn;
//# sourceMappingURL=useVideoPlayer.d.ts.map