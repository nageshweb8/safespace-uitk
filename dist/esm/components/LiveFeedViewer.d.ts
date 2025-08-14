import React from 'react';
import { CameraStream, NormalizedPoint, StreamPolygon } from '../types/video';
export interface LiveFeedViewerProps {
    stream: CameraStream;
    className?: string;
    title?: string;
    subtitle?: string;
    defaultEnabled?: boolean;
    enableMultiplePolygons?: boolean;
    initialPolygons?: Array<Array<NormalizedPoint>>;
    onPolygonsChange?: (polygons: Array<Array<NormalizedPoint>>) => void;
    onPolygonDetails?: (polygons: StreamPolygon[]) => void;
    showControls?: {
        draw?: boolean;
        viewer?: boolean;
        reset?: boolean;
        fullscreen?: boolean;
    };
}
export declare const LiveFeedViewer: React.FC<LiveFeedViewerProps>;
export default LiveFeedViewer;
//# sourceMappingURL=LiveFeedViewer.d.ts.map