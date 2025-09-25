import React from 'react';
import { CameraStream } from '../../types/video';
export interface LiveVideoTileProps {
    stream?: CameraStream;
    index: number;
    isPrimary?: boolean;
    isPlaying: boolean;
    isMuted: boolean;
    showControls: boolean;
    controlsSize: 'small' | 'medium';
    showLabel: boolean;
    onTogglePlay: () => void;
    onToggleMute: () => void;
    onFullscreen: () => void;
    onClick?: () => void;
    onError?: (error: Error) => void;
    className?: string;
    style?: React.CSSProperties;
}
export declare const LiveVideoTile: React.FC<LiveVideoTileProps>;
//# sourceMappingURL=LiveVideoTile.d.ts.map