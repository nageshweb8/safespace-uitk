import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Stage, Layer, Line, Circle, Rect } from 'react-konva';
import Konva from 'konva';
import { Point, Zone, PolygonEditorProps } from '../../types/polygon';
import { cn } from '../../utils/cn';

// Zone colors for different types
const ZONE_COLORS = {
  restricted: '#ef4444', // red
  monitoring: '#3b82f6', // blue
  alert: '#f59e0b', // amber
  safe: '#10b981', // emerald
  default: '#6b7280' // gray
};

export const PolygonEditor: React.FC<PolygonEditorProps> = ({
  width,
  height,
  zones,
  onZonesChange,
  isDrawing = false,
  onDrawingChange,
  selectedZoneId = null,
  onZoneSelect,
  readonly = false,
  showGrid = false,
  gridSize = 20,
  snapToGrid = false,
  className
}) => {
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const [draggedPointIndex, setDraggedPointIndex] = useState<number | null>(null);
  const stageRef = useRef<Konva.Stage>(null);

  // Snap point to grid if enabled
  const snapPoint = useCallback((point: Point): Point => {
    if (!snapToGrid) return point;
    return {
      x: Math.round(point.x / gridSize) * gridSize,
      y: Math.round(point.y / gridSize) * gridSize
    };
  }, [snapToGrid, gridSize]);

  // Get relative position from stage
  const getRelativePointerPosition = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return null;
    const transform = stage.getAbsoluteTransform().copy();
    transform.invert();
    const pos = stage.getPointerPosition();
    if (!pos) return null;
    return transform.point(pos);
  }, []);

  // Handle stage click for drawing
  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (readonly) return;

    // Deselect if clicking on empty space
    if (e.target === e.target.getStage()) {
      onZoneSelect?.(null);
    }

    if (!isDrawing) return;

    const pos = getRelativePointerPosition();
    if (!pos) return;

    const snappedPos = snapPoint(pos);
    
    // Check if clicking near the first point to close polygon
    if (currentPoints.length >= 3) {
      const firstPoint = currentPoints[0];
      const distance = Math.sqrt(
        Math.pow(snappedPos.x - firstPoint.x, 2) + 
        Math.pow(snappedPos.y - firstPoint.y, 2)
      );
      
      if (distance < 20) {
        // Close the polygon
        const newZone: Zone = {
          id: `zone_${Date.now()}`,
          name: `Zone ${zones.length + 1}`,
          points: [...currentPoints],
          color: ZONE_COLORS.default,
          opacity: 0, // Start with transparent fill (borders only)
          strokeWidth: 2,
          metadata: {
            type: 'monitoring',
            description: '',
            createdAt: new Date().toISOString()
          }
        };
        
        onZonesChange([...zones, newZone]);
        setCurrentPoints([]);
        onDrawingChange?.(false);
        onZoneSelect?.(newZone.id);
        return;
      }
    }

    setCurrentPoints(prev => [...prev, snappedPos]);
  }, [readonly, isDrawing, currentPoints, zones, onZonesChange, onDrawingChange, onZoneSelect, snapPoint, getRelativePointerPosition]);

  // Handle point drag
  const handlePointDrag = useCallback((zoneId: string, pointIndex: number, newPos: Point) => {
    if (readonly) return;
    
    const snappedPos = snapPoint(newPos);
    const updatedZones = zones.map(zone => {
      if (zone.id === zoneId) {
        const newPoints = [...zone.points];
        newPoints[pointIndex] = snappedPos;
        return { ...zone, points: newPoints };
      }
      return zone;
    });
    onZonesChange(updatedZones);
  }, [readonly, zones, onZonesChange, snapPoint]);

  // Handle zone click
  const handleZoneClick = useCallback((zoneId: string) => {
    onZoneSelect?.(zoneId);
  }, [onZoneSelect]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (readonly) return;
      
      if (e.key === 'Escape') {
        if (isDrawing) {
          setCurrentPoints([]);
          onDrawingChange?.(false);
        } else {
          onZoneSelect?.(null);
        }
      }
      
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedZoneId) {
          const updatedZones = zones.filter(zone => zone.id !== selectedZoneId);
          onZonesChange(updatedZones);
          onZoneSelect?.(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [readonly, isDrawing, selectedZoneId, zones, onZonesChange, onZoneSelect, onDrawingChange]);

  // Render grid
  const renderGrid = () => {
    if (!showGrid) return null;
    
    const lines = [];
    
    // Vertical lines
    for (let i = 0; i <= width; i += gridSize) {
      lines.push(
        <Line
          key={`v-${i}`}
          points={[i, 0, i, height]}
          stroke="#e5e7eb"
          strokeWidth={0.5}
          opacity={0.5}
        />
      );
    }
    
    // Horizontal lines
    for (let i = 0; i <= height; i += gridSize) {
      lines.push(
        <Line
          key={`h-${i}`}
          points={[0, i, width, i]}
          stroke="#e5e7eb"
          strokeWidth={0.5}
          opacity={0.5}
        />
      );
    }
    
    return lines;
  };

  // Render zone polygon
  const renderZone = (zone: Zone) => {
    const isSelected = zone.id === selectedZoneId;
    const flatPoints = zone.points.flatMap(p => [p.x, p.y]);
    
    return (
      <React.Fragment key={zone.id}>
        {/* Polygon fill and stroke */}
        <Line
          points={flatPoints}
          closed
          fill={zone.color}
          opacity={zone.opacity || 0.3}
          stroke={zone.color}
          strokeWidth={isSelected ? (zone.strokeWidth || 2) + 2 : (zone.strokeWidth || 2)}
          onClick={() => handleZoneClick(zone.id)}
          onTap={() => handleZoneClick(zone.id)}
        />
        
        {/* Control points for selected zone */}
        {isSelected && !readonly && zone.points.map((point, index) => (
          <Circle
            key={`${zone.id}-point-${index}`}
            x={point.x}
            y={point.y}
            radius={hoveredPointIndex === index ? 8 : 6}
            fill={zone.color}
            stroke="#ffffff"
            strokeWidth={2}
            draggable
            onMouseEnter={() => setHoveredPointIndex(index)}
            onMouseLeave={() => setHoveredPointIndex(null)}
            onDragStart={() => setDraggedPointIndex(index)}
            onDragEnd={() => setDraggedPointIndex(null)}
            onDragMove={(e) => {
              const newPos = { x: e.target.x(), y: e.target.y() };
              handlePointDrag(zone.id, index, newPos);
            }}
          />
        ))}
      </React.Fragment>
    );
  };

  // Render current drawing polygon
  const renderCurrentPolygon = () => {
    if (currentPoints.length === 0) return null;
    
    const flatPoints = currentPoints.flatMap(p => [p.x, p.y]);
    
    return (
      <React.Fragment>
        {/* Current polygon line */}
        <Line
          points={flatPoints}
          stroke={ZONE_COLORS.default}
          strokeWidth={2}
          dash={[5, 5]}
        />
        
        {/* Current points */}
        {currentPoints.map((point, index) => (
          <Circle
            key={`current-${index}`}
            x={point.x}
            y={point.y}
            radius={4}
            fill={ZONE_COLORS.default}
            stroke="#ffffff"
            strokeWidth={1}
          />
        ))}
        
        {/* First point highlight for closing */}
        {currentPoints.length >= 3 && (
          <Circle
            x={currentPoints[0].x}
            y={currentPoints[0].y}
            radius={8}
            stroke={ZONE_COLORS.default}
            strokeWidth={3}
            fill="transparent"
          />
        )}
      </React.Fragment>
    );
  };

  return (
    <div className={cn('relative', className)}>
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        onClick={handleStageClick}
        onTap={handleStageClick}
      >
        <Layer>
          {/* Background */}
          <Rect
            width={width}
            height={height}
            fill="transparent"
          />
          
          {/* Grid */}
          {renderGrid()}
          
          {/* Existing zones */}
          {zones.map(renderZone)}
          
          {/* Current drawing polygon */}
          {renderCurrentPolygon()}
        </Layer>
      </Stage>
      
      {/* Drawing instructions */}
      {isDrawing && (
        <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
          Click to add points. Click first point or press Escape to finish.
        </div>
      )}
      
      {/* Selected zone info */}
      {selectedZoneId && (
        <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
          {zones.find(z => z.id === selectedZoneId)?.name} selected (Delete to remove)
        </div>
      )}
    </div>
  );
};

export default PolygonEditor;
