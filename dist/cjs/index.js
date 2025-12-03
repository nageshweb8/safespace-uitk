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
var reactMediaRecorder = require('react-media-recorder');

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

const VideoPlayer = ({ stream, autoPlay = true, muted = true, controls = false, loop = false, className, onError, onLoadStart, onLoadEnd, showOverlay = false, objectFit = 'cover', exposeVideoRef, }) => {
    const videoRef = React.useRef(null);
    const hlsRef = React.useRef(null);
    const loopTimeoutRef = React.useRef(null);
    React.useEffect(() => {
        const video = videoRef.current;
        if (!video || !stream.url)
            return;
        onLoadStart?.();
        // Cleanup helper (will be populated differently depending on chosen transport)
        let cleanup = () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
        };
        // Heuristic to decide if this stream should use WebRTC.
        // Prefer explicit opt-in via stream.metadata.protocol === 'webrtc' or a special scheme.
        const isWebrtcExplicit = stream?.metadata?.protocol === 'webrtc';
        const isWebrtcScheme = typeof stream.url === 'string' && stream.url.startsWith('webrtc:');
        const isWebrtcQuery = typeof stream.url === 'string' && stream.url.includes('webrtc=true');
        // Heuristic: many camera endpoints expose a simple '/cam' path — treat as WebRTC if it doesn't look like HLS (.m3u8)
        const isCamLike = typeof stream.url === 'string' && /\/cam\d*\/?(\?|$)/i.test(stream.url) && !/\.m3u8(\?|$)/i.test(stream.url);
        const useWebrtc = isWebrtcExplicit || isWebrtcScheme || isWebrtcQuery || isCamLike;
        if (useWebrtc && typeof window !== 'undefined' && 'RTCPeerConnection' in window) {
            // Basic WebRTC client flow:
            // 1) create RTCPeerConnection
            // 2) createOffer and setLocalDescription
            // 3) POST offer.sdp to the stream.url and expect an SDP answer (plain text or JSON { sdp })
            // 4) setRemoteDescription(answer)
            // Note: servers differ in signaling. This implementation tries common variants and falls back
            // to treating the URL as a direct video src if signaling fails.
            const pc = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
            });
            let aborted = false;
            const onTrack = (ev) => {
                const ms = ev.streams && ev.streams[0] ? ev.streams[0] : ev.streams[0];
                if (ms) {
                    video.srcObject = ms;
                    onLoadEnd?.();
                }
            };
            pc.addEventListener('track', onTrack);
            pc.addEventListener('iceconnectionstatechange', () => {
                const state = pc.iceConnectionState;
                if (state === 'failed' || state === 'disconnected') {
                    onError?.(new Error(`WebRTC connection state: ${state}`));
                }
            });
            // For some servers it's necessary to create a recvonly transceiver to get media
            try {
                pc.addTransceiver('video', { direction: 'recvonly' });
            }
            catch (e) {
                // ignore if not supported
            }
            (async () => {
                try {
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    // Try signaling endpoints. Some servers expect raw SDP POST, others expect JSON or respond with JSON.
                    let signalUrl = stream.url;
                    if (!signalUrl.endsWith("/whep") && !signalUrl.endsWith("/whip")) {
                        signalUrl = signalUrl.replace(/\/?$/, "/whep"); // default to WHEP for playback
                    }
                    const headersCandidates = [
                        { 'Content-Type': 'application/sdp' },
                        { 'Content-Type': 'application/json' },
                    ];
                    let answered = false;
                    for (const headers of headersCandidates) {
                        if (aborted)
                            break;
                        try {
                            const body = headers['Content-Type'] === 'application/json'
                                ? JSON.stringify({ sdp: offer.sdp, type: offer.type })
                                : offer.sdp;
                            const res = await fetch(signalUrl, { method: 'POST', body, headers });
                            if (!res.ok)
                                continue;
                            const ct = res.headers.get('content-type') || '';
                            let remoteSdp;
                            if (ct.includes('application/json')) {
                                const data = await res.json();
                                remoteSdp = data.sdp || data.answer || data.payload?.sdp;
                            }
                            else {
                                remoteSdp = await res.text();
                            }
                            if (remoteSdp) {
                                await pc.setRemoteDescription({ type: 'answer', sdp: remoteSdp });
                                answered = true;
                                break;
                            }
                        }
                        catch (err) {
                            // try next header candidate
                        }
                    }
                    if (!answered) {
                        throw new Error('WebRTC signaling failed (no valid answer)');
                    }
                }
                catch (err) {
                    console.error('WebRTC error', err);
                    onError?.(err instanceof Error ? err : new Error(String(err)));
                    // Fallback: try to use the URL as a normal video src (may work if server provides mjpeg/HLS)
                    try {
                        video.src = stream.url;
                        onLoadEnd?.();
                    }
                    catch (e) {
                        // Ignore - fallback video src assignment can fail safely
                    }
                }
            })();
            cleanup = () => {
                aborted = true;
                try {
                    video.srcObject = null;
                }
                catch (e) {
                    // Ignore - srcObject cleanup can fail safely
                }
                try {
                    pc.removeEventListener('track', onTrack);
                    pc.close();
                }
                catch (e) {
                    // Ignore - peer connection cleanup can fail safely
                }
                if (hlsRef.current) {
                    hlsRef.current.destroy();
                    hlsRef.current = null;
                }
            };
            return cleanup;
        }
        // HLS flow (unchanged)
        cleanup();
        // Helper function to initialize/reinitialize HLS
        const initializeHls = () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
            if (video.canPlayType('application/vnd.apple.mpegurl')) {
                // Native HLS support (Safari)
                video.src = stream.url;
                onLoadEnd?.();
            }
            else if (Hls.isSupported()) {
                const hls = new Hls({
                    enableWorker: true,
                    lowLatencyMode: true,
                    liveSyncDurationCount: 3,
                    liveMaxLatencyDurationCount: 10,
                    liveDurationInfinity: false, // Set to false for VOD/recorded content
                    backBufferLength: 30, // Reduced to avoid excessive caching
                    maxBufferLength: 30,
                    maxMaxBufferLength: 120, // Reduced to prevent memory issues
                    startLevel: -1,
                    autoStartLoad: true,
                    capLevelToPlayerSize: true,
                    // Retry configuration to avoid flooding requests
                    manifestLoadingMaxRetry: 4,
                    manifestLoadingRetryDelay: 2000,
                    manifestLoadingMaxRetryTimeout: 30000,
                    levelLoadingMaxRetry: 4,
                    levelLoadingRetryDelay: 2000,
                    levelLoadingMaxRetryTimeout: 30000,
                    fragLoadingMaxRetry: 4,
                    fragLoadingRetryDelay: 2000,
                    fragLoadingMaxRetryTimeout: 30000,
                    // XHR setup to add proper headers and avoid ORB blocking
                    xhrSetup: (xhr, url) => {
                        // Add cache-busting for looped content to avoid ORB issues
                        xhr.withCredentials = false;
                        // Set proper Accept header for media segments
                        if (url.includes('.ts') || url.includes('.m4s')) {
                            xhr.setRequestHeader('Accept', 'video/*,application/octet-stream,*/*');
                        }
                    },
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
                                // Check if it's an ORB-related error
                                if (data.details === 'fragLoadError' || data.details === 'levelLoadError') {
                                    console.warn('HLS Network Error (possible ORB) - reinitializing:', data.details);
                                    // Reinitialize HLS after a delay to avoid rapid retries
                                    if (loopTimeoutRef.current) {
                                        clearTimeout(loopTimeoutRef.current);
                                    }
                                    loopTimeoutRef.current = setTimeout(() => {
                                        initializeHls();
                                    }, 1000);
                                }
                                else {
                                    console.warn('HLS Network Error - attempting recovery:', data.details);
                                    hls.startLoad();
                                }
                                break;
                            case Hls.ErrorTypes.MEDIA_ERROR:
                                console.warn('HLS Media Error - attempting recovery:', data.details);
                                hls.recoverMediaError();
                                break;
                            default:
                                console.error('HLS Fatal Error:', data.type, data.details);
                                onError?.(new Error(`Fatal Error: ${data.type} - ${data.details}`));
                                break;
                        }
                    }
                });
            }
            else {
                onError?.(new Error('HLS not supported in this browser'));
            }
        };
        // Initialize HLS
        initializeHls();
        // Handle loop for HLS content - reinitialize instead of native loop to avoid ORB
        const handleEnded = () => {
            if (loop && hlsRef.current) {
                console.log('Video ended, reinitializing HLS for loop');
                // Small delay before reinitializing to avoid request flooding
                if (loopTimeoutRef.current) {
                    clearTimeout(loopTimeoutRef.current);
                }
                loopTimeoutRef.current = setTimeout(() => {
                    initializeHls();
                    if (videoRef.current) {
                        videoRef.current.play().catch(() => { });
                    }
                }, 100);
            }
        };
        video.addEventListener('ended', handleEnded);
        return () => {
            video.removeEventListener('ended', handleEnded);
            if (loopTimeoutRef.current) {
                clearTimeout(loopTimeoutRef.current);
                loopTimeoutRef.current = null;
            }
            cleanup();
        };
    }, [stream.url, stream, onError, onLoadStart, onLoadEnd, loop]);
    React.useEffect(() => {
        exposeVideoRef?.(videoRef.current);
        return () => {
            exposeVideoRef?.(null);
        };
    }, [exposeVideoRef]);
    const handleVideoError = () => {
        onError?.(new Error('Video playback error'));
    };
    const handleVideoLoadStart = () => {
        onLoadStart?.();
    };
    const handleVideoLoadedData = () => {
        onLoadEnd?.();
    };
    return (jsxRuntime.jsxs("div", { className: cn('relative w-full h-full', className), children: [jsxRuntime.jsx("video", { ref: videoRef, autoPlay: autoPlay, muted: muted, controls: controls, playsInline: true, className: cn('w-full h-full object-fill'
                // objectFit === 'contain' && 'object-contain bg-black',
                // objectFit === 'fill' && 'object-fill',
                // objectFit === 'none' && 'object-none',
                // objectFit === 'cover' && 'object-cover'
                ), onError: handleVideoError, onLoadStart: handleVideoLoadStart, onLoadedData: handleVideoLoadedData, onContextMenu: e => e.preventDefault() }), showOverlay && (jsxRuntime.jsx("div", { className: "absolute inset-0 bg-black/10 hover:bg-black/20 transition-colors" }))] }));
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
const ThumbnailItem = React.memo(({ stream, index, onStreamSelect, onFullscreen, showControls = false, }) => {
    return (jsxRuntime.jsxs("div", { className: "relative overflow-hidden rounded-md bg-black cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all flex-1 min-h-0", onClick: () => onStreamSelect(index), children: [jsxRuntime.jsx(VideoPlayer, { stream: stream, autoPlay: true, muted: true, controls: false, showOverlay: true, className: "hover:scale-105 transition-transform" }), jsxRuntime.jsx(StreamInfo, { stream: stream, showLiveIndicator: true, className: "text-[10px] px-1 py-0.5" }), jsxRuntime.jsx(VideoControls, { isPlaying: false, isMuted: true, onPlayPause: () => { }, onMuteUnmute: () => { }, onFullscreen: onFullscreen || (() => { }), showControls: showControls, size: "small" }), jsxRuntime.jsx(ProgressBar, { progress: 30 + index * 10, size: "small", color: "white", className: "px-1 pb-0.5" })] }));
}, (prevProps, nextProps) => {
    // Only re-render if the stream itself changes (by id or url)
    return (prevProps.stream.id === nextProps.stream.id &&
        prevProps.stream.url === nextProps.stream.url &&
        prevProps.index === nextProps.index);
});
ThumbnailItem.displayName = 'ThumbnailItem';
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
        // Memoize the thumbnail streams to prevent recalculating on every render
        const thumbnailStreams = streams
            .map((stream, index) => ({ stream, index }))
            .filter(({ index }) => index !== activeStreamIndex)
            .slice(0, maxVisible);
        return (jsxRuntime.jsx("div", { className: "w-full h-full", children: jsxRuntime.jsxs("div", { className: "flex flex-col gap-2 h-full", children: [thumbnailStreams.map(({ stream, index }) => (jsxRuntime.jsx(ThumbnailItem, { stream: stream, index: index, onStreamSelect: onStreamSelect, onFullscreen: onFullscreen, showControls: false }, stream.id))), streams.length > maxVisible + 1 && (jsxRuntime.jsx("div", { className: "text-center py-1", children: jsxRuntime.jsxs(Text$2, { className: "text-xs text-gray-500", children: ["+", streams.length - maxVisible - 1, " more"] }) }))] }) }));
    }
    return null;
};

const FullscreenModal = ({ isOpen, stream, isPlaying, isMuted, onClose, onError, }) => {
    return (jsxRuntime.jsx(antd.Modal, { open: isOpen, onCancel: onClose, footer: null, width: "90vw", centered: true, closable: false, bodyStyle: { padding: 0, height: '90vh' }, className: "fullscreen-modal", destroyOnClose: true, children: jsxRuntime.jsxs("div", { className: "relative h-full bg-black", children: [jsxRuntime.jsx(VideoPlayer, { stream: stream, autoPlay: isPlaying, muted: isMuted, controls: true, className: "h-full", onError: onError }, `modal-${stream.id}`), jsxRuntime.jsx(antd.Button, { type: "text", size: "large", icon: jsxRuntime.jsx(icons.ShrinkOutlined, {}), onClick: onClose, className: "absolute top-4 right-4 text-white hover:text-gray-300 z-10", title: "Close Fullscreen" }), jsxRuntime.jsxs("div", { className: "absolute top-4 left-4 bg-black/70 text-white px-4 py-2 rounded", children: [jsxRuntime.jsx("div", { className: "text-lg font-medium", children: stream.title }), stream.metadata?.resolution && stream.metadata?.fps && (jsxRuntime.jsxs("div", { className: "text-sm opacity-75", children: [stream.metadata.resolution, " \u2022 ", stream.metadata.fps, "fps", stream.metadata.bitrate && ` • ${stream.metadata.bitrate}`] }))] })] }) }));
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
const LiveFeedViewer = ({ stream, className, title = 'Live Feed Viewer', subtitle = 'Draw polygons (lines only) on live video', defaultEnabled = true, defaultDrawEnabled = false, enableMultiplePolygons = true, initialPolygons, onPolygonsChange, onPolygonDetails, onSaveSelectedPolygon, anomalyCatalog, 
// onAnomalyChange,
selectedPolygonAnomalyIds, onSelectionChange, onReset, showControls, }) => {
    const containerRef = React.useRef(null);
    const canvasRef = React.useRef(null);
    const [enabled, setEnabled] = React.useState(defaultEnabled);
    const [drawingEnabled, setDrawingEnabled] = React.useState(defaultDrawEnabled);
    const [isExpanded, setIsExpanded] = React.useState(false);
    // Track whether the user has locally edited polygons so we don't overwrite from props
    const userDirtyRef = React.useRef(false);
    const [polygons, setPolygons] = React.useState([]);
    const [currentPoints, setCurrentPoints] = React.useState([]);
    const [size, setSize] = React.useState({ width: 0, height: 0 });
    const [selectedIndex, setSelectedIndex] = React.useState(null);
    // Track anomalies by polygon index
    const [polygonAnomalies, setPolygonAnomalies] = React.useState({});
    // Emit selection change to parent with details
    const emitSelectedChange = React.useCallback((idx) => {
        if (!onSelectionChange)
            return;
        if (idx == null || idx < 0 || idx >= polygons.length) {
            onSelectionChange(null, null);
            return;
        }
        // Build details based on current state and base metadata
        const basePolys = stream?.polygons;
        const baseList = Array.isArray(basePolys) && basePolys.length && !Array.isArray(basePolys[0])
            ? [{ points: basePolys }]
            : Array.isArray(basePolys) && Array.isArray(basePolys[0])
                ? basePolys.map(p => ({ points: p }))
                : basePolys || [];
        const base = baseList[idx] || {};
        const detailed = {
            id: base.id ?? '0',
            label: base.label,
            color: base.color,
            points: polygons[idx],
            anomalyIds: polygonAnomalies[idx] ?? base.anomalyIds,
        };
        onSelectionChange(idx, detailed);
    }, [onSelectionChange, polygons, polygonAnomalies, stream?.polygons]);
    // Deep compare helper for polygons
    // const deepEqualPolys = useCallback((a: Array<Polygon>, b: Array<Polygon>) => {
    //   if (a === b) return true;
    //   if (!a || !b || a.length !== b.length) return false;
    //   for (let i = 0; i < a.length; i++) {
    //     const pa = a[i];
    //     const pb = b[i];
    //     if (!pa || !pb || pa.length !== pb.length) return false;
    //     for (let j = 0; j < pa.length; j++) {
    //       const p1 = pa[j];
    //       const p2 = pb[j];
    //       if (!p1 || !p2 || p1.x !== p2.x || p1.y !== p2.y) return false;
    //     }
    //   }
    //   return true;
    // }, []);
    // Sync from props on first mount or when stream id changes, otherwise don't overwrite user edits
    React.useEffect(() => {
        // If initialPolygons is explicitly provided, use it
        if (initialPolygons !== undefined) {
            setPolygons(initialPolygons.map(poly => poly.map(p => ({ ...p }))));
            setCurrentPoints([]);
            setSelectedIndex(null);
            setPolygonAnomalies({});
            return;
        }
        // Otherwise use stream.polygons
        const sp = stream?.polygons;
        if (!sp || !Array.isArray(sp)) {
            setPolygons([]);
            setCurrentPoints([]);
            setSelectedIndex(null);
            setPolygonAnomalies({});
            return;
        }
        // Extract points from StreamPolygon[]
        const normalizedPolygons = sp.map(poly => [...poly.points]);
        const anomalies = {};
        sp.forEach((poly, i) => {
            if (poly?.anomalyIds?.length) {
                anomalies[i] = [...poly.anomalyIds];
            }
        });
        setPolygons(normalizedPolygons);
        setCurrentPoints([]);
        setSelectedIndex(null);
        setPolygonAnomalies(anomalies);
    }, [stream?.polygons, stream?.id, initialPolygons]);
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
    // Recalc after expanding when DOM is ready
    React.useEffect(() => {
        const t = setTimeout(() => recalcSize(), 0);
        return () => clearTimeout(t);
    }, [isExpanded, recalcSize]);
    // Redraw on changes
    React.useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        // Don't draw if size is not set yet
        if (size.width <= 0 || size.height <= 0)
            return;
        // clear
        ctx.clearRect(0, 0, size.width, size.height);
        const stroke = 'rgba(0,255,0,1)';
        const activeStroke = 'rgba(255,255,0,1)';
        const selectedStroke = 'rgba(0,214,255,1)';
        const selectedFill = 'rgba(0,214,255,0.12)';
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
            // Highlight selected polygon differently
            if (selectedIndex === idx) {
                ctx.fillStyle = selectedFill;
                ctx.fill();
                ctx.strokeStyle = selectedStroke;
                ctx.lineWidth = 3;
            }
            else {
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
            }
            ctx.stroke();
            // Draw anomaly labels (top-right of polygon bbox) if there are anomalyIds
            const label = anomalyLabelForIndex(idx);
            if (label) {
                // compute top-right of polygon bounding box
                let minY = Infinity, maxX = -Infinity;
                for (const p of poly) {
                    const x = p.x * size.width;
                    const y = p.y * size.height;
                    if (y < minY)
                        minY = y;
                    if (x > maxX)
                        maxX = x;
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
    }, [polygons, currentPoints, size, selectedIndex, stream?.polygons, anomalyCatalog]);
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
                id: base.id ?? '0',
                label: base.label,
                color: base.color,
                points,
                anomalyIds: base.anomalyIds ?? polygonAnomalies[idx],
            };
        });
        onPolygonDetails?.(detailed);
    }, [polygons, polygonAnomalies, onPolygonsChange, onPolygonDetails]);
    // Pointer handling on canvas
    // Point-in-polygon helper (ray casting) using normalized coordinates
    const isPointInPolygon = React.useCallback((pt, poly) => {
        let inside = false;
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            const xi = poly[i].x, yi = poly[i].y;
            const xj = poly[j].x, yj = poly[j].y;
            const intersect = yi > pt.y !== yj > pt.y && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi + 0.0000001) + xi;
            if (intersect)
                inside = !inside;
        }
        return inside;
    }, []);
    const handleCanvasClick = (e) => {
        if (!enabled)
            return;
        const rect = e.target.getBoundingClientRect();
        const pointPx = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        const point = {
            x: size.width ? pointPx.x / size.width : 0,
            y: size.height ? pointPx.y / size.height : 0,
        };
        // Selection mode when drawing is disabled
        if (!drawingEnabled) {
            let found = null;
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
        // Drawing mode - only allow when drawing is enabled
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
        setCurrentPoints((prev) => [...prev, point]);
    };
    const handleReset = () => {
        // If a polygon is selected, delete only that polygon; otherwise reset all
        if (selectedIndex != null && selectedIndex >= 0 && selectedIndex < polygons.length) {
            // collect id for selected polygon
            const basePolys = stream?.polygons;
            const baseList = Array.isArray(basePolys) && basePolys.length && !Array.isArray(basePolys[0])
                ? [{ points: basePolys }]
                : Array.isArray(basePolys) && Array.isArray(basePolys[0])
                    ? basePolys.map(p => ({ points: p }))
                    : basePolys || [];
            const base = baseList[selectedIndex] || {};
            const removedId = base.id ?? String(selectedIndex + 1);
            setPolygons(prev => prev.filter((_, i) => i !== selectedIndex));
            setPolygonAnomalies(prev => {
                const next = {};
                Object.keys(prev).forEach(k => {
                    const i = Number(k);
                    if (i < selectedIndex)
                        next[i] = prev[i];
                    else if (i > selectedIndex)
                        next[i - 1] = prev[i];
                });
                return next;
            });
            setSelectedIndex(null);
            setCurrentPoints([]);
            onReset?.({ mode: 'selected', ids: [removedId] });
        }
        else {
            // collect all ids
            const basePolys = stream?.polygons;
            const baseList = Array.isArray(basePolys) && basePolys.length && !Array.isArray(basePolys[0])
                ? [{ points: basePolys }]
                : Array.isArray(basePolys) && Array.isArray(basePolys[0])
                    ? basePolys.map(p => ({ points: p }))
                    : basePolys || [];
            const ids = polygons.map((_, idx) => (baseList[idx]?.id ?? '0'));
            setPolygons([]);
            setCurrentPoints([]);
            setSelectedIndex(null);
            setPolygonAnomalies({});
            if (ids.length)
                onReset?.({ mode: 'all', ids });
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
        if (!onSaveSelectedPolygon)
            return;
        if (selectedIndex == null || selectedIndex < 0 || selectedIndex >= polygons.length) {
            onSaveSelectedPolygon(null);
            return;
        }
        // Normalize base polygons to optionally reuse id/label/color
        const basePolys = stream?.polygons;
        const baseList = Array.isArray(basePolys) && basePolys.length && !Array.isArray(basePolys[0])
            ? [{ points: basePolys }]
            : Array.isArray(basePolys) && Array.isArray(basePolys[0])
                ? basePolys.map(p => ({ points: p }))
                : basePolys || [];
        const points = polygons[selectedIndex];
        const base = baseList[selectedIndex] || {};
        const detailed = {
            id: base.id ?? '0',
            label: base.label,
            color: base.color,
            points,
            anomalyIds: polygonAnomalies[selectedIndex] ?? base.anomalyIds,
        };
        onSaveSelectedPolygon(detailed);
    };
    // Helper to get anomaly names label for overlay
    const anomalyLabelForIndex = (idx) => {
        const ids = polygonAnomalies[idx] ?? (Array.isArray(stream?.polygons) && (stream?.polygons)[idx]?.anomalyIds);
        if (!ids || !ids.length)
            return '';
        const names = ids
            .map(id => {
            const found = (Array.isArray(anomalyCatalog) ? anomalyCatalog : []).find((a) => a.anomalyId === id);
            return found?.anomalyName || String(id);
        })
            .filter(Boolean);
        return names.join(', ');
    };
    // When parent provides controlled anomaly IDs for selected polygon, sync them in
    React.useEffect(() => {
        if (selectedIndex == null)
            return;
        if (!selectedPolygonAnomalyIds)
            return;
        setPolygonAnomalies(prev => ({ ...prev, [selectedIndex]: [...selectedPolygonAnomalyIds] }));
    }, [selectedPolygonAnomalyIds, selectedIndex]);
    // Expose a setter for anomalies of the selected polygon
    // const setSelectedPolygonAnomalies = (ids: number[]) => {
    //   if (selectedIndex == null) return;
    //   setPolygonAnomalies(prev => ({ ...prev, [selectedIndex]: [...ids] }));
    //   onAnomalyChange?.(selectedIndex, ids);
    // };
    return (jsxRuntime.jsxs(antd.Card, { className: cn('w-full h-full', className), styles: { body: { padding: 16 } }, children: [jsxRuntime.jsxs("div", { className: "flex items-center justify-between mb-3", children: [jsxRuntime.jsxs("div", { children: [jsxRuntime.jsx(Text, { strong: true, className: "block", children: title }), jsxRuntime.jsx(Text, { type: "secondary", className: "text-xs", children: subtitle })] }), jsxRuntime.jsxs("div", { className: "flex items-center gap-3", children: [controlsVisible.viewer && (jsxRuntime.jsxs("div", { className: "flex items-center gap-2", children: [jsxRuntime.jsx(Text, { className: "text-xs", children: "Viewer" }), jsxRuntime.jsx(antd.Switch, { checked: enabled, onChange: setEnabled })] })), controlsVisible.draw && (jsxRuntime.jsxs("div", { className: "flex items-center gap-2", children: [jsxRuntime.jsx(Text, { className: "text-xs", children: "Draw" }), jsxRuntime.jsx(antd.Switch, { checked: drawingEnabled, onChange: setDrawingEnabled })] })), controlsVisible.reset && (jsxRuntime.jsx(antd.Button, { size: "small", onClick: handleReset, disabled: !enabled, icon: jsxRuntime.jsx(icons.ReloadOutlined, {}), children: "Reset" })), controlsVisible.save && (jsxRuntime.jsx(antd.Tooltip, { title: selectedIndex == null ? 'Select a polygon to enable Save' : 'Save selected polygon', children: jsxRuntime.jsx(antd.Button, { size: "small", type: "primary", onClick: handleSaveSelected, disabled: !enabled || selectedIndex == null, children: "Save" }) })), controlsVisible.fullscreen && (jsxRuntime.jsx(antd.Tooltip, { title: isExpanded ? 'Collapse' : 'Expand', children: jsxRuntime.jsx(antd.Button, { size: "small", onClick: () => setIsExpanded(v => !v), icon: isExpanded ? jsxRuntime.jsx(icons.ShrinkOutlined, {}) : jsxRuntime.jsx(icons.ArrowsAltOutlined, {}) }) }))] })] }), !isExpanded && (jsxRuntime.jsx("div", { ref: containerRef, className: "relative w-full overflow-hidden rounded-md bg-black isolate", style: { aspectRatio: '16 / 9' }, children: enabled ? (jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [jsxRuntime.jsx(VideoPlayer, { stream: stream, autoPlay: true, muted: true, controls: false, className: "w-full h-full z-0" }), jsxRuntime.jsx("canvas", { ref: canvasRef, className: "absolute inset-0 z-10", style: { pointerEvents: enabled ? 'auto' : 'none', cursor: canDraw ? 'crosshair' : drawingEnabled ? 'default' : 'pointer' }, onClick: handleCanvasClick })] })) : (jsxRuntime.jsx("div", { className: "absolute inset-0 flex items-center justify-center", children: jsxRuntime.jsxs("div", { className: "text-center text-gray-300", children: [jsxRuntime.jsx("div", { className: "text-2xl mb-2", children: "Viewer is OFF" }), jsxRuntime.jsx("div", { className: "text-sm opacity-80", children: "Toggle ON to start live feed" })] }) })) })), jsxRuntime.jsxs(antd.Modal, { open: isExpanded, onCancel: () => setIsExpanded(false), footer: null, width: '90vw', style: { top: 24 }, styles: { body: { padding: 16 } }, destroyOnClose: true, children: [jsxRuntime.jsxs("div", { className: "flex items-center justify-between mb-3", children: [jsxRuntime.jsxs("div", { children: [jsxRuntime.jsx(Text, { strong: true, className: "block", children: title }), jsxRuntime.jsx(Text, { type: "secondary", className: "text-xs", children: subtitle })] }), jsxRuntime.jsxs("div", { className: "flex items-center gap-3", children: [controlsVisible.viewer && (jsxRuntime.jsxs("div", { className: "flex items-center gap-2", children: [jsxRuntime.jsx(Text, { className: "text-xs", children: "Viewer" }), jsxRuntime.jsx(antd.Switch, { checked: enabled, onChange: setEnabled })] })), controlsVisible.draw && (jsxRuntime.jsxs("div", { className: "flex items-center gap-2", children: [jsxRuntime.jsx(Text, { className: "text-xs", children: "Draw" }), jsxRuntime.jsx(antd.Switch, { checked: drawingEnabled, onChange: setDrawingEnabled })] })), controlsVisible.reset && (jsxRuntime.jsx(antd.Button, { size: "small", onClick: handleReset, disabled: !enabled, icon: jsxRuntime.jsx(icons.ReloadOutlined, {}), children: "Reset" })), controlsVisible.save && (jsxRuntime.jsx(antd.Tooltip, { title: selectedIndex == null ? 'Select a polygon to enable Save' : 'Save selected polygon', children: jsxRuntime.jsx(antd.Button, { size: "small", type: "primary", onClick: handleSaveSelected, disabled: !enabled || selectedIndex == null, children: "Save" }) })), controlsVisible.fullscreen && (jsxRuntime.jsx(antd.Tooltip, { title: 'Collapse', children: jsxRuntime.jsx(antd.Button, { size: "small", onClick: () => setIsExpanded(false), icon: jsxRuntime.jsx(icons.ShrinkOutlined, {}) }) }))] })] }), jsxRuntime.jsx("div", { ref: containerRef, className: "relative w-full overflow-hidden rounded-md bg-black isolate", style: { aspectRatio: '16 / 9' }, children: enabled ? (jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [jsxRuntime.jsx(VideoPlayer, { stream: stream, autoPlay: true, muted: true, controls: false, className: "w-full h-full z-0" }), jsxRuntime.jsx("canvas", { ref: canvasRef, className: "absolute inset-0 z-10", style: { pointerEvents: enabled ? 'auto' : 'none', cursor: canDraw ? 'crosshair' : drawingEnabled ? 'default' : 'pointer' }, onClick: handleCanvasClick })] })) : (jsxRuntime.jsx("div", { className: "absolute inset-0 flex items-center justify-center", children: jsxRuntime.jsxs("div", { className: "text-center text-gray-300", children: [jsxRuntime.jsx("div", { className: "text-2xl mb-2", children: "Viewer is OFF" }), jsxRuntime.jsx("div", { className: "text-sm opacity-80", children: "Toggle ON to start live feed" })] }) })) })] })] }));
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

const LiveVideoTileInner = ({ stream, index, isPrimary = false, isPlaying, isMuted, showControls, controlsSize, showLabel, labelPlacement = 'top', onTogglePlay, onToggleMute, onFullscreen, onClick, onError, className, style, }) => {
    const videoElementRef = React.useRef(null);
    const hasStream = !!stream && !!stream.url;
    const streamId = stream?.id ?? '';
    React.useEffect(() => {
        const video = videoElementRef.current;
        if (!video)
            return;
        if (isMuted !== video.muted) {
            video.muted = isMuted;
        }
    }, [isMuted]);
    React.useEffect(() => {
        const video = videoElementRef.current;
        if (!video)
            return;
        if (isPlaying) {
            const playPromise = video.play();
            if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(() => {
                    /* ignore */
                });
            }
        }
        else {
            video.pause();
        }
    }, [isPlaying]);
    const handleExposeVideoRef = React.useCallback((video) => {
        videoElementRef.current = video;
    }, []);
    const handleTogglePlay = React.useCallback(() => {
        if (streamId)
            onTogglePlay(streamId);
    }, [streamId, onTogglePlay]);
    const handleToggleMute = React.useCallback(() => {
        if (streamId)
            onToggleMute(streamId);
    }, [streamId, onToggleMute]);
    const handleFullscreen = React.useCallback(() => {
        if (streamId)
            onFullscreen(streamId);
    }, [streamId, onFullscreen]);
    const handleClick = React.useCallback(() => {
        if (streamId && onClick)
            onClick(streamId);
    }, [streamId, onClick]);
    const handleError = React.useCallback((error) => {
        if (onError && streamId) {
            onError(error, streamId);
        }
    }, [onError, streamId]);
    return (jsxRuntime.jsxs("div", { className: cn('relative overflow-hidden bg-black rounded-md isolate', isPrimary ? 'shadow-[0_0_0_2px_rgba(67,228,255,0.35)]' : '', className), style: style, onClick: handleClick, children: [hasStream ? (jsxRuntime.jsx(VideoPlayer, { stream: stream, autoPlay: isPlaying, muted: isMuted, controls: false, objectFit: "cover", exposeVideoRef: handleExposeVideoRef, onError: handleError }, stream?.id ?? index)) : (jsxRuntime.jsx("div", { className: "flex items-center justify-center w-full h-full bg-black text-xs text-gray-300", children: "No Video" })), showLabel && (jsxRuntime.jsx("div", { className: cn('pointer-events-none absolute left-0 right-0 flex items-center justify-between px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-[1px]', labelPlacement === 'bottom'
                    ? 'bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent'
                    : 'top-0 bg-gradient-to-b from-black/75 via-black/40 to-transparent'), children: jsxRuntime.jsx("span", { children: stream?.title || `Camera ${index + 1}` }) })), showControls && hasStream && (jsxRuntime.jsx(VideoControls, { isPlaying: isPlaying, isMuted: isMuted, onPlayPause: handleTogglePlay, onMuteUnmute: handleToggleMute, onFullscreen: handleFullscreen, showControls: true, size: controlsSize }))] }));
};
// Memoize to prevent re-renders when parent state changes but this tile's props haven't
const LiveVideoTile = React.memo(LiveVideoTileInner, (prevProps, nextProps) => {
    // Only re-render if these specific props change
    return (prevProps.stream?.id === nextProps.stream?.id &&
        prevProps.stream?.url === nextProps.stream?.url &&
        prevProps.stream?.title === nextProps.stream?.title &&
        prevProps.index === nextProps.index &&
        prevProps.isPrimary === nextProps.isPrimary &&
        prevProps.isPlaying === nextProps.isPlaying &&
        prevProps.isMuted === nextProps.isMuted &&
        prevProps.showControls === nextProps.showControls &&
        prevProps.controlsSize === nextProps.controlsSize &&
        prevProps.showLabel === nextProps.showLabel &&
        prevProps.labelPlacement === nextProps.labelPlacement &&
        prevProps.className === nextProps.className &&
        prevProps.onTogglePlay === nextProps.onTogglePlay &&
        prevProps.onToggleMute === nextProps.onToggleMute &&
        prevProps.onFullscreen === nextProps.onFullscreen &&
        prevProps.onClick === nextProps.onClick &&
        prevProps.onError === nextProps.onError);
});

const DEFAULT_PATTERN_DEFINITIONS = [
    { key: '1', label: '1-Up', category: 'Equal', tileCount: 1 },
    { key: '2', label: '2-Up', category: 'Equal', tileCount: 2 },
    { key: '4', label: 'Quad', category: 'Equal', tileCount: 4 },
    { key: '8', label: '2x4', category: 'Equal', tileCount: 8 },
    { key: '9', label: '3x3', category: 'Equal', tileCount: 9 },
    { key: '14', label: '14 Grid', category: 'Equal', tileCount: 14 },
    { key: '16', label: '4x4', category: 'Equal', tileCount: 16 },
    { key: '28', label: '28 Grid', category: 'Equal', tileCount: 28 },
    { key: 'M14', label: 'M14', category: 'Equal', tileCount: 15 },
    { key: 'M15', label: 'M15', category: 'Equal', tileCount: 15 },
    { key: '6-Highlight', label: '6 Highlight', category: 'Highlight', tileCount: 6 },
    { key: '8-Highlight', label: '8 Highlight', category: 'Highlight', tileCount: 8 },
    { key: '10-Highlight', label: '10 Highlight', category: 'Highlight', tileCount: 10 },
    { key: '12-Highlight', label: '12 Highlight', category: 'Highlight', tileCount: 12 },
    { key: '16-Highlight', label: '16 Highlight', category: 'Highlight', tileCount: 16 },
    { key: '20', label: '20 Grid', category: 'Extreme', tileCount: 20 },
    { key: '36', label: '36 Grid', category: 'Extreme', tileCount: 36 },
    { key: '64', label: '64 Grid', category: 'Extreme', tileCount: 64 },
];
const definitionMap = new Map(DEFAULT_PATTERN_DEFINITIONS.map(def => [def.key, def]));
const DEFAULT_PATTERN_KEYS = DEFAULT_PATTERN_DEFINITIONS.map(def => def.key);
const DEFAULT_PATTERN_CATEGORY_ORDER = ['Equal', 'Highlight', 'Extreme'];
function getPatternDefinition(key) {
    return definitionMap.get(key);
}
function resolvePatternDefinitions(available) {
    if (!available || available.length === 0) {
        return DEFAULT_PATTERN_DEFINITIONS;
    }
    return available
        .map(key => getPatternDefinition(key))
        .filter((def) => !!def);
}
function isHighlightPattern(key) {
    return key.includes('Highlight');
}
function pickNearestPattern(count) {
    if (count <= 1)
        return '1';
    if (count <= 2)
        return '2';
    if (count <= 4)
        return '4';
    if (count <= 8)
        return '8';
    if (count <= 9)
        return '9';
    if (count === 14)
        return 'M14';
    if (count <= 14)
        return '14';
    if (count === 15)
        return 'M15';
    if (count <= 16)
        return '16';
    if (count <= 20)
        return '20';
    if (count <= 28)
        return '28';
    if (count <= 36)
        return '36';
    return '64';
}

const TILE_BG = 'bg-[#3E82FF]';
const TILE_BG_LIGHT = 'bg-[#E5EDFF]';
const TILE_BORDER = 'border border-white/60';
const categoryTitle = {
    Equal: 'Equal',
    Highlight: 'Highlight',
    Extreme: 'Extreme',
};
function renderNumericPreview(tileCount) {
    const cols = Math.ceil(Math.sqrt(tileCount));
    const rows = Math.ceil(tileCount / cols);
    const cells = Array.from({ length: tileCount }, (_, idx) => (jsxRuntime.jsx("div", { className: cn(TILE_BG, TILE_BORDER) }, idx)));
    return (jsxRuntime.jsx("div", { className: "grid", style: {
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`,
            width: 72,
            height: 72,
            gap: 2,
        }, children: cells }));
}
function renderM14Preview() {
    const cells = [];
    const keyMatrix = [];
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 5; col++) {
            const id = `${row}-${col}`;
            let className = TILE_BG;
            const style = {};
            if (row < 2 && col < 2) {
                if (row === 0 && col === 0) {
                    className = `${TILE_BG} ${TILE_BORDER}`;
                    style.gridColumn = 'span 2';
                    style.gridRow = 'span 2';
                }
                else {
                    continue;
                }
            }
            if (row >= 2 && row < 4 && col < 2) {
                if (row === 2 && col === 0) {
                    className = `${TILE_BG} ${TILE_BORDER}`;
                    style.gridColumn = 'span 2';
                    style.gridRow = 'span 2';
                }
                else {
                    continue;
                }
            }
            keyMatrix.push({ key: id, className: `${className} ${TILE_BORDER}`, style });
        }
    }
    keyMatrix.forEach(({ key, className, style }) => cells.push(jsxRuntime.jsx("div", { className: className, style: style }, key)));
    return (jsxRuntime.jsx("div", { className: "grid", style: {
            gridTemplateColumns: 'repeat(5, 1fr)',
            gridTemplateRows: 'repeat(4, 1fr)',
            width: 72,
            height: 72,
            gap: 2,
        }, children: cells }));
}
function renderM15Preview() {
    const cells = [];
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 5; col++) {
            const id = `${row}-${col}`;
            const isTopLeft = row < 2 && col < 2;
            const isMidRight = row < 2 && col >= 2 && col < 4;
            if (isTopLeft && !(row === 0 && col === 0))
                continue;
            if (isMidRight && !(row === 0 && col === 2))
                continue;
            const style = {};
            if (row === 0 && col === 0) {
                style.gridColumn = 'span 2';
                style.gridRow = 'span 2';
            }
            if (row === 0 && col === 2) {
                style.gridColumn = 'span 2';
                style.gridRow = 'span 2';
            }
            cells.push(jsxRuntime.jsx("div", { className: `${TILE_BG} ${TILE_BORDER}`, style: style }, id));
        }
    }
    return (jsxRuntime.jsx("div", { className: "grid", style: {
            gridTemplateColumns: 'repeat(5, 1fr)',
            gridTemplateRows: 'repeat(4, 1fr)',
            width: 72,
            height: 72,
            gap: 2,
        }, children: cells }));
}
function renderHighlightPreview(tileCount) {
    const size = Math.max(3, Math.floor(tileCount / 2));
    const cells = [];
    const bigSpan = size - 1;
    let smallIndex = 0;
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const id = `${row}-${col}`;
            if (row < bigSpan && col < bigSpan) {
                if (row === 0 && col === 0) {
                    cells.push(jsxRuntime.jsx("div", { className: `${TILE_BG} ${TILE_BORDER}`, style: { gridColumn: `span ${bigSpan}`, gridRow: `span ${bigSpan}` } }, id));
                }
                continue;
            }
            if (smallIndex < tileCount - 1) {
                cells.push(jsxRuntime.jsx("div", { className: `${TILE_BG_LIGHT} ${TILE_BORDER}` }, id));
                smallIndex += 1;
            }
        }
    }
    return (jsxRuntime.jsx("div", { className: "grid", style: {
            gridTemplateColumns: `repeat(${size}, 1fr)`,
            gridTemplateRows: `repeat(${size}, 1fr)`,
            width: 72,
            height: 72,
            gap: 2,
        }, children: cells }));
}
function renderPreview(def) {
    if (def.key === 'M14')
        return renderM14Preview();
    if (def.key === 'M15')
        return renderM15Preview();
    if (isHighlightPattern(def.key))
        return renderHighlightPreview(def.tileCount);
    return renderNumericPreview(def.tileCount);
}
const PatternMenu = ({ activePattern, availablePatterns, onSelect, placement = 'bottom', triggerLabel = 'Change pattern', }) => {
    const [open, setOpen] = React.useState(false);
    const definitions = React.useMemo(() => resolvePatternDefinitions(availablePatterns), [availablePatterns]);
    const grouped = React.useMemo(() => {
        return DEFAULT_PATTERN_CATEGORY_ORDER.map(category => ({
            category,
            patterns: definitions.filter(def => def.category === category),
        })).filter(group => group.patterns.length > 0);
    }, [definitions]);
    const content = (jsxRuntime.jsx("div", { className: "min-w-[420px] bg-neutral-900 text-white rounded-md p-4 shadow-2xl", children: jsxRuntime.jsx("div", { className: "space-y-4", children: grouped.map(group => (jsxRuntime.jsxs("div", { children: [jsxRuntime.jsx("h4", { className: "font-semibold text-sm mb-2 uppercase tracking-wide text-neutral-200", children: categoryTitle[group.category] }), jsxRuntime.jsx("div", { className: "flex flex-wrap gap-3", children: group.patterns.map(pattern => (jsxRuntime.jsx("button", { className: cn('rounded-md border border-transparent focus:outline-none focus:ring-2 focus:ring-[#43E4FF] transition', activePattern === pattern.key
                                ? 'bg-[#2A5BE2]/80'
                                : 'bg-neutral-800 hover:bg-neutral-700'), onClick: () => {
                                onSelect(pattern.key);
                                setOpen(false);
                            }, children: renderPreview(pattern) }, pattern.key))) })] }, group.category))) }) }));
    return (jsxRuntime.jsx(antd.Popover, { trigger: "click", content: content, placement: placement === 'top' ? 'top' : 'bottom', open: open, onOpenChange: setOpen, overlayInnerStyle: { padding: 0 }, children: jsxRuntime.jsx(antd.Button, { icon: jsxRuntime.jsx(icons.AppstoreOutlined, {}), children: triggerLabel }) }));
};

const DEFAULT_HEIGHT = 'calc(100vh - 140px)';
const DEFAULT_TITLE = 'Live Videos';
const DEFAULT_QUICK_PATTERNS = ['1', '2', '4', '8', '14', '28'];
const LiveVideos = ({ streams, displayStreams, loading = false, title = DEFAULT_TITLE, pattern, defaultPattern, autoPattern = true, availablePatterns, quickPatternKeys = DEFAULT_QUICK_PATTERNS, onPatternChange, onTileClick, onStreamError, showPatternMenu = true, patternMenuPlacement = 'bottom', showTileLabels = true, tileLabelPlacement = 'top', showTileControls = true, tileControlsSize = 'small', autoPlay = true, muted = true, height = DEFAULT_HEIGHT, className, emptyState, }) => {
    const effectiveStreams = streams ?? [];
    const renderStreams = displayStreams && displayStreams.length > 0 ? displayStreams : effectiveStreams;
    const resolvedHeight = React.useMemo(() => {
        if (typeof height === 'number')
            return `${height}px`;
        return height || DEFAULT_HEIGHT;
    }, [height]);
    const definitions = React.useMemo(() => resolvePatternDefinitions(availablePatterns || DEFAULT_PATTERN_KEYS), [availablePatterns]);
    const definitionMap = React.useMemo(() => new Map(definitions.map(def => [def.key, def])), [definitions]);
    const availableKeys = React.useMemo(() => definitions.map(def => def.key), [definitions]);
    const quickPatterns = React.useMemo(() => {
        const unique = Array.from(new Set(quickPatternKeys));
        return unique.filter(key => availableKeys.includes(key));
    }, [quickPatternKeys, availableKeys]);
    const fallbackPattern = availableKeys[0] ?? '1';
    const isControlled = pattern !== undefined;
    const derivePatternFromStreams = React.useCallback((count) => {
        const candidate = pickNearestPattern(count);
        return availableKeys.includes(candidate) ? candidate : fallbackPattern;
    }, [availableKeys, fallbackPattern]);
    const [internalPattern, setInternalPattern] = React.useState(() => {
        if (defaultPattern && availableKeys.includes(defaultPattern)) {
            return defaultPattern;
        }
        return derivePatternFromStreams(renderStreams.length);
    });
    React.useEffect(() => {
        if (isControlled)
            return;
        if (defaultPattern && availableKeys.includes(defaultPattern)) {
            setInternalPattern(defaultPattern);
        }
    }, [defaultPattern, availableKeys, isControlled]);
    React.useEffect(() => {
        if (isControlled || !autoPattern)
            return;
        const next = derivePatternFromStreams(renderStreams.length);
        setInternalPattern(prev => (prev === next ? prev : next));
    }, [renderStreams.length, derivePatternFromStreams, autoPattern, isControlled]);
    const [tileState, setTileState] = React.useState({});
    const [fullscreenStream, setFullscreenStream] = React.useState(null);
    const activePattern = (isControlled ? pattern : internalPattern) ?? fallbackPattern;
    const activeDefinition = React.useMemo(() => definitions.find(def => def.key === activePattern), [definitions, activePattern]);
    const limitedStreams = React.useMemo(() => {
        const max = activeDefinition?.tileCount ?? renderStreams.length;
        return renderStreams.slice(0, max);
    }, [renderStreams, activeDefinition]);
    // Create a stable stream map for quick lookups by ID
    const streamMap = React.useMemo(() => {
        const map = new Map();
        limitedStreams.forEach((stream, index) => {
            map.set(stream.id, { stream, index });
        });
        return map;
    }, [limitedStreams]);
    // Stable callback that takes streamId - won't change between renders
    const handleTogglePlay = React.useCallback((streamId) => {
        setTileState(prev => {
            const current = prev[streamId] ?? { playing: autoPlay, muted };
            return { ...prev, [streamId]: { ...current, playing: !current.playing } };
        });
    }, [autoPlay, muted]);
    // Stable callback that takes streamId - won't change between renders
    const handleToggleMute = React.useCallback((streamId) => {
        setTileState(prev => {
            const current = prev[streamId] ?? { playing: autoPlay, muted };
            return { ...prev, [streamId]: { ...current, muted: !current.muted } };
        });
    }, [autoPlay, muted]);
    // Stable callback for fullscreen - won't change between renders
    const handleFullscreen = React.useCallback((streamId) => {
        const entry = streamMap.get(streamId);
        if (entry) {
            setFullscreenStream(entry.stream);
        }
    }, [streamMap]);
    // Stable callback for tile click - won't change between renders
    const handleTileClickById = React.useCallback((streamId) => {
        const entry = streamMap.get(streamId);
        if (entry && onTileClick) {
            onTileClick(entry.stream, entry.index);
        }
    }, [streamMap, onTileClick]);
    // Stable callback for error - won't change between renders
    const handleStreamError = React.useCallback((error, streamId) => {
        const entry = streamMap.get(streamId);
        if (entry && onStreamError) {
            onStreamError(error, entry.stream);
        }
    }, [streamMap, onStreamError]);
    const handlePatternSelect = React.useCallback((next) => {
        if (!availableKeys.includes(next))
            return;
        if (!isControlled) {
            setInternalPattern(next);
        }
        onPatternChange?.(next);
    }, [availableKeys, isControlled, onPatternChange]);
    const renderTile = React.useCallback((stream, index, options = {}) => {
        const tileKey = options.key ?? stream?.id ?? `slot-${index}`;
        const state = stream
            ? (tileState[stream.id] ?? { playing: autoPlay, muted })
            : { playing: false, muted: true };
        const hasStream = !!stream;
        return (jsxRuntime.jsx(LiveVideoTile, { stream: stream, index: index, isPrimary: options.isPrimary, isPlaying: state.playing && hasStream, isMuted: state.muted || !hasStream, showControls: showTileControls && hasStream, controlsSize: tileControlsSize, showLabel: showTileLabels, labelPlacement: tileLabelPlacement, onTogglePlay: handleTogglePlay, onToggleMute: handleToggleMute, onFullscreen: handleFullscreen, onClick: handleTileClickById, onError: handleStreamError, className: cn('w-full h-full', options.className), style: options.style }, tileKey));
    }, [
        tileState,
        autoPlay,
        muted,
        showTileControls,
        showTileLabels,
        tileControlsSize,
        tileLabelPlacement,
        handleTogglePlay,
        handleToggleMute,
        handleFullscreen,
        handleTileClickById,
        handleStreamError,
    ]);
    const patternContent = React.useMemo(() => {
        if (loading) {
            return (jsxRuntime.jsx("div", { className: "flex items-center justify-center w-full h-full", children: jsxRuntime.jsx(antd.Spin, { size: "large" }) }));
        }
        if (limitedStreams.length === 0) {
            return (emptyState ?? (jsxRuntime.jsx("div", { className: "flex items-center justify-center w-full h-[320px] rounded-md border border-neutral-800 bg-neutral-900/40 text-sm text-neutral-400", children: "No camera streams available" })));
        }
        const streamsToUse = limitedStreams;
        const renderNumeric = (count) => {
            const cols = Math.ceil(Math.sqrt(count));
            const rows = Math.ceil(count / cols);
            const tiles = streamsToUse.slice(0, count);
            return (jsxRuntime.jsx("div", { className: "grid gap-0.5", style: {
                    height: resolvedHeight,
                    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                    gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
                }, children: tiles.map((stream, idx) => renderTile(stream, idx)) }));
        };
        const renderHighlight = (count) => {
            const gridSize = Math.max(3, Math.floor(count / 2));
            const total = Math.min(count, streamsToUse.length);
            const items = [];
            const primary = streamsToUse[0];
            items.push(renderTile(primary, 0, {
                key: 'primary',
                isPrimary: true,
                style: {
                    gridColumn: `span ${gridSize - 1} / span ${gridSize - 1}`,
                    gridRow: `span ${gridSize - 1} / span ${gridSize - 1}`,
                },
            }));
            let idx = 1;
            for (let r = 0; r < gridSize - 1 && idx < total; r++) {
                const stream = streamsToUse[idx];
                items.push(renderTile(stream, idx, {
                    key: `right-${idx}`,
                    style: { gridColumn: `${gridSize} / ${gridSize + 1}`, gridRow: `${r + 1} / ${r + 2}` },
                }));
                idx += 1;
            }
            for (let c = 0; c < gridSize && idx < total; c++) {
                const stream = streamsToUse[idx];
                items.push(renderTile(stream, idx, {
                    key: `bottom-${idx}`,
                    style: { gridColumn: `${c + 1} / ${c + 2}`, gridRow: `${gridSize} / ${gridSize + 1}` },
                }));
                idx += 1;
            }
            return (jsxRuntime.jsx("div", { className: "grid gap-0.5", style: {
                    height: resolvedHeight,
                    gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
                    gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`,
                }, children: items }));
        };
        const renderM14 = () => {
            const items = [];
            let tileIdx = 0;
            for (let i = 0; i < 20; i++) {
                const row = Math.floor(i / 5) + 1;
                const col = (i % 5) + 1;
                const isTopLeft = row <= 2 && col <= 2;
                const isLowerLeft = row >= 3 && col <= 2;
                if ((isTopLeft && i !== 0) || (isLowerLeft && i !== 11)) {
                    continue;
                }
                const stream = streamsToUse[tileIdx];
                items.push(renderTile(stream, tileIdx, {
                    key: `m14-${i}`,
                    style: i === 0
                        ? { gridColumn: 'span 2 / span 2', gridRow: 'span 2 / span 2' }
                        : i === 11
                            ? { gridColumn: 'span 2 / span 2', gridRow: 'span 2 / span 2' }
                            : undefined,
                }));
                tileIdx += 1;
                if (tileIdx >= streamsToUse.length)
                    break;
            }
            return (jsxRuntime.jsx("div", { className: "grid grid-cols-5 grid-rows-4 gap-0.5", style: { height: resolvedHeight }, children: items }));
        };
        const renderM15 = () => {
            const items = [];
            let tileIdx = 0;
            for (let i = 0; i < 20; i++) {
                const row = Math.floor(i / 5) + 1;
                const col = (i % 5) + 1;
                const isTopLeft = row <= 2 && col <= 2;
                const isMidRight = row <= 2 && col >= 3 && col <= 4;
                if ((isTopLeft && i !== 0) || (isMidRight && i !== 3)) {
                    continue;
                }
                const stream = streamsToUse[tileIdx];
                items.push(renderTile(stream, tileIdx, {
                    key: `m15-${i}`,
                    style: i === 0 || i === 3
                        ? { gridColumn: 'span 2 / span 2', gridRow: 'span 2 / span 2' }
                        : undefined,
                }));
                tileIdx += 1;
                if (tileIdx >= streamsToUse.length)
                    break;
            }
            return (jsxRuntime.jsx("div", { className: "grid grid-cols-5 grid-rows-4 gap-0.5", style: { height: resolvedHeight }, children: items }));
        };
        if (activePattern === 'M14') {
            return renderM14();
        }
        if (activePattern === 'M15') {
            return renderM15();
        }
        if (activePattern.endsWith('Highlight')) {
            const count = Number(activePattern.split('-')[0]) || streamsToUse.length;
            return renderHighlight(count);
        }
        const numericCount = Number(activePattern);
        if (!Number.isNaN(numericCount)) {
            return renderNumeric(numericCount);
        }
        return renderNumeric(streamsToUse.length);
    }, [
        limitedStreams,
        renderTile,
        activePattern,
        resolvedHeight,
        loading,
        emptyState,
    ]);
    const showTitle = title !== null && title !== false;
    const showControlsRow = showPatternMenu || quickPatterns.length > 0;
    return (jsxRuntime.jsxs("div", { className: cn('w-full h-full flex flex-col gap-4', className), children: [(showTitle || showControlsRow) && (jsxRuntime.jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [showTitle ? (jsxRuntime.jsx("h1", { className: "text-2xl font-bold text-[#05162B]", children: title })) : (jsxRuntime.jsx("div", { className: "flex-1", "aria-hidden": true })), showControlsRow && (jsxRuntime.jsxs("div", { className: "flex flex-wrap items-center gap-2 justify-end", children: [showPatternMenu && (jsxRuntime.jsx(PatternMenu, { activePattern: activePattern, availablePatterns: availableKeys, onSelect: handlePatternSelect, placement: patternMenuPlacement })), quickPatterns.length > 0 && (jsxRuntime.jsx("div", { className: "flex items-center gap-1", children: quickPatterns.map(patternKey => {
                                    const rawLabel = definitionMap.get(patternKey)?.label ?? patternKey;
                                    const shortcutLabel = /^\d/.test(patternKey)
                                        ? patternKey.replace('-Highlight', '')
                                        : rawLabel.replace(' Highlight', '');
                                    return (jsxRuntime.jsx("button", { type: "button", onClick: () => handlePatternSelect(patternKey), className: cn('rounded-md border px-2 py-1 text-xs font-semibold transition-colors', activePattern === patternKey
                                            ? 'border-[#1f4ea8] bg-[#1f4ea8] text-white shadow-sm'
                                            : 'border-slate-300 bg-white text-[#0b1f3a] hover:bg-slate-100'), children: shortcutLabel }, patternKey));
                                }) }))] }))] })), jsxRuntime.jsx("div", { className: "flex-1 min-h-[240px]", children: patternContent }), fullscreenStream && (jsxRuntime.jsx(FullscreenModal, { isOpen: !!fullscreenStream, stream: fullscreenStream, isPlaying: true, isMuted: tileState[fullscreenStream.id]?.muted ?? muted, onClose: () => setFullscreenStream(null), onError: error => onStreamError?.(error, fullscreenStream) }))] }));
};

// Constants
const DEFAULT_MAX_FILE_SIZE_MB = 5;
const DEFAULT_IMAGE_PREVIEW_HEIGHT = 200;
const JPEG_QUALITY = 0.95;
const BUTTON_SIZE = { width: '48px', height: '38px' };
const FACE_GUIDE_SIZE = { width: '300px', height: '400px' };
const CAMERA_CONSTRAINTS = {
    video: {
        facingMode: 'user',
        width: { ideal: 1280 },
        height: { ideal: 720 }
    }
};
const MODAL_RENDER_DELAY = 100;
// Angle instruction mapping
const ANGLE_INSTRUCTIONS = {
    front: '👤 Look straight at the camera',
    left: '◀️ Turn your face to the left (45°)',
    right: '▶️ Turn your face to the right (45°)'
};
const DEFAULT_GUIDELINES = [
    'Face should be clearly visible and well-lit',
    'Remove glasses, hats, or face coverings if possible',
    'Look directly at the camera for front view',
    'Turn head 45° for left and right views'
];
/**
 * BasicModeCapture Component
 *
 * Capture 1-3 static images for basic profile embedding.
 * Supports file upload and camera capture.
 */
const BasicModeCapture = ({ value = { front: null, left: null, right: null }, onChange, user = null, maxFileSizeMB = DEFAULT_MAX_FILE_SIZE_MB, imagePreviewHeight = DEFAULT_IMAGE_PREVIEW_HEIGHT, alertMessage = 'Basic Profile Embedding', alertDescription = 'Please upload clear, well-lit images of the face. Front view is required. Left and right views are optional but recommended for better recognition.', hideAlert = false, hideGuidelines = false, guidelines = DEFAULT_GUIDELINES, className = '' }) => {
    // Initialize images from value prop or user data (for edit mode)
    const getInitialImages = () => {
        // Priority 1: value prop (controlled component)
        if (value?.front || value?.left || value?.right) {
            return {
                front: value.front || null,
                left: value.left || null,
                right: value.right || null
            };
        }
        // Priority 2: user.filePathUrl (edit mode - load existing image)
        if (user?.filePathUrl) {
            return {
                front: {
                    url: user.filePathUrl,
                    name: 'front-view.jpg',
                    file: null,
                    isExisting: true
                },
                left: null,
                right: null
            };
        }
        // Default: empty state
        return { front: null, left: null, right: null };
    };
    const [images, setImages] = React.useState(getInitialImages());
    // Sync with parent value prop changes
    React.useEffect(() => {
        if (value && Object.keys(value).length > 0) {
            setImages(value);
        }
    }, [value]);
    // Update images when user prop changes (edit mode) - Only on mount
    React.useEffect(() => {
        if (user?.filePathUrl && !images.front) {
            setImages({
                front: {
                    url: user.filePathUrl,
                    name: 'front-view.jpg',
                    file: null,
                    isExisting: true
                },
                left: null,
                right: null
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.filePathUrl]);
    // Camera capture state
    const [cameraModalOpen, setCameraModalOpen] = React.useState(false);
    const [currentAngle, setCurrentAngle] = React.useState(null);
    const [cameraStream, setCameraStream] = React.useState(null);
    const videoRef = React.useRef(null);
    const canvasRef = React.useRef(null);
    // Helper: Validate image file
    const validateImageFile = (file) => {
        if (!file) {
            return { valid: false, error: 'No file provided' };
        }
        const isImage = file.type.startsWith('image/');
        if (!isImage) {
            return { valid: false, error: 'Please upload an image file' };
        }
        const isValidSize = file.size / 1024 / 1024 < maxFileSizeMB;
        if (!isValidSize) {
            return { valid: false, error: `Image must be smaller than ${maxFileSizeMB}MB` };
        }
        return { valid: true };
    };
    // Helper: Create image data object
    const createImageData = (file, url) => ({
        file,
        url,
        name: file.name
    });
    // Helper: Update images state and notify parent
    const updateImages = (angle, imageData) => {
        const newImages = {
            ...images,
            [angle]: imageData
        };
        setImages(newImages);
        onChange?.(newImages);
    };
    // Helper: Get formatted angle title
    const getAngleTitle = (angle) => {
        return angle ? angle.charAt(0).toUpperCase() + angle.slice(1) : '';
    };
    const handleImageUpload = (angle, file) => {
        const validation = validateImageFile(file);
        if (!validation.valid) {
            antd.message.error(validation.error || 'Invalid file');
            return false;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageData = createImageData(file, e.target?.result);
            updateImages(angle, imageData);
        };
        reader.readAsDataURL(file);
        return false; // Prevent auto upload
    };
    const handleRemoveImage = (angle) => {
        updateImages(angle, null);
    };
    // Camera capture functions
    const openCamera = async (angle) => {
        setCurrentAngle(angle);
        setCameraModalOpen(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS);
            setCameraStream(stream);
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            }, MODAL_RENDER_DELAY);
        }
        catch (error) {
            antd.message.error('Unable to access camera. Please check permissions.');
            console.error('Camera access error:', error);
            setCameraModalOpen(false);
        }
    };
    const closeCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
        }
        setCameraModalOpen(false);
        setCurrentAngle(null);
    };
    const captureImage = () => {
        if (!videoRef.current || !canvasRef.current || !currentAngle)
            return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
            if (!blob) {
                antd.message.error('Failed to capture image');
                return;
            }
            const url = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
            const file = new File([blob], `${currentAngle}-view-${Date.now()}.jpg`, { type: 'image/jpeg' });
            const imageData = createImageData(file, url);
            updateImages(currentAngle, imageData);
            antd.message.success('Image captured successfully!');
            closeCamera();
        }, 'image/jpeg', JPEG_QUALITY);
    };
    const renderImageCapture = (angle, label, required = false) => {
        const imageData = images[angle];
        const hasImage = !!imageData;
        return (jsxRuntime.jsx(antd.Col, { xs: 24, md: 8, children: jsxRuntime.jsx("div", { className: "border-2 border-dashed border-gray-300 rounded-lg p-4 h-full", children: jsxRuntime.jsxs("div", { className: "flex flex-col items-center gap-3", children: [jsxRuntime.jsxs("div", { className: "flex items-center justify-between w-full", children: [jsxRuntime.jsxs("span", { className: "font-medium", children: [label, required && jsxRuntime.jsx("span", { className: "text-red-500 ml-1", children: "*" })] }), hasImage && (jsxRuntime.jsx(icons.CheckCircleOutlined, { className: "text-green-500" }))] }), hasImage ? (jsxRuntime.jsxs("div", { className: "w-full", children: [jsxRuntime.jsx(antd.Image, { src: imageData.url, alt: label, width: "100%", height: imagePreviewHeight, style: { objectFit: 'cover', borderRadius: '8px' } }), jsxRuntime.jsx(antd.Button, { type: "text", danger: true, icon: jsxRuntime.jsx(icons.DeleteOutlined, {}), onClick: () => handleRemoveImage(angle), className: "w-full mt-2", children: "Remove" })] })) : (jsxRuntime.jsxs("div", { className: "w-full", children: [jsxRuntime.jsx("div", { className: "bg-gray-100 rounded-lg flex items-center justify-center mb-3", style: { height: `${imagePreviewHeight}px` }, children: jsxRuntime.jsx(icons.CameraOutlined, { style: { fontSize: '48px', color: '#ccc' } }) }), jsxRuntime.jsxs("div", { className: "flex items-center justify-center gap-2", children: [jsxRuntime.jsx(antd.Tooltip, { title: "Take Photo", placement: "bottom", children: jsxRuntime.jsx(antd.Button, { icon: jsxRuntime.jsx(icons.CameraOutlined, {}), type: required && !hasImage ? 'primary' : 'default', size: "large", onClick: () => openCamera(angle), className: "flex items-center justify-center", style: BUTTON_SIZE }) }), jsxRuntime.jsx(antd.Upload, { accept: "image/*", showUploadList: false, beforeUpload: (file) => handleImageUpload(angle, file), children: jsxRuntime.jsx(antd.Tooltip, { title: "Upload from Device", placement: "bottom", children: jsxRuntime.jsx(antd.Button, { icon: jsxRuntime.jsx(icons.UploadOutlined, {}), size: "large", className: "flex items-center justify-center", style: BUTTON_SIZE }) }) })] })] }))] }) }) }));
    };
    return (jsxRuntime.jsxs("div", { className: `safespace-basic-mode-capture ${className}`, children: [!hideAlert && (jsxRuntime.jsx(antd.Alert, { message: alertMessage, description: alertDescription, type: "info", showIcon: true, className: "mb-4" })), jsxRuntime.jsxs(antd.Row, { gutter: [16, 16], children: [renderImageCapture('front', 'Front View', true), renderImageCapture('left', 'Left View', false), renderImageCapture('right', 'Right View', false)] }), !hideGuidelines && (jsxRuntime.jsx("div", { className: "mt-4", children: jsxRuntime.jsx(antd.Alert, { message: "Image Guidelines", description: jsxRuntime.jsxs("ul", { className: "list-disc list-inside space-y-1 mt-2", children: [guidelines.map((guideline, index) => (jsxRuntime.jsx("li", { children: guideline }, index))), jsxRuntime.jsxs("li", { children: ["Maximum file size: ", maxFileSizeMB, "MB per image"] })] }), type: "warning", showIcon: true }) })), jsxRuntime.jsxs(antd.Modal, { title: `Capture ${getAngleTitle(currentAngle)} View`, open: cameraModalOpen, onCancel: closeCamera, width: 800, footer: [
                    jsxRuntime.jsx(antd.Button, { onClick: closeCamera, icon: jsxRuntime.jsx(icons.CloseOutlined, {}), children: "Cancel" }, "cancel"),
                    jsxRuntime.jsx(antd.Button, { type: "primary", onClick: captureImage, icon: jsxRuntime.jsx(icons.CameraOutlined, {}), children: "Capture Photo" }, "capture")
                ], children: [jsxRuntime.jsx("div", { className: "camera-preview-container", children: jsxRuntime.jsxs("div", { className: "relative bg-black rounded-lg overflow-hidden", style: { aspectRatio: '16/9' }, children: [jsxRuntime.jsx("video", { ref: videoRef, autoPlay: true, playsInline: true, muted: true, className: "w-full h-full object-cover" }), jsxRuntime.jsx("div", { className: "absolute inset-0 flex items-center justify-center pointer-events-none", children: jsxRuntime.jsx("div", { className: "border-4 border-white border-dashed rounded-full opacity-50", style: FACE_GUIDE_SIZE }) }), jsxRuntime.jsx("div", { className: "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6", children: jsxRuntime.jsx("p", { className: "text-white text-center text-lg", children: currentAngle ? ANGLE_INSTRUCTIONS[currentAngle] : '' }) })] }) }), jsxRuntime.jsx("canvas", { ref: canvasRef, style: { display: 'none' } })] })] }));
};

// Default guidance sequence (as per meeting discussion)
const DEFAULT_GUIDANCE_STEPS = [
    { direction: 'front', duration: 5, message: 'Look straight at the camera', icon: '👤' },
    { direction: 'left', duration: 4, message: 'Slowly turn your face to the left', icon: '◀️' },
    { direction: 'right', duration: 4, message: 'Slowly turn your face to the right', icon: '▶️' },
    { direction: 'up', duration: 4, message: 'Tilt your head slightly up', icon: '⬆️' },
    { direction: 'down', duration: 4, message: 'Tilt your head slightly down', icon: '⬇️' }
];
// Constants
const VIDEO_ASPECT_RATIO = '16/9';
const DEFAULT_OVAL_DIMENSIONS = { width: 300, height: 380 };
const DEFAULT_SYSTEM_CAMERA = {
    id: 'default-system-camera',
    name: 'Default System Camera',
    cameraName: 'Default System Camera'
};
/**
 * AdvancedModeCapture Component
 *
 * Record video with guided prompts for advanced profile embedding.
 * Features 5-step guidance sequence and live preview.
 */
const AdvancedModeCapture = ({ onChange, registrationCameras = [], instructionPosition = 'bottom', guidanceSteps = DEFAULT_GUIDANCE_STEPS, alertMessage = 'Advanced Profile Embedding', alertDescription = 'Record a video following the on-screen guidance. Our AI service will analyze your video for facial recognition quality and provide feedback.', hideAlert = false, hideInstructions = false, ovalDimensions = DEFAULT_OVAL_DIMENSIONS, className = '' }) => {
    // Add default system camera if no cameras provided
    const availableCameras = registrationCameras.length > 0
        ? registrationCameras
        : [DEFAULT_SYSTEM_CAMERA];
    // Calculate max recording duration from guidance steps
    const maxRecordingDuration = guidanceSteps.reduce((sum, step) => sum + step.duration, 0);
    // State management
    const [selectedCamera, setSelectedCamera] = React.useState(null);
    const [recordingTime, setRecordingTime] = React.useState(0);
    const [currentGuidanceStep, setCurrentGuidanceStep] = React.useState(0);
    // Refs
    const videoRef = React.useRef(null);
    // react-media-recorder hook
    const { status, startRecording, pauseRecording, resumeRecording, stopRecording, mediaBlobUrl, previewStream, clearBlobUrl } = reactMediaRecorder.useReactMediaRecorder({
        video: (selectedCamera && selectedCamera !== 'default-system-camera')
            ? { deviceId: { exact: selectedCamera } }
            : true,
        audio: false,
        onStop: (blobUrl, blob) => {
            handleRecordingComplete(blobUrl, blob);
        }
    });
    // Connect preview stream to video element
    React.useEffect(() => {
        if (previewStream && videoRef.current && status === 'recording') {
            videoRef.current.srcObject = previewStream;
        }
    }, [previewStream, status]);
    // Timer for recording
    React.useEffect(() => {
        if (status !== 'recording') {
            return;
        }
        const interval = setInterval(() => {
            setRecordingTime(prev => {
                const newTime = prev + 1;
                // Calculate current guidance step
                let elapsed = 0;
                for (let i = 0; i < guidanceSteps.length; i++) {
                    elapsed += guidanceSteps[i].duration;
                    if (newTime < elapsed) {
                        setCurrentGuidanceStep(i);
                        break;
                    }
                }
                // Auto-stop at max duration
                if (newTime >= maxRecordingDuration) {
                    stopRecording();
                }
                return newTime;
            });
        }, 1000);
        return () => {
            clearInterval(interval);
        };
    }, [status, maxRecordingDuration, stopRecording, guidanceSteps]);
    // Helper to reset recording state
    const resetRecordingState = React.useCallback(() => {
        setRecordingTime(0);
        setCurrentGuidanceStep(0);
    }, []);
    // Format time display
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };
    // Calculate progress percentage
    const getProgress = () => {
        return Math.round((recordingTime / maxRecordingDuration) * 100);
    };
    // Handlers
    const handleCameraSelect = (cameraId) => {
        setSelectedCamera(cameraId);
    };
    const handleStartRecording = () => {
        if (!selectedCamera) {
            antd.message.warning('Please select a camera first');
            return;
        }
        resetRecordingState();
        startRecording();
        antd.message.success('Recording started! Follow the guidance prompts.');
    };
    const handlePauseRecording = () => {
        pauseRecording();
        antd.message.info('Recording paused');
    };
    const handleResumeRecording = () => {
        resumeRecording();
        antd.message.info('Recording resumed');
    };
    const handleRecordingComplete = (blobUrl, blob) => {
        if (onChange && selectedCamera) {
            onChange({
                videoBlob: blob,
                videoBlobUrl: blobUrl,
                duration: recordingTime,
                cameraId: selectedCamera,
                timestamp: new Date().toISOString()
            });
        }
        antd.message.success(`Recording complete! Duration: ${formatTime(recordingTime)}`);
    };
    const handleRetake = () => {
        clearBlobUrl();
        resetRecordingState();
        onChange?.(null);
        antd.message.info('Ready to record again');
    };
    const handleUseVideo = () => {
        if (!mediaBlobUrl) {
            antd.message.error('No video recorded');
            return;
        }
        antd.message.success('Video accepted! This will be used for profile embedding.');
    };
    const IdleStatusMessage = ({ icon: IconElement, message: msg, status: statusMsg, statusType = 'info' }) => (jsxRuntime.jsx("div", { className: "absolute inset-0 flex items-center justify-center text-white", children: jsxRuntime.jsxs("div", { className: "text-center", children: [IconElement && jsxRuntime.jsx(IconElement, { style: { fontSize: '64px', marginBottom: '16px' } }), jsxRuntime.jsx("p", { className: "text-lg", children: msg }), statusMsg && (jsxRuntime.jsxs("p", { className: `text-sm mt-2 ${statusType === 'success' ? 'text-green-400' :
                        statusType === 'warning' ? 'text-yellow-400' :
                            'text-blue-400'}`, children: [jsxRuntime.jsx(icons.CheckCircleOutlined, {}), " ", statusMsg] }))] }) }));
    return (jsxRuntime.jsxs("div", { className: `safespace-advanced-mode-capture ${className}`, children: [!hideAlert && (jsxRuntime.jsx(antd.Alert, { message: alertMessage, description: alertDescription, type: "info", showIcon: true, className: "mb-4" })), jsxRuntime.jsxs("div", { className: "mb-4", children: [jsxRuntime.jsxs("label", { className: "block mb-2 font-medium", children: ["Select Registration Camera ", jsxRuntime.jsx("span", { className: "text-red-500", children: "*" })] }), jsxRuntime.jsx(antd.Select, { placeholder: "Choose a camera", style: { width: '100%' }, value: selectedCamera, onChange: handleCameraSelect, disabled: status !== 'idle', size: "large", children: availableCameras.map(camera => (jsxRuntime.jsx(antd.Select.Option, { value: camera.id, children: jsxRuntime.jsxs(antd.Space, { children: [jsxRuntime.jsx(icons.CameraOutlined, {}), camera.name || camera.cameraName] }) }, camera.id))) })] }), jsxRuntime.jsx(antd.Divider, {}), jsxRuntime.jsxs("div", { className: "video-preview-container relative bg-black rounded-lg overflow-hidden mb-4", style: { aspectRatio: VIDEO_ASPECT_RATIO }, children: [status === 'idle' && !selectedCamera && (jsxRuntime.jsx(IdleStatusMessage, { icon: icons.CameraOutlined, message: "Select a camera to begin", status: null, statusType: "warning" })), status === 'idle' && selectedCamera && !mediaBlobUrl && (jsxRuntime.jsx(IdleStatusMessage, { icon: icons.PlayCircleOutlined, message: "Click Start Recording to begin", status: "Ready to record (Backend AI verification)", statusType: "success" })), (status === 'recording' || status === 'paused') && (jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [jsxRuntime.jsx("video", { ref: videoRef, autoPlay: true, muted: true, playsInline: true, className: "w-full h-full object-cover", style: { backgroundColor: '#000' } }), jsxRuntime.jsxs("div", { className: "absolute inset-0 pointer-events-none", children: [instructionPosition === 'top' ? (jsxRuntime.jsx("div", { className: "absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-6", children: jsxRuntime.jsxs("div", { className: "text-white", children: [jsxRuntime.jsxs("div", { className: "text-sm font-medium mb-1 flex items-center gap-2", children: [jsxRuntime.jsxs("span", { children: ["Step ", currentGuidanceStep + 1, " of ", guidanceSteps.length] }), jsxRuntime.jsx("span", { className: "text-2xl", children: guidanceSteps[currentGuidanceStep]?.icon })] }), jsxRuntime.jsx("div", { className: "text-2xl font-bold", children: guidanceSteps[currentGuidanceStep]?.message })] }) })) : (jsxRuntime.jsx("div", { className: "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6", children: jsxRuntime.jsxs("div", { className: "text-white", children: [jsxRuntime.jsx("div", { className: "text-2xl font-bold mb-2", children: guidanceSteps[currentGuidanceStep]?.message }), jsxRuntime.jsxs("div", { className: "text-sm font-medium flex items-center gap-2", children: [jsxRuntime.jsxs("span", { children: ["Step ", currentGuidanceStep + 1, " of ", guidanceSteps.length] }), jsxRuntime.jsx("span", { className: "text-2xl", children: guidanceSteps[currentGuidanceStep]?.icon })] })] }) })), jsxRuntime.jsx("div", { className: "absolute top-6 right-6 space-y-2", children: jsxRuntime.jsxs("div", { className: "flex items-center gap-2 bg-red-500 px-3 py-2 rounded-full", children: [jsxRuntime.jsx("div", { className: "w-3 h-3 bg-white rounded-full animate-pulse" }), jsxRuntime.jsxs("span", { className: "text-white font-medium", children: [formatTime(recordingTime), " / ", formatTime(maxRecordingDuration)] })] }) }), jsxRuntime.jsx("div", { className: "absolute inset-0 flex items-center justify-center", children: jsxRuntime.jsx("div", { className: "rounded-full transition-all duration-300 border-green-400 shadow-[0_0_30px_rgba(34,197,94,0.5),0_0_60px_rgba(34,197,94,0.0)]", style: {
                                                width: `${ovalDimensions.width}px`,
                                                height: `${ovalDimensions.height}px`,
                                                borderWidth: '4px',
                                                borderStyle: 'solid'
                                            } }) })] })] })), status === 'stopped' && mediaBlobUrl && (jsxRuntime.jsx("video", { src: mediaBlobUrl, controls: true, className: "w-full h-full object-cover" }))] }), (status === 'recording' || status === 'paused') && (jsxRuntime.jsx(antd.Progress, { percent: getProgress(), status: status === 'paused' ? 'exception' : 'active', strokeColor: {
                    '0%': '#108ee9',
                    '100%': '#87d068',
                }, format: (percent) => `${percent}% (${formatTime(recordingTime)})`, className: "mb-4" })), jsxRuntime.jsxs("div", { className: "flex justify-center gap-3 mb-4", children: [(status === 'idle' || status === 'stopped') && !mediaBlobUrl && (jsxRuntime.jsx(antd.Button, { type: "primary", size: "large", icon: jsxRuntime.jsx(icons.PlayCircleOutlined, {}), onClick: handleStartRecording, disabled: !selectedCamera, children: "Start Recording" })), status === 'recording' && (jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [jsxRuntime.jsx(antd.Button, { size: "large", icon: jsxRuntime.jsx(icons.PauseOutlined, {}), onClick: handlePauseRecording, children: "Pause" }), jsxRuntime.jsx(antd.Button, { danger: true, size: "large", icon: jsxRuntime.jsx(icons.StopOutlined, {}), onClick: stopRecording, children: "Stop" })] })), status === 'paused' && (jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [jsxRuntime.jsx(antd.Button, { type: "primary", size: "large", icon: jsxRuntime.jsx(icons.PlayCircleOutlined, {}), onClick: handleResumeRecording, children: "Resume" }), jsxRuntime.jsx(antd.Button, { danger: true, size: "large", icon: jsxRuntime.jsx(icons.StopOutlined, {}), onClick: stopRecording, children: "Stop" })] })), status === 'stopped' && mediaBlobUrl && (jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [jsxRuntime.jsx(antd.Button, { size: "large", icon: jsxRuntime.jsx(icons.ReloadOutlined, {}), onClick: handleRetake, children: "Retake" }), jsxRuntime.jsx(antd.Button, { type: "primary", size: "large", icon: jsxRuntime.jsx(icons.CheckCircleOutlined, {}), onClick: handleUseVideo, children: "Use This Video" })] }))] }), !hideInstructions && status === 'idle' && !mediaBlobUrl && (jsxRuntime.jsx(antd.Alert, { message: "Recording Instructions", description: jsxRuntime.jsxs("ul", { className: "list-disc list-inside space-y-1 mt-2", children: [jsxRuntime.jsx("li", { children: "Position your face within the oval guide" }), jsxRuntime.jsxs("li", { children: ["Follow the on-screen prompts carefully (", guidanceSteps.length, " steps, ", maxRecordingDuration, " seconds total)"] }), jsxRuntime.jsx("li", { children: "Move your head slowly and smoothly" }), jsxRuntime.jsx("li", { children: "Good lighting is important for best results" }), jsxRuntime.jsx("li", { children: "The green status indicator shows recording is active" }), jsxRuntime.jsxs("li", { children: ["Recording will automatically stop after ", maxRecordingDuration, " seconds"] })] }), type: "warning", showIcon: true })), status === 'stopped' && mediaBlobUrl && (jsxRuntime.jsx(antd.Alert, { message: "Recording Complete!", description: jsxRuntime.jsxs("div", { children: [jsxRuntime.jsxs("p", { children: ["Your video has been recorded successfully (", formatTime(recordingTime), ")."] }), jsxRuntime.jsx("p", { className: "mt-2", children: "Review the video above. If you're satisfied, click \"Use This Video\" to proceed." }), jsxRuntime.jsx("p", { className: "text-xs text-gray-500 mt-2", children: "Note: In production, this video will be validated by the backend quality gate before acceptance." })] }), type: "success", showIcon: true }))] }));
};

/**
 * ProfileEmbedding Component
 *
 * Unified component for profile facial embedding capture.
 * Supports both basic (static images) and advanced (video) modes.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <ProfileEmbedding
 *   onChange={(value) => console.log(value)}
 *   registrationCameras={cameras}
 * />
 *
 * // Advanced mode only
 * <ProfileEmbedding
 *   defaultMode="advanced"
 *   hideModeSelector
 *   registrationCameras={cameras}
 * />
 *
 * // Edit mode with existing user
 * <ProfileEmbedding
 *   user={existingUser}
 *   onChange={handleChange}
 * />
 * ```
 */
const ProfileEmbedding = ({ value, onChange, defaultMode = 'basic', user = null, registrationCameras = [], allowModeSwitch = true, hideModeSelector = false, basicModeProps = {}, advancedModeProps = {}, className = '', modeLabels = {
    basic: 'Basic Mode (Images)',
    advanced: 'Advanced Mode (Video)'
} }) => {
    // State for mode selection
    const [mode, setMode] = React.useState(value?.mode || defaultMode);
    // State for captured data
    const [basicImages, setBasicImages] = React.useState(value?.basicImages || null);
    const [advancedVideo, setAdvancedVideo] = React.useState(value?.advancedVideo || null);
    // Handle mode change
    const handleModeChange = (newMode) => {
        if (!allowModeSwitch)
            return;
        setMode(newMode);
        onChange?.({
            mode: newMode,
            basicImages: newMode === 'basic' ? basicImages : null,
            advancedVideo: newMode === 'advanced' ? advancedVideo : null
        });
    };
    // Handle basic mode images change
    const handleBasicImagesChange = (images) => {
        setBasicImages(images);
        onChange?.({
            mode: 'basic',
            basicImages: images,
            advancedVideo: null
        });
    };
    // Handle advanced mode video change
    const handleAdvancedVideoChange = (video) => {
        setAdvancedVideo(video);
        onChange?.({
            mode: 'advanced',
            basicImages: null,
            advancedVideo: video
        });
    };
    return (jsxRuntime.jsxs("div", { className: `safespace-profile-embedding ${className}`, children: [!hideModeSelector && (jsxRuntime.jsx("div", { className: "mb-6", children: jsxRuntime.jsx(antd.Radio.Group, { value: mode, onChange: (e) => handleModeChange(e.target.value), buttonStyle: "solid", size: "large", disabled: !allowModeSwitch, children: jsxRuntime.jsxs(antd.Space, { direction: "horizontal", size: "middle", children: [jsxRuntime.jsx(antd.Radio.Button, { value: "basic", children: jsxRuntime.jsxs(antd.Space, { children: [jsxRuntime.jsx(icons.CameraOutlined, {}), modeLabels.basic] }) }), jsxRuntime.jsx(antd.Radio.Button, { value: "advanced", children: jsxRuntime.jsxs(antd.Space, { children: [jsxRuntime.jsx(icons.VideoCameraOutlined, {}), modeLabels.advanced] }) })] }) }) })), mode === 'basic' && (jsxRuntime.jsx(BasicModeCapture, { value: basicImages || undefined, onChange: handleBasicImagesChange, user: user, ...basicModeProps })), mode === 'advanced' && (jsxRuntime.jsx(AdvancedModeCapture, { onChange: handleAdvancedVideoChange, registrationCameras: registrationCameras, ...advancedModeProps }))] }));
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
exports.AdvancedModeCapture = AdvancedModeCapture;
exports.BasicModeCapture = BasicModeCapture;
exports.FullscreenModal = FullscreenModal;
exports.LiveFeedPlayer = LiveFeedPlayer;
exports.LiveFeedViewer = LiveFeedViewer;
exports.LiveVideos = LiveVideos;
exports.MainVideoPlayer = MainVideoPlayer;
exports.ProfileEmbedding = ProfileEmbedding;
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
