import React, { useEffect, useMemo, useCallback, useState, useRef } from 'react';
import { Card, Typography, Button, Tooltip } from 'antd';
import {
  ReloadOutlined,
  PlayCircleOutlined,
  PauseOutlined,
  SoundOutlined,
  MutedOutlined,
  ArrowsAltOutlined,
  ShrinkOutlined,
} from '@ant-design/icons';
import { CameraStream, LiveFeedWhepProps, WHEPConfig } from '../types/video';
import { cn } from '../utils/cn';

const { Text } = Typography;

// Default WHEP configuration values
const DEFAULT_RECONNECT_DELAY = 5000;
const DEFAULT_MAX_RECONNECT_ATTEMPTS = 3;
const DEFAULT_HEALTH_CHECK_INTERVAL = 5000;
const DEFAULT_STREAM_STALL_TIMEOUT = 12000;

interface WHEPVideoPlayerProps {
  stream: CameraStream;
  isMuted?: boolean;
  showControls?: boolean;
  showLiveIndicator?: boolean;
  isMain?: boolean;
  onError?: (error: Error, stream?: CameraStream) => void;
  onRetry?: () => void;
  onFullscreen?: () => void;
  onMuteUnmute?: () => void;
  onPlayPause?: () => void;
  isPlaying?: boolean;
  className?: string;
  whepConfig: WHEPConfig;
}

/**
 * WHEPVideoPlayer - Internal WHEP video player component
 * Handles WebRTC WHEP connection and playback with LiveFeedPlayer-style UI
 */
const WHEPVideoPlayer: React.FC<WHEPVideoPlayerProps> = ({
  stream,
  isMuted = true,
  showControls = true,
  showLiveIndicator = true,
  isMain = false,
  onError,
  onRetry,
  onFullscreen,
  onMuteUnmute,
  onPlayPause,
  isPlaying,
  className = '',
  whepConfig,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const healthCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastFrameTimeRef = useRef<number>(Date.now());
  const reconnectAttemptsRef = useRef<number>(0);

  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [, setConnectionError] = useState<string>('');
  const [, setCurrentReconnectCount] = useState<number>(0);
  const [isHealthy, setIsHealthy] = useState<boolean>(true);

  // Extract config values with defaults
  const {
    baseUrl,
    authCredentials,
    reconnectDelay = DEFAULT_RECONNECT_DELAY,
    maxReconnectAttempts = DEFAULT_MAX_RECONNECT_ATTEMPTS,
    healthCheckInterval = DEFAULT_HEALTH_CHECK_INTERVAL,
    streamStallTimeout = DEFAULT_STREAM_STALL_TIMEOUT,
  } = whepConfig;

  // Get camera ID from stream for WHEP URL
  const cameraId = useMemo(() => {
    // Support multiple ways to get the unique identifier
    const streamWithMetadata = stream as CameraStream & { 
      originalData?: { uniqueIdentifier?: string };
      metadata?: { uniqueIdentifier?: string };
    };
    return streamWithMetadata?.originalData?.uniqueIdentifier ||
           streamWithMetadata?.metadata?.uniqueIdentifier ||
           stream?.id ||
           '';
  }, [stream]);

  const cameraName = stream?.title || 'Camera';

  // Cleanup function
  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (healthCheckIntervalRef.current) {
      clearInterval(healthCheckIntervalRef.current);
      healthCheckIntervalRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Stream health monitoring
  const startStreamHealthMonitor = useCallback(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    videoElement.onplaying = () => {
      lastFrameTimeRef.current = Date.now();
      setIsHealthy(true);
    };

    videoElement.ontimeupdate = () => {
      lastFrameTimeRef.current = Date.now();
      setIsHealthy(true);
    };

    videoElement.onstalled = () => {
      setIsHealthy(false);
    };

    videoElement.onerror = () => {
      handleStreamFailure('Video element error');
    };

    healthCheckIntervalRef.current = setInterval(() => {
      const timeSinceLastFrame = Date.now() - lastFrameTimeRef.current;
      if (timeSinceLastFrame > streamStallTimeout) {
        setIsHealthy(false);
        handleStreamFailure('Stream stalled');
      }
    }, healthCheckInterval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [healthCheckInterval, streamStallTimeout]);

  const stopStreamHealthMonitor = useCallback(() => {
    if (healthCheckIntervalRef.current) {
      clearInterval(healthCheckIntervalRef.current);
      healthCheckIntervalRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.onplaying = null;
      videoRef.current.ontimeupdate = null;
      videoRef.current.onstalled = null;
      videoRef.current.onerror = null;
    }
  }, []);

  // Handle stream failure
  const handleStreamFailure = useCallback((reason: string) => {
    stopStreamHealthMonitor();
    
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    setStatus('error');
    setConnectionError(reason);

    if (reconnectAttemptsRef.current < maxReconnectAttempts) {
      reconnectAttemptsRef.current++;
      setCurrentReconnectCount(reconnectAttemptsRef.current);
      
      reconnectTimeoutRef.current = setTimeout(() => {
        connectToStream();
      }, reconnectDelay);
    } else {
      onError?.(new Error(reason), stream);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopStreamHealthMonitor, stream, onError, maxReconnectAttempts, reconnectDelay]);

  // Connect to WHEP stream
  const connectToStream = useCallback(async () => {
    if (!cameraId) {
      setStatus('error');
      setConnectionError('No camera ID available');
      return;
    }

    try {
      setStatus('connecting');
      setConnectionError('');

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun.cloudflare.com:3478' }
        ],
        bundlePolicy: 'max-bundle',
      });

      pcRef.current = pc;

      pc.ontrack = (event) => {
        if (videoRef.current && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
          videoRef.current.play()
            .then(() => {
              lastFrameTimeRef.current = Date.now();
            })
            .catch((e: Error) => {
              handleStreamFailure(`Playback failed: ${e.message}`);
            });
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          setStatus('connected');
          reconnectAttemptsRef.current = 0;
          setCurrentReconnectCount(0);
          startStreamHealthMonitor();
        } else if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
          handleStreamFailure('ICE connection failed');
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed') {
          handleStreamFailure('Peer connection failed');
        }
      };

      pc.addTransceiver('video', { direction: 'recvonly' });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const whepUrl = `${baseUrl}/${cameraId}/whep`;
      
      const headers = new Headers();
      headers.append('Content-Type', 'application/sdp');
      if (authCredentials) {
        headers.append('Authorization', `Basic ${btoa(authCredentials)}`);
      }

      const response = await fetch(whepUrl, {
        method: 'POST',
        headers,
        body: offer.sdp,
      });

      if (!response.ok) {
        throw new Error(`WHEP request failed: ${response.status}`);
      }

      const answerSdp = await response.text();
      await pc.setRemoteDescription({
        type: 'answer',
        sdp: answerSdp,
      });

    } catch (err) {
      const error = err as Error;
      handleStreamFailure(error.message || 'Connection failed');
    }
  }, [cameraId, baseUrl, authCredentials, startStreamHealthMonitor, handleStreamFailure]);

  // Manual retry handler
  const handleRetry = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    setCurrentReconnectCount(0);
    connectToStream();
    onRetry?.();
  }, [connectToStream, onRetry]);

  // Initial connection
  useEffect(() => {
    connectToStream();
    return () => cleanup();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraId]);

  // Handle mute state
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full h-full overflow-hidden rounded-lg bg-black',
        className
      )}
      style={isMain ? { aspectRatio: '16/9', minHeight: '400px' } : {}}
    >
      {status === 'error' && reconnectAttemptsRef.current >= maxReconnectAttempts ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
          <div className="text-center">
            <div className="text-lg mb-2">⚠️</div>
            <div className="text-white mb-4 max-w-xs text-center">Video playback error</div>
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={handleRetry}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Retry Connection
            </Button>
          </div>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            className="w-full h-full object-fill"
            autoPlay
            playsInline
            muted={isMuted}
          />

          {/* Stream Info Overlay - Top Left */}
          <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-2">
            <span>{cameraName}</span>
            {showLiveIndicator && status === 'connected' && (
              <span className="px-1 bg-red-600 rounded text-[10px]">LIVE</span>
            )}
            {status === 'connecting' && (
              <span className="px-1 bg-yellow-500 rounded text-[10px] flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                Connecting
              </span>
            )}
            {!isHealthy && status === 'connected' && (
              <span className="px-1 bg-yellow-500 rounded text-[10px]">Buffering</span>
            )}
          </div>

          {/* Video Controls - Top Right */}
          {showControls && (
            <div className="absolute top-2 right-2 flex gap-1">
              <Tooltip title={isPlaying ? 'Pause' : 'Play'}>
                <Button
                  type="text"
                  size="small"
                  icon={isPlaying ? <PauseOutlined /> : <PlayCircleOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlayPause?.();
                  }}
                  className="text-white hover:text-gray-300 hover:bg-black/20"
                />
              </Tooltip>
              <Tooltip title={isMuted ? 'Unmute' : 'Mute'}>
                <Button
                  type="text"
                  size="small"
                  icon={isMuted ? <MutedOutlined /> : <SoundOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMuteUnmute?.();
                  }}
                  className="text-white hover:text-gray-300 hover:bg-black/20"
                />
              </Tooltip>
              <Tooltip title="Fullscreen">
                <Button
                  type="text"
                  size="small"
                  icon={<ArrowsAltOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onFullscreen?.();
                  }}
                  className="text-white hover:text-gray-300 hover:bg-black/20"
                />
              </Tooltip>
            </div>
          )}

          {/* Progress Bar (decorative for live stream) */}
          {isMain && (
            <div className="absolute bottom-0 left-0 right-0 px-3 pb-2">
              <div className="h-1 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-300"
                  style={{ width: status === 'connected' ? '100%' : '0%' }}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

interface WHEPThumbnailGridProps {
  streams: CameraStream[];
  activeStreamIndex: number;
  onStreamSelect: (index: number) => void;
  onFullscreen?: () => void;
  layout: 'horizontal' | 'vertical';
  maxVisible?: number;
  whepConfig: WHEPConfig;
}

/**
 * WHEPThumbnailGrid - Thumbnail grid for WHEP streams
 */
const WHEPThumbnailGrid: React.FC<WHEPThumbnailGridProps> = ({
  streams,
  activeStreamIndex,
  onStreamSelect,
  layout,
  maxVisible = 3,
  whepConfig,
}) => {
  const streamCount = streams.length;

  if (streamCount === 2 && layout === 'horizontal') {
    const inactiveIndex = activeStreamIndex === 0 ? 1 : 0;
    const inactiveStream = streams[inactiveIndex];

    return (
      <div className="w-full h-full">
        <div
          className="relative w-full h-full overflow-hidden rounded-lg bg-black cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
          onClick={() => onStreamSelect(inactiveIndex)}
        >
          <WHEPVideoPlayer
            stream={inactiveStream}
            isMuted={true}
            showControls={false}
            showLiveIndicator={true}
            isMain={false}
            whepConfig={whepConfig}
          />
        </div>
      </div>
    );
  }

  if (streamCount >= 3 && layout === 'vertical') {
    const thumbnailStreams = streams
      .map((stream, index) => ({ stream, index }))
      .filter(({ index }) => index !== activeStreamIndex)
      .slice(0, maxVisible);

    return (
      <div className="w-full h-full">
        <div className="flex flex-col gap-2 h-full">
          {thumbnailStreams.map(({ stream, index }) => (
            <div
              key={stream.id}
              className="relative overflow-hidden rounded-md bg-black cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all flex-1 min-h-0"
              onClick={() => onStreamSelect(index)}
            >
              <WHEPVideoPlayer
                stream={stream}
                isMuted={true}
                showControls={false}
                showLiveIndicator={true}
                isMain={false}
                whepConfig={whepConfig}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
};

interface WHEPFullscreenModalProps {
  isOpen: boolean;
  stream: CameraStream;
  isMuted: boolean;
  onClose: () => void;
  onMuteUnmute: () => void;
  whepConfig: WHEPConfig;
}

/**
 * WHEPFullscreenModal - Fullscreen video modal for WHEP streams
 */
const WHEPFullscreenModal: React.FC<WHEPFullscreenModalProps> = ({
  isOpen,
  stream,
  isMuted,
  onClose,
  onMuteUnmute,
  whepConfig,
}) => {
  if (!isOpen || !stream) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      <div className="relative w-full h-full">
        <WHEPVideoPlayer
          stream={stream}
          isMuted={isMuted}
          showControls={true}
          showLiveIndicator={true}
          isMain={true}
          onMuteUnmute={onMuteUnmute}
          onFullscreen={onClose}
          className="w-full h-full"
          whepConfig={whepConfig}
        />
        <Button
          type="text"
          icon={<ShrinkOutlined />}
          onClick={onClose}
          className="absolute top-4 right-4 text-white hover:text-gray-300 text-xl z-10"
        />
      </div>
    </div>
  );
};

/**
 * LiveFeedWhep Component
 * 
 * WHEP-compatible live feed player that mirrors the LiveFeedPlayer UI
 * but uses WHEP protocol for video streaming via WebRTC.
 * 
 * Used for local mode streaming where cameras stream via WHEP from MediaMTX.
 * 
 * @example
 * ```tsx
 * import { LiveFeedWhep } from '@safespace/uitk';
 * 
 * const whepConfig = {
 *   baseUrl: 'http://192.168.101.87:8889',
 *   authCredentials: 'admin:admin', // optional
 * };
 * 
 * <LiveFeedWhep
 *   streams={streams}
 *   whepConfig={whepConfig}
 *   autoPlay={true}
 *   muted={true}
 * />
 * ```
 */
export const LiveFeedWhep: React.FC<LiveFeedWhepProps> = ({
  streams = [],
  className = '',
  autoPlay = true,
  muted = true,
  controls = true,
  showThumbnails = true,
  onStreamChange,
  onError,
  theme = 'light',
  title = 'Live Feed',
  subtitle = 'All pinned cameras will be displayed here',
  maxThumbnails = 3,
  enableFullscreen = true,
  enableKeyboardControls = true,
  whepConfig,
}) => {
  const [activeStreamIndex, setActiveStreamIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(muted);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [, setPlayerError] = useState<string | null>(null);

  const streamCount = streams.length;
  const activeStream = streams[activeStreamIndex];

  // Layout classes based on stream count
  const layoutClasses = useMemo(() => {
    if (streamCount === 1) {
      return {
        container: 'grid grid-cols-1 gap-4 h-full',
        mainVideo: 'w-full h-full',
        thumbnailContainer: 'hidden',
      };
    } else if (streamCount === 2) {
      return {
        container: 'grid grid-cols-2 gap-4 h-full',
        mainVideo: 'w-full h-full',
        thumbnailContainer: 'w-full h-full',
      };
    } else {
      return {
        container: 'grid grid-cols-4 gap-4 h-full',
        mainVideo: 'col-span-3 w-full h-full',
        thumbnailContainer: 'col-span-1 w-full h-full',
      };
    }
  }, [streamCount]);

  const themeClasses = {
    light: 'bg-white border-gray-200',
    dark: 'bg-gray-900 border-gray-700',
  };

  // Handlers
  const togglePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  const handleStreamChange = useCallback((index: number) => {
    if (index >= 0 && index < streams.length) {
      setActiveStreamIndex(index);
      setPlayerError(null);
      onStreamChange?.(streams[index]);
    }
  }, [streams, onStreamChange]);

  const handleError = useCallback((err: Error, stream?: CameraStream) => {
    setPlayerError(err.message || 'Video playback error');
    if (stream) {
      onError?.(err, stream);
    }
  }, [onError]);

  const handleRetry = useCallback(() => {
    setPlayerError(null);
  }, []);

  // Keyboard controls
  useEffect(() => {
    if (!enableKeyboardControls) return;

    const handleKeyPress = (event: KeyboardEvent) => {
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

  // Empty state
  if (!streams.length) {
    return (
      <Card className={cn('w-full h-full', themeClasses[theme], className)}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-4xl mb-4">📹</div>
            <Text type="secondary" className="text-lg">
              No camera streams available
            </Text>
            <br />
            <Text type="secondary" className="text-sm">
              Please add camera streams to view live feeds
            </Text>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card
        className={cn('w-full h-full', themeClasses[theme], className)}
        styles={{ body: { padding: 16, height: '100%' } }}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="mb-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <Text strong className="text-base block">
                  {title}
                </Text>
                <Text type="secondary" className="text-sm">
                  {subtitle}
                </Text>
              </div>
              {enableKeyboardControls && (
                <div className="text-xs text-gray-400">
                  <Text type="secondary" className="text-xs">
                    Keyboard: Space (play/pause), M (mute), F (fullscreen), ←→ (switch)
                  </Text>
                </div>
              )}
            </div>
          </div>

          {/* Video Layout */}
          <div className={layoutClasses.container}>
            {/* Main Video Area */}
            <div className={layoutClasses.mainVideo}>
              <WHEPVideoPlayer
                stream={activeStream}
                isMuted={isMuted}
                showControls={controls && streamCount > 2}
                showLiveIndicator={true}
                isMain={true}
                isPlaying={isPlaying}
                onError={handleError}
                onRetry={handleRetry}
                onFullscreen={toggleFullscreen}
                onMuteUnmute={toggleMute}
                onPlayPause={togglePlayPause}
                whepConfig={whepConfig}
              />
            </div>

            {/* Thumbnail Grid */}
            {showThumbnails && streamCount > 1 && (
              <div className={layoutClasses.thumbnailContainer}>
                <WHEPThumbnailGrid
                  streams={streams}
                  activeStreamIndex={activeStreamIndex}
                  onStreamSelect={handleStreamChange}
                  onFullscreen={toggleFullscreen}
                  layout={streamCount === 2 ? 'horizontal' : 'vertical'}
                  maxVisible={maxThumbnails}
                  whepConfig={whepConfig}
                />
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Fullscreen Modal */}
      {enableFullscreen && (
        <WHEPFullscreenModal
          isOpen={isFullscreen}
          stream={activeStream}
          isMuted={isMuted}
          onClose={toggleFullscreen}
          onMuteUnmute={toggleMute}
          whepConfig={whepConfig}
        />
      )}
    </>
  );
};

export default LiveFeedWhep;
