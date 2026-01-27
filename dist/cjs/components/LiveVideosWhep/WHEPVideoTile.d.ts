import React from 'react';
import { WHEPCameraStream, WHEPConfig } from '../../types/video';
export interface WHEPVideoTileProps {
    stream?: WHEPCameraStream;
    index: number;
    whepConfig: WHEPConfig;
    showLabel?: boolean;
    labelPlacement?: 'top' | 'bottom';
    showControls?: boolean;
    isSelected?: boolean;
    enableSelection?: boolean;
    onToggleSelect?: (streamId: string) => void;
    onFullscreen?: (streamId: string) => void;
    onClick?: (streamId: string) => void;
    onError?: (error: Error, streamId: string) => void;
    className?: string;
    style?: React.CSSProperties;
}
export declare const WHEPVideoTile: React.NamedExoticComponent<WHEPVideoTileProps>;
//# sourceMappingURL=WHEPVideoTile.d.ts.map