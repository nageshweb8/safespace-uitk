import React, { useState, useCallback, useRef, useEffect } from 'react';
import { PolygonEditor } from './PolygonEditor';
import { ZoneControls } from './ZoneControls';
import { Zone, VideoPolygonOverlayProps } from '../../types/polygon';
import { cn } from '../../utils/cn';

export const VideoPolygonOverlay: React.FC<VideoPolygonOverlayProps> = ({
  videoElement,
  zones: initialZones = [],
  onZonesChange,
  width,
  height,
  readonly = false,
  showControls = true,
  className
}) => {
  const [zones, setZones] = useState<Zone[]>(initialZones);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update local zones when prop changes
  useEffect(() => {
    setZones(initialZones);
  }, [initialZones]);

  // Handle zones change
  const handleZonesChange = useCallback((newZones: Zone[]) => {
    setZones(newZones);
    onZonesChange?.(newZones);
  }, [onZonesChange]);

  // Handle zone add
  const handleZoneAdd = useCallback(() => {
    setIsDrawing(true);
    setSelectedZoneId(null);
  }, []);

  // Handle zone delete
  const handleZoneDelete = useCallback((zoneId: string) => {
    const newZones = zones.filter(zone => zone.id !== zoneId);
    handleZonesChange(newZones);
    if (selectedZoneId === zoneId) {
      setSelectedZoneId(null);
    }
  }, [zones, selectedZoneId, handleZonesChange]);

  // Handle zone update
  const handleZoneUpdate = useCallback((zoneId: string, updates: Partial<Zone>) => {
    const newZones = zones.map(zone => 
      zone.id === zoneId 
        ? { ...zone, ...updates, metadata: { ...zone.metadata, ...updates.metadata } }
        : zone
    );
    handleZonesChange(newZones);
  }, [zones, handleZonesChange]);

  // Handle zone duplicate
  const handleZoneDuplicate = useCallback((zoneId: string) => {
    const zoneToClone = zones.find(zone => zone.id === zoneId);
    if (!zoneToClone) return;

    const clonedZone: Zone = {
      ...zoneToClone,
      id: `zone_${Date.now()}`,
      name: `${zoneToClone.name} (Copy)`,
      points: zoneToClone.points.map(point => ({ x: point.x + 20, y: point.y + 20 })), // Offset copy
      metadata: {
        ...zoneToClone.metadata,
        createdAt: new Date().toISOString()
      }
    };

    const newZones = [...zones, clonedZone];
    handleZonesChange(newZones);
    setSelectedZoneId(clonedZone.id);
  }, [zones, handleZonesChange]);

  // Handle drawing toggle
  const handleDrawingToggle = useCallback(() => {
    setIsDrawing(!isDrawing);
    if (isDrawing) {
      setSelectedZoneId(null);
    }
  }, [isDrawing]);

  return (
    <div className={cn('relative flex', className)} ref={containerRef}>
      {/* Main polygon editor area */}
      <div className="flex-1 relative">
        <PolygonEditor
          width={width}
          height={height}
          zones={zones}
          onZonesChange={handleZonesChange}
          isDrawing={isDrawing}
          onDrawingChange={setIsDrawing}
          selectedZoneId={selectedZoneId}
          onZoneSelect={setSelectedZoneId}
          readonly={readonly}
          showGrid={!videoElement} // Show grid only when no video
          gridSize={20}
          snapToGrid={false}
          className="border border-gray-300 rounded-lg overflow-hidden"
        />
      </div>

      {/* Zone controls panel */}
      {showControls && (
        <div className="ml-4 flex-shrink-0">
          <ZoneControls
            zones={zones}
            selectedZoneId={selectedZoneId}
            onZoneSelect={setSelectedZoneId}
            onZoneAdd={handleZoneAdd}
            onZoneDelete={handleZoneDelete}
            onZoneUpdate={handleZoneUpdate}
            onZoneDuplicate={handleZoneDuplicate}
            isDrawing={isDrawing}
            onDrawingToggle={handleDrawingToggle}
            readonly={readonly}
          />
        </div>
      )}
    </div>
  );
};

export default VideoPolygonOverlay;
