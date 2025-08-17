import React from 'react';
import { CameraStream, NormalizedPoint, StreamPolygon } from '../types/video';
export interface LiveFeedViewerProps {
    stream: CameraStream;
    className?: string;
    title?: string;
    subtitle?: string;
    defaultEnabled?: boolean;
    defaultDrawEnabled?: boolean;
    enableMultiplePolygons?: boolean;
    initialPolygons?: Array<Array<NormalizedPoint>>;
    onPolygonsChange?: (polygons: Array<Array<NormalizedPoint>>) => void;
    onPolygonDetails?: (polygons: StreamPolygon[]) => void;
    onSaveSelectedPolygon?: (polygon: StreamPolygon | null) => void;
    anomalyCatalog?: Array<{
        anomalyId: number;
        anomalyName: string;
        anomalySelected?: boolean;
    }>;
    onAnomalyChange?: (polygonIndex: number, anomalyIds: number[]) => void;
    selectedPolygonAnomalyIds?: number[];
    onSelectionChange?: (index: number | null, polygon: StreamPolygon | null) => void;
    onReset?: (args: {
        mode: 'selected' | 'all';
        ids: string[];
    }) => void;
    showControls?: {
        draw?: boolean;
        viewer?: boolean;
        reset?: boolean;
        fullscreen?: boolean;
        save?: boolean;
    };
}
export declare const LiveFeedViewer: React.FC<LiveFeedViewerProps>;
export default LiveFeedViewer;
//# sourceMappingURL=LiveFeedViewer.d.ts.map