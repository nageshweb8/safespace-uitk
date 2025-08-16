import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, Switch, Button, Tooltip, Typography, Modal } from 'antd';
import { ArrowsAltOutlined, ShrinkOutlined, ReloadOutlined } from '@ant-design/icons';
import { CameraStream, NormalizedPoint, StreamPolygon, Polygon } from '../types/video';
import { VideoPlayer } from './VideoPlayer';
import { cn } from '../utils/cn';

const { Text } = Typography;

export interface LiveFeedViewerProps {
  stream: CameraStream;
  className?: string;
  title?: string;
  subtitle?: string;
  defaultEnabled?: boolean; // On/Off toggle default
  enableMultiplePolygons?: boolean; // default true
  // Optional initial polygons override (falls back to stream.polygons)
  initialPolygons?: Array<Array<NormalizedPoint>>;
  // Emits normalized polygons array and rich details when polygons change
  onPolygonsChange?: (
    polygons: Array<Array<NormalizedPoint>>, // deprecated simple shape
  ) => void;
  // New detailed callback: provides per-polygon metadata
  onPolygonDetails?: (polygons: StreamPolygon[]) => void;
  // Save callback: emits only the selected polygon when Save is clicked
  onSaveSelectedPolygon?: (polygon: StreamPolygon | null) => void;
  // Optional anomaly catalog to show labels for anomalyIds
  anomalyCatalog?: Array<{ anomalyId: number; anomalyName: string; anomalySelected?: boolean }>;
  // Called when the anomaly IDs change for a polygon (selection changed)
  onAnomalyChange?: (polygonIndex: number, anomalyIds: number[]) => void;
  // Controlled anomaly IDs for the currently selected polygon (if provided, viewer syncs its state)
  selectedPolygonAnomalyIds?: number[];
  // Selection change callback (index and polygon details)
  onSelectionChange?: (index: number | null, polygon: StreamPolygon | null) => void;
  // Called after reset operation with the ids of deleted polygons and mode
  onReset?: (args: { mode: 'selected' | 'all'; ids: string[] }) => void;
  // Controls which action buttons/toggles are visible
  showControls?: {
    draw?: boolean;
    viewer?: boolean;
    reset?: boolean;
    fullscreen?: boolean;
    save?: boolean;
  };
}

// Simple distance helper
function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export const LiveFeedViewer: React.FC<LiveFeedViewerProps> = ({
  stream,
  className,
  title = 'Live Feed Viewer',
  subtitle = 'Draw polygons (lines only) on live video',
  defaultEnabled = true,
  enableMultiplePolygons = true,
  initialPolygons,
  onPolygonsChange,
  onPolygonDetails,
  onSaveSelectedPolygon,
  anomalyCatalog,
  // onAnomalyChange,
  selectedPolygonAnomalyIds,
  onSelectionChange,
  onReset,
  showControls,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [enabled, setEnabled] = useState<boolean>(defaultEnabled);
  const [drawingEnabled, setDrawingEnabled] = useState<boolean>(true);
  const [isExpanded, setIsExpanded] = useState(false);
  // Track whether the user has locally edited polygons so we don't overwrite from props
  const userDirtyRef = useRef(false);
  // Track last stream id to reset dirty state when switching cameras
  const lastStreamIdRef = useRef<string | number | undefined>((stream as any)?.id);
  // Prefer explicit initialPolygons, otherwise use stream.polygons if provided
  // Normalize incoming polygons into the internal Array<Polygon> shape
  const initialFromStream = useMemo<Array<Polygon>>(() => {
    if (initialPolygons && initialPolygons.length) return initialPolygons.map(p => [...p]);
    const sp = stream?.polygons as StreamPolygon[] | Polygon[] | Polygon | undefined;
    if (!sp) return [];
    // If it's a single polygon (array of points)
    if (Array.isArray(sp) && sp.length && !Array.isArray((sp as any)[0])) {
      const maybePoints = sp as unknown as Polygon;
      if (maybePoints.length && typeof maybePoints[0] === 'object' && 'x' in maybePoints[0] && 'y' in maybePoints[0]) {
        return [maybePoints.map(p => ({ ...p }))];
      }
    }
    // If it's an array of polygons without metadata
    if (Array.isArray(sp) && sp.length && Array.isArray((sp as any)[0])) {
      return (sp as Polygon[]).map(poly => poly.map(p => ({ ...p })));
    }
    // If it's StreamPolygon[]
    if (Array.isArray(sp)) {
      return (sp as StreamPolygon[]).map(p => [...p.points]);
    }
    return [];
  }, [initialPolygons, stream?.polygons]);

  const [polygons, setPolygons] = useState<Array<Array<NormalizedPoint>>>(initialFromStream);
  const [currentPoints, setCurrentPoints] = useState<Array<NormalizedPoint>>([]);
  const [size, setSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  // Track anomalies by polygon index
  const [polygonAnomalies, setPolygonAnomalies] = useState<Record<number, number[]>>({});

  // Emit selection change to parent with details
  const emitSelectedChange = useCallback((idx: number | null) => {
    if (!onSelectionChange) return;
    if (idx == null || idx < 0 || idx >= polygons.length) {
      onSelectionChange(null, null);
      return;
    }
    // Build details based on current state and base metadata
    const basePolys = stream?.polygons as StreamPolygon[] | Polygon[] | Polygon | undefined;
    const baseList: StreamPolygon[] = Array.isArray(basePolys) && basePolys.length && !Array.isArray((basePolys as any)[0])
      ? [{ points: basePolys as Polygon }]
      : Array.isArray(basePolys) && Array.isArray((basePolys as any)[0])
        ? (basePolys as Polygon[]).map(p => ({ points: p }))
        : (basePolys as StreamPolygon[]) || [];
    const base = baseList[idx] || {};
    const detailed: StreamPolygon = {
  id: base.id ?? '0',
      label: base.label,
      color: base.color,
      points: polygons[idx],
      anomalyIds: polygonAnomalies[idx] ?? base.anomalyIds,
    } as StreamPolygon;
    onSelectionChange(idx, detailed);
  }, [onSelectionChange, polygons, polygonAnomalies, stream?.polygons]);

  // Deep compare helper for polygons
  const deepEqualPolys = useCallback((a: Array<Polygon>, b: Array<Polygon>) => {
    if (a === b) return true;
    if (!a || !b || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      const pa = a[i];
      const pb = b[i];
      if (!pa || !pb || pa.length !== pb.length) return false;
      for (let j = 0; j < pa.length; j++) {
        const p1 = pa[j];
        const p2 = pb[j];
        if (!p1 || !p2 || p1.x !== p2.x || p1.y !== p2.y) return false;
      }
    }
    return true;
  }, []);

  // Sync from props on first mount or when stream id changes, otherwise don't overwrite user edits
  useEffect(() => {
    if (initialPolygons && initialPolygons.length) return; // explicit override

    const currentStreamId = (stream as any)?.id;
    const sp = stream?.polygons as StreamPolygon[] | Polygon[] | Polygon | undefined;

    // Normalize incoming
    const toPolys = (): Array<Polygon> => {
      if (!sp) return [];
      if (Array.isArray(sp) && sp.length && !Array.isArray((sp as any)[0])) {
        const maybePoints = sp as unknown as Polygon;
        if (maybePoints.length && typeof maybePoints[0] === 'object') {
          return [maybePoints.map(p => ({ ...p }))];
        }
      }
      if (Array.isArray(sp) && sp.length && Array.isArray((sp as any)[0])) {
        return (sp as Polygon[]).map(poly => poly.map(p => ({ ...p })));
      }
      if (Array.isArray(sp)) {
        return (sp as StreamPolygon[]).map(p => [...p.points]);
      }
      return [];
    };

    // If stream id changed, treat as a fresh source and reset dirty state
    if (lastStreamIdRef.current !== currentStreamId) {
      lastStreamIdRef.current = currentStreamId;
      userDirtyRef.current = false;
      const next = toPolys();
      setPolygons(next);
      setCurrentPoints([]);
      setSelectedIndex(null);
      // Initialize anomalies from stream polygons if present
      const base = (Array.isArray(sp)
        ? (Array.isArray((sp as any)[0])
            ? (sp as Polygon[]).map(p => ({ points: p }))
            : (sp as any as StreamPolygon[])
          )
        : []) as StreamPolygon[];
      const init: Record<number, number[]> = {};
      base.forEach((bp, i) => {
        if (bp?.anomalyIds?.length) init[i] = [...bp.anomalyIds];
      });
      setPolygonAnomalies(init);
      return;
    }

    // If user hasn't edited, keep in sync only when the shapes actually changed (deep compare)
    if (!userDirtyRef.current) {
      const next = toPolys();
      if (!deepEqualPolys(polygons, next)) {
        setPolygons(next);
        setCurrentPoints([]);
        // Best-effort keep anomaly mapping size in sync; preserve existing indices where possible
        setPolygonAnomalies(prev => {
          const out: Record<number, number[]> = {};
          for (let i = 0; i < next.length; i++) if (prev[i]) out[i] = prev[i];
          return out;
        });
      }
    }
  }, [stream?.polygons, stream?.id, initialPolygons, polygons, deepEqualPolys]);

  const recalcSize = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    setSize({ width: Math.max(0, rect.width), height: Math.max(0, rect.height) });
    // Adjust canvas backing store for DPR
    const dpr = window.devicePixelRatio || 1;
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
      }
    }
  }, []);

  useEffect(() => {
    recalcSize();
    const onResize = () => recalcSize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [recalcSize]);
  // Recalc after expanding when DOM is ready
  useEffect(() => {
  const t = setTimeout(() => recalcSize(), 0);
  return () => clearTimeout(t);
  }, [isExpanded, recalcSize]);

  // Redraw on changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // clear
    ctx.clearRect(0, 0, size.width, size.height);

  const stroke = 'rgba(0,255,0,1)';
    const activeStroke = 'rgba(255,255,0,1)';
    const selectedStroke = 'rgba(0,214,255,1)';
    const selectedFill = 'rgba(0,214,255,0.12)';

    // helper
  const px = (p: NormalizedPoint) => ({ x: p.x * size.width, y: p.y * size.height });

    // Normalize base polygons (from props) to access optional color per index
    const basePolys = stream?.polygons as StreamPolygon[] | Polygon[] | Polygon | undefined;
    const baseList: StreamPolygon[] = Array.isArray(basePolys) && basePolys.length && !Array.isArray((basePolys as any)[0])
      ? [{ points: basePolys as Polygon }]
      : Array.isArray(basePolys) && Array.isArray((basePolys as any)[0])
        ? (basePolys as Polygon[]).map(p => ({ points: p }))
        : (basePolys as StreamPolygon[]) || [];

    // completed polygons
    polygons.forEach((poly, idx) => {
      if (poly.length < 2) return;
      ctx.beginPath();
      const p0 = px(poly[0]);
      ctx.moveTo(p0.x, p0.y);
      for (let i = 1; i < poly.length; i++) {
        const pi = px(poly[i]);
        ctx.lineTo(pi.x, pi.y);
      }
      ctx.closePath();
  const color = baseList[idx]?.color || stroke;
      // Highlight selected polygon differently
      if (selectedIndex === idx) {
        ctx.fillStyle = selectedFill;
        ctx.fill();
        ctx.strokeStyle = selectedStroke;
        ctx.lineWidth = 3;
      } else {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
      }
      ctx.stroke();

      // Draw anomaly labels (top-right of polygon bbox) if there are anomalyIds
      const label = anomalyLabelForIndex(idx);
      if (label) {
        // compute top-right of polygon bounding box
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of poly) {
          const x = p.x * size.width;
          const y = p.y * size.height;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
        const cpx = maxX; // right
        const cpy = minY; // top
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        // text background
        const metrics = ctx.measureText(label);
        const padX = 6, padY = 3;
        const textW = metrics.width;
        const textH = 14;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.beginPath();
        ctx.rect(cpx + 8, cpy - 8, textW + padX * 2, textH + padY * 2);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.fillText(label, cpx + 8 + padX, cpy - 8 + padY);
      }
    });

    // active polyline
    if (currentPoints.length) {
      ctx.beginPath();
      const p0 = px(currentPoints[0]);
      ctx.moveTo(p0.x, p0.y);
      for (let i = 1; i < currentPoints.length; i++) {
        const pi = px(currentPoints[i]);
        ctx.lineTo(pi.x, pi.y);
      }
      ctx.strokeStyle = activeStroke;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // first point marker
      ctx.beginPath();
      ctx.arc(p0.x, p0.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,0,0.9)';
      ctx.fill();
    }
  }, [polygons, currentPoints, size.width, size.height, selectedIndex, stream?.polygons]);

  // Notify changes in both legacy and detailed shapes
  useEffect(() => {
    onPolygonsChange?.(polygons);
    // Emit detailed polygon data with optional stream metadata preserved
    const basePolys = stream?.polygons as StreamPolygon[] | Polygon[] | Polygon | undefined;
    const baseList: StreamPolygon[] = Array.isArray(basePolys) && basePolys.length && !Array.isArray((basePolys as any)[0])
      ? [{ points: basePolys as Polygon }]
      : Array.isArray(basePolys) && Array.isArray((basePolys as any)[0])
        ? (basePolys as Polygon[]).map(p => ({ points: p }))
        : (basePolys as StreamPolygon[]) || [];
  const detailed: StreamPolygon[] = polygons.map((points, idx) => {
      const base = baseList[idx] || {};
      return {
  id: base.id ?? '0',
        label: base.label,
        color: base.color,
    points,
    anomalyIds: base.anomalyIds ?? polygonAnomalies[idx],
      } as StreamPolygon;
    });
    onPolygonDetails?.(detailed);
  }, [polygons, polygonAnomalies, onPolygonsChange, onPolygonDetails]);

  // Pointer handling on canvas
  // Point-in-polygon helper (ray casting) using normalized coordinates
  const isPointInPolygon = useCallback(
    (pt: NormalizedPoint, poly: Array<NormalizedPoint>) => {
      let inside = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const xi = poly[i].x, yi = poly[i].y;
        const xj = poly[j].x, yj = poly[j].y;
        const intersect = yi > pt.y !== yj > pt.y && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi + 0.0000001) + xi;
        if (intersect) inside = !inside;
      }
      return inside;
    },
    []
  );

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!enabled) return;
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const pointPx = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const point = {
      x: size.width ? pointPx.x / size.width : 0,
      y: size.height ? pointPx.y / size.height : 0,
    };
    // Selection mode when drawing is disabled
    if (!drawingEnabled) {
      let found: number | null = null;
      for (let i = polygons.length - 1; i >= 0; i--) {
        const poly = polygons[i];
        if (poly.length >= 3 && isPointInPolygon(point, poly)) {
          found = i;
          break;
        }
      }
  setSelectedIndex(found);
  emitSelectedChange(found);
      return;
    }

    // Drawing mode
    // close when near first point
    if (currentPoints.length > 2) {
      const firstPx = {
        x: currentPoints[0].x * size.width,
        y: currentPoints[0].y * size.height,
      };
    if (distance(pointPx, firstPx) < 12) {
        const newPoly = [...currentPoints];
        const nextPolys = enableMultiplePolygons ? [...polygons, newPoly] : [newPoly];
  setPolygons(nextPolys);
        setCurrentPoints([]);
    userDirtyRef.current = true;
        // Auto-select the most recently completed polygon
      const newIdx = enableMultiplePolygons ? nextPolys.length - 1 : 0;
  setSelectedIndex(newIdx);
  emitSelectedChange(newIdx);
      // Disable draw to simplify UX and let user immediately map anomalies
      setDrawingEnabled(false);
        return;
      }
    }

  userDirtyRef.current = true;
  setCurrentPoints((prev: Array<NormalizedPoint>) => [...prev, point]);
  };

  const handleReset = () => {
    // If a polygon is selected, delete only that polygon; otherwise reset all
    if (selectedIndex != null && selectedIndex >= 0 && selectedIndex < polygons.length) {
      // collect id for selected polygon
      const basePolys = stream?.polygons as StreamPolygon[] | Polygon[] | Polygon | undefined;
      const baseList: StreamPolygon[] = Array.isArray(basePolys) && basePolys.length && !Array.isArray((basePolys as any)[0])
        ? [{ points: basePolys as Polygon }]
        : Array.isArray(basePolys) && Array.isArray((basePolys as any)[0])
          ? (basePolys as Polygon[]).map(p => ({ points: p }))
          : (basePolys as StreamPolygon[]) || [];
      const base = baseList[selectedIndex] || {};
      const removedId = base.id ?? String(selectedIndex + 1);
      setPolygons(prev => prev.filter((_, i) => i !== selectedIndex));
      setPolygonAnomalies(prev => {
        const next: Record<number, number[]> = {};
        Object.keys(prev).forEach(k => {
          const i = Number(k);
          if (i < selectedIndex) next[i] = prev[i];
          else if (i > selectedIndex) next[i - 1] = prev[i];
        });
        return next;
      });
      setSelectedIndex(null);
      setCurrentPoints([]);
      onReset?.({ mode: 'selected', ids: [removedId] });
    } else {
      // collect all ids
      const basePolys = stream?.polygons as StreamPolygon[] | Polygon[] | Polygon | undefined;
      const baseList: StreamPolygon[] = Array.isArray(basePolys) && basePolys.length && !Array.isArray((basePolys as any)[0])
        ? [{ points: basePolys as Polygon }]
        : Array.isArray(basePolys) && Array.isArray((basePolys as any)[0])
          ? (basePolys as Polygon[]).map(p => ({ points: p }))
          : (basePolys as StreamPolygon[]) || [];
  const ids = polygons.map((_, idx) => (baseList[idx]?.id ?? '0') as string);
      setPolygons([]);
      setCurrentPoints([]);
      setSelectedIndex(null);
      setPolygonAnomalies({});
      if (ids.length) onReset?.({ mode: 'all', ids });
    }
    userDirtyRef.current = true;
  };

  // Expand controls handled via Modal

  const canDraw = enabled && drawingEnabled;
  const controlsVisible = {
    draw: showControls?.draw ?? true,
    viewer: showControls?.viewer ?? true,
    reset: showControls?.reset ?? true,
  fullscreen: showControls?.fullscreen ?? true, // re-used as Expand visibility
    save: showControls?.save ?? true,
  };

  // Save only the selected polygon
  const handleSaveSelected = () => {
    if (!onSaveSelectedPolygon) return;
    if (selectedIndex == null || selectedIndex < 0 || selectedIndex >= polygons.length) {
      onSaveSelectedPolygon(null);
      return;
    }
    // Normalize base polygons to optionally reuse id/label/color
    const basePolys = stream?.polygons as StreamPolygon[] | Polygon[] | Polygon | undefined;
    const baseList: StreamPolygon[] = Array.isArray(basePolys) && basePolys.length && !Array.isArray((basePolys as any)[0])
      ? [{ points: basePolys as Polygon }]
      : Array.isArray(basePolys) && Array.isArray((basePolys as any)[0])
        ? (basePolys as Polygon[]).map(p => ({ points: p }))
        : (basePolys as StreamPolygon[]) || [];
    const points = polygons[selectedIndex];
    const base = baseList[selectedIndex] || {};
    const detailed: StreamPolygon = {
  id: base.id ?? '0',
      label: base.label,
      color: base.color,
      points,
      anomalyIds: polygonAnomalies[selectedIndex] ?? base.anomalyIds,
    } as StreamPolygon;
    onSaveSelectedPolygon(detailed);
  };

  // Helper to get anomaly names label for overlay
  const anomalyLabelForIndex = (idx: number) => {
    const ids = polygonAnomalies[idx] ?? (Array.isArray((stream?.polygons as any)) && (stream?.polygons as any)[idx]?.anomalyIds);
    if (!ids || !ids.length) return '';
    const names = (ids as number[])
      .map(id => {
        const found = (Array.isArray((anomalyCatalog as any)) ? (anomalyCatalog as any) : []).find((a: any) => a.anomalyId === id);
        return found?.anomalyName || String(id);
      })
      .filter(Boolean);
    return names.join(', ');
  };

  // When parent provides controlled anomaly IDs for selected polygon, sync them in
  useEffect(() => {
    if (selectedIndex == null) return;
    if (!selectedPolygonAnomalyIds) return;
    setPolygonAnomalies(prev => ({ ...prev, [selectedIndex]: [...selectedPolygonAnomalyIds] }));
  }, [selectedPolygonAnomalyIds, selectedIndex]);

  // Expose a setter for anomalies of the selected polygon
  // const setSelectedPolygonAnomalies = (ids: number[]) => {
  //   if (selectedIndex == null) return;
  //   setPolygonAnomalies(prev => ({ ...prev, [selectedIndex]: [...ids] }));
  //   onAnomalyChange?.(selectedIndex, ids);
  // };

  return (
    <Card className={cn('w-full h-full', className)} styles={{ body: { padding: 16 } }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <Text strong className="block">{title}</Text>
          <Text type="secondary" className="text-xs">{subtitle}</Text>
        </div>
        <div className="flex items-center gap-3">
          {controlsVisible.viewer && (
            <div className="flex items-center gap-2">
              <Text className="text-xs">Viewer</Text>
              <Switch checked={enabled} onChange={setEnabled} />
            </div>
          )}
          {controlsVisible.draw && (
            <div className="flex items-center gap-2">
              <Text className="text-xs">Draw</Text>
              <Switch checked={drawingEnabled} onChange={setDrawingEnabled} />
            </div>
          )}
          {controlsVisible.reset && (
            <Button size="small" onClick={handleReset} disabled={!enabled} icon={<ReloadOutlined />}>Reset</Button>
          )}
          {controlsVisible.save && (
            <Tooltip title={selectedIndex == null ? 'Select a polygon to enable Save' : 'Save selected polygon'}>
              <Button size="small" type="primary" onClick={handleSaveSelected} disabled={!enabled || selectedIndex == null}>
                Save
              </Button>
            </Tooltip>
          )}
          {controlsVisible.fullscreen && (
            <Tooltip title={isExpanded ? 'Collapse' : 'Expand'}>
              <Button size="small" onClick={() => setIsExpanded(v => !v)} icon={isExpanded ? <ShrinkOutlined /> : <ArrowsAltOutlined />} />
            </Tooltip>
          )}
        </div>
      </div>

      {!isExpanded && (
        <div
          ref={containerRef}
          className="relative w-full overflow-hidden rounded-md bg-black"
          style={{ aspectRatio: '16 / 9' }}
        >
          {enabled ? (
            <>
              <VideoPlayer
                stream={stream}
                autoPlay={true}
                muted={true}
                controls={false}
                className="w-full h-full"
              />
              {/* Drawing overlay (canvas) */}
              <canvas
                ref={canvasRef}
                className="absolute inset-0"
                style={{ pointerEvents: enabled ? 'auto' : 'none', cursor: canDraw ? 'crosshair' : drawingEnabled ? 'default' : 'pointer' }}
                onClick={handleCanvasClick}
              />
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-gray-300">
                <div className="text-2xl mb-2">Viewer is OFF</div>
                <div className="text-sm opacity-80">Toggle ON to start live feed</div>
              </div>
            </div>
          )}
        </div>
      )}

      <Modal
        open={isExpanded}
        onCancel={() => setIsExpanded(false)}
        footer={null}
        width={'90vw'}
        style={{ top: 24 }}
        styles={{ body: { padding: 16 } }}
        destroyOnHidden
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <Text strong className="block">{title}</Text>
            <Text type="secondary" className="text-xs">{subtitle}</Text>
          </div>
          <div className="flex items-center gap-3">
            {controlsVisible.viewer && (
              <div className="flex items-center gap-2">
                <Text className="text-xs">Viewer</Text>
                <Switch checked={enabled} onChange={setEnabled} />
              </div>
            )}
            {controlsVisible.draw && (
              <div className="flex items-center gap-2">
                <Text className="text-xs">Draw</Text>
                <Switch checked={drawingEnabled} onChange={setDrawingEnabled} />
              </div>
            )}
            {controlsVisible.reset && (
              <Button size="small" onClick={handleReset} disabled={!enabled} icon={<ReloadOutlined />}>Reset</Button>
            )}
            {controlsVisible.save && (
              <Tooltip title={selectedIndex == null ? 'Select a polygon to enable Save' : 'Save selected polygon'}>
                <Button size="small" type="primary" onClick={handleSaveSelected} disabled={!enabled || selectedIndex == null}>
                  Save
                </Button>
              </Tooltip>
            )}
            {controlsVisible.fullscreen && (
              <Tooltip title={'Collapse'}>
                <Button size="small" onClick={() => setIsExpanded(false)} icon={<ShrinkOutlined />} />
              </Tooltip>
            )}
          </div>
        </div>
        <div
          ref={containerRef}
          className="relative w-full overflow-hidden rounded-md bg-black"
          style={{ aspectRatio: '16 / 9' }}
        >
          {enabled ? (
            <>
              <VideoPlayer
                stream={stream}
                autoPlay={true}
                muted={true}
                controls={false}
                className="w-full h-full"
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0"
                style={{ pointerEvents: enabled ? 'auto' : 'none', cursor: canDraw ? 'crosshair' : drawingEnabled ? 'default' : 'pointer' }}
                onClick={handleCanvasClick}
              />
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-gray-300">
                <div className="text-2xl mb-2">Viewer is OFF</div>
                <div className="text-sm opacity-80">Toggle ON to start live feed</div>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </Card>
  );
};

export default LiveFeedViewer;
