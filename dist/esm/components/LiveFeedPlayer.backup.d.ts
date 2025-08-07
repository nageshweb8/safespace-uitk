import React from 'react';
import { CameraStream } from '../types/video';
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
}
export declare const LiveFeedPlayer: React.FC<LiveFeedPlayerProps>;
//# sourceMappingURL=LiveFeedPlayer.backup.d.ts.map