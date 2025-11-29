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
    labelPlacement?: 'top' | 'bottom';
    onTogglePlay: (streamId: string) => void;
    onToggleMute: (streamId: string) => void;
    onFullscreen: (streamId: string) => void;
    onClick?: (streamId: string) => void;
    onError?: (error: Error, streamId: string) => void;
    className?: string;
    style?: React.CSSProperties;
}
export declare const LiveVideoTile: React.NamedExoticComponent<LiveVideoTileProps>;
//# sourceMappingURL=LiveVideoTile.d.ts.map