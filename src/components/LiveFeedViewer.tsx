import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, Switch, Button, Tooltip, Typography } from 'antd';
import { FullscreenOutlined, FullscreenExitOutlined, ReloadOutlined } from '@ant-design/icons';
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
  // Controls which action buttons/toggles are visible
  showControls?: {
    draw?: boolean;
    viewer?: boolean;
    reset?: boolean;
    fullscreen?: boolean;
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
  showControls,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [enabled, setEnabled] = useState<boolean>(defaultEnabled);
  const [drawingEnabled, setDrawingEnabled] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
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

  // If consumer updates stream.polygons and no explicit initialPolygons were provided,
  // keep local state in sync so polygons appear as per stream data.
  useEffect(() => {
    if (initialPolygons && initialPolygons.length) return; // explicit override
    const sp = stream?.polygons as StreamPolygon[] | Polygon[] | Polygon | undefined;
    if (!sp) {
      setPolygons([]);
      return;
    }
    // Single polygon
    if (Array.isArray(sp) && sp.length && !Array.isArray((sp as any)[0])) {
      const maybePoints = sp as unknown as Polygon;
      if (maybePoints.length && typeof maybePoints[0] === 'object') {
        setPolygons([maybePoints.map(p => ({ ...p }))]);
        return;
      }
    }
    // Polygon[]
    if (Array.isArray(sp) && sp.length && Array.isArray((sp as any)[0])) {
      setPolygons((sp as Polygon[]).map(poly => poly.map(p => ({ ...p }))));
      return;
    }
    // StreamPolygon[]
    if (Array.isArray(sp)) {
      setPolygons((sp as StreamPolygon[]).map(p => [...p.points]));
      return;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream?.polygons]);

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
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
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
  }, [polygons, currentPoints, size.width, size.height]);

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
        id: base.id ?? String(idx + 1),
        label: base.label,
        color: base.color,
        points,
      } as StreamPolygon;
    });
    onPolygonDetails?.(detailed);
  }, [polygons, onPolygonsChange, onPolygonDetails, stream?.polygons]);

  // Pointer handling on canvas
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawingEnabled || !enabled) return;
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const pointPx = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const point = {
      x: size.width ? pointPx.x / size.width : 0,
      y: size.height ? pointPx.y / size.height : 0,
    };

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
        return;
      }
    }

  setCurrentPoints((prev: Array<NormalizedPoint>) => [...prev, point]);
  };

  const handleReset = () => {
    setPolygons([]);
    setCurrentPoints([]);
  };

  // Fullscreen controls
  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      await el.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const canDraw = enabled && drawingEnabled;
  const controlsVisible = {
    draw: showControls?.draw ?? true,
    viewer: showControls?.viewer ?? true,
    reset: showControls?.reset ?? true,
    fullscreen: showControls?.fullscreen ?? true,
  };

  return (
    <Card className={cn('w-full h-full', className)} bodyStyle={{ padding: 16 }}>
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
          {controlsVisible.fullscreen && (
            <Tooltip title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}>
              <Button size="small" onClick={toggleFullscreen} icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />} />
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
            {/* Drawing overlay (canvas) */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0"
              style={{ pointerEvents: canDraw ? 'auto' : 'none', cursor: canDraw ? 'crosshair' : 'default' }}
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
    </Card>
  );
};

export default LiveFeedViewer;
