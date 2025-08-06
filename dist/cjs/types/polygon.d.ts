export interface Point {
    x: number;
    y: number;
}
export interface Zone {
    id: string;
    name: string;
    points: Point[];
    color: string;
    opacity?: number;
    strokeWidth?: number;
    isActive?: boolean;
    metadata?: {
        type?: 'restricted' | 'monitoring' | 'alert' | 'safe';
        description?: string;
        createdAt?: string;
        updatedAt?: string;
    };
}
export interface PolygonEditorProps {
    width: number;
    height: number;
    zones: Zone[];
    onZonesChange: (zones: Zone[]) => void;
    isDrawing?: boolean;
    onDrawingChange?: (isDrawing: boolean) => void;
    selectedZoneId?: string | null;
    onZoneSelect?: (zoneId: string | null) => void;
    readonly?: boolean;
    showGrid?: boolean;
    gridSize?: number;
    snapToGrid?: boolean;
    className?: string;
}
export interface ZoneControlsProps {
    zones: Zone[];
    selectedZoneId: string | null;
    onZoneSelect: (zoneId: string | null) => void;
    onZoneAdd: () => void;
    onZoneDelete: (zoneId: string) => void;
    onZoneUpdate: (zoneId: string, updates: Partial<Zone>) => void;
    onZoneDuplicate?: (zoneId: string) => void;
    isDrawing: boolean;
    onDrawingToggle: () => void;
    readonly?: boolean;
}
export interface VideoPolygonOverlayProps {
    videoElement?: HTMLVideoElement | null;
    zones: Zone[];
    onZonesChange?: (zones: Zone[]) => void;
    width: number;
    height: number;
    readonly?: boolean;
    showControls?: boolean;
    className?: string;
}
//# sourceMappingURL=polygon.d.ts.map