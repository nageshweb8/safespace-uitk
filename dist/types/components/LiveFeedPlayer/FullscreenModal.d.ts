import React from 'react';
import { CameraStream } from '../../types/video';
export interface FullscreenModalProps {
    isOpen: boolean;
    stream: CameraStream;
    isPlaying: boolean;
    isMuted: boolean;
    onClose: () => void;
    onError: (error: Error) => void;
}
export declare const FullscreenModal: React.FC<FullscreenModalProps>;
//# sourceMappingURL=FullscreenModal.d.ts.map