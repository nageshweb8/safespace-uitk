import { jsxs, jsx, Fragment } from 'react/jsx-runtime';
import { useRef, useEffect, useState, useCallback, createContext, useContext, useMemo } from 'react';
import { Tooltip, Button, Typography, Card, Modal, ConfigProvider } from 'antd';
export { Button, Card, Modal, Progress, Tooltip, Typography } from 'antd';
import { PauseOutlined, PlayCircleOutlined, MutedOutlined, SoundOutlined, ArrowsAltOutlined, ReloadOutlined, ShrinkOutlined } from '@ant-design/icons';
import Hls from 'hls.js';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

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

const { Text: Text$1 } = Typography;
const ThumbnailGrid = ({ streams, activeStreamIndex, onStreamSelect, onFullscreen, layout, maxVisible = 3 }) => {
    const streamCount = streams.length;
    if (streamCount === 2 && layout === 'horizontal') {
        // 50:50 layout for 2 videos
        const inactiveStream = streams[activeStreamIndex === 0 ? 1 : 0];
        const inactiveIndex = activeStreamIndex === 0 ? 1 : 0;
        return (jsx("div", { className: "w-full h-full", children: jsxs("div", { className: "relative w-full h-full overflow-hidden rounded-lg bg-black cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all", onClick: () => onStreamSelect(inactiveIndex), children: [jsx(VideoPlayer, { stream: inactiveStream, autoPlay: false, muted: true, controls: false, showOverlay: true, className: "hover:scale-105 transition-transform" }), jsx(StreamInfo, { stream: inactiveStream, showLiveIndicator: true }), jsx(VideoControls, { isPlaying: false, isMuted: true, onPlayPause: () => { }, onMuteUnmute: () => { }, onFullscreen: onFullscreen, showControls: true, size: "small" }), jsx(ProgressBar, { progress: 45 + (inactiveIndex * 10), size: "small", color: "white" })] }) }));
    }
    if (streamCount >= 3 && layout === 'vertical') {
        // Thumbnail grid layout for 3+ videos (25% width area)
        const thumbnailStreams = streams
            .map((stream, index) => ({ stream, index }))
            .filter(({ index }) => index !== activeStreamIndex)
            .slice(0, maxVisible);
        return (jsx("div", { className: "w-full h-full", children: jsxs("div", { className: "flex flex-col gap-2 h-full", children: [thumbnailStreams.map(({ stream, index }) => (jsxs("div", { className: "relative overflow-hidden rounded-md bg-black cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all flex-1 min-h-0", onClick: () => onStreamSelect(index), children: [jsx(VideoPlayer, { stream: stream, autoPlay: false, muted: true, controls: false, showOverlay: true, className: "hover:scale-105 transition-transform" }), jsx(StreamInfo, { stream: stream, showLiveIndicator: true, className: "text-[10px] px-1 py-0.5" }), jsx(VideoControls, { isPlaying: false, isMuted: true, onPlayPause: () => { }, onMuteUnmute: () => { }, onFullscreen: onFullscreen, showControls: false, size: "small" }), jsx(ProgressBar, { progress: 30 + (index * 10), size: "small", color: "white", className: "px-1 pb-0.5" })] }, stream.id))), streams.length > maxVisible + 1 && (jsx("div", { className: "text-center py-1", children: jsxs(Text$1, { className: "text-xs text-gray-500", children: ["+", streams.length - maxVisible - 1, " more"] }) }))] }) }));
    }
    return null;
};

const { Text } = Typography;
const getLayoutClasses = (streamCount) => {
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
};
const themeClasses = {
    light: 'bg-white border-gray-200',
    dark: 'bg-gray-900 border-gray-700'
};
const LiveFeedPlayer = ({ streams, className, autoPlay = true, muted = true, showThumbnails = true, onStreamChange, onError, theme = 'light', title = 'Live Feed', subtitle = 'All pinned cameras will be displayed here' }) => {
    const [activeStreamIndex, setActiveStreamIndex] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPlaying] = useState(autoPlay);
    const [isMuted] = useState(muted);
    const [error, setError] = useState(null);
    const activeStream = streams[activeStreamIndex];
    const streamCount = streams.length;
    const layoutClasses = getLayoutClasses(streamCount);
    const handleStreamChange = useCallback((streamIndex) => {
        setActiveStreamIndex(streamIndex);
        setError(null);
        onStreamChange?.(streams[streamIndex]);
    }, [onStreamChange, streams]);
    const handleError = useCallback((error, stream) => {
        setError(error.message);
        onError?.(error, stream || activeStream);
    }, [onError, activeStream]);
    const handleRetry = useCallback(() => {
        setError(null);
        setActiveStreamIndex(prev => prev);
    }, []);
    if (!streams.length) {
        return (jsx(Card, { className: cn('w-full h-full', themeClasses[theme], className), children: jsx("div", { className: "flex items-center justify-center h-64", children: jsx(Text, { type: "secondary", children: "No camera streams available" }) }) }));
    }
    return (jsxs(Fragment, { children: [jsx(Card, { className: cn('w-full h-full', themeClasses[theme], className), bodyStyle: { padding: 16, height: '100%' }, children: jsxs("div", { className: "flex flex-col h-full", children: [jsxs("div", { className: "mb-4 flex-shrink-0", children: [jsx(Text, { strong: true, className: "text-base block", children: title }), jsx(Text, { type: "secondary", className: "text-sm", children: subtitle })] }), jsxs("div", { className: layoutClasses.container, children: [jsx("div", { className: layoutClasses.mainVideo, children: jsx("div", { className: "relative w-full h-full overflow-hidden rounded-lg bg-black", children: error ? (jsxs("div", { className: "absolute inset-0 flex flex-col items-center justify-center text-white", children: [jsx(Text, { className: "text-white mb-2", children: "Failed to load stream" }), jsx(Button, { type: "primary", icon: jsx(ReloadOutlined, {}), onClick: handleRetry, children: "Retry" })] })) : (jsxs(Fragment, { children: [jsx(VideoPlayer, { stream: activeStream, autoPlay: isPlaying, muted: isMuted, controls: false, onError: (error) => handleError(error, activeStream) }, `${activeStream.id}-${Date.now()}`), jsxs("div", { className: "absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded", children: [activeStream.title, activeStream.isLive && (jsx("span", { className: "ml-2 px-1 bg-red-600 rounded text-[10px]", children: "LIVE" }))] }), jsx("div", { className: "absolute top-2 right-2", children: jsx(Button, { type: "text", size: "small", icon: jsx(ArrowsAltOutlined, {}), onClick: () => setIsModalOpen(true), className: "text-white hover:text-gray-300", title: "Expand" }) })] })) }) }), showThumbnails && streamCount > 1 && (jsx("div", { className: layoutClasses.thumbnailContainer, children: jsx(ThumbnailGrid, { streams: streams, activeStreamIndex: activeStreamIndex, onStreamSelect: handleStreamChange, onFullscreen: () => setIsModalOpen(true), layout: streamCount === 2 ? 'horizontal' : 'vertical' }) }))] })] }) }), jsx(Modal, { open: isModalOpen, onCancel: () => setIsModalOpen(false), footer: null, width: "90vw", centered: true, closable: false, bodyStyle: { padding: 0, height: '90vh' }, className: "fullscreen-modal", children: jsxs("div", { className: "relative h-full bg-black", children: [jsx(VideoPlayer, { stream: activeStream, autoPlay: isPlaying, muted: isMuted, controls: true, className: "h-full", onError: (error) => handleError(error, activeStream) }, `modal-${activeStream.id}`), jsx(Button, { type: "text", size: "large", icon: jsx(ShrinkOutlined, {}), onClick: () => setIsModalOpen(false), className: "absolute top-4 right-4 text-white hover:text-gray-300 z-10", title: "Exit fullscreen" })] }) })] }));
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

// Main component exports
// Version
const version = '0.1.3';

export { LiveFeedPlayer, ProgressBar, SafeSpaceThemeProvider, StreamInfo, ThumbnailGrid, VideoControls, VideoPlayer, cn, useSafeSpaceTheme, useStreamLayout, useVideoPlayer, version };
//# sourceMappingURL=index.js.map
