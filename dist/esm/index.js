import { jsxs, jsx, Fragment } from 'react/jsx-runtime';
import React, { useState, useCallback, useMemo, useRef, useEffect, createContext, useContext } from 'react';
import { Tooltip, Button, Typography, Modal, Card, Select, List, Space, Input, ColorPicker, Row, Col, ConfigProvider } from 'antd';
export { Button, Card, Modal, Progress, Tooltip, Typography } from 'antd';
import { PauseOutlined, PlayCircleOutlined, MutedOutlined, SoundOutlined, ArrowsAltOutlined, ReloadOutlined, ShrinkOutlined, EyeInvisibleOutlined, EyeOutlined, EditOutlined, CopyOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import Hls from 'hls.js';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Stage, Layer, Rect, Line, Circle } from 'react-konva';

function useVideoPlayer(streams, initialAutoPlay = true, initialMuted = true, onStreamChange, onError) {
    const [activeStreamIndex, setActiveStreamIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(initialAutoPlay);
    const [isMuted, setIsMuted] = useState(initialMuted);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [error, setErrorState] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const togglePlayPause = useCallback(() => {
        setIsPlaying(prev => !prev);
    }, []);
    const toggleMute = useCallback(() => {
        setIsMuted(prev => !prev);
    }, []);
    const toggleFullscreen = useCallback(() => {
        setIsFullscreen(prev => !prev);
    }, []);
    const clearError = useCallback(() => {
        setErrorState(null);
    }, []);
    const setError = useCallback((error) => {
        setErrorState(error);
    }, []);
    const setLoading = useCallback((loading) => {
        setIsLoading(loading);
    }, []);
    const handleStreamChange = useCallback((streamIndex) => {
        if (streamIndex >= 0 && streamIndex < streams.length) {
            setActiveStreamIndex(streamIndex);
            setErrorState(null);
            onStreamChange?.(streams[streamIndex]);
        }
    }, [streams, onStreamChange]);
    const handleError = useCallback((error, stream) => {
        const errorMessage = error.message;
        setErrorState(errorMessage);
        onError?.(error, stream || streams[activeStreamIndex]);
    }, [streams, activeStreamIndex, onError]);
    const handleRetry = useCallback(() => {
        setErrorState(null);
        setIsLoading(true);
        // Force re-render by updating the active stream index
        setActiveStreamIndex(prev => prev);
    }, []);
    return {
        // State
        activeStreamIndex,
        isPlaying,
        isMuted,
        isFullscreen,
        error,
        isLoading,
        // Actions
        setActiveStreamIndex,
        togglePlayPause,
        toggleMute,
        toggleFullscreen,
        clearError,
        setError,
        setLoading,
        handleStreamChange,
        handleError,
        handleRetry,
    };
}

function useStreamLayout(streamCount) {
    return useMemo(() => {
        if (streamCount === 1) {
            return {
                container: 'grid grid-cols-1 gap-4 h-full',
                mainVideo: 'w-full h-full',
                thumbnailContainer: 'hidden'
            };
        }
        else if (streamCount === 2) {
            return {
                container: 'grid grid-cols-2 gap-4 h-full',
                mainVideo: 'w-full h-full',
                thumbnailContainer: 'w-full h-full'
            };
        }
        else {
            return {
                container: 'grid grid-cols-4 gap-4 h-full',
                mainVideo: 'col-span-3 w-full h-full',
                thumbnailContainer: 'col-span-1 w-full h-full'
            };
        }
    }, [streamCount]);
}

/**
 * Utility function to combine Tailwind CSS classes with proper conflict resolution
 * @param inputs - Class values to combine
 * @returns Combined class string
 */
function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const VideoPlayer = ({ stream, autoPlay = true, muted = true, controls = false, className, onError, onLoadStart, onLoadEnd, showOverlay = false }) => {
    const videoRef = useRef(null);
    const hlsRef = useRef(null);
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !stream.url)
            return;
        onLoadStart?.();
        const cleanup = () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
        };
        cleanup();
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
            // Native HLS support (Safari)
            video.src = stream.url;
            onLoadEnd?.();
        }
        else if (Hls.isSupported()) {
            const hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
                backBufferLength: 90,
                maxBufferLength: 30,
                maxMaxBufferLength: 600,
                startLevel: -1,
                autoStartLoad: true,
                capLevelToPlayerSize: true,
            });
            hlsRef.current = hls;
            hls.loadSource(stream.url);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                onLoadEnd?.();
            });
            hls.on(Hls.Events.ERROR, (event, data) => {
                console.error('HLS Error:', data);
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            onError?.(new Error(`Network Error: ${data.details}`));
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            onError?.(new Error(`Media Error: ${data.details}`));
                            try {
                                hls.recoverMediaError();
                            }
                            catch (recoverError) {
                                onError?.(new Error(`Media Error Recovery Failed: ${recoverError}`));
                            }
                            break;
                        default:
                            onError?.(new Error(`Fatal Error: ${data.type} - ${data.details}`));
                            break;
                    }
                }
            });
        }
        else {
            onError?.(new Error('HLS not supported in this browser'));
        }
        return cleanup;
    }, [stream.url, onError, onLoadStart, onLoadEnd]);
    const handleVideoError = () => {
        onError?.(new Error('Video playback error'));
    };
    const handleVideoLoadStart = () => {
        onLoadStart?.();
    };
    const handleVideoLoadedData = () => {
        onLoadEnd?.();
    };
    return (jsxs("div", { className: cn('relative w-full h-full', className), children: [jsx("video", { ref: videoRef, autoPlay: autoPlay, muted: muted, controls: controls, playsInline: true, className: "w-full h-full object-cover", onError: handleVideoError, onLoadStart: handleVideoLoadStart, onLoadedData: handleVideoLoadedData, onContextMenu: (e) => e.preventDefault() }), showOverlay && (jsx("div", { className: "absolute inset-0 bg-black/10 hover:bg-black/20 transition-colors" }))] }));
};

const VideoControls = ({ isPlaying, isMuted, onPlayPause, onMuteUnmute, onFullscreen, showControls = true, size = 'medium' }) => {
    if (!showControls)
        return null;
    const sizeClasses = {
        small: 'gap-0.5',
        medium: 'gap-1',
        large: 'gap-2'
    };
    const buttonSizeClasses = {
        small: 'text-xs p-0 min-w-0 w-4 h-4'};
    return (jsxs("div", { className: cn('absolute top-2 right-2 flex', sizeClasses[size]), children: [jsx(Tooltip, { title: isPlaying ? 'Pause' : 'Play', children: jsx(Button, { type: "text", size: size === 'small' ? 'small' : 'middle', icon: isPlaying ? jsx(PauseOutlined, {}) : jsx(PlayCircleOutlined, {}), onClick: (e) => {
                        e.stopPropagation();
                        onPlayPause();
                    }, className: cn('text-white hover:text-gray-300 hover:bg-black/20', size === 'small' && buttonSizeClasses.small) }) }), jsx(Tooltip, { title: isMuted ? 'Unmute' : 'Mute', children: jsx(Button, { type: "text", size: size === 'small' ? 'small' : 'middle', icon: isMuted ? jsx(MutedOutlined, {}) : jsx(SoundOutlined, {}), onClick: (e) => {
                        e.stopPropagation();
                        onMuteUnmute();
                    }, className: cn('text-white hover:text-gray-300 hover:bg-black/20', size === 'small' && buttonSizeClasses.small) }) }), jsx(Tooltip, { title: "Expand", children: jsx(Button, { type: "text", size: size === 'small' ? 'small' : 'middle', icon: jsx(ArrowsAltOutlined, {}), onClick: (e) => {
                        e.stopPropagation();
                        onFullscreen();
                    }, className: cn('text-white hover:text-gray-300 hover:bg-black/20', size === 'small' && buttonSizeClasses.small) }) })] }));
};

const StreamInfo = ({ stream, showLiveIndicator = true, className }) => {
    return (jsxs("div", { className: cn('absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded', className), children: [jsx("span", { children: stream.title }), stream.isLive && showLiveIndicator && (jsx("span", { className: "ml-2 px-1 bg-red-600 rounded text-[10px] live-indicator", children: "LIVE" })), stream.metadata?.resolution && (jsx("span", { className: "ml-2 text-[10px] opacity-75", children: stream.metadata.resolution }))] }));
};

const ProgressBar = ({ progress, className, size = 'medium', color = 'white' }) => {
    const sizeClasses = {
        small: 'h-0.5',
        medium: 'h-1',
        large: 'h-2'
    };
    const colorClasses = {
        white: 'bg-white',
        blue: 'bg-blue-500',
        red: 'bg-red-500'
    };
    const backgroundClasses = {
        white: 'bg-white/20',
        blue: 'bg-blue-200',
        red: 'bg-red-200'
    };
    return (jsx("div", { className: cn('absolute bottom-0 left-0 right-0 px-2 pb-1', className), children: jsx("div", { className: cn('w-full rounded', sizeClasses[size], backgroundClasses[color]), children: jsx("div", { className: cn('h-full rounded transition-all duration-300', colorClasses[color]), style: { width: `${Math.min(Math.max(progress, 0), 100)}%` } }) }) }));
};

const MainVideoPlayer = ({ stream, isPlaying, isMuted, error, showControls, streamCount, onPlayPause, onMuteUnmute, onFullscreen, onRetry, onError, className }) => {
    return (jsx("div", { className: cn('relative w-full h-full min-h-[400px] overflow-hidden rounded-lg bg-black', className), style: { aspectRatio: '16/9' }, children: error ? (jsx("div", { className: "absolute inset-0 flex flex-col items-center justify-center text-white", children: jsxs("div", { className: "text-center", children: [jsx("div", { className: "text-lg mb-2", children: "\u26A0\uFE0F" }), jsx("div", { className: "text-white mb-4 max-w-xs text-center", children: error }), jsx(Button, { type: "primary", icon: jsx(ReloadOutlined, {}), onClick: onRetry, className: "bg-blue-600 hover:bg-blue-700", children: "Retry Connection" })] }) })) : (jsxs(Fragment, { children: [jsx(VideoPlayer, { stream: stream, autoPlay: isPlaying, muted: isMuted, controls: false, onError: onError }, `${stream.id}-${Date.now()}`), jsx(StreamInfo, { stream: stream, showLiveIndicator: true }), jsx(VideoControls, { isPlaying: isPlaying, isMuted: isMuted, onPlayPause: onPlayPause, onMuteUnmute: onMuteUnmute, onFullscreen: onFullscreen, showControls: showControls && streamCount > 2, size: "medium" }), streamCount > 2 && (jsx(ProgressBar, { progress: 65, size: "medium", color: "white", className: "px-3 pb-2" }))] })) }));
};

const { Text: Text$2 } = Typography;
const ThumbnailGrid = ({ streams, activeStreamIndex, onStreamSelect, onFullscreen, layout, maxVisible = 3 }) => {
    const streamCount = streams.length;
    if (streamCount === 2 && layout === 'horizontal') {
        // 50:50 layout for 2 videos
        const inactiveStream = streams[activeStreamIndex === 0 ? 1 : 0];
        const inactiveIndex = activeStreamIndex === 0 ? 1 : 0;
        return (jsx("div", { className: "w-full h-full", children: jsxs("div", { className: "relative w-full h-full overflow-hidden rounded-lg bg-black cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all", onClick: () => onStreamSelect(inactiveIndex), children: [jsx(VideoPlayer, { stream: inactiveStream, autoPlay: true, muted: true, controls: false, showOverlay: true, className: "hover:scale-105 transition-transform" }), jsx(StreamInfo, { stream: inactiveStream, showLiveIndicator: true }), jsx(VideoControls, { isPlaying: false, isMuted: true, onPlayPause: () => { }, onMuteUnmute: () => { }, onFullscreen: onFullscreen, showControls: true, size: "small" }), jsx(ProgressBar, { progress: 45 + (inactiveIndex * 10), size: "small", color: "white" })] }) }));
    }
    if (streamCount >= 3 && layout === 'vertical') {
        // Thumbnail grid layout for 3+ videos (25% width area)
        const thumbnailStreams = streams
            .map((stream, index) => ({ stream, index }))
            .filter(({ index }) => index !== activeStreamIndex)
            .slice(0, maxVisible);
        return (jsx("div", { className: "w-full h-full", children: jsxs("div", { className: "flex flex-col gap-2 h-full", children: [thumbnailStreams.map(({ stream, index }) => (jsxs("div", { className: "relative overflow-hidden rounded-md bg-black cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all flex-1 min-h-0", onClick: () => onStreamSelect(index), children: [jsx(VideoPlayer, { stream: stream, autoPlay: true, muted: true, controls: false, showOverlay: true, className: "hover:scale-105 transition-transform" }), jsx(StreamInfo, { stream: stream, showLiveIndicator: true, className: "text-[10px] px-1 py-0.5" }), jsx(VideoControls, { isPlaying: false, isMuted: true, onPlayPause: () => { }, onMuteUnmute: () => { }, onFullscreen: onFullscreen, showControls: false, size: "small" }), jsx(ProgressBar, { progress: 30 + (index * 10), size: "small", color: "white", className: "px-1 pb-0.5" })] }, stream.id))), streams.length > maxVisible + 1 && (jsx("div", { className: "text-center py-1", children: jsxs(Text$2, { className: "text-xs text-gray-500", children: ["+", streams.length - maxVisible - 1, " more"] }) }))] }) }));
    }
    return null;
};

const FullscreenModal = ({ isOpen, stream, isPlaying, isMuted, onClose, onError }) => {
    return (jsx(Modal, { open: isOpen, onCancel: onClose, footer: null, width: "90vw", centered: true, closable: false, bodyStyle: { padding: 0, height: '90vh' }, className: "fullscreen-modal", destroyOnClose: true, children: jsxs("div", { className: "relative h-full bg-black", children: [jsx(VideoPlayer, { stream: stream, autoPlay: isPlaying, muted: isMuted, controls: true, className: "h-full", onError: onError }, `modal-${stream.id}`), jsx(Button, { type: "text", size: "large", icon: jsx(ShrinkOutlined, {}), onClick: onClose, className: "absolute top-4 right-4 text-white hover:text-gray-300 z-10", title: "Close Fullscreen" }), jsxs("div", { className: "absolute top-4 left-4 bg-black/70 text-white px-4 py-2 rounded", children: [jsx("div", { className: "text-lg font-medium", children: stream.title }), stream.metadata && (jsxs("div", { className: "text-sm opacity-75", children: [stream.metadata.resolution, " \u2022 ", stream.metadata.fps, "fps", stream.metadata.bitrate && ` • ${stream.metadata.bitrate}`] }))] })] }) }));
};

const { Text: Text$1 } = Typography;
const LiveFeedPlayer = ({ streams, className, autoPlay = true, muted = true, controls = true, showThumbnails = true, onStreamChange, onError, theme = 'light', title = 'Live Feed', subtitle = 'All pinned cameras will be displayed here', maxThumbnails = 3, enableFullscreen = true, enableKeyboardControls = true }) => {
    const { activeStreamIndex, isPlaying, isMuted, isFullscreen, error, togglePlayPause, toggleMute, toggleFullscreen, handleStreamChange, handleError, handleRetry, } = useVideoPlayer(streams, autoPlay, muted, onStreamChange, onError);
    const layoutClasses = useStreamLayout(streams.length);
    const streamCount = streams.length;
    const activeStream = streams[activeStreamIndex];
    const themeClasses = {
        light: 'bg-white border-gray-200',
        dark: 'bg-gray-900 border-gray-700'
    };
    // Keyboard controls
    React.useEffect(() => {
        if (!enableKeyboardControls)
            return;
        const handleKeyPress = (event) => {
            switch (event.key) {
                case ' ':
                    event.preventDefault();
                    togglePlayPause();
                    break;
                case 'm':
                case 'M':
                    event.preventDefault();
                    toggleMute();
                    break;
                case 'f':
                case 'F':
                    event.preventDefault();
                    if (enableFullscreen) {
                        toggleFullscreen();
                    }
                    break;
                case 'ArrowRight':
                    event.preventDefault();
                    if (activeStreamIndex < streams.length - 1) {
                        handleStreamChange(activeStreamIndex + 1);
                    }
                    break;
                case 'ArrowLeft':
                    event.preventDefault();
                    if (activeStreamIndex > 0) {
                        handleStreamChange(activeStreamIndex - 1);
                    }
                    break;
            }
        };
        document.addEventListener('keydown', handleKeyPress);
        return () => document.removeEventListener('keydown', handleKeyPress);
    }, [
        enableKeyboardControls,
        togglePlayPause,
        toggleMute,
        toggleFullscreen,
        enableFullscreen,
        activeStreamIndex,
        streams.length,
        handleStreamChange
    ]);
    if (!streams.length) {
        return (jsx(Card, { className: cn('w-full h-full', themeClasses[theme], className), children: jsx("div", { className: "flex items-center justify-center h-64", children: jsxs("div", { className: "text-center", children: [jsx("div", { className: "text-4xl mb-4", children: "\uD83D\uDCF9" }), jsx(Text$1, { type: "secondary", className: "text-lg", children: "No camera streams available" }), jsx("br", {}), jsx(Text$1, { type: "secondary", className: "text-sm", children: "Please add camera streams to view live feeds" })] }) }) }));
    }
    return (jsxs(Fragment, { children: [jsx(Card, { className: cn('w-full h-full', themeClasses[theme], className), bodyStyle: { padding: 16, height: '100%' }, children: jsxs("div", { className: "flex flex-col h-full", children: [jsx("div", { className: "mb-4 flex-shrink-0", children: jsxs("div", { className: "flex items-center justify-between", children: [jsxs("div", { children: [jsx(Text$1, { strong: true, className: "text-base block", children: title }), jsx(Text$1, { type: "secondary", className: "text-sm", children: subtitle })] }), enableKeyboardControls && (jsx("div", { className: "text-xs text-gray-400", children: jsx(Text$1, { type: "secondary", className: "text-xs", children: "Keyboard: Space (play/pause), M (mute), F (fullscreen), \u2190\u2192 (switch)" }) }))] }) }), jsxs("div", { className: layoutClasses.container, children: [jsx("div", { className: layoutClasses.mainVideo, children: jsx(MainVideoPlayer, { stream: activeStream, isPlaying: isPlaying, isMuted: isMuted, error: error, showControls: controls, streamCount: streamCount, onPlayPause: togglePlayPause, onMuteUnmute: toggleMute, onFullscreen: toggleFullscreen, onRetry: handleRetry, onError: handleError }) }), showThumbnails && streamCount > 1 && (jsx("div", { className: layoutClasses.thumbnailContainer, children: jsx(ThumbnailGrid, { streams: streams, activeStreamIndex: activeStreamIndex, onStreamSelect: handleStreamChange, onFullscreen: toggleFullscreen, layout: streamCount === 2 ? 'horizontal' : 'vertical', maxVisible: maxThumbnails }) }))] })] }) }), enableFullscreen && (jsx(FullscreenModal, { isOpen: isFullscreen, stream: activeStream, isPlaying: isPlaying, isMuted: isMuted, onClose: () => toggleFullscreen(), onError: handleError }))] }));
};

// Zone colors for different types
const ZONE_COLORS = {
    default: '#6b7280' // gray
};
const PolygonEditor = ({ width, height, zones, onZonesChange, isDrawing = false, onDrawingChange, selectedZoneId = null, onZoneSelect, readonly = false, showGrid = false, gridSize = 20, snapToGrid = false, className }) => {
    const [currentPoints, setCurrentPoints] = useState([]);
    const [hoveredPointIndex, setHoveredPointIndex] = useState(null);
    const [draggedPointIndex, setDraggedPointIndex] = useState(null);
    const stageRef = useRef(null);
    // Snap point to grid if enabled
    const snapPoint = useCallback((point) => {
        if (!snapToGrid)
            return point;
        return {
            x: Math.round(point.x / gridSize) * gridSize,
            y: Math.round(point.y / gridSize) * gridSize
        };
    }, [snapToGrid, gridSize]);
    // Get relative position from stage
    const getRelativePointerPosition = useCallback(() => {
        const stage = stageRef.current;
        if (!stage)
            return null;
        const transform = stage.getAbsoluteTransform().copy();
        transform.invert();
        const pos = stage.getPointerPosition();
        if (!pos)
            return null;
        return transform.point(pos);
    }, []);
    // Handle stage click for drawing
    const handleStageClick = useCallback((e) => {
        if (readonly)
            return;
        // Deselect if clicking on empty space
        if (e.target === e.target.getStage()) {
            onZoneSelect?.(null);
        }
        if (!isDrawing)
            return;
        const pos = getRelativePointerPosition();
        if (!pos)
            return;
        const snappedPos = snapPoint(pos);
        // Check if clicking near the first point to close polygon
        if (currentPoints.length >= 3) {
            const firstPoint = currentPoints[0];
            const distance = Math.sqrt(Math.pow(snappedPos.x - firstPoint.x, 2) +
                Math.pow(snappedPos.y - firstPoint.y, 2));
            if (distance < 20) {
                // Close the polygon
                const newZone = {
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
    const handlePointDrag = useCallback((zoneId, pointIndex, newPos) => {
        if (readonly)
            return;
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
    const handleZoneClick = useCallback((zoneId) => {
        onZoneSelect?.(zoneId);
    }, [onZoneSelect]);
    // Handle keyboard events
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (readonly)
                return;
            if (e.key === 'Escape') {
                if (isDrawing) {
                    setCurrentPoints([]);
                    onDrawingChange?.(false);
                }
                else {
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
        if (!showGrid)
            return null;
        const lines = [];
        // Vertical lines
        for (let i = 0; i <= width; i += gridSize) {
            lines.push(jsx(Line, { points: [i, 0, i, height], stroke: "#e5e7eb", strokeWidth: 0.5, opacity: 0.5 }, `v-${i}`));
        }
        // Horizontal lines
        for (let i = 0; i <= height; i += gridSize) {
            lines.push(jsx(Line, { points: [0, i, width, i], stroke: "#e5e7eb", strokeWidth: 0.5, opacity: 0.5 }, `h-${i}`));
        }
        return lines;
    };
    // Render zone polygon
    const renderZone = (zone) => {
        const isSelected = zone.id === selectedZoneId;
        const flatPoints = zone.points.flatMap(p => [p.x, p.y]);
        return (jsxs(React.Fragment, { children: [jsx(Line, { points: flatPoints, closed: true, fill: zone.color, opacity: zone.opacity || 0.3, stroke: zone.color, strokeWidth: isSelected ? (zone.strokeWidth || 2) + 2 : (zone.strokeWidth || 2), onClick: () => handleZoneClick(zone.id), onTap: () => handleZoneClick(zone.id) }), isSelected && !readonly && zone.points.map((point, index) => (jsx(Circle, { x: point.x, y: point.y, radius: hoveredPointIndex === index ? 8 : 6, fill: zone.color, stroke: "#ffffff", strokeWidth: 2, draggable: true, onMouseEnter: () => setHoveredPointIndex(index), onMouseLeave: () => setHoveredPointIndex(null), onDragStart: () => setDraggedPointIndex(index), onDragEnd: () => setDraggedPointIndex(null), onDragMove: (e) => {
                        const newPos = { x: e.target.x(), y: e.target.y() };
                        handlePointDrag(zone.id, index, newPos);
                    } }, `${zone.id}-point-${index}`)))] }, zone.id));
    };
    // Render current drawing polygon
    const renderCurrentPolygon = () => {
        if (currentPoints.length === 0)
            return null;
        const flatPoints = currentPoints.flatMap(p => [p.x, p.y]);
        return (jsxs(React.Fragment, { children: [jsx(Line, { points: flatPoints, stroke: ZONE_COLORS.default, strokeWidth: 2, dash: [5, 5] }), currentPoints.map((point, index) => (jsx(Circle, { x: point.x, y: point.y, radius: 4, fill: ZONE_COLORS.default, stroke: "#ffffff", strokeWidth: 1 }, `current-${index}`))), currentPoints.length >= 3 && (jsx(Circle, { x: currentPoints[0].x, y: currentPoints[0].y, radius: 8, stroke: ZONE_COLORS.default, strokeWidth: 3, fill: "transparent" }))] }));
    };
    return (jsxs("div", { className: cn('relative', className), children: [jsx(Stage, { ref: stageRef, width: width, height: height, onClick: handleStageClick, onTap: handleStageClick, children: jsxs(Layer, { children: [jsx(Rect, { width: width, height: height, fill: "transparent" }), renderGrid(), zones.map(renderZone), renderCurrentPolygon()] }) }), isDrawing && (jsx("div", { className: "absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded", children: "Click to add points. Click first point or press Escape to finish." })), selectedZoneId && (jsxs("div", { className: "absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded", children: [zones.find(z => z.id === selectedZoneId)?.name, " selected (Delete to remove)"] }))] }));
};

const { Text } = Typography;
const { Option } = Select;
const ZONE_TYPES = [
    { value: 'restricted', label: 'Restricted Area', color: '#ef4444' },
    { value: 'monitoring', label: 'Monitoring Zone', color: '#3b82f6' },
    { value: 'alert', label: 'Alert Zone', color: '#f59e0b' },
    { value: 'safe', label: 'Safe Zone', color: '#10b981' }
];
const ZoneControls = ({ zones, selectedZoneId, onZoneSelect, onZoneAdd, onZoneDelete, onZoneUpdate, onZoneDuplicate, isDrawing, onDrawingToggle, readonly = false }) => {
    const [editingZone, setEditingZone] = useState(null);
    const [editForm, setEditForm] = useState({});
    const selectedZone = zones.find(zone => zone.id === selectedZoneId);
    const handleEditStart = (zone) => {
        setEditingZone(zone.id);
        setEditForm({
            name: zone.name,
            color: zone.color,
            metadata: { ...zone.metadata }
        });
    };
    const handleEditSave = () => {
        if (editingZone && editForm) {
            onZoneUpdate(editingZone, editForm);
            setEditingZone(null);
            setEditForm({});
        }
    };
    const handleEditCancel = () => {
        setEditingZone(null);
        setEditForm({});
    };
    const handleColorChange = (color) => {
        const hexColor = typeof color === 'string' ? color : color.toHexString();
        setEditForm(prev => ({ ...prev, color: hexColor }));
    };
    const handleVisibilityToggle = (zoneId, visible) => {
        onZoneUpdate(zoneId, { opacity: visible ? 0.3 : 0 });
    };
    return (jsx(Card, { title: "Zone Management", size: "small", className: "w-80", extra: !readonly && (jsx(Space, { children: jsx(Button, { type: isDrawing ? "primary" : "default", icon: jsx(PlusOutlined, {}), size: "small", onClick: onDrawingToggle, disabled: readonly, children: isDrawing ? 'Cancel' : 'Add Zone' }) })), children: jsxs("div", { className: "space-y-4", children: [jsx(List, { size: "small", dataSource: zones, renderItem: (zone) => (jsx(List.Item, { className: `cursor-pointer rounded p-2 transition-colors ${selectedZoneId === zone.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'}`, onClick: () => onZoneSelect(zone.id), actions: !readonly ? [
                            jsx(Button, { type: "text", size: "small", icon: zone.opacity === 0 ? jsx(EyeInvisibleOutlined, {}) : jsx(EyeOutlined, {}), onClick: (e) => {
                                    e.stopPropagation();
                                    handleVisibilityToggle(zone.id, zone.opacity === 0);
                                } }, "visibility"),
                            jsx(Button, { type: "text", size: "small", icon: jsx(EditOutlined, {}), onClick: (e) => {
                                    e.stopPropagation();
                                    handleEditStart(zone);
                                } }, "edit"),
                            onZoneDuplicate && (jsx(Button, { type: "text", size: "small", icon: jsx(CopyOutlined, {}), onClick: (e) => {
                                    e.stopPropagation();
                                    onZoneDuplicate(zone.id);
                                } }, "duplicate")),
                            jsx(Button, { type: "text", size: "small", danger: true, icon: jsx(DeleteOutlined, {}), onClick: (e) => {
                                    e.stopPropagation();
                                    onZoneDelete(zone.id);
                                } }, "delete")
                        ].filter(Boolean) : [], children: jsx(List.Item.Meta, { title: jsxs(Space, { children: [jsx("div", { className: "w-3 h-3 rounded-full border", style: { backgroundColor: zone.color } }), jsx(Text, { children: zone.name })] }), description: jsxs(Text, { type: "secondary", className: "text-xs", children: [zone.metadata?.type || 'monitoring', " \u2022 ", zone.points.length, " points"] }) }) })), locale: { emptyText: 'No zones created' } }), selectedZone && (jsx(Card, { size: "small", title: "Zone Details", children: editingZone === selectedZone.id ? (jsxs("div", { className: "space-y-3", children: [jsxs("div", { children: [jsx(Text, { className: "text-xs text-gray-500", children: "Name" }), jsx(Input, { size: "small", value: editForm.name, onChange: (e) => setEditForm(prev => ({ ...prev, name: e.target.value })), placeholder: "Zone name" })] }), jsxs("div", { children: [jsx(Text, { className: "text-xs text-gray-500", children: "Type" }), jsx(Select, { size: "small", className: "w-full", value: editForm.metadata?.type, onChange: (value) => setEditForm(prev => ({
                                            ...prev,
                                            metadata: { ...prev.metadata, type: value }
                                        })), children: ZONE_TYPES.map(type => (jsx(Option, { value: type.value, children: jsxs(Space, { children: [jsx("div", { className: "w-3 h-3 rounded-full", style: { backgroundColor: type.color } }), type.label] }) }, type.value))) })] }), jsxs("div", { children: [jsx(Text, { className: "text-xs text-gray-500", children: "Color" }), jsx(ColorPicker, { size: "small", value: editForm.color, onChange: handleColorChange, showText: true })] }), jsxs("div", { children: [jsx(Text, { className: "text-xs text-gray-500", children: "Description" }), jsx(Input.TextArea, { size: "small", rows: 2, value: editForm.metadata?.description, onChange: (e) => setEditForm(prev => ({
                                            ...prev,
                                            metadata: { ...prev.metadata, description: e.target.value }
                                        })), placeholder: "Zone description" })] }), jsxs(Space, { children: [jsx(Button, { size: "small", type: "primary", onClick: handleEditSave, children: "Save" }), jsx(Button, { size: "small", onClick: handleEditCancel, children: "Cancel" })] })] })) : (jsxs("div", { className: "space-y-2", children: [jsxs(Row, { children: [jsx(Col, { span: 8, children: jsx(Text, { className: "text-xs text-gray-500", children: "Name:" }) }), jsx(Col, { span: 16, children: jsx(Text, { className: "text-xs", children: selectedZone.name }) })] }), jsxs(Row, { children: [jsx(Col, { span: 8, children: jsx(Text, { className: "text-xs text-gray-500", children: "Type:" }) }), jsx(Col, { span: 16, children: jsxs(Space, { children: [jsx("div", { className: "w-3 h-3 rounded-full", style: { backgroundColor: selectedZone.color } }), jsx(Text, { className: "text-xs", children: ZONE_TYPES.find(t => t.value === selectedZone.metadata?.type)?.label || 'Monitoring Zone' })] }) })] }), jsxs(Row, { children: [jsx(Col, { span: 8, children: jsx(Text, { className: "text-xs text-gray-500", children: "Points:" }) }), jsx(Col, { span: 16, children: jsx(Text, { className: "text-xs", children: selectedZone.points.length }) })] }), selectedZone.metadata?.description && (jsxs(Row, { children: [jsx(Col, { span: 8, children: jsx(Text, { className: "text-xs text-gray-500", children: "Description:" }) }), jsx(Col, { span: 16, children: jsx(Text, { className: "text-xs", children: selectedZone.metadata.description }) })] }))] })) })), jsx(Card, { size: "small", title: "Instructions", children: jsxs("div", { className: "text-xs text-gray-600 space-y-1", children: [jsx("div", { children: "\u2022 Click \"Add Zone\" to start drawing" }), jsx("div", { children: "\u2022 Click to add points, click first point to close" }), jsx("div", { children: "\u2022 Click zone to select, drag points to modify" }), jsx("div", { children: "\u2022 Press Delete to remove selected zone" }), jsx("div", { children: "\u2022 Press Escape to cancel drawing" })] }) })] }) }));
};

const VideoPolygonOverlay = ({ videoElement, zones: initialZones = [], onZonesChange, width, height, readonly = false, showControls = true, className }) => {
    const [zones, setZones] = useState(initialZones);
    const [isDrawing, setIsDrawing] = useState(false);
    const [selectedZoneId, setSelectedZoneId] = useState(null);
    const containerRef = useRef(null);
    // Update local zones when prop changes
    useEffect(() => {
        setZones(initialZones);
    }, [initialZones]);
    // Handle zones change
    const handleZonesChange = useCallback((newZones) => {
        setZones(newZones);
        onZonesChange?.(newZones);
    }, [onZonesChange]);
    // Handle zone add
    const handleZoneAdd = useCallback(() => {
        setIsDrawing(true);
        setSelectedZoneId(null);
    }, []);
    // Handle zone delete
    const handleZoneDelete = useCallback((zoneId) => {
        const newZones = zones.filter(zone => zone.id !== zoneId);
        handleZonesChange(newZones);
        if (selectedZoneId === zoneId) {
            setSelectedZoneId(null);
        }
    }, [zones, selectedZoneId, handleZonesChange]);
    // Handle zone update
    const handleZoneUpdate = useCallback((zoneId, updates) => {
        const newZones = zones.map(zone => zone.id === zoneId
            ? { ...zone, ...updates, metadata: { ...zone.metadata, ...updates.metadata } }
            : zone);
        handleZonesChange(newZones);
    }, [zones, handleZonesChange]);
    // Handle zone duplicate
    const handleZoneDuplicate = useCallback((zoneId) => {
        const zoneToClone = zones.find(zone => zone.id === zoneId);
        if (!zoneToClone)
            return;
        const clonedZone = {
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
    return (jsxs("div", { className: cn('relative flex', className), ref: containerRef, children: [jsx("div", { className: "flex-1 relative", children: jsx(PolygonEditor, { width: width, height: height, zones: zones, onZonesChange: handleZonesChange, isDrawing: isDrawing, onDrawingChange: setIsDrawing, selectedZoneId: selectedZoneId, onZoneSelect: setSelectedZoneId, readonly: readonly, showGrid: !videoElement, gridSize: 20, snapToGrid: false, className: "border border-gray-300 rounded-lg overflow-hidden" }) }), showControls && (jsx("div", { className: "ml-4 flex-shrink-0", children: jsx(ZoneControls, { zones: zones, selectedZoneId: selectedZoneId, onZoneSelect: setSelectedZoneId, onZoneAdd: handleZoneAdd, onZoneDelete: handleZoneDelete, onZoneUpdate: handleZoneUpdate, onZoneDuplicate: handleZoneDuplicate, isDrawing: isDrawing, onDrawingToggle: handleDrawingToggle, readonly: readonly }) }))] }));
};

const defaultTheme = {
    colors: {
        primary: {
            50: '#f0f9ff',
            100: '#e0f2fe',
            200: '#bae6fd',
            300: '#7dd3fc',
            400: '#38bdf8',
            500: '#0ea5e9',
            600: '#0284c7',
            700: '#0369a1',
            800: '#075985',
            900: '#0c4a6e',
        },
        secondary: {
            50: '#f8fafc',
            100: '#f1f5f9',
            200: '#e2e8f0',
            300: '#cbd5e1',
            400: '#94a3b8',
            500: '#64748b',
            600: '#475569',
            700: '#334155',
            800: '#1e293b',
            900: '#0f172a',
        },
        gray: {
            50: '#f9fafb',
            100: '#f3f4f6',
            200: '#e5e7eb',
            300: '#d1d5db',
            400: '#9ca3af',
            500: '#6b7280',
            600: '#4b5563',
            700: '#374151',
            800: '#1f2937',
            900: '#111827',
        },
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',
    },
    spacing: {
        xs: '0.5rem',
        sm: '0.75rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
        '2xl': '3rem',
        '3xl': '4rem',
    },
    borderRadius: {
        none: '0',
        sm: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
        full: '9999px',
    },
    typography: {
        fontFamily: {
            sans: ['Inter', 'system-ui', 'sans-serif'],
            mono: ['Monaco', 'Consolas', 'monospace'],
        },
        fontSize: {
            xs: ['0.75rem', '1rem'],
            sm: ['0.875rem', '1.25rem'],
            base: ['1rem', '1.5rem'],
            lg: ['1.125rem', '1.75rem'],
            xl: ['1.25rem', '1.75rem'],
            '2xl': ['1.5rem', '2rem'],
            '3xl': ['1.875rem', '2.25rem'],
        },
    },
    shadows: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    },
};
// Theme variants for different SafeSpace applications
const themeVariants = {
    prison: {
        ...defaultTheme,
        colors: {
            ...defaultTheme.colors,
            primary: {
                50: '#fef2f2',
                100: '#fee2e2',
                200: '#fecaca',
                300: '#fca5a5',
                400: '#f87171',
                500: '#ef4444',
                600: '#dc2626',
                700: '#b91c1c',
                800: '#991b1b',
                900: '#7f1d1d',
            },
        },
    },
    school: {
        ...defaultTheme,
        colors: {
            ...defaultTheme.colors,
            primary: {
                50: '#f0fdf4',
                100: '#dcfce7',
                200: '#bbf7d0',
                300: '#86efac',
                400: '#4ade80',
                500: '#22c55e',
                600: '#16a34a',
                700: '#15803d',
                800: '#166534',
                900: '#14532d',
            },
        },
    },
    mall: {
        ...defaultTheme,
        colors: {
            ...defaultTheme.colors,
            primary: {
                50: '#fefce8',
                100: '#fef9c3',
                200: '#fef08a',
                300: '#fde047',
                400: '#facc15',
                500: '#eab308',
                600: '#ca8a04',
                700: '#a16207',
                800: '#854d0e',
                900: '#713f12',
            },
        },
    },
    snl: {
        ...defaultTheme,
        colors: {
            ...defaultTheme.colors,
            primary: {
                50: '#faf5ff',
                100: '#f3e8ff',
                200: '#e9d5ff',
                300: '#d8b4fe',
                400: '#c084fc',
                500: '#a855f7',
                600: '#9333ea',
                700: '#7c3aed',
                800: '#6b21a8',
                900: '#581c87',
            },
        },
    },
};

const SafeSpaceThemeContext = createContext({
    theme: defaultTheme,
    variant: 'default',
});
const SafeSpaceThemeProvider = ({ children, variant = 'default', customTheme, }) => {
    const baseTheme = variant === 'default' ? defaultTheme : themeVariants[variant];
    const theme = customTheme ? { ...baseTheme, ...customTheme } : baseTheme;
    // Configure Ant Design theme
    const antdTheme = {
        token: {
            colorPrimary: theme.colors.primary[500],
            colorSuccess: theme.colors.success,
            colorWarning: theme.colors.warning,
            colorError: theme.colors.error,
            colorInfo: theme.colors.info,
            borderRadius: parseInt(theme.borderRadius.md),
            fontFamily: theme.typography.fontFamily.sans.join(', '),
        },
        components: {
            Card: {
                borderRadius: parseInt(theme.borderRadius.lg),
            },
            Button: {
                borderRadius: parseInt(theme.borderRadius.md),
            },
            Modal: {
                borderRadius: parseInt(theme.borderRadius.lg),
            },
        },
    };
    return (jsx(SafeSpaceThemeContext.Provider, { value: { theme, variant }, children: jsx(ConfigProvider, { theme: antdTheme, children: children }) }));
};
const useSafeSpaceTheme = () => {
    const context = useContext(SafeSpaceThemeContext);
    if (!context) {
        throw new Error('useSafeSpaceTheme must be used within a SafeSpaceThemeProvider');
    }
    return context;
};

// Main component exports
// Version
const version = '0.1.4';

export { FullscreenModal, LiveFeedPlayer, MainVideoPlayer, PolygonEditor, ProgressBar, SafeSpaceThemeProvider, StreamInfo, ThumbnailGrid, VideoControls, VideoPlayer, VideoPolygonOverlay, ZoneControls, cn, useSafeSpaceTheme, useStreamLayout, useVideoPlayer, version };
//# sourceMappingURL=index.js.map
