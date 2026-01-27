import React, { useCallback, useMemo, useState } from 'react';
import { Spin } from 'antd';
import {
  GridLayoutPattern,
  LiveVideosWhepProps,
  WHEPCameraStream,
} from '../../types/video';
import { WHEPVideoTile } from './WHEPVideoTile';
import { cn } from '../../utils/cn';

const DEFAULT_HEIGHT = 'calc(100vh - 140px)';
const DEFAULT_TITLE = 'Live Videos';
const DEFAULT_LAYOUT: GridLayoutPattern = '2x2';
const ALL_LAYOUTS: GridLayoutPattern[] = ['1x1', '2x2', '3x3', '4x4', '5x5', '6x6'];

/** Grid layout definitions */
const GRID_CONFIGS: Record<GridLayoutPattern, { cols: number; max: number; label: string }> = {
  '1x1': { cols: 1, max: 1, label: '1 camera - Single view' },
  '2x2': { cols: 2, max: 4, label: '4 cameras - Quad view' },
  '3x3': { cols: 3, max: 9, label: '9 cameras - 3x3 grid' },
  '4x4': { cols: 4, max: 16, label: '16 cameras - 4x4 grid' },
  '5x5': { cols: 5, max: 25, label: '25 cameras - 5x5 grid' },
  '6x6': { cols: 6, max: 36, label: '36 cameras - Control room view' },
};

/**
 * LiveVideosWhep Component
 * 
 * Multi-camera WHEP video viewer with grid layouts for local intranet streaming.
 * Uses WebRTC WHEP (WebRTC-HTTP Egress Protocol) for streaming video from
 * local media servers like MediaMTX.
 * 
 * Features:
 * - Multiple grid layout patterns (1x1 to 6x6)
 * - WHEP streaming for local/intranet cameras
 * - Tile selection for "Open in Layout" functionality
 * - Per-tile fullscreen support
 * - Auto-reconnection with health monitoring
 * - Configurable WHEP settings (baseUrl, auth, timeouts)
 */
export const LiveVideosWhep: React.FC<LiveVideosWhepProps> = ({
  streams,
  whepConfig,
  gridLayout,
  defaultGridLayout = DEFAULT_LAYOUT,
  availableLayouts = ALL_LAYOUTS,
  loading = false,
  title = DEFAULT_TITLE,
  onLayoutChange,
  onTileClick,
  onStreamError,
  onSelectionChange,
  showLayoutSelector = true,
  showTileLabels = true,
  tileLabelPlacement = 'top',
  showTileControls = true,
  enableTileSelection = false,
  enableOpenInLayout = false,
  layoutViewerPath = '/layout-viewer',
  height = DEFAULT_HEIGHT,
  className,
  emptyState,
}) => {
  // Grid layout state (controlled or uncontrolled)
  const isControlled = gridLayout !== undefined;
  const [internalLayout, setInternalLayout] = useState<GridLayoutPattern>(defaultGridLayout);
  const activeLayout = isControlled ? gridLayout : internalLayout;

  // Selection state
  const [selectedCameras, setSelectedCameras] = useState<Set<string>>(new Set());

  // Resolve height
  const resolvedHeight = useMemo(() => {
    if (typeof height === 'number') return `${height}px`;
    return height || DEFAULT_HEIGHT;
  }, [height]);

  // Get config for current layout
  const layoutConfig = useMemo(() => {
    return GRID_CONFIGS[activeLayout] || GRID_CONFIGS[DEFAULT_LAYOUT];
  }, [activeLayout]);

  // Limit streams to max for current layout
  const displayedStreams = useMemo(() => {
    return streams.slice(0, layoutConfig.max);
  }, [streams, layoutConfig.max]);

  // Get grid classes for responsive layout
  const gridClasses = useMemo(() => {
    const gridMap: Record<GridLayoutPattern, string> = {
      '1x1': 'grid-cols-1',
      '2x2': 'grid-cols-1 md:grid-cols-2',
      '3x3': 'grid-cols-2 lg:grid-cols-3',
      '4x4': 'grid-cols-2 lg:grid-cols-4',
      '5x5': 'grid-cols-3 lg:grid-cols-5',
      '6x6': 'grid-cols-3 lg:grid-cols-6',
    };
    return gridMap[activeLayout] || 'grid-cols-2';
  }, [activeLayout]);

  // Handle layout change
  const handleLayoutChange = useCallback((layout: GridLayoutPattern) => {
    if (!isControlled) {
      setInternalLayout(layout);
    }
    onLayoutChange?.(layout);
  }, [isControlled, onLayoutChange]);

  // Handle tile selection toggle
  const handleToggleSelect = useCallback((streamId: string) => {
    setSelectedCameras(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(streamId)) {
        newSelected.delete(streamId);
      } else {
        newSelected.add(streamId);
      }
      
      // Notify parent of selection change
      if (onSelectionChange) {
        onSelectionChange(Array.from(newSelected));
      }
      
      return newSelected;
    });
  }, [onSelectionChange]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedCameras(new Set());
    if (onSelectionChange) {
      onSelectionChange([]);
    }
  }, [onSelectionChange]);

  // Handle tile click
  const handleTileClick = useCallback((streamId: string) => {
    const index = displayedStreams.findIndex(s => s.id === streamId);
    const stream = displayedStreams.find(s => s.id === streamId);
    if (stream && onTileClick) {
      onTileClick(stream, index);
    }
  }, [displayedStreams, onTileClick]);

  // Handle stream error
  const handleStreamError = useCallback((error: Error, streamId: string) => {
    const stream = displayedStreams.find(s => s.id === streamId);
    if (stream && onStreamError) {
      onStreamError(error, stream);
    }
  }, [displayedStreams, onStreamError]);

  // Build camera ID for WHEP URL
  const getCameraId = useCallback((stream: WHEPCameraStream): string => {
    return stream.cameraId || 
           stream.uniqueIdentifier || 
           stream.guid ||
           stream.originalData?.uniqueIdentifier ||
           stream.originalData?.guid ||
           stream.originalData?.key ||
           stream.id;
  }, []);

  // Open selected cameras in layout viewer
  const openInLayout = useCallback(() => {
    const camerasToOpen = selectedCameras.size > 0 
      ? Array.from(selectedCameras)
      : displayedStreams.map(s => getCameraId(s));

    if (camerasToOpen.length === 0) return;

    const cameraParams = camerasToOpen
      .slice(0, layoutConfig.max)
      .map((id, idx) => `camera${idx}=${encodeURIComponent(id)}`)
      .join('&');

    const url = `${layoutViewerPath}?layout=${activeLayout}&${cameraParams}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [selectedCameras, displayedStreams, getCameraId, layoutConfig.max, layoutViewerPath, activeLayout]);

  // Render loading state
  if (loading) {
    return (
      <div 
        className={cn('flex flex-col bg-white', className)}
        style={{ height: resolvedHeight }}
      >
        <div className="flex items-center justify-center flex-1">
          <Spin size="large" />
        </div>
      </div>
    );
  }

  // Render empty state
  if (displayedStreams.length === 0) {
    return (
      <div 
        className={cn('flex flex-col bg-white', className)}
        style={{ height: resolvedHeight }}
      >
        {emptyState ?? (
          <div className="flex items-center justify-center flex-1">
            <div className="text-center text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p className="text-lg font-medium">No cameras available</p>
              <p className="text-sm text-gray-400 mt-1">
                Add cameras to view them here
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      className={cn('flex flex-col bg-white', className)}
      style={{ height: resolvedHeight }}
    >
      {/* Header with Title and Controls */}
      {(showLayoutSelector || title) && (
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex justify-between items-center">
            {/* Title */}
            <div className="flex items-center gap-3">
              {title && (
                <span className="text-base font-semibold text-blue-600 border-b-2 border-blue-600 pb-1 px-1">
                  {title}
                </span>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              {/* Grid Pattern Selector */}
              {showLayoutSelector && (
                <div className="flex items-center gap-1 flex-wrap">
                  <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  <span className="text-xs font-medium text-gray-600 mr-1">Change pattern</span>
                  {availableLayouts.map((layout) => (
                    <button
                      key={layout}
                      onClick={() => handleLayoutChange(layout)}
                      className={cn(
                        'px-3 py-1.5 text-xs font-semibold rounded-md transition-colors',
                        activeLayout === layout
                          ? 'bg-gray-800 text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      )}
                      title={GRID_CONFIGS[layout].label}
                    >
                      {layout.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}

              {/* Open Layout Button */}
              {enableOpenInLayout && (
                <button
                  onClick={openInLayout}
                  disabled={displayedStreams.length === 0}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-md transition-colors shadow-sm',
                    displayedStreams.length > 0
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  )}
                  title={displayedStreams.length > 0 
                    ? `Open ${selectedCameras.size || displayedStreams.length} camera(s) in new window` 
                    : "No cameras to open"
                  }
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  <span className="text-xs font-semibold">
                    {selectedCameras.size > 0 ? `Open Layout (${selectedCameras.size})` : 'Open Layout'}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Video Grid */}
      <div className="flex-1 p-4 bg-gray-100 overflow-auto">
        <div className={cn('grid gap-2', gridClasses)}>
          {displayedStreams.map((stream, index) => (
            <div key={stream.id} className="aspect-video">
              <WHEPVideoTile
                stream={stream}
                index={index}
                whepConfig={whepConfig}
                showLabel={showTileLabels}
                labelPlacement={tileLabelPlacement}
                showControls={showTileControls}
                enableSelection={enableTileSelection}
                isSelected={selectedCameras.has(stream.id)}
                onToggleSelect={handleToggleSelect}
                onClick={onTileClick ? handleTileClick : undefined}
                onError={handleStreamError}
                className="w-full h-full"
              />
            </div>
          ))}
          
          {/* Empty slots */}
          {Array.from({ length: Math.max(0, layoutConfig.max - displayedStreams.length) }).map((_, index) => (
            <div key={`empty-${index}`} className="aspect-video">
              <WHEPVideoTile
                stream={undefined}
                index={displayedStreams.length + index}
                whepConfig={whepConfig}
                className="w-full h-full"
              />
            </div>
          ))}
        </div>
        
        {/* Selection Info Bar */}
        {enableTileSelection && selectedCameras.size > 0 && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-blue-600">
                {selectedCameras.size} camera{selectedCameras.size !== 1 ? 's' : ''} selected
              </span>
              <button
                onClick={clearSelection}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
              >
                Clear selection
              </button>
            </div>
            {enableOpenInLayout && (
              <button
                onClick={openInLayout}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-md hover:bg-blue-700 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open {selectedCameras.size} in Layout
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveVideosWhep;
