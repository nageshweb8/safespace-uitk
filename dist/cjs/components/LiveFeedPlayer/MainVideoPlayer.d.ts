import React from 'react';
import { CameraStream } from '../../types/video';
export interface MainVideoPlayerProps {
    stream: CameraStream;
    isPlaying: boolean;
    isMuted: boolean;
    error: string | null;
    showControls: boolean;
    streamCount: number;
    onPlayPause: () => void;
    onMuteUnmute: () => void;
    onFullscreen: () => void;
    onRetry: () => void;
    onError: (error: Error) => void;
    className?: string;
}
export declare const MainVideoPlayer: React.FC<MainVideoPlayerProps>;
//# sourceMappingURL=MainVideoPlayer.d.ts.map