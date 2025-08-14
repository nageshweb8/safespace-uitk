'use strict';

var jsxRuntime = require('react/jsx-runtime');
var React = require('react');
var antd = require('antd');
var icons = require('@ant-design/icons');
var Hls = require('hls.js');
var clsx = require('clsx');
var tailwindMerge = require('tailwind-merge');
var hi2 = require('react-icons/hi2');
var fi = require('react-icons/fi');
var pi = require('react-icons/pi');

function useVideoPlayer(streams, initialAutoPlay = true, initialMuted = true, onStreamChange, onError) {
    const [activeStreamIndex, setActiveStreamIndex] = React.useState(0);
    const [isPlaying, setIsPlaying] = React.useState(initialAutoPlay);
    const [isMuted, setIsMuted] = React.useState(initialMuted);
    const [isFullscreen, setIsFullscreen] = React.useState(false);
    const [error, setErrorState] = React.useState(null);
    const [isLoading, setIsLoading] = React.useState(false);
    const togglePlayPause = React.useCallback(() => {
        setIsPlaying(prev => !prev);
    }, []);
    const toggleMute = React.useCallback(() => {
        setIsMuted(prev => !prev);
    }, []);
    const toggleFullscreen = React.useCallback(() => {
        setIsFullscreen(prev => !prev);
    }, []);
    const clearError = React.useCallback(() => {
        setErrorState(null);
    }, []);
    const setError = React.useCallback((error) => {
        setErrorState(error);
    }, []);
    const setLoading = React.useCallback((loading) => {
        setIsLoading(loading);
    }, []);
    const handleStreamChange = React.useCallback((streamIndex) => {
        if (streamIndex >= 0 && streamIndex < streams.length) {
            setActiveStreamIndex(streamIndex);
            setErrorState(null);
            onStreamChange?.(streams[streamIndex]);
        }
    }, [streams, onStreamChange]);
    const handleError = React.useCallback((error, stream) => {
        const errorMessage = error.message;
        setErrorState(errorMessage);
        onError?.(error, stream || streams[activeStreamIndex]);
    }, [streams, activeStreamIndex, onError]);
    const handleRetry = React.useCallback(() => {
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
    return React.useMemo(() => {
        if (streamCount === 1) {
            return {
                container: 'grid grid-cols-1 gap-4 h-full',
                mainVideo: 'w-full h-full',
                thumbnailContainer: 'hidden',
            };
        }
        else if (streamCount === 2) {
            return {
                container: 'grid grid-cols-2 gap-4 h-full',
                mainVideo: 'w-full h-full',
                thumbnailContainer: 'w-full h-full',
            };
        }
        else {
            return {
                container: 'grid grid-cols-4 gap-4 h-full',
                mainVideo: 'col-span-3 w-full h-full',
                thumbnailContainer: 'col-span-1 w-full h-full',
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
    return tailwindMerge.twMerge(clsx.clsx(inputs));
}

const VideoPlayer = ({ stream, autoPlay = true, muted = true, controls = false, className, onError, onLoadStart, onLoadEnd, showOverlay = false, }) => {
    const videoRef = React.useRef(null);
    const hlsRef = React.useRef(null);
    React.useEffect(() => {
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
    return (jsxRuntime.jsxs("div", { className: cn('relative w-full h-full', className), children: [jsxRuntime.jsx("video", { ref: videoRef, autoPlay: autoPlay, muted: muted, controls: controls, playsInline: true, className: "w-full h-full object-cover", onError: handleVideoError, onLoadStart: handleVideoLoadStart, onLoadedData: handleVideoLoadedData, onContextMenu: e => e.preventDefault() }), showOverlay && (jsxRuntime.jsx("div", { className: "absolute inset-0 bg-black/10 hover:bg-black/20 transition-colors" }))] }));
};

const VideoControls = ({ isPlaying, isMuted, onPlayPause, onMuteUnmute, onFullscreen, showControls = true, size = 'medium', }) => {
    if (!showControls)
        return null;
    const sizeClasses = {
        small: 'gap-0.5',
        medium: 'gap-1',
        large: 'gap-2',
    };
    const buttonSizeClasses = {
        small: 'text-xs p-0 min-w-0 w-4 h-4'};
    return (jsxRuntime.jsxs("div", { className: cn('absolute top-2 right-2 flex', sizeClasses[size]), children: [jsxRuntime.jsx(antd.Tooltip, { title: isPlaying ? 'Pause' : 'Play', children: jsxRuntime.jsx(antd.Button, { type: "text", size: size === 'small' ? 'small' : 'middle', icon: isPlaying ? jsxRuntime.jsx(icons.PauseOutlined, {}) : jsxRuntime.jsx(icons.PlayCircleOutlined, {}), onClick: e => {
                        e.stopPropagation();
                        onPlayPause();
                    }, className: cn('text-white hover:text-gray-300 hover:bg-black/20', size === 'small' && buttonSizeClasses.small) }) }), jsxRuntime.jsx(antd.Tooltip, { title: isMuted ? 'Unmute' : 'Mute', children: jsxRuntime.jsx(antd.Button, { type: "text", size: size === 'small' ? 'small' : 'middle', icon: isMuted ? jsxRuntime.jsx(icons.MutedOutlined, {}) : jsxRuntime.jsx(icons.SoundOutlined, {}), onClick: e => {
                        e.stopPropagation();
                        onMuteUnmute();
                    }, className: cn('text-white hover:text-gray-300 hover:bg-black/20', size === 'small' && buttonSizeClasses.small) }) }), jsxRuntime.jsx(antd.Tooltip, { title: "Expand", children: jsxRuntime.jsx(antd.Button, { type: "text", size: size === 'small' ? 'small' : 'middle', icon: jsxRuntime.jsx(icons.ArrowsAltOutlined, {}), onClick: e => {
                        e.stopPropagation();
                        onFullscreen();
                    }, className: cn('text-white hover:text-gray-300 hover:bg-black/20', size === 'small' && buttonSizeClasses.small) }) })] }));
};

const StreamInfo = ({ stream, showLiveIndicator = true, className, }) => {
    return (jsxRuntime.jsxs("div", { className: cn('absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded', className), children: [jsxRuntime.jsx("span", { children: stream.title }), stream.isLive && showLiveIndicator && (jsxRuntime.jsx("span", { className: "ml-2 px-1 bg-red-600 rounded text-[10px] live-indicator", children: "LIVE" })), stream.metadata?.resolution && (jsxRuntime.jsx("span", { className: "ml-2 text-[10px] opacity-75", children: stream.metadata.resolution }))] }));
};

const ProgressBar = ({ progress, className, size = 'medium', color = 'white', }) => {
    const sizeClasses = {
        small: 'h-0.5',
        medium: 'h-1',
        large: 'h-2',
    };
    const colorClasses = {
        white: 'bg-white',
        blue: 'bg-blue-500',
        red: 'bg-red-500',
    };
    const backgroundClasses = {
        white: 'bg-white/20',
        blue: 'bg-blue-200',
        red: 'bg-red-200',
    };
    return (jsxRuntime.jsx("div", { className: cn('absolute bottom-0 left-0 right-0 px-2 pb-1', className), children: jsxRuntime.jsx("div", { className: cn('w-full rounded', sizeClasses[size], backgroundClasses[color]), children: jsxRuntime.jsx("div", { className: cn('h-full rounded transition-all duration-300', colorClasses[color]), style: { width: `${Math.min(Math.max(progress, 0), 100)}%` } }) }) }));
};

const MainVideoPlayer = ({ stream, isPlaying, isMuted, error, showControls, streamCount, onPlayPause, onMuteUnmute, onFullscreen, onRetry, onError, className, }) => {
    return (jsxRuntime.jsx("div", { className: cn('relative w-full h-full min-h-[400px] overflow-hidden rounded-lg bg-black', className), style: { aspectRatio: '16/9' }, children: error ? (jsxRuntime.jsx("div", { className: "absolute inset-0 flex flex-col items-center justify-center text-white", children: jsxRuntime.jsxs("div", { className: "text-center", children: [jsxRuntime.jsx("div", { className: "text-lg mb-2", children: "\u26A0\uFE0F" }), jsxRuntime.jsx("div", { className: "text-white mb-4 max-w-xs text-center", children: error }), jsxRuntime.jsx(antd.Button, { type: "primary", icon: jsxRuntime.jsx(icons.ReloadOutlined, {}), onClick: onRetry, className: "bg-blue-600 hover:bg-blue-700", children: "Retry Connection" })] }) })) : (jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [jsxRuntime.jsx(VideoPlayer, { stream: stream, autoPlay: isPlaying, muted: isMuted, controls: false, onError: onError }, `${stream.id}-${Date.now()}`), jsxRuntime.jsx(StreamInfo, { stream: stream, showLiveIndicator: true }), jsxRuntime.jsx(VideoControls, { isPlaying: isPlaying, isMuted: isMuted, onPlayPause: onPlayPause, onMuteUnmute: onMuteUnmute, onFullscreen: onFullscreen, showControls: showControls && streamCount > 2, size: "medium" }), streamCount > 2 && (jsxRuntime.jsx(ProgressBar, { progress: 65, size: "medium", color: "white", className: "px-3 pb-2" }))] })) }));
};

const { Text: Text$2 } = antd.Typography;
const ThumbnailGrid = ({ streams, activeStreamIndex, onStreamSelect, onFullscreen, layout, maxVisible = 3, }) => {
    const streamCount = streams.length;
    if (streamCount === 2 && layout === 'horizontal') {
        // 50:50 layout for 2 videos
        const inactiveStream = streams[activeStreamIndex === 0 ? 1 : 0];
        const inactiveIndex = activeStreamIndex === 0 ? 1 : 0;
        return (jsxRuntime.jsx("div", { className: "w-full h-full", children: jsxRuntime.jsxs("div", { className: "relative w-full h-full overflow-hidden rounded-lg bg-black cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all", onClick: () => onStreamSelect(inactiveIndex), children: [jsxRuntime.jsx(VideoPlayer, { stream: inactiveStream, autoPlay: true, muted: true, controls: false, showOverlay: true, className: "hover:scale-105 transition-transform" }), jsxRuntime.jsx(StreamInfo, { stream: inactiveStream, showLiveIndicator: true }), jsxRuntime.jsx(VideoControls, { isPlaying: false, isMuted: true, onPlayPause: () => { }, onMuteUnmute: () => { }, onFullscreen: onFullscreen, showControls: true, size: "small" }), jsxRuntime.jsx(ProgressBar, { progress: 45 + inactiveIndex * 10, size: "small", color: "white" })] }) }));
    }
    if (streamCount >= 3 && layout === 'vertical') {
        // Thumbnail grid layout for 3+ videos (25% width area)
        const thumbnailStreams = streams
            .map((stream, index) => ({ stream, index }))
            .filter(({ index }) => index !== activeStreamIndex)
            .slice(0, maxVisible);
        return (jsxRuntime.jsx("div", { className: "w-full h-full", children: jsxRuntime.jsxs("div", { className: "flex flex-col gap-2 h-full", children: [thumbnailStreams.map(({ stream, index }) => (jsxRuntime.jsxs("div", { className: "relative overflow-hidden rounded-md bg-black cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all flex-1 min-h-0", onClick: () => onStreamSelect(index), children: [jsxRuntime.jsx(VideoPlayer, { stream: stream, autoPlay: true, muted: true, controls: false, showOverlay: true, className: "hover:scale-105 transition-transform" }), jsxRuntime.jsx(StreamInfo, { stream: stream, showLiveIndicator: true, className: "text-[10px] px-1 py-0.5" }), jsxRuntime.jsx(VideoControls, { isPlaying: false, isMuted: true, onPlayPause: () => { }, onMuteUnmute: () => { }, onFullscreen: onFullscreen, showControls: false, size: "small" }), jsxRuntime.jsx(ProgressBar, { progress: 30 + index * 10, size: "small", color: "white", className: "px-1 pb-0.5" })] }, stream.id))), streams.length > maxVisible + 1 && (jsxRuntime.jsx("div", { className: "text-center py-1", children: jsxRuntime.jsxs(Text$2, { className: "text-xs text-gray-500", children: ["+", streams.length - maxVisible - 1, " more"] }) }))] }) }));
    }
    return null;
};

const FullscreenModal = ({ isOpen, stream, isPlaying, isMuted, onClose, onError, }) => {
    return (jsxRuntime.jsx(antd.Modal, { open: isOpen, onCancel: onClose, footer: null, width: "90vw", centered: true, closable: false, bodyStyle: { padding: 0, height: '90vh' }, className: "fullscreen-modal", destroyOnClose: true, children: jsxRuntime.jsxs("div", { className: "relative h-full bg-black", children: [jsxRuntime.jsx(VideoPlayer, { stream: stream, autoPlay: isPlaying, muted: isMuted, controls: true, className: "h-full", onError: onError }, `modal-${stream.id}`), jsxRuntime.jsx(antd.Button, { type: "text", size: "large", icon: jsxRuntime.jsx(icons.ShrinkOutlined, {}), onClick: onClose, className: "absolute top-4 right-4 text-white hover:text-gray-300 z-10", title: "Close Fullscreen" }), jsxRuntime.jsxs("div", { className: "absolute top-4 left-4 bg-black/70 text-white px-4 py-2 rounded", children: [jsxRuntime.jsx("div", { className: "text-lg font-medium", children: stream.title }), stream.metadata && (jsxRuntime.jsxs("div", { className: "text-sm opacity-75", children: [stream.metadata.resolution, " \u2022 ", stream.metadata.fps, "fps", stream.metadata.bitrate && ` • ${stream.metadata.bitrate}`] }))] })] }) }));
};

const { Text: Text$1 } = antd.Typography;
const LiveFeedPlayer = ({ streams, className, autoPlay = true, muted = true, controls = true, showThumbnails = true, onStreamChange, onError, theme = 'light', title = 'Live Feed', subtitle = 'All pinned cameras will be displayed here', maxThumbnails = 3, enableFullscreen = true, enableKeyboardControls = true, }) => {
    const { activeStreamIndex, isPlaying, isMuted, isFullscreen, error, togglePlayPause, toggleMute, toggleFullscreen, handleStreamChange, handleError, handleRetry, } = useVideoPlayer(streams, autoPlay, muted, onStreamChange, onError);
    const layoutClasses = useStreamLayout(streams.length);
    const streamCount = streams.length;
    const activeStream = streams[activeStreamIndex];
    const themeClasses = {
        light: 'bg-white border-gray-200',
        dark: 'bg-gray-900 border-gray-700',
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
        handleStreamChange,
    ]);
    if (!streams.length) {
        return (jsxRuntime.jsx(antd.Card, { className: cn('w-full h-full', themeClasses[theme], className), children: jsxRuntime.jsx("div", { className: "flex items-center justify-center h-64", children: jsxRuntime.jsxs("div", { className: "text-center", children: [jsxRuntime.jsx("div", { className: "text-4xl mb-4", children: "\uD83D\uDCF9" }), jsxRuntime.jsx(Text$1, { type: "secondary", className: "text-lg", children: "No camera streams available" }), jsxRuntime.jsx("br", {}), jsxRuntime.jsx(Text$1, { type: "secondary", className: "text-sm", children: "Please add camera streams to view live feeds" })] }) }) }));
    }
    return (jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [jsxRuntime.jsx(antd.Card, { className: cn('w-full h-full', themeClasses[theme], className), bodyStyle: { padding: 16, height: '100%' }, children: jsxRuntime.jsxs("div", { className: "flex flex-col h-full", children: [jsxRuntime.jsx("div", { className: "mb-4 flex-shrink-0", children: jsxRuntime.jsxs("div", { className: "flex items-center justify-between", children: [jsxRuntime.jsxs("div", { children: [jsxRuntime.jsx(Text$1, { strong: true, className: "text-base block", children: title }), jsxRuntime.jsx(Text$1, { type: "secondary", className: "text-sm", children: subtitle })] }), enableKeyboardControls && (jsxRuntime.jsx("div", { className: "text-xs text-gray-400", children: jsxRuntime.jsx(Text$1, { type: "secondary", className: "text-xs", children: "Keyboard: Space (play/pause), M (mute), F (fullscreen), \u2190\u2192 (switch)" }) }))] }) }), jsxRuntime.jsxs("div", { className: layoutClasses.container, children: [jsxRuntime.jsx("div", { className: layoutClasses.mainVideo, children: jsxRuntime.jsx(MainVideoPlayer, { stream: activeStream, isPlaying: isPlaying, isMuted: isMuted, error: error, showControls: controls, streamCount: streamCount, onPlayPause: togglePlayPause, onMuteUnmute: toggleMute, onFullscreen: toggleFullscreen, onRetry: handleRetry, onError: handleError }) }), showThumbnails && streamCount > 1 && (jsxRuntime.jsx("div", { className: layoutClasses.thumbnailContainer, children: jsxRuntime.jsx(ThumbnailGrid, { streams: streams, activeStreamIndex: activeStreamIndex, onStreamSelect: handleStreamChange, onFullscreen: toggleFullscreen, layout: streamCount === 2 ? 'horizontal' : 'vertical', maxVisible: maxThumbnails }) }))] })] }) }), enableFullscreen && (jsxRuntime.jsx(FullscreenModal, { isOpen: isFullscreen, stream: activeStream, isPlaying: isPlaying, isMuted: isMuted, onClose: () => toggleFullscreen(), onError: handleError }))] }));
};

const { Text } = antd.Typography;
// Simple distance helper
function distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}
const LiveFeedViewer = ({ stream, className, title = 'Live Feed Viewer', subtitle = 'Draw polygons (lines only) on live video', defaultEnabled = true, enableMultiplePolygons = true, initialPolygons, onPolygonsChange, onPolygonDetails, showControls, }) => {
    const containerRef = React.useRef(null);
    const canvasRef = React.useRef(null);
    const [enabled, setEnabled] = React.useState(defaultEnabled);
    const [drawingEnabled, setDrawingEnabled] = React.useState(true);
    const [isFullscreen, setIsFullscreen] = React.useState(false);
    // Prefer explicit initialPolygons, otherwise use stream.polygons if provided
    // Normalize incoming polygons into the internal Array<Polygon> shape
    const initialFromStream = React.useMemo(() => {
        if (initialPolygons && initialPolygons.length)
            return initialPolygons.map(p => [...p]);
        const sp = stream?.polygons;
        if (!sp)
            return [];
        // If it's a single polygon (array of points)
        if (Array.isArray(sp) && sp.length && !Array.isArray(sp[0])) {
            const maybePoints = sp;
            if (maybePoints.length && typeof maybePoints[0] === 'object' && 'x' in maybePoints[0] && 'y' in maybePoints[0]) {
                return [maybePoints.map(p => ({ ...p }))];
            }
        }
        // If it's an array of polygons without metadata
        if (Array.isArray(sp) && sp.length && Array.isArray(sp[0])) {
            return sp.map(poly => poly.map(p => ({ ...p })));
        }
        // If it's StreamPolygon[]
        if (Array.isArray(sp)) {
            return sp.map(p => [...p.points]);
        }
        return [];
    }, [initialPolygons, stream?.polygons]);
    const [polygons, setPolygons] = React.useState(initialFromStream);
    const [currentPoints, setCurrentPoints] = React.useState([]);
    const [size, setSize] = React.useState({ width: 0, height: 0 });
    // If consumer updates stream.polygons and no explicit initialPolygons were provided,
    // keep local state in sync so polygons appear as per stream data.
    React.useEffect(() => {
        if (initialPolygons && initialPolygons.length)
            return; // explicit override
        const sp = stream?.polygons;
        if (!sp) {
            setPolygons([]);
            return;
        }
        // Single polygon
        if (Array.isArray(sp) && sp.length && !Array.isArray(sp[0])) {
            const maybePoints = sp;
            if (maybePoints.length && typeof maybePoints[0] === 'object') {
                setPolygons([maybePoints.map(p => ({ ...p }))]);
                return;
            }
        }
        // Polygon[]
        if (Array.isArray(sp) && sp.length && Array.isArray(sp[0])) {
            setPolygons(sp.map(poly => poly.map(p => ({ ...p }))));
            return;
        }
        // StreamPolygon[]
        if (Array.isArray(sp)) {
            setPolygons(sp.map(p => [...p.points]));
            return;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stream?.polygons]);
    const recalcSize = React.useCallback(() => {
        const container = containerRef.current;
        if (!container)
            return;
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
    React.useEffect(() => {
        recalcSize();
        const onResize = () => recalcSize();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [recalcSize]);
    // Redraw on changes
    React.useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        // clear
        ctx.clearRect(0, 0, size.width, size.height);
        const stroke = 'rgba(0,255,0,1)';
        const activeStroke = 'rgba(255,255,0,1)';
        // helper
        const px = (p) => ({ x: p.x * size.width, y: p.y * size.height });
        // Normalize base polygons (from props) to access optional color per index
        const basePolys = stream?.polygons;
        const baseList = Array.isArray(basePolys) && basePolys.length && !Array.isArray(basePolys[0])
            ? [{ points: basePolys }]
            : Array.isArray(basePolys) && Array.isArray(basePolys[0])
                ? basePolys.map(p => ({ points: p }))
                : basePolys || [];
        // completed polygons
        polygons.forEach((poly, idx) => {
            if (poly.length < 2)
                return;
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
    React.useEffect(() => {
        onPolygonsChange?.(polygons);
        // Emit detailed polygon data with optional stream metadata preserved
        const basePolys = stream?.polygons;
        const baseList = Array.isArray(basePolys) && basePolys.length && !Array.isArray(basePolys[0])
            ? [{ points: basePolys }]
            : Array.isArray(basePolys) && Array.isArray(basePolys[0])
                ? basePolys.map(p => ({ points: p }))
                : basePolys || [];
        const detailed = polygons.map((points, idx) => {
            const base = baseList[idx] || {};
            return {
                id: base.id ?? String(idx + 1),
                label: base.label,
                color: base.color,
                points,
            };
        });
        onPolygonDetails?.(detailed);
    }, [polygons, onPolygonsChange, onPolygonDetails, stream?.polygons]);
    // Pointer handling on canvas
    const handleCanvasClick = (e) => {
        if (!drawingEnabled || !enabled)
            return;
        const rect = e.target.getBoundingClientRect();
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
        setCurrentPoints((prev) => [...prev, point]);
    };
    const handleReset = () => {
        setPolygons([]);
        setCurrentPoints([]);
    };
    // Fullscreen controls
    const toggleFullscreen = async () => {
        const el = containerRef.current;
        if (!el)
            return;
        if (!document.fullscreenElement) {
            await el.requestFullscreen();
            setIsFullscreen(true);
        }
        else {
            await document.exitFullscreen();
            setIsFullscreen(false);
        }
    };
    React.useEffect(() => {
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
    return (jsxRuntime.jsxs(antd.Card, { className: cn('w-full h-full', className), bodyStyle: { padding: 16 }, children: [jsxRuntime.jsxs("div", { className: "flex items-center justify-between mb-3", children: [jsxRuntime.jsxs("div", { children: [jsxRuntime.jsx(Text, { strong: true, className: "block", children: title }), jsxRuntime.jsx(Text, { type: "secondary", className: "text-xs", children: subtitle })] }), jsxRuntime.jsxs("div", { className: "flex items-center gap-3", children: [controlsVisible.viewer && (jsxRuntime.jsxs("div", { className: "flex items-center gap-2", children: [jsxRuntime.jsx(Text, { className: "text-xs", children: "Viewer" }), jsxRuntime.jsx(antd.Switch, { checked: enabled, onChange: setEnabled })] })), controlsVisible.draw && (jsxRuntime.jsxs("div", { className: "flex items-center gap-2", children: [jsxRuntime.jsx(Text, { className: "text-xs", children: "Draw" }), jsxRuntime.jsx(antd.Switch, { checked: drawingEnabled, onChange: setDrawingEnabled })] })), controlsVisible.reset && (jsxRuntime.jsx(antd.Button, { size: "small", onClick: handleReset, disabled: !enabled, icon: jsxRuntime.jsx(icons.ReloadOutlined, {}), children: "Reset" })), controlsVisible.fullscreen && (jsxRuntime.jsx(antd.Tooltip, { title: isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen', children: jsxRuntime.jsx(antd.Button, { size: "small", onClick: toggleFullscreen, icon: isFullscreen ? jsxRuntime.jsx(icons.FullscreenExitOutlined, {}) : jsxRuntime.jsx(icons.FullscreenOutlined, {}) }) }))] })] }), jsxRuntime.jsx("div", { ref: containerRef, className: "relative w-full overflow-hidden rounded-md bg-black", style: { aspectRatio: '16 / 9' }, children: enabled ? (jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [jsxRuntime.jsx(VideoPlayer, { stream: stream, autoPlay: true, muted: true, controls: false, className: "w-full h-full" }), jsxRuntime.jsx("canvas", { ref: canvasRef, className: "absolute inset-0", style: { pointerEvents: canDraw ? 'auto' : 'none', cursor: canDraw ? 'crosshair' : 'default' }, onClick: handleCanvasClick })] })) : (jsxRuntime.jsx("div", { className: "absolute inset-0 flex items-center justify-center", children: jsxRuntime.jsxs("div", { className: "text-center text-gray-300", children: [jsxRuntime.jsx("div", { className: "text-2xl mb-2", children: "Viewer is OFF" }), jsxRuntime.jsx("div", { className: "text-sm opacity-80", children: "Toggle ON to start live feed" })] }) })) })] }));
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

const SafeSpaceThemeContext = React.createContext({
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
    return (jsxRuntime.jsx(SafeSpaceThemeContext.Provider, { value: { theme, variant }, children: jsxRuntime.jsx(antd.ConfigProvider, { theme: antdTheme, children: children }) }));
};
const useSafeSpaceTheme = () => {
    const context = React.useContext(SafeSpaceThemeContext);
    if (!context) {
        throw new Error('useSafeSpaceTheme must be used within a SafeSpaceThemeProvider');
    }
    return context;
};

/**
 * Individual Tree Node Component
 *
 * Renders a single node in the tree with expand/collapse functionality
 */
const TreeNodeComponent = ({ node, level, isSelected = false, onLeafClick, onNodeToggle, onPinToggle, onSelectionChange, path, searchTerm, highlightSearch = true, renderNode, showExpandIcons = true, selectable = false, forceExpand = false, maxPinnedItems = 4, currentPinnedCount = 0, alwaysShowPinIcons = false, }) => {
    const [isExpanded, setIsExpanded] = React.useState(node.isExpanded ?? false);
    const [isPinning, setIsPinning] = React.useState(false);
    // Sync with node's isExpanded prop changes
    React.useEffect(() => {
        setIsExpanded(node.isExpanded ?? false);
    }, [node.isExpanded]);
    // Handle force expand when searching
    React.useEffect(() => {
        if (forceExpand) {
            setIsExpanded(true);
        }
    }, [forceExpand]);
    const hasChildren = node.children && node.children.length > 0;
    const isLeaf = !hasChildren || node.type === 'camera';
    const currentPath = React.useMemo(() => [...path, node], [path, node]);
    const handleToggle = React.useCallback(() => {
        if (!hasChildren)
            return;
        const newExpanded = !isExpanded;
        setIsExpanded(newExpanded);
        onNodeToggle?.(node, newExpanded);
    }, [hasChildren, isExpanded, node, onNodeToggle]);
    const handleClick = React.useCallback(() => {
        if (isLeaf && onLeafClick) {
            onLeafClick(node, currentPath);
        }
        else if (hasChildren) {
            handleToggle();
        }
        if (selectable && onSelectionChange) {
            onSelectionChange(node.key, !isSelected);
        }
    }, [
        isLeaf,
        hasChildren,
        node,
        currentPath,
        onLeafClick,
        handleToggle,
        selectable,
        onSelectionChange,
        isSelected,
    ]);
    const handlePinToggle = React.useCallback(async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!onPinToggle)
            return;
        const newPinState = !node.isPinned;
        // Check pin limit when trying to pin a camera
        if (newPinState && currentPinnedCount >= maxPinnedItems) {
            alert(`Pin limit exceeded! You can only pin up to ${maxPinnedItems} cameras at a time. Please unpin a camera before pinning this one.`);
            return;
        }
        setIsPinning(true);
        try {
            await onPinToggle(node, newPinState);
        }
        catch (error) {
            console.error('Failed to toggle pin:', error);
            // You might want to show a toast notification here
        }
        finally {
            setIsPinning(false);
        }
    }, [node, onPinToggle, currentPinnedCount, maxPinnedItems]);
    const highlightText = React.useCallback((text, searchTerm) => {
        if (!searchTerm || !highlightSearch)
            return text;
        const regex = new RegExp(`(${searchTerm})`, 'gi');
        const parts = text.split(regex);
        return parts.map((part, index) => regex.test(part) ? (jsxRuntime.jsx("mark", { className: "bg-yellow-200 text-yellow-900 rounded px-1", children: part }, index)) : (part));
    }, [highlightSearch]);
    // Custom render function takes precedence
    if (renderNode) {
        return (jsxRuntime.jsx("div", { style: { marginLeft: `${level * 8}px` }, children: renderNode(node, level, isLeaf) }));
    }
    // Render leaf nodes (cameras)
    if (isLeaf) {
        return (jsxRuntime.jsxs("div", { className: "flex items-center py-1 text-sm text-gray-700 hover:text-blue-600 ml-2 group", style: { marginLeft: `${level * 8}px` }, children: [jsxRuntime.jsxs("div", { className: "flex items-center flex-grow cursor-pointer", onClick: handleClick, children: [node.icon || jsxRuntime.jsx(pi.PiSecurityCameraFill, { className: "mr-2", size: 14 }), jsxRuntime.jsx("span", { className: cn('flex-grow', isSelected && 'text-blue-700 font-medium'), children: highlightText(node.label, searchTerm) })] }), node.type === 'camera' && onPinToggle && (jsxRuntime.jsx("button", { onClick: handlePinToggle, disabled: isPinning ||
                        (!node.isPinned && currentPinnedCount >= maxPinnedItems), className: cn('ml-2 p-1 rounded transition-all duration-200', alwaysShowPinIcons ? 'opacity-100' : 'opacity-0 group-hover:opacity-100', node.isPinned
                        ? 'text-blue-600 hover:text-blue-800 hover:bg-blue-50'
                        : currentPinnedCount >= maxPinnedItems
                            ? 'text-red-400 cursor-not-allowed'
                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50', (isPinning ||
                        (!node.isPinned && currentPinnedCount >= maxPinnedItems)) &&
                        'opacity-50 cursor-not-allowed'), title: isPinning
                        ? node.isPinned
                            ? 'Unpinning camera...'
                            : 'Pinning camera...'
                        : !node.isPinned && currentPinnedCount >= maxPinnedItems
                            ? `Pin limit reached (${maxPinnedItems}/${maxPinnedItems}). Unpin a camera first.`
                            : node.isPinned
                                ? 'Unpin camera'
                                : `Pin camera (${currentPinnedCount}/${maxPinnedItems})`, children: isPinning ? (jsxRuntime.jsx("div", { className: "animate-spin w-3 h-3 border border-gray-400 border-t-transparent rounded-full" })) : node.isPinned ? (jsxRuntime.jsx(pi.PiPushPinFill, { size: 14 })) : (jsxRuntime.jsx(pi.PiPushPin, { size: 14 })) })), selectable && (jsxRuntime.jsx("div", { className: cn('w-4 h-4 ml-2 border rounded flex items-center justify-center', isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'), children: isSelected && (jsxRuntime.jsx("svg", { className: "w-3 h-3 text-white", fill: "currentColor", viewBox: "0 0 20 20", children: jsxRuntime.jsx("path", { fillRule: "evenodd", d: "M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z", clipRule: "evenodd" }) })) }))] }));
    }
    // Render parent nodes (sites/spaces)
    return (jsxRuntime.jsxs("div", { children: [jsxRuntime.jsxs("div", { className: "flex items-center cursor-pointer py-1 text-gray-800 font-medium hover:text-blue-600", onClick: handleClick, style: { marginLeft: `${level * 8}px` }, children: [hasChildren &&
                        showExpandIcons &&
                        (isExpanded ? (jsxRuntime.jsx(fi.FiChevronDown, { size: 14 })) : (jsxRuntime.jsx(fi.FiChevronRight, { size: 14 }))), jsxRuntime.jsx("span", { className: cn('ml-1 flex-grow', isSelected && 'text-blue-700 font-medium'), children: highlightText(node.label, searchTerm) }), selectable && (jsxRuntime.jsx("div", { className: cn('w-4 h-4 ml-2 border rounded flex items-center justify-center', isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'), children: isSelected && (jsxRuntime.jsx("svg", { className: "w-3 h-3 text-white", fill: "currentColor", viewBox: "0 0 20 20", children: jsxRuntime.jsx("path", { fillRule: "evenodd", d: "M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z", clipRule: "evenodd" }) })) }))] }), isExpanded && hasChildren && (jsxRuntime.jsx("div", { className: "ml-2", children: node.children.map(childNode => (jsxRuntime.jsx(TreeNodeComponent, { node: childNode, level: level + 1, isSelected: false, onLeafClick: onLeafClick, onNodeToggle: onNodeToggle, onPinToggle: onPinToggle, onSelectionChange: onSelectionChange, path: currentPath, searchTerm: searchTerm, highlightSearch: highlightSearch, renderNode: renderNode, showExpandIcons: showExpandIcons, selectable: selectable, forceExpand: forceExpand, maxPinnedItems: maxPinnedItems, currentPinnedCount: currentPinnedCount, alwaysShowPinIcons: alwaysShowPinIcons }, childNode.key))) }))] }));
};

/**
 * Tree Search Component
 *
 * Provides search functionality for the Tree component
 */
const TreeSearch = ({ value, onChange, placeholder = 'Search...', }) => {
    return (jsxRuntime.jsxs("div", { className: "mb-3 relative", children: [jsxRuntime.jsx("input", { type: "text", placeholder: placeholder, value: value, onChange: e => onChange(e.target.value), className: "w-full border border-gray-300 rounded-md py-1.5 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#43E4FF]" }), jsxRuntime.jsx(fi.FiSearch, { size: 18, className: "absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" })] }));
};

/**
 * SafeSpace Tree Component
 *
 * A reusable tree component with search functionality, icons, and customizable callbacks.
 * Designed for displaying hierarchical data like prison monitoring structures.
 *
 * @example
 * ```tsx
 * import { Tree } from '@safespace/uitk';
 *
 * const data = [
 *   {
 *     key: 'prisons-vms',
 *     label: 'Prisons-VMS',
 *     children: [
 *       {
 *         key: 'omaha-cc',
 *         label: 'Omaha Correctional Center',
 *         children: [
 *           { key: 'library-12', label: 'Library 12', children: [
 *             { key: 'cam123', label: 'Cam123', icon: <CameraIcon /> },
 *             { key: 'test444', label: 'Test 444', icon: <CameraIcon /> }
 *           ]}
 *         ]
 *       }
 *     ]
 *   }
 * ];
 *
 * <Tree
 *   data={data}
 *   title="Monitoring"
 *   titleIcon={<VideoCameraIcon />}
 *   searchable
 *   onLeafClick={(node, path) => console.log('Selected:', node, path)}
 * />
 * ```
 */
const Tree = ({ data, title, titleIcon, searchable = true, searchPlaceholder = 'Search...', onLeafClick, onNodeToggle, onPinToggle, maxPinnedItems = 4, className, style, showExpandIcons = true, alwaysShowPinIcons = false, renderNode, selectable = false, selectedKeys = [], onSelectionChange, highlightSearch = true, loading = false, emptyMessage = 'No data available', }) => {
    const [searchTerm, setSearchTerm] = React.useState('');
    const [internalSelectedKeys, setInternalSelectedKeys] = React.useState([]);
    // Initialize internal state only once when selectedKeys prop changes
    React.useEffect(() => {
        setInternalSelectedKeys(selectedKeys);
    }, []); // Remove selectedKeys dependency to prevent infinite re-renders
    // Count currently pinned cameras
    const countPinnedItems = React.useCallback((nodes) => {
        let count = 0;
        for (const node of nodes) {
            if (node.type === 'camera' && node.isPinned) {
                count++;
            }
            if (node.children) {
                count += countPinnedItems(node.children);
            }
        }
        return count;
    }, []);
    const currentPinnedCount = React.useMemo(() => countPinnedItems(data), [data, countPinnedItems]);
    // Filter tree data based on search term
    const filteredData = React.useMemo(() => {
        if (!searchTerm.trim())
            return data;
        const filterNodes = (nodes) => {
            return nodes.reduce((acc, node) => {
                const matchesSearch = node.label
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase());
                const filteredChildren = node.children
                    ? filterNodes(node.children)
                    : [];
                if (matchesSearch || filteredChildren.length > 0) {
                    acc.push({
                        ...node,
                        children: filteredChildren.length > 0 ? filteredChildren : node.children,
                        isExpanded: searchTerm.trim() ? true : node.isExpanded, // Auto-expand when searching
                    });
                }
                return acc;
            }, []);
        };
        return filterNodes(data);
    }, [data, searchTerm]);
    const handleSelectionChange = React.useCallback((nodeKey, selected) => {
        const newSelectedKeys = selected
            ? [...internalSelectedKeys, nodeKey]
            : internalSelectedKeys.filter(key => key !== nodeKey);
        setInternalSelectedKeys(newSelectedKeys);
        onSelectionChange?.(newSelectedKeys);
    }, [internalSelectedKeys, onSelectionChange]);
    const handleNodeToggle = React.useCallback((node, expanded) => {
        onNodeToggle?.(node, expanded);
    }, [onNodeToggle]);
    const handleLeafClick = React.useCallback((node, path) => {
        onLeafClick?.(node, path);
    }, [onLeafClick]);
    if (loading) {
        return (jsxRuntime.jsx("div", { className: cn('bg-white rounded-lg shadow-sm border border-gray-200', className), style: style, children: jsxRuntime.jsxs("div", { className: "p-4 animate-pulse", children: [jsxRuntime.jsx("div", { className: "h-4 bg-gray-200 rounded w-1/3 mb-4" }), jsxRuntime.jsxs("div", { className: "space-y-2", children: [jsxRuntime.jsx("div", { className: "h-3 bg-gray-200 rounded" }), jsxRuntime.jsx("div", { className: "h-3 bg-gray-200 rounded w-5/6" }), jsxRuntime.jsx("div", { className: "h-3 bg-gray-200 rounded w-4/6" })] })] }) }));
    }
    return (jsxRuntime.jsxs("div", { className: cn('bg-white min-w-[260px] h-full px-4 box-border border-r border-gray-300 text-sm text-gray-800', className), style: style, children: [title && (jsxRuntime.jsx("div", { className: "border-b border-gray-200 mb-2", children: jsxRuntime.jsxs("div", { className: "px-2 py-2 font-bold text-lg text-[#05162B] flex items-center gap-2", children: [titleIcon ? titleIcon : jsxRuntime.jsx(hi2.HiVideoCamera, { size: 22 }), title] }) })), searchable && (jsxRuntime.jsx(TreeSearch, { value: searchTerm, onChange: setSearchTerm, placeholder: searchPlaceholder })), jsxRuntime.jsx("div", { className: "overflow-y-auto max-h-[calc(100vh-140px)] mt-2", children: filteredData.length === 0 ? (jsxRuntime.jsx("div", { className: "text-gray-500 px-2 py-2 text-sm italic", children: searchTerm ? `No results found` : emptyMessage })) : (jsxRuntime.jsx("div", { children: filteredData.map(node => (jsxRuntime.jsx(TreeNodeComponent, { node: node, level: 0, isSelected: internalSelectedKeys.includes(node.key), onLeafClick: handleLeafClick, onNodeToggle: handleNodeToggle, onPinToggle: onPinToggle, onSelectionChange: handleSelectionChange, path: [], searchTerm: searchTerm, highlightSearch: highlightSearch, renderNode: renderNode, showExpandIcons: showExpandIcons, selectable: selectable, forceExpand: searchTerm.length > 0, maxPinnedItems: maxPinnedItems, currentPinnedCount: currentPinnedCount, alwaysShowPinIcons: alwaysShowPinIcons }, node.key))) })) })] }));
};

/**
 * Hook for managing tree component state
 *
 * Provides centralized state management for tree data, selection, expansion, and search
 *
 * @example
 * ```tsx
 * function MyTreeComponent() {
 *   const {
 *     filteredData,
 *     selectedKeys,
 *     searchTerm,
 *     setSearchTerm,
 *     toggleSelection,
 *     expandAll
 *   } = useTreeState({
 *     initialData: treeData,
 *     initialSelectedKeys: ['node1']
 *   });
 *
 *   return (
 *     <Tree
 *       data={filteredData}
 *       selectedKeys={selectedKeys}
 *       onSelectionChange={setSelectedKeys}
 *       // ... other props
 *     />
 *   );
 * }
 * ```
 */
const useTreeState = ({ initialData, initialSelectedKeys = [], initialExpandedKeys = [], }) => {
    const [data, setData] = React.useState(initialData);
    const [selectedKeys, setSelectedKeys] = React.useState(initialSelectedKeys);
    const [expandedKeys, setExpandedKeys] = React.useState(initialExpandedKeys);
    const [searchTerm, setSearchTerm] = React.useState('');
    // Helper function to extract all keys from tree
    const getAllKeys = React.useCallback((nodes) => {
        const keys = [];
        const traverse = (nodeList) => {
            nodeList.forEach(node => {
                keys.push(node.key);
                if (node.children) {
                    traverse(node.children);
                }
            });
        };
        traverse(nodes);
        return keys;
    }, []);
    // Helper function to get all leaf node keys
    const getAllLeafKeys = React.useCallback((nodes) => {
        const leafKeys = [];
        const traverse = (nodeList) => {
            nodeList.forEach(node => {
                if (!node.children || node.children.length === 0) {
                    leafKeys.push(node.key);
                }
                else {
                    traverse(node.children);
                }
            });
        };
        traverse(nodes);
        return leafKeys;
    }, []);
    // Filter tree data based on search term
    const filteredData = React.useMemo(() => {
        if (!searchTerm.trim())
            return data;
        const filterNodes = (nodes) => {
            return nodes.reduce((acc, node) => {
                const matchesSearch = node.label
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase());
                const filteredChildren = node.children
                    ? filterNodes(node.children)
                    : [];
                if (matchesSearch || filteredChildren.length > 0) {
                    acc.push({
                        ...node,
                        children: filteredChildren.length > 0 ? filteredChildren : node.children,
                        isExpanded: searchTerm.trim()
                            ? true
                            : expandedKeys.includes(node.key),
                    });
                }
                return acc;
            }, []);
        };
        return filterNodes(data);
    }, [data, searchTerm, expandedKeys]);
    // Toggle selection for a single key
    const toggleSelection = React.useCallback((key) => {
        setSelectedKeys(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
    }, []);
    // Toggle expansion for a single key
    const toggleExpansion = React.useCallback((key) => {
        setExpandedKeys(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
    }, []);
    // Expand all nodes
    const expandAll = React.useCallback(() => {
        const allKeys = getAllKeys(data);
        setExpandedKeys(allKeys);
    }, [data, getAllKeys]);
    // Collapse all nodes
    const collapseAll = React.useCallback(() => {
        setExpandedKeys([]);
    }, []);
    // Clear all selections
    const clearSelection = React.useCallback(() => {
        setSelectedKeys([]);
    }, []);
    // Select all leaf nodes
    const selectAll = React.useCallback(() => {
        const allLeafKeys = getAllLeafKeys(data);
        setSelectedKeys(allLeafKeys);
    }, [data, getAllLeafKeys]);
    // Update tree data
    const updateData = React.useCallback((newData) => {
        setData(newData);
        // Clear selections and expansions that may no longer be valid
        const newAllKeys = getAllKeys(newData);
        setSelectedKeys(prev => prev.filter(key => newAllKeys.includes(key)));
        setExpandedKeys(prev => prev.filter(key => newAllKeys.includes(key)));
    }, [getAllKeys]);
    return {
        data,
        selectedKeys,
        expandedKeys,
        searchTerm,
        filteredData,
        setSearchTerm,
        setSelectedKeys,
        setExpandedKeys,
        toggleSelection,
        toggleExpansion,
        expandAll,
        collapseAll,
        clearSelection,
        selectAll,
        updateData,
    };
};

// Main component exports
// Version
const version = '0.1.4';

Object.defineProperty(exports, "Button", {
  enumerable: true,
  get: function () { return antd.Button; }
});
Object.defineProperty(exports, "Card", {
  enumerable: true,
  get: function () { return antd.Card; }
});
Object.defineProperty(exports, "Modal", {
  enumerable: true,
  get: function () { return antd.Modal; }
});
Object.defineProperty(exports, "Progress", {
  enumerable: true,
  get: function () { return antd.Progress; }
});
Object.defineProperty(exports, "Tooltip", {
  enumerable: true,
  get: function () { return antd.Tooltip; }
});
Object.defineProperty(exports, "Typography", {
  enumerable: true,
  get: function () { return antd.Typography; }
});
exports.FullscreenModal = FullscreenModal;
exports.LiveFeedPlayer = LiveFeedPlayer;
exports.LiveFeedViewer = LiveFeedViewer;
exports.MainVideoPlayer = MainVideoPlayer;
exports.ProgressBar = ProgressBar;
exports.SafeSpaceThemeProvider = SafeSpaceThemeProvider;
exports.StreamInfo = StreamInfo;
exports.ThumbnailGrid = ThumbnailGrid;
exports.Tree = Tree;
exports.TreeNodeComponent = TreeNodeComponent;
exports.TreeSearch = TreeSearch;
exports.VideoControls = VideoControls;
exports.VideoPlayer = VideoPlayer;
exports.cn = cn;
exports.useSafeSpaceTheme = useSafeSpaceTheme;
exports.useStreamLayout = useStreamLayout;
exports.useTreeState = useTreeState;
exports.useVideoPlayer = useVideoPlayer;
exports.version = version;
//# sourceMappingURL=index.js.map
